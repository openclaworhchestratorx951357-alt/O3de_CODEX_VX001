from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory

from app.main import app
from app.services.db import configure_database, initialize_database, reset_database
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


def test_autonomy_routes_persist_and_list_records() -> None:
    with isolated_client() as client:
        objective_response = client.post(
            "/autonomy/objectives",
            json={
                "id": "builder-living-app",
                "title": "Bring the app to life safely",
                "description": "Create an auditable autonomy substrate for the app.",
                "status": "active",
                "priority": 110,
                "target_scopes": ["backend/app", "frontend/src"],
                "success_criteria": [
                    "Persistent objectives exist.",
                    "Jobs and healing actions are queryable.",
                ],
                "owner_kind": "builder",
                "metadata": {"phase": "autonomy-substrate"},
            },
        )
        assert objective_response.status_code == 200
        assert objective_response.json()["status"] == "active"

        job_response = client.post(
            "/autonomy/jobs",
            json={
                "id": "job-watch-inbox",
                "objective_id": "builder-living-app",
                "job_kind": "inbox-check",
                "title": "Check the Codex inbox",
                "summary": "Poll the app-owned inbox on a bounded cadence.",
                "status": "queued",
                "assigned_lane": "builder",
                "resource_keys": ["codex-control-inbox"],
                "depends_on": [],
                "input_payload": {"cadence_s": 5},
                "output_payload": {},
                "retry_count": 0,
                "max_retries": 3,
            },
        )
        assert job_response.status_code == 200
        assert job_response.json()["job_kind"] == "inbox-check"

        observation_response = client.post(
            "/autonomy/observations",
            json={
                "id": "obs-builder-stale",
                "source_kind": "builder-ui",
                "source_ref": "builder",
                "category": "staleness",
                "severity": "warning",
                "message": "Builder inbox has not refreshed recently.",
                "details": {"lag_seconds": 18},
            },
        )
        assert observation_response.status_code == 200
        assert observation_response.json()["severity"] == "warning"

        healing_response = client.post(
            "/autonomy/healing-actions",
            json={
                "id": "heal-refresh-builder",
                "observation_id": "obs-builder-stale",
                "job_id": "job-watch-inbox",
                "action_kind": "refresh-surface",
                "summary": "Trigger a Builder inbox refresh and record the result.",
                "status": "proposed",
                "details": {"target": "builder-inbox"},
            },
        )
        assert healing_response.status_code == 200
        assert healing_response.json()["status"] == "proposed"

        memory_response = client.post(
            "/autonomy/memories",
            json={
                "id": "memory-builder-inbox-cadence",
                "memory_kind": "operational-learning",
                "title": "Builder inbox cadence",
                "content": "Use a bounded refresh cadence instead of a 1-second loop.",
                "tags": ["builder", "inbox", "cadence"],
                "confidence": 0.92,
                "source_refs": ["obs-builder-stale", "job-watch-inbox"],
            },
        )
        assert memory_response.status_code == 200
        assert memory_response.json()["memory_kind"] == "operational-learning"

        objectives_list = client.get("/autonomy/objectives")
        jobs_list = client.get("/autonomy/jobs")
        observations_list = client.get("/autonomy/observations")
        healing_list = client.get("/autonomy/healing-actions")
        memories_list = client.get("/autonomy/memories")
        summary = client.get("/autonomy")

        assert objectives_list.status_code == 200
        assert jobs_list.status_code == 200
        assert observations_list.status_code == 200
        assert healing_list.status_code == 200
        assert memories_list.status_code == 200
        assert summary.status_code == 200

        assert objectives_list.json()["objectives"][0]["id"] == "builder-living-app"
        assert jobs_list.json()["jobs"][0]["id"] == "job-watch-inbox"
        assert observations_list.json()["observations"][0]["id"] == "obs-builder-stale"
        assert healing_list.json()["healing_actions"][0]["id"] == "heal-refresh-builder"
        assert memories_list.json()["memories"][0]["id"] == "memory-builder-inbox-cadence"
        assert summary.json()["objectives_total"] == 1
        assert summary.json()["jobs_total"] == 1
        assert summary.json()["observations_total"] == 1
        assert summary.json()["healing_actions_total"] == 1
        assert summary.json()["memories_total"] == 1
        assert summary.json()["objectives_by_status"] == {"active": 1}
        assert summary.json()["jobs_by_status"] == {"queued": 1}
        assert summary.json()["observations_by_severity"] == {"warning": 1}
        assert summary.json()["healing_actions_by_status"] == {"proposed": 1}


