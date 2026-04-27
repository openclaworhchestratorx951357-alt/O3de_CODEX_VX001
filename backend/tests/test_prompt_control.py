import json
import subprocess
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.control_plane import ExecutionStatus
from app.models.prompt_control import PromptSessionRecord, PromptSessionStatus
from app.models.prompt_plan import PromptPlan
from app.models.prompt_step import PromptPlanStep
from app.models.request_envelope import RequestEnvelope
from app.models.response_envelope import ResponseEnvelope, ResponseError
from app.services.adapters import AdapterExecutionRejected
from app.services.approvals import approvals_service
from app.services.artifacts import artifacts_service
from app.services.editor_runtime_defaults import EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S
from app.services.db import configure_database, initialize_database, reset_database
from app.services.executions import executions_service
from app.services.prompt_orchestrator import PromptOrchestratorService
from app.services.runs import runs_service


@contextmanager
def isolated_client() -> TestClient:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        db_path = Path(temp_dir) / "control-plane.sqlite3"
        configure_database(db_path)
        initialize_database()
        reset_database()
        try:
            with TestClient(app) as client:
                yield client
        finally:
            configure_database(None)


def create_test_artifact_record(
    *,
    path: Path,
    label: str,
    content_type: str = "image/png",
) -> str:
    seed_request = RequestEnvelope(
        request_id=f"seed-{label.lower().replace(' ', '-')}",
        tool="test.visual.diff",
        agent="validation",
        project_root=str(path.parent),
        engine_root=str(path.parent),
        dry_run=True,
        locks=[],
        timeout_s=30,
        args={},
    )
    run = runs_service.create_run(
        seed_request,
        requested_locks=[],
        execution_mode="real",
    )
    execution = executions_service.create_execution(
        run_id=run.id,
        request_id=seed_request.request_id,
        agent="validation",
        tool="test.visual.diff",
        execution_mode="real",
        status=ExecutionStatus.SUCCEEDED,
        result_summary="Seed artifact execution.",
    )
    artifact = artifacts_service.create_artifact(
        run_id=run.id,
        execution_id=execution.id,
        label=label,
        kind="test_image",
        uri=path.as_uri(),
        path=str(path),
        content_type=content_type,
        simulated=False,
        metadata={
            "tool": "test.seed",
            "agent": "validation",
            "execution_mode": "real",
            "inspection_surface": "seeded_artifact",
        },
        artifact_role="evidence",
        retention_class="test-log-evidence",
        evidence_completeness="seeded-local-file",
    )
    return artifact.id


def create_test_image(
    path: Path,
    *,
    size: tuple[int, int],
    color: tuple[int, int, int, int],
) -> None:
    try:
        from PIL import Image
    except ImportError:
        pytest.skip(
            "Pillow is required only for PNG fixture generation in visual diff tests."
        )

    image = Image.new("RGBA", size, color)
    image.save(path, format="PNG")

def test_prompt_session_preview_compiles_typed_steps_across_families() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-preview-1",
                "prompt_text": (
                    "Inspect project manifest, capture viewport, and check asset processor status."
                ),
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": [],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["prompt_id"] == "prompt-preview-1"
        assert payload["status"] == "planned"
        assert payload["plan"]["admitted"] is True
        assert payload["plan"]["refusal_reason"] is None
        assert {step["tool"] for step in payload["plan"]["steps"]} == {
            "project.inspect",
            "render.capture.viewport",
            "asset.processor.status",
        }
        assert payload["admitted_capabilities"] == [
            "asset.processor.status",
            "project.inspect",
            "render.capture.viewport",
        ]
        assert len(payload["plan"]["capability_requirements"]) == 3

        capability_response = client.get("/prompt/capabilities")
        assert capability_response.status_code == 200
        capabilities = capability_response.json()["capabilities"]
        families = {item["agent_family"] for item in capabilities}
        assert families == {
            "asset-pipeline",
            "editor-control",
            "project-build",
            "render-lookdev",
            "validation",
        }
        project_inspect = next(
            item for item in capabilities if item["tool_name"] == "project.inspect"
        )
        assert project_inspect["safety_envelope"]["natural_language_status"] == (
            "prompt-ready-read-only"
        )
        assert project_inspect["safety_envelope"]["backup_class"] == "none"
        editor_entity_create = next(
            item for item in capabilities if item["tool_name"] == "editor.entity.create"
        )
        assert editor_entity_create["safety_envelope"]["natural_language_status"] == (
            "prompt-ready-approval-gated"
        )
        assert editor_entity_create["safety_envelope"]["natural_language_blocker"] is None
        assert editor_entity_create["safety_envelope"]["mutation_surface_class"] == (
            "admitted-editor-authoring-loaded-level"
        )
        assert editor_entity_create["safety_envelope"]["restore_boundary_class"] == (
            "loaded-level-file-restore-boundary"
        )
        assert "arbitrary Editor Python" in (
            editor_entity_create["safety_envelope"]["candidate_expansion_boundary"]
        )
        editor_component_add = next(
            item for item in capabilities if item["tool_name"] == "editor.component.add"
        )
        assert editor_component_add["capability_maturity"] == "real-authoring"
        assert editor_component_add["safety_envelope"]["natural_language_status"] == (
            "prompt-ready-approval-gated"
        )
        assert editor_component_add["safety_envelope"]["mutation_surface_class"] == (
            "admitted-editor-authoring-allowlisted-component"
        )
        assert editor_component_add["safety_envelope"]["restore_boundary_class"] == (
            "loaded-level-file-restore-boundary"
        )
        editor_component_find = next(
            item for item in capabilities if item["tool_name"] == "editor.component.find"
        )
        assert editor_component_find["capability_maturity"] == "hybrid-read-only"
        assert editor_component_find["safety_envelope"][
            "natural_language_status"
        ] == "prompt-ready-read-only"
        assert (
            "prefab-derived ids"
            in editor_component_find["safety_envelope"]["candidate_expansion_boundary"]
        )
        editor_component_property_get = next(
            item
            for item in capabilities
            if item["tool_name"] == "editor.component.property.get"
        )
        assert editor_component_property_get["capability_maturity"] == "hybrid-read-only"
        assert editor_component_property_get["safety_envelope"][
            "natural_language_status"
        ] == "prompt-ready-read-only"
        assert (
            editor_component_property_get["safety_envelope"]["mutation_surface_class"]
            == "not-mutating"
        )
        camera_bool_write = next(
            item
            for item in capabilities
            if item["tool_name"]
            == "editor.component.property.write.camera_bool_make_active_on_activation"
        )
        assert camera_bool_write["capability_maturity"] == "hybrid-mutation"
        assert camera_bool_write["capability_status"] == "mutation-gated"
        assert camera_bool_write["approval_class"] == "content_write"
        assert (
            camera_bool_write["safety_envelope"]["mutation_surface_class"]
            == "admitted-editor-camera-bool-property-write"
        )
        assert (
            "broad property writes"
            in camera_bool_write["safety_envelope"]["candidate_expansion_boundary"]
        )
        editor_entity_exists = next(
            item for item in capabilities if item["tool_name"] == "editor.entity.exists"
        )
        assert editor_entity_exists["capability_maturity"] == "hybrid-read-only"
        assert editor_entity_exists["safety_envelope"]["backup_class"] == "none"


