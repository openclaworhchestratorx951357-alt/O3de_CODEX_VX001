from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from app.main import app
from app.models.control_plane import (
    ArtifactRecord,
    EventRecord,
    EventSeverity,
    ExecutionRecord,
    ExecutionStatus,
    RunRecord,
    RunStatus,
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


def test_lifecycle_event_projection_exposes_contract_payload_shape() -> None:
    created_at = datetime(2026, 4, 25, 17, 0, tzinfo=timezone.utc)

    with isolated_client() as client:
        control_plane_repository.create_run(
            RunRecord(
                id="run-lifecycle",
                request_id="request-lifecycle",
                agent="project-build",
                tool="build.compile",
                status=RunStatus.SUCCEEDED,
                created_at=created_at,
                updated_at=created_at,
                execution_mode="real",
            )
        )
        control_plane_repository.create_execution(
            ExecutionRecord(
                id="execution-lifecycle",
                run_id="run-lifecycle",
                request_id="request-lifecycle",
                agent="project-build",
                tool="build.compile",
                execution_mode="real",
                status=ExecutionStatus.SUCCEEDED,
                started_at=created_at,
                finished_at=created_at,
                executor_id="executor-lifecycle",
                workspace_id="workspace-lifecycle",
                runner_family="cli",
                execution_attempt_state="completed",
            )
        )
        control_plane_repository.create_artifact(
            ArtifactRecord(
                id="artifact-lifecycle-log",
                run_id="run-lifecycle",
                execution_id="execution-lifecycle",
                label="Runner log",
                kind="execution_log",
                uri="file://runner.log",
                content_type="text/plain",
                simulated=False,
                created_at=created_at,
                artifact_role="execution-log",
                executor_id="executor-lifecycle",
                workspace_id="workspace-lifecycle",
                retention_class="operator-configured",
                evidence_completeness="runner-backed",
            )
        )
        control_plane_repository.create_event(
            EventRecord(
                id="event-lifecycle",
                run_id="run-lifecycle",
                execution_id="execution-lifecycle",
                executor_id="executor-lifecycle",
                workspace_id="workspace-lifecycle",
                category="execution",
                event_type="runner.completed",
                severity=EventSeverity.INFO,
                message="Runner completed with retained log evidence.",
                created_at=created_at,
                previous_state="running",
                current_state="completed",
                details={
                    "execution_mode_class": "hybrid",
                    "summary": "Runner completed and log evidence was retained.",
                },
            )
        )

        root_payload = client.get("/").json()
        assert "/events/lifecycle" in root_payload["routes"]

        response = client.get("/events/lifecycle")
        assert response.status_code == 200
        payload = response.json()["events"][0]
        assert payload["event_id"] == "event-lifecycle"
        assert payload["event_type"] == "runner.completed"
        assert payload["event_timestamp"] == created_at.isoformat()
        assert payload["run_id"] == "run-lifecycle"
        assert payload["execution_id"] == "execution-lifecycle"
        assert payload["executor_id"] == "executor-lifecycle"
        assert payload["workspace_id"] == "workspace-lifecycle"
        assert payload["tool_name"] == "build.compile"
        assert payload["runner_family"] == "cli"
        assert payload["execution_mode_class"] == "hybrid"
        assert payload["previous_state"] == "running"
        assert payload["current_state"] == "completed"
        assert payload["failure_category"] is None
        assert payload["summary"] == "Runner completed and log evidence was retained."
        assert payload["artifact_refs"] == [
            {
                "artifact_id": "artifact-lifecycle-log",
                "artifact_role": "execution-log",
                "kind": "execution_log",
                "uri": "file://runner.log",
                "evidence_completeness": "runner-backed",
            }
        ]
        assert "do not provision, execute, mutate, or admit" in payload["truth_note"]
