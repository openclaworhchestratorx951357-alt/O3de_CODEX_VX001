from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
MISSION_CONTROL_PATH = REPO_ROOT / "scripts" / "mission_control.py"


def load_mission_control_module():
    spec = importlib.util.spec_from_file_location("mission_control", MISSION_CONTROL_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def make_context(module, tmp_path: Path):
    git_common_dir = tmp_path / ".git"
    git_common_dir.mkdir()
    state_dir = git_common_dir / "codex-mission-control"
    state_dir.mkdir()
    return module.Context(
        cwd=tmp_path,
        repo_root=tmp_path,
        git_common_dir=git_common_dir,
        state_dir=state_dir,
        db_path=state_dir / "mission-control.sqlite3",
        board_json_path=state_dir / "latest-board.json",
        board_text_path=state_dir / "latest-board.txt",
    )


def insert_task(conn, *, task_id: str, title: str, priority: int, scope_paths: list[str]) -> None:
    conn.execute(
        """
        INSERT INTO tasks (
            task_id, title, summary, priority, status, scope_paths_json,
            recommended_branch_prefix, claimed_by_worker_id, claimed_at,
            created_at, updated_at, completed_at
        )
        VALUES (?, ?, ?, ?, 'pending', ?, NULL, NULL, NULL, ?, ?, NULL)
        """,
        (
            task_id,
            title,
            title,
            priority,
            json.dumps(scope_paths),
            "2026-04-22T00:00:00Z",
            "2026-04-22T00:00:00Z",
        ),
    )


def test_fetch_active_task_for_worker_returns_none_when_worker_has_no_current_task(tmp_path):
    module = load_mission_control_module()
    context = make_context(module, tmp_path)

    with module.connect_db(context) as conn:
        module.ensure_schema(conn)
        module.upsert_worker(
            conn,
            worker_id="alpha",
            display_name="Alpha",
            branch_name="codex/worker/alpha",
            worktree_path=str(tmp_path / "alpha"),
            base_branch=module.DEFAULT_BASE_BRANCH,
            status="idle",
            summary=None,
        )
        conn.commit()

        assert module.fetch_active_task_for_worker(conn, "alpha") is None


def test_waiter_gets_ready_notification_when_blocking_scope_clears(tmp_path):
    module = load_mission_control_module()
    context = make_context(module, tmp_path)

    with module.connect_db(context) as conn:
        module.ensure_schema(conn)
        module.upsert_worker(
            conn,
            worker_id="alpha",
            display_name="Alpha",
            branch_name="codex/worker/alpha",
            worktree_path=str(tmp_path / "alpha"),
            base_branch=module.DEFAULT_BASE_BRANCH,
            status="idle",
            summary=None,
        )
        module.upsert_worker(
            conn,
            worker_id="beta",
            display_name="Beta",
            branch_name="codex/worker/beta",
            worktree_path=str(tmp_path / "beta"),
            base_branch=module.DEFAULT_BASE_BRANCH,
            status="idle",
            summary=None,
        )
        insert_task(
            conn,
            task_id="T1",
            title="Broad task",
            priority=100,
            scope_paths=["backend/app/services"],
        )
        insert_task(
            conn,
            task_id="T2",
            title="Leaf task",
            priority=90,
            scope_paths=["backend/app/services/editor_automation_runtime.py"],
        )
        conn.commit()

        claimed = module.claim_task(conn, worker_id="alpha", task_id="T1")
        assert claimed["status"] == "in_progress"

        decision = module.choose_next_task(conn, worker_id="beta")
        assert decision["decision"] == "blocked"
        assert decision["task"]["task_id"] == "T2"
        assert [blocker["task_id"] for blocker in decision["blockers"]] == ["T1"]

        waiter = module.create_waiter(
            conn,
            worker_id="beta",
            task_id="T2",
            reason="waiting for runtime file scope",
        )
        assert waiter["status"] == "waiting"

        completed = module.complete_task(conn, worker_id="alpha", task_id="T1")
        assert completed["status"] == "completed"
        assert completed["released_waiters"][0]["worker_id"] == "beta"

        notifications = conn.execute(
            "SELECT * FROM notifications WHERE worker_id = 'beta' ORDER BY notification_id ASC"
        ).fetchall()
        assert len(notifications) == 1
        assert notifications[0]["status"] == "unread"
        assert notifications[0]["task_id"] == "T2"


def test_create_notification_records_refresh_request(tmp_path):
    module = load_mission_control_module()
    context = make_context(module, tmp_path)

    with module.connect_db(context) as conn:
        module.ensure_schema(conn)
        module.upsert_worker(
            conn,
            worker_id="beta",
            display_name="Beta",
            branch_name="codex/worker/beta",
            worktree_path=str(tmp_path / "beta"),
            base_branch=module.DEFAULT_BASE_BRANCH,
            status="blocked",
            summary="Waiting on Builder refresh.",
        )
        conn.commit()

        notification = module.create_notification(
            conn,
            worker_id="beta",
            kind="refresh-request",
            message="Please refresh your lane and re-check the Builder blocker.",
            task_id=None,
        )
        conn.commit()

        assert notification["worker_id"] == "beta"
        assert notification["kind"] == "refresh-request"
        assert notification["status"] == "unread"


def test_launch_terminal_session_records_managed_terminal(tmp_path, monkeypatch):
    module = load_mission_control_module()
    context = make_context(module, tmp_path)

    launched: dict[str, object] = {}

    class FakeProcess:
        pid = 4242

    def fake_popen(command, **kwargs):
        launched["command"] = command
        launched["cwd"] = kwargs.get("cwd")
        return FakeProcess()

    monkeypatch.setattr(module.subprocess, "Popen", fake_popen)

    with module.connect_db(context) as conn:
        module.ensure_schema(conn)
        module.upsert_worker(
            conn,
            worker_id="beta",
            display_name="Beta",
            branch_name="codex/worker/beta",
            worktree_path=str(tmp_path / "beta"),
            base_branch=module.DEFAULT_BASE_BRANCH,
            status="active",
            summary="Running Builder lane.",
        )
        conn.commit()

        session = module.launch_terminal_session(
            conn,
            context,
            worker_id="beta",
            label="Builder dev server",
            command=["python", "-m", "http.server", "9000"],
            cwd=str(tmp_path),
            task_id=None,
        )
        conn.commit()

        assert launched["command"] == ["python", "-m", "http.server", "9000"]
        assert launched["cwd"] == str(tmp_path)
        assert session["worker_id"] == "beta"
        assert session["status"] == "running"
        assert session["pid"] == 4242
        assert session["log_path"].endswith(".log")
        assert session["tail_preview"][0].startswith("[")


def test_stop_terminal_session_marks_session_stopped(tmp_path, monkeypatch):
    module = load_mission_control_module()
    context = make_context(module, tmp_path)

    monkeypatch.setattr(module, "terminate_process", lambda pid, force: True)
    monkeypatch.setattr(module, "process_exists", lambda pid: False)

    with module.connect_db(context) as conn:
        module.ensure_schema(conn)
        module.upsert_worker(
            conn,
            worker_id="beta",
            display_name="Beta",
            branch_name="codex/worker/beta",
            worktree_path=str(tmp_path / "beta"),
            base_branch=module.DEFAULT_BASE_BRANCH,
            status="active",
            summary="Running Builder lane.",
        )
        log_path = context.state_dir / "terminal-logs" / "terminal-beta.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("running\n", encoding="utf-8")
        conn.execute(
            """
            INSERT INTO terminal_sessions (
                session_id, worker_id, task_id, label, cwd, command_json, status, pid,
                log_path, created_at, started_at, updated_at, exited_at,
                stop_requested_at, stop_requested_by, stop_reason
            )
            VALUES (?, ?, NULL, ?, ?, ?, 'running', ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)
            """,
            (
                "terminal-beta-001",
                "beta",
                "Builder dev server",
                str(tmp_path),
                json.dumps(["python", "-m", "http.server", "9000"]),
                4242,
                str(log_path),
                "2026-04-22T12:00:00Z",
                "2026-04-22T12:00:00Z",
                "2026-04-22T12:00:00Z",
            ),
        )
        conn.commit()

        session = module.stop_terminal_session(
            conn,
            session_id="terminal-beta-001",
            requested_by="builder-alpha",
            reason="Urgent override requested from Builder.",
            force=True,
        )
        conn.commit()

        assert session["status"] == "stopped"
        assert session["stop_requested_by"] == "builder-alpha"
        assert session["stop_reason"] == "Urgent override requested from Builder."


def test_build_board_snapshot_includes_terminal_sessions(tmp_path):
    module = load_mission_control_module()
    context = make_context(module, tmp_path)

    with module.connect_db(context) as conn:
        module.ensure_schema(conn)
        module.upsert_worker(
            conn,
            worker_id="beta",
            display_name="Beta",
            branch_name="codex/worker/beta",
            worktree_path=str(tmp_path / "beta"),
            base_branch=module.DEFAULT_BASE_BRANCH,
            status="active",
            summary="Running Builder lane.",
        )
        log_path = context.state_dir / "terminal-logs" / "terminal-beta.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("line 1\nline 2\n", encoding="utf-8")
        conn.execute(
            """
            INSERT INTO terminal_sessions (
                session_id, worker_id, task_id, label, cwd, command_json, status, pid,
                log_path, created_at, started_at, updated_at, exited_at,
                stop_requested_at, stop_requested_by, stop_reason
            )
            VALUES (?, ?, NULL, ?, ?, ?, 'running', ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)
            """,
            (
                "terminal-beta-002",
                "beta",
                "Builder dev server",
                str(tmp_path),
                json.dumps(["python", "-m", "http.server", "9000"]),
                4242,
                str(log_path),
                "2026-04-22T12:00:00Z",
                "2026-04-22T12:00:00Z",
                "2026-04-22T12:00:00Z",
            ),
        )
        conn.commit()

        snapshot = module.build_board_snapshot(conn, context)

        assert snapshot["terminal_sessions"][0]["session_id"] == "terminal-beta-002"
        assert snapshot["terminal_sessions"][0]["tail_preview"] == ["line 1", "line 2"]


def test_supersede_task_replaces_active_work_without_self_blocking_and_stops_terminal(
    tmp_path,
    monkeypatch,
):
    module = load_mission_control_module()
    context = make_context(module, tmp_path)

    monkeypatch.setattr(module, "terminate_process", lambda pid, force: True)
    monkeypatch.setattr(module, "process_exists", lambda pid: False)

    with module.connect_db(context) as conn:
        module.ensure_schema(conn)
        module.upsert_worker(
            conn,
            worker_id="alpha",
            display_name="Alpha",
            branch_name="codex/worker/alpha",
            worktree_path=str(tmp_path / "alpha"),
            base_branch=module.DEFAULT_BASE_BRANCH,
            status="active",
            summary="Working Builder lane.",
        )
        module.upsert_worker(
            conn,
            worker_id="beta",
            display_name="Beta",
            branch_name="codex/worker/beta",
            worktree_path=str(tmp_path / "beta"),
            base_branch=module.DEFAULT_BASE_BRANCH,
            status="blocked",
            summary="Waiting on overlapping scope.",
        )
        insert_task(
            conn,
            task_id="builder-task",
            title="Current Builder slice",
            priority=90,
            scope_paths=["frontend/src/components/workspaces"],
        )
        insert_task(
            conn,
            task_id="beta-follow-up",
            title="Blocked follow-up",
            priority=80,
            scope_paths=["frontend/src/components/workspaces/BuilderWorkspaceDesktop.tsx"],
        )
        conn.commit()

        claimed_task = module.claim_task(conn, worker_id="alpha", task_id="builder-task")
        assert claimed_task["status"] == "in_progress"

        waiter = module.create_waiter(
            conn,
            worker_id="beta",
            task_id="beta-follow-up",
            reason="waiting on frontend builder scope",
        )
        assert waiter["status"] == "waiting"

        log_path = context.state_dir / "terminal-logs" / "terminal-alpha.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("serving on 9000\n", encoding="utf-8")
        conn.execute(
            """
            INSERT INTO terminal_sessions (
                session_id, worker_id, task_id, label, cwd, command_json, status, pid,
                log_path, created_at, started_at, updated_at, exited_at,
                stop_requested_at, stop_requested_by, stop_reason
            )
            VALUES (?, ?, ?, ?, ?, ?, 'running', ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)
            """,
            (
                "terminal-alpha-001",
                "alpha",
                "builder-task",
                "Builder dev server",
                str(tmp_path),
                json.dumps(["python", "-m", "http.server", "9000"]),
                4242,
                str(log_path),
                "2026-04-22T16:00:00Z",
                "2026-04-22T16:00:00Z",
                "2026-04-22T16:00:00Z",
            ),
        )
        conn.commit()

        result = module.supersede_task(
            conn,
            worker_id="alpha",
            task_id="builder-task",
            replacement_title="Urgent Builder override",
            replacement_summary="Handle the urgent slice now.",
            replacement_priority=250,
            replacement_scope_paths=["frontend/src/components/workspaces"],
            replacement_branch_prefix="codex/worker",
            replacement_task_id="builder-urgent-override",
            supersede_reason="Urgent production issue.",
            requested_by="alpha",
            stop_active_terminal=True,
        )
        conn.commit()

        superseded_task = module.fetch_task(conn, "builder-task")
        replacement_task = module.fetch_task(conn, "builder-urgent-override")
        worker = module.fetch_worker(conn, "alpha")
        notifications = conn.execute(
            "SELECT worker_id, kind, message FROM notifications ORDER BY notification_id ASC"
        ).fetchall()

        assert superseded_task["status"] == "blocked"
        assert superseded_task["superseded_by_task_id"] == "builder-urgent-override"
        assert superseded_task["supersede_reason"] == "Urgent production issue."
        assert replacement_task["status"] == "in_progress"
        assert replacement_task["claimed_by_worker_id"] == "alpha"
        assert module.task_blockers(
            conn,
            replacement_task["scope_paths"],
            ignore_task_id=replacement_task["task_id"],
        ) == []
        assert worker["current_task_id"] == "builder-urgent-override"
        assert worker["summary"] == "Urgent override: Urgent Builder override"
        assert result["stopped_terminal_session"] is not None
        assert result["stopped_terminal_session"]["session_id"] == "terminal-alpha-001"
        assert result["stopped_terminal_session"]["status"] == "stopped"
        assert result["notified_workers"] == ["alpha", "beta"]
        assert notifications[0]["worker_id"] == "alpha"
        assert notifications[0]["kind"] == "task-superseded"
        assert notifications[1]["worker_id"] == "beta"
        assert notifications[1]["kind"] == "refresh-request"