def test_prompt_shortcuts_return_fast_contextual_viewport_recommendations() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/shortcuts",
            json={
                "mode": "game",
                "scenario_id": "puzzle-exploration",
                "scenario_label": "Puzzle exploration",
                "stage_label": "2. Test room",
                "focus_id": "viewport",
                "focus_label": "Use current viewport",
                "viewport_label": "Game viewport control surface",
                "active_tool_label": "Component Palette",
                "project_profile_name": "McpSandbox canonical target",
                "source_context_name": "puzzle-brief.md",
                "source_context": "The player redirects light beams through mirrors in a lighthouse test room.",
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["generated_by"] == "deterministic-backend-shortcuts-v1"
        assert payload["mode"] == "game"
        assert payload["scenario_id"] == "puzzle-exploration"
        assert payload["stage_label"] == "2. Test room"
        assert payload["focus_id"] == "viewport"
        shortcuts = payload["shortcuts"]
        assert shortcuts[0]["shortcut_id"] == "analyze-viewport-recommend"
        assert "Analyze the current O3DE viewport/context" in shortcuts[0]["prompt_text"]
        assert "Component Palette" in shortcuts[0]["prompt_text"]
        assert "Game viewport control surface" in shortcuts[0]["prompt_text"]
        assert "McpSandbox canonical target" in shortcuts[0]["prompt_text"]
        assert "puzzle-brief.md" in shortcuts[0]["prompt_text"]
        assert "light beams through mirrors" in shortcuts[0]["prompt_text"]
        assert {
            shortcut["shortcut_id"] for shortcut in shortcuts
        } == {
            "analyze-viewport-recommend",
            "context-aware-next-step",
            "builder-task-draft",
            "safety-check",
        }


def test_prompt_session_plans_asset_source_inspect_as_hybrid_read_only() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-asset-source-inspect-1",
                "prompt_text": 'Inspect asset "Assets/Textures/example.png".',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": ["asset-pipeline"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["asset.source.inspect"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "asset.source.inspect"
        assert step["capability_maturity"] == "hybrid-read-only"
        assert step["args"]["source_path"] == "Assets/Textures/example.png"
        assert step["safety_envelope"]["natural_language_status"] == "prompt-ready-read-only"


def test_prompt_session_plans_asset_batch_process_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-asset-batch-plan-1",
                "prompt_text": 'Process assets glob "Assets/**/*.fbx".',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": ["asset-pipeline"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["asset.batch.process"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "asset.batch.process"
        assert step["capability_maturity"] == "plan-only"
        assert step["args"]["source_glob"] == "Assets/**/*.fbx"
        assert step["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_session_plans_asset_move_safe_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-asset-move-plan-1",
                "prompt_text": 'Move asset "Assets/Old/example.fbx" to "Assets/New/example.fbx".',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["asset-pipeline"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["asset.move.safe"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "asset.move.safe"
        assert step["capability_maturity"] == "plan-only"
        assert step["args"]["source_path"] == "Assets/Old/example.fbx"
        assert step["args"]["destination_path"] == "Assets/New/example.fbx"
        assert step["args"]["dry_run_plan"] is True
        assert step["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_session_executes_asset_processor_status_with_truthful_evidence() -> None:
    with patch.dict(
        "os.environ",
        {
            "O3DE_ADAPTER_MODE": "hybrid",
        },
        clear=False,
    ):
        with patch(
            "app.services.adapters.AssetPipelineHybridAdapter._probe_asset_processor_runtime",
            return_value={
                "runtime_probe_available": True,
                "runtime_probe_method": "windows-tasklist",
                "runtime_process_ids": [4242],
                "runtime_process_names": ["AssetProcessor.exe"],
            },
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-asset-processor-status-execute-1",
                        "prompt_text": "Check asset processor status.",
                        "project_root": "C:/project",
                        "engine_root": "C:/engine",
                        "dry_run": True,
                        "preferred_domains": ["asset-pipeline"],
                    },
                )
                assert create_response.status_code == 200

                execute_response = client.post(
                    "/prompt/sessions/prompt-asset-processor-status-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "completed"
                assert payload["child_run_ids"]
                assert len(payload["child_run_ids"]) == 1
                assert payload["latest_child_responses"][0]["ok"] is True
                assert (
                    payload["latest_child_responses"][0]["result"]["execution_mode"] == "real"
                )
                details = payload["latest_child_responses"][0]["execution_details"]
                assert details["inspection_surface"] == "asset_processor_runtime"
                assert details["runtime_probe_available"] is True
                assert details["runtime_status"] == "running"
                assert details["runtime_process_count"] == 1
                assert details["job_evidence_available"] is False
                assert details["platform_evidence_available"] is False
                assert "Asset Processor runtime readback confirmed 1 running process(es)." in (
                    payload["final_result_summary"]
                )
                assert "Job evidence remains unavailable" in payload["final_result_summary"]
                assert "Platform evidence remains unavailable" in payload["final_result_summary"]


def test_prompt_session_executes_asset_source_inspect_with_truthful_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Textures" / "example.png"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(b"asset-source")
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-asset-source-inspect-execute-1",
                        "prompt_text": 'Inspect asset "Assets/Textures/example.png".',
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": True,
                        "preferred_domains": ["asset-pipeline"],
                    },
                )
                assert create_response.status_code == 200

                execute_response = client.post(
                    "/prompt/sessions/prompt-asset-source-inspect-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "completed"
                assert payload["child_run_ids"]
                assert len(payload["child_run_ids"]) == 1
                assert payload["latest_child_responses"][0]["ok"] is True
                assert (
                    payload["latest_child_responses"][0]["result"]["execution_mode"] == "real"
                )
                details = payload["latest_child_responses"][0]["execution_details"]
                assert details["inspection_surface"] == "asset_source_file"
                assert details["source_path_relative_to_project_root"] == (
                    "Assets/Textures/example.png"
                )
                assert details["source_exists"] is True
                assert details["product_evidence_available"] is False
                assert details["dependency_evidence_available"] is False
                assert "Readback confirmed source asset Assets/Textures/example.png." in (
                    payload["final_result_summary"]
                )
                assert "Product evidence remains unavailable" in payload["final_result_summary"]
                assert "Dependency evidence remains unavailable" in payload["final_result_summary"]


def test_prompt_session_executes_asset_batch_process_with_truthful_preflight_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Models" / "ship.fbx"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(b"asset-batch-prompt-source")
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.AssetPipelineHybridAdapter._probe_asset_processor_runtime",
                return_value={
                    "runtime_probe_available": True,
                    "runtime_probe_method": "windows-tasklist",
                    "runtime_process_ids": [5150],
                    "runtime_process_names": ["AssetProcessor.exe"],
                },
            ):
                with isolated_client() as client:
                    create_response = client.post(
                        "/prompt/sessions",
                        json={
                            "prompt_id": "prompt-asset-batch-execute-1",
                            "prompt_text": 'Process assets glob "Assets/**/*.fbx".',
                            "project_root": str(project_root),
                            "engine_root": "C:/engine",
                            "dry_run": True,
                            "preferred_domains": ["asset-pipeline"],
                        },
                    )
                    assert create_response.status_code == 200

                    execute_response = client.post(
                        "/prompt/sessions/prompt-asset-batch-execute-1/execute"
                    )
                    assert execute_response.status_code == 200
                    payload = execute_response.json()
                    assert payload["status"] == "waiting_approval"
                    approval = approvals_service.get_approval(payload["pending_approval_id"])
                    assert approval is not None
                    approvals_service.approve(approval.id)

                    execute_response = client.post(
                        "/prompt/sessions/prompt-asset-batch-execute-1/execute"
                    )
                    assert execute_response.status_code == 200
                    payload = execute_response.json()
                    assert payload["status"] == "completed"
                    assert (
                        "Asset batch preflight confirmed 1 project-local source candidate file(s)"
                        in payload["final_result_summary"]
                    )
                    assert (
                        "No real asset.batch.process execution was attempted"
                        in payload["final_result_summary"]
                    )
                    child_response = payload["latest_child_responses"][-1]
                    details = child_response["execution_details"]
                    assert details["inspection_surface"] == "asset_batch_preflight"
                    assert details["runtime_available"] is True
                    assert details["source_candidate_match_count"] == 1
                    assert details["execution_attempted"] is False
                    assert details["result_artifact_produced"] is False
                    assert str(source_path) in details["resolved_source_candidate_paths"]


def test_prompt_session_executes_asset_move_safe_with_truthful_preflight_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Old" / "example.fbx"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        (project_root / "Assets" / "New").mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(b"asset-move-prompt-source")
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-asset-move-execute-1",
                        "prompt_text": 'Move asset "Assets/Old/example.fbx" to "Assets/New/example.fbx".',
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": False,
                        "preferred_domains": ["asset-pipeline"],
                    },
                )
                assert create_response.status_code == 200

                execute_response = client.post(
                    "/prompt/sessions/prompt-asset-move-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "waiting_approval"
                approval = approvals_service.get_approval(payload["pending_approval_id"])
                assert approval is not None
                approvals_service.approve(approval.id)

                execute_response = client.post(
                    "/prompt/sessions/prompt-asset-move-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "completed"
                assert (
                    "Asset move preflight confirmed a project-local identity corridor"
                    in payload["final_result_summary"]
                )
                assert (
                    "No real asset.move.safe execution was attempted"
                    in payload["final_result_summary"]
                )
                assert (
                    "No admitted real reference graph or repair substrate is available"
                    in payload["final_result_summary"]
                )
                child_response = payload["latest_child_responses"][-1]
                details = child_response["execution_details"]
                assert details["inspection_surface"] == "asset_move_preflight"
                assert details["move_plan_requested"] is True
                assert details["identity_corridor_available"] is True
                assert details["execution_attempted"] is False
                assert details["result_artifact_produced"] is False
                assert details["source_path_resolved"] == str(source_path.resolve())


def test_prompt_session_executes_render_capture_viewport_with_truthful_evidence() -> None:
    with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
        with patch(
            "app.services.adapters.editor_automation_runtime_service.execute_render_capture_viewport",
            return_value={
                "runtime_result": {
                    "ok": True,
                    "message": "Viewport capture substrate probe completed against the admitted editor runtime path.",
                    "runtime_probe_attempted": True,
                    "runtime_probe_method": "editor-runtime-get-context",
                    "runtime_available": True,
                    "capture_requested": True,
                    "capture_attempted": False,
                    "capture_runtime_mode": "runtime-probe-only",
                    "capture_operation_available": False,
                    "capture_artifact_produced": False,
                    "capture_artifact_path": None,
                    "capture_artifact_content_type": None,
                    "capture_artifact_size_bytes": None,
                    "capture_unavailable_reason": "No admitted real screenshot production path is available in this slice.",
                    "output_label": "baseline-shot",
                    "camera_entity_id": "camera-001",
                    "requested_resolution": {"width": 1280, "height": 720},
                    "active_level_path": "Levels/Main.level",
                    "editor_transport": "oneshot",
                    "bridge_name": "ControlPlaneEditorBridge",
                    "bridge_available": True,
                    "bridge_operation": "GetEditorContext",
                    "bridge_contract_version": "v0.1",
                    "bridge_result_summary": "Context available",
                },
                "runner_command": ["Editor.exe"],
                "manifest": {},
                "runtime_script": "backend/runtime/editor_scripts/render_capture_probe.py",
            },
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-render-capture-1",
                        "prompt_text": "Capture viewport baseline evidence.",
                        "project_root": "C:/project",
                        "engine_root": "C:/engine",
                        "dry_run": False,
                        "preferred_domains": ["render-lookdev"],
                    },
                )
                assert create_response.status_code == 200
                payload = create_response.json()
                assert payload["status"] == "planned"
                assert payload["admitted_capabilities"] == ["render.capture.viewport"]

                execute_response = client.post(
                    "/prompt/sessions/prompt-render-capture-1/execute",
                )
                assert execute_response.status_code == 200
                execute_payload = execute_response.json()
                assert execute_payload["status"] == "completed"
                child_response = execute_payload["latest_child_responses"][0]
                assert (
                    child_response["execution_details"]["inspection_surface"]
                    == "render_capture_runtime_probe"
                )
                assert child_response["execution_details"]["runtime_available"] is True
                assert child_response["execution_details"]["capture_artifact_produced"] is False
                assert (
                    "Viewport capture runtime probe confirmed editor runtime context is available"
                    in execute_payload["final_result_summary"]
                )
                assert (
                    "No real capture artifact was produced in this admitted slice."
                    in execute_payload["final_result_summary"]
                )


def test_prompt_session_executes_render_material_inspect_with_truthful_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        material_path = project_root / "Materials" / "Example.material"
        material_path.parent.mkdir(parents=True, exist_ok=True)
        material_path.write_text(
            json.dumps(
                {
                    "materialType": "PromptMaterial",
                    "propertyValues": {"roughness": 0.5, "metallic": 0.1},
                }
            ),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_render_material_inspect",
                return_value={
                    "runtime_result": {
                        "ok": True,
                        "message": "Material inspection substrate probe completed against the admitted editor runtime path.",
                        "runtime_probe_attempted": True,
                        "runtime_probe_method": "editor-runtime-get-context",
                        "runtime_available": True,
                        "material_inspection_requested": True,
                        "material_inspection_attempted": False,
                        "material_runtime_mode": "runtime-probe-only",
                        "material_operation_available": False,
                        "material_evidence_produced": False,
                        "material_evidence_path": None,
                        "material_unavailable_reason": "No admitted real material inspection path is available in this slice.",
                        "material_path": "Materials/Example.material",
                        "include_shader_data_requested": True,
                        "include_references_requested": True,
                        "active_level_path": "Levels/Main.level",
                        "editor_transport": "oneshot",
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_available": True,
                        "bridge_operation": "GetEditorContext",
                        "bridge_contract_version": "v0.1",
                        "bridge_result_summary": "Context available",
                    },
                    "runner_command": ["Editor.exe"],
                    "manifest": {},
                    "runtime_script": "backend/runtime/editor_scripts/render_material_probe.py",
                },
            ):
                with isolated_client() as client:
                    create_response = client.post(
                        "/prompt/sessions",
                        json={
                            "prompt_id": "prompt-render-material-1",
                            "prompt_text": 'Inspect material "Materials/Example.material".',
                            "project_root": str(project_root),
                            "engine_root": "C:/engine",
                            "dry_run": False,
                            "preferred_domains": ["render-lookdev"],
                        },
                    )
                    assert create_response.status_code == 200
                    payload = create_response.json()
                    assert payload["status"] == "planned"
                    assert payload["admitted_capabilities"] == ["render.material.inspect"]

                    execute_response = client.post(
                        "/prompt/sessions/prompt-render-material-1/execute",
                    )
                    assert execute_response.status_code == 200
                    execute_payload = execute_response.json()
                    assert execute_payload["status"] == "completed"
                    child_response = execute_payload["latest_child_responses"][0]
                    assert (
                        child_response["execution_details"]["inspection_surface"]
                        == "render_material_runtime_probe"
                    )
                    assert child_response["execution_details"]["runtime_available"] is True
                    assert (
                        child_response["execution_details"]["material_evidence_produced"] is True
                    )
                    assert (
                        "Material inspection runtime probe confirmed editor runtime context is available"
                        in execute_payload["final_result_summary"]
                    )
                    assert (
                        "Material inspection readback confirmed explicit local material evidence for Materials/Example.material."
                        in execute_payload["final_result_summary"]
                    )
                    assert (
                        "Material readback confirmed 2 propertyValues entries."
                        in execute_payload["final_result_summary"]
                    )
                    assert (
                        "Runtime material readback remains unavailable in this admitted slice."
                        in execute_payload["final_result_summary"]
                    )
                    assert (
                        "Shader data readback remains unavailable in this admitted slice."
                        in execute_payload["final_result_summary"]
                    )
                    assert (
                        "Material reference expansion remains unavailable in this admitted slice."
                        in execute_payload["final_result_summary"]
                    )


def test_prompt_session_plans_render_material_patch_as_hybrid_mutation() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-render-material-patch-plan-1",
                "prompt_text": 'Patch material "Materials/Example.material" roughness to 1',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["render-lookdev"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["render.material.patch"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "render.material.patch"
        assert step["capability_maturity"] == "hybrid-mutation"
        assert step["args"]["material_path"] == "Materials/Example.material"
        assert step["args"]["property_overrides"] == {"roughness": "1"}
        assert step["safety_envelope"]["natural_language_status"] == "prompt-ready-approval-gated"


def test_prompt_session_executes_render_material_patch_with_truthful_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        material_path = project_root / "Materials" / "Example.material"
        material_path.parent.mkdir(parents=True, exist_ok=True)
        material_path.write_text(
            json.dumps(
                {
                    "materialType": "TestMaterial",
                    "propertyValues": {"roughness": 0.5},
                }
            ),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-render-material-patch-execute-1",
                        "prompt_text": 'Patch material "Materials/Example.material" roughness to 1',
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": False,
                        "preferred_domains": ["render-lookdev"],
                    },
                )
                assert create_response.status_code == 200

                execute_response = client.post(
                    "/prompt/sessions/prompt-render-material-patch-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "waiting_approval"
                approval = approvals_service.get_approval(payload["pending_approval_id"])
                assert approval is not None
                approvals_service.approve(approval.id)

                execute_response = client.post(
                    "/prompt/sessions/prompt-render-material-patch-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "completed"
                assert (
                    "Material patch mutation wrote requested propertyValues overrides"
                    in payload["final_result_summary"]
                )
                assert (
                    "Runtime material readback and shader rebuild remain unavailable"
                    in payload["final_result_summary"]
                )
                child_response = payload["latest_child_responses"][-1]
                details = child_response["execution_details"]
                assert details["inspection_surface"] == "render_material_patch_mutation"
                assert details["mutation_applied"] is True
                assert details["post_write_verification_succeeded"] is True
                persisted_material = json.loads(material_path.read_text(encoding="utf-8"))
                assert persisted_material["propertyValues"]["roughness"] == "1"


def test_prompt_session_executes_render_material_patch_with_explicit_shader_review_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        material_path = project_root / "Materials" / "Example.material"
        build_root = project_root / "build"
        shader_path = project_root / "Assets" / "Shaders" / "ExampleShader.shader"
        material_path.parent.mkdir(parents=True, exist_ok=True)
        build_root.mkdir(parents=True, exist_ok=True)
        shader_path.parent.mkdir(parents=True, exist_ok=True)
        material_path.write_text(
            json.dumps(
                {
                    "materialType": "TestMaterial",
                    "propertyValues": {"roughness": 0.5},
                }
            ),
            encoding="utf-8",
        )
        (build_root / "CMakeCache.txt").write_text("PROJECT_NAME=ShaderPrompt\n", encoding="utf-8")
        shader_path.write_text("shader-source", encoding="utf-8")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-render-material-patch-shader-review-1",
                        "prompt_text": 'Patch material "Materials/Example.material" roughness to 1 and review shader "ExampleShader".',
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": False,
                        "preferred_domains": ["render-lookdev"],
                    },
                )
                assert create_response.status_code == 200
                create_payload = create_response.json()
                step = create_payload["plan"]["steps"][0]
                assert step["args"]["shader_targets_for_review"] == ["ExampleShader"]

                execute_response = client.post(
                    "/prompt/sessions/prompt-render-material-patch-shader-review-1/execute"
                )
                assert execute_response.status_code == 200
                approval = approvals_service.get_approval(
                    execute_response.json()["pending_approval_id"]
                )
                assert approval is not None
                approvals_service.approve(approval.id)

                execute_response = client.post(
                    "/prompt/sessions/prompt-render-material-patch-shader-review-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "completed"
                assert (
                    "Post-patch shader preflight confirmed configured build-tree evidence"
                    in payload["final_result_summary"]
                )
                assert "no shader rebuild command was executed" in payload["final_result_summary"]
                child_response = payload["latest_child_responses"][-1]
                details = child_response["execution_details"]
                assert details["post_patch_shader_preflight_review_requested"] is True
                assert details["post_patch_shader_preflight_review_attempted"] is True
                assert details["post_patch_shader_preflight_review_ready"] is True
                assert (
                    details["post_patch_shader_preflight_review"]["inspection_surface"]
                    == "render_shader_rebuild_preflight"
                )


def test_prompt_session_plans_test_visual_diff_as_hybrid_read_only() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-visual-diff-plan-1",
                "prompt_text": 'Run visual diff for "art-baseline-001" and "art-candidate-001".',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": ["validation"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["test.visual.diff"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "test.visual.diff"
        assert step["capability_maturity"] == "hybrid-read-only"
        assert step["args"]["baseline_artifact_id"] == "art-baseline-001"
        assert step["args"]["candidate_artifact_id"] == "art-candidate-001"
        assert step["safety_envelope"]["natural_language_status"] == "prompt-ready-read-only"


def test_prompt_session_plans_test_run_gtest_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-gtest-plan-1",
                "prompt_text": 'Run gtest target "AzCoreTests".',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": ["validation"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["test.run.gtest"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "test.run.gtest"
        assert step["capability_maturity"] == "plan-only"
        assert step["args"]["test_targets"] == ["AzCoreTests"]
        assert step["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_session_plans_build_compile_as_execution_gated() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-build-compile-plan-1",
                "prompt_text": 'Compile target "Editor".',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": ["project-build"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["build.compile"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "build.compile"
        assert step["capability_maturity"] == "execution-gated"
        assert step["args"]["targets"] == ["Editor"]
        assert (
            step["safety_envelope"]["natural_language_status"]
            == "prompt-ready-approval-gated"
        )


def test_prompt_session_plans_render_shader_rebuild_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-render-shader-plan-1",
                "prompt_text": 'Rebuild shader "ExampleShader".',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": ["render-lookdev"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["render.shader.rebuild"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "render.shader.rebuild"
        assert step["capability_maturity"] == "plan-only"
        assert step["args"]["shader_targets"] == ["ExampleShader"]
        assert step["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_session_plans_gem_enable_as_mutation_gated() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-gem-enable-plan-1",
                "prompt_text": 'Enable gem "MyTestGem".',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": ["project-build"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["gem.enable"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "gem.enable"
        assert step["capability_maturity"] == "hybrid-mutation"
        assert step["args"]["gem_name"] == "MyTestGem"
        assert (
            step["safety_envelope"]["natural_language_status"]
            == "prompt-ready-approval-gated"
        )


def test_prompt_session_plans_test_run_editor_python_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-editor-python-plan-1",
                "prompt_text": 'Run editor python test "Automated.testing.sample_test".',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": ["validation"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["test.run.editor_python"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "test.run.editor_python"
        assert step["capability_maturity"] == "plan-only"
        assert step["args"]["test_modules"] == ["Automated.testing.sample_test"]
        assert step["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_session_plans_test_tiaf_sequence_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-tiaf-plan-1",
                "prompt_text": 'Run TIAF sequence "smoke-sequence".',
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": ["validation"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["admitted_capabilities"] == ["test.tiaf.sequence"]
        assert len(payload["plan"]["steps"]) == 1
        step = payload["plan"]["steps"][0]
        assert step["tool"] == "test.tiaf.sequence"
        assert step["capability_maturity"] == "plan-only"
        assert step["args"]["sequence_name"] == "smoke-sequence"
        assert step["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_session_executes_test_run_gtest_with_truthful_preflight_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        runner_path = (
            project_root / "build" / "windows" / "bin" / "profile" / "AzCoreTests.exe"
        )
        runner_path.parent.mkdir(parents=True, exist_ok=True)
        runner_path.write_bytes(b"gtest-prompt-runner")
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-gtest-execute-1",
                        "prompt_text": 'Run gtest target "AzCoreTests".',
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": True,
                        "preferred_domains": ["validation"],
                    },
                )
                assert create_response.status_code == 200

                execute_response = client.post("/prompt/sessions/prompt-gtest-execute-1/execute")
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "waiting_approval"
                approval = approvals_service.get_approval(payload["pending_approval_id"])
                assert approval is not None
                approvals_service.approve(approval.id)

                execute_response = client.post("/prompt/sessions/prompt-gtest-execute-1/execute")
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "completed"
                assert "GTest preflight confirmed runnable target binaries" in payload[
                    "final_result_summary"
                ]
                assert "No native gtest execution was attempted" in payload[
                    "final_result_summary"
                ]
                child_response = payload["latest_child_responses"][-1]
                details = child_response["execution_details"]
                assert details["inspection_surface"] == "gtest_runner_preflight"
                assert details["runner_runtime_available"] is True
                assert details["execution_attempted"] is False
                assert details["result_artifact_produced"] is False
                assert str(runner_path) in details["resolved_runner_paths"]


def test_prompt_session_executes_build_compile_with_truthful_preflight_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        target_path = project_root / "build" / "windows" / "bin" / "profile" / "Editor.exe"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text("CMAKE_GENERATOR:INTERNAL=Ninja\n", encoding="utf-8")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"build-compile-prompt-target")
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-build-compile-execute-1",
                        "prompt_text": 'Compile target "Editor".',
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": True,
                        "preferred_domains": ["project-build"],
                    },
                )
                assert create_response.status_code == 200

                execute_response = client.post(
                    "/prompt/sessions/prompt-build-compile-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "waiting_approval"
                approval = approvals_service.get_approval(payload["pending_approval_id"])
                assert approval is not None
                approvals_service.approve(approval.id)

                execute_response = client.post(
                    "/prompt/sessions/prompt-build-compile-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "completed"
                assert (
                    "Build compile preflight confirmed configured build tree evidence"
                    in payload["final_result_summary"]
                )
                assert (
                    "No real build.compile execution was attempted"
                    in payload["final_result_summary"]
                )
                child_response = payload["latest_child_responses"][-1]
                details = child_response["execution_details"]
                assert details["inspection_surface"] == "build_compile_preflight"
                assert details["configured_build_tree_available"] is True
                assert (
                    details["target_artifact_candidates_found_for_all_requested_targets"]
                    is True
                )
                assert details["execution_attempted"] is False
                assert details["result_status"] == "not_attempted_preflight_blocked"
                assert details["result_artifact_produced"] is False
                assert str(target_path) in details["resolved_target_candidate_paths"]


def test_prompt_session_executes_build_compile_with_truthful_runner_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        build_tree = cache_path.parent
        target_path = build_tree / "bin" / "profile" / "Editor.exe"
        cmake_path = build_tree / "cmake.exe"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            f"CMAKE_GENERATOR:INTERNAL=Ninja\nCMAKE_COMMAND:FILEPATH={cmake_path}\n",
            encoding="utf-8",
        )
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"build-compile-prompt-target")
        cmake_path.write_text("", encoding="utf-8")
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.subprocess.run",
                return_value=subprocess.CompletedProcess(
                    args=[str(cmake_path), "--build", str(build_tree), "--target", "Editor"],
                    returncode=0,
                    stdout="build ok",
                    stderr="",
                ),
            ):
                with isolated_client() as client:
                    create_response = client.post(
                        "/prompt/sessions",
                        json={
                            "prompt_id": "prompt-build-compile-runner-1",
                            "prompt_text": 'Compile target "Editor".',
                            "project_root": str(project_root),
                            "engine_root": "C:/engine",
                            "dry_run": False,
                            "preferred_domains": ["project-build"],
                        },
                    )
                    assert create_response.status_code == 200

                    execute_response = client.post(
                        "/prompt/sessions/prompt-build-compile-runner-1/execute"
                    )
                    assert execute_response.status_code == 200
                    payload = execute_response.json()
                    assert payload["status"] == "waiting_approval"
                    approval = approvals_service.get_approval(payload["pending_approval_id"])
                    assert approval is not None
                    approvals_service.approve(approval.id)

                    execute_response = client.post(
                        "/prompt/sessions/prompt-build-compile-runner-1/execute"
                    )
                    assert execute_response.status_code == 200
                    payload = execute_response.json()
                    assert payload["status"] == "completed"
                    assert (
                        "returned exit code 0" in payload["final_result_summary"]
                    )
                    assert (
                        "did not prove compiled output changes"
                        in payload["final_result_summary"]
                    )
                    assert (
                        "Build compile runner log evidence was retained"
                        in payload["final_result_summary"]
                    )
                    child_response = payload["latest_child_responses"][-1]
                    details = child_response["execution_details"]
                    assert details["inspection_surface"] == "build_compile_runner"
                    assert details["execution_attempted"] is True
                    assert details["exit_code_available"] is True
                    assert details["exit_code"] == 0
                    assert details["result_status"] == "attempted_but_output_unverified"
                    assert details["target_candidate_revalidation_attempted"] is True
                    assert details["compiled_output_verified"] is False
                    assert details["result_artifact_produced"] is True
                    assert details["result_artifact_path"]


def test_prompt_session_executes_gem_enable_with_truthful_preflight_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "PromptProject", "gem_names": ["MyTestGem"]}),
            encoding="utf-8",
        )
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text("CMAKE_GENERATOR:INTERNAL=Ninja\n", encoding="utf-8")
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-gem-enable-execute-1",
                        "prompt_text": 'Enable gem "MyTestGem".',
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": True,
                        "preferred_domains": ["project-build"],
                    },
                )
                assert create_response.status_code == 200

                execute_response = client.post(
                    "/prompt/sessions/prompt-gem-enable-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "waiting_approval"
                approval = approvals_service.get_approval(payload["pending_approval_id"])
                assert approval is not None
                approvals_service.approve(approval.id)

                execute_response = client.post(
                    "/prompt/sessions/prompt-gem-enable-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "completed"
                assert (
                    "Gem enable preflight confirmed manifest-backed gem state already contains MyTestGem."
                    in payload["final_result_summary"]
                )
                assert (
                    "Gem enable preflight confirmed configured build tree evidence for downstream impact review."
                    in payload["final_result_summary"]
                )
                assert (
                    "No real gem.enable execution was attempted in this admitted slice."
                    in payload["final_result_summary"]
                )
                child_response = payload["latest_child_responses"][-1]
                details = child_response["execution_details"]
                assert details["inspection_surface"] == "gem_enable_preflight"
                assert details["requested_gem_name"] == "MyTestGem"
                assert details["requested_gem_already_enabled"] is True
                assert details["configured_build_tree_available"] is True
                assert details["execution_attempted"] is False
                assert details["result_artifact_produced"] is False


def test_prompt_session_executes_render_shader_rebuild_with_truthful_preflight_evidence(
) -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        build_root = project_root / "build"
        build_root.mkdir(parents=True, exist_ok=True)
        (build_root / "CMakeCache.txt").write_text("PROJECT_NAME=ShaderBuild\n", encoding="utf-8")
        shader_path = project_root / "Assets" / "Shaders" / "ExampleShader.shader"
        shader_path.parent.mkdir(parents=True, exist_ok=True)
        shader_path.write_text("shader-source", encoding="utf-8")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-render-shader-execute-1",
                        "prompt_text": 'Rebuild shader "ExampleShader".',
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": True,
                        "preferred_domains": ["render-lookdev"],
                    },
                )
                assert create_response.status_code == 200

                execute_response = client.post(
                    "/prompt/sessions/prompt-render-shader-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "waiting_approval"
                approval = approvals_service.get_approval(payload["pending_approval_id"])
                assert approval is not None
                approvals_service.approve(approval.id)

                execute_response = client.post(
                    "/prompt/sessions/prompt-render-shader-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "completed"
                assert (
                    "Shader rebuild preflight confirmed configured build tree evidence"
                    in payload["final_result_summary"]
                )
                assert (
                    "No real render.shader.rebuild execution was attempted"
                    in payload["final_result_summary"]
                )
                child_response = payload["latest_child_responses"][-1]
                details = child_response["execution_details"]
                assert details["inspection_surface"] == "render_shader_rebuild_preflight"
                assert details["configured_build_tree_available"] is True
                assert details["shader_source_candidates_found_for_all_requested_targets"] is True
                assert details["execution_attempted"] is False
                assert details["result_artifact_produced"] is False
                assert str(shader_path) in details["resolved_shader_candidate_paths"]


def test_prompt_session_executes_test_run_editor_python_with_truthful_preflight_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        runner_path = project_root / "EditorPythonRunner.exe"
        runner_path.write_bytes(b"editor-python-prompt-runner")
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_PROJECT_ROOT": str(project_root),
                "O3DE_EDITOR_SCRIPT_RUNNER": str(runner_path),
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.o3de_target_service.get_bridge_status",
                return_value=type(
                    "BridgeStatus",
                    (),
                    {
                        "configured": True,
                        "project_root": str(project_root),
                        "heartbeat_fresh": True,
                        "heartbeat_path": str(
                            project_root
                            / "user"
                            / "ControlPlaneBridge"
                            / "heartbeat"
                            / "status.json"
                        ),
                        "runner_process_active": False,
                    },
                )(),
            ):
                with isolated_client() as client:
                    create_response = client.post(
                        "/prompt/sessions",
                        json={
                            "prompt_id": "prompt-editor-python-execute-1",
                            "prompt_text": (
                                'Run editor python test "Automated.testing.sample_test".'
                            ),
                            "project_root": str(project_root),
                            "engine_root": "C:/engine",
                            "dry_run": True,
                            "preferred_domains": ["validation"],
                        },
                    )
                    assert create_response.status_code == 200

                    execute_response = client.post(
                        "/prompt/sessions/prompt-editor-python-execute-1/execute"
                    )
                    assert execute_response.status_code == 200
                    payload = execute_response.json()
                    assert payload["status"] == "waiting_approval"
                    approval = approvals_service.get_approval(payload["pending_approval_id"])
                    assert approval is not None
                    approvals_service.approve(approval.id)

                    execute_response = client.post(
                        "/prompt/sessions/prompt-editor-python-execute-1/execute"
                    )
                    assert execute_response.status_code == 200
                    payload = execute_response.json()
                    assert payload["status"] == "completed"
                    assert (
                        "Editor Python preflight confirmed admitted runner/runtime evidence"
                        in payload["final_result_summary"]
                    )
                    assert (
                        "No editor-hosted Python test execution was attempted"
                        in payload["final_result_summary"]
                    )
                    child_response = payload["latest_child_responses"][-1]
                    details = child_response["execution_details"]
                    assert details["inspection_surface"] == "editor_python_runner_preflight"
                    assert details["runner_runtime_available"] is True
                    assert details["execution_attempted"] is False
                    assert details["result_artifact_produced"] is False
                    assert details["runtime_runner_path"] == str(runner_path.resolve())


def test_prompt_session_executes_test_tiaf_sequence_with_truthful_preflight_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_PROJECT_ROOT": str(project_root),
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.o3de_target_service.get_bridge_status",
                return_value=type(
                    "BridgeStatus",
                    (),
                    {
                        "configured": True,
                        "project_root": str(project_root),
                        "heartbeat_fresh": True,
                        "heartbeat_path": str(
                            project_root
                            / "user"
                            / "ControlPlaneBridge"
                            / "heartbeat"
                            / "status.json"
                        ),
                        "runner_process_active": False,
                    },
                )(),
            ):
                with isolated_client() as client:
                    create_response = client.post(
                        "/prompt/sessions",
                        json={
                            "prompt_id": "prompt-tiaf-execute-1",
                            "prompt_text": 'Run TIAF sequence "smoke-sequence".',
                            "project_root": str(project_root),
                            "engine_root": "C:/engine",
                            "dry_run": True,
                            "preferred_domains": ["validation"],
                        },
                    )
                    assert create_response.status_code == 200

                    execute_response = client.post("/prompt/sessions/prompt-tiaf-execute-1/execute")
                    assert execute_response.status_code == 200
                    payload = execute_response.json()
                    assert payload["status"] == "waiting_approval"
                    approval = approvals_service.get_approval(payload["pending_approval_id"])
                    assert approval is not None
                    approvals_service.approve(approval.id)

                    execute_response = client.post("/prompt/sessions/prompt-tiaf-execute-1/execute")
                    assert execute_response.status_code == 200
                    payload = execute_response.json()
                    assert payload["status"] == "completed"
                    assert (
                        "TIAF preflight confirmed admitted runner/runtime evidence"
                        in payload["final_result_summary"]
                    )
                    assert (
                        "No TIAF sequence execution was attempted"
                        in payload["final_result_summary"]
                    )
                    child_response = payload["latest_child_responses"][-1]
                    details = child_response["execution_details"]
                    assert details["inspection_surface"] == "tiaf_runner_preflight"
                    assert details["runner_runtime_available"] is True
                    assert details["execution_attempted"] is False
                    assert details["result_artifact_produced"] is False
                    assert details["sequence_name"] == "smoke-sequence"


