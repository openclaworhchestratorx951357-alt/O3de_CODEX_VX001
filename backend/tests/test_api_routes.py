import json
import os
import subprocess
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from app.main import app
from app.models.prompt_control import PromptSessionRecord, PromptSessionStatus
from app.models.control_plane import (
    ApprovalRecord,
    ApprovalStatus,
    ArtifactRecord,
    ExecutorRecord,
    EventRecord,
    EventSeverity,
    ExecutionRecord,
    ExecutionStatus,
    RunRecord,
    RunStatus,
    WorkspaceRecord,
)
from app.repositories.control_plane import control_plane_repository
from app.services.prompt_sessions import prompt_sessions_service
from app.services.approvals import approvals_service
from app.services.db import (
    configure_database,
    connection,
    initialize_database,
    reset_database,
)
from fastapi.testclient import TestClient


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


def test_root_includes_current_control_plane_routes() -> None:
    with isolated_client() as client:
        response = client.get("/")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "phase-7-gem-state-refinement"
        assert payload["phase"] == "phase-7"
        assert "/app/control/preview" in payload["routes"]
        assert "/app/control/report" in payload["routes"]
        assert "/summary" in payload["routes"]
        assert "/runs" in payload["routes"]
        assert "/runs/cards" in payload["routes"]
        assert "/runs/substrate-summary" in payload["routes"]
        assert "/runs/summary" in payload["routes"]
        assert "/approvals/cards" in payload["routes"]
        assert "/locks/cards" in payload["routes"]
        assert "/events/cards" in payload["routes"]
        assert "/events/lifecycle" in payload["routes"]
        assert "/events/summary" in payload["routes"]
        assert "/events/{event_id}" in payload["routes"]
        assert "/executions/cards" in payload["routes"]
        assert "/artifacts/cards" in payload["routes"]
        assert "/autonomy" in payload["routes"]
        assert "/autonomy/objectives" in payload["routes"]
        assert "/autonomy/jobs" in payload["routes"]
        assert "/autonomy/observations" in payload["routes"]
        assert "/autonomy/healing-actions" in payload["routes"]
        assert "/autonomy/memories" in payload["routes"]
        assert "/codex/control" in payload["routes"]
        assert "/codex/control/lanes" in payload["routes"]
        assert "/codex/control/workers/sync" in payload["routes"]
        assert "/codex/control/workers/{worker_id}/heartbeat" in payload["routes"]
        assert "/codex/control/tasks" in payload["routes"]
        assert "/codex/control/tasks/{task_id}/claim" in payload["routes"]
        assert "/codex/control/tasks/{task_id}/release" in payload["routes"]
        assert "/codex/control/tasks/{task_id}/complete" in payload["routes"]
        assert "/codex/control/tasks/{task_id}/supersede" in payload["routes"]
        assert "/codex/control/tasks/{task_id}/wait" in payload["routes"]
        assert "/codex/control/workers/next-task" in payload["routes"]
        assert "/codex/control/workers/{worker_id}/notifications" in payload["routes"]
        assert "/codex/control/workers/{worker_id}/notifications/mark-read" in payload["routes"]
        assert "/executors" in payload["routes"]
        assert "/workspaces" in payload["routes"]
        assert "/prompt/capabilities" in payload["routes"]
        assert "/prompt/shortcuts" in payload["routes"]
        assert "/prompt/sessions" in payload["routes"]
        assert "/o3de/target" in payload["routes"]
        assert "/o3de/bridge" in payload["routes"]


def test_codex_control_lane_preflight_allows_desktop_frontend_origin() -> None:
    with isolated_client() as client:
        response = client.options(
            "/codex/control/lanes",
            headers={
                "Origin": "http://127.0.0.1:4173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:4173"
        assert "POST" in response.headers["access-control-allow-methods"]


def test_o3de_target_route_exposes_repo_configured_local_target() -> None:
    with patch.dict(
        "os.environ",
        {
            "O3DE_TARGET_PROJECT_ROOT": r"C:\Users\topgu\O3DE\Projects\McpSandbox",
            "O3DE_TARGET_ENGINE_ROOT": r"C:\src\o3de",
            "O3DE_TARGET_EDITOR_RUNNER": (
                r"C:\Users\topgu\O3DE\Projects\McpSandbox\build\windows\bin\profile\Editor.exe"
            ),
        },
        clear=False,
    ):
        with isolated_client() as client:
            response = client.get("/o3de/target")
            assert response.status_code == 200
            payload = response.json()
            assert payload["project_root"] == r"C:\Users\topgu\O3DE\Projects\McpSandbox"
            assert payload["engine_root"] == r"C:\src\o3de"
            assert payload["editor_runner"].endswith(r"build\windows\bin\profile\Editor.exe")
            assert payload["runtime_runner"] == payload["editor_runner"]
            assert payload["source_label"] == "repo-configured-local-target"


def test_o3de_bridge_route_exposes_transport_diagnostics() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        bridge_root = project_root / "user" / "ControlPlaneBridge"
        heartbeat_path = bridge_root / "heartbeat" / "status.json"
        heartbeat_path.parent.mkdir(parents=True, exist_ok=True)
        heartbeat_path.write_text(
            json.dumps(
                {
                    "bridge_name": "ControlPlaneEditorBridge",
                    "bridge_module_loaded": True,
                    "heartbeat_at": "2026-04-21T04:47:52.917749Z",
                    "heartbeat_epoch_s": time.time(),
                    "project_root": str(project_root),
                    "queue_counts": {
                        "inbox": 0,
                        "processing": 0,
                        "results": 1,
                        "deadletter": 1,
                    },
                    "running": True,
                }
            ),
            encoding="utf-8",
        )
        result_path = bridge_root / "results" / "cmd-ok-1.json.resp"
        result_path.parent.mkdir(parents=True, exist_ok=True)
        result_path.write_text('{"success": true}', encoding="utf-8")
        deadletter_request_path = bridge_root / "deadletter" / "cmd-dead-1.json"
        deadletter_request_path.parent.mkdir(parents=True, exist_ok=True)
        deadletter_request_path.write_text('{"operation": "editor.entity.create"}', encoding="utf-8")
        deadletter_response_path = bridge_root / "deadletter" / "cmd-dead-1.json.resp"
        deadletter_response_path.write_text(
            json.dumps(
                {
                    "bridge_command_id": "cmd-dead-1",
                    "operation": "editor.entity.create",
                    "error_code": "not-admitted-real",
                    "result_summary": "entity create remained excluded from the admitted real set.",
                    "finished_at": "2026-04-21T04:48:00Z",
                }
            ),
            encoding="utf-8",
        )

        with patch.dict(
            "os.environ",
            {"O3DE_TARGET_PROJECT_ROOT": str(project_root)},
            clear=False,
        ):
            with isolated_client() as client:
                response = client.get("/o3de/bridge")
                assert response.status_code == 200
                payload = response.json()
                assert payload["configured"] is True
                assert payload["project_root"] == str(project_root)
                assert payload["project_root_exists"] is True
                assert payload["bridge_root"] == str(bridge_root)
                assert payload["results_path"] == str(bridge_root / "results")
                assert payload["deadletter_path"] == str(bridge_root / "deadletter")
                assert payload["heartbeat_path"] == str(heartbeat_path)
                assert payload["log_path"] == str(bridge_root / "logs" / "control_plane_bridge.log")
                assert payload["source_label"] == "project-local-control-plane-editor-bridge"
                assert payload["heartbeat_fresh"] is True
                assert isinstance(payload["heartbeat_age_s"], float)
                assert payload["heartbeat_age_s"] >= 0
                assert payload["runner_process_active"] is False
                assert payload["queue_counts"] == {
                    "inbox": 0,
                    "processing": 0,
                    "results": 1,
                    "deadletter": 1,
                }
                assert payload["heartbeat"]["bridge_module_loaded"] is True
                assert payload["heartbeat"]["project_root"] == str(project_root)
                assert payload["recent_deadletters"] == [
                    {
                        "bridge_command_id": "cmd-dead-1",
                        "operation": "editor.entity.create",
                        "error_code": "not-admitted-real",
                        "result_summary": (
                            "entity create remained excluded from the admitted real set."
                        ),
                        "finished_at": "2026-04-21T04:48:00Z",
                        "result_path": str(deadletter_response_path),
                    }
                ]
                assert payload["last_results_cleanup"] is None


def test_o3de_bridge_cleanup_route_removes_only_stale_result_responses() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        bridge_root = project_root / "user" / "ControlPlaneBridge"
        results_dir = bridge_root / "results"
        deadletter_dir = bridge_root / "deadletter"
        results_dir.mkdir(parents=True, exist_ok=True)
        deadletter_dir.mkdir(parents=True, exist_ok=True)

        stale_response_path = results_dir / "stale-command.json.resp"
        stale_response_path.write_text('{"success": true}', encoding="utf-8")
        fresh_response_path = results_dir / "fresh-command.json.resp"
        fresh_response_path.write_text('{"success": true}', encoding="utf-8")
        active_temp_path = results_dir / "active-command.json.tmp"
        active_temp_path.write_text('{"state": "processing"}', encoding="utf-8")
        deadletter_response_path = deadletter_dir / "dead-command.json.resp"
        deadletter_response_path.write_text('{"success": false}', encoding="utf-8")

        now = time.time()
        os.utime(stale_response_path, (now - 900, now - 900))
        os.utime(fresh_response_path, (now - 30, now - 30))
        os.utime(active_temp_path, (now - 900, now - 900))
        os.utime(deadletter_response_path, (now - 900, now - 900))

        with patch.dict(
            "os.environ",
            {"O3DE_TARGET_PROJECT_ROOT": str(project_root)},
            clear=False,
        ):
            with isolated_client() as client:
                response = client.post("/o3de/bridge/results/cleanup")
                assert response.status_code == 200
                payload = response.json()
                assert payload["configured"] is True
                assert payload["project_root"] == str(project_root)
                assert payload["results_path"] == str(results_dir)
                assert payload["deadletter_path"] == str(deadletter_dir)
                assert payload["source_label"] == "operator-invoked-bridge-results-cleanup"
                assert payload["min_age_s"] == 300
                assert payload["queue_counts_before"] == {
                    "inbox": 0,
                    "processing": 0,
                    "results": 3,
                    "deadletter": 1,
                }
                assert payload["queue_counts_after"] == {
                    "inbox": 0,
                    "processing": 0,
                    "results": 2,
                    "deadletter": 1,
                }
                assert payload["deleted_response_count"] == 1
                assert payload["deleted_response_paths"] == [str(stale_response_path)]
                assert payload["retained_response_count"] == 1
                assert payload["deadletter_preserved_count"] == 1
                assert not stale_response_path.exists()
                assert fresh_response_path.exists()
                assert active_temp_path.exists()
                assert deadletter_response_path.exists()

                bridge_response = client.get("/o3de/bridge")
                assert bridge_response.status_code == 200
                bridge_payload = bridge_response.json()
                assert bridge_payload["last_results_cleanup"] is not None
                assert bridge_payload["last_results_cleanup"]["outcome"] == "stale-results-removed"
                assert bridge_payload["last_results_cleanup"]["min_age_s"] == 300
                assert bridge_payload["last_results_cleanup"]["deleted_response_count"] == 1
                assert bridge_payload["last_results_cleanup"]["retained_response_count"] == 1
                assert bridge_payload["last_results_cleanup"]["deadletter_preserved_count"] == 1
                assert bridge_payload["last_results_cleanup"]["attempted_at"].endswith("Z")


def test_o3de_bridge_cleanup_route_records_no_stale_results_removed_outcome() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        bridge_root = project_root / "user" / "ControlPlaneBridge"
        results_dir = bridge_root / "results"
        deadletter_dir = bridge_root / "deadletter"
        results_dir.mkdir(parents=True, exist_ok=True)
        deadletter_dir.mkdir(parents=True, exist_ok=True)

        deadletter_response_path = deadletter_dir / "dead-command.json.resp"
        deadletter_response_path.write_text('{"success": false}', encoding="utf-8")

        with patch.dict(
            "os.environ",
            {"O3DE_TARGET_PROJECT_ROOT": str(project_root)},
            clear=False,
        ):
            with isolated_client() as client:
                response = client.post("/o3de/bridge/results/cleanup")
                assert response.status_code == 200
                payload = response.json()
                assert payload["configured"] is True
                assert payload["queue_counts_before"] == {
                    "inbox": 0,
                    "processing": 0,
                    "results": 0,
                    "deadletter": 1,
                }
                assert payload["queue_counts_after"] == {
                    "inbox": 0,
                    "processing": 0,
                    "results": 0,
                    "deadletter": 1,
                }
                assert payload["deleted_response_count"] == 0
                assert payload["deleted_response_paths"] == []
                assert payload["retained_response_count"] == 0
                assert payload["deadletter_preserved_count"] == 1
                assert deadletter_response_path.exists()

                bridge_response = client.get("/o3de/bridge")
                assert bridge_response.status_code == 200
                bridge_payload = bridge_response.json()
                assert bridge_payload["last_results_cleanup"] is not None
                assert (
                    bridge_payload["last_results_cleanup"]["outcome"]
                    == "no-stale-results-removed"
                )
                assert bridge_payload["last_results_cleanup"]["min_age_s"] == 300
                assert bridge_payload["last_results_cleanup"]["deleted_response_count"] == 0
                assert bridge_payload["last_results_cleanup"]["retained_response_count"] == 0
                assert bridge_payload["last_results_cleanup"]["deadletter_preserved_count"] == 1
                assert bridge_payload["last_results_cleanup"]["attempted_at"].endswith("Z")


def test_executor_and_workspace_routes_expose_persisted_substrate_records() -> None:
    with isolated_client() as client:
        executor = control_plane_repository.create_executor(
            ExecutorRecord(
                id="exec-node-1",
                executor_kind="local-docker",
                executor_label="Local Docker Executor",
                executor_host_label="docker-desktop",
                execution_mode_class="hybrid",
                availability_state="available",
                supported_runner_families=["cli", "asset-pipeline"],
                capability_snapshot={"docker": True, "o3de_admitted": ["project.inspect"]},
                last_failure_summary=None,
            )
        )
        workspace = control_plane_repository.create_workspace(
            WorkspaceRecord(
                id="workspace-1",
                workspace_kind="ephemeral",
                workspace_root="C:/tmp/o3de/workspace-1",
                workspace_state="ready",
                cleanup_policy="delete-on-complete",
                retention_class="ephemeral",
                engine_binding={"engine_root": "C:/o3de"},
                project_binding={"project_root": "C:/project"},
                runner_family="cli",
                owner_executor_id=executor.id,
            )
        )

        executors_response = client.get("/executors")
        assert executors_response.status_code == 200
        executors_payload = executors_response.json()
        assert executors_payload["executors"][0]["id"] == executor.id
        assert executors_payload["executors"][0]["availability_state"] == "available"
        assert executors_payload["executors"][0]["supported_runner_families"] == [
            "cli",
            "asset-pipeline",
        ]

        executor_response = client.get(f"/executors/{executor.id}")
        assert executor_response.status_code == 200
        assert executor_response.json()["executor_label"] == "Local Docker Executor"

        workspaces_response = client.get("/workspaces")
        assert workspaces_response.status_code == 200
        workspaces_payload = workspaces_response.json()
        assert workspaces_payload["workspaces"][0]["id"] == workspace.id
        assert workspaces_payload["workspaces"][0]["workspace_state"] == "ready"
        assert workspaces_payload["workspaces"][0]["owner_executor_id"] == executor.id

        workspace_response = client.get(f"/workspaces/{workspace.id}")
        assert workspace_response.status_code == 200
        assert workspace_response.json()["workspace_root"] == "C:/tmp/o3de/workspace-1"


def test_event_cards_expose_substrate_lineage_and_failure_fields() -> None:
    with isolated_client() as client:
        run = control_plane_repository.create_run(
            RunRecord(
                id="run-lineage-1",
                request_id="req-lineage-1",
                agent="project-build",
                tool="project.inspect",
                status=RunStatus.FAILED,
                dry_run=False,
                execution_mode="hybrid",
            )
        )
        execution = control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-lineage-1",
                run_id=run.id,
                request_id=run.request_id,
                agent=run.agent,
                tool=run.tool,
                execution_mode="hybrid",
                status=ExecutionStatus.FAILED,
                executor_id="exec-node-1",
                workspace_id="workspace-1",
                execution_attempt_state="failed",
                failure_category="policy-blocked",
                details={"adapter_mode": "hybrid", "capability_status": "mutation-gated"},
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-lineage-1",
                run_id=run.id,
                execution_id=execution.id,
                executor_id="exec-node-1",
                workspace_id="workspace-1",
                category="execution",
                event_type="workspace-transition",
                severity=EventSeverity.WARNING,
                message="Workspace preparation stalled on policy review.",
                previous_state="preparing",
                current_state="blocked",
                failure_category="policy-blocked",
                details={"adapter_mode": "hybrid", "capability_status": "mutation-gated"},
            )
        )

        response = client.get("/events/cards")
        assert response.status_code == 200
        payload = response.json()["events"][0]
        assert payload["run_id"] == run.id
        assert payload["execution_id"] == execution.id
        assert payload["executor_id"] == "exec-node-1"
        assert payload["workspace_id"] == "workspace-1"
        assert payload["event_type"] == "workspace-transition"
        assert payload["previous_state"] == "preparing"
        assert payload["current_state"] == "blocked"
        assert payload["failure_category"] == "policy-blocked"
        assert payload["adapter_mode"] == "hybrid"
        assert payload["capability_status"] == "mutation-gated"
        assert payload["verification_state"] is None
        assert payload["verified_count"] is None
        assert payload["assumed_count"] is None


