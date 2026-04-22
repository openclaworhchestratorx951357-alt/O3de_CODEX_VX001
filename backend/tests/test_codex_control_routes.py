from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from app.main import app
from app.models.api import (
    CodexControlBoardStatus,
    CodexControlLaneCreateResponse,
    CodexControlNotificationsResponse,
    CodexControlNextTaskResponse,
    CodexControlStatusResponse,
    CodexControlTerminalSession,
    CodexControlTerminalSessionResponse,
    CodexControlTask,
    CodexControlTaskResponse,
    CodexControlTaskSupersedeResponse,
    CodexControlWaiter,
    CodexControlWorkerResponse,
    CodexControlWorker,
    CodexHarnessStatus,
)
from app.services.db import configure_database, initialize_database, reset_database
from fastapi.testclient import TestClient


@contextmanager
def isolated_client() -> TestClient:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        configure_database(Path(temp_dir) / "control-plane.sqlite3")
        initialize_database()
        reset_database()
        try:
            with TestClient(app) as client:
                yield client
        finally:
            configure_database(None)


def test_codex_control_status_route_returns_builder_snapshot() -> None:
    payload = CodexControlStatusResponse(
        repo_root=r"C:\repo",
        git_common_dir=r"C:\repo\.git",
        current_branch="codex/control-plane/o3de-real-integration",
        mission_control_script_path=r"C:\repo\scripts\mission_control.py",
        mission_control_wrapper_path=r"C:\repo\scripts\mission_control.ps1",
        mission_control_available=True,
        recommended_base_branch="codex/control-plane/o3de-thread-launchpad-stable",
        board=CodexControlBoardStatus(available=True),
        worktrees=[],
        harnesses=[
            CodexHarnessStatus(
                harness_id="manual_handoff",
                label="Manual handoff",
                configured=True,
                status="ready",
                detail="Ready",
                notes=[],
            )
        ],
        notes=[],
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.get_status",
            return_value=payload,
        ):
            response = client.get("/codex/control")

    assert response.status_code == 200
    body = response.json()
    assert body["repo_root"] == r"C:\repo"
    assert body["mission_control_available"] is True
    assert body["harnesses"][0]["harness_id"] == "manual_handoff"