def test_prompt_session_executes_test_visual_diff_with_truthful_evidence() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        root = Path(temp_dir)
        baseline_path = root / "baseline.png"
        candidate_path = root / "candidate.png"
        create_test_image(baseline_path, size=(2, 2), color=(255, 0, 0, 255))
        create_test_image(candidate_path, size=(2, 2), color=(0, 0, 255, 255))

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                baseline_artifact_id = create_test_artifact_record(
                    path=baseline_path,
                    label="Prompt baseline image",
                )
                candidate_artifact_id = create_test_artifact_record(
                    path=candidate_path,
                    label="Prompt candidate image",
                )

                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-visual-diff-execute-1",
                        "prompt_text": (
                            f'Run visual diff for "{baseline_artifact_id}" and "{candidate_artifact_id}".'
                        ),
                        "project_root": str(root),
                        "engine_root": "C:/engine",
                        "dry_run": True,
                        "preferred_domains": ["validation"],
                    },
                )
                assert create_response.status_code == 200

                execute_response = client.post(
                    "/prompt/sessions/prompt-visual-diff-execute-1/execute"
                )
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "completed"
                assert payload["child_run_ids"]
                assert len(payload["child_run_ids"]) == 1
                assert payload["latest_child_responses"][0]["ok"] is True
                assert (
                    payload["latest_child_responses"][0]["result"]["execution_mode"] == "real"
                )
                details = payload["latest_child_responses"][0]["execution_details"]
                assert details["inspection_surface"] == "artifact_file_comparison"
                assert details["comparison_available"] is True
                assert details["comparison_status"] == "different"
                assert details["baseline_image_decodable"] is True
                assert details["candidate_image_decodable"] is True
                assert details["baseline_image_width"] == 2
                assert details["baseline_image_height"] == 2
                assert details["candidate_image_width"] == 2
                assert details["candidate_image_height"] == 2
                assert details["visual_metric_available"] is True
                assert details["visual_metric_name"] == "exact_rgba_pixel_match_ratio"
                assert details["visual_metric_value"] == 0.0
                assert (
                    "Artifact comparison confirmed differing file identity for the requested inputs."
                    in payload["final_result_summary"]
                )
                assert (
                    "Image decode confirmed baseline 2x2 RGBA and candidate 2x2 RGBA."
                    in payload["final_result_summary"]
                )
                assert (
                    "Visual metric readback confirmed exact_rgba_pixel_match_ratio = 0.0."
                    in payload["final_result_summary"]
                )


def test_prompt_session_execute_creates_child_lineage_and_pauses_for_approval() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "PromptProject", "version": "1.0.0"}),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-execute-1",
                        "prompt_text": 'Inspect project manifest and enable gem "MyTestGem".',
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": True,
                        "preferred_domains": [],
                    },
                )
                assert create_response.status_code == 200

                execute_response = client.post("/prompt/sessions/prompt-execute-1/execute")
                assert execute_response.status_code == 200
                payload = execute_response.json()
                assert payload["status"] == "waiting_approval"
                assert payload["current_step_id"] == "gem-enable-1"
                assert payload["pending_approval_id"]
                assert payload["pending_approval_token"]
                assert payload["last_error_code"] == "APPROVAL_REQUIRED"
                assert payload["last_error_retryable"] is True
                assert payload["next_step_index"] == 1
                assert payload["step_attempts"] == {
                    "project-inspect-1": 1,
                    "gem-enable-1": 1,
                }
                assert payload["child_run_ids"]
                assert len(payload["child_run_ids"]) == 2
                assert len(payload["child_execution_ids"]) == 2
                assert len(payload["child_artifact_ids"]) == 1
                assert len(payload["child_event_ids"]) >= 2
                assert "pending tool-level approval" in payload["final_result_summary"]
                assert payload["evidence_summary"].startswith(
                    "runs=2, executions=2, artifacts=1, events="
                )
                assert len(payload["latest_child_responses"]) == 2
                assert payload["latest_child_responses"][0]["ok"] is True
                assert payload["latest_child_responses"][1]["ok"] is False
                assert payload["latest_child_responses"][1]["error"]["code"] == "APPROVAL_REQUIRED"

                stored = client.get("/prompt/sessions/prompt-execute-1")
                assert stored.status_code == 200
                stored_payload = stored.json()
                assert stored_payload["status"] == "waiting_approval"
                assert stored_payload["child_run_ids"] == payload["child_run_ids"]
                assert stored_payload["pending_approval_id"] == payload["pending_approval_id"]

                executions_response = client.get("/executions")
                assert executions_response.status_code == 200
                executions_by_tool = {
                    execution["tool"]: execution
                    for execution in executions_response.json()["executions"]
                }
                assert (
                    executions_by_tool["project.inspect"]["details"]["prompt_safety"][
                        "natural_language_status"
                    ]
                    == "prompt-ready-read-only"
                )
                assert (
                    executions_by_tool["gem.enable"]["details"]["prompt_safety"][
                        "natural_language_status"
                    ]
                    == "prompt-ready-approval-gated"
                )

                artifacts_response = client.get("/artifacts")
                assert artifacts_response.status_code == 200
                artifacts_by_tool = {
                    artifact["metadata"]["tool"]: artifact
                    for artifact in artifacts_response.json()["artifacts"]
                }
                assert (
                    artifacts_by_tool["project.inspect"]["metadata"]["prompt_safety"][
                        "natural_language_status"
                    ]
                    == "prompt-ready-read-only"
                )