def test_event_cards_expose_app_control_verification_posture() -> None:
    with isolated_client() as client:
        control_plane_repository.create_event(
            EventRecord(
                id="evt-app-control-verification",
                category="app_control",
                event_type="app_control_applied",
                severity=EventSeverity.INFO,
                message="App control applied report recorded for app-control-verification.",
                details={
                    "capability_status": "reviewable_local",
                    "summary": "Applied 2 planned operation(s).",
                    "verified_count": 1,
                    "assumed_count": 1,
                    "receipt_items": [
                        {
                            "id": "open-runtime",
                            "label": "Open Runtime workspace.",
                            "detail": "Workspace focus changed locally.",
                            "verification": "assumed",
                        }
                    ],
                },
            )
        )

        response = client.get("/events/cards")
        assert response.status_code == 200
        payload = response.json()["events"][0]
        assert payload["event_type"] == "app_control_applied"
        assert payload["verification_state"] == "assumed_present"
        assert payload["verified_count"] == 1
        assert payload["assumed_count"] == 1


def test_events_summary_returns_app_control_audit_totals_and_latest_receipt() -> None:
    with isolated_client() as client:
        control_plane_repository.create_event(
            EventRecord(
                id="evt-app-control-old",
                category="app_control",
                event_type="app_control_applied",
                severity=EventSeverity.INFO,
                message="App control applied report recorded for app-control-old.",
                created_at=datetime(2026, 4, 23, 17, 0, tzinfo=timezone.utc),
                details={
                    "summary": "Applied 1 planned operation(s). Verified results are marked explicitly below.",
                    "verified_count": "1",
                    "assumed_count": "0",
                    "script_id": "app-control-old",
                },
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-app-control-new",
                category="app_control",
                event_type="app_control_reverted",
                severity=EventSeverity.INFO,
                message="App control reverted report recorded for app-control-new.",
                created_at=datetime(2026, 4, 23, 18, 0, tzinfo=timezone.utc),
                details={
                    "summary": "Requested restore of the last saved App OS backup. Verified results are marked explicitly below.",
                    "verified_count": "2",
                    "assumed_count": "0",
                    "script_id": "app-control-new",
                },
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-app-control-assumed",
                category="app_control",
                event_type="app_control_applied",
                severity=EventSeverity.INFO,
                message="App control applied report recorded for app-control-assumed.",
                created_at=datetime(2026, 4, 23, 19, 0, tzinfo=timezone.utc),
                details={
                    "summary": "Applied 1 planned operation(s). Some results remain assumed.",
                    "verified_count": "1",
                    "assumed_count": "1",
                    "script_id": "app-control-assumed",
                },
            )
        )

        response = client.get("/events/summary")

    assert response.status_code == 200
    payload = response.json()["app_control"]
    assert payload["total_events"] == 3
    assert payload["applied_events"] == 2
    assert payload["reverted_events"] == 1
    assert payload["verified_only_events"] == 2
    assert payload["assumed_present_events"] == 1
    assert payload["verification_not_recorded_events"] == 0
    assert payload["latest_event_id"] == "evt-app-control-assumed"
    assert payload["latest_event_type"] == "app_control_applied"
    assert payload["latest_verified_count"] == 1
    assert payload["latest_assumed_count"] == 1
    assert payload["latest_script_id"] == "app-control-assumed"


def test_event_detail_returns_typed_app_control_receipt_detail() -> None:
    with isolated_client() as client:
        control_plane_repository.create_event(
            EventRecord(
                id="evt-app-control-detail",
                category="app_control",
                event_type="app_control_applied",
                severity=EventSeverity.INFO,
                message="App control applied report recorded for app-control-detail.",
                details={
                    "script_id": "app-control-detail",
                    "mode": "applied",
                    "summary": "Applied 2 planned operation(s). Verified results are marked explicitly below.",
                    "verified_count": "2",
                    "assumed_count": "0",
                    "receipt_items": [
                        {
                            "id": "set-theme-dark",
                            "label": "Set the app theme mode to dark.",
                            "detail": "Verified by re-reading the local saved app settings after apply.",
                            "delta": "Theme mode: system -> dark",
                            "verification": "verified",
                        }
                    ],
                },
            )
        )

        response = client.get("/events/evt-app-control-detail")

    assert response.status_code == 200
    payload = response.json()
    assert payload["event"]["id"] == "evt-app-control-detail"
    assert payload["app_control"]["script_id"] == "app-control-detail"
    assert payload["app_control"]["mode"] == "applied"
    assert payload["app_control"]["verified_count"] == 2
    assert payload["app_control"]["assumed_count"] == 0
    assert payload["app_control"]["items"][0]["delta"] == "Theme mode: system -> dark"


def test_ready_reports_database_status_details() -> None:
    with isolated_client() as client:
        response = client.get("/ready")
        assert response.status_code == 200
        payload = response.json()
        assert payload["ok"] is True
        assert payload["persistence_ready"] is True
        assert payload["requested_database_strategy"]
        assert payload["database_strategy"].startswith("SQLite via")
        assert payload["database_path"].endswith("control-plane.sqlite3")
        assert len(payload["attempted_database_paths"]) >= 1
        assert payload["adapter_mode"]["ready"] is True
        assert payload["adapter_mode"]["configured_mode"] == "simulated"
        assert payload["adapter_mode"]["active_mode"] == "simulated"
        assert payload["adapter_mode"]["supports_real_execution"] is False
        assert payload["adapter_mode"]["contract_version"] == "v0.1"
        assert payload["adapter_mode"]["execution_boundary"]
        assert payload["adapter_mode"]["supported_modes"] == ["hybrid", "simulated"]
        assert "project-build" in payload["adapter_mode"]["available_families"]
        assert payload["adapter_mode"]["real_tool_paths"] == []
        assert payload["adapter_mode"]["plan_only_tool_paths"] == []
        assert "project.inspect" in payload["adapter_mode"]["simulated_tool_paths"]
        assert payload["schema_validation"]["mode"] == "subset-json-schema"
        assert payload["schema_validation"]["schema_scope"] == "published-tool-arg-result-schemas"
        assert payload["schema_validation"]["supports_request_args"] is True
        assert payload["schema_validation"]["supports_result_conformance"] is True
        assert payload["schema_validation"]["supports_persisted_execution_details"] is True
        assert payload["schema_validation"]["supports_persisted_artifact_metadata"] is True
        assert "$ref" in payload["schema_validation"]["active_keywords"]
        assert payload["schema_validation"]["active_unsupported_keywords"] == []
        assert "$schema" in payload["schema_validation"]["active_metadata_keywords"]
        assert "allOf" in payload["schema_validation"]["supported_keywords"]
        assert "oneOf" in payload["schema_validation"]["unsupported_keywords"]
        assert payload["schema_validation"]["persisted_execution_details_tool_count"] == 26
        assert payload["schema_validation"]["persisted_artifact_metadata_tool_count"] == 26
        assert payload["schema_validation"]["persisted_execution_details_tools"] == [
            "asset.batch.process",
            "asset.move.safe",
            "asset.processor.status",
            "asset.source.inspect",
            "build.compile",
            "build.configure",
            "editor.component.add",
            "editor.component.find",
            "editor.component.property.get",
            "editor.component.property.restore.camera_bool_make_active_on_activation",
            "editor.component.property.write.camera_bool_make_active_on_activation",
            "editor.entity.create",
            "editor.entity.exists",
            "editor.level.open",
            "editor.session.open",
            "gem.enable",
            "project.inspect",
            "render.capture.viewport",
            "render.material.inspect",
            "render.material.patch",
            "render.shader.rebuild",
            "settings.patch",
            "test.run.editor_python",
            "test.run.gtest",
            "test.tiaf.sequence",
            "test.visual.diff",
        ]
        assert payload["schema_validation"]["persisted_artifact_metadata_tools"] == [
            "asset.batch.process",
            "asset.move.safe",
            "asset.processor.status",
            "asset.source.inspect",
            "build.compile",
            "build.configure",
            "editor.component.add",
            "editor.component.find",
            "editor.component.property.get",
            "editor.component.property.restore.camera_bool_make_active_on_activation",
            "editor.component.property.write.camera_bool_make_active_on_activation",
            "editor.entity.create",
            "editor.entity.exists",
            "editor.level.open",
            "editor.session.open",
            "gem.enable",
            "project.inspect",
            "render.capture.viewport",
            "render.material.inspect",
            "render.material.patch",
            "render.shader.rebuild",
            "settings.patch",
            "test.run.editor_python",
            "test.run.gtest",
            "test.tiaf.sequence",
            "test.visual.diff",
        ]
        assert payload["schema_validation"]["persisted_family_coverage"] == [
            {
                "family": "editor-control",
                "total_tools": 9,
                "execution_details_tools": 9,
                "artifact_metadata_tools": 9,
                "covered_tools": [
                    "editor.component.add",
                    "editor.component.find",
                    "editor.component.property.get",
                    "editor.component.property.restore.camera_bool_make_active_on_activation",
                    "editor.component.property.write.camera_bool_make_active_on_activation",
                    "editor.entity.create",
                    "editor.entity.exists",
                    "editor.level.open",
                    "editor.session.open",
                ],
                "uncovered_tools": [],
            },
            {
                "family": "asset-pipeline",
                "total_tools": 4,
                "execution_details_tools": 4,
                "artifact_metadata_tools": 4,
                "covered_tools": [
                    "asset.batch.process",
                    "asset.move.safe",
                    "asset.processor.status",
                    "asset.source.inspect",
                ],
                "uncovered_tools": [],
            },
            {
                "family": "project-build",
                "total_tools": 5,
                "execution_details_tools": 5,
                "artifact_metadata_tools": 5,
                "covered_tools": [
                    "build.compile",
                    "build.configure",
                    "gem.enable",
                    "project.inspect",
                    "settings.patch",
                ],
                "uncovered_tools": [],
            },
            {
                "family": "render-lookdev",
                "total_tools": 4,
                "execution_details_tools": 4,
                "artifact_metadata_tools": 4,
                "covered_tools": [
                    "render.capture.viewport",
                    "render.material.inspect",
                    "render.material.patch",
                    "render.shader.rebuild",
                ],
                "uncovered_tools": [],
            },
            {
                "family": "validation",
                "total_tools": 4,
                "execution_details_tools": 4,
                "artifact_metadata_tools": 4,
                "covered_tools": [
                    "test.run.editor_python",
                    "test.run.gtest",
                    "test.tiaf.sequence",
                    "test.visual.diff",
                ],
                "uncovered_tools": [],
            },
        ]
        assert "sqlite approvals store" in payload["dependencies"]
        assert "adapter mode: simulated" in payload["dependencies"]
        assert payload["persistence_warning"] in (None, "")


def test_ready_reports_adapter_mode_as_not_ready_when_config_is_invalid() -> None:
    with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "real"}, clear=False):
        with isolated_client() as client:
            response = client.get("/ready")
            assert response.status_code == 200
            payload = response.json()
            assert payload["ok"] is False
            assert payload["adapter_mode"]["ready"] is False
            assert payload["adapter_mode"]["configured_mode"] == "real"
            assert payload["adapter_mode"]["active_mode"] == "unavailable"
            assert payload["adapter_mode"]["supported_modes"] == ["hybrid", "simulated"]


def test_ready_reports_hybrid_mode_truthfully() -> None:
    with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
        with isolated_client() as client:
            response = client.get("/ready")
            assert response.status_code == 200
            payload = response.json()
            assert payload["adapter_mode"]["ready"] is True
            assert payload["adapter_mode"]["configured_mode"] == "hybrid"
            assert payload["adapter_mode"]["active_mode"] == "hybrid"
            assert payload["adapter_mode"]["supports_real_execution"] is True
            assert payload["adapter_mode"]["real_tool_paths"] == [
                "editor.session.open",
                "editor.level.open",
                "editor.entity.create",
                "editor.entity.exists",
                "editor.component.add",
                "editor.component.find",
                "editor.component.property.get",
                "asset.processor.status",
                "asset.source.inspect",
                "render.capture.viewport",
                "render.material.inspect",
                "project.inspect",
                "test.visual.diff",
            ]
            assert payload["adapter_mode"]["plan_only_tool_paths"] == [
                "asset.batch.process",
                "asset.move.safe",
                "build.configure",
                "render.shader.rebuild",
                "test.run.gtest",
                "test.run.editor_python",
                "test.tiaf.sequence",
            ]
            assert payload["adapter_mode"]["gated_tool_paths"] == [
                "build.compile",
                "editor.component.property.restore.camera_bool_make_active_on_activation",
                "editor.component.property.write.camera_bool_make_active_on_activation",
                "gem.enable",
                "render.material.patch",
                "settings.patch",
            ]
            assert "gem.enable" not in payload["adapter_mode"]["simulated_tool_paths"]


def test_version_reports_adapter_contract_version() -> None:
    with isolated_client() as client:
        response = client.get("/version")
        assert response.status_code == 200
        payload = response.json()
        assert payload["adapter_contract_version"] == "v0.1"


def test_adapters_endpoint_reports_registry_summary() -> None:
    with isolated_client() as client:
        response = client.get("/adapters")
        assert response.status_code == 200
        payload = response.json()["adapters"]
        assert payload["configured_mode"] == "simulated"
        assert payload["active_mode"] == "simulated"
        assert payload["supported_modes"] == ["hybrid", "simulated"]
        assert payload["contract_version"] == "v0.1"
        assert payload["supports_real_execution"] is False
        assert payload["real_tool_paths"] == []
        assert payload["plan_only_tool_paths"] == []
        assert "project.inspect" in payload["simulated_tool_paths"]
        assert any(family["family"] == "project-build" for family in payload["families"])


def test_adapters_endpoint_reports_hybrid_registry_summary() -> None:
    with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
        with isolated_client() as client:
            response = client.get("/adapters")
            assert response.status_code == 200
            payload = response.json()["adapters"]
            assert payload["configured_mode"] == "hybrid"
            assert payload["active_mode"] == "hybrid"
            assert payload["supports_real_execution"] is True
            assert payload["real_tool_paths"] == [
                "editor.session.open",
                "editor.level.open",
                "editor.entity.create",
                "editor.entity.exists",
                "editor.component.add",
                "editor.component.find",
                "editor.component.property.get",
                "asset.processor.status",
                "asset.source.inspect",
                "render.capture.viewport",
                "render.material.inspect",
                "project.inspect",
                "test.visual.diff",
            ]
            forbidden_editor_property_paths = {
                "editor.component.property.list",
                "editor.component.property.write",
                "editor.component.property.restore",
                "editor.component.property.set",
                "editor.camera.scalar.write.proof",
            }
            assert forbidden_editor_property_paths.isdisjoint(payload["real_tool_paths"])
            assert payload["plan_only_tool_paths"] == [
                "asset.batch.process",
                "asset.move.safe",
                "build.configure",
                "render.shader.rebuild",
                "test.run.gtest",
                "test.run.editor_python",
                "test.tiaf.sequence",
            ]
            assert payload["gated_tool_paths"] == [
                "build.compile",
                "editor.component.property.restore.camera_bool_make_active_on_activation",
                "editor.component.property.write.camera_bool_make_active_on_activation",
                "gem.enable",
                "render.material.patch",
                "settings.patch",
            ]
            assert forbidden_editor_property_paths.isdisjoint(
                payload["gated_tool_paths"]
            )
            project_build = next(
                family for family in payload["families"] if family["family"] == "project-build"
            )
            asset_pipeline = next(
                family for family in payload["families"] if family["family"] == "asset-pipeline"
            )
            editor_control = next(
                family for family in payload["families"] if family["family"] == "editor-control"
            )
            render_lookdev = next(
                family for family in payload["families"] if family["family"] == "render-lookdev"
            )
            validation = next(
                family for family in payload["families"] if family["family"] == "validation"
            )
            assert asset_pipeline["supports_real_execution"] is True
            assert asset_pipeline["real_tool_paths"] == [
                "asset.processor.status",
                "asset.source.inspect",
            ]
            assert asset_pipeline["plan_only_tool_paths"] == [
                "asset.batch.process",
                "asset.move.safe",
            ]
            assert asset_pipeline["simulated_tool_paths"] == []
            assert any(
                "asset.batch.process" in note
                or "asset.processor.status" in note
                or "asset.source.inspect" in note
                for note in asset_pipeline["notes"]
            )
            assert project_build["supports_real_execution"] is True
            assert project_build["real_tool_paths"] == ["project.inspect"]
            assert project_build["plan_only_tool_paths"] == ["build.configure"]
            assert project_build["gated_tool_paths"] == [
                "build.compile",
                "gem.enable",
                "settings.patch",
            ]
            assert project_build["simulated_tool_paths"] == []
            assert editor_control["supports_real_execution"] is True
            assert editor_control["real_tool_paths"] == [
                "editor.session.open",
                "editor.level.open",
                "editor.entity.create",
                "editor.entity.exists",
                "editor.component.add",
                "editor.component.find",
                "editor.component.property.get",
            ]
            assert forbidden_editor_property_paths.isdisjoint(
                editor_control["real_tool_paths"]
            )
            assert editor_control["plan_only_tool_paths"] == []
            assert editor_control["gated_tool_paths"] == [
                "editor.component.property.restore.camera_bool_make_active_on_activation",
                "editor.component.property.write.camera_bool_make_active_on_activation"
            ]
            assert forbidden_editor_property_paths.isdisjoint(
                editor_control["gated_tool_paths"]
            )
            assert editor_control["simulated_tool_paths"] == []
            assert any(
                "editor.component.property.get" in note
                for note in editor_control["notes"]
            )
            assert any(
                "Camera bool property write corridor" in note
                for note in editor_control["notes"]
            )
            assert render_lookdev["supports_real_execution"] is True
            assert render_lookdev["real_tool_paths"] == [
                "render.capture.viewport",
                "render.material.inspect",
            ]
            assert render_lookdev["plan_only_tool_paths"] == [
                "render.shader.rebuild",
            ]
            assert render_lookdev["gated_tool_paths"] == ["render.material.patch"]
            assert render_lookdev["simulated_tool_paths"] == []
            assert any(
                "render.capture.viewport" in note
                or "render.material.inspect" in note
                or "render.material.patch" in note
                or "render.shader.rebuild" in note
                for note in render_lookdev["notes"]
            )
            assert validation["supports_real_execution"] is True
            assert validation["real_tool_paths"] == ["test.visual.diff"]
            assert sorted(validation["plan_only_tool_paths"]) == [
                "test.run.editor_python",
                "test.run.gtest",
                "test.tiaf.sequence",
            ]
            assert validation["simulated_tool_paths"] == []
            assert any(
                "test.visual.diff" in note
                or "test.run.gtest" in note
                or "test.run.editor_python" in note
                or "test.tiaf.sequence" in note
                for note in validation["notes"]
            )


