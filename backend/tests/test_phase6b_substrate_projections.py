from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from app.main import app
from app.models.control_plane import (
    ExecutionRecord,
    ExecutionStatus,
    ExecutorRecord,
    RunRecord,
    RunStatus,
    WorkspaceRecord,
)
from app.repositories.control_plane import control_plane_repository
from app.services.db import configure_database, initialize_database, reset_database
from fastapi.testclient import TestClient


@contextmanager
def isolated_client() -> Iterator[TestClient]:
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


def test_phase6b_status_routes_project_substrate_truth_without_admission() -> None:
    created_at = datetime(2026, 4, 25, 15, 0, tzinfo=timezone.utc)
    activated_at = datetime(2026, 4, 25, 15, 5, tzinfo=timezone.utc)
    heartbeat_at = datetime(2026, 4, 25, 15, 10, tzinfo=timezone.utc)

    with isolated_client() as client:
        executor = control_plane_repository.create_executor(
            ExecutorRecord(
                id="executor-phase6b-local",
                executor_kind="local-docker",
                executor_label="Phase 6B Local Executor",
                executor_host_label="docker-desktop",
                execution_mode_class="hybrid",
                availability_state="available",
                supported_runner_families=["cli", "asset-pipeline"],
                capability_snapshot={"admitted_tools": ["settings.patch"]},
                last_heartbeat_at=heartbeat_at,
                created_at=created_at,
                updated_at=heartbeat_at,
            )
        )
        run = control_plane_repository.create_run(
            RunRecord(
                id="run-phase6b-active",
                request_id="request-phase6b-active",
                agent="project-build",
                tool="settings.patch",
                status=RunStatus.RUNNING,
                created_at=created_at,
                updated_at=activated_at,
                execution_mode="hybrid",
            )
        )
        execution = control_plane_repository.create_execution(
            ExecutionRecord(
                id="execution-phase6b-active",
                run_id=run.id,
                request_id=run.request_id,
                agent=run.agent,
                tool=run.tool,
                execution_mode="real",
                status=ExecutionStatus.RUNNING,
                started_at=activated_at,
                executor_id=executor.id,
                workspace_id="workspace-phase6b-active",
                runner_family="cli",
                execution_attempt_state="executing",
            )
        )
        control_plane_repository.create_workspace(
            WorkspaceRecord(
                id="workspace-phase6b-active",
                workspace_kind="ephemeral",
                workspace_root="C:/tmp/o3de/workspace-phase6b-active",
                workspace_state="executing",
                cleanup_policy="operator-managed-backup-rollback",
                retention_class="operator-configured",
                engine_binding={"engine_root": "C:/o3de"},
                project_binding={"project_root": "C:/project"},
                runner_family="cli",
                owner_run_id=run.id,
                owner_execution_id=execution.id,
                owner_executor_id=executor.id,
                created_at=created_at,
                activated_at=activated_at,
            )
        )
        control_plane_repository.create_workspace(
            WorkspaceRecord(
                id="workspace-phase6b-cleaned",
                workspace_kind="ephemeral",
                workspace_root="C:/tmp/o3de/workspace-phase6b-cleaned",
                workspace_state="cleaned",
                cleanup_policy="delete-on-complete",
                retention_class="ephemeral",
                engine_binding={"engine_root": "C:/o3de"},
                project_binding={"project_root": "C:/project"},
                runner_family="cli",
                owner_executor_id=executor.id,
                created_at=created_at,
                cleaned_at=heartbeat_at,
            )
        )

        root_payload = client.get("/").json()
        assert "/executors/status" in root_payload["routes"]
        assert "/workspaces/status" in root_payload["routes"]

        executor_response = client.get("/executors/status")
        assert executor_response.status_code == 200
        executor_payload = executor_response.json()["executors"][0]
        assert executor_payload["executor_id"] == executor.id
        assert executor_payload["executor_label"] == "Phase 6B Local Executor"
        assert executor_payload["supported_runner_families"] == [
            "cli",
            "asset-pipeline",
        ]
        assert executor_payload["availability_state"] == "available"
        assert executor_payload["last_heartbeat_at"] == heartbeat_at.isoformat()
        assert executor_payload["active_workspace_count"] == 1
        assert executor_payload["active_run_count"] == 1
        assert "does not admit or prove" in executor_payload["truth_note"]

        workspace_response = client.get("/workspaces/status")
        assert workspace_response.status_code == 200
        workspaces = workspace_response.json()["workspaces"]
        workspace_payload = next(
            workspace
            for workspace in workspaces
            if workspace["workspace_id"] == "workspace-phase6b-active"
        )
        assert workspace_payload["workspace_kind"] == "ephemeral"
        assert workspace_payload["workspace_state"] == "executing"
        assert workspace_payload["engine_binding_label"] == "C:/o3de"
        assert workspace_payload["project_binding_label"] == "C:/project"
        assert workspace_payload["runner_family"] == "cli"
        assert workspace_payload["owner_run_id"] == run.id
        assert workspace_payload["owner_execution_id"] == execution.id
        assert workspace_payload["owner_executor_id"] == executor.id
        assert workspace_payload["created_at"] == created_at.isoformat()
        assert workspace_payload["updated_at"] == activated_at.isoformat()
        assert workspace_payload["cleanup_policy"] == "operator-managed-backup-rollback"
        assert workspace_payload["retention_label"] == "retained-for-rollback"
        assert "must be confirmed separately" in workspace_payload["truth_note"]