def test_prompt_session_execute_resumes_after_approval_without_losing_lineage() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "PromptProject", "version": "1.0.0"}),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-resume-1",
                        "prompt_text": 'Inspect project manifest and enable gem "MyTestGem".',
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": True,
                        "preferred_domains": [],
                    },
                )
                assert create_response.status_code == 200

                paused_response = client.post("/prompt/sessions/prompt-resume-1/execute")
                assert paused_response.status_code == 200
                paused_payload = paused_response.json()
                assert paused_payload["status"] == "waiting_approval"
                paused_run_ids = paused_payload["child_run_ids"]
                assert len(paused_run_ids) == 2

                approval_response = client.post(
                    f"/approvals/{paused_payload['pending_approval_id']}/approve",
                    json={},
                )
                assert approval_response.status_code == 200

                resumed_response = client.post("/prompt/sessions/prompt-resume-1/execute")
                assert resumed_response.status_code == 200
                resumed_payload = resumed_response.json()
                assert resumed_payload["status"] == "completed"
                assert resumed_payload["next_step_index"] == 2
                assert resumed_payload["current_step_id"] is None
                assert resumed_payload["pending_approval_id"] is None
                assert resumed_payload["pending_approval_token"] is None
                assert resumed_payload["last_error_code"] is None
                assert resumed_payload["last_error_retryable"] is False
                assert resumed_payload["child_run_ids"][:2] == paused_run_ids
                assert len(resumed_payload["child_run_ids"]) == 3
                assert len(resumed_payload["child_execution_ids"]) == 3
                assert len(resumed_payload["latest_child_responses"]) == 3
                assert resumed_payload["latest_child_responses"][-1]["ok"] is True
                assert resumed_payload["step_attempts"] == {
                    "project-inspect-1": 1,
                    "gem-enable-1": 2,
                }
                assert resumed_payload["evidence_summary"].startswith(
                    "runs=3, executions=3, artifacts="
                )
                assert (
                    "Gem enable preflight published a mutation-ready local gem_names insertion plan for MyTestGem, but writes remain intentionally disabled."
                    in resumed_payload["final_result_summary"]
                )
                assert (
                    "No real gem.enable execution was attempted in this admitted slice."
                    in resumed_payload["final_result_summary"]
                )


def test_prompt_session_execute_retries_failed_step_when_retryable() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-retry-1",
                "prompt_text": "Inspect project manifest.",
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": [],
            },
        )
        assert response.status_code == 200

        dispatch_attempts: list[str] = []

        def fake_dispatch(request):  # type: ignore[no-untyped-def]
            dispatch_attempts.append(request.request_id)
            if len(dispatch_attempts) == 1:
                return ResponseEnvelope(
                    request_id=request.request_id,
                    ok=False,
                    operation_id="run-transient-1",
                    error=ResponseError(
                        code="TRANSIENT_REMOTE",
                        message="Temporary remote execution failure.",
                        retryable=True,
                    ),
                    logs=["Transient failure encountered."],
                )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=True,
                operation_id="run-transient-2",
                result={
                    "status": "simulated_success",
                    "tool": "project.inspect",
                    "agent": "project-build",
                    "project_root": "C:/project",
                    "engine_root": "C:/engine",
                    "dry_run": True,
                    "simulated": True,
                    "execution_mode": "simulated",
                    "approval_class": "read_only",
                    "locks_acquired": ["project_config"],
                    "message": "Retry succeeded.",
                },
                logs=["Retry succeeded."],
            )

        with patch("app.services.prompt_orchestrator.dispatcher_service.dispatch", side_effect=fake_dispatch):
            first_execute = client.post("/prompt/sessions/prompt-retry-1/execute")
            assert first_execute.status_code == 200
            first_payload = first_execute.json()
            assert first_payload["status"] == "failed"
            assert first_payload["current_step_id"] == "project-inspect-1"
            assert first_payload["next_step_index"] == 0
            assert first_payload["last_error_code"] == "TRANSIENT_REMOTE"
            assert first_payload["last_error_retryable"] is True
            assert first_payload["step_attempts"] == {"project-inspect-1": 1}
            assert first_payload["child_run_ids"] == ["run-transient-1"]
            assert len(first_payload["latest_child_responses"]) == 1

            second_execute = client.post("/prompt/sessions/prompt-retry-1/execute")
            assert second_execute.status_code == 200
            second_payload = second_execute.json()
            assert second_payload["status"] == "completed"
            assert second_payload["current_step_id"] is None
            assert second_payload["next_step_index"] == 1
            assert second_payload["last_error_code"] is None
            assert second_payload["last_error_retryable"] is False
            assert second_payload["step_attempts"] == {"project-inspect-1": 2}
            assert second_payload["child_run_ids"] == [
                "run-transient-1",
                "run-transient-2",
            ]
            assert len(second_payload["latest_child_responses"]) == 2


def test_prompt_session_refuses_arbitrary_command_execution() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-refusal-1",
                "prompt_text": "Run a python script to modify the project however you want.",
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": True,
                "preferred_domains": [],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "refused"
        assert payload["plan"]["admitted"] is False
        assert payload["plan"]["steps"] == []
        assert payload["plan"]["refusal_reason"]
        assert payload["refused_capabilities"] == ["arbitrary-command-execution"]