def test_prompt_capabilities_reports_test_visual_diff_as_hybrid_read_only() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item for item in payload["capabilities"] if item["tool_name"] == "test.visual.diff"
        )
        assert entry["agent_family"] == "validation"
        assert entry["capability_maturity"] == "hybrid-read-only"
        assert entry["safety_envelope"]["natural_language_status"] == "prompt-ready-read-only"


def test_prompt_capabilities_reports_test_run_gtest_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item for item in payload["capabilities"] if item["tool_name"] == "test.run.gtest"
        )
        assert entry["agent_family"] == "validation"
        assert entry["capability_maturity"] == "plan-only"
        assert entry["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_capabilities_reports_build_compile_as_execution_gated() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item for item in payload["capabilities"] if item["tool_name"] == "build.compile"
        )
        assert entry["agent_family"] == "project-build"
        assert entry["capability_maturity"] == "execution-gated"
        assert (
            entry["safety_envelope"]["natural_language_status"]
            == "prompt-ready-approval-gated"
        )


def test_prompt_capabilities_reports_render_shader_rebuild_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item
            for item in payload["capabilities"]
            if item["tool_name"] == "render.shader.rebuild"
        )
        assert entry["agent_family"] == "render-lookdev"
        assert entry["capability_maturity"] == "plan-only"
        assert entry["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_capabilities_reports_asset_batch_process_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item for item in payload["capabilities"] if item["tool_name"] == "asset.batch.process"
        )
        assert entry["agent_family"] == "asset-pipeline"
        assert entry["capability_maturity"] == "plan-only"
        assert entry["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_capabilities_reports_asset_move_safe_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item for item in payload["capabilities"] if item["tool_name"] == "asset.move.safe"
        )
        assert entry["agent_family"] == "asset-pipeline"
        assert entry["capability_maturity"] == "plan-only"
        assert entry["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_capabilities_reports_test_run_editor_python_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item
            for item in payload["capabilities"]
            if item["tool_name"] == "test.run.editor_python"
        )
        assert entry["agent_family"] == "validation"
        assert entry["capability_maturity"] == "plan-only"
        assert entry["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_capabilities_reports_test_tiaf_sequence_as_plan_only() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item
            for item in payload["capabilities"]
            if item["tool_name"] == "test.tiaf.sequence"
        )
        assert entry["agent_family"] == "validation"
        assert entry["capability_maturity"] == "plan-only"
        assert entry["safety_envelope"]["natural_language_status"] == "prompt-ready-plan-only"


def test_prompt_capabilities_reports_render_capture_viewport_as_hybrid_read_only() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item
            for item in payload["capabilities"]
            if item["tool_name"] == "render.capture.viewport"
        )
        assert entry["agent_family"] == "render-lookdev"
        assert entry["capability_maturity"] == "hybrid-read-only"
        assert entry["safety_envelope"]["natural_language_status"] == "prompt-ready-read-only"


def test_prompt_capabilities_reports_render_material_inspect_as_hybrid_read_only() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item
            for item in payload["capabilities"]
            if item["tool_name"] == "render.material.inspect"
        )
        assert entry["agent_family"] == "render-lookdev"
        assert entry["capability_maturity"] == "hybrid-read-only"
        assert entry["safety_envelope"]["natural_language_status"] == "prompt-ready-read-only"


def test_prompt_capabilities_reports_render_material_patch_as_mutation_gated() -> None:
    with isolated_client() as client:
        response = client.get("/prompt/capabilities")
        assert response.status_code == 200
        payload = response.json()
        entry = next(
            item
            for item in payload["capabilities"]
            if item["tool_name"] == "render.material.patch"
        )
        assert entry["agent_family"] == "render-lookdev"
        assert entry["capability_maturity"] == "hybrid-mutation"
        assert entry["safety_envelope"]["natural_language_status"] == "prompt-ready-approval-gated"


def test_adapters_endpoint_reports_invalid_mode_truthfully() -> None:
    with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "real"}, clear=False):
        with isolated_client() as client:
            response = client.get("/adapters")
            assert response.status_code == 200
            payload = response.json()["adapters"]
            assert payload["configured_mode"] == "real"
            assert payload["active_mode"] == "unavailable"
            assert payload["warning"]


def test_catalog_returns_rich_tool_metadata() -> None:
    with isolated_client() as client:
        response = client.get("/tools/catalog")
        assert response.status_code == 200
        payload = response.json()
        assert payload["agents"][0]["tools"][0]["approval_class"]
        assert payload["agents"][0]["tools"][0]["adapter_family"]
        assert payload["agents"][0]["tools"][0]["capability_status"]
        assert payload["agents"][0]["tools"][0]["args_schema"]
        assert payload["agents"][0]["tools"][0]["result_schema"]


def test_policies_route_exposes_schema_cross_links() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        payload = response.json()
        assert payload["policies"][0]["adapter_family"]
        assert payload["policies"][0]["capability_status"]
        assert payload["policies"][0]["real_admission_stage"]
        assert payload["policies"][0]["next_real_requirement"]
        assert payload["policies"][0]["args_schema"]
        assert payload["policies"][0]["result_schema"]


def test_policies_route_returns_policies_in_stable_agent_then_tool_order() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        policies = response.json()["policies"]

        ordering = [(policy["agent"], policy["tool"]) for policy in policies]
        assert ordering == sorted(ordering)


def test_policies_route_marks_settings_patch_as_real_mutation_preflight_active() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        settings_patch = next(
            policy
            for policy in response.json()["policies"]
            if policy["tool"] == "settings.patch"
        )
        assert settings_patch["real_admission_stage"] == "real-mutation-preflight-active"
        assert "backup" in settings_patch["next_real_requirement"].lower()
        assert "manifest-backed" in settings_patch["next_real_requirement"].lower()
        assert "set-only mutation path" in settings_patch["next_real_requirement"].lower()


def test_policies_route_marks_gem_enable_as_real_mutation_preflight_active() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        gem_enable = next(
            policy for policy in response.json()["policies"] if policy["tool"] == "gem.enable"
        )
        assert gem_enable["real_admission_stage"] == "real-mutation-preflight-active"
        assert "backup" in gem_enable["next_real_requirement"].lower()
        assert "local gem_names insertion" in gem_enable["next_real_requirement"].lower()
        assert "version resolution" in gem_enable["next_real_requirement"].lower()


def test_policies_route_marks_render_material_patch_as_real_mutation_preflight_active() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        render_material_patch = next(
            policy
            for policy in response.json()["policies"]
            if policy["tool"] == "render.material.patch"
        )
        assert render_material_patch["real_admission_stage"] == "real-mutation-preflight-active"
        assert render_material_patch["execution_mode"] == "gated"
        assert "propertyvalues" in render_material_patch["next_real_requirement"].lower()
        assert "shader rebuild" in render_material_patch["next_real_requirement"].lower()


def test_policies_route_exposes_truthful_execution_mode_and_dry_run_support() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        policies_by_tool = {
            policy["tool"]: policy for policy in response.json()["policies"]
        }

        assert policies_by_tool["editor.session.open"]["execution_mode"] == "real"
        assert policies_by_tool["editor.session.open"]["supports_dry_run"] is False

        assert policies_by_tool["editor.level.open"]["execution_mode"] == "real"
        assert policies_by_tool["editor.level.open"]["supports_dry_run"] is False

        assert policies_by_tool["project.inspect"]["execution_mode"] == "real"
        assert policies_by_tool["project.inspect"]["supports_dry_run"] is True

        assert policies_by_tool["asset.processor.status"]["execution_mode"] == "real"
        assert policies_by_tool["asset.processor.status"]["supports_dry_run"] is True

        assert policies_by_tool["asset.source.inspect"]["execution_mode"] == "real"
        assert policies_by_tool["asset.source.inspect"]["supports_dry_run"] is True

        assert policies_by_tool["asset.batch.process"]["execution_mode"] == "plan-only"
        assert policies_by_tool["asset.batch.process"]["supports_dry_run"] is True
        assert policies_by_tool["asset.move.safe"]["execution_mode"] == "plan-only"
        assert policies_by_tool["asset.move.safe"]["supports_dry_run"] is True

        assert policies_by_tool["build.configure"]["execution_mode"] == "plan-only"
        assert policies_by_tool["build.configure"]["supports_dry_run"] is True
        assert policies_by_tool["build.compile"]["execution_mode"] == "real"
        assert policies_by_tool["build.compile"]["supports_dry_run"] is True

        assert policies_by_tool["editor.entity.create"]["execution_mode"] == "real"
        assert policies_by_tool["editor.entity.create"]["supports_dry_run"] is False

        assert policies_by_tool["editor.entity.exists"]["execution_mode"] == "real"
        assert policies_by_tool["editor.entity.exists"]["supports_dry_run"] is False

        assert policies_by_tool["editor.component.add"]["execution_mode"] == "real"
        assert policies_by_tool["editor.component.add"]["supports_dry_run"] is False

        assert policies_by_tool["editor.component.find"]["execution_mode"] == "real"
        assert policies_by_tool["editor.component.find"]["supports_dry_run"] is False

        assert policies_by_tool["editor.component.property.get"]["execution_mode"] == "real"
        assert policies_by_tool["editor.component.property.get"]["supports_dry_run"] is False
        camera_write_policy = policies_by_tool[
            "editor.component.property.write.camera_bool_make_active_on_activation"
        ]
        assert camera_write_policy["execution_mode"] == "gated"
        assert camera_write_policy["supports_dry_run"] is False
        assert camera_write_policy["approval_class"] == "content_write"
        camera_restore_policy = policies_by_tool[
            "editor.component.property.restore.camera_bool_make_active_on_activation"
        ]
        assert camera_restore_policy["execution_mode"] == "gated"
        assert camera_restore_policy["supports_dry_run"] is False
        assert camera_restore_policy["approval_class"] == "content_write"

        assert policies_by_tool["settings.patch"]["execution_mode"] == "gated"
        assert policies_by_tool["settings.patch"]["supports_dry_run"] is True
        assert policies_by_tool["render.material.patch"]["execution_mode"] == "gated"
        assert policies_by_tool["render.material.patch"]["supports_dry_run"] is True


def test_policies_route_marks_asset_source_inspect_as_real_read_only_active() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        asset_source_inspect = next(
            policy
            for policy in response.json()["policies"]
            if policy["tool"] == "asset.source.inspect"
        )
        assert asset_source_inspect["real_admission_stage"] == "real-read-only-active"
        assert asset_source_inspect["execution_mode"] == "real"
        assert "project-local" in asset_source_inspect["next_real_requirement"].lower()


def test_policies_route_marks_asset_processor_status_as_real_read_only_active() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        asset_processor_status = next(
            policy
            for policy in response.json()["policies"]
            if policy["tool"] == "asset.processor.status"
        )
        assert asset_processor_status["real_admission_stage"] == "real-read-only-active"
        assert asset_processor_status["execution_mode"] == "real"
        assert "job and platform" in asset_processor_status["next_real_requirement"].lower()


def test_policies_route_marks_asset_batch_process_as_real_plan_only_active() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        asset_batch_process = next(
            policy
            for policy in response.json()["policies"]
            if policy["tool"] == "asset.batch.process"
        )
        assert asset_batch_process["real_admission_stage"] == "real-plan-only-active"
        assert asset_batch_process["execution_mode"] == "plan-only"
        assert "preflight" in asset_batch_process["next_real_requirement"].lower()


def test_policies_route_marks_asset_move_safe_as_real_plan_only_active() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        asset_move_safe = next(
            policy
            for policy in response.json()["policies"]
            if policy["tool"] == "asset.move.safe"
        )
        assert asset_move_safe["real_admission_stage"] == "real-plan-only-active"
        assert asset_move_safe["execution_mode"] == "plan-only"
        assert "identity corridor" in asset_move_safe["next_real_requirement"].lower()


def test_policies_route_marks_render_capture_viewport_as_real_read_only_active() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        render_capture = next(
            policy
            for policy in response.json()["policies"]
            if policy["tool"] == "render.capture.viewport"
        )
        assert render_capture["real_admission_stage"] == "real-read-only-active"
        assert render_capture["execution_mode"] == "real"
        assert "artifact-presence reporting" in render_capture["next_real_requirement"].lower()


def test_policies_route_marks_render_material_inspect_as_real_read_only_active() -> None:
    with isolated_client() as client:
        response = client.get("/policies")
        assert response.status_code == 200
        render_material = next(
            policy
            for policy in response.json()["policies"]
            if policy["tool"] == "render.material.inspect"
        )
        assert render_material["real_admission_stage"] == "real-read-only-active"
        assert render_material["execution_mode"] == "real"
        assert "material-evidence reporting" in render_material["next_real_requirement"].lower()


def test_dispatch_route_uses_real_render_material_inspect_readback_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        material_path = project_root / "Materials" / "Example.material"
        material_path.parent.mkdir(parents=True, exist_ok=True)
        material_path.write_text(
            json.dumps(
                {
                    "materialType": "ApiReadbackMaterial",
                    "propertyValues": {"roughness": 0.5},
                }
            ),
            encoding="utf-8",
        )
        runtime_result = {
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
        }
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_render_material_inspect",
                return_value={
                    "runtime_result": runtime_result,
                    "runner_command": ["Editor.exe"],
                    "manifest": {},
                    "runtime_script": "backend/runtime/editor_scripts/render_material_probe.py",
                },
            ):
                with isolated_client() as client:
                    dispatch = client.post(
                        "/tools/dispatch",
                        json={
                            "request_id": "api-render-material-inspect-1",
                            "tool": "render.material.inspect",
                            "agent": "render-lookdev",
                            "project_root": str(project_root),
                            "engine_root": "/tmp/engine",
                            "dry_run": False,
                            "locks": [],
                            "timeout_s": 30,
                            "args": {
                                "material_path": "Materials/Example.material",
                                "include_shader_data": True,
                                "include_references": True,
                            },
                        },
                    )
                    assert dispatch.status_code == 200
                    payload = dispatch.json()
                    assert payload["ok"] is True
                    assert payload["result"]["simulated"] is False
                    assert payload["result"]["execution_mode"] == "real"

                    executions = client.get("/executions")
                    assert executions.status_code == 200
                    execution = next(
                        execution
                        for execution in executions.json()["executions"]
                        if execution["run_id"] == payload["operation_id"]
                    )
                    assert execution["details"]["inspection_surface"] == "render_material_runtime_probe"
                    assert execution["details"]["material_evidence_produced"] is True
                    assert (
                        execution["details"]["material_path_relative_to_project_root"]
                        == "Materials/Example.material"
                    )
                    assert execution["details"]["property_value_count"] == 1
                    assert execution["details"]["material_runtime_readback_available"] is False


def test_runs_endpoint_reflects_dispatch_attempt() -> None:
    with isolated_client() as client:
        dispatch = client.post(
            "/tools/dispatch",
            json={
                "request_id": "api-run-1",
                "tool": "project.inspect",
                "agent": "project-build",
                "project_root": "/tmp/project",
                "engine_root": "/tmp/engine",
                "dry_run": True,
                "locks": [],
                "timeout_s": 30,
                "args": {},
            },
        )
        assert dispatch.status_code == 200
        run_id = dispatch.json()["operation_id"]

        response = client.get(f"/runs/{run_id}")
        assert response.status_code == 200
        assert response.json()["id"] == run_id


