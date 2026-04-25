from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from app.main import app
from app.models.control_plane import (
    ApprovalRecord,
    ApprovalStatus,
    ArtifactRecord,
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


def test_run_substrate_summary_links_control_and_evidence_truth() -> None:
    created_at = datetime(2026, 4, 25, 16, 0, tzinfo=timezone.utc)
    finished_at = datetime(2026, 4, 25, 16, 5, tzinfo=timezone.utc)

    with isolated_client() as client:
        control_plane_repository.create_run(
            RunRecord(
                id="run-substrate",
                request_id="request-substrate",
                agent="project-build",
                tool="settings.patch",
                status=RunStatus.SUCCEEDED,
                created_at=created_at,
                updated_at=finished_at,
                dry_run=False,
                approval_id="approval-run-substrate",
                requested_locks=["project:C:/project"],
                granted_locks=["project:C:/project"],
                execution_mode="real",
                result_summary="Run completed with persisted evidence.",
            )
        )
        control_plane_repository.create_approval(
            ApprovalRecord(
                id="approval-run-substrate",
                run_id="run-substrate",
                request_id="request-substrate",
                agent="project-build",
                tool="settings.patch",
                approval_class="config_write",
                status=ApprovalStatus.APPROVED,
                token="approval-token-substrate",
                created_at=created_at,
                decided_at=finished_at,
            )
        )
        control_plane_repository.create_executor(
            ExecutorRecord(
                id="executor-substrate",
                executor_kind="local-admitted-mutation-gated",
                executor_label="Local Mutation Executor",
                executor_host_label="windows-local",
                execution_mode_class="hybrid",
                availability_state="available",
                supported_runner_families=["cli"],
                capability_snapshot={"admitted_tools": ["settings.patch"]},
                created_at=created_at,
                updated_at=finished_at,
            )
        )
        control_plane_repository.create_workspace(
            WorkspaceRecord(
                id="workspace-substrate",
                workspace_kind="admitted-mutation-gated-project-root",
                workspace_root="C:/project",
                workspace_state="ready",
                cleanup_policy="operator-managed-backup-rollback",
                retention_class="operator-configured",
                engine_binding={"engine_root": "C:/o3de"},
                project_binding={"project_root": "C:/project"},
                runner_family="cli",
                owner_run_id="run-substrate",
                owner_execution_id="execution-substrate",
                owner_executor_id="executor-substrate",
                created_at=created_at,
                activated_at=created_at,
                completed_at=finished_at,
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="execution-substrate",
                run_id="run-substrate",
                request_id="request-substrate",
                agent="project-build",
                tool="settings.patch",
                execution_mode="real",
                status=ExecutionStatus.SUCCEEDED,
                started_at=created_at,
                finished_at=finished_at,
                artifact_ids=["artifact-substrate-summary", "artifact-substrate-log"],
                executor_id="executor-substrate",
                workspace_id="workspace-substrate",
                runner_family="cli",
                execution_attempt_state="completed",
                backup_class="project-manifest-backup",
                rollback_class="project-manifest-restore",
                retention_class="operator-configured",
                details={
                    "backup_created": True,
                    "rollback_ready": True,
                    "post_write_verification_attempted": True,
                    "post_write_verification_succeeded": True,
                },
                result_summary="Settings patch completed and verified.",
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="artifact-substrate-log",
                run_id="run-substrate",
                execution_id="execution-substrate",
                label="Execution log",
                kind="execution_log",
                uri="file://execution.log",
                content_type="text/plain",
                simulated=False,
                created_at=finished_at,
                artifact_role="execution-log",
                executor_id="executor-substrate",
                workspace_id="workspace-substrate",
                retention_class="operator-configured",
                evidence_completeness="runner-backed",
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="artifact-substrate-summary",
                run_id="run-substrate",
                execution_id="execution-substrate",
                label="Summary evidence",
                kind="summary",
                uri="memory://summary",
                simulated=False,
                created_at=finished_at,
                artifact_role="summary",
                executor_id="executor-substrate",
                workspace_id="workspace-substrate",
                retention_class="operator-configured",
                evidence_completeness="mutation-backed",
            )
        )
        control_plane_repository.create_run(
            RunRecord(
                id="run-no-execution",
                request_id="request-no-execution",
                agent="project-build",
                tool="project.inspect",
                status=RunStatus.PENDING,
                created_at=finished_at,
                updated_at=finished_at,
                execution_mode="simulated",
            )
        )

        root_payload = client.get("/").json()
        assert "/runs/substrate-summary" in root_payload["routes"]

        response = client.get("/runs/substrate-summary")
        assert response.status_code == 200
        summaries = {
            summary["run_id"]: summary for summary in response.json()["runs"]
        }
        summary = summaries["run-substrate"]
        assert summary["tool_name"] == "settings.patch"
        assert summary["execution_id"] == "execution-substrate"
        assert summary["run_status"] == "succeeded"
        assert summary["execution_mode_class"] == "hybrid"
        assert summary["runner_family"] == "cli"
        assert summary["executor_id"] == "executor-substrate"
        assert summary["executor_label"] == "Local Mutation Executor"
        assert summary["workspace_id"] == "workspace-substrate"
        assert summary["workspace_state"] == "ready"
        assert summary["execution_attempt_state"] == "completed"
        assert summary["approval_state_label"] == "approved"
        assert summary["lock_state_label"] == "granted"
        assert summary["backup_state_label"] == "backup-created"
        assert summary["rollback_state_label"] == "rollback-ready"
        assert summary["verification_state_label"] == "verified"
        assert summary["primary_log_artifact_id"] == "artifact-substrate-log"
        assert summary["summary_artifact_id"] == "artifact-substrate-summary"
        assert summary["final_status_reason"] == "Settings patch completed and verified."
        assert "does not admit or prove" in summary["truth_note"]

        missing_substrate = summaries["run-no-execution"]
        assert missing_substrate["execution_id"] is None
        assert missing_substrate["execution_mode_class"] == "simulated"
        assert missing_substrate["approval_state_label"] == "not-attached"
        assert missing_substrate["lock_state_label"] == "not-requested"
        assert missing_substrate["backup_state_label"] == "not-recorded"
        assert missing_substrate["summary_artifact_id"] is None
