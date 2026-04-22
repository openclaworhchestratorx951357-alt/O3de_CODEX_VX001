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