def test_runs_summary_endpoint_reports_settings_patch_audit_states() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "ApiSummaryProject",
                    "version": "5.0.0",
                }
            ),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                preflight_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-summary-preflight-1",
                        "tool": "settings.patch",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "registry_path": "/O3DE/Settings",
                            "operations": [
                                {"op": "set", "path": "/version", "value": "5.0.1"},
                                {"op": "set", "path": "/render/quality", "value": "high"},
                            ],
                        },
                    },
                )
                preflight_approval_id = preflight_dispatch.json()["approval_id"]
                preflight_approval = approvals_service.get_approval(preflight_approval_id)
                assert preflight_approval is not None
                client.post(
                    f"/approvals/{preflight_approval_id}/approve",
                    json={"reason": "Approve settings.patch preflight for summary test"},
                )
                approved_preflight = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-summary-preflight-2",
                        "tool": "settings.patch",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": preflight_approval.token,
                        "args": {
                            "registry_path": "/O3DE/Settings",
                            "operations": [
                                {"op": "set", "path": "/version", "value": "5.0.1"},
                                {"op": "set", "path": "/render/quality", "value": "high"},
                            ],
                        },
                    },
                )
                assert approved_preflight.status_code == 200

                mutation_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-summary-mutation-1",
                        "tool": "settings.patch",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "registry_path": "/O3DE/Settings",
                            "operations": [{"op": "set", "path": "/version", "value": "5.0.2"}],
                        },
                    },
                )
                mutation_approval_id = mutation_dispatch.json()["approval_id"]
                mutation_approval = approvals_service.get_approval(mutation_approval_id)
                assert mutation_approval is not None
                client.post(
                    f"/approvals/{mutation_approval_id}/approve",
                    json={"reason": "Approve settings.patch mutation for summary test"},
                )
                approved_mutation = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-summary-mutation-2",
                        "tool": "settings.patch",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": mutation_approval.token,
                        "args": {
                            "registry_path": "/O3DE/Settings",
                            "operations": [{"op": "set", "path": "/version", "value": "5.0.2"}],
                        },
                    },
                )
                assert approved_mutation.status_code == 200

                summary_response = client.get("/runs/summary")
                assert summary_response.status_code == 200
                payload = summary_response.json()
                assert payload["settings_patch_audit_summary"]["total_runs"] == 2
                assert payload["settings_patch_audit_summary"]["preflight"] == 1
                assert payload["settings_patch_audit_summary"]["succeeded"] == 1
                assert payload["settings_patch_audit_summary"]["blocked"] == 0
                assert payload["settings_patch_audit_summary"]["rolled_back"] == 0
                assert payload["settings_patch_audit_summary"]["other"] == 0
                assert payload["settings_patch_audit_summary"]["available_filters"] == [
                    "all",
                    "preflight",
                    "blocked",
                    "succeeded",
                    "rolled_back",
                    "other",
                ]
                run_audits = {
                    audit["run_id"]: audit
                    for audit in payload["run_audits"]
                }
                assert (
                    run_audits[approved_preflight.json()["operation_id"]]["audit_status"]
                    == "preflight"
                )
                assert (
                    run_audits[approved_mutation.json()["operation_id"]]["audit_status"]
                    == "succeeded"
                )

                filtered_summary_response = client.get(
                    "/runs/summary",
                    params={"audit_status": "succeeded"},
                )
                assert filtered_summary_response.status_code == 200
                filtered_payload = filtered_summary_response.json()
                assert filtered_payload["settings_patch_audit_summary"]["total_runs"] == 2
                assert len(filtered_payload["run_audits"]) == 1
                assert (
                    filtered_payload["run_audits"][0]["run_id"]
                    == approved_mutation.json()["operation_id"]
                )
                assert filtered_payload["run_audits"][0]["audit_status"] == "succeeded"

                filtered_runs_response = client.get(
                    "/runs",
                    params={"audit_status": "succeeded"},
                )
                assert filtered_runs_response.status_code == 200
                filtered_runs_payload = filtered_runs_response.json()
                assert len(filtered_runs_payload["runs"]) == 1
                assert (
                    filtered_runs_payload["runs"][0]["id"]
                    == approved_mutation.json()["operation_id"]
                )

                filtered_run_cards_response = client.get(
                    "/runs/cards",
                    params={"tool": "settings.patch", "audit_status": "succeeded"},
                )
                assert filtered_run_cards_response.status_code == 200
                filtered_run_cards_payload = filtered_run_cards_response.json()
                assert len(filtered_run_cards_payload["runs"]) == 1
                run_card = filtered_run_cards_payload["runs"][0]
                assert run_card["id"] == approved_mutation.json()["operation_id"]
                assert run_card["tool"] == "settings.patch"
                assert run_card["execution_mode"] == "hybrid"
                assert run_card["audit_status"] == "succeeded"
                assert run_card["audit_summary"] == (
                    "A real settings.patch mutation was applied and verified."
                )
                assert "created_at" not in run_card
                assert "requested_locks" not in run_card

                tool_filtered_runs_response = client.get(
                    "/runs",
                    params={"tool": "settings.patch"},
                )
                assert tool_filtered_runs_response.status_code == 200
                tool_filtered_runs_payload = tool_filtered_runs_response.json()
                assert len(tool_filtered_runs_payload["runs"]) == 2
                assert all(
                    run["tool"] == "settings.patch"
                    for run in tool_filtered_runs_payload["runs"]
                )

                tool_filtered_summary_response = client.get(
                    "/runs/summary",
                    params={"tool": "settings.patch"},
                )
                assert tool_filtered_summary_response.status_code == 200
                tool_filtered_summary_payload = tool_filtered_summary_response.json()
                assert (
                    tool_filtered_summary_payload["settings_patch_audit_summary"]["total_runs"]
                    == 2
                )
                assert len(tool_filtered_summary_payload["run_audits"]) == 2


def test_dispatch_route_rejects_args_that_fail_published_schema() -> None:
    with isolated_client() as client:
        dispatch = client.post(
            "/tools/dispatch",
            json={
                "request_id": "api-invalid-args-1",
                "tool": "build.compile",
                "agent": "project-build",
                "project_root": "/tmp/project",
                "engine_root": "/tmp/engine",
                "dry_run": True,
                "locks": [],
                "timeout_s": 30,
                "args": {"targets": []},
            },
        )
        assert dispatch.status_code == 200
        payload = dispatch.json()
        assert payload["ok"] is False
        assert payload["error"]["code"] == "INVALID_ARGS"
        assert payload["error"]["details"]["args_schema_ref"].endswith(
            "build.compile.args.schema.json"
        )