@pytest.mark.parametrize(
    ("prompt_id", "prompt_text"),
    [
        (
            "prompt-editor-candidate-delete-1",
            'Delete entity named "Hero" from level "Levels/Main.level".',
        ),
        (
            "prompt-editor-candidate-property-write-1",
            'Set component property "Controller|Configuration|Model Asset" '
            "on entity id 101 in the editor.",
        ),
        (
            "prompt-editor-candidate-property-write-2",
            'Write component property "Comment|Configuration|Text" '
            "on entity id 101 in the editor.",
        ),
        (
            "prompt-editor-candidate-property-write-3",
            "Change the Mesh model asset on entity id 101 in the editor.",
        ),
        (
            "prompt-editor-candidate-property-write-4",
            "Modify the component property on entity id 101 in the editor.",
        ),
        (
            "prompt-editor-candidate-property-write-5",
            'Toggle Camera property "Controller|Configuration|Make active camera on activation?" '
            "on entity id 101 in the editor.",
        ),
        (
            "prompt-editor-candidate-camera-far-clip-write-1",
            'Open level "Levels/Main.level", set the Camera far clip distance '
            'on entity named "ShotCamera" to 512.',
        ),
        (
            "prompt-editor-candidate-camera-far-clip-write-2",
            'Open level "Levels/Main.level", change far clip distance on the '
            'Camera component for entity named "ShotCamera" to 512.',
        ),
        (
            "prompt-editor-candidate-camera-field-of-view-write-1",
            'Open level "Levels/Main.level", set the Camera field of view '
            'on entity named "ShotCamera" to 60.',
        ),
        (
            "prompt-editor-candidate-camera-near-clip-write-1",
            'Open level "Levels/Main.level", change near clip distance on the '
            'Camera component for entity named "ShotCamera" to 0.1.',
        ),
        (
            "prompt-editor-candidate-camera-frustum-width-write-1",
            'Open level "Levels/Main.level", modify the Camera frustum width '
            'on entity named "ShotCamera" to 20.',
        ),
        (
            "prompt-editor-candidate-prefab-1",
            'Open prefab "Prefabs/Crate.prefab" in the editor.',
        ),
        (
            "prompt-editor-candidate-reparent-1",
            'Reparent entity named "Wheel" under entity named "Car" in the editor.',
        ),
        (
            "prompt-editor-candidate-transform-1",
            'Move entity named "Hero" to position 1, 2, 3 in the editor.',
        ),
        (
            "prompt-editor-candidate-transform-2",
            'Open level "Levels/Main.level", set transform on entity named '
            '"Hero" to origin.',
        ),
        (
            "prompt-editor-candidate-visibility-1",
            'Open level "Levels/Main.level", hide entity named "Hero" in '
            "the editor.",
        ),
        (
            "prompt-editor-candidate-lock-1",
            'Open level "Levels/Main.level", lock entity named "Hero" in '
            "the editor.",
        ),
        (
            "prompt-editor-candidate-component-enable-1",
            'Open level "Levels/Main.level", enable Mesh component on entity '
            'named "Hero".',
        ),
        (
            "prompt-editor-candidate-entity-activate-1",
            'Open level "Levels/Main.level", activate entity named "Hero".',
        ),
        (
            "prompt-editor-candidate-component-remove-1",
            "Remove Mesh component from entity id 101 in the editor.",
        ),
        (
            "prompt-editor-candidate-material-assign-1",
            'Assign material "Materials/Hero.material" to entity id 101 in the editor.',
        ),
        (
            "prompt-editor-candidate-render-setting-1",
            'Open level "Levels/Main.level", change render setting exposure '
            "to 1.0 in the editor.",
        ),
        (
            "prompt-editor-candidate-build-setting-1",
            'Open level "Levels/Main.level", change build setting "profile" '
            "in the editor.",
        ),
        (
            "prompt-editor-candidate-tiaf-state-1",
            'Open level "Levels/Main.level", update TIAF state for the current '
            "level.",
        ),
        (
            "prompt-editor-candidate-editor-command-1",
            "Execute an editor command to change the selected entity.",
        ),
        (
            "prompt-editor-candidate-editor-python-1",
            'Open level "Levels/Main.level", execute Python in the editor to '
            "change the selected entity.",
        ),
        (
            "prompt-editor-candidate-editor-python-2",
            'Open level "Levels/Main.level", run Python in the editor to '
            "change the selected entity.",
        ),
        (
            "prompt-editor-candidate-editor-script-1",
            'Open level "Levels/Main.level", run an editor script to change '
            "the selected entity.",
        ),
        (
            "prompt-editor-candidate-hotkey-1",
            'Open level "Levels/Main.level", press Ctrl+Z in the editor.',
        ),
        (
            "prompt-editor-candidate-hotkey-2",
            'Open level "Levels/Main.level", use a hotkey to duplicate entity '
            'named "Hero".',
        ),
        (
            "prompt-editor-candidate-toolbar-1",
            'Open level "Levels/Main.level", click the viewport toolbar to '
            "change camera settings.",
        ),
        (
            "prompt-editor-candidate-select-1",
            'Open level "Levels/Main.level", select entity named "Hero" in '
            "the editor.",
        ),
        (
            "prompt-editor-candidate-duplicate-1",
            'Open level "Levels/Main.level", duplicate entity named "Hero" '
            "in the editor.",
        ),
        (
            "prompt-editor-candidate-rename-1",
            'Open level "Levels/Main.level", rename entity named "Hero" to '
            '"Boss" in the editor.',
        ),
    ],
)
def test_prompt_session_refuses_candidate_editor_mutation_intents_without_session_plan(
    prompt_id: str,
    prompt_text: str,
) -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": prompt_id,
                "prompt_text": prompt_text,
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["editor-control"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "refused"
        assert payload["admitted_capabilities"] == []
        assert payload["refused_capabilities"] == [
            "editor.candidate_mutation.unsupported"
        ]
        assert payload["plan"]["admitted"] is False
        assert payload["plan"]["steps"] == []
        assert (
            "outside the admitted Phase 8 editor envelope"
            in payload["plan"]["refusal_reason"]
        )
        assert any(
            "restore/reload verification" in requirement
            for requirement in payload["plan"]["capability_requirements"]
        )


@pytest.mark.parametrize(
    ("prompt_id", "prompt_text"),
    [
        (
            "prompt-editor-property-discovery-1",
            "List component properties for entity id 101 in the editor.",
        ),
        (
            "prompt-editor-property-discovery-2",
            "Discover property paths on the Mesh component in the editor.",
        ),
        (
            "prompt-editor-property-discovery-3",
            "Show me the component property list for entity id 101.",
        ),
    ],
)
def test_prompt_session_refuses_component_property_discovery_without_session_plan(
    prompt_id: str,
    prompt_text: str,
) -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": prompt_id,
                "prompt_text": prompt_text,
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["editor-control"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "refused"
        assert payload["admitted_capabilities"] == []
        assert payload["refused_capabilities"] == [
            "editor.component.property.list.unsupported"
        ]
        assert payload["plan"]["admitted"] is False
        assert payload["plan"]["steps"] == []
        assert "Component property listing is not admitted yet" in payload["plan"][
            "refusal_reason"
        ]
        assert any(
            "typed read-only property-list packet" in requirement
            for requirement in payload["plan"]["capability_requirements"]
        )
        capabilities_response = client.get("/prompt/capabilities")
        assert capabilities_response.status_code == 200
        capability_names = {
            item["tool_name"]
            for item in capabilities_response.json()["capabilities"]
        }
        assert "editor.component.property.list" not in capability_names
        assert "editor.component.property.write" not in capability_names
        assert "editor.camera.scalar.write.proof" not in capability_names


def test_prompt_session_plans_exact_camera_bool_write_corridor_only() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-camera-bool-write-plan-1",
                "prompt_text": (
                    'Open level "Levels/Main.level", create entity named "ShotCamera", '
                    "add a Camera component, then set the Camera make active camera "
                    "on activation bool to false."
                ),
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["editor-control"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["refused_capabilities"] == []
        assert [step["tool"] for step in payload["plan"]["steps"]] == [
            "editor.session.open",
            "editor.level.open",
            "editor.entity.create",
            "editor.component.add",
            "editor.component.property.get",
            "editor.component.property.write.camera_bool_make_active_on_activation",
            "editor.component.property.get",
        ]
        write_step = next(
            step
            for step in payload["plan"]["steps"]
            if step["tool"]
            == "editor.component.property.write.camera_bool_make_active_on_activation"
        )
        assert write_step["step_id"] == "editor-camera-bool-write-1"
        assert write_step["args"] == {
            "component_name": "Camera",
            "component_id": "$step:editor-component-1.added_component_refs[0].component_id",
            "component_id_provenance": (
                "$step:editor-component-1.added_component_refs[0].component_id_provenance"
            ),
            "property_path": (
                "Controller|Configuration|Make active camera on activation?"
            ),
            "value": False,
            "expected_current_value": "$step:editor-camera-bool-before-1.value",
            "restore_boundary_id": "$step:editor-component-1.restore_boundary_id",
            "level_path": "Levels/Main.level",
        }
        assert write_step["approval_class"] == "content_write"
        assert write_step["capability_status_required"] == "mutation-gated"


def test_prompt_session_refuses_exact_camera_bool_write_without_same_chain_camera_add() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-camera-bool-write-refuse-1",
                "prompt_text": (
                    "Set the Camera make active camera on activation bool to true "
                    "on entity id 101 in the editor."
                ),
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["editor-control"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "refused"
        assert payload["admitted_capabilities"] == []
        assert payload["plan"]["steps"] == []
        assert payload["refused_capabilities"] == [
            (
                "editor.component.property.write.camera_bool_make_active_on_activation "
                "requires a same-chain temporary entity plus admitted Camera component "
                "add before the exact bool write."
            )
        ]
        assert any(
            "does not admit generic property writes"
            in requirement
            for requirement in payload["plan"]["capability_requirements"]
        )


def test_prompt_session_plans_exact_camera_bool_restore_corridor_only() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-camera-bool-restore-plan-1",
                "prompt_text": (
                    'Open level "Levels/Main.level", create entity named "ShotCamera", '
                    "add a Camera component, then restore the Camera make active camera "
                    "on activation bool to the recorded before value false."
                ),
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["editor-control"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["refused_capabilities"] == []
        assert [step["tool"] for step in payload["plan"]["steps"]] == [
            "editor.session.open",
            "editor.level.open",
            "editor.entity.create",
            "editor.component.add",
            "editor.component.property.get",
            "editor.component.property.restore.camera_bool_make_active_on_activation",
            "editor.component.property.get",
        ]
        restore_step = next(
            step
            for step in payload["plan"]["steps"]
            if step["tool"]
            == "editor.component.property.restore.camera_bool_make_active_on_activation"
        )
        assert restore_step["step_id"] == "editor-camera-bool-restore-1"
        assert restore_step["args"] == {
            "component_name": "Camera",
            "component_id": "$step:editor-component-1.added_component_refs[0].component_id",
            "component_id_provenance": (
                "$step:editor-component-1.added_component_refs[0].component_id_provenance"
            ),
            "property_path": (
                "Controller|Configuration|Make active camera on activation?"
            ),
            "before_value": False,
            "expected_current_value": "$step:editor-camera-bool-current-1.value",
            "restore_boundary_id": "$step:editor-component-1.restore_boundary_id",
            "level_path": "Levels/Main.level",
        }
        assert restore_step["approval_class"] == "content_write"
        assert restore_step["capability_status_required"] == "mutation-gated"


def test_prompt_session_refuses_exact_camera_bool_restore_without_before_value() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-camera-bool-restore-refuse-before-1",
                "prompt_text": (
                    'Open level "Levels/Main.level", create entity named "ShotCamera", '
                    "add a Camera component, then restore the Camera make active camera "
                    "on activation bool."
                ),
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["editor-control"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "refused"
        assert payload["admitted_capabilities"] == []
        assert payload["plan"]["steps"] == []
        assert payload["refused_capabilities"] == [
            (
                "editor.component.property.restore.camera_bool_make_active_on_activation "
                "requires recorded bool before_value evidence in the prompt."
            )
        ]


@pytest.mark.parametrize(
    ("prompt_id", "prompt_text"),
    [
        (
            "prompt-generic-undo-refuse-1",
            "Undo the last editor change in the level.",
        ),
        (
            "prompt-camera-far-clip-restore-refuse-1",
            'Restore the Camera far clip distance on entity named "ShotCamera" '
            "to its previous value.",
        ),
    ],
)
def test_prompt_session_refuses_generic_restore_prompts(
    prompt_id: str,
    prompt_text: str,
) -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": prompt_id,
                "prompt_text": prompt_text,
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["editor-control"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "refused"
        assert payload["admitted_capabilities"] == []
        assert payload["refused_capabilities"] == ["editor.restore.unsupported"]
        assert any(
            "generic restore and generalized undo are not admitted" in requirement
            for requirement in payload["plan"]["capability_requirements"]
        )


def test_prompt_session_plans_exact_camera_bool_readback_without_write() -> None:
    property_path = "Controller|Configuration|Make active camera on activation?"
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-camera-bool-readback-plan-1",
                "prompt_text": (
                    'Open level "Levels/Main.level", then show the current '
                    "value of the Camera make active camera on activation bool "
                    "on entity id 101."
                ),
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["editor-control"],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert payload["refused_capabilities"] == []
        assert [step["tool"] for step in payload["plan"]["steps"]] == [
            "editor.session.open",
            "editor.level.open",
            "editor.component.find",
            "editor.component.property.get",
        ]
        assert payload["plan"]["steps"][1]["args"] == {
            "level_path": "Levels/Main.level",
            "make_writable": False,
            "focus_viewport": False,
        }
        assert payload["plan"]["steps"][2]["args"] == {
            "component_name": "Camera",
            "entity_id": "101",
            "level_path": "Levels/Main.level",
        }
        assert payload["plan"]["steps"][3]["args"] == {
            "component_id": "$step:editor-component-find-1.component_id",
            "property_path": property_path,
            "level_path": "Levels/Main.level",
        }
        assert "editor.component.property.write" not in (
            step["tool"] for step in payload["plan"]["steps"]
        )
        assert "editor.component.property.list" not in (
            step["tool"] for step in payload["plan"]["steps"]
        )


def test_exact_camera_bool_readback_review_summary_is_read_only() -> None:
    def step(step_id: str, tool: str) -> PromptPlanStep:
        return PromptPlanStep(
            step_id=step_id,
            tool=tool,
            agent="editor-control",
            args={},
            approval_class="read_only",
            capability_status_required="hybrid-read-only",
            capability_maturity="hybrid-read-only",
        )

    property_path = "Controller|Configuration|Make active camera on activation?"
    component_id = "EntityComponentIdPair(EntityId(101), 301)"
    session = PromptSessionRecord(
        prompt_id="prompt-camera-bool-readback-review-1",
        plan_id="plan-camera-bool-readback-review-1",
        status=PromptSessionStatus.COMPLETED,
        prompt_text=(
            'Open level "Levels/Main.level", then show the current value of '
            "the Camera make active camera on activation bool on entity id 101."
        ),
        project_root="C:/project",
        engine_root="C:/engine",
        plan=PromptPlan(
            prompt_id="prompt-camera-bool-readback-review-1",
            plan_id="plan-camera-bool-readback-review-1",
            admitted=True,
            summary="Exact Camera bool readback plan.",
            steps=[
                step("editor-session-1", "editor.session.open"),
                step("editor-level-1", "editor.level.open"),
                step("editor-component-find-1", "editor.component.find"),
                step("editor-component-property-1", "editor.component.property.get"),
            ],
        ),
        latest_child_responses=[
            {
                "prompt_step_id": "editor-session-1",
                "ok": True,
                "execution_details": {"loaded_level_path": "Levels/Main.level"},
            },
            {
                "prompt_step_id": "editor-level-1",
                "ok": True,
                "execution_details": {"level_path": "Levels/Main.level"},
            },
            {
                "prompt_step_id": "editor-component-find-1",
                "ok": True,
                "execution_details": {
                    "found": True,
                    "entity_id": "101",
                    "entity_name": "ShotCamera",
                    "component_name": "Camera",
                    "component_id": component_id,
                    "component_id_provenance": (
                        "admitted_runtime_component_discovery_result"
                    ),
                    "level_path": "Levels/Main.level",
                },
            },
            {
                "prompt_step_id": "editor-component-property-1",
                "ok": True,
                "execution_details": {
                    "component_id": component_id,
                    "property_path": property_path,
                    "value": True,
                    "value_type": "bool",
                    "read_only": True,
                    "write_occurred": False,
                    "write_admission": False,
                    "property_list_admission": False,
                    "level_path": "Levels/Main.level",
                },
            },
        ],
    )

    summary = PromptOrchestratorService()._build_editor_chain_review_summary(session)

    assert summary is not None
    assert "Review result: succeeded_verified" in summary
    assert "Camera bool readback target entity ShotCamera, component Camera" in summary
    assert f"property {property_path}" in summary
    assert "value_type=bool" in summary
    assert "current_value=True" in summary
    assert "read_only=True" in summary
    assert "write_occurred=False" in summary
    assert "editor.component.property.write.camera_bool_make_active_on_activation" not in (
        summary
    )
    assert "public property listing" not in summary


def test_exact_camera_bool_write_review_summary_is_operator_facing() -> None:
    def step(
        step_id: str,
        tool: str,
        *,
        approval_class: str = "read_only",
        capability_status_required: str = "hybrid-read-only",
    ) -> PromptPlanStep:
        return PromptPlanStep(
            step_id=step_id,
            tool=tool,
            agent="editor-control",
            args={},
            approval_class=approval_class,
            capability_status_required=capability_status_required,
            capability_maturity="hybrid-read-only",
        )

    capability_name = (
        "editor.component.property.write.camera_bool_make_active_on_activation"
    )
    property_path = "Controller|Configuration|Make active camera on activation?"
    session = PromptSessionRecord(
        prompt_id="prompt-camera-bool-write-review-1",
        plan_id="plan-camera-bool-write-review-1",
        status=PromptSessionStatus.COMPLETED,
        prompt_text=(
            'Open level "Levels/Main.level", create entity named "ShotCamera", '
            "add a Camera component, then set the Camera make active camera "
            "on activation bool to false."
        ),
        project_root="C:/project",
        engine_root="C:/engine",
        plan=PromptPlan(
            prompt_id="prompt-camera-bool-write-review-1",
            plan_id="plan-camera-bool-write-review-1",
            admitted=True,
            summary="Exact Camera bool write plan.",
            steps=[
                step("editor-session-1", "editor.session.open"),
                step("editor-level-1", "editor.level.open"),
                step(
                    "editor-entity-1",
                    "editor.entity.create",
                    approval_class="content_write",
                    capability_status_required="admitted-real",
                ),
                step(
                    "editor-component-1",
                    "editor.component.add",
                    approval_class="content_write",
                    capability_status_required="admitted-real",
                ),
                step("editor-camera-bool-before-1", "editor.component.property.get"),
                step(
                    "editor-camera-bool-write-1",
                    capability_name,
                    approval_class="content_write",
                    capability_status_required="mutation-gated",
                ),
                step("editor-camera-bool-after-1", "editor.component.property.get"),
            ],
        ),
        latest_child_responses=[
            {
                "prompt_step_id": "editor-session-1",
                "ok": True,
                "execution_details": {"loaded_level_path": "Levels/Main.level"},
            },
            {
                "prompt_step_id": "editor-level-1",
                "ok": True,
                "execution_details": {"level_path": "Levels/Main.level"},
            },
            {
                "prompt_step_id": "editor-entity-1",
                "ok": True,
                "execution_details": {
                    "entity_name": "ShotCamera",
                    "entity_id": "101",
                    "level_path": "Levels/Main.level",
                },
            },
            {
                "prompt_step_id": "editor-component-1",
                "ok": True,
                "execution_details": {
                    "entity_id": "101",
                    "added_components": ["Camera"],
                    "added_component_refs": [
                        {
                            "component": "Camera",
                            "component_id": "EntityComponentIdPair(EntityId(101), 301)",
                            "component_id_provenance": (
                                "admitted_runtime_component_add_result"
                            ),
                        }
                    ],
                    "restore_boundary_id": "restore-boundary-1",
                    "restore_boundary_available": True,
                },
            },
            {
                "prompt_step_id": "editor-camera-bool-before-1",
                "ok": True,
                "execution_details": {
                    "component_name": "Camera",
                    "component_id": "EntityComponentIdPair(EntityId(101), 301)",
                    "property_path": property_path,
                    "value": True,
                },
            },
            {
                "prompt_step_id": "editor-camera-bool-write-1",
                "ok": True,
                "result": {
                    "tool": capability_name,
                    "approval_class": "content_write",
                },
                "execution_details": {
                    "capability_name": capability_name,
                    "component_name": "Camera",
                    "component_id": "EntityComponentIdPair(EntityId(101), 301)",
                    "component_id_provenance": (
                        "admitted_runtime_component_add_result"
                    ),
                    "property_path": property_path,
                    "previous_value": True,
                    "requested_value": False,
                    "value": False,
                    "write_verified": True,
                    "admission_class": "content_write",
                    "generalized_undo_available": False,
                    "public_admission": True,
                    "write_admission": True,
                    "property_list_admission": False,
                    "restore_or_revert_guidance": (
                        "This is not generalized undo. To revert the value, "
                        "rerun the same exact Camera bool corridor with the "
                        "recorded previous_value when available."
                    ),
                },
            },
            {
                "prompt_step_id": "editor-camera-bool-after-1",
                "ok": True,
                "execution_details": {
                    "component_name": "Camera",
                    "component_id": "EntityComponentIdPair(EntityId(101), 301)",
                    "property_path": property_path,
                    "value": False,
                },
            },
        ],
    )

    summary = PromptOrchestratorService()._build_editor_chain_review_summary(session)

    assert summary is not None
    assert "Review result: succeeded_verified" in summary
    assert capability_name in summary
    assert "targeted entity ShotCamera, component Camera" in summary
    assert f"property {property_path}" in summary
    assert "before=True, requested=False, after=False" in summary
    assert "write_verified=True" in summary
    assert "admission_class=content_write" in summary
    assert "generalized_undo_available=False" in summary
    assert "Restore/revert guidance: This is not generalized undo." in summary
    assert "public property listing" in summary
    assert "arbitrary property write" in summary


def test_exact_camera_bool_restore_review_summary_is_operator_facing() -> None:
    def step(
        step_id: str,
        tool: str,
        *,
        approval_class: str = "read_only",
        capability_status_required: str = "hybrid-read-only",
    ) -> PromptPlanStep:
        return PromptPlanStep(
            step_id=step_id,
            tool=tool,
            agent="editor-control",
            args={},
            approval_class=approval_class,
            capability_status_required=capability_status_required,
            capability_maturity="hybrid-read-only",
        )

    capability_name = (
        "editor.component.property.restore.camera_bool_make_active_on_activation"
    )
    property_path = "Controller|Configuration|Make active camera on activation?"
    session = PromptSessionRecord(
        prompt_id="prompt-camera-bool-restore-review-1",
        plan_id="plan-camera-bool-restore-review-1",
        status=PromptSessionStatus.COMPLETED,
        prompt_text=(
            'Open level "Levels/Main.level", create entity named "ShotCamera", '
            "add a Camera component, then restore the Camera make active camera "
            "on activation bool to the recorded before value true."
        ),
        project_root="C:/project",
        engine_root="C:/engine",
        plan=PromptPlan(
            prompt_id="prompt-camera-bool-restore-review-1",
            plan_id="plan-camera-bool-restore-review-1",
            admitted=True,
            summary="Exact Camera bool restore plan.",
            steps=[
                step("editor-session-1", "editor.session.open"),
                step("editor-level-1", "editor.level.open"),
                step("editor-entity-1", "editor.entity.create"),
                step("editor-component-1", "editor.component.add"),
                step("editor-camera-bool-current-1", "editor.component.property.get"),
                step(
                    "editor-camera-bool-restore-1",
                    capability_name,
                    approval_class="content_write",
                    capability_status_required="mutation-gated",
                ),
                step("editor-camera-bool-restored-1", "editor.component.property.get"),
            ],
        ),
        latest_child_responses=[
            {
                "prompt_step_id": "editor-entity-1",
                "ok": True,
                "execution_details": {
                    "entity_name": "ShotCamera",
                    "entity_id": "101",
                    "level_path": "Levels/Main.level",
                },
            },
            {
                "prompt_step_id": "editor-component-1",
                "ok": True,
                "execution_details": {
                    "entity_id": "101",
                    "added_components": ["Camera"],
                    "restore_boundary_id": "restore-boundary-1",
                    "restore_boundary_available": True,
                },
            },
            {
                "prompt_step_id": "editor-camera-bool-current-1",
                "ok": True,
                "execution_details": {
                    "component_name": "Camera",
                    "component_id": "EntityComponentIdPair(EntityId(101), 301)",
                    "property_path": property_path,
                    "value": False,
                    "value_type": "bool",
                },
            },
            {
                "prompt_step_id": "editor-camera-bool-restore-1",
                "ok": True,
                "result": {"tool": capability_name, "approval_class": "content_write"},
                "execution_details": {
                    "capability_name": capability_name,
                    "component_name": "Camera",
                    "component_id": "EntityComponentIdPair(EntityId(101), 301)",
                    "property_path": property_path,
                    "target_entity": "ShotCamera",
                    "target_entity_id": "101",
                    "before_value_evidence": "recorded_before_value",
                    "before_value": True,
                    "current_value": False,
                    "current_value_before_restore": False,
                    "restore_value": True,
                    "restored_value": True,
                    "restored_readback": True,
                    "verification_status": "restored_readback_verified",
                    "verification_result": "restored_readback_verified",
                    "restore_verified": True,
                    "write_occurred": True,
                    "restore_occurred": True,
                    "write_occurred_semantics": (
                        "true only because this exact restore corridor performs one "
                        "bounded write of the recorded before_value; this does not "
                        "admit generic property writes."
                    ),
                    "restore_occurred_semantics": (
                        "true because the exact Camera bool restore corridor wrote "
                        "the recorded before_value and verified restored readback."
                    ),
                    "admission_class": "content_write",
                    "generalized_undo_available": False,
                    "restore_or_revert_guidance": (
                        "This is not generalized undo. Restore only the recorded before_value."
                    ),
                },
            },
            {
                "prompt_step_id": "editor-camera-bool-restored-1",
                "ok": True,
                "execution_details": {
                    "component_name": "Camera",
                    "component_id": "EntityComponentIdPair(EntityId(101), 301)",
                    "property_path": property_path,
                    "value": True,
                },
            },
        ],
    )

    summary = PromptOrchestratorService()._build_editor_chain_review_summary(session)

    assert summary is not None
    assert "Review result: succeeded_verified" in summary
    assert capability_name in summary
    assert "targeted entity ShotCamera, component Camera" in summary
    assert f"property {property_path}" in summary
    assert "before_value_evidence=recorded_before_value" in summary
    assert (
        "before=True, current_before_restore=False, restore_value=True, "
        "restored_readback=True"
    ) in summary
    assert "verification_result=restored_readback_verified" in summary
    assert "admission_class=content_write" in summary
    assert "write_occurred=True" in summary
    assert "restore_occurred=True" in summary
    assert "Write/restore semantics:" in summary
    assert "does not admit generic property writes" in summary
    assert "verified restored readback" in summary
    assert "generalized_undo_available=False" in summary
    assert "Restore/revert guidance: This is not generalized undo." in summary
    assert "generic property restore" in summary
    assert "arbitrary property write" in summary


def test_prompt_session_plans_admitted_real_editor_entity_create() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-editor-real-refused-1",
                        "prompt_text": (
                            'Open level "Levels/Main.level" in the editor and create entity named "Hero".'
                        ),
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": False,
                        "preferred_domains": ["editor-control"],
                    },
                )
                assert create_response.status_code == 200
                create_payload = create_response.json()
                assert create_payload["status"] == "planned"
                assert create_payload["plan"]["refusal_reason"] is None
                assert create_payload["admitted_capabilities"] == [
                    "editor.entity.create",
                    "editor.level.open",
                    "editor.session.open",
                ]
                assert create_payload["refused_capabilities"] == []
                assert [step["tool"] for step in create_payload["plan"]["steps"]] == [
                    "editor.session.open",
                    "editor.level.open",
                    "editor.entity.create",
                ]
                assert create_payload["plan"]["steps"][2]["args"] == {
                    "entity_name": "Hero",
                    "level_path": "Levels/Main.level",
                }
                assert all(
                    step["capability_maturity"] == "real-authoring"
                    for step in create_payload["plan"]["steps"]
                )
                assert all(
                    step["safety_envelope"]["natural_language_status"]
                    == "prompt-ready-approval-gated"
                    for step in create_payload["plan"]["steps"]
                )
                assert all(
                    step["simulated_allowed"] is False
                    for step in create_payload["plan"]["steps"]
                )


def test_prompt_session_plans_editor_component_add_from_created_entity_output() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-editor-chain-plan-1",
                        "prompt_text": (
                            'Open level "Levels/Main.level", create entity named "Hero", '
                            'and add a Camera component.'
                        ),
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": False,
                        "preferred_domains": ["editor-control"],
                    },
                )
                assert create_response.status_code == 200
                create_payload = create_response.json()
                assert create_payload["status"] == "planned"
                assert [step["tool"] for step in create_payload["plan"]["steps"]] == [
                    "editor.session.open",
                    "editor.level.open",
                    "editor.entity.create",
                    "editor.component.add",
                ]
                assert create_payload["plan"]["steps"][3]["args"] == {
                    "entity_id": "$step:editor-entity-1.entity_id",
                    "components": ["Camera"],
                    "level_path": "Levels/Main.level",
                }
                assert create_payload["plan"]["steps"][3]["depends_on"] == [
                    "editor-session-1",
                    "editor-level-1",
                    "editor-entity-1",
                ]
                assert (
                    create_payload["plan"]["steps"][3]["planner_note"]
                    == "Use the entity created by the immediately preceding prompt-authored entity creation step."
                )
                assert create_payload["refused_capabilities"] == []


def test_prompt_session_executes_admitted_real_editor_session_and_level_through_prompt_lineage() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_session_open",
                return_value={
                    "runtime_result": {
                        "editor_session_id": "editor-session-runtime",
                        "loaded_level_path": "Levels/Main.level",
                        "exact_editor_apis": [
                            "azlmbr.legacy.general.open_level_no_prompt"
                        ],
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.session.open",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-session-1",
                        "bridge_result_summary": "editor.session.open completed.",
                        "bridge_heartbeat_seen_at": "2026-04-20T00:00:00Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "control_plane_bridge_bootstrap.py",
                },
            ):
                with patch(
                    "app.services.adapters.editor_automation_runtime_service.execute_level_open",
                    return_value={
                        "runtime_result": {
                            "loaded_level_path": "Levels/Main.level",
                            "level_path": "Levels/Main.level",
                            "created_level": False,
                            "exact_editor_apis": [
                                "azlmbr.legacy.general.open_level_no_prompt"
                            ],
                            "bridge_available": True,
                            "bridge_name": "ControlPlaneEditorBridge",
                            "bridge_version": "0.1.0",
                            "bridge_operation": "editor.level.open",
                            "bridge_contract_version": "v1",
                            "bridge_command_id": "bridge-level-1",
                            "bridge_result_summary": "editor.level.open completed.",
                            "bridge_heartbeat_seen_at": "2026-04-20T00:00:01Z",
                            "bridge_queue_mode": "filesystem-inbox",
                            "editor_transport": "bridge",
                        },
                        "runner_command": ["fake-editor-runner"],
                        "runtime_script": "control_plane_bridge_bootstrap.py",
                    },
                ):
                    with isolated_client() as client:
                        create_response = client.post(
                            "/prompt/sessions",
                            json={
                                "prompt_id": "prompt-editor-real-1",
                                "prompt_text": 'Open level "Levels/Main.level" in the editor.',
                                "project_root": str(project_root),
                                "engine_root": "C:/engine",
                                "dry_run": False,
                                "preferred_domains": ["editor-control"],
                            },
                        )
                        assert create_response.status_code == 200
                        create_payload = create_response.json()
                        assert create_payload["status"] == "planned"
                        assert create_payload["admitted_capabilities"] == [
                            "editor.level.open",
                            "editor.session.open",
                        ]
                        assert [step["tool"] for step in create_payload["plan"]["steps"]] == [
                            "editor.session.open",
                            "editor.level.open",
                        ]
                        assert create_payload["plan"]["steps"][0]["args"]["timeout_s"] == (
                            EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S
                        )
                        assert all(
                            step["capability_maturity"] == "real-authoring"
                            for step in create_payload["plan"]["steps"]
                        )
                        assert all(
                            step["safety_envelope"]["natural_language_status"]
                            == "prompt-ready-approval-gated"
                            for step in create_payload["plan"]["steps"]
                        )
                        assert all(
                            step["simulated_allowed"] is False
                            for step in create_payload["plan"]["steps"]
                        )

                        execute_1 = client.post("/prompt/sessions/prompt-editor-real-1/execute")
                        assert execute_1.status_code == 200
                        payload_1 = execute_1.json()
                        assert payload_1["status"] == "waiting_approval"
                        assert payload_1["current_step_id"] == "editor-session-1"
                        assert payload_1["pending_approval_id"]

                        approve_1 = client.post(
                            f"/approvals/{payload_1['pending_approval_id']}/approve",
                            json={},
                        )
                        assert approve_1.status_code == 200

                        execute_2 = client.post("/prompt/sessions/prompt-editor-real-1/execute")
                        payload_2 = execute_2.json()
                        assert payload_2["status"] == "waiting_approval"
                        assert payload_2["current_step_id"] == "editor-level-1"
                        assert payload_2["next_step_index"] == 1
                        assert payload_2["step_attempts"]["editor-session-1"] == 2
                        assert len(payload_2["child_run_ids"]) == 3
                        assert (
                            payload_2["latest_child_responses"][1]["result"]["execution_mode"]
                            == "real"
                        )
                        assert payload_2["latest_child_responses"][1]["result"]["tool"] == (
                            "editor.session.open"
                        )

                        approve_2 = client.post(
                            f"/approvals/{payload_2['pending_approval_id']}/approve",
                            json={},
                        )
                        assert approve_2.status_code == 200

                        execute_3 = client.post("/prompt/sessions/prompt-editor-real-1/execute")
                        payload_3 = execute_3.json()
                        assert payload_3["status"] == "completed"
                        assert payload_3["current_step_id"] is None
                        assert payload_3["pending_approval_id"] is None
                        assert payload_3["last_error_code"] is None
                        assert payload_3["next_step_index"] == 2
                        assert payload_3["step_attempts"] == {
                            "editor-session-1": 2,
                            "editor-level-1": 2,
                        }
                        assert len(payload_3["child_run_ids"]) == 4
                        assert len(payload_3["child_execution_ids"]) == 4
                        assert len(payload_3["child_artifact_ids"]) == 2
                        assert len(payload_3["latest_child_responses"]) == 4
                        assert payload_3["latest_child_responses"][-1]["result"]["tool"] == (
                            "editor.level.open"
                        )
                        assert (
                            payload_3["latest_child_responses"][-1]["result"]["execution_mode"]
                            == "real"
                        )
                        assert payload_3["workspace_id"] is None
                        assert payload_3["executor_id"] is None

                        stored_response = client.get("/prompt/sessions/prompt-editor-real-1")
                        assert stored_response.status_code == 200
                        stored_payload = stored_response.json()
                        assert stored_payload["status"] == "completed"
                        assert stored_payload["child_run_ids"] == payload_3["child_run_ids"]
                        assert stored_payload["child_execution_ids"] == payload_3["child_execution_ids"]
                        assert stored_payload["child_artifact_ids"] == payload_3["child_artifact_ids"]

                        executions_response = client.get("/executions")
                        assert executions_response.status_code == 200
                        executions_by_tool = {
                            execution["tool"]: execution
                            for execution in executions_response.json()["executions"]
                            if execution["tool"] in {"editor.session.open", "editor.level.open"}
                        }
                        assert (
                            executions_by_tool["editor.session.open"]["details"][
                                "prompt_safety"
                            ]["natural_language_status"]
                            == "prompt-ready-approval-gated"
                        )
                        assert (
                            executions_by_tool["editor.level.open"]["details"][
                                "prompt_safety"
                            ]["natural_language_status"]
                            == "prompt-ready-approval-gated"
                        )

                        artifacts_response = client.get("/artifacts")
                        assert artifacts_response.status_code == 200
                        artifacts_by_tool = {
                            artifact["metadata"]["tool"]: artifact
                            for artifact in artifacts_response.json()["artifacts"]
                            if artifact["metadata"]["tool"]
                            in {"editor.session.open", "editor.level.open"}
                        }
                        assert (
                            artifacts_by_tool["editor.session.open"]["metadata"][
                                "prompt_safety"
                            ]["natural_language_status"]
                            == "prompt-ready-approval-gated"
                        )
                        assert (
                            artifacts_by_tool["editor.level.open"]["metadata"][
                                "prompt_safety"
                            ]["natural_language_status"]
                            == "prompt-ready-approval-gated"
                        )


def test_prompt_session_executes_editor_component_add_with_created_entity_handoff() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        captured_component_args: list[dict[str, object]] = []
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_session_open",
                return_value={
                    "runtime_result": {
                        "editor_session_id": "editor-session-runtime",
                        "loaded_level_path": "Levels/Main.level",
                        "exact_editor_apis": [
                            "azlmbr.legacy.general.open_level_no_prompt"
                        ],
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.session.open",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-session-1",
                        "bridge_result_summary": "editor.session.open completed.",
                        "bridge_heartbeat_seen_at": "2026-04-20T00:00:00Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "control_plane_bridge_bootstrap.py",
                },
            ):
                with patch(
                    "app.services.adapters.editor_automation_runtime_service.execute_level_open",
                    return_value={
                        "runtime_result": {
                            "loaded_level_path": "Levels/Main.level",
                            "level_path": "Levels/Main.level",
                            "created_level": False,
                            "exact_editor_apis": [
                                "azlmbr.legacy.general.open_level_no_prompt"
                            ],
                            "bridge_available": True,
                            "bridge_name": "ControlPlaneEditorBridge",
                            "bridge_version": "0.1.0",
                            "bridge_operation": "editor.level.open",
                            "bridge_contract_version": "v1",
                            "bridge_command_id": "bridge-level-1",
                            "bridge_result_summary": "editor.level.open completed.",
                            "bridge_heartbeat_seen_at": "2026-04-20T00:00:01Z",
                            "bridge_queue_mode": "filesystem-inbox",
                            "editor_transport": "bridge",
                        },
                        "runner_command": ["fake-editor-runner"],
                        "runtime_script": "control_plane_bridge_bootstrap.py",
                    },
                ):
                    with patch(
                        "app.services.adapters.editor_automation_runtime_service.execute_entity_create",
                        return_value={
                            "runtime_result": {
                                "ok": True,
                                "entity_id": "101",
                                "entity_name": "Hero",
                                "modified_entities": ["101"],
                                "level_path": "Levels/Main.level",
                                "loaded_level_path": "Levels/Main.level",
                                "entity_id_source": "direct_return_entity_id",
                                "direct_return_entity_id": "101",
                                "notification_entity_ids": ["101"],
                                "selected_entity_count_before_create": 0,
                                "name_mutation_ran": True,
                                "name_mutation_succeeded": True,
                                "exact_editor_apis": [
                                    "ControlPlaneEditorBridge filesystem inbox",
                                    "editor.entity.create",
                                ],
                                "bridge_available": True,
                                "bridge_name": "ControlPlaneEditorBridge",
                                "bridge_version": "0.1.0",
                                "bridge_operation": "editor.entity.create",
                                "bridge_contract_version": "v1",
                                "bridge_command_id": "bridge-entity-1",
                                "bridge_result_summary": "editor.entity.create completed.",
                                "bridge_heartbeat_seen_at": "2026-04-20T00:00:02Z",
                                "bridge_queue_mode": "filesystem-inbox",
                                "editor_transport": "bridge",
                                "restore_boundary_created": True,
                                "restore_boundary_id": "entity-restore-boundary-1",
                                "restore_boundary_scope": "loaded-level-file",
                                "restore_boundary_level_path": "Levels/Main.level",
                                "restore_boundary_source_path": "C:/project/Levels/Main.level",
                                "restore_boundary_backup_path": "C:/project/runtime/editor_state/restore_boundaries/entity-restore-boundary-1.level",
                                "restore_boundary_available": True,
                                "restore_strategy": "restore-loaded-level-file-from-pre-mutation-backup",
                                "restore_invoked": False,
                                "restore_result": "available_not_invoked",
                            },
                            "runner_command": ["fake-editor-runner"],
                            "runtime_script": "control_plane_bridge_poller.py",
                        },
                    ):
                        def fake_component_add(*, args, **kwargs):  # type: ignore[no-untyped-def]
                            captured_component_args.append(args)
                            assert args["entity_id"] == "101"
                            assert args["components"] == ["Camera"]
                            assert args["level_path"] == "Levels/Main.level"
                            return {
                                "runtime_result": {
                                    "ok": True,
                                    "entity_id": "101",
                                    "entity_name": "Hero",
                                    "added_components": ["Camera"],
                                    "added_component_refs": [
                                        {
                                            "component": "Camera",
                                            "component_id": "EntityComponentIdPair(EntityId(101), 301)",
                                            "entity_id": "101",
                                        }
                                    ],
                                    "rejected_components": [],
                                    "modified_entities": ["101"],
                                    "level_path": "Levels/Main.level",
                                    "loaded_level_path": "Levels/Main.level",
                                    "exact_editor_apis": [
                                        "ControlPlaneEditorBridge filesystem inbox",
                                        "editor.component.add",
                                    ],
                                    "bridge_available": True,
                                    "bridge_name": "ControlPlaneEditorBridge",
                                    "bridge_version": "0.1.0",
                                    "bridge_operation": "editor.component.add",
                                    "bridge_contract_version": "v1",
                                    "bridge_command_id": "bridge-component-1",
                                    "bridge_result_summary": "editor.component.add completed.",
                                    "bridge_heartbeat_seen_at": "2026-04-20T00:00:03Z",
                                    "bridge_queue_mode": "filesystem-inbox",
                                    "editor_transport": "bridge",
                                    "restore_boundary_created": True,
                                    "restore_boundary_id": "component-restore-boundary-1",
                                    "restore_boundary_scope": "loaded-level-file",
                                    "restore_boundary_level_path": "Levels/Main.level",
                                    "restore_boundary_source_path": "C:/project/Levels/Main.level",
                                    "restore_boundary_backup_path": "C:/project/runtime/editor_state/restore_boundaries/component-restore-boundary-1.level",
                                    "restore_boundary_available": True,
                                    "restore_strategy": "restore-loaded-level-file-from-pre-mutation-backup",
                                    "restore_invoked": False,
                                    "restore_result": "available_not_invoked",
                                },
                                "runner_command": ["fake-editor-runner"],
                                "runtime_script": "control_plane_bridge_poller.py",
                            }

                        with patch(
                            "app.services.adapters.editor_automation_runtime_service.execute_component_add",
                            side_effect=fake_component_add,
                        ):
                            with isolated_client() as client:
                                create_response = client.post(
                                    "/prompt/sessions",
                                    json={
                                        "prompt_id": "prompt-editor-chain-execute-1",
                                        "prompt_text": (
                                            'Open level "Levels/Main.level", create entity named "Hero", '
                                            'add a Camera component, then read back the component/property evidence.'
                                        ),
                                        "project_root": str(project_root),
                                        "engine_root": "C:/engine",
                                        "dry_run": False,
                                        "preferred_domains": ["editor-control"],
                                    },
                                )
                                assert create_response.status_code == 200
                                create_payload = create_response.json()
                                assert [step["tool"] for step in create_payload["plan"]["steps"]] == [
                                    "editor.session.open",
                                    "editor.level.open",
                                    "editor.entity.create",
                                    "editor.component.add",
                                ]
                                assert create_payload["refused_capabilities"] == [
                                    (
                                        "editor.component.property.get currently admits chained "
                                        "default property readback only for allowlisted component "
                                        "cases with a proven property-path mapping."
                                    )
                                ]

                                latest_payload = None
                                for _ in range(4):
                                    execute_response = client.post(
                                        "/prompt/sessions/prompt-editor-chain-execute-1/execute"
                                    )
                                    assert execute_response.status_code == 200
                                    latest_payload = execute_response.json()
                                    assert latest_payload["status"] == "waiting_approval"
                                    assert latest_payload["pending_approval_id"]
                                    approval_response = client.post(
                                        f"/approvals/{latest_payload['pending_approval_id']}/approve",
                                        json={},
                                    )
                                    assert approval_response.status_code == 200

                                completed_response = client.post(
                                    "/prompt/sessions/prompt-editor-chain-execute-1/execute"
                                )
                                assert completed_response.status_code == 200
                                completed_payload = completed_response.json()
                                assert completed_payload["status"] == "completed"
                                assert captured_component_args == [
                                    {
                                        "entity_id": "101",
                                        "components": ["Camera"],
                                        "level_path": "Levels/Main.level",
                                    }
                                ]
                                assert len(completed_payload["child_run_ids"]) == 8
                                assert len(completed_payload["child_execution_ids"]) == 8
                                assert len(completed_payload["child_artifact_ids"]) == 4
                                assert (
                                    "Readback confirmed entity 'Hero' (101) in Levels/Main.level."
                                    in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Readback confirmed added component(s) Camera on entity 101."
                                    in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Restore boundary entity-restore-boundary-1 was captured before admitted editor mutation and remains available for the current subset."
                                    in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Restore boundary component-restore-boundary-1 was captured before admitted editor mutation and remains available for the current subset."
                                    in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Review result: incomplete_readback_unavailable"
                                    in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Requested action:" in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Executed action:" in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Verified facts:" in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Assumptions:" in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Missing proof:" in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Safest next step:" in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "editor.component.property.get currently admits chained default property readback only for allowlisted component cases with a proven property-path mapping."
                                    in completed_payload["final_result_summary"]
                                )

                                latest_success_by_step = {
                                    response["prompt_step_id"]: response
                                    for response in completed_payload["latest_child_responses"]
                                    if response["ok"] is True
                                }
                                assert latest_success_by_step["editor-entity-1"][
                                    "execution_details"
                                ]["entity_id"] == "101"
                                assert latest_success_by_step["editor-component-1"][
                                    "execution_details"
                                ]["added_components"] == ["Camera"]


def test_prompt_session_blocks_editor_component_add_when_component_is_not_allowlisted() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        captured_component_args: list[dict[str, object]] = []
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_session_open",
                return_value={
                    "runtime_result": {
                        "editor_session_id": "editor-session-runtime",
                        "loaded_level_path": "Levels/Main.level",
                        "exact_editor_apis": [
                            "azlmbr.legacy.general.open_level_no_prompt"
                        ],
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.session.open",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-session-1",
                        "bridge_result_summary": "editor.session.open completed.",
                        "bridge_heartbeat_seen_at": "2026-04-20T00:00:00Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "control_plane_bridge_bootstrap.py",
                },
            ):
                with patch(
                    "app.services.adapters.editor_automation_runtime_service.execute_level_open",
                    return_value={
                        "runtime_result": {
                            "loaded_level_path": "Levels/Main.level",
                            "level_path": "Levels/Main.level",
                            "created_level": False,
                            "exact_editor_apis": [
                                "azlmbr.legacy.general.open_level_no_prompt"
                            ],
                            "bridge_available": True,
                            "bridge_name": "ControlPlaneEditorBridge",
                            "bridge_version": "0.1.0",
                            "bridge_operation": "editor.level.open",
                            "bridge_contract_version": "v1",
                            "bridge_command_id": "bridge-level-1",
                            "bridge_result_summary": "editor.level.open completed.",
                            "bridge_heartbeat_seen_at": "2026-04-20T00:00:01Z",
                            "bridge_queue_mode": "filesystem-inbox",
                            "editor_transport": "bridge",
                        },
                        "runner_command": ["fake-editor-runner"],
                        "runtime_script": "control_plane_bridge_bootstrap.py",
                    },
                ):
                    with patch(
                        "app.services.adapters.editor_automation_runtime_service.execute_entity_create",
                        return_value={
                            "runtime_result": {
                                "ok": True,
                                "entity_id": "101",
                                "entity_name": "Hero",
                                "modified_entities": ["101"],
                                "level_path": "Levels/Main.level",
                                "loaded_level_path": "Levels/Main.level",
                                "entity_id_source": "direct_return_entity_id",
                                "direct_return_entity_id": "101",
                                "notification_entity_ids": ["101"],
                                "selected_entity_count_before_create": 0,
                                "name_mutation_ran": True,
                                "name_mutation_succeeded": True,
                                "exact_editor_apis": [
                                    "ControlPlaneEditorBridge filesystem inbox",
                                    "editor.entity.create",
                                ],
                                "bridge_available": True,
                                "bridge_name": "ControlPlaneEditorBridge",
                                "bridge_version": "0.1.0",
                                "bridge_operation": "editor.entity.create",
                                "bridge_contract_version": "v1",
                                "bridge_command_id": "bridge-entity-1",
                                "bridge_result_summary": "editor.entity.create completed.",
                                "bridge_heartbeat_seen_at": "2026-04-20T00:00:02Z",
                                "bridge_queue_mode": "filesystem-inbox",
                                "editor_transport": "bridge",
                                "restore_boundary_created": True,
                                "restore_boundary_id": "entity-restore-boundary-3",
                                "restore_boundary_scope": "loaded-level-file",
                                "restore_boundary_level_path": "Levels/Main.level",
                                "restore_boundary_source_path": "C:/project/Levels/Main.level",
                                "restore_boundary_backup_path": "C:/project/runtime/editor_state/restore_boundaries/entity-restore-boundary-3.level",
                                "restore_boundary_available": True,
                                "restore_strategy": "restore-loaded-level-file-from-pre-mutation-backup",
                                "restore_invoked": False,
                                "restore_result": "available_not_invoked",
                            },
                            "runner_command": ["fake-editor-runner"],
                            "runtime_script": "control_plane_bridge_poller.py",
                        },
                    ):
                        def failing_component_add(*, args, **kwargs):  # type: ignore[no-untyped-def]
                            captured_component_args.append(args)
                            raise AdapterExecutionRejected(
                                "editor.component.add currently admits only the explicit allowlisted component set on the real path.",
                                details={
                                    "preflight_reason": "unsupported-component-surface",
                                    "unsupported_components": ["Transform"],
                                    "allowlisted_components": ["Camera", "Comment", "Mesh"],
                                },
                            )

                        with patch(
                            "app.services.adapters.editor_automation_runtime_service.execute_component_add",
                            side_effect=failing_component_add,
                        ):
                            with patch(
                                "app.services.adapters.editor_automation_runtime_service.execute_component_property_get",
                                side_effect=AssertionError(
                                    "editor.component.property.get should not run after a blocked component attachment."
                                ),
                            ):
                                with isolated_client() as client:
                                    create_response = client.post(
                                        "/prompt/sessions",
                                        json={
                                            "prompt_id": "prompt-editor-chain-blocked-1",
                                            "prompt_text": (
                                                'Open level "Levels/Main.level", create entity named "Hero", '
                                                'add a Transform component, then read back the relevant component/property evidence.'
                                            ),
                                            "project_root": str(project_root),
                                            "engine_root": "C:/engine",
                                            "dry_run": False,
                                            "preferred_domains": ["editor-control"],
                                        },
                                    )
                                    assert create_response.status_code == 200
                                    create_payload = create_response.json()
                                    assert [step["tool"] for step in create_payload["plan"]["steps"]] == [
                                        "editor.session.open",
                                        "editor.level.open",
                                        "editor.entity.create",
                                        "editor.component.add",
                                    ]

                                    latest_payload = None
                                    for _ in range(4):
                                        execute_response = client.post(
                                            "/prompt/sessions/prompt-editor-chain-blocked-1/execute"
                                        )
                                        assert execute_response.status_code == 200
                                        latest_payload = execute_response.json()
                                        assert latest_payload["status"] == "waiting_approval"
                                        assert latest_payload["pending_approval_id"]
                                        approval_response = client.post(
                                            f"/approvals/{latest_payload['pending_approval_id']}/approve",
                                            json={},
                                        )
                                        assert approval_response.status_code == 200

                                    failed_response = client.post(
                                        "/prompt/sessions/prompt-editor-chain-blocked-1/execute"
                                    )
                                    assert failed_response.status_code == 200
                                    failed_payload = failed_response.json()
                                    assert failed_payload["status"] == "failed"
                                    assert captured_component_args == [
                                        {
                                            "entity_id": "101",
                                            "components": ["Transform"],
                                            "level_path": "Levels/Main.level",
                                        }
                                    ]
                                    assert failed_payload["last_error_code"] == "ADAPTER_PRECHECK_FAILED"
                                    assert (
                                        "Review result: blocked_component_not_allowlisted"
                                        in failed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Requested component(s) Transform are outside the admitted editor component allowlist."
                                        in failed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Stopped before component attachment could be verified."
                                        in failed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Readback confirmed entity 'Hero' (101) in Levels/Main.level."
                                        in failed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Retry with one of the already admitted allowlisted components"
                                        in failed_payload["final_result_summary"]
                                    )
                                    assert failed_payload["latest_child_responses"][-1]["prompt_step_id"] == (
                                        "editor-component-1"
                                    )
                                    assert failed_payload["latest_child_responses"][-1]["ok"] is False


def test_prompt_session_plans_editor_component_property_read_from_added_component_output() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-editor-property-plan-1",
                        "prompt_text": (
                            'Open level "Levels/Main.level", create entity named "Hero", '
                            'add a Mesh component, then read back the relevant component/property evidence.'
                        ),
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": False,
                        "preferred_domains": ["editor-control"],
                    },
                )
                assert create_response.status_code == 200
                create_payload = create_response.json()
                assert create_payload["status"] == "planned"
                assert [step["tool"] for step in create_payload["plan"]["steps"]] == [
                    "editor.session.open",
                    "editor.level.open",
                    "editor.entity.create",
                    "editor.component.add",
                    "editor.component.property.get",
                ]
                assert create_payload["plan"]["steps"][4]["args"] == {
                    "component_id": "$step:editor-component-1.added_component_refs[0].component_id",
                    "property_path": "Controller|Configuration|Model Asset",
                    "level_path": "Levels/Main.level",
                }
                assert create_payload["plan"]["steps"][4]["depends_on"] == [
                    "editor-component-1",
                ]
                assert (
                    create_payload["plan"]["steps"][4]["planner_note"]
                    == "Read back the admitted default verification property from the newly added component using the component id returned by the preceding component attachment step."
                )
                assert create_payload["refused_capabilities"] == []


def test_prompt_session_plans_live_component_find_without_property_list() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-editor-component-find-1",
                        "prompt_text": (
                            'Open level "Levels/Main.level" and find Mesh component '
                            "on entity id 101."
                        ),
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": False,
                        "preferred_domains": ["editor-control"],
                    },
                )
                assert create_response.status_code == 200
                create_payload = create_response.json()
                assert create_payload["status"] == "planned"
                assert [step["tool"] for step in create_payload["plan"]["steps"]] == [
                    "editor.session.open",
                    "editor.level.open",
                    "editor.component.find",
                ]
                assert create_payload["plan"]["steps"][2]["args"] == {
                    "component_name": "Mesh",
                    "entity_id": "101",
                    "level_path": "Levels/Main.level",
                }
                assert create_payload["plan"]["steps"][1]["args"]["make_writable"] is False
                assert create_payload["plan"]["steps"][1]["args"]["focus_viewport"] is False
                assert (
                    create_payload["plan"]["steps"][2]["planner_note"]
                    == "Use the admitted read-only live component target-binding path for one exact entity and one allowlisted component; do not rely on prefab-derived component ids."
                )
                assert create_payload["refused_capabilities"] == []
                assert "editor.component.property.list" not in (
                    step["tool"] for step in create_payload["plan"]["steps"]
                )