def test_codex_control_lane_route_maps_service_result() -> None:
    payload = CodexControlLaneCreateResponse(
        status="ok",
        worker=CodexControlWorker(
            worker_id="builder-alpha",
            display_name="Builder Alpha",
            branch_name="codex/worker/builder-alpha",
            worktree_path=r"C:\repo-builder-alpha",
            base_branch="codex/control-plane/o3de-thread-launchpad-stable",
            status="idle",
            current_task_id=None,
            summary="lane created",
            updated_at="2026-04-22T10:05:00Z",
            last_seen_at="2026-04-22T10:05:00Z",
        ),
        worktree_path=r"C:\repo-builder-alpha",
        board_json_path=r"C:\repo\.git\codex-mission-control\latest-board.json",
        board_text_path=r"C:\repo\.git\codex-mission-control\latest-board.txt",
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.create_lane",
            return_value=payload,
        ):
            response = client.post(
                "/codex/control/lanes",
                json={
                    "worker_id": "builder-alpha",
                    "display_name": "Builder Alpha",
                    "branch_name": "codex/worker/builder-alpha",
                    "worktree_path": r"C:\repo-builder-alpha",
                    "base_branch": "codex/control-plane/o3de-thread-launchpad-stable",
                    "bootstrap": False,
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["worker"]["worker_id"] == "builder-alpha"
    assert body["worktree_path"] == r"C:\repo-builder-alpha"


def test_codex_control_worker_sync_route_maps_service_result() -> None:
    payload = CodexControlWorkerResponse(
        status="ok",
        worker=CodexControlWorker(
            worker_id="builder-alpha",
            display_name="Builder Alpha",
            branch_name="codex/worker/builder-alpha",
            worktree_path=r"C:\repo-builder-alpha",
            base_branch="codex/control-plane/o3de-thread-launchpad-stable",
            status="active",
            current_task_id=None,
            summary="Watching Builder scopes.",
            updated_at="2026-04-22T10:07:00Z",
            last_seen_at="2026-04-22T10:07:00Z",
        ),
        board_json_path=r"C:\repo\.git\codex-mission-control\latest-board.json",
        board_text_path=r"C:\repo\.git\codex-mission-control\latest-board.txt",
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.sync_worker",
            return_value=payload,
        ):
            response = client.post(
                "/codex/control/workers/sync",
                json={
                    "worker_id": "builder-alpha",
                    "display_name": "Builder Alpha",
                    "branch_name": "codex/worker/builder-alpha",
                    "worktree_path": r"C:\repo-builder-alpha",
                    "base_branch": "codex/control-plane/o3de-thread-launchpad-stable",
                    "status": "active",
                    "summary": "Watching Builder scopes.",
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["worker"]["worker_id"] == "builder-alpha"
    assert body["worker"]["status"] == "active"


def test_codex_control_worker_heartbeat_route_maps_service_result() -> None:
    payload = CodexControlWorkerResponse(
        status="ok",
        worker=CodexControlWorker(
            worker_id="builder-alpha",
            display_name="Builder Alpha",
            branch_name="codex/worker/builder-alpha",
            worktree_path=r"C:\repo-builder-alpha",
            base_branch="codex/control-plane/o3de-thread-launchpad-stable",
            status="blocked",
            current_task_id="builder-task",
            summary="Waiting on overlapping scope.",
            updated_at="2026-04-22T10:08:00Z",
            last_seen_at="2026-04-22T10:08:00Z",
        ),
        board_json_path=r"C:\repo\.git\codex-mission-control\latest-board.json",
        board_text_path=r"C:\repo\.git\codex-mission-control\latest-board.txt",
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.heartbeat_worker",
            return_value=payload,
        ):
            response = client.post(
                "/codex/control/workers/builder-alpha/heartbeat",
                json={
                    "status": "blocked",
                    "summary": "Waiting on overlapping scope.",
                    "current_task_id": "builder-task",
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["worker"]["worker_id"] == "builder-alpha"
    assert body["worker"]["current_task_id"] == "builder-task"


def test_codex_control_worker_notify_route_maps_service_result() -> None:
    payload = CodexControlNotificationsResponse(
        status="ok",
        notifications=[
            {
                "notification_id": 7,
                "worker_id": "builder-beta",
                "task_id": "builder-task",
                "kind": "refresh-request",
                "status": "unread",
                "message": "Please refresh your lane and re-check the Builder blocker.",
                "created_at": "2026-04-22T10:09:00Z",
                "read_at": None,
            }
        ],
        board_json_path=r"C:\repo\.git\codex-mission-control\latest-board.json",
        board_text_path=r"C:\repo\.git\codex-mission-control\latest-board.txt",
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.notify_worker",
            return_value=payload,
        ):
            response = client.post(
                "/codex/control/workers/builder-beta/notify",
                json={
                    "kind": "refresh-request",
                    "message": "Please refresh your lane and re-check the Builder blocker.",
                    "task_id": "builder-task",
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["notifications"][0]["worker_id"] == "builder-beta"
    assert body["notifications"][0]["kind"] == "refresh-request"


def test_codex_control_terminal_launch_route_maps_service_result() -> None:
    payload = CodexControlTerminalSessionResponse(
        status="ok",
        terminal_session=CodexControlTerminalSession(
            session_id="terminal-builder-alpha-001",
            worker_id="builder-alpha",
            task_id="builder-task",
            label="Builder dev server",
            cwd=r"C:\repo-builder-alpha",
            command=["python", "-m", "http.server", "9000"],
            status="running",
            pid=4242,
            log_path=r"C:\repo\.git\codex-mission-control\terminal-logs\terminal-builder-alpha-001.log",
            created_at="2026-04-22T12:00:00Z",
            started_at="2026-04-22T12:00:00Z",
            updated_at="2026-04-22T12:00:00Z",
            exited_at=None,
            stop_requested_at=None,
            stop_requested_by=None,
            stop_reason=None,
            tail_preview=["serving on 9000"],
        ),
        board_json_path=r"C:\repo\.git\codex-mission-control\latest-board.json",
        board_text_path=r"C:\repo\.git\codex-mission-control\latest-board.txt",
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.launch_terminal",
            return_value=payload,
        ):
            response = client.post(
                "/codex/control/terminals",
                json={
                    "worker_id": "builder-alpha",
                    "label": "Builder dev server",
                    "command": ["python", "-m", "http.server", "9000"],
                    "cwd": r"C:\repo-builder-alpha",
                    "task_id": "builder-task",
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["terminal_session"]["worker_id"] == "builder-alpha"
    assert body["terminal_session"]["status"] == "running"
    assert body["terminal_session"]["pid"] == 4242


def test_codex_control_terminal_stop_route_maps_service_result() -> None:
    payload = CodexControlTerminalSessionResponse(
        status="ok",
        terminal_session=CodexControlTerminalSession(
            session_id="terminal-builder-alpha-001",
            worker_id="builder-alpha",
            task_id="builder-task",
            label="Builder dev server",
            cwd=r"C:\repo-builder-alpha",
            command=["python", "-m", "http.server", "9000"],
            status="stopped",
            pid=4242,
            log_path=r"C:\repo\.git\codex-mission-control\terminal-logs\terminal-builder-alpha-001.log",
            created_at="2026-04-22T12:00:00Z",
            started_at="2026-04-22T12:00:00Z",
            updated_at="2026-04-22T12:05:00Z",
            exited_at="2026-04-22T12:05:00Z",
            stop_requested_at="2026-04-22T12:05:00Z",
            stop_requested_by="builder-alpha",
            stop_reason="Urgent override requested from Builder.",
            tail_preview=["stopping now"],
        ),
        board_json_path=r"C:\repo\.git\codex-mission-control\latest-board.json",
        board_text_path=r"C:\repo\.git\codex-mission-control\latest-board.txt",
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.stop_terminal",
            return_value=payload,
        ):
            response = client.post(
                "/codex/control/terminals/terminal-builder-alpha-001/stop",
                json={
                    "requested_by": "builder-alpha",
                    "reason": "Urgent override requested from Builder.",
                    "force": True,
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["terminal_session"]["session_id"] == "terminal-builder-alpha-001"
    assert body["terminal_session"]["status"] == "stopped"
    assert body["terminal_session"]["stop_requested_by"] == "builder-alpha"


def test_codex_control_task_route_maps_service_result() -> None:
    payload = CodexControlTaskResponse(
        status="ok",
        task=CodexControlTask(
            task_id="builder-task",
            title="Builder task",
            summary="Add builder coordination.",
            priority=90,
            status="pending",
            scope_paths=["frontend/src/components/workspaces"],
            recommended_branch_prefix="codex/worker",
            claimed_by_worker_id=None,
            blockers=[],
            claimed_at=None,
            updated_at="2026-04-22T10:12:00Z",
            completed_at=None,
        ),
        board_json_path=r"C:\repo\.git\codex-mission-control\latest-board.json",
        board_text_path=r"C:\repo\.git\codex-mission-control\latest-board.txt",
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.create_task",
            return_value=payload,
        ):
            response = client.post(
                "/codex/control/tasks",
                json={
                    "title": "Builder task",
                    "summary": "Add builder coordination.",
                    "priority": 90,
                    "branch_prefix": "codex/worker",
                    "scope_paths": ["frontend/src/components/workspaces"],
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["task"]["task_id"] == "builder-task"
    assert body["task"]["scope_paths"] == ["frontend/src/components/workspaces"]


def test_codex_control_task_supersede_route_maps_service_result() -> None:
    payload = CodexControlTaskSupersedeResponse(
        status="ok",
        superseded_task=CodexControlTask(
            task_id="builder-task",
            title="Current Builder slice",
            summary="Working on a lower-priority slice.",
            priority=90,
            status="blocked",
            scope_paths=["frontend/src/components/workspaces"],
            recommended_branch_prefix="codex/worker",
            claimed_by_worker_id="builder-alpha",
            blockers=[],
            claimed_at="2026-04-22T16:00:00Z",
            updated_at="2026-04-22T16:10:00Z",
            completed_at=None,
            superseded_by_task_id="builder-urgent-override",
            superseded_at="2026-04-22T16:10:00Z",
            supersede_reason="Urgent production issue.",
        ),
        replacement_task=CodexControlTask(
            task_id="builder-urgent-override",
            title="Urgent Builder override",
            summary="Handle the urgent slice now.",
            priority=250,
            status="in_progress",
            scope_paths=["frontend/src/components/workspaces"],
            recommended_branch_prefix="codex/worker",
            claimed_by_worker_id="builder-alpha",
            blockers=[],
            claimed_at="2026-04-22T16:10:00Z",
            updated_at="2026-04-22T16:10:00Z",
            completed_at=None,
            superseded_by_task_id=None,
            superseded_at=None,
            supersede_reason=None,
        ),
        stopped_terminal_session=CodexControlTerminalSession(
            session_id="terminal-builder-alpha-001",
            worker_id="builder-alpha",
            task_id="builder-task",
            label="Builder dev server",
            cwd=r"C:\repo-builder-alpha",
            command=["python", "-m", "http.server", "9000"],
            status="stopped",
            pid=4242,
            log_path=r"C:\repo\.git\codex-mission-control\terminal-logs\terminal-builder-alpha-001.log",
            created_at="2026-04-22T16:00:00Z",
            started_at="2026-04-22T16:00:00Z",
            updated_at="2026-04-22T16:10:00Z",
            exited_at="2026-04-22T16:10:00Z",
            stop_requested_at="2026-04-22T16:10:00Z",
            stop_requested_by="builder-alpha",
            stop_reason="Urgent override superseded task builder-task with builder-urgent-override.",
            tail_preview=["stopping now"],
        ),
        notified_workers=["builder-alpha", "builder-beta"],
        board_json_path=r"C:\repo\.git\codex-mission-control\latest-board.json",
        board_text_path=r"C:\repo\.git\codex-mission-control\latest-board.txt",
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.supersede_task",
            return_value=payload,
        ):
            response = client.post(
                "/codex/control/tasks/builder-task/supersede",
                json={
                    "worker_id": "builder-alpha",
                    "replacement_title": "Urgent Builder override",
                    "replacement_summary": "Handle the urgent slice now.",
                    "replacement_priority": 250,
                    "replacement_scope_paths": ["frontend/src/components/workspaces"],
                    "replacement_branch_prefix": "codex/worker",
                    "replacement_task_id": "builder-urgent-override",
                    "supersede_reason": "Urgent production issue.",
                    "requested_by": "builder-alpha",
                    "stop_active_terminal": True,
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["superseded_task"]["task_id"] == "builder-task"
    assert body["superseded_task"]["superseded_by_task_id"] == "builder-urgent-override"
    assert body["replacement_task"]["task_id"] == "builder-urgent-override"
    assert body["stopped_terminal_session"]["session_id"] == "terminal-builder-alpha-001"
    assert body["notified_workers"] == ["builder-alpha", "builder-beta"]


def test_codex_control_next_task_route_maps_service_result() -> None:
    payload = CodexControlNextTaskResponse(
        status="ok",
        decision="waiting",
        task=CodexControlTask(
            task_id="builder-task",
            title="Builder task",
            summary="Add builder coordination.",
            priority=90,
            status="pending",
            scope_paths=["frontend/src/components/workspaces"],
            recommended_branch_prefix="codex/worker",
            claimed_by_worker_id=None,
            blockers=["active-scope"],
            claimed_at=None,
            updated_at="2026-04-22T10:12:00Z",
            completed_at=None,
        ),
        blockers=[
            CodexControlTask(
                task_id="active-scope",
                title="Active scope",
                summary="Busy scope.",
                priority=100,
                status="in_progress",
                scope_paths=["frontend/src/components"],
                recommended_branch_prefix=None,
                claimed_by_worker_id="mission-control",
                blockers=[],
                claimed_at="2026-04-22T10:11:00Z",
                updated_at="2026-04-22T10:11:30Z",
                completed_at=None,
            )
        ],
        waiter=CodexControlWaiter(
            waiter_id=3,
            worker_id="builder-alpha",
            task_id="builder-task",
            reason="waiting for active scope",
            status="waiting",
            created_at="2026-04-22T10:12:00Z",
            updated_at="2026-04-22T10:12:00Z",
            notified_at=None,
        ),
        board_json_path=r"C:\repo\.git\codex-mission-control\latest-board.json",
        board_text_path=r"C:\repo\.git\codex-mission-control\latest-board.txt",
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.next_task",
            return_value=payload,
        ):
            response = client.post(
                "/codex/control/workers/next-task",
                json={
                    "worker_id": "builder-alpha",
                    "wait": True,
                    "wait_reason": "waiting for active scope",
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "waiting"
    assert body["waiter"]["worker_id"] == "builder-alpha"
    assert body["blockers"][0]["task_id"] == "active-scope"


def test_codex_control_notifications_routes_map_service_results() -> None:
    payload = CodexControlNotificationsResponse(
        status="ok",
        notifications=[],
        board_json_path=r"C:\repo\.git\codex-mission-control\latest-board.json",
        board_text_path=r"C:\repo\.git\codex-mission-control\latest-board.txt",
    )

    with isolated_client() as client:
        with patch(
            "app.api.routes.codex_control.codex_control_service.list_notifications",
            return_value=payload,
        ):
            get_response = client.get(
                "/codex/control/workers/builder-alpha/notifications?include_all=true"
            )
        with patch(
            "app.api.routes.codex_control.codex_control_service.mark_notifications_read",
            return_value=payload,
        ):
            post_response = client.post(
                "/codex/control/workers/builder-alpha/notifications/mark-read"
            )

    assert get_response.status_code == 200
    assert post_response.status_code == 200