def test_approval_endpoints_allow_explicit_decision() -> None:
    with isolated_client() as client:
        dispatch = client.post(
            "/tools/dispatch",
            json={
                "request_id": "api-approval-1",
                "tool": "build.configure",
                "agent": "project-build",
                "project_root": "/tmp/project",
                "engine_root": "/tmp/engine",
                "dry_run": True,
                "locks": [],
                "timeout_s": 30,
                "args": {},
            },
        )
        payload = dispatch.json()
        approval_id = payload["approval_id"]
        approval = approvals_service.get_approval(approval_id)
        assert approval is not None

        response = client.post(
            f"/approvals/{approval_id}/approve",
            json={"reason": "Approved for test coverage"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "approved"
        cards_response = client.get("/approvals/cards")
        assert cards_response.status_code == 200
        cards_payload = cards_response.json()
        assert len(cards_payload["approvals"]) == 1
        approval_card = cards_payload["approvals"][0]
        assert approval_card["id"] == approval_id
        assert approval_card["status"] == "approved"
        assert approval_card["can_decide"] is False
        assert "token" not in approval_card


def test_events_endpoint_returns_persisted_dispatch_history() -> None:
    with isolated_client() as client:
        client.post(
            "/tools/dispatch",
            json={
                "request_id": "api-events-1",
                "tool": "project.inspect",
                "agent": "project-build",
                "project_root": "/tmp/project",
                "engine_root": "/tmp/engine",
                "dry_run": True,
                "locks": [],
                "timeout_s": 30,
                "args": {},
            },
        )
        response = client.get("/events")
        card_response = client.get("/events/cards")
        assert response.status_code == 200
        assert card_response.status_code == 200
        payload = response.json()
        card_payload = card_response.json()
        assert len(payload["events"]) >= 1
        assert any(
            event["details"].get("capability_status") == "hybrid-read-only"
            for event in payload["events"]
        )
        assert len(card_payload["events"]) >= 1
        assert any(
            event.get("capability_status") == "hybrid-read-only"
            for event in card_payload["events"]
        )
        assert "details" not in card_payload["events"][0]


def test_locks_cards_endpoint_returns_compact_lock_records() -> None:
    with isolated_client() as client:
        response = client.post(
            "/tools/dispatch",
            json={
                "request_id": "api-locks-1",
                "tool": "project.inspect",
                "agent": "project-build",
                "project_root": "/tmp/project",
                "engine_root": "/tmp/engine",
                "dry_run": True,
                "locks": ["project_config"],
                "timeout_s": 30,
                "args": {},
            },
        )
        assert response.status_code == 200
        cards_response = client.get("/locks/cards")
        assert cards_response.status_code == 200
        payload = cards_response.json()
        assert payload["locks"] == []


def test_persisted_list_endpoints_return_default_stable_ordering() -> None:
    created_at = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    started_at = datetime(2026, 1, 1, 13, 0, tzinfo=timezone.utc)

    with isolated_client() as client:
        control_plane_repository.create_run(
            RunRecord(
                id="run-a",
                request_id="request-a",
                agent="project-build",
                tool="project.inspect",
                status=RunStatus.SUCCEEDED,
                created_at=created_at,
                updated_at=created_at,
                result_summary="older-or-lower-id run",
            )
        )
        control_plane_repository.create_run(
            RunRecord(
                id="run-b",
                request_id="request-b",
                agent="project-build",
                tool="project.inspect",
                status=RunStatus.SUCCEEDED,
                created_at=created_at,
                updated_at=created_at,
                result_summary="same-timestamp higher-id run",
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-a",
                run_id="run-a",
                request_id="request-a",
                agent="project-build",
                tool="project.inspect",
                execution_mode="simulated",
                status=ExecutionStatus.SUCCEEDED,
                started_at=started_at,
                details={"inspection_surface": "simulated"},
                result_summary="older-or-lower-id execution",
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-b",
                run_id="run-b",
                request_id="request-b",
                agent="project-build",
                tool="project.inspect",
                execution_mode="simulated",
                status=ExecutionStatus.SUCCEEDED,
                started_at=started_at,
                details={"inspection_surface": "simulated"},
                result_summary="same-timestamp higher-id execution",
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-a",
                run_id="run-a",
                execution_id="exe-a",
                label="artifact-a",
                kind="simulated_result",
                uri="memory://artifact-a",
                simulated=True,
                created_at=created_at,
                metadata={"execution_mode": "simulated"},
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-b",
                run_id="run-b",
                execution_id="exe-b",
                label="artifact-b",
                kind="simulated_result",
                uri="memory://artifact-b",
                simulated=True,
                created_at=created_at,
                metadata={"execution_mode": "simulated"},
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-a",
                run_id="run-a",
                category="dispatch",
                severity=EventSeverity.INFO,
                message="event-a",
                created_at=created_at,
                details={},
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-b",
                run_id="run-b",
                category="dispatch",
                severity=EventSeverity.INFO,
                message="event-b",
                created_at=created_at,
                details={},
            )
        )
        control_plane_repository.create_approval(
            ApprovalRecord(
                id="apr-a",
                run_id="run-a",
                request_id="request-a",
                agent="project-build",
                tool="settings.patch",
                approval_class="config_write",
                token="token-a",
                created_at=created_at,
            )
        )
        control_plane_repository.create_approval(
            ApprovalRecord(
                id="apr-b",
                run_id="run-b",
                request_id="request-b",
                agent="project-build",
                tool="settings.patch",
                approval_class="config_write",
                token="token-b",
                created_at=created_at,
            )
        )
        with connection() as conn:
            conn.execute(
                "INSERT INTO locks (name, owner_run_id, created_at) VALUES (?, ?, ?)",
                ("project_config", "run-b", created_at.isoformat()),
            )
            conn.execute(
                "INSERT INTO locks (name, owner_run_id, created_at) VALUES (?, ?, ?)",
                ("build_tree", "run-a", created_at.isoformat()),
            )

        runs_response = client.get("/runs")
        executions_response = client.get("/executions")
        artifacts_response = client.get("/artifacts")
        events_response = client.get("/events")
        approvals_response = client.get("/approvals")
        locks_response = client.get("/locks")

        assert runs_response.status_code == 200
        assert [run["id"] for run in runs_response.json()["runs"][:2]] == ["run-b", "run-a"]

        assert executions_response.status_code == 200
        assert [execution["id"] for execution in executions_response.json()["executions"][:2]] == [
            "exe-b",
            "exe-a",
        ]

        assert artifacts_response.status_code == 200
        assert [artifact["id"] for artifact in artifacts_response.json()["artifacts"][:2]] == [
            "art-b",
            "art-a",
        ]

        assert events_response.status_code == 200
        assert [event["id"] for event in events_response.json()["events"][:2]] == [
            "evt-b",
            "evt-a",
        ]

        assert approvals_response.status_code == 200
        assert [approval["id"] for approval in approvals_response.json()["approvals"][:2]] == [
            "apr-b",
            "apr-a",
        ]

        assert locks_response.status_code == 200
        assert [lock["name"] for lock in locks_response.json()["locks"][:2]] == [
            "build_tree",
            "project_config",
        ]


def test_summary_endpoint_reports_persisted_operator_counts() -> None:
    created_at = datetime(2026, 2, 1, 9, 0, tzinfo=timezone.utc)
    started_at = datetime(2026, 2, 1, 10, 0, tzinfo=timezone.utc)

    with isolated_client() as client:
        control_plane_repository.create_run(
            RunRecord(
                id="run-summary-a",
                request_id="request-summary-a",
                agent="project-build",
                tool="project.inspect",
                status=RunStatus.SUCCEEDED,
                created_at=created_at,
                updated_at=created_at,
            )
        )
        control_plane_repository.create_run(
            RunRecord(
                id="run-summary-b",
                request_id="request-summary-b",
                agent="project-build",
                tool="settings.patch",
                status=RunStatus.REJECTED,
                created_at=created_at,
                updated_at=created_at,
            )
        )
        control_plane_repository.create_approval(
            ApprovalRecord(
                id="apr-summary-a",
                run_id="run-summary-a",
                request_id="request-summary-a",
                agent="project-build",
                tool="settings.patch",
                approval_class="config_write",
                token="token-summary-a",
                created_at=created_at,
            )
        )
        control_plane_repository.create_approval(
            ApprovalRecord(
                id="apr-summary-b",
                run_id="run-summary-b",
                request_id="request-summary-b",
                agent="project-build",
                tool="build.configure",
                approval_class="build_execute",
                token="token-summary-b",
                status=ApprovalStatus.APPROVED,
                created_at=created_at,
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-summary-a",
                run_id="run-summary-a",
                request_id="request-summary-a",
                agent="project-build",
                tool="project.inspect",
                execution_mode="simulated",
                status=ExecutionStatus.SUCCEEDED,
                started_at=started_at,
                details={
                    "inspection_surface": "simulated",
                    "fallback_category": "manifest-missing",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-summary-b",
                run_id="run-summary-b",
                request_id="request-summary-b",
                agent="project-build",
                tool="settings.patch",
                execution_mode="real",
                status=ExecutionStatus.FAILED,
                started_at=started_at,
                details={
                    "inspection_surface": "settings_patch_preflight",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-summary-a",
                run_id="run-summary-a",
                execution_id="exe-summary-a",
                label="artifact-summary-a",
                kind="simulated_result",
                uri="memory://artifact-summary-a",
                simulated=True,
                created_at=created_at,
                metadata={
                    "execution_mode": "simulated",
                    "inspection_surface": "simulated",
                    "fallback_category": "manifest-missing",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-summary-b",
                run_id="run-summary-b",
                execution_id="exe-summary-b",
                label="artifact-summary-b",
                kind="manifest_backup",
                uri="memory://artifact-summary-b",
                simulated=False,
                created_at=created_at,
                metadata={
                    "execution_mode": "real",
                    "inspection_surface": "settings_patch_preflight",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-summary-a",
                run_id="run-summary-a",
                category="dispatch",
                severity=EventSeverity.INFO,
                message="informational event",
                created_at=created_at,
                details={},
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-summary-b",
                run_id="run-summary-b",
                category="dispatch",
                severity=EventSeverity.WARNING,
                message="warning event",
                created_at=created_at,
                details={},
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-summary-c",
                run_id="run-summary-b",
                category="dispatch",
                severity=EventSeverity.ERROR,
                message="error event",
                created_at=created_at,
                details={},
            )
        )
        with connection() as conn:
            conn.execute(
                "INSERT INTO locks (name, owner_run_id, created_at) VALUES (?, ?, ?)",
                ("build_tree", "run-summary-a", created_at.isoformat()),
            )
            conn.execute(
                "INSERT INTO locks (name, owner_run_id, created_at) VALUES (?, ?, ?)",
                ("project_config", "run-summary-b", created_at.isoformat()),
            )
        prompt_sessions_service.create_session(
            PromptSessionRecord(
                prompt_id="prompt-summary-a",
                plan_id="plan-summary-a",
                status=PromptSessionStatus.WAITING_APPROVAL,
                prompt_text='Open level "Levels/Main.level" and create entity named "Hero".',
                project_root="C:/project",
                engine_root="C:/engine",
                dry_run=False,
                admitted_capabilities=[
                    "editor.session.open",
                    "editor.level.open",
                    "editor.entity.create",
                ],
                child_run_ids=["run-summary-a"],
            )
        )
        prompt_sessions_service.create_session(
            PromptSessionRecord(
                prompt_id="prompt-summary-b",
                plan_id="plan-summary-b",
                status=PromptSessionStatus.COMPLETED,
                prompt_text="Inspect project manifest.",
                project_root="C:/project",
                engine_root="C:/engine",
                dry_run=True,
                admitted_capabilities=["project.inspect"],
                child_run_ids=["run-summary-b"],
            )
        )

        response = client.get("/summary")
        assert response.status_code == 200
        payload = response.json()
        assert payload["prompt_sessions_total"] == 2
        assert payload["prompt_sessions_by_status"] == {
            "completed": 1,
            "waiting_approval": 1,
        }
        assert payload["prompt_sessions_waiting_approval"] == 1
        assert payload["prompt_sessions_with_real_editor_children"] == 1
        assert payload["runs_total"] == 2
        assert payload["runs_by_status"] == {"rejected": 1, "succeeded": 1}
        assert payload["runs_by_related_execution_mode"] == {"real": 1, "simulated": 1}
        assert payload["runs_by_inspection_surface"] == {
            "settings_patch_preflight": 1,
            "simulated": 1,
        }
        assert payload["runs_by_fallback_category"] == {"manifest-missing": 1}
        assert payload["runs_by_manifest_source_of_truth"] == {
            "project_root/project.json": 2
        }
        assert payload["approvals_total"] == 2
        assert payload["approvals_pending"] == 1
        assert payload["approvals_decided"] == 1
        assert payload["executions_total"] == 2
        assert payload["executions_by_status"] == {"failed": 1, "succeeded": 1}
        assert payload["executions_by_mode"] == {"real": 1, "simulated": 1}
        assert payload["executions_by_inspection_surface"] == {
            "settings_patch_preflight": 1,
            "simulated": 1,
        }
        assert payload["executions_by_fallback_category"] == {"manifest-missing": 1}
        assert payload["executions_by_manifest_source_of_truth"] == {
            "project_root/project.json": 2
        }
        assert payload["artifacts_total"] == 2
        assert payload["artifacts_by_mode"] == {"real": 1, "simulated": 1}
        assert payload["artifacts_by_inspection_surface"] == {
            "settings_patch_preflight": 1,
            "simulated": 1,
        }
        assert payload["artifacts_by_fallback_category"] == {"manifest-missing": 1}
        assert payload["artifacts_by_manifest_source_of_truth"] == {
            "project_root/project.json": 2
        }
        assert payload["events_total"] == 3
        assert payload["active_events"] == 2
        assert payload["events_by_severity"] == {"error": 1, "info": 1, "warning": 1}
        assert payload["locks_total"] == 2


def test_executions_and_artifacts_endpoints_reflect_simulated_dispatch() -> None:
    with isolated_client() as client:
        dispatch = client.post(
            "/tools/dispatch",
            json={
                "request_id": "api-artifacts-1",
                "tool": "project.inspect",
                "agent": "project-build",
                "project_root": "/tmp/project",
                "engine_root": "/tmp/engine",
                "dry_run": True,
                "locks": [],
                "timeout_s": 30,
                "args": {},
            },
        )
        payload = dispatch.json()
        artifact_id = payload["artifacts"][0]

        executions = client.get("/executions")
        execution_cards = client.get("/executions/cards")
        artifacts = client.get("/artifacts")
        artifact_cards = client.get("/artifacts/cards")
        artifact = client.get(f"/artifacts/{artifact_id}")

        assert executions.status_code == 200
        assert execution_cards.status_code == 200
        assert artifacts.status_code == 200
        assert artifact_cards.status_code == 200
        assert artifact.status_code == 200
        assert payload["result"]["simulated"] is True
        assert executions.json()["executions"][0]["execution_mode"] == "simulated"
        assert executions.json()["executions"][0]["details"]["adapter_family"] == "project-build"
        assert (
            executions.json()["executions"][0]["details"]["adapter_contract_version"]
            == "v0.1"
        )
        execution_card = execution_cards.json()["executions"][0]
        assert execution_card["tool"] == "project.inspect"
        assert execution_card["execution_mode"] == "simulated"
        assert execution_card["warning_count"] == 1
        assert execution_card["artifact_count"] == 1
        assert execution_card["inspection_surface"] == "simulated"
        assert execution_card["fallback_category"] is None
        assert execution_card["project_manifest_source_of_truth"] is None
        assert "details" not in execution_card
        artifact_card = artifact_cards.json()["artifacts"][0]
        assert artifact_card["label"] == "Simulated dispatch summary"
        assert artifact_card["kind"] == "simulated_result"
        assert artifact_card["simulated"] is True
        assert artifact_card["execution_mode"] == "simulated"
        assert artifact_card["inspection_surface"] == "simulated"
        assert artifact_card["fallback_category"] is None
        assert artifact_card["project_manifest_source_of_truth"] is None
        assert "metadata" not in artifact_card
        assert artifact.json()["simulated"] is True
        assert artifact.json()["metadata"]["adapter_family"] == "project-build"
        assert artifact.json()["metadata"]["adapter_contract_version"] == "v0.1"


def test_execution_and_artifact_cards_support_truth_marker_filters() -> None:
    created_at = datetime(2026, 2, 1, 9, 0, tzinfo=timezone.utc)
    started_at = datetime(2026, 2, 1, 10, 0, tzinfo=timezone.utc)

    with isolated_client() as client:
        control_plane_repository.create_run(
            RunRecord(
                id="run-filter-a",
                request_id="request-filter-a",
                agent="project-build",
                tool="project.inspect",
                status=RunStatus.SUCCEEDED,
                created_at=created_at,
                updated_at=created_at,
            )
        )
        control_plane_repository.create_run(
            RunRecord(
                id="run-filter-b",
                request_id="request-filter-b",
                agent="project-build",
                tool="settings.patch",
                status=RunStatus.FAILED,
                created_at=created_at,
                updated_at=created_at,
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-filter-a",
                run_id="run-filter-a",
                request_id="request-filter-a",
                agent="project-build",
                tool="project.inspect",
                execution_mode="simulated",
                status=ExecutionStatus.SUCCEEDED,
                started_at=started_at,
                details={
                    "inspection_surface": "simulated",
                    "fallback_category": "manifest-missing",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-filter-b",
                run_id="run-filter-b",
                request_id="request-filter-b",
                agent="project-build",
                tool="settings.patch",
                execution_mode="real",
                status=ExecutionStatus.SUCCEEDED,
                started_at=started_at,
                details={
                    "inspection_surface": "settings_patch_preflight",
                    "fallback_category": "mutation-not-admitted",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-filter-a",
                run_id="run-filter-a",
                execution_id="exe-filter-a",
                label="artifact-filter-a",
                kind="simulated_result",
                uri="memory://artifact-filter-a",
                simulated=True,
                created_at=created_at,
                metadata={
                    "execution_mode": "simulated",
                    "inspection_surface": "simulated",
                    "fallback_category": "manifest-missing",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-filter-b",
                run_id="run-filter-b",
                execution_id="exe-filter-b",
                label="artifact-filter-b",
                kind="manifest_backup",
                uri="memory://artifact-filter-b",
                simulated=False,
                created_at=created_at,
                metadata={
                    "execution_mode": "real",
                    "inspection_surface": "settings_patch_preflight",
                    "fallback_category": "mutation-not-admitted",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )

        execution_cards = client.get(
            "/executions/cards",
            params={"fallback_category": "manifest-missing"},
        )
        assert execution_cards.status_code == 200
        assert [item["id"] for item in execution_cards.json()["executions"]] == ["exe-filter-a"]

        execution_cards = client.get(
            "/executions/cards",
            params={"inspection_surface": "settings_patch_preflight"},
        )
        assert execution_cards.status_code == 200
        assert [item["id"] for item in execution_cards.json()["executions"]] == ["exe-filter-b"]

        artifact_cards = client.get(
            "/artifacts/cards",
            params={"fallback_category": "manifest-missing"},
        )
        assert artifact_cards.status_code == 200
        assert [item["id"] for item in artifact_cards.json()["artifacts"]] == ["art-filter-a"]

        artifact_cards = client.get(
            "/artifacts/cards",
            params={"manifest_source_of_truth": "project_root/project.json"},
        )
        assert artifact_cards.status_code == 200
        assert [item["id"] for item in artifact_cards.json()["artifacts"]] == [
            "art-filter-b",
            "art-filter-a",
        ]


def test_run_cards_support_execution_truth_marker_filters() -> None:
    created_at = datetime(2026, 2, 1, 9, 0, tzinfo=timezone.utc)
    started_at = datetime(2026, 2, 1, 10, 0, tzinfo=timezone.utc)

    with isolated_client() as client:
        control_plane_repository.create_run(
            RunRecord(
                id="run-truth-a",
                request_id="request-truth-a",
                agent="project-build",
                tool="project.inspect",
                status=RunStatus.SUCCEEDED,
                created_at=created_at,
                updated_at=created_at,
            )
        )
        control_plane_repository.create_run(
            RunRecord(
                id="run-truth-b",
                request_id="request-truth-b",
                agent="project-build",
                tool="settings.patch",
                status=RunStatus.FAILED,
                created_at=created_at,
                updated_at=created_at,
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-truth-a",
                run_id="run-truth-a",
                request_id="request-truth-a",
                agent="project-build",
                tool="project.inspect",
                execution_mode="simulated",
                status=ExecutionStatus.SUCCEEDED,
                started_at=started_at,
                details={
                    "inspection_surface": "simulated",
                    "fallback_category": "manifest-missing",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-truth-b",
                run_id="run-truth-b",
                request_id="request-truth-b",
                agent="project-build",
                tool="settings.patch",
                execution_mode="real",
                status=ExecutionStatus.SUCCEEDED,
                started_at=started_at,
                details={
                    "inspection_surface": "settings_patch_preflight",
                    "fallback_category": "mutation-not-admitted",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )

        run_cards = client.get(
            "/runs/cards",
            params={"fallback_category": "manifest-missing"},
        )
        assert run_cards.status_code == 200
        run_payload = run_cards.json()["runs"]
        assert [item["id"] for item in run_payload] == ["run-truth-a"]
        assert run_payload[0]["inspection_surface"] == "simulated"
        assert run_payload[0]["fallback_category"] == "manifest-missing"
        assert (
            run_payload[0]["project_manifest_source_of_truth"]
            == "project_root/project.json"
        )

        run_cards = client.get(
            "/runs/cards",
            params={"inspection_surface": "settings_patch_preflight"},
        )
        assert run_cards.status_code == 200
        assert [item["id"] for item in run_cards.json()["runs"]] == ["run-truth-b"]

        run_cards = client.get(
            "/runs/cards",
            params={"manifest_source_of_truth": "project_root/project.json"},
        )
        assert run_cards.status_code == 200
        assert [item["id"] for item in run_cards.json()["runs"]] == [
            "run-truth-b",
            "run-truth-a",
        ]


def test_dispatch_route_uses_real_project_inspect_path_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_id": "{22222222-2222-2222-2222-222222222222}",
                    "project_name": "ApiHybridProject",
                    "display_name": "API Hybrid Project",
                    "gem_names": ["ApiGem"],
                    "compatible_engines": ["o3de"],
                    "engine_api_dependencies": {"renderer": "1.0.0"},
                    "origin": {"template": "ApiTemplate", "source": "manifest"},
                    "user_tags": ["api", "hybrid"],
                    "icon_path": "icons/api-project.svg",
                    "restricted_platform_name": "windows",
                    "version": "2.0.0",
                }
            ),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-real-inspect-1",
                        "tool": "project.inspect",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "include_project_config": True,
                            "project_config_keys": ["project_name", "version"],
                            "include_gems": True,
                            "requested_gem_names": ["ApiGem", "MissingGem"],
                            "include_settings": True,
                            "requested_settings_keys": ["version", "missing_setting"],
                        },
                    },
                )
                assert dispatch.status_code == 200
                payload = dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"

                executions = client.get("/executions")
                execution_cards = client.get("/executions/cards")
                artifacts = client.get("/artifacts")
                artifact_cards = client.get("/artifacts/cards")
                executors = client.get("/executors")
                workspaces = client.get("/workspaces")
                assert executions.status_code == 200
                assert execution_cards.status_code == 200
                assert artifacts.status_code == 200
                assert artifact_cards.status_code == 200
                assert executors.status_code == 200
                assert workspaces.status_code == 200
                execution = executions.json()["executions"][0]
                execution_card = execution_cards.json()["executions"][0]
                artifact = artifacts.json()["artifacts"][0]
                artifact_card = artifact_cards.json()["artifacts"][0]
                executor = executors.json()["executors"][0]
                workspace = workspaces.json()["workspaces"][0]
                assert execution["details"]["project_root_path"] == str(project_root.resolve())
                assert execution["details"]["project_manifest_relative_path"] == "project.json"
                assert execution["details"]["project_manifest_read_mode"] == "read-only"
                assert (
                    execution["details"]["project_manifest_source_of_truth"]
                    == "project_root/project.json"
                )
                assert execution["details"]["project_manifest_workspace_local"] is True
                assert execution["details"]["project_manifest_within_project_root"] is True
                assert execution["details"]["project_config"]["project_name"] == "ApiHybridProject"
                assert execution["details"]["requested_project_config_evidence"] == [
                    "project_config",
                    "project_config_keys",
                    "requested_project_config_keys",
                    "matched_requested_project_config_keys",
                    "missing_requested_project_config_keys",
                ]
                assert execution["details"]["project_config_selection_mode"] == "requested-subset"
                assert execution["details"]["project_config_keys"] == [
                    "project_name",
                    "version",
                ]
                assert execution["details"]["available_project_config_keys"] == [
                    "compatible_engines",
                    "display_name",
                    "engine_api_dependencies",
                    "icon_path",
                    "origin",
                    "project_id",
                    "project_name",
                    "restricted_platform_name",
                    "user_tags",
                    "version",
                ]
                assert execution["details"]["available_project_config_count"] == 10
                assert execution["details"]["available_project_origin"] == {
                    "template": "ApiTemplate",
                    "source": "manifest",
                }
                assert execution["details"]["available_project_origin_type"] == "object"
                assert execution["details"]["available_project_origin_keys"] == [
                    "source",
                    "template",
                ]
                assert execution["details"]["project_origin_present"] is True
                assert (
                    execution["details"]["available_project_id"]
                    == "{22222222-2222-2222-2222-222222222222}"
                )
                assert execution["details"]["project_id_present"] is True
                assert execution["details"]["available_user_tags"] == ["api", "hybrid"]
                assert execution["details"]["available_user_tag_count"] == 2
                assert execution["details"]["identity_fields_present"] is True
                assert execution["details"]["available_display_name"] == "API Hybrid Project"
                assert execution["details"]["available_icon_path"] == "icons/api-project.svg"
                assert (
                    execution["details"]["available_restricted_platform_name"]
                    == "windows"
                )
                assert execution["details"]["presentation_fields_present"] is True
                assert execution["details"]["available_compatible_engines"] == ["o3de"]
                assert execution["details"]["available_compatible_engine_count"] == 1
                assert execution["details"]["available_engine_api_dependency_keys"] == [
                    "renderer",
                ]
                assert execution["details"]["available_engine_api_dependency_count"] == 1
                assert execution["details"]["engine_compatibility_fields_present"] is True
                assert execution["details"]["requested_project_config_keys"] == [
                    "project_name",
                    "version",
                ]
                assert execution["details"]["matched_requested_project_config_keys"] == [
                    "project_name",
                    "version",
                ]
                assert execution["details"]["missing_requested_project_config_keys"] == []
                assert execution["details"]["requested_project_config_subset_present"] is True
                assert execution["details"]["requested_settings_evidence"] == [
                    "manifest_settings",
                    "manifest_settings_keys",
                    "requested_settings_keys",
                    "matched_requested_settings_keys",
                    "missing_requested_settings_keys",
                ]
                assert (
                    execution["details"]["settings_evidence_source"]
                    == "project_manifest_top_level"
                )
                assert execution["details"]["settings_selection_mode"] == "requested-subset"
                assert execution["details"]["requested_settings_keys"] == [
                    "version",
                    "missing_setting",
                ]
                assert execution["details"]["matched_requested_settings_keys"] == ["version"]
                assert execution["details"]["missing_requested_settings_keys"] == [
                    "missing_setting",
                ]
                assert execution["details"]["matched_requested_settings_count"] == 1
                assert execution["details"]["missing_requested_settings_count"] == 1
                assert execution["details"]["requested_gem_evidence"] == [
                    "gem_names",
                    "gem_names_count",
                    "requested_gem_names",
                    "matched_requested_gem_names",
                    "missing_requested_gem_names",
                ]
                assert execution["details"]["gem_evidence_source"] == "project_manifest_gem_names"
                assert execution["details"]["gem_selection_mode"] == "requested-subset"
                assert execution["details"]["requested_gem_names"] == [
                    "ApiGem",
                    "MissingGem",
                ]
                assert execution["details"]["matched_requested_gem_names"] == ["ApiGem"]
                assert execution["details"]["missing_requested_gem_names"] == ["MissingGem"]
                assert execution["details"]["matched_requested_gem_count"] == 1
                assert execution["details"]["missing_requested_gem_count"] == 1
                assert execution["details"]["available_gem_names"] == ["ApiGem"]
                assert execution["details"]["available_gem_count"] == 1
                assert execution["details"]["gem_names"] == ["ApiGem"]
                assert execution["details"]["gem_entries_present"] is True
                assert execution["details"]["requested_gem_subset_present"] is True
                assert execution["details"]["manifest_settings_keys"] == ["version"]
                assert execution["details"]["requested_build_state_evidence"] == []
                assert execution["details"]["build_state_evidence_source"] == "not-requested"
                assert execution["details"]["build_state_selection_mode"] == "not-requested"
                assert execution["details"]["build_state_real_path_available"] is False
                assert execution["details"]["requested_build_state_subset_present"] is False
                assert execution["details"]["requested_settings_subset_present"] is True
                assert execution["details"]["manifest_settings"]["version"] == "2.0.0"
                assert execution["executor_id"] == "executor-project-build-hybrid-readonly-local"
                assert execution["workspace_id"] == f"workspace-project-inspect-{execution['id']}"
                assert execution["runner_family"] == "cli"
                assert execution["execution_attempt_state"] == "completed"
                assert execution_card["executor_id"] == execution["executor_id"]
                assert execution_card["workspace_id"] == execution["workspace_id"]
                assert execution_card["runner_family"] == "cli"
                assert execution_card["execution_attempt_state"] == "completed"

                assert artifact["executor_id"] == execution["executor_id"]
                assert artifact["workspace_id"] == execution["workspace_id"]
                assert artifact["artifact_role"] == "inspection-evidence"
                assert artifact["retention_class"] == "operator-configured"
                assert artifact["evidence_completeness"] == "inspection-backed"
                assert artifact_card["executor_id"] == execution["executor_id"]
                assert artifact_card["workspace_id"] == execution["workspace_id"]
                assert artifact_card["artifact_role"] == "inspection-evidence"
                assert artifact_card["retention_class"] == "operator-configured"
                assert artifact_card["evidence_completeness"] == "inspection-backed"

                assert executor["id"] == "executor-project-build-hybrid-readonly-local"
                assert executor["executor_kind"] == "local-admitted-readonly"
                assert executor["availability_state"] == "available"
                assert executor["supported_runner_families"] == ["cli"]
                assert sorted(executor["capability_snapshot"]["admitted_tools"]) == [
                    "build.compile",
                    "build.configure",
                    "project.inspect",
                ]

                assert workspace["id"] == execution["workspace_id"]
                assert workspace["workspace_root"] == str(project_root.resolve())
                assert workspace["workspace_kind"] == "admitted-readonly-project-root"
                assert workspace["workspace_state"] == "ready"
                assert workspace["runner_family"] == "cli"
                assert workspace["owner_run_id"] == payload["operation_id"]
                assert workspace["owner_execution_id"] == execution["id"]
                assert workspace["owner_executor_id"] == executor["id"]


def test_dispatch_route_records_requested_build_state_as_unavailable_in_real_project_inspect_path(
    ) -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "ApiBuildStateProject",
                    "version": "2.1.0",
                }
            ),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-build-state-1",
                        "tool": "project.inspect",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "include_project_config": True,
                            "project_config_keys": ["project_name"],
                            "include_build_state": True,
                        },
                    },
                )
                assert dispatch.status_code == 200
                payload = dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"

                executions = client.get("/executions")
                assert executions.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                assert execution["details"]["project_root_path"] == str(project_root.resolve())
                assert execution["details"]["project_manifest_relative_path"] == "project.json"
                assert execution["details"]["project_manifest_read_mode"] == "read-only"
                assert (
                    execution["details"]["project_manifest_source_of_truth"]
                    == "project_root/project.json"
                )
                assert execution["details"]["project_manifest_workspace_local"] is True
                assert execution["details"]["project_manifest_within_project_root"] is True
                assert execution["details"]["requested_build_state_evidence"] == [
                    "build_state_request",
                    "build_state_unavailable",
                ]
                assert (
                    execution["details"]["build_state_evidence_source"]
                    == "simulated_unavailable"
                )
                assert (
                    execution["details"]["build_state_selection_mode"]
                    == "requested-unavailable"
                )
                assert execution["details"]["build_state_real_path_available"] is False
                assert execution["details"]["requested_build_state_subset_present"] is False


def test_dispatch_route_records_manifest_missing_fallback_provenance_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-project-fallback-1",
                        "tool": "project.inspect",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {},
                    },
                )
                assert dispatch.status_code == 200
                payload = dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is True
                assert payload["result"]["execution_mode"] == "simulated"

                executions = client.get("/executions")
                assert executions.status_code == 200
                execution = executions.json()["executions"][0]
                assert execution["details"]["real_path_available"] is False
                assert execution["details"]["fallback_category"] == "manifest-missing"
                assert execution["details"]["project_root_path"] == str(project_root.resolve())
                assert (
                    execution["details"]["expected_project_manifest_path"]
                    == str((project_root.resolve() / "project.json"))
                )
                assert (
                    execution["details"]["expected_project_manifest_relative_path"]
                    == "project.json"
                )
                assert (
                    execution["details"]["project_manifest_source_of_truth"]
                    == "project_root/project.json"
                )


def test_dispatch_route_uses_real_asset_batch_process_preflight_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Models" / "ship.fbx"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(b"api-asset-batch-source")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
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
                    dispatch = client.post(
                        "/tools/dispatch",
                        json={
                            "request_id": "api-asset-batch-preflight-1",
                            "tool": "asset.batch.process",
                            "agent": "asset-pipeline",
                            "project_root": str(project_root),
                            "engine_root": "/tmp/engine",
                            "dry_run": True,
                            "locks": [],
                            "timeout_s": 30,
                            "args": {
                                "source_glob": "Assets/**/*.fbx",
                                "platforms": ["pc"],
                                "clean": False,
                                "max_jobs": 4,
                            },
                        },
                    )
                    approval_id = dispatch.json()["approval_id"]
                    approval = approvals_service.get_approval(approval_id)
                    assert approval is not None
                    client.post(
                        f"/approvals/{approval_id}/approve",
                        json={"reason": "Approve asset.batch.process preflight for test"},
                    )
                    approved_dispatch = client.post(
                        "/tools/dispatch",
                        json={
                            "request_id": "api-asset-batch-preflight-2",
                            "tool": "asset.batch.process",
                            "agent": "asset-pipeline",
                            "project_root": str(project_root),
                            "engine_root": "/tmp/engine",
                            "dry_run": True,
                            "locks": [],
                            "timeout_s": 30,
                            "approval_token": approval.token,
                            "args": {
                                "source_glob": "Assets/**/*.fbx",
                                "platforms": ["pc"],
                                "clean": False,
                                "max_jobs": 4,
                            },
                        },
                    )
                    assert approved_dispatch.status_code == 200
                    payload = approved_dispatch.json()
                    assert payload["ok"] is True
                    assert payload["result"]["simulated"] is False
                    assert payload["result"]["execution_mode"] == "real"
                    assert "no asset batch command was executed" in payload["result"]["message"]

                    executions = client.get("/executions")
                    execution_cards = client.get("/executions/cards")
                    artifacts = client.get("/artifacts")
                    artifact_cards = client.get("/artifacts/cards")
                    executors = client.get("/executors")
                    workspaces = client.get("/workspaces")
                    assert executions.status_code == 200
                    assert execution_cards.status_code == 200
                    assert artifacts.status_code == 200
                    assert artifact_cards.status_code == 200
                    assert executors.status_code == 200
                    assert workspaces.status_code == 200
                    execution = executions.json()["executions"][0]
                    execution_card = execution_cards.json()["executions"][0]
                    artifact = artifacts.json()["artifacts"][0]
                    artifact_card = artifact_cards.json()["artifacts"][0]
                    executor = executors.json()["executors"][0]
                    workspace = workspaces.json()["workspaces"][0]
                    assert execution["details"]["inspection_surface"] == "asset_batch_preflight"
                    assert execution["details"]["preflight_execution_mode"] == "plan-only"
                    assert execution["details"]["runtime_available"] is True
                    assert execution["details"]["source_candidate_match_count"] == 1
                    assert execution["details"]["execution_attempted"] is False
                    assert execution["details"]["result_artifact_produced"] is False
                    assert str(source_path) in execution["details"]["resolved_source_candidate_paths"]
                    assert execution["executor_id"] == "executor-asset-pipeline-hybrid-plan-only-local"
                    assert (
                        execution["workspace_id"]
                        == f"workspace-asset-batch-process-{execution['id']}"
                    )
                    assert execution["runner_family"] == "cli"
                    assert execution["execution_attempt_state"] == "completed"
                    assert execution_card["executor_id"] == execution["executor_id"]
                    assert execution_card["workspace_id"] == execution["workspace_id"]
                    assert execution_card["runner_family"] == "cli"
                    assert execution_card["execution_attempt_state"] == "completed"

                    assert artifact["executor_id"] == execution["executor_id"]
                    assert artifact["workspace_id"] == execution["workspace_id"]
                    assert artifact["artifact_role"] == "plan-evidence"
                    assert artifact["retention_class"] == "operator-configured"
                    assert artifact["evidence_completeness"] == "plan-backed"
                    assert artifact_card["executor_id"] == execution["executor_id"]
                    assert artifact_card["workspace_id"] == execution["workspace_id"]
                    assert artifact_card["artifact_role"] == "plan-evidence"
                    assert artifact_card["retention_class"] == "operator-configured"
                    assert artifact_card["evidence_completeness"] == "plan-backed"

                    assert executor["id"] == "executor-asset-pipeline-hybrid-plan-only-local"
                    assert executor["capability_snapshot"]["admitted_tools"] == [
                        "asset.batch.process"
                    ]

                    assert workspace["id"] == execution["workspace_id"]
                    assert workspace["workspace_root"] == str(project_root.resolve())
                    assert workspace["workspace_kind"] == "admitted-plan-only-project-root"
                    assert workspace["workspace_state"] == "ready"
                    assert workspace["cleanup_policy"] == "operator-managed-preflight"
                    assert workspace["runner_family"] == "cli"
                    assert workspace["owner_run_id"] == payload["operation_id"]
                    assert workspace["owner_execution_id"] == execution["id"]
                    assert workspace["owner_executor_id"] == executor["id"]


def test_dispatch_route_records_asset_batch_process_dry_run_fallback_provenance_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-asset-batch-fallback-1",
                        "tool": "asset.batch.process",
                        "agent": "asset-pipeline",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "source_glob": "Assets/**/*.fbx",
                            "platforms": ["pc"],
                        },
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve asset.batch.process fallback test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-asset-batch-fallback-2",
                        "tool": "asset.batch.process",
                        "agent": "asset-pipeline",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {
                            "source_glob": "Assets/**/*.fbx",
                            "platforms": ["pc"],
                        },
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is True

                executions = client.get("/executions")
                assert executions.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                assert execution["details"]["real_path_available"] is False
                assert execution["details"]["fallback_category"] == "dry-run-required"
                assert execution["details"]["project_root_path"] == str(project_root.resolve())


def test_dispatch_route_uses_real_asset_move_safe_preflight_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Old" / "example.fbx"
        destination_dir = project_root / "Assets" / "New"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        destination_dir.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(b"api-asset-move-source")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-asset-move-preflight-1",
                        "tool": "asset.move.safe",
                        "agent": "asset-pipeline",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "source_path": "Assets/Old/example.fbx",
                            "destination_path": "Assets/New/example.fbx",
                            "update_references": True,
                            "dry_run_plan": True,
                        },
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve asset.move.safe preflight for test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-asset-move-preflight-2",
                        "tool": "asset.move.safe",
                        "agent": "asset-pipeline",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {
                            "source_path": "Assets/Old/example.fbx",
                            "destination_path": "Assets/New/example.fbx",
                            "update_references": True,
                            "dry_run_plan": True,
                        },
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"
                assert "no asset files or references were changed" in payload["result"]["message"]

                executions = client.get("/executions")
                execution_cards = client.get("/executions/cards")
                artifacts = client.get("/artifacts")
                artifact_cards = client.get("/artifacts/cards")
                executors = client.get("/executors")
                workspaces = client.get("/workspaces")
                assert executions.status_code == 200
                assert execution_cards.status_code == 200
                assert artifacts.status_code == 200
                assert artifact_cards.status_code == 200
                assert executors.status_code == 200
                assert workspaces.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                execution_card = next(
                    card
                    for card in execution_cards.json()["executions"]
                    if card["id"] == execution["id"]
                )
                artifact = next(
                    artifact
                    for artifact in artifacts.json()["artifacts"]
                    if artifact["run_id"] == payload["operation_id"]
                )
                artifact_card = next(
                    card
                    for card in artifact_cards.json()["artifacts"]
                    if card["id"] == artifact["id"]
                )
                executor = next(
                    executor
                    for executor in executors.json()["executors"]
                    if executor["id"] == execution["executor_id"]
                )
                workspace = next(
                    workspace
                    for workspace in workspaces.json()["workspaces"]
                    if workspace["id"] == execution["workspace_id"]
                )
                assert execution["details"]["inspection_surface"] == "asset_move_preflight"
                assert execution["details"]["preflight_execution_mode"] == "plan-only"
                assert execution["details"]["move_plan_requested"] is True
                assert execution["details"]["identity_corridor_available"] is True
                assert execution["details"]["execution_attempted"] is False
                assert execution["details"]["result_artifact_produced"] is False
                assert execution["details"]["source_path_resolved"] == str(source_path.resolve())
                assert execution["executor_id"] == "executor-asset-pipeline-hybrid-plan-only-local-move"
                assert execution["workspace_id"] == f"workspace-asset-move-safe-{execution['id']}"
                assert execution["runner_family"] == "cli"
                assert execution_card["executor_id"] == execution["executor_id"]
                assert execution_card["workspace_id"] == execution["workspace_id"]

                assert artifact["executor_id"] == execution["executor_id"]
                assert artifact["workspace_id"] == execution["workspace_id"]
                assert artifact["artifact_role"] == "plan-evidence"
                assert artifact["evidence_completeness"] == "plan-backed"
                assert artifact_card["executor_id"] == execution["executor_id"]
                assert artifact_card["workspace_id"] == execution["workspace_id"]
                assert artifact_card["artifact_role"] == "plan-evidence"

                assert executor["id"] == "executor-asset-pipeline-hybrid-plan-only-local-move"
                assert executor["capability_snapshot"]["admitted_tools"] == ["asset.move.safe"]

                assert workspace["id"] == execution["workspace_id"]
                assert workspace["workspace_root"] == str(project_root.resolve())
                assert workspace["workspace_kind"] == "admitted-plan-only-project-root"
                assert workspace["cleanup_policy"] == "operator-managed-preflight"
                assert workspace["owner_run_id"] == payload["operation_id"]
                assert workspace["owner_execution_id"] == execution["id"]
                assert workspace["owner_executor_id"] == executor["id"]