def test_prompt_session_plans_component_find_property_readback_without_property_list() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with isolated_client() as client:
                create_response = client.post(
                    "/prompt/sessions",
                    json={
                        "prompt_id": "prompt-editor-component-find-property-1",
                        "prompt_text": (
                            'Open level "Levels/Main.level", find Mesh component '
                            "on entity id 101, then read back the relevant "
                            "component/property evidence."
                        ),
                        "project_root": str(project_root),
                        "engine_root": "C:/engine",
                        "dry_run": False,
                        "preferred_domains": ["editor-control"],
                    },
                )
                assert create_response.status_code == 200
                create_payload = create_response.json()
                assert create_payload["status"] == "planned"
                assert [step["tool"] for step in create_payload["plan"]["steps"]] == [
                    "editor.session.open",
                    "editor.level.open",
                    "editor.component.find",
                    "editor.component.property.get",
                ]
                assert create_payload["plan"]["steps"][2]["args"] == {
                    "component_name": "Mesh",
                    "entity_id": "101",
                    "level_path": "Levels/Main.level",
                }
                assert create_payload["plan"]["steps"][3]["args"] == {
                    "component_id": "$step:editor-component-find-1.component_id",
                    "property_path": "Controller|Configuration|Model Asset",
                    "level_path": "Levels/Main.level",
                }
                assert create_payload["plan"]["steps"][3]["depends_on"] == [
                    "editor-component-find-1"
                ]
                assert (
                    create_payload["plan"]["steps"][3]["planner_note"]
                    == "Read back the admitted default verification property using the live component id returned by the preceding target-binding step; do not list properties or rely on prefab-derived ids."
                )
                assert create_payload["refused_capabilities"] == []
                assert "editor.component.property.list" not in (
                    step["tool"] for step in create_payload["plan"]["steps"]
                )


