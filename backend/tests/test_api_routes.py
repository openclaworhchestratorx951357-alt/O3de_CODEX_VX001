import json
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from app.main import app
from app.services.approvals import approvals_service
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


def test_root_includes_current_control_plane_routes() -> None:
    with isolated_client() as client:
        response = client.get("/")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "phase-7-build-configure-preflight"
        assert payload["phase"] == "phase-7"
        assert "/runs" in payload["routes"]


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
        assert payload["schema_validation"]["mode"] == "subset-json-schema"
        assert payload["schema_validation"]["schema_scope"] == "published-tool-arg-result-schemas"
        assert payload["schema_validation"]["supports_request_args"] is True
        assert payload["schema_validation"]["supports_result_conformance"] is True
        assert "$ref" in payload["schema_validation"]["active_keywords"]
        assert payload["schema_validation"]["active_unsupported_keywords"] == []
        assert "$schema" in payload["schema_validation"]["active_metadata_keywords"]
        assert "allOf" in payload["schema_validation"]["supported_keywords"]
        assert "oneOf" in payload["schema_validation"]["unsupported_keywords"]
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
            project_build = next(
                family for family in payload["families"] if family["family"] == "project-build"
            )
            assert project_build["supports_real_execution"] is True


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
        assert payload["policies"][0]["args_schema"]
        assert payload["policies"][0]["result_schema"]


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
        assert any(
            event["details"].get("capability_status") == "hybrid-read-only"
            for event in payload["events"]
        )


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
        artifacts = client.get("/artifacts")
        artifact = client.get(f"/artifacts/{artifact_id}")

        assert executions.status_code == 200
        assert artifacts.status_code == 200
        assert artifact.status_code == 200
        assert payload["result"]["simulated"] is True
        assert executions.json()["executions"][0]["execution_mode"] == "simulated"
        assert executions.json()["executions"][0]["details"]["adapter_family"] == "project-build"
        assert (
            executions.json()["executions"][0]["details"]["adapter_contract_version"]
            == "v0.1"
        )
        assert artifact.json()["simulated"] is True
        assert artifact.json()["metadata"]["adapter_family"] == "project-build"
        assert artifact.json()["metadata"]["adapter_contract_version"] == "v0.1"


def test_dispatch_route_uses_real_project_inspect_path_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "ApiHybridProject"}),
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
                        "args": {"include_gems": True},
                    },
                )
                assert dispatch.status_code == 200
                payload = dispatch.json()
                assert payload["ok"] is True
                assert payload["result"]["simulated"] is False
                assert payload["result"]["execution_mode"] == "real"


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
