from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from app.main import app
from app.models.control_plane import (
    ArtifactRecord,
    EventRecord,
    EventSeverity,
    ExecutionRecord,
    ExecutionStatus,
    ExecutorRecord,
    RunRecord,
    RunStatus,
    WorkspaceRecord,
)
from app.repositories.control_plane import control_plane_repository
from app.services.db import configure_database, initialize_database, reset_database


def parse_api_timestamp(value: str | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


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


def test_phase6b_cards_and_summary_surface_nullable_substrate_fields() -> None:
    created_at = datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc)
    with isolated_client() as client:
        control_plane_repository.create_run(
            RunRecord(
                id="run-phase6b-a",
                request_id="request-phase6b-a",
                agent="project-build",
                tool="build.configure",
                status=RunStatus.SUCCEEDED,
                created_at=created_at,
                updated_at=created_at,
            )
        )
        control_plane_repository.create_executor(
            ExecutorRecord(
                id="executor-a",
                executor_kind="container-backed",
                executor_label="Executor A",
                executor_host_label="docker-local",
                execution_mode_class="simulated",
                availability_state="available",
                supported_runner_families=["cli"],
                capability_snapshot={"docker": True},
                created_at=created_at,
                updated_at=created_at,
            )
        )
        control_plane_repository.create_workspace(
            WorkspaceRecord(
                id="workspace-a",
                workspace_kind="ephemeral-local",
                workspace_root="/tmp/workspace-a",
                workspace_state="ready",
                cleanup_policy="cleanup-after-run",
                retention_class="ephemeral-success",
                engine_binding={"engine_root": "/tmp/engine"},
                project_binding={"project_root": "/tmp/project"},
                runner_family="cli",
                owner_run_id="run-phase6b-a",
                owner_execution_id="exe-phase6b-a",
                owner_executor_id="executor-a",
                created_at=created_at,
                activated_at=created_at,
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-phase6b-a",
                run_id="run-phase6b-a",
                request_id="request-phase6b-a",
                agent="project-build",
                tool="build.configure",
                execution_mode="simulated",
                status=ExecutionStatus.SUCCEEDED,
                started_at=created_at,
                finished_at=created_at,
                executor_id="executor-a",
                workspace_id="workspace-a",
                runner_family="cli",
                execution_attempt_state="completed",
                failure_category=None,
                backup_class="project-manifest-backup",
                rollback_class="project-manifest-restore",
                retention_class="operator-configured",
                details={
                    "inspection_surface": "simulated",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-phase6b-a",
                run_id="run-phase6b-a",
                execution_id="exe-phase6b-a",
                label="summary",
                kind="summary",
                uri="memory://art-phase6b-a",
                simulated=True,
                created_at=created_at,
                artifact_role="summary",
                executor_id="executor-a",
                workspace_id="workspace-a",
                retention_class="ephemeral-success",
                evidence_completeness="summary-only",
                metadata={"execution_mode": "simulated"},
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-phase6b-a",
                run_id="run-phase6b-a",
                execution_id="exe-phase6b-a",
                executor_id="executor-a",
                workspace_id="workspace-a",
                category="execution",
                severity=EventSeverity.INFO,
                message="Execution finished.",
                created_at=created_at,
                event_type="runner.completed",
                current_state="completed",
            )
        )

        run_cards = client.get("/runs/cards")
        assert run_cards.status_code == 200
        run_card = run_cards.json()["runs"][0]
        assert run_card["executor_id"] == "executor-a"
        assert run_card["workspace_id"] == "workspace-a"
        assert run_card["workspace_state"] == "ready"
        assert run_card["runner_family"] == "cli"
        assert run_card["execution_attempt_state"] == "completed"
        assert run_card["backup_class"] == "project-manifest-backup"
        assert run_card["rollback_class"] == "project-manifest-restore"
        assert run_card["retention_class"] == "operator-configured"

        execution_cards = client.get("/executions/cards")
        assert execution_cards.status_code == 200
        execution_card = execution_cards.json()["executions"][0]
        assert execution_card["executor_id"] == "executor-a"
        assert execution_card["workspace_id"] == "workspace-a"
        assert execution_card["runner_family"] == "cli"
        assert execution_card["execution_attempt_state"] == "completed"
        assert execution_card["failure_category"] is None
        assert execution_card["backup_class"] == "project-manifest-backup"
        assert execution_card["rollback_class"] == "project-manifest-restore"
        assert execution_card["retention_class"] == "operator-configured"

        artifact_cards = client.get("/artifacts/cards")
        assert artifact_cards.status_code == 200
        artifact_card = artifact_cards.json()["artifacts"][0]
        assert artifact_card["artifact_role"] == "summary"
        assert artifact_card["executor_id"] == "executor-a"
        assert artifact_card["workspace_id"] == "workspace-a"
        assert artifact_card["retention_class"] == "ephemeral-success"
        assert artifact_card["evidence_completeness"] == "summary-only"

        summary = client.get("/summary")
        assert summary.status_code == 200
        payload = summary.json()
        assert payload["executors_total"] == 1
        assert payload["executors_by_availability_state"] == {"available": 1}
        assert payload["workspaces_total"] == 1
        assert payload["workspaces_by_state"] == {"ready": 1}
        assert payload["executions_by_attempt_state"] == {"completed": 1}
        assert payload["executions_by_failure_category"] == {}
        assert payload["executions_by_backup_class"] == {"project-manifest-backup": 1}
        assert payload["executions_by_rollback_class"] == {"project-manifest-restore": 1}
        assert payload["executions_by_retention_class"] == {"operator-configured": 1}


def test_phase6b_cards_keep_legacy_rows_backward_compatible() -> None:
    created_at = datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc)
    with isolated_client() as client:
        control_plane_repository.create_run(
            RunRecord(
                id="run-phase6b-legacy",
                request_id="request-phase6b-legacy",
                agent="project-build",
                tool="project.inspect",
                status=RunStatus.SUCCEEDED,
                created_at=created_at,
                updated_at=created_at,
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-phase6b-legacy",
                run_id="run-phase6b-legacy",
                request_id="request-phase6b-legacy",
                agent="project-build",
                tool="project.inspect",
                execution_mode="simulated",
                status=ExecutionStatus.SUCCEEDED,
                started_at=created_at,
                details={"inspection_surface": "simulated"},
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-phase6b-legacy",
                run_id="run-phase6b-legacy",
                execution_id="exe-phase6b-legacy",
                label="legacy-summary",
                kind="summary",
                uri="memory://art-phase6b-legacy",
                simulated=True,
                created_at=created_at,
                metadata={"execution_mode": "simulated"},
            )
        )

        run_card = client.get("/runs/cards").json()["runs"][0]
        assert run_card["executor_id"] is None
        assert run_card["workspace_id"] is None
        assert run_card["workspace_state"] is None
        assert run_card["runner_family"] is None
        assert run_card["execution_attempt_state"] is None
        assert run_card["backup_class"] is None
        assert run_card["rollback_class"] is None
        assert run_card["retention_class"] is None

        execution_card = client.get("/executions/cards").json()["executions"][0]
        assert execution_card["executor_id"] is None
        assert execution_card["workspace_id"] is None
        assert execution_card["runner_family"] is None
        assert execution_card["execution_attempt_state"] is None
        assert execution_card["failure_category"] is None
        assert execution_card["backup_class"] is None
        assert execution_card["rollback_class"] is None
        assert execution_card["retention_class"] is None

        artifact_card = client.get("/artifacts/cards").json()["artifacts"][0]
        assert artifact_card["artifact_role"] is None
        assert artifact_card["executor_id"] is None
        assert artifact_card["workspace_id"] is None
        assert artifact_card["retention_class"] is None
        assert artifact_card["evidence_completeness"] is None