def test_dispatch_route_records_asset_move_safe_plan_required_fallback_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Old" / "example.fbx"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(b"api-asset-move-fallback")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-asset-move-fallback-1",
                        "tool": "asset.move.safe",
                        "agent": "asset-pipeline",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "source_path": "Assets/Old/example.fbx",
                            "destination_path": "Assets/New/example.fbx",
                            "update_references": True,
                            "dry_run_plan": False,
                        },
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve asset.move.safe fallback test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-asset-move-fallback-2",
                        "tool": "asset.move.safe",
                        "agent": "asset-pipeline",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {
                            "source_path": "Assets/Old/example.fbx",
                            "destination_path": "Assets/New/example.fbx",
                            "update_references": True,
                            "dry_run_plan": False,
                        },
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is True

                executions = client.get("/executions")
                assert executions.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                assert execution["details"]["real_path_available"] is False
                assert execution["details"]["fallback_category"] == "plan-required"
                assert execution["details"]["project_root_path"] == str(project_root.resolve())


def test_dispatch_route_uses_real_build_configure_preflight_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "ApiConfigureProject"}),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-configure-preflight-1",
                        "tool": "build.configure",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {"preset": "profile", "generator": "Ninja"},
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve configure preflight for test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-configure-preflight-2",
                        "tool": "build.configure",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {"preset": "profile", "generator": "Ninja"},
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"
                assert "no configure command was executed" in payload["result"]["message"]

                executions = client.get("/executions")
                execution_cards = client.get("/executions/cards")
                artifacts = client.get("/artifacts")
                artifact_cards = client.get("/artifacts/cards")
                executors = client.get("/executors")
                workspaces = client.get("/workspaces")
                assert executions.status_code == 200
                assert execution_cards.status_code == 200
                assert artifacts.status_code == 200
                assert artifact_cards.status_code == 200
                assert executors.status_code == 200
                assert workspaces.status_code == 200
                execution = executions.json()["executions"][0]
                execution_card = execution_cards.json()["executions"][0]
                artifact = artifacts.json()["artifacts"][0]
                artifact_card = artifact_cards.json()["artifacts"][0]
                executor = executors.json()["executors"][0]
                workspace = workspaces.json()["workspaces"][0]
                assert execution["details"]["project_root_path"] == str(project_root.resolve())
                assert execution["details"]["project_manifest_relative_path"] == "project.json"
                assert execution["details"]["project_manifest_read_mode"] == "read-only"
                assert (
                    execution["details"]["project_manifest_source_of_truth"]
                    == "project_root/project.json"
                )
                assert execution["details"]["project_manifest_workspace_local"] is True
                assert execution["details"]["project_manifest_within_project_root"] is True
                assert execution["details"]["preflight_execution_mode"] == "plan-only"
                assert execution["details"]["plan_details"]["preset"] == "profile"
                assert execution["executor_id"] == "executor-project-build-hybrid-readonly-local"
                assert execution["workspace_id"] == f"workspace-build-configure-{execution['id']}"
                assert execution["runner_family"] == "cli"
                assert execution["execution_attempt_state"] == "completed"
                assert execution_card["executor_id"] == execution["executor_id"]
                assert execution_card["workspace_id"] == execution["workspace_id"]
                assert execution_card["runner_family"] == "cli"
                assert execution_card["execution_attempt_state"] == "completed"

                assert artifact["executor_id"] == execution["executor_id"]
                assert artifact["workspace_id"] == execution["workspace_id"]
                assert artifact["artifact_role"] == "plan-evidence"
                assert artifact["retention_class"] == "operator-configured"
                assert artifact["evidence_completeness"] == "plan-backed"
                assert artifact_card["executor_id"] == execution["executor_id"]
                assert artifact_card["workspace_id"] == execution["workspace_id"]
                assert artifact_card["artifact_role"] == "plan-evidence"
                assert artifact_card["retention_class"] == "operator-configured"
                assert artifact_card["evidence_completeness"] == "plan-backed"

                assert executor["id"] == "executor-project-build-hybrid-readonly-local"
                assert executor["supported_runner_families"] == ["cli"]
                assert sorted(executor["capability_snapshot"]["admitted_tools"]) == [
                    "build.compile",
                    "build.configure",
                    "project.inspect",
                ]

                assert workspace["id"] == execution["workspace_id"]
                assert workspace["workspace_root"] == str(project_root.resolve())
                assert workspace["workspace_kind"] == "admitted-plan-only-project-root"
                assert workspace["workspace_state"] == "ready"
                assert workspace["cleanup_policy"] == "operator-managed-preflight"
                assert workspace["runner_family"] == "cli"
                assert workspace["owner_run_id"] == payload["operation_id"]
                assert workspace["owner_execution_id"] == execution["id"]
                assert workspace["owner_executor_id"] == executor["id"]