def test_autonomy_job_patch_updates_status_and_payload() -> None:
    with isolated_client() as client:
        client.post(
            "/autonomy/jobs",
            json={
                "id": "job-wire-builder-inbox",
                "job_kind": "manual-thread-check",
                "title": "Wire the next Builder slice",
                "summary": "Promote this to mission control from the GUI.",
                "status": "queued",
                "assigned_lane": "builder",
                "resource_keys": ["frontend/src/components/workspaces"],
                "input_payload": {"scope_paths": ["frontend/src/components/workspaces"]},
                "output_payload": {},
                "retry_count": 0,
                "max_retries": 2,
            },
        )

        update_response = client.patch(
            "/autonomy/jobs/job-wire-builder-inbox",
            json={
                "status": "running",
                "assigned_lane": "builder-alpha",
                "output_payload": {
                    "mission_control_task_id": "builder-task-001",
                    "promotion_state": "claimed",
                },
                "last_error": None,
            },
        )

        assert update_response.status_code == 200
        body = update_response.json()
        assert body["status"] == "running"
        assert body["assigned_lane"] == "builder-alpha"
        assert body["output_payload"]["mission_control_task_id"] == "builder-task-001"
        assert body["started_at"] is not None
        assert body["finished_at"] is None

        succeed_response = client.patch(
            "/autonomy/jobs/job-wire-builder-inbox",
            json={
                "status": "succeeded",
                "output_payload": {
                    "mission_control_task_id": "builder-task-001",
                    "promotion_state": "completed",
                },
            },
        )

        assert succeed_response.status_code == 200
        succeed_body = succeed_response.json()
        assert succeed_body["status"] == "succeeded"
        assert succeed_body["finished_at"] is not None
        assert succeed_body["output_payload"]["promotion_state"] == "completed"


def test_autonomy_routes_reject_invalid_enum_values() -> None:
    with isolated_client() as client:
        bad_objective = client.post(
            "/autonomy/objectives",
            json={
                "id": "bad-objective",
                "title": "Bad objective",
                "description": "This should fail.",
                "status": "mutating-itself-forever",
            },
        )
        bad_observation = client.post(
            "/autonomy/observations",
            json={
                "id": "bad-observation",
                "source_kind": "builder-ui",
                "category": "staleness",
                "severity": "critical-plus-plus",
                "message": "This should fail.",
            },
        )
        bad_job_reference = client.post(
            "/autonomy/jobs",
            json={
                "id": "bad-job",
                "objective_id": "missing-objective",
                "job_kind": "inbox-check",
                "title": "Bad job",
                "summary": "This should fail.",
            },
        )

        assert bad_objective.status_code == 409
        assert "mutating-itself-forever" in bad_objective.json()["detail"]
        assert bad_observation.status_code == 409
        assert "critical-plus-plus" in bad_observation.json()["detail"]
        assert bad_job_reference.status_code == 409
        assert "missing-objective" in bad_job_reference.json()["detail"]


def test_autonomy_job_patch_returns_not_found_for_missing_job() -> None:
    with isolated_client() as client:
        response = client.patch(
            "/autonomy/jobs/missing-job",
            json={"status": "running"},
        )

        assert response.status_code == 404
        assert "missing-job" in response.json()["detail"]


def test_autonomy_observation_patch_marks_observation_handled() -> None:
    with isolated_client() as client:
        client.post(
            "/autonomy/observations",
            json={
                "id": "obs-stuck-thread",
                "source_kind": "builder-ui",
                "source_ref": "job-watch-inbox",
                "category": "stuck-thread",
                "severity": "warning",
                "message": "Builder thread is blocked waiting for refresh.",
                "details": {"stuck": True},
            },
        )

        response = client.patch(
            "/autonomy/observations/obs-stuck-thread",
            json={
                "message": "Builder thread blocker was reviewed and handled.",
                "details": {
                    "stuck": False,
                    "handled_at": "2026-04-22T17:00:00Z",
                    "handled_by": "builder-alpha",
                },
            },
        )

        assert response.status_code == 200
        body = response.json()
        assert body["message"] == "Builder thread blocker was reviewed and handled."
        assert body["details"]["handled_by"] == "builder-alpha"
        assert body["details"]["stuck"] is False


def test_autonomy_healing_action_patch_resolves_action() -> None:
    with isolated_client() as client:
        client.post(
            "/autonomy/jobs",
            json={
                "id": "job-retry-builder-refresh",
                "job_kind": "manual-thread-check",
                "title": "Retry Builder refresh",
                "summary": "Retry after the blocker clears.",
                "status": "blocked",
                "assigned_lane": "builder-alpha",
                "resource_keys": ["builder-inbox"],
                "input_payload": {},
                "output_payload": {},
                "retry_count": 1,
                "max_retries": 3,
                "last_error": "waiting on refresh",
            },
        )
        client.post(
            "/autonomy/observations",
            json={
                "id": "obs-retry-builder-refresh",
                "source_kind": "builder-ui",
                "category": "stuck-thread",
                "severity": "warning",
                "message": "Builder refresh is blocked.",
                "details": {},
            },
        )
        client.post(
            "/autonomy/healing-actions",
            json={
                "id": "heal-retry-builder-refresh",
                "observation_id": "obs-retry-builder-refresh",
                "job_id": "job-retry-builder-refresh",
                "action_kind": "operator-retry",
                "summary": "Requeue the Builder job after a refresh ping.",
                "status": "proposed",
                "details": {"refresh_target": "builder-alpha"},
            },
        )

        response = client.patch(
            "/autonomy/healing-actions/heal-retry-builder-refresh",
            json={
                "status": "succeeded",
                "details": {
                    "refresh_target": "builder-alpha",
                    "resolved_by": "operator",
                },
            },
        )

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "succeeded"
        assert body["details"]["resolved_by"] == "operator"
        assert body["resolved_at"] is not None