def test_phase6b_executor_routes_preserve_order_and_lifecycle_fields() -> None:
    older = datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc)
    newer = datetime(2026, 4, 20, 13, 0, tzinfo=timezone.utc)
    with isolated_client() as client:
        control_plane_repository.create_executor(
            ExecutorRecord(
                id="executor-older",
                executor_kind="container-backed",
                executor_label="Executor Older",
                executor_host_label="docker-a",
                execution_mode_class="simulated",
                availability_state="degraded",
                supported_runner_families=["cli"],
                capability_snapshot={"docker": True, "family": "cli"},
                last_heartbeat_at=older,
                last_failure_summary="Previous heartbeat gap.",
                created_at=older,
                updated_at=older,
            )
        )
        control_plane_repository.create_executor(
            ExecutorRecord(
                id="executor-newer",
                executor_kind="container-backed",
                executor_label="Executor Newer",
                executor_host_label="docker-b",
                execution_mode_class="hybrid",
                availability_state="available",
                supported_runner_families=["cli", "editor-control"],
                capability_snapshot={"docker": True, "admitted": ["project.inspect"]},
                last_heartbeat_at=newer,
                last_failure_summary=None,
                created_at=older,
                updated_at=newer,
            )
        )

        list_response = client.get("/executors")
        assert list_response.status_code == 200
        payload = list_response.json()["executors"]
        assert [entry["id"] for entry in payload] == ["executor-newer", "executor-older"]
        assert parse_api_timestamp(payload[0]["last_heartbeat_at"]) == newer
        assert payload[1]["last_failure_summary"] == "Previous heartbeat gap."
        assert payload[0]["supported_runner_families"] == ["cli", "editor-control"]
        assert payload[0]["capability_snapshot"]["admitted"] == ["project.inspect"]

        detail_response = client.get("/executors/executor-newer")
        assert detail_response.status_code == 200
        detail_payload = detail_response.json()
        assert detail_payload["executor_host_label"] == "docker-b"
        assert detail_payload["execution_mode_class"] == "hybrid"
        assert detail_payload["availability_state"] == "available"
        assert detail_payload["capability_snapshot"]["docker"] is True


