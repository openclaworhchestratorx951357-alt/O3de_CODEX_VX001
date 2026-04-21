import json
import os
import time
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.o3de_target import router as o3de_target_router
from app.services.db import configure_database, initialize_database, reset_database
from app.services.o3de_target import o3de_target_service


@contextmanager
def isolated_client() -> TestClient:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        db_path = Path(temp_dir) / "control-plane.sqlite3"
        configure_database(db_path)
        initialize_database()
        reset_database()
        app = FastAPI()
        app.include_router(o3de_target_router)
        try:
            with TestClient(app) as client:
                yield client
        finally:
            configure_database(None)
            o3de_target_service._last_results_cleanup_by_project_root.clear()  # noqa: SLF001


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