def test_dispatch_route_records_build_configure_dry_run_fallback_provenance_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "ApiConfigureFallbackProject"}),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-configure-fallback-1",
                        "tool": "build.configure",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {"preset": "profile"},
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve configure fallback test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-configure-fallback-2",
                        "tool": "build.configure",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {"preset": "profile"},
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is True

                executions = client.get("/executions")
                assert executions.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                assert execution["details"]["real_path_available"] is False
                assert execution["details"]["fallback_category"] == "dry-run-required"
                assert execution["details"]["project_root_path"] == str(project_root.resolve())
                assert (
                    execution["details"]["expected_project_manifest_path"]
                    == str(project_root.resolve() / "project.json")
                )
                assert (
                    execution["details"]["expected_project_manifest_relative_path"]
                    == "project.json"
                )


def test_dispatch_route_uses_real_render_material_patch_mutation_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        material_path = project_root / "Materials" / "Example.material"
        material_path.parent.mkdir(parents=True, exist_ok=True)
        material_path.write_text(
            json.dumps(
                {
                    "materialType": "ApiMaterial",
                    "propertyValues": {"roughness": 0.5},
                }
            ),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-render-material-patch-1",
                        "tool": "render.material.patch",
                        "agent": "render-lookdev",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "material_path": "Materials/Example.material",
                            "property_overrides": {"roughness": 0.25},
                            "create_backup": True,
                        },
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve render.material.patch mutation for test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-render-material-patch-2",
                        "tool": "render.material.patch",
                        "agent": "render-lookdev",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {
                            "material_path": "Materials/Example.material",
                            "property_overrides": {"roughness": 0.25},
                            "create_backup": True,
                        },
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"
                assert "material propertyValues corridor" in payload["result"]["message"]
                persisted_material = json.loads(material_path.read_text(encoding="utf-8"))
                assert persisted_material["propertyValues"]["roughness"] == 0.25

                executions = client.get("/executions")
                execution_cards = client.get("/executions/cards")
                artifacts = client.get("/artifacts")
                artifact_cards = client.get("/artifacts/cards")
                executors = client.get("/executors")
                workspaces = client.get("/workspaces")
                assert executions.status_code == 200
                assert execution_cards.status_code == 200
                assert artifacts.status_code == 200
                assert artifact_cards.status_code == 200
                assert executors.status_code == 200
                assert workspaces.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                execution_card = next(
                    execution_card
                    for execution_card in execution_cards.json()["executions"]
                    if execution_card["run_id"] == payload["operation_id"]
                )
                artifact = next(
                    artifact
                    for artifact in artifacts.json()["artifacts"]
                    if artifact["run_id"] == payload["operation_id"]
                )
                artifact_card = next(
                    artifact_card
                    for artifact_card in artifact_cards.json()["artifacts"]
                    if artifact_card["run_id"] == payload["operation_id"]
                )
                executor = next(
                    executor
                    for executor in executors.json()["executors"]
                    if executor["id"] == execution["executor_id"]
                )
                workspace = next(
                    workspace
                    for workspace in workspaces.json()["workspaces"]
                    if workspace["id"] == f"workspace-render-material-patch-{execution['id']}"
                )
                assert execution["details"]["inspection_surface"] == "render_material_patch_mutation"
                assert execution["details"]["mutation_applied"] is True
                assert execution["details"]["post_write_verification_attempted"] is True
                assert execution["details"]["post_write_verification_succeeded"] is True
                assert execution["details"]["material_path_relative_to_project_root"] == str(
                    Path("Materials") / "Example.material"
                )
                assert execution["executor_id"] == executor["id"]
                assert execution["workspace_id"] == workspace["id"]
                assert execution["runner_family"] == "cli"
                assert execution["execution_attempt_state"] == "completed"
                assert execution["backup_class"] == "material-file-backup"
                assert execution["rollback_class"] == "material-file-restore"
                assert execution_card["executor_id"] == execution["executor_id"]
                assert execution_card["workspace_id"] == execution["workspace_id"]
                assert artifact["artifact_role"] == "mutation-evidence"
                assert artifact["evidence_completeness"] == "mutation-backed"
                assert artifact_card["artifact_role"] == "mutation-evidence"
                assert artifact_card["evidence_completeness"] == "mutation-backed"
                assert executor["executor_kind"] == "local-admitted-mutation-gated"
                assert executor["supported_runner_families"] == ["cli"]
                assert executor["capability_snapshot"]["admitted_tools"] == [
                    "render.material.patch"
                ]
                assert (
                    executor["capability_snapshot"]["execution_boundary"]
                    == "mutation-gated local material propertyValues patch with backup and rollback boundary"
                )
                assert workspace["workspace_kind"] == "admitted-mutation-gated-project-root"
                assert workspace["cleanup_policy"] == "operator-managed-backup-rollback"
                assert workspace["runner_family"] == "cli"


def test_dispatch_route_records_post_patch_shader_review_for_render_material_patch() -> None:
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
                    "materialType": "ApiMaterial",
                    "propertyValues": {"roughness": 0.5},
                }
            ),
            encoding="utf-8",
        )
        (build_root / "CMakeCache.txt").write_text("PROJECT_NAME=ShaderApi\n", encoding="utf-8")
        shader_path.write_text("shader-source", encoding="utf-8")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-render-material-patch-shader-review-1",
                        "tool": "render.material.patch",
                        "agent": "render-lookdev",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "material_path": "Materials/Example.material",
                            "property_overrides": {"roughness": 0.25},
                            "create_backup": True,
                            "shader_targets_for_review": ["ExampleShader"],
                        },
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve render.material.patch shader review test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-render-material-patch-shader-review-2",
                        "tool": "render.material.patch",
                        "agent": "render-lookdev",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {
                            "material_path": "Materials/Example.material",
                            "property_overrides": {"roughness": 0.25},
                            "create_backup": True,
                            "shader_targets_for_review": ["ExampleShader"],
                        },
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                execution = next(
                    execution
                    for execution in client.get("/executions").json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                assert execution["details"]["post_patch_shader_preflight_review_requested"] is True
                assert execution["details"]["post_patch_shader_preflight_review_attempted"] is True
                assert execution["details"]["post_patch_shader_preflight_review_ready"] is True
                assert execution["details"]["post_patch_shader_preflight_review"]["inspection_surface"] == (
                    "render_shader_rebuild_preflight"
                )
                assert str(shader_path) in execution["details"]["post_patch_shader_preflight_review"][
                    "resolved_shader_candidate_paths"
                ]


def test_dispatch_route_uses_real_build_compile_preflight_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        target_path = project_root / "build" / "windows" / "bin" / "profile" / "Editor.exe"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text("CMAKE_GENERATOR:INTERNAL=Ninja\n", encoding="utf-8")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"api-build-target")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-build-compile-preflight-1",
                        "tool": "build.compile",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {"targets": ["Editor"], "config": "profile"},
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve build.compile preflight for test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-build-compile-preflight-2",
                        "tool": "build.compile",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {"targets": ["Editor"], "config": "profile"},
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"
                assert "no build command was executed" in payload["result"]["message"]

                executions = client.get("/executions")
                execution_cards = client.get("/executions/cards")
                artifacts = client.get("/artifacts")
                artifact_cards = client.get("/artifacts/cards")
                executors = client.get("/executors")
                workspaces = client.get("/workspaces")
                assert executions.status_code == 200
                assert execution_cards.status_code == 200
                assert artifacts.status_code == 200
                assert artifact_cards.status_code == 200
                assert executors.status_code == 200
                assert workspaces.status_code == 200
                execution = executions.json()["executions"][0]
                execution_card = execution_cards.json()["executions"][0]
                artifact = artifacts.json()["artifacts"][0]
                artifact_card = artifact_cards.json()["artifacts"][0]
                executor = executors.json()["executors"][0]
                workspace = workspaces.json()["workspaces"][0]
                assert execution["details"]["inspection_surface"] == "build_compile_preflight"
                assert execution["details"]["preflight_execution_mode"] == "plan-only"
                assert execution["details"]["configured_build_tree_available"] is True
                assert (
                    execution["details"]["target_artifact_candidates_found_for_all_requested_targets"]
                    is True
                )
                assert execution["details"]["execution_attempted"] is False
                assert execution["details"]["result_artifact_produced"] is False
                assert str(target_path) in execution["details"]["resolved_target_candidate_paths"]
                assert execution["executor_id"] == "executor-project-build-hybrid-readonly-local"
                assert execution["workspace_id"] == f"workspace-build-compile-{execution['id']}"
                assert execution["runner_family"] == "cli"
                assert execution["execution_attempt_state"] == "completed"
                assert execution_card["executor_id"] == execution["executor_id"]
                assert execution_card["workspace_id"] == execution["workspace_id"]
                assert execution_card["runner_family"] == "cli"
                assert execution_card["execution_attempt_state"] == "completed"

                assert artifact["executor_id"] == execution["executor_id"]
                assert artifact["workspace_id"] == execution["workspace_id"]
                assert artifact["artifact_role"] == "plan-evidence"
                assert artifact["retention_class"] == "operator-configured"
                assert artifact["evidence_completeness"] == "plan-backed"
                assert artifact_card["executor_id"] == execution["executor_id"]
                assert artifact_card["workspace_id"] == execution["workspace_id"]
                assert artifact_card["artifact_role"] == "plan-evidence"
                assert artifact_card["retention_class"] == "operator-configured"
                assert artifact_card["evidence_completeness"] == "plan-backed"

                assert executor["id"] == "executor-project-build-hybrid-readonly-local"
                assert sorted(executor["capability_snapshot"]["admitted_tools"]) == [
                    "build.compile",
                    "build.configure",
                    "project.inspect",
                ]

                assert workspace["id"] == execution["workspace_id"]
                assert workspace["workspace_root"] == str(project_root.resolve())
                assert workspace["workspace_kind"] == "admitted-plan-only-project-root"
                assert workspace["workspace_state"] == "ready"
                assert workspace["cleanup_policy"] == "operator-managed-preflight"
                assert workspace["runner_family"] == "cli"
                assert workspace["owner_run_id"] == payload["operation_id"]
                assert workspace["owner_execution_id"] == execution["id"]
                assert workspace["owner_executor_id"] == executor["id"]


def test_dispatch_route_uses_real_build_compile_runner_in_hybrid_mode() -> None:
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
        target_path.write_bytes(b"api-build-target")
        cmake_path.write_text("", encoding="utf-8")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
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
                    dispatch = client.post(
                        "/tools/dispatch",
                        json={
                            "request_id": "api-build-compile-runner-1",
                            "tool": "build.compile",
                            "agent": "project-build",
                            "project_root": str(project_root),
                            "engine_root": "/tmp/engine",
                            "dry_run": False,
                            "locks": [],
                            "timeout_s": 30,
                            "args": {"targets": ["Editor"], "config": "profile"},
                        },
                    )
                    approval_id = dispatch.json()["approval_id"]
                    approval = approvals_service.get_approval(approval_id)
                    assert approval is not None
                    client.post(
                        f"/approvals/{approval_id}/approve",
                        json={"reason": "Approve build.compile runner for test"},
                    )
                    approved_dispatch = client.post(
                        "/tools/dispatch",
                        json={
                            "request_id": "api-build-compile-runner-2",
                            "tool": "build.compile",
                            "agent": "project-build",
                            "project_root": str(project_root),
                            "engine_root": "/tmp/engine",
                            "dry_run": False,
                            "locks": [],
                            "timeout_s": 30,
                            "approval_token": approval.token,
                            "args": {"targets": ["Editor"], "config": "profile"},
                        },
                    )
                    assert approved_dispatch.status_code == 200
                    payload = approved_dispatch.json()
                    assert payload["ok"] is True
                    assert payload["result"]["simulated"] is False
                    assert payload["result"]["execution_mode"] == "real"
                    assert "exit/log truth but unverified compiled output evidence" in payload["result"]["message"]

                    executions = client.get("/executions")
                    assert executions.status_code == 200
                    execution = next(
                        execution
                        for execution in executions.json()["executions"]
                        if execution["run_id"] == payload["operation_id"]
                    )
                    assert execution["details"]["inspection_surface"] == "build_compile_runner"
                    assert execution["details"]["execution_attempted"] is True
                    assert execution["details"]["exit_code_available"] is True
                    assert execution["details"]["exit_code"] == 0
                    assert execution["details"]["result_status"] == "attempted_but_output_unverified"
                    assert execution["details"]["result_artifact_produced"] is True
                    assert execution["details"]["result_artifact_path"]
                    assert execution["details"]["target_candidate_revalidation_attempted"] is True
                    assert execution["details"]["compiled_output_verified"] is False

                    artifacts = client.get("/artifacts")
                    assert artifacts.status_code == 200
                    artifact = next(
                        artifact
                        for artifact in artifacts.json()["artifacts"]
                        if artifact["execution_id"] == execution["id"]
                    )
                    assert artifact["artifact_role"] == "execution-evidence"
                    assert artifact["content_type"] == "text/plain"
                    assert artifact["evidence_completeness"] == "runner-backed"

                    executors = client.get("/executors")
                    assert executors.status_code == 200
                    executor = next(
                        executor
                        for executor in executors.json()["executors"]
                        if executor["id"] == execution["executor_id"]
                    )
                    workspaces = client.get("/workspaces")
                    assert workspaces.status_code == 200
                    workspace = next(
                        workspace
                        for workspace in workspaces.json()["workspaces"]
                        if workspace["id"] == execution["workspace_id"]
                    )
                    assert executor["id"] == "executor-project-build-hybrid-execution-gated-local"
                    assert workspace["workspace_kind"] == "admitted-execution-gated-project-root"
                    assert workspace["cleanup_policy"] == "operator-managed-build-logs"


def test_dispatch_route_records_build_compile_unattempted_runner_evidence_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-build-compile-fallback-1",
                        "tool": "build.compile",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {"targets": ["Editor"]},
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve build.compile fallback test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-build-compile-fallback-2",
                        "tool": "build.compile",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {"targets": ["Editor"]},
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False

                executions = client.get("/executions")
                assert executions.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                assert execution["details"]["inspection_surface"] == "build_compile_runner"
                assert execution["details"]["execution_attempted"] is False
                assert execution["details"]["result_status"] == "not_attempted_preflight_blocked"
                assert execution["details"]["result_artifact_produced"] is False
                assert execution["details"]["real_path_available"] is True
                assert "Build root" in execution["details"]["compile_unavailable_reason"]
                assert execution["details"]["project_root_path"] == str(project_root.resolve())
                assert execution["details"]["build_root_path"] == str(
                    project_root.resolve() / "build"
                )


def test_dispatch_route_uses_real_gem_enable_preflight_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "ApiGemProject",
                    "gem_names": ["ExampleGem"],
                }
            ),
            encoding="utf-8",
        )
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text("CMAKE_GENERATOR:INTERNAL=Ninja\n", encoding="utf-8")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-gem-enable-preflight-1",
                        "tool": "gem.enable",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "gem_name": "ExampleGem",
                            "version": "1.2.3",
                            "optional": True,
                        },
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve gem.enable preflight for test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-gem-enable-preflight-2",
                        "tool": "gem.enable",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {
                            "gem_name": "ExampleGem",
                            "version": "1.2.3",
                            "optional": True,
                        },
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"
                assert "no project manifest mutation was executed" in payload["result"]["message"]

                executions = client.get("/executions")
                execution_cards = client.get("/executions/cards")
                artifacts = client.get("/artifacts")
                artifact_cards = client.get("/artifacts/cards")
                executors = client.get("/executors")
                workspaces = client.get("/workspaces")
                assert executions.status_code == 200
                assert execution_cards.status_code == 200
                assert artifacts.status_code == 200
                assert artifact_cards.status_code == 200
                assert executors.status_code == 200
                assert workspaces.status_code == 200
                execution = executions.json()["executions"][0]
                execution_card = execution_cards.json()["executions"][0]
                artifact = artifacts.json()["artifacts"][0]
                artifact_card = artifact_cards.json()["artifacts"][0]
                executor = executors.json()["executors"][0]
                workspace = workspaces.json()["workspaces"][0]
                assert execution["details"]["inspection_surface"] == "gem_enable_preflight"
                assert execution["details"]["preflight_execution_mode"] == "plan-only"
                assert execution["details"]["requested_gem_name"] == "ExampleGem"
                assert execution["details"]["requested_version"] == "1.2.3"
                assert execution["details"]["requested_optional"] is True
                assert execution["details"]["requested_gem_already_enabled"] is True
                assert execution["details"]["configured_build_tree_available"] is True
                assert execution["details"]["execution_attempted"] is False
                assert execution["details"]["result_artifact_produced"] is False
                assert execution["executor_id"] == "executor-project-build-hybrid-plan-only-local-gem"
                assert execution["workspace_id"] == f"workspace-gem-enable-{execution['id']}"
                assert execution["runner_family"] == "cli"
                assert execution["execution_attempt_state"] == "completed"
                assert execution_card["executor_id"] == execution["executor_id"]
                assert execution_card["workspace_id"] == execution["workspace_id"]
                assert execution_card["runner_family"] == "cli"
                assert execution_card["execution_attempt_state"] == "completed"

                assert artifact["executor_id"] == execution["executor_id"]
                assert artifact["workspace_id"] == execution["workspace_id"]
                assert artifact["artifact_role"] == "plan-evidence"
                assert artifact["retention_class"] == "operator-configured"
                assert artifact["evidence_completeness"] == "plan-backed"
                assert artifact_card["executor_id"] == execution["executor_id"]
                assert artifact_card["workspace_id"] == execution["workspace_id"]
                assert artifact_card["artifact_role"] == "plan-evidence"
                assert artifact_card["retention_class"] == "operator-configured"
                assert artifact_card["evidence_completeness"] == "plan-backed"

                assert executor["id"] == "executor-project-build-hybrid-plan-only-local-gem"
                assert sorted(executor["capability_snapshot"]["admitted_tools"]) == [
                    "gem.enable",
                    "project.inspect",
                ]

                assert workspace["id"] == execution["workspace_id"]
                assert workspace["workspace_root"] == str(project_root.resolve())
                assert workspace["workspace_kind"] == "admitted-plan-only-project-root"
                assert workspace["workspace_state"] == "ready"
                assert workspace["cleanup_policy"] == "operator-managed-preflight"
                assert workspace["runner_family"] == "cli"
                assert workspace["owner_run_id"] == payload["operation_id"]
                assert workspace["owner_execution_id"] == execution["id"]
                assert workspace["owner_executor_id"] == executor["id"]