def test_phase6b_workspace_routes_preserve_order_lineage_and_lifecycle_fields() -> None:
    older = datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc)
    newer = datetime(2026, 4, 20, 13, 0, tzinfo=timezone.utc)
    with isolated_client() as client:
        control_plane_repository.create_workspace(
            WorkspaceRecord(
                id="workspace-older",
                workspace_kind="ephemeral-local",
                workspace_root="/tmp/workspace-older",
                workspace_state="cleaning",
                cleanup_policy="cleanup-after-run",
                retention_class="ephemeral-failure",
                engine_binding={"engine_root": "/tmp/engine-a"},
                project_binding={"project_root": "/tmp/project-a"},
                runner_family="cli",
                owner_run_id="run-older",
                owner_execution_id="exe-older",
                owner_executor_id="executor-older",
                created_at=older,
                activated_at=older,
                completed_at=newer,
                cleaned_at=None,
                last_failure_summary="Cleanup retry pending.",
            )
        )
        control_plane_repository.create_workspace(
            WorkspaceRecord(
                id="workspace-newer",
                workspace_kind="ephemeral-local",
                workspace_root="/tmp/workspace-newer",
                workspace_state="ready",
                cleanup_policy="delete-on-complete",
                retention_class="ephemeral-success",
                engine_binding={"engine_root": "/tmp/engine-b"},
                project_binding={"project_root": "/tmp/project-b"},
                runner_family="editor-control",
                owner_run_id="run-newer",
                owner_execution_id="exe-newer",
                owner_executor_id="executor-newer",
                created_at=newer,
                activated_at=newer,
                completed_at=None,
                cleaned_at=None,
                last_failure_summary=None,
            )
        )

        list_response = client.get("/workspaces")
        assert list_response.status_code == 200
        payload = list_response.json()["workspaces"]
        assert [entry["id"] for entry in payload] == ["workspace-newer", "workspace-older"]
        assert payload[0]["runner_family"] == "editor-control"
        assert payload[0]["owner_executor_id"] == "executor-newer"
        assert payload[1]["last_failure_summary"] == "Cleanup retry pending."
        assert parse_api_timestamp(payload[1]["completed_at"]) == newer

        detail_response = client.get("/workspaces/workspace-older")
        assert detail_response.status_code == 200
        detail_payload = detail_response.json()
        assert detail_payload["workspace_root"] == "/tmp/workspace-older"
        assert detail_payload["workspace_state"] == "cleaning"
        assert detail_payload["owner_run_id"] == "run-older"
        assert detail_payload["owner_execution_id"] == "exe-older"
        assert detail_payload["owner_executor_id"] == "executor-older"
        assert detail_payload["engine_binding"]["engine_root"] == "/tmp/engine-a"
        assert detail_payload["project_binding"]["project_root"] == "/tmp/project-a"