def test_prompt_session_executes_component_property_read_from_found_component_output() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        captured_find_args: list[dict[str, object]] = []
        captured_property_args: list[dict[str, object]] = []
        component_id = "EntityComponentIdPair(EntityId(101), 201)"
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_session_open",
                return_value={
                    "runtime_result": {
                        "editor_session_id": "editor-session-runtime",
                        "loaded_level_path": "Levels/Main.level",
                        "exact_editor_apis": [
                            "azlmbr.legacy.general.open_level_no_prompt"
                        ],
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.session.open",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-session-1",
                        "bridge_result_summary": "editor.session.open completed.",
                        "bridge_heartbeat_seen_at": "2026-04-20T00:00:00Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "control_plane_bridge_bootstrap.py",
                },
            ):
                with patch(
                    "app.services.adapters.editor_automation_runtime_service.execute_level_open",
                    return_value={
                        "runtime_result": {
                            "loaded_level_path": "Levels/Main.level",
                            "level_path": "Levels/Main.level",
                            "created_level": False,
                            "exact_editor_apis": [
                                "azlmbr.legacy.general.open_level_no_prompt"
                            ],
                            "bridge_available": True,
                            "bridge_name": "ControlPlaneEditorBridge",
                            "bridge_version": "0.1.0",
                            "bridge_operation": "editor.level.open",
                            "bridge_contract_version": "v1",
                            "bridge_command_id": "bridge-level-1",
                            "bridge_result_summary": "editor.level.open completed.",
                            "bridge_heartbeat_seen_at": "2026-04-20T00:00:01Z",
                            "bridge_queue_mode": "filesystem-inbox",
                            "editor_transport": "bridge",
                        },
                        "runner_command": ["fake-editor-runner"],
                        "runtime_script": "control_plane_bridge_bootstrap.py",
                    },
                ):

                    def fake_component_find(*, args, **kwargs):  # type: ignore[no-untyped-def]
                        captured_find_args.append(args)
                        assert args["component_name"] == "Mesh"
                        assert args["entity_id"] == "101"
                        assert args["level_path"] == "Levels/Main.level"
                        return {
                            "runtime_result": {
                                "ok": True,
                                "found": True,
                                "entity_id": "101",
                                "entity_name": "Hero",
                                "component_name": "Mesh",
                                "component_id": component_id,
                                "component_id_provenance": (
                                    "admitted_runtime_component_discovery_result"
                                ),
                                "level_path": "Levels/Main.level",
                                "loaded_level_path": "Levels/Main.level",
                                "exact_editor_apis": [
                                    "ControlPlaneEditorBridge filesystem inbox",
                                    "editor.component.find",
                                    "EditorComponentAPIBus.GetComponentOfType",
                                ],
                                "bridge_available": True,
                                "bridge_name": "ControlPlaneEditorBridge",
                                "bridge_version": "0.1.0",
                                "bridge_operation": "editor.component.find",
                                "bridge_contract_version": "v1",
                                "bridge_command_id": "bridge-component-find-1",
                                "bridge_result_summary": (
                                    "editor.component.find completed."
                                ),
                                "bridge_heartbeat_seen_at": "2026-04-20T00:00:02Z",
                                "bridge_queue_mode": "filesystem-inbox",
                                "editor_transport": "bridge",
                            },
                            "runner_command": ["fake-editor-runner"],
                            "runtime_script": "control_plane_bridge_poller.py",
                        }

                    def fake_component_property_get(*, args, **kwargs):  # type: ignore[no-untyped-def]
                        captured_property_args.append(args)
                        assert args["component_id"] == component_id
                        assert (
                            args["property_path"]
                            == "Controller|Configuration|Model Asset"
                        )
                        assert args["level_path"] == "Levels/Main.level"
                        return {
                            "runtime_result": {
                                "ok": True,
                                "component_id": component_id,
                                "property_path": "Controller|Configuration|Model Asset",
                                "value": "objects/example.azmodel",
                                "value_type": "AZ::Data::Asset<AZ::Data::AssetData>",
                                "entity_id": "101",
                                "level_path": "Levels/Main.level",
                                "loaded_level_path": "Levels/Main.level",
                                "exact_editor_apis": [
                                    "ControlPlaneEditorBridge filesystem inbox",
                                    "editor.component.property.get",
                                ],
                                "bridge_available": True,
                                "bridge_name": "ControlPlaneEditorBridge",
                                "bridge_version": "0.1.0",
                                "bridge_operation": "editor.component.property.get",
                                "bridge_contract_version": "v1",
                                "bridge_command_id": "bridge-component-property-1",
                                "bridge_result_summary": (
                                    "editor.component.property.get completed."
                                ),
                                "bridge_heartbeat_seen_at": "2026-04-20T00:00:03Z",
                                "bridge_queue_mode": "filesystem-inbox",
                                "editor_transport": "bridge",
                            },
                            "runner_command": ["fake-editor-runner"],
                            "runtime_script": "control_plane_bridge_poller.py",
                        }

                    with patch(
                        "app.services.adapters.editor_automation_runtime_service.execute_component_find",
                        side_effect=fake_component_find,
                    ):
                        with patch(
                            "app.services.adapters.editor_automation_runtime_service.execute_component_property_get",
                            side_effect=fake_component_property_get,
                        ):
                            with isolated_client() as client:
                                create_response = client.post(
                                    "/prompt/sessions",
                                    json={
                                        "prompt_id": (
                                            "prompt-editor-component-find-property-execute-1"
                                        ),
                                        "prompt_text": (
                                            'Open level "Levels/Main.level", find Mesh '
                                            "component on entity id 101, then read back "
                                            "the relevant component/property evidence."
                                        ),
                                        "project_root": str(project_root),
                                        "engine_root": "C:/engine",
                                        "dry_run": False,
                                        "preferred_domains": ["editor-control"],
                                    },
                                )
                                assert create_response.status_code == 200
                                create_payload = create_response.json()
                                assert [
                                    step["tool"]
                                    for step in create_payload["plan"]["steps"]
                                ] == [
                                    "editor.session.open",
                                    "editor.level.open",
                                    "editor.component.find",
                                    "editor.component.property.get",
                                ]

                                completed_payload = None
                                for _ in range(8):
                                    execute_response = client.post(
                                        "/prompt/sessions/"
                                        "prompt-editor-component-find-property-execute-1"
                                        "/execute"
                                    )
                                    assert execute_response.status_code == 200
                                    execute_payload = execute_response.json()
                                    if execute_payload["status"] == "waiting_approval":
                                        approval_response = client.post(
                                            f"/approvals/{execute_payload['pending_approval_id']}/approve",
                                            json={},
                                        )
                                        assert approval_response.status_code == 200
                                        continue
                                    completed_payload = execute_payload
                                    break

                                assert completed_payload is not None
                                assert completed_payload["status"] == "completed"
                                assert captured_find_args == [
                                    {
                                        "component_name": "Mesh",
                                        "entity_id": "101",
                                        "level_path": "Levels/Main.level",
                                    }
                                ]
                                assert captured_property_args == [
                                    {
                                        "component_id": component_id,
                                        "property_path": (
                                            "Controller|Configuration|Model Asset"
                                        ),
                                        "level_path": "Levels/Main.level",
                                    }
                                ]
                                assert (
                                    "Bound live Mesh component "
                                    f"{component_id} on entity Hero."
                                    in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Bound discovered component id "
                                    f"{component_id} into the admitted property "
                                    "readback step automatically."
                                    in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Readback bound live Mesh component "
                                    f"{component_id} on entity Hero with provenance "
                                    "admitted_runtime_component_discovery_result."
                                    in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "Readback confirmed Controller|Configuration|Model Asset = objects/example.azmodel."
                                    in completed_payload["final_result_summary"]
                                )
                                assert (
                                    "editor.component.property.list"
                                    not in completed_payload["admitted_capabilities"]
                                )