def test_dispatch_route_uses_real_gem_enable_mutation_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps({"project_name": "ApiGemProject", "gem_names": []}),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-gem-enable-fallback-1",
                        "tool": "gem.enable",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {"gem_name": "ExampleGem"},
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve gem.enable fallback test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-gem-enable-fallback-2",
                        "tool": "gem.enable",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {"gem_name": "ExampleGem"},
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"
                assert "inserted 'ExampleGem' into project.json" in payload["result"]["message"]

                executions = client.get("/executions")
                execution_cards = client.get("/executions/cards")
                artifacts = client.get("/artifacts")
                artifact_cards = client.get("/artifacts/cards")
                executors = client.get("/executors")
                workspaces = client.get("/workspaces")
                executions = client.get("/executions")
                assert executions.status_code == 200
                assert execution_cards.status_code == 200
                assert artifacts.status_code == 200
                assert artifact_cards.status_code == 200
                assert executors.status_code == 200
                assert workspaces.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                execution_card = next(
                    item
                    for item in execution_cards.json()["executions"]
                    if item["run_id"] == payload["operation_id"]
                )
                artifact = next(
                    item
                    for item in artifacts.json()["artifacts"]
                    if item["run_id"] == payload["operation_id"]
                )
                artifact_card = next(
                    item
                    for item in artifact_cards.json()["artifacts"]
                    if item["run_id"] == payload["operation_id"]
                )
                executor = next(
                    item
                    for item in executors.json()["executors"]
                    if item["id"] == execution["executor_id"]
                )
                workspace = next(
                    item
                    for item in workspaces.json()["workspaces"]
                    if item["id"] == execution["workspace_id"]
                )

                assert execution["details"]["inspection_surface"] == "gem_enable_mutation"
                assert execution["details"]["requested_gem_name"] == "ExampleGem"
                assert execution["details"]["requested_gem_already_enabled"] is False
                assert execution["details"]["mutation_applied"] is True
                assert execution["details"]["execution_attempted"] is True
                assert execution["details"]["post_write_verification_succeeded"] is True
                assert execution["details"]["result_artifact_produced"] is False
                assert execution["executor_id"] == "executor-project-build-hybrid-mutation-gated-local-gem"
                assert execution["workspace_id"] == f"workspace-gem-enable-{execution['id']}"
                assert execution["runner_family"] == "cli"
                assert execution["execution_attempt_state"] == "completed"
                assert execution_card["executor_id"] == execution["executor_id"]
                assert execution_card["workspace_id"] == execution["workspace_id"]

                assert artifact["executor_id"] == execution["executor_id"]
                assert artifact["workspace_id"] == execution["workspace_id"]
                assert artifact["artifact_role"] == "mutation-evidence"
                assert artifact["retention_class"] == "operator-configured"
                assert artifact["evidence_completeness"] == "mutation-backed"
                assert artifact_card["artifact_role"] == "mutation-evidence"
                assert artifact_card["evidence_completeness"] == "mutation-backed"

                assert executor["id"] == "executor-project-build-hybrid-mutation-gated-local-gem"
                assert sorted(executor["capability_snapshot"]["admitted_tools"]) == [
                    "gem.enable",
                    "project.inspect",
                ]

                assert workspace["id"] == execution["workspace_id"]
                assert workspace["workspace_root"] == str(project_root.resolve())
                assert workspace["workspace_kind"] == "admitted-mutation-gated-project-root"
                assert workspace["cleanup_policy"] == "operator-managed-backup-rollback"
                assert workspace["runner_family"] == "cli"

                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                assert manifest["gem_names"] == ["ExampleGem"]


def test_dispatch_route_uses_real_settings_patch_preflight_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "ApiSettingsProject",
                    "version": "3.0.0",
                    "display_name": "API Settings Project",
                }
            ),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-settings-preflight-1",
                        "tool": "settings.patch",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "registry_path": "/O3DE/Settings",
                            "operations": [
                                {"op": "set", "path": "/version", "value": "3.0.1"},
                                {"op": "set", "path": "/render/quality", "value": "high"},
                            ],
                        },
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve settings.patch preflight for test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-settings-preflight-2",
                        "tool": "settings.patch",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": True,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {
                            "registry_path": "/O3DE/Settings",
                            "operations": [
                                {"op": "set", "path": "/version", "value": "3.0.1"},
                                {"op": "set", "path": "/render/quality", "value": "high"},
                            ],
                        },
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"
                assert "no settings were written" in payload["result"]["message"]
                assert any(
                    "settings.patch preflight path" in warning
                    for warning in payload["warnings"]
                )

                executions = client.get("/executions")
                execution_cards = client.get("/executions/cards")
                artifacts = client.get("/artifacts")
                artifact_cards = client.get("/artifacts/cards")
                executors = client.get("/executors")
                workspaces = client.get("/workspaces")
                assert executions.status_code == 200
                assert execution_cards.status_code == 200
                assert artifacts.status_code == 200
                assert artifact_cards.status_code == 200
                assert executors.status_code == 200
                assert workspaces.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                execution_card = next(
                    execution
                    for execution in execution_cards.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                artifact = next(
                    artifact
                    for artifact in artifacts.json()["artifacts"]
                    if artifact["execution_id"] == execution["id"]
                )
                artifact_card = next(
                    artifact
                    for artifact in artifact_cards.json()["artifacts"]
                    if artifact["execution_id"] == execution["id"]
                )
                executor = next(
                    executor
                    for executor in executors.json()["executors"]
                    if executor["id"] == "executor-project-build-hybrid-mutation-gated-local"
                )
                workspace = next(
                    workspace
                    for workspace in workspaces.json()["workspaces"]
                    if workspace["id"] == f"workspace-settings-patch-{execution['id']}"
                )
                assert execution["details"]["inspection_surface"] == "settings_patch_preflight"
                assert execution["details"]["project_root_path"] == str(project_root.resolve())
                assert execution["details"]["project_manifest_relative_path"] == "project.json"
                assert execution["details"]["project_manifest_read_mode"] == "read-only"
                assert (
                    execution["details"]["project_manifest_source_of_truth"]
                    == "project_root/project.json"
                )
                assert execution["details"]["project_manifest_workspace_local"] is True
                assert execution["details"]["project_manifest_within_project_root"] is True
                assert execution["details"]["registry_path"] == "/O3DE/Settings"
                assert execution["details"]["operation_count"] == 2
                assert execution["details"]["supported_operation_count"] == 1
                assert execution["details"]["unsupported_operation_count"] == 1
                assert execution["details"]["backup_created"] is True
                assert Path(execution["details"]["backup_target"]).is_file()
                assert execution["details"]["supported_operation_paths"] == ["/version"]
                assert execution["details"]["unsupported_operation_paths"] == ["/render/quality"]
                assert (
                    execution["details"]["rollback_strategy"]
                    == "restore-project-manifest-backup"
                )
                assert execution["details"]["rollback_ready"] is True
                assert execution["details"]["patch_plan_valid"] is False
                assert execution["details"]["mutation_ready"] is False
                assert execution["details"]["mutation_blocked"] is False
                assert execution["details"]["mutation_audit"]["phase"] == "preflight"
                assert execution["details"]["mutation_audit"]["status"] == "preflight"
                assert execution["executor_id"] == executor["id"]
                assert execution["workspace_id"] == workspace["id"]
                assert execution["runner_family"] == "cli"
                assert execution["execution_attempt_state"] == "completed"
                assert execution["backup_class"] == "project-manifest-backup"
                assert execution["rollback_class"] == "project-manifest-restore"
                assert execution["retention_class"] == "operator-configured"
                assert execution_card["executor_id"] == execution["executor_id"]
                assert execution_card["workspace_id"] == execution["workspace_id"]
                assert execution_card["runner_family"] == "cli"
                assert execution_card["execution_attempt_state"] == "completed"
                assert artifact["executor_id"] == execution["executor_id"]
                assert artifact["workspace_id"] == execution["workspace_id"]
                assert artifact["artifact_role"] == "mutation-preflight-evidence"
                assert artifact["retention_class"] == "operator-configured"
                assert artifact["evidence_completeness"] == "backup-and-plan-backed"
                assert artifact_card["executor_id"] == execution["executor_id"]
                assert artifact_card["workspace_id"] == execution["workspace_id"]
                assert artifact_card["artifact_role"] == "mutation-preflight-evidence"
                assert artifact_card["retention_class"] == "operator-configured"
                assert artifact_card["evidence_completeness"] == "backup-and-plan-backed"
                assert executor["executor_kind"] == "local-admitted-mutation-gated"
                assert executor["availability_state"] == "available"
                assert executor["supported_runner_families"] == ["cli"]
                assert executor["capability_snapshot"]["admitted_tools"] == ["settings.patch"]
                assert (
                    executor["capability_snapshot"]["execution_boundary"]
                    == "mutation-gated local manifest patch with backup and rollback boundary"
                )
                assert workspace["workspace_kind"] == "admitted-mutation-gated-project-root"
                assert workspace["workspace_state"] == "ready"
                assert workspace["cleanup_policy"] == "operator-managed-backup-rollback"
                assert workspace["retention_class"] == "operator-configured"
                assert workspace["runner_family"] == "cli"
                assert workspace["owner_run_id"] == payload["operation_id"]
                assert workspace["owner_execution_id"] == execution["id"]
                assert workspace["owner_executor_id"] == executor["id"]


def test_dispatch_route_uses_real_settings_patch_mutation_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps(
                {
                    "project_name": "ApiWritableSettingsProject",
                    "version": "4.0.0",
                }
            ),
            encoding="utf-8",
        )
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-settings-mutation-1",
                        "tool": "settings.patch",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "registry_path": "/O3DE/Settings",
                            "operations": [{"op": "set", "path": "/version", "value": "4.0.1"}],
                        },
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve settings.patch mutation for test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-settings-mutation-2",
                        "tool": "settings.patch",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {
                            "registry_path": "/O3DE/Settings",
                            "operations": [{"op": "set", "path": "/version", "value": "4.0.1"}],
                        },
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"
                assert "settings were written" in payload["result"]["message"]
                persisted_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                assert persisted_manifest["version"] == "4.0.1"

                executions = client.get("/executions")
                execution_cards = client.get("/executions/cards")
                artifacts = client.get("/artifacts")
                artifact_cards = client.get("/artifacts/cards")
                executors = client.get("/executors")
                workspaces = client.get("/workspaces")
                assert executions.status_code == 200
                assert execution_cards.status_code == 200
                assert artifacts.status_code == 200
                assert artifact_cards.status_code == 200
                assert executors.status_code == 200
                assert workspaces.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                execution_card = next(
                    execution
                    for execution in execution_cards.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                artifact = next(
                    artifact
                    for artifact in artifacts.json()["artifacts"]
                    if artifact["execution_id"] == execution["id"]
                )
                artifact_card = next(
                    artifact
                    for artifact in artifact_cards.json()["artifacts"]
                    if artifact["execution_id"] == execution["id"]
                )
                executor = next(
                    executor
                    for executor in executors.json()["executors"]
                    if executor["id"] == "executor-project-build-hybrid-mutation-gated-local"
                )
                workspace = next(
                    workspace
                    for workspace in workspaces.json()["workspaces"]
                    if workspace["id"] == f"workspace-settings-patch-{execution['id']}"
                )
                assert execution["details"]["inspection_surface"] == "settings_patch_mutation"
                assert execution["details"]["project_root_path"] == str(project_root.resolve())
                assert execution["details"]["project_manifest_relative_path"] == "project.json"
                assert execution["details"]["project_manifest_read_mode"] == "read-only"
                assert (
                    execution["details"]["project_manifest_source_of_truth"]
                    == "project_root/project.json"
                )
                assert execution["details"]["project_manifest_workspace_local"] is True
                assert execution["details"]["project_manifest_within_project_root"] is True
                assert execution["details"]["mutation_applied"] is True
                assert execution["details"]["mutation_ready"] is True
                assert execution["details"]["mutation_blocked"] is False
                assert execution["details"]["post_write_verification_attempted"] is True
                assert execution["details"]["post_write_verification_succeeded"] is True
                assert execution["details"]["verified_operation_paths"] == ["/version"]
                assert execution["details"]["backup_source_path"].endswith("project.json")
                assert execution["details"]["mutation_audit"]["phase"] == "mutation"
                assert execution["details"]["mutation_audit"]["status"] == "succeeded"
                assert execution["executor_id"] == executor["id"]
                assert execution["workspace_id"] == workspace["id"]
                assert execution["runner_family"] == "cli"
                assert execution["execution_attempt_state"] == "completed"
                assert execution["backup_class"] == "project-manifest-backup"
                assert execution["rollback_class"] == "project-manifest-restore"
                assert execution["retention_class"] == "operator-configured"
                assert execution_card["executor_id"] == execution["executor_id"]
                assert execution_card["workspace_id"] == execution["workspace_id"]
                assert execution_card["runner_family"] == "cli"
                assert execution_card["execution_attempt_state"] == "completed"
                assert artifact["executor_id"] == execution["executor_id"]
                assert artifact["workspace_id"] == execution["workspace_id"]
                assert artifact["artifact_role"] == "mutation-evidence"
                assert artifact["retention_class"] == "operator-configured"
                assert artifact["evidence_completeness"] == "mutation-backed"
                assert artifact_card["executor_id"] == execution["executor_id"]
                assert artifact_card["workspace_id"] == execution["workspace_id"]
                assert artifact_card["artifact_role"] == "mutation-evidence"
                assert artifact_card["retention_class"] == "operator-configured"
                assert artifact_card["evidence_completeness"] == "mutation-backed"
                assert executor["executor_kind"] == "local-admitted-mutation-gated"
                assert executor["availability_state"] == "available"
                assert executor["supported_runner_families"] == ["cli"]
                assert executor["capability_snapshot"]["admitted_tools"] == ["settings.patch"]
                assert (
                    executor["capability_snapshot"]["execution_boundary"]
                    == "mutation-gated local manifest patch with backup and rollback boundary"
                )
                assert workspace["workspace_kind"] == "admitted-mutation-gated-project-root"
                assert workspace["workspace_state"] == "ready"
                assert workspace["cleanup_policy"] == "operator-managed-backup-rollback"
                assert workspace["retention_class"] == "operator-configured"
                assert workspace["runner_family"] == "cli"
                assert workspace["owner_run_id"] == payload["operation_id"]
                assert workspace["owner_execution_id"] == execution["id"]
                assert workspace["owner_executor_id"] == executor["id"]


def test_dispatch_route_records_settings_patch_fallback_provenance_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text("{}", encoding="utf-8")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_client() as client:
                dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-settings-fallback-1",
                        "tool": "settings.patch",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "args": {
                            "registry_path": "/O3DE/Settings",
                            "operations": [
                                {"op": "set", "path": "/version", "value": "9.9.9"},
                                {"op": "set", "path": "/render/quality", "value": "high"},
                            ],
                        },
                    },
                )
                approval_id = dispatch.json()["approval_id"]
                approval = approvals_service.get_approval(approval_id)
                assert approval is not None
                client.post(
                    f"/approvals/{approval_id}/approve",
                    json={"reason": "Approve settings.patch fallback test"},
                )
                approved_dispatch = client.post(
                    "/tools/dispatch",
                    json={
                        "request_id": "api-settings-fallback-2",
                        "tool": "settings.patch",
                        "agent": "project-build",
                        "project_root": str(project_root),
                        "engine_root": "/tmp/engine",
                        "dry_run": False,
                        "locks": [],
                        "timeout_s": 30,
                        "approval_token": approval.token,
                        "args": {
                            "registry_path": "/O3DE/Settings",
                            "operations": [
                                {"op": "set", "path": "/version", "value": "9.9.9"},
                                {"op": "set", "path": "/render/quality", "value": "high"},
                            ],
                        },
                    },
                )
                assert approved_dispatch.status_code == 200
                payload = approved_dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is True

                executions = client.get("/executions")
                assert executions.status_code == 200
                execution = next(
                    execution
                    for execution in executions.json()["executions"]
                    if execution["run_id"] == payload["operation_id"]
                )
                assert execution["details"]["real_path_available"] is False
                assert execution["details"]["fallback_category"] == "mutation-not-admitted"
                assert execution["details"]["project_root_path"] == str(project_root.resolve())
                assert (
                    execution["details"]["expected_project_manifest_path"]
                    == str(project_root.resolve() / "project.json")
                )
                assert (
                    execution["details"]["expected_project_manifest_relative_path"]
                    == "project.json"
                )
