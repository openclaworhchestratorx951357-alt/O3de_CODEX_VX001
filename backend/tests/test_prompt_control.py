import json
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.response_envelope import ResponseEnvelope, ResponseError
from app.services.editor_runtime_defaults import EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S
from app.services.db import configure_database, initialize_database, reset_database


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
        editor_component_add = next(
            item for item in capabilities if item["tool_name"] == "editor.component.add"
        )
        assert editor_component_add["capability_maturity"] == "real-authoring"
        assert editor_component_add["safety_envelope"]["natural_language_status"] == (
            "prompt-ready-approval-gated"
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
                    == "prompt-ready-simulated"
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
                assert resumed_payload["final_result_summary"] == (
                    "Executed 2 typed child step(s) through DispatcherService."
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