def test_prompt_session_executes_editor_component_property_read_from_added_component_output() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        captured_component_args: list[dict[str, object]] = []
        captured_property_args: list[dict[str, object]] = []
        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_session_open",
                return_value={
                    "runtime_result": {
                        "editor_session_id": "editor-session-runtime",
                        "loaded_level_path": "Levels/Main.level",
                        "exact_editor_apis": [
                            "azlmbr.legacy.general.open_level_no_prompt"
                        ],
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.session.open",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-session-1",
                        "bridge_result_summary": "editor.session.open completed.",
                        "bridge_heartbeat_seen_at": "2026-04-20T00:00:00Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "control_plane_bridge_bootstrap.py",
                },
            ):
                with patch(
                    "app.services.adapters.editor_automation_runtime_service.execute_level_open",
                    return_value={
                        "runtime_result": {
                            "loaded_level_path": "Levels/Main.level",
                            "level_path": "Levels/Main.level",
                            "created_level": False,
                            "exact_editor_apis": [
                                "azlmbr.legacy.general.open_level_no_prompt"
                            ],
                            "bridge_available": True,
                            "bridge_name": "ControlPlaneEditorBridge",
                            "bridge_version": "0.1.0",
                            "bridge_operation": "editor.level.open",
                            "bridge_contract_version": "v1",
                            "bridge_command_id": "bridge-level-1",
                            "bridge_result_summary": "editor.level.open completed.",
                            "bridge_heartbeat_seen_at": "2026-04-20T00:00:01Z",
                            "bridge_queue_mode": "filesystem-inbox",
                            "editor_transport": "bridge",
                        },
                        "runner_command": ["fake-editor-runner"],
                        "runtime_script": "control_plane_bridge_bootstrap.py",
                    },
                ):
                    with patch(
                        "app.services.adapters.editor_automation_runtime_service.execute_entity_create",
                        return_value={
                            "runtime_result": {
                                "ok": True,
                                "entity_id": "101",
                                "entity_name": "Hero",
                                "modified_entities": ["101"],
                                "level_path": "Levels/Main.level",
                                "loaded_level_path": "Levels/Main.level",
                                "entity_id_source": "direct_return_entity_id",
                                "direct_return_entity_id": "101",
                                "notification_entity_ids": ["101"],
                                "selected_entity_count_before_create": 0,
                                "name_mutation_ran": True,
                                "name_mutation_succeeded": True,
                                "exact_editor_apis": [
                                    "ControlPlaneEditorBridge filesystem inbox",
                                    "editor.entity.create",
                                ],
                                "bridge_available": True,
                                "bridge_name": "ControlPlaneEditorBridge",
                                "bridge_version": "0.1.0",
                                "bridge_operation": "editor.entity.create",
                                "bridge_contract_version": "v1",
                                "bridge_command_id": "bridge-entity-1",
                                "bridge_result_summary": "editor.entity.create completed.",
                                "bridge_heartbeat_seen_at": "2026-04-20T00:00:02Z",
                                "bridge_queue_mode": "filesystem-inbox",
                                "editor_transport": "bridge",
                                "restore_boundary_created": True,
                                "restore_boundary_id": "entity-restore-boundary-2",
                                "restore_boundary_scope": "loaded-level-file",
                                "restore_boundary_level_path": "Levels/Main.level",
                                "restore_boundary_source_path": "C:/project/Levels/Main.level",
                                "restore_boundary_backup_path": "C:/project/runtime/editor_state/restore_boundaries/entity-restore-boundary-2.level",
                                "restore_boundary_available": True,
                                "restore_strategy": "restore-loaded-level-file-from-pre-mutation-backup",
                                "restore_invoked": False,
                                "restore_result": "available_not_invoked",
                            },
                            "runner_command": ["fake-editor-runner"],
                            "runtime_script": "control_plane_bridge_poller.py",
                        },
                    ):
                        def fake_component_add(*, args, **kwargs):  # type: ignore[no-untyped-def]
                            captured_component_args.append(args)
                            assert args["entity_id"] == "101"
                            assert args["components"] == ["Mesh"]
                            assert args["level_path"] == "Levels/Main.level"
                            return {
                                "runtime_result": {
                                    "ok": True,
                                    "entity_id": "101",
                                    "entity_name": "Hero",
                                    "added_components": ["Mesh"],
                                    "added_component_refs": [
                                        {
                                            "component": "Mesh",
                                            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                                            "entity_id": "101",
                                        }
                                    ],
                                    "rejected_components": [],
                                    "modified_entities": ["101"],
                                    "level_path": "Levels/Main.level",
                                    "loaded_level_path": "Levels/Main.level",
                                    "exact_editor_apis": [
                                        "ControlPlaneEditorBridge filesystem inbox",
                                        "editor.component.add",
                                    ],
                                    "bridge_available": True,
                                    "bridge_name": "ControlPlaneEditorBridge",
                                    "bridge_version": "0.1.0",
                                    "bridge_operation": "editor.component.add",
                                    "bridge_contract_version": "v1",
                                    "bridge_command_id": "bridge-component-1",
                                    "bridge_result_summary": "editor.component.add completed.",
                                    "bridge_heartbeat_seen_at": "2026-04-20T00:00:03Z",
                                    "bridge_queue_mode": "filesystem-inbox",
                                    "editor_transport": "bridge",
                                    "restore_boundary_created": True,
                                    "restore_boundary_id": "component-restore-boundary-2",
                                    "restore_boundary_scope": "loaded-level-file",
                                    "restore_boundary_level_path": "Levels/Main.level",
                                    "restore_boundary_source_path": "C:/project/Levels/Main.level",
                                    "restore_boundary_backup_path": "C:/project/runtime/editor_state/restore_boundaries/component-restore-boundary-2.level",
                                    "restore_boundary_available": True,
                                    "restore_strategy": "restore-loaded-level-file-from-pre-mutation-backup",
                                    "restore_invoked": False,
                                    "restore_result": "available_not_invoked",
                                },
                                "runner_command": ["fake-editor-runner"],
                                "runtime_script": "control_plane_bridge_poller.py",
                            }

                        def fake_component_property_get(*, args, **kwargs):  # type: ignore[no-untyped-def]
                            captured_property_args.append(args)
                            assert (
                                args["component_id"]
                                == "EntityComponentIdPair(EntityId(101), 201)"
                            )
                            assert args["property_path"] == "Controller|Configuration|Model Asset"
                            assert args["level_path"] == "Levels/Main.level"
                            return {
                                "runtime_result": {
                                    "ok": True,
                                    "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                                    "property_path": "Controller|Configuration|Model Asset",
                                    "value": "objects/example.azmodel",
                                    "value_type": "AZ::Data::Asset<AZ::Data::AssetData>",
                                    "entity_id": "101",
                                    "level_path": "Levels/Main.level",
                                    "loaded_level_path": "Levels/Main.level",
                                    "exact_editor_apis": [
                                        "ControlPlaneEditorBridge filesystem inbox",
                                        "editor.component.property.get",
                                    ],
                                    "bridge_available": True,
                                    "bridge_name": "ControlPlaneEditorBridge",
                                    "bridge_version": "0.1.0",
                                    "bridge_operation": "editor.component.property.get",
                                    "bridge_contract_version": "v1",
                                    "bridge_command_id": "bridge-component-property-1",
                                    "bridge_result_summary": "editor.component.property.get completed.",
                                    "bridge_heartbeat_seen_at": "2026-04-20T00:00:04Z",
                                    "bridge_queue_mode": "filesystem-inbox",
                                    "editor_transport": "bridge",
                                },
                                "runner_command": ["fake-editor-runner"],
                                "runtime_script": "control_plane_bridge_poller.py",
                            }

                        with patch(
                            "app.services.adapters.editor_automation_runtime_service.execute_component_add",
                            side_effect=fake_component_add,
                        ):
                            with patch(
                                "app.services.adapters.editor_automation_runtime_service.execute_component_property_get",
                                side_effect=fake_component_property_get,
                            ):
                                with isolated_client() as client:
                                    create_response = client.post(
                                        "/prompt/sessions",
                                        json={
                                            "prompt_id": "prompt-editor-property-execute-1",
                                            "prompt_text": (
                                                'Open level "Levels/Main.level", create entity named "Hero", '
                                                'add a Mesh component, then read back the relevant component/property evidence.'
                                            ),
                                            "project_root": str(project_root),
                                            "engine_root": "C:/engine",
                                            "dry_run": False,
                                            "preferred_domains": ["editor-control"],
                                        },
                                    )
                                    assert create_response.status_code == 200
                                    create_payload = create_response.json()
                                    assert [step["tool"] for step in create_payload["plan"]["steps"]] == [
                                        "editor.session.open",
                                        "editor.level.open",
                                        "editor.entity.create",
                                        "editor.component.add",
                                        "editor.component.property.get",
                                    ]

                                    latest_payload = None
                                    for _ in range(4):
                                        execute_response = client.post(
                                            "/prompt/sessions/prompt-editor-property-execute-1/execute"
                                        )
                                        assert execute_response.status_code == 200
                                        latest_payload = execute_response.json()
                                        assert latest_payload["status"] == "waiting_approval"
                                        assert latest_payload["pending_approval_id"]
                                        approval_response = client.post(
                                            f"/approvals/{latest_payload['pending_approval_id']}/approve",
                                            json={},
                                        )
                                        assert approval_response.status_code == 200

                                    completed_response = client.post(
                                        "/prompt/sessions/prompt-editor-property-execute-1/execute"
                                    )
                                    assert completed_response.status_code == 200
                                    completed_payload = completed_response.json()
                                    assert completed_payload["status"] == "completed"
                                    assert captured_component_args == [
                                        {
                                            "entity_id": "101",
                                            "components": ["Mesh"],
                                            "level_path": "Levels/Main.level",
                                        }
                                    ]
                                    assert captured_property_args == [
                                        {
                                            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                                            "property_path": "Controller|Configuration|Model Asset",
                                            "level_path": "Levels/Main.level",
                                        }
                                    ]
                                    assert len(completed_payload["child_run_ids"]) == 9
                                    assert len(completed_payload["child_execution_ids"]) == 9
                                    assert len(completed_payload["child_artifact_ids"]) == 5
                                    assert (
                                        "Readback confirmed entity 'Hero' (101) in Levels/Main.level."
                                        in completed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Readback confirmed added component(s) Mesh on entity 101."
                                        in completed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Readback confirmed Controller|Configuration|Model Asset = objects/example.azmodel."
                                        in completed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Review result: succeeded_verified"
                                        in completed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Bound created entity id 101 into component attachment and added Mesh."
                                        in completed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Bound added component id EntityComponentIdPair(EntityId(101), 201) into the admitted property readback step automatically."
                                        in completed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Assumptions:" in completed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Missing proof:\n- None for the requested admitted editor chain; this review does not claim undo, reversibility, or runtime/game-mode activation."
                                        in completed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Safest next step:" in completed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Restore boundary entity-restore-boundary-2 was captured before admitted editor mutation and remains available for the current subset."
                                        in completed_payload["final_result_summary"]
                                    )
                                    assert (
                                        "Restore boundary component-restore-boundary-2 was captured before admitted editor mutation and remains available for the current subset."
                                        in completed_payload["final_result_summary"]
                                    )

                                    latest_success_by_step = {
                                        response["prompt_step_id"]: response
                                        for response in completed_payload["latest_child_responses"]
                                        if response["ok"] is True
                                    }
                                    assert latest_success_by_step["editor-component-1"][
                                        "execution_details"
                                    ]["added_component_refs"] == [
                                        {
                                            "component": "Mesh",
                                            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                                            "entity_id": "101",
                                        }
                                    ]
                                    assert latest_success_by_step["editor-component-property-1"][
                                        "execution_details"
                                    ]["property_path"] == "Controller|Configuration|Model Asset"
                                    assert latest_success_by_step["editor-component-property-1"][
                                        "execution_details"
                                    ]["value"] == "objects/example.azmodel"