def test_phase6b_executor_and_workspace_detail_routes_return_404_for_missing_records() -> None:
    with isolated_client() as client:
        missing_executor = client.get("/executors/missing-executor")
        assert missing_executor.status_code == 404
        assert missing_executor.json()["detail"] == "Executor 'missing-executor' was not found."

        missing_workspace = client.get("/workspaces/missing-workspace")
        assert missing_workspace.status_code == 404
        assert missing_workspace.json()["detail"] == "Workspace 'missing-workspace' was not found."


def test_phase6b_cross_record_lineage_stays_consistent_across_cards_and_summary() -> None:
    base = datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc)
    later = datetime(2026, 4, 20, 13, 0, tzinfo=timezone.utc)
    with isolated_client() as client:
        control_plane_repository.create_executor(
            ExecutorRecord(
                id="executor-alpha",
                executor_kind="container-backed",
                executor_label="Executor Alpha",
                executor_host_label="docker-alpha",
                execution_mode_class="hybrid",
                availability_state="available",
                supported_runner_families=["cli"],
                capability_snapshot={"docker": True},
                created_at=base,
                updated_at=base,
            )
        )
        control_plane_repository.create_executor(
            ExecutorRecord(
                id="executor-beta",
                executor_kind="container-backed",
                executor_label="Executor Beta",
                executor_host_label="docker-beta",
                execution_mode_class="simulated",
                availability_state="degraded",
                supported_runner_families=["editor-control"],
                capability_snapshot={"docker": True},
                created_at=base,
                updated_at=later,
            )
        )
        control_plane_repository.create_workspace(
            WorkspaceRecord(
                id="workspace-alpha",
                workspace_kind="ephemeral-local",
                workspace_root="/tmp/workspace-alpha",
                workspace_state="ready",
                cleanup_policy="delete-on-complete",
                retention_class="ephemeral-success",
                engine_binding={"engine_root": "/tmp/engine-alpha"},
                project_binding={"project_root": "/tmp/project-alpha"},
                runner_family="cli",
                owner_run_id="run-alpha",
                owner_execution_id="exe-alpha-new",
                owner_executor_id="executor-alpha",
                created_at=base,
                activated_at=base,
            )
        )
        control_plane_repository.create_workspace(
            WorkspaceRecord(
                id="workspace-beta",
                workspace_kind="ephemeral-local",
                workspace_root="/tmp/workspace-beta",
                workspace_state="failed",
                cleanup_policy="cleanup-after-run",
                retention_class="ephemeral-failure",
                engine_binding={"engine_root": "/tmp/engine-beta"},
                project_binding={"project_root": "/tmp/project-beta"},
                runner_family="editor-control",
                owner_run_id="run-beta",
                owner_execution_id="exe-beta",
                owner_executor_id="executor-beta",
                created_at=later,
                activated_at=later,
                last_failure_summary="Workspace bootstrap failed.",
            )
        )
        control_plane_repository.create_run(
            RunRecord(
                id="run-alpha",
                request_id="request-alpha",
                agent="project-build",
                tool="build.configure",
                status=RunStatus.RUNNING,
                created_at=base,
                updated_at=later,
            )
        )
        control_plane_repository.create_run(
            RunRecord(
                id="run-beta",
                request_id="request-beta",
                agent="editor-control",
                tool="editor.session.open",
                status=RunStatus.FAILED,
                created_at=later,
                updated_at=later,
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-alpha-old",
                run_id="run-alpha",
                request_id="request-alpha",
                agent="project-build",
                tool="build.configure",
                execution_mode="simulated",
                status=ExecutionStatus.PENDING,
                started_at=base,
                executor_id="executor-beta",
                workspace_id="workspace-beta",
                runner_family="editor-control",
                execution_attempt_state="queued",
                failure_category=None,
                details={"inspection_surface": "simulated"},
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-alpha-new",
                run_id="run-alpha",
                request_id="request-alpha",
                agent="project-build",
                tool="build.configure",
                execution_mode="real",
                status=ExecutionStatus.RUNNING,
                started_at=later,
                executor_id="executor-alpha",
                workspace_id="workspace-alpha",
                runner_family="cli",
                execution_attempt_state="active",
                failure_category=None,
                details={
                    "inspection_surface": "settings_patch_preflight",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-beta",
                run_id="run-beta",
                request_id="request-beta",
                agent="editor-control",
                tool="editor.session.open",
                execution_mode="simulated",
                status=ExecutionStatus.FAILED,
                started_at=later,
                finished_at=later,
                executor_id="executor-beta",
                workspace_id="workspace-beta",
                runner_family="editor-control",
                execution_attempt_state="failed",
                failure_category="workspace-bootstrap",
                details={
                    "inspection_surface": "simulated",
                    "fallback_category": "workspace-bootstrap",
                },
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-alpha",
                run_id="run-alpha",
                execution_id="exe-alpha-new",
                label="Alpha summary",
                kind="summary",
                uri="memory://art-alpha",
                simulated=False,
                created_at=later,
                artifact_role="summary",
                executor_id="executor-alpha",
                workspace_id="workspace-alpha",
                retention_class="ephemeral-success",
                evidence_completeness="summary-only",
                metadata={
                    "execution_mode": "real",
                    "inspection_surface": "settings_patch_preflight",
                    "project_manifest_source_of_truth": "project_root/project.json",
                },
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-beta",
                run_id="run-beta",
                execution_id="exe-beta",
                label="Beta summary",
                kind="summary",
                uri="memory://art-beta",
                simulated=True,
                created_at=later,
                artifact_role="summary",
                executor_id="executor-beta",
                workspace_id="workspace-beta",
                retention_class="ephemeral-failure",
                evidence_completeness="summary-only",
                metadata={
                    "execution_mode": "simulated",
                    "fallback_category": "workspace-bootstrap",
                },
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-alpha",
                run_id="run-alpha",
                execution_id="exe-alpha-new",
                executor_id="executor-alpha",
                workspace_id="workspace-alpha",
                category="execution",
                severity=EventSeverity.INFO,
                message="Executor alpha is running.",
                created_at=later,
                event_type="runner.progress",
                current_state="running",
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="evt-beta",
                run_id="run-beta",
                execution_id="exe-beta",
                executor_id="executor-beta",
                workspace_id="workspace-beta",
                category="execution",
                severity=EventSeverity.ERROR,
                message="Workspace bootstrap failed.",
                created_at=later,
                event_type="workspace-transition",
                previous_state="preparing",
                current_state="failed",
                failure_category="workspace-bootstrap",
            )
        )

        run_cards = client.get("/runs/cards")
        execution_cards = client.get("/executions/cards")
        artifact_cards = client.get("/artifacts/cards")
        event_cards = client.get("/events/cards")
        summary = client.get("/summary")
        executors = client.get("/executors")
        workspaces = client.get("/workspaces")

        assert run_cards.status_code == 200
        assert execution_cards.status_code == 200
        assert artifact_cards.status_code == 200
        assert event_cards.status_code == 200
        assert summary.status_code == 200
        assert executors.status_code == 200
        assert workspaces.status_code == 200

        run_cards_by_id = {
            item["id"]: item for item in run_cards.json()["runs"]
        }
        execution_cards_by_id = {
            item["id"]: item for item in execution_cards.json()["executions"]
        }
        artifact_cards_by_id = {
            item["id"]: item for item in artifact_cards.json()["artifacts"]
        }
        event_cards_by_id = {
            item["id"]: item for item in event_cards.json()["events"]
        }
        executors_by_id = {
            item["id"]: item for item in executors.json()["executors"]
        }
        workspaces_by_id = {
            item["id"]: item for item in workspaces.json()["workspaces"]
        }
        summary_payload = summary.json()

        assert run_cards_by_id["run-alpha"]["executor_id"] == "executor-alpha"
        assert run_cards_by_id["run-alpha"]["workspace_id"] == "workspace-alpha"
        assert run_cards_by_id["run-alpha"]["workspace_state"] == "ready"
        assert run_cards_by_id["run-alpha"]["runner_family"] == "cli"
        assert run_cards_by_id["run-alpha"]["execution_attempt_state"] == "active"

        assert run_cards_by_id["run-beta"]["executor_id"] == "executor-beta"
        assert run_cards_by_id["run-beta"]["workspace_id"] == "workspace-beta"
        assert run_cards_by_id["run-beta"]["workspace_state"] == "failed"
        assert run_cards_by_id["run-beta"]["runner_family"] == "editor-control"
        assert run_cards_by_id["run-beta"]["execution_attempt_state"] == "failed"

        assert execution_cards_by_id["exe-alpha-new"]["executor_id"] == run_cards_by_id["run-alpha"]["executor_id"]
        assert execution_cards_by_id["exe-alpha-new"]["workspace_id"] == run_cards_by_id["run-alpha"]["workspace_id"]
        assert execution_cards_by_id["exe-beta"]["failure_category"] == "workspace-bootstrap"
        assert execution_cards_by_id["exe-beta"]["workspace_id"] == "workspace-beta"

        assert artifact_cards_by_id["art-alpha"]["executor_id"] == execution_cards_by_id["exe-alpha-new"]["executor_id"]
        assert artifact_cards_by_id["art-alpha"]["workspace_id"] == execution_cards_by_id["exe-alpha-new"]["workspace_id"]
        assert artifact_cards_by_id["art-beta"]["executor_id"] == execution_cards_by_id["exe-beta"]["executor_id"]
        assert artifact_cards_by_id["art-beta"]["workspace_id"] == execution_cards_by_id["exe-beta"]["workspace_id"]

        assert event_cards_by_id["evt-alpha"]["executor_id"] == run_cards_by_id["run-alpha"]["executor_id"]
        assert event_cards_by_id["evt-alpha"]["workspace_id"] == run_cards_by_id["run-alpha"]["workspace_id"]
        assert event_cards_by_id["evt-beta"]["failure_category"] == execution_cards_by_id["exe-beta"]["failure_category"]
        assert event_cards_by_id["evt-beta"]["executor_id"] == artifact_cards_by_id["art-beta"]["executor_id"]
        assert event_cards_by_id["evt-beta"]["workspace_id"] == artifact_cards_by_id["art-beta"]["workspace_id"]

        assert executors_by_id["executor-alpha"]["availability_state"] == "available"
        assert executors_by_id["executor-beta"]["availability_state"] == "degraded"
        assert workspaces_by_id["workspace-alpha"]["owner_executor_id"] == "executor-alpha"
        assert workspaces_by_id["workspace-beta"]["owner_execution_id"] == "exe-beta"

        assert summary_payload["executors_total"] == 2
        assert summary_payload["executors_by_availability_state"] == {
            "available": 1,
            "degraded": 1,
        }
        assert summary_payload["workspaces_total"] == 2
        assert summary_payload["workspaces_by_state"] == {
            "failed": 1,
            "ready": 1,
        }
        assert summary_payload["executions_by_attempt_state"] == {
            "active": 1,
            "failed": 1,
            "queued": 1,
        }
        assert summary_payload["executions_by_failure_category"] == {
            "workspace-bootstrap": 1,
        }
