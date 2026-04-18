from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from app.main import app
from app.services.approvals import approvals_service
from app.services.db import configure_database, initialize_database, reset_database


@contextmanager
def isolated_client() -> TestClient:
    with TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "control-plane.sqlite3"
        configure_database(db_path)
        initialize_database()
        reset_database()
        try:
            with TestClient(app) as client:
                yield client
        finally:
            configure_database(None)


def test_root_includes_phase_one_routes() -> None:
    with isolated_client() as client:
        response = client.get("/")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "phase-2-persistence"
        assert "/runs" in payload["routes"]


def test_ready_reports_in_memory_dependencies() -> None:
    with isolated_client() as client:
        response = client.get("/ready")
        assert response.status_code == 200
        payload = response.json()
        assert payload["ok"] is True
        assert "sqlite approvals store" in payload["dependencies"]


def test_catalog_returns_rich_tool_metadata() -> None:
    with isolated_client() as client:
        response = client.get("/tools/catalog")
        assert response.status_code == 200
        payload = response.json()
        assert payload["agents"][0]["tools"][0]["approval_class"]


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
        assert response.status_code == 200
        payload = response.json()
        assert len(payload["events"]) >= 1
