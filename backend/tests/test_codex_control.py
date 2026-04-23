import json
from pathlib import Path

from app.models.api import (
    CodexControlLaneCreateRequest,
    CodexControlNextTaskRequest,
    CodexControlTerminalLaunchRequest,
    CodexControlTerminalStopRequest,
    CodexControlTaskCreateRequest,
    CodexControlTaskSupersedeRequest,
    CodexControlWorkerHeartbeatRequest,
    CodexControlWorkerSyncRequest,
)
from app.services.codex_control import CodexControlService


def test_get_status_reports_board_worktrees_and_manual_handoff(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir()
    (scripts_dir / "mission_control.py").write_text("# placeholder\n", encoding="utf-8")
    (scripts_dir / "mission_control.ps1").write_text("# placeholder\n", encoding="utf-8")

    git_common_dir = tmp_path / "git-common"
    state_dir = git_common_dir / "codex-mission-control"
    state_dir.mkdir(parents=True)
    board_json_path = state_dir / "latest-board.json"
    board_json_path.write_text(
        json.dumps(
            {
                "generated_at": "2026-04-22T10:00:00Z",
                "repo_root": str(repo_root),
                "state_dir": str(state_dir),
                "workers": [
                    {
                        "worker_id": "mission-control",
                        "display_name": "Mission Control",
                        "branch_name": "codex/control-plane/o3de-real-integration",
                        "worktree_path": str(repo_root),
                        "base_branch": "codex/control-plane/o3de-thread-launchpad-stable",
                        "status": "active",
                        "current_task_id": "builder-wiring",
                        "summary": "Coordinating lanes.",
                        "updated_at": "2026-04-22T10:00:00Z",
                        "last_seen_at": "2026-04-22T10:00:00Z",
                    }
                ],
                "tasks": [
                    {
                        "task_id": "builder-wiring",
                        "title": "Builder workspace",
                        "summary": "Add codex control workspace.",
                        "priority": 100,
                        "status": "in_progress",
                        "scope_paths": ["frontend/src/App.tsx"],
                        "recommended_branch_prefix": "codex/worker",
                        "claimed_by_worker_id": "mission-control",
                        "blockers": [],
                        "claimed_at": "2026-04-22T10:00:00Z",
                        "updated_at": "2026-04-22T10:00:00Z",
                        "completed_at": None,
                    }
                ],
                "waiters": [
                    {
                        "waiter_id": 1,
                        "worker_id": "beta",
                        "task_id": "builder-wiring",
                        "reason": "Waiting for frontend scope.",
                        "status": "waiting",
                        "created_at": "2026-04-22T10:01:00Z",
                        "updated_at": "2026-04-22T10:01:00Z",
                        "notified_at": None,
                    }
                ],
                "notifications": [
                    {
                        "notification_id": 1,
                        "worker_id": "beta",
                        "task_id": "builder-wiring",
                        "kind": "task-ready",
                        "status": "unread",
                        "message": "Builder lane is ready.",
                        "created_at": "2026-04-22T10:02:00Z",
                        "read_at": None,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    service = CodexControlService(repo_root=repo_root)

    def fake_run(command: list[str], *, cwd: Path | None = None) -> str:
        if command[:4] == ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"]:
            return str(git_common_dir)
        if command[:4] == ["git", "worktree", "list", "--porcelain"]:
            return (
                f"worktree {repo_root}\n"
                "HEAD abcdef1234567890\n"
                "branch refs/heads/codex/control-plane/o3de-real-integration\n"
                "\n"
                f"worktree {repo_root.parent / 'repo-builder'}\n"
                "HEAD 1111111111111111\n"
                "branch refs/heads/codex/worker/builder\n"
                "locked maintenance lock\n"
            )
        if command[:4] == ["git", "branch", "--show-current"]:
            return "codex/control-plane/o3de-real-integration"
        raise AssertionError(f"Unexpected command: {command}")

    service._run_command = fake_run  # type: ignore[method-assign]

    status = service.get_status()

    assert status.repo_root == str(repo_root)
    assert status.git_common_dir == str(git_common_dir)
    assert status.current_branch == "codex/control-plane/o3de-real-integration"
    assert status.mission_control_available is True
    assert status.board.available is True
    assert status.board.workers[0].worker_id == "mission-control"
    assert status.board.tasks[0].task_id == "builder-wiring"
    assert status.board.notifications[0].message == "Builder lane is ready."
    assert len(status.worktrees) == 2
    assert status.worktrees[0].is_current_repo is True
    assert status.worktrees[1].branch_name == "codex/worker/builder"
    assert status.worktrees[1].locked is True
    assert status.harnesses[0].harness_id == "manual_handoff"
    assert status.harnesses[0].configured is True


def test_create_lane_invokes_mission_control_with_expected_args(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir()
    mission_control_script = scripts_dir / "mission_control.py"
    mission_control_script.write_text("# placeholder\n", encoding="utf-8")

    service = CodexControlService(repo_root=repo_root, python_executable="python-test")
    captured_command: list[str] | None = None

    def fake_run(command: list[str], *, cwd: Path | None = None) -> str:
        nonlocal captured_command
        captured_command = command
        return json.dumps(
            {
                "status": "ok",
                "worker": {
                    "worker_id": "builder-alpha",
                    "display_name": "Builder Alpha",
                    "agent_profile": "O3DE authoring specialist",
                    "identity_notes": "Named helper lane.",
                    "personality_notes": "Careful and evidence-first.",
                    "soul_directive": "Protect stable work.",
                    "memory_notes": "Remember McpSandbox paths.",
                    "bootstrap_notes": "Open worktree and check mission control.",
                    "capability_tags": ["repo_read", "mission_control", "o3de_bridge"],
                    "context_sources": ["docs/APP-OPERATOR-GUIDE.md"],
                    "avatar_label": "OA",
                    "avatar_color": "#059669",
                    "avatar_uri": "data:image/svg+xml;base64,avatar",
                    "branch_name": "codex/worker/builder-alpha",
                    "worktree_path": str(repo_root.parent / "repo-builder-alpha"),
                    "base_branch": "codex/control-plane/o3de-thread-launchpad-stable",
                    "status": "idle",
                    "current_task_id": None,
                    "summary": "lane created",
                    "updated_at": "2026-04-22T10:05:00Z",
                    "last_seen_at": "2026-04-22T10:05:00Z",
                },
                "worktree_path": str(repo_root.parent / "repo-builder-alpha"),
                "board_json_path": str(repo_root / ".git" / "codex-mission-control" / "latest-board.json"),
                "board_text_path": str(repo_root / ".git" / "codex-mission-control" / "latest-board.txt"),
            }
        )

    service._run_command = fake_run  # type: ignore[method-assign]

    response = service.create_lane(
        CodexControlLaneCreateRequest(
            worker_id="Builder Alpha",
            display_name="Builder Alpha",
            agent_profile="O3DE authoring specialist",
            identity_notes="Named helper lane.",
            personality_notes="Careful and evidence-first.",
            soul_directive="Protect stable work.",
            memory_notes="Remember McpSandbox paths.",
            bootstrap_notes="Open worktree and check mission control.",
            capability_tags=["repo_read", "mission_control", "o3de_bridge"],
            context_sources=["docs/APP-OPERATOR-GUIDE.md"],
            avatar_label="OA",
            avatar_color="#059669",
            avatar_uri="data:image/svg+xml;base64,avatar",
            branch_name="codex/worker/builder-alpha",
            worktree_path=str(repo_root.parent / "repo-builder-alpha"),
            base_branch="codex/control-plane/o3de-thread-launchpad-stable",
            bootstrap=False,
        )
    )

    assert captured_command is not None
    assert captured_command[:5] == [
        "python-test",
        str(mission_control_script),
        "--json",
        "create-lane",
        "--worker-id",
    ]
    assert "--display-name" in captured_command
    assert "--agent-profile" in captured_command
    assert "--identity-notes" in captured_command
    assert "--personality-notes" in captured_command
    assert "--soul-directive" in captured_command
    assert "--memory-notes" in captured_command
    assert "--bootstrap-notes" in captured_command
    assert captured_command.count("--capability-tag") == 3
    assert "--context-source" in captured_command
    assert "--avatar-label" in captured_command
    assert "--avatar-color" in captured_command
    assert "--avatar-uri" in captured_command
    assert "--branch-name" in captured_command
    assert "--worktree-path" in captured_command
    assert "--base-branch" in captured_command
    assert "--no-bootstrap" in captured_command
    assert response.status == "ok"
    assert response.worker.worker_id == "builder-alpha"
    assert response.worker.agent_profile == "O3DE authoring specialist"
    assert response.worker.capability_tags == ["repo_read", "mission_control", "o3de_bridge"]
    assert response.worker.context_sources == ["docs/APP-OPERATOR-GUIDE.md"]
    assert response.worker.avatar_label == "OA"
    assert response.worktree_path.endswith("repo-builder-alpha")


def test_sync_worker_invokes_mission_control_with_expected_args(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir()
    mission_control_script = scripts_dir / "mission_control.py"
    mission_control_script.write_text("# placeholder\n", encoding="utf-8")

    service = CodexControlService(repo_root=repo_root, python_executable="python-test")
    captured_command: list[str] | None = None

    def fake_run(command: list[str], *, cwd: Path | None = None) -> str:
        nonlocal captured_command
        captured_command = command
        return json.dumps(
            {
                "status": "ok",
                "worker": {
                    "worker_id": "builder-alpha",
                    "display_name": "Builder Alpha",
                    "branch_name": "codex/worker/builder-alpha",
                    "worktree_path": str(repo_root.parent / "repo-builder-alpha"),
                    "base_branch": "codex/control-plane/o3de-thread-launchpad-stable",
                    "status": "active",
                    "current_task_id": None,
                    "summary": "Watching Builder scopes.",
                    "updated_at": "2026-04-22T10:07:00Z",
                    "last_seen_at": "2026-04-22T10:07:00Z",
                },
                "board_json_path": str(repo_root / ".git" / "codex-mission-control" / "latest-board.json"),
                "board_text_path": str(repo_root / ".git" / "codex-mission-control" / "latest-board.txt"),
            }
        )

    service._run_command = fake_run  # type: ignore[method-assign]

    response = service.sync_worker(
        CodexControlWorkerSyncRequest(
            worker_id="builder-alpha",
            display_name="Builder Alpha",
            branch_name="codex/worker/builder-alpha",
            worktree_path=str(repo_root.parent / "repo-builder-alpha"),
            base_branch="codex/control-plane/o3de-thread-launchpad-stable",
            status="active",
            summary="Watching Builder scopes.",
        )
    )

    assert captured_command is not None
    assert captured_command[:5] == [
        "python-test",
        str(mission_control_script),
        "--json",
        "sync-worker",
        "--worker-id",
    ]
    assert "--display-name" in captured_command
    assert "--branch-name" in captured_command
    assert "--worktree-path" in captured_command
    assert "--base-branch" in captured_command
    assert "--status" in captured_command
    assert "--summary" in captured_command
    assert response.worker.worker_id == "builder-alpha"
    assert response.worker.status == "active"


def test_heartbeat_worker_invokes_mission_control_with_expected_args(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir()
    mission_control_script = scripts_dir / "mission_control.py"
    mission_control_script.write_text("# placeholder\n", encoding="utf-8")

    service = CodexControlService(repo_root=repo_root, python_executable="python-test")
    captured_command: list[str] | None = None

    def fake_run(command: list[str], *, cwd: Path | None = None) -> str:
        nonlocal captured_command
        captured_command = command
        return json.dumps(
            {
                "status": "ok",
                "worker": {
                    "worker_id": "builder-alpha",
                    "display_name": "Builder Alpha",
                    "branch_name": "codex/worker/builder-alpha",
                    "worktree_path": str(repo_root.parent / "repo-builder-alpha"),
                    "base_branch": "codex/control-plane/o3de-thread-launchpad-stable",
                    "status": "blocked",
                    "current_task_id": "builder-task",
                    "summary": "Waiting on records scope to clear.",
                    "updated_at": "2026-04-22T10:08:00Z",
                    "last_seen_at": "2026-04-22T10:08:00Z",
                },
                "board_json_path": str(repo_root / ".git" / "codex-mission-control" / "latest-board.json"),
                "board_text_path": str(repo_root / ".git" / "codex-mission-control" / "latest-board.txt"),
            }
        )

    service._run_command = fake_run  # type: ignore[method-assign]

    response = service.heartbeat_worker(
        worker_id="builder-alpha",
        request=CodexControlWorkerHeartbeatRequest(
            status="blocked",
            summary="Waiting on records scope to clear.",
            current_task_id="builder-task",
            branch_name="codex/worker/builder-alpha",
            worktree_path=str(repo_root.parent / "repo-builder-alpha"),
            base_branch="codex/control-plane/o3de-thread-launchpad-stable",
        ),
    )

    assert captured_command is not None
    assert captured_command[:5] == [
        "python-test",
        str(mission_control_script),
        "--json",
        "heartbeat",
        "--worker-id",
    ]
    assert "--status" in captured_command
    assert "--summary" in captured_command
    assert "--current-task-id" in captured_command
    assert "--branch-name" in captured_command
    assert "--worktree-path" in captured_command
    assert "--base-branch" in captured_command
    assert response.worker.worker_id == "builder-alpha"
    assert response.worker.current_task_id == "builder-task"


def test_create_task_requires_scope_paths(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    service = CodexControlService(repo_root=repo_root)

    try:
        service.create_task(
            CodexControlTaskCreateRequest(
                title="Missing scope",
                summary="This should fail without scope paths.",
                priority=80,
                scope_paths=[],
            )
        )
    except ValueError as exc:
        assert "At least one scope path is required" in str(exc)
    else:
        raise AssertionError("Expected create_task to reject missing scope paths.")


def test_create_task_invokes_mission_control_with_scope_paths(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir()
    mission_control_script = scripts_dir / "mission_control.py"
    mission_control_script.write_text("# placeholder\n", encoding="utf-8")

    service = CodexControlService(repo_root=repo_root, python_executable="python-test")
    captured_command: list[str] | None = None

    def fake_run(command: list[str], *, cwd: Path | None = None) -> str:
        nonlocal captured_command
        captured_command = command
        return json.dumps(
            {
                "status": "ok",
                "task": {
                    "task_id": "builder-task",
                    "title": "Builder task",
                    "summary": "Add builder coordination",
                    "priority": 95,
                    "status": "pending",
                    "scope_paths": ["frontend/src/components/workspaces"],
                    "recommended_branch_prefix": "codex/worker",
                    "claimed_by_worker_id": None,
                    "blockers": [],
                    "claimed_at": None,
                    "updated_at": "2026-04-22T10:10:00Z",
                    "completed_at": None,
                },
                "board_json_path": str(repo_root / ".git" / "codex-mission-control" / "latest-board.json"),
                "board_text_path": str(repo_root / ".git" / "codex-mission-control" / "latest-board.txt"),
            }
        )

    service._run_command = fake_run  # type: ignore[method-assign]

    response = service.create_task(
        CodexControlTaskCreateRequest(
            title="Builder task",
            summary="Add builder coordination",
            priority=95,
            branch_prefix="codex/worker",
            scope_paths=["frontend/src/components/workspaces"],
        )
    )

    assert captured_command is not None
    assert captured_command[:4] == [
        "python-test",
        str(mission_control_script),
        "--json",
        "add-task",
    ]
    assert "--scope-path" in captured_command
    assert "--branch-prefix" in captured_command
    assert response.task.task_id == "builder-task"
    assert response.task.scope_paths == ["frontend/src/components/workspaces"]


def test_supersede_task_invokes_mission_control_with_expected_args(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir()
    mission_control_script = scripts_dir / "mission_control.py"
    mission_control_script.write_text("# placeholder\n", encoding="utf-8")

    service = CodexControlService(repo_root=repo_root, python_executable="python-test")
    captured_command: list[str] | None = None

    def fake_run(command: list[str], *, cwd: Path | None = None) -> str:
        nonlocal captured_command
        captured_command = command
        return json.dumps(
            {
                "status": "ok",
                "superseded_task": {
                    "task_id": "builder-task",
                    "title": "Current Builder slice",
                    "summary": "Working on a lower-priority slice.",
                    "priority": 90,
                    "status": "blocked",
                    "scope_paths": ["frontend/src/components/workspaces"],
                    "recommended_branch_prefix": "codex/worker",
                    "claimed_by_worker_id": "builder-alpha",
                    "blockers": [],
                    "claimed_at": "2026-04-22T16:00:00Z",
                    "updated_at": "2026-04-22T16:10:00Z",
                    "completed_at": None,
                    "superseded_by_task_id": "builder-urgent-override",
                    "superseded_at": "2026-04-22T16:10:00Z",
                    "supersede_reason": "Urgent production issue.",
                },
                "replacement_task": {
                    "task_id": "builder-urgent-override",
                    "title": "Urgent Builder override",
                    "summary": "Handle the urgent slice now.",
                    "priority": 250,
                    "status": "in_progress",
                    "scope_paths": ["frontend/src/components/workspaces"],
                    "recommended_branch_prefix": "codex/worker",
                    "claimed_by_worker_id": "builder-alpha",
                    "blockers": [],
                    "claimed_at": "2026-04-22T16:10:00Z",
                    "updated_at": "2026-04-22T16:10:00Z",
                    "completed_at": None,
                    "superseded_by_task_id": None,
                    "superseded_at": None,
                    "supersede_reason": None,
                },
                "stopped_terminal_session": {
                    "session_id": "terminal-builder-alpha-001",
                    "worker_id": "builder-alpha",
                    "task_id": "builder-task",
                    "label": "Builder dev server",
                    "cwd": str(repo_root),
                    "command": ["python", "-m", "http.server", "9000"],
                    "status": "stopped",
                    "pid": 4242,
                    "log_path": str(repo_root / ".git" / "terminal.log"),
                    "created_at": "2026-04-22T16:00:00Z",
                    "started_at": "2026-04-22T16:00:00Z",
                    "updated_at": "2026-04-22T16:10:00Z",
                    "exited_at": "2026-04-22T16:10:00Z",
                    "stop_requested_at": "2026-04-22T16:10:00Z",
                    "stop_requested_by": "builder-alpha",
                    "stop_reason": "Urgent override superseded task builder-task with builder-urgent-override.",
                    "tail_preview": ["stopping now"],
                },
                "notified_workers": ["builder-alpha", "builder-beta"],
                "board_json_path": str(repo_root / ".git" / "codex-mission-control" / "latest-board.json"),
                "board_text_path": str(repo_root / ".git" / "codex-mission-control" / "latest-board.txt"),
            }
        )

    service._run_command = fake_run  # type: ignore[method-assign]

    response = service.supersede_task(
        task_id="builder-task",
        request=CodexControlTaskSupersedeRequest(
            worker_id="builder-alpha",
            replacement_title="Urgent Builder override",
            replacement_summary="Handle the urgent slice now.",
            replacement_priority=250,
            replacement_scope_paths=["frontend/src/components/workspaces"],
            replacement_branch_prefix="codex/worker",
            replacement_task_id="builder-urgent-override",
            supersede_reason="Urgent production issue.",
            requested_by="builder-alpha",
            stop_active_terminal=False,
        ),
    )

    assert captured_command is not None
    assert captured_command[:4] == [
        "python-test",
        str(mission_control_script),
        "--json",
        "supersede-task",
    ]
    assert "--worker-id" in captured_command
    assert "--task-id" in captured_command
    assert "--replacement-title" in captured_command
    assert "--replacement-summary" in captured_command
    assert "--replacement-priority" in captured_command
    assert "--replacement-scope-path" in captured_command
    assert "--replacement-branch-prefix" in captured_command
    assert "--replacement-task-id" in captured_command
    assert "--supersede-reason" in captured_command
    assert "--requested-by" in captured_command
    assert "--keep-active-terminal" in captured_command
    assert response.superseded_task.superseded_by_task_id == "builder-urgent-override"
    assert response.replacement_task.claimed_by_worker_id == "builder-alpha"
    assert response.notified_workers == ["builder-alpha", "builder-beta"]


def test_next_task_parses_blocked_decision_and_waiter(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir()
    mission_control_script = scripts_dir / "mission_control.py"
    mission_control_script.write_text("# placeholder\n", encoding="utf-8")

    service = CodexControlService(repo_root=repo_root, python_executable="python-test")
    captured_command: list[str] | None = None

    def fake_run(command: list[str], *, cwd: Path | None = None) -> str:
        nonlocal captured_command
        captured_command = command
        return json.dumps(
            {
                "status": "ok",
                "decision": "waiting",
                "task": {
                    "task_id": "builder-task",
                    "title": "Builder task",
                    "summary": "Add builder coordination",
                    "priority": 95,
                    "status": "pending",
                    "scope_paths": ["frontend/src/components/workspaces"],
                    "recommended_branch_prefix": "codex/worker",
                    "claimed_by_worker_id": None,
                    "blockers": ["active-scope"],
                    "claimed_at": None,
                    "updated_at": "2026-04-22T10:10:00Z",
                    "completed_at": None,
                },
                "blockers": [
                    {
                        "task_id": "active-scope",
                        "title": "Active scope",
                        "summary": "Busy scope",
                        "priority": 100,
                        "status": "in_progress",
                        "scope_paths": ["frontend/src/components"],
                        "recommended_branch_prefix": None,
                        "claimed_by_worker_id": "mission-control",
                        "blockers": [],
                        "claimed_at": "2026-04-22T10:05:00Z",
                        "updated_at": "2026-04-22T10:06:00Z",
                        "completed_at": None,
                    }
                ],
                "waiter": {
                    "waiter_id": 7,
                    "worker_id": "builder-alpha",
                    "task_id": "builder-task",
                    "reason": "waiting for active scope",
                    "status": "waiting",
                    "created_at": "2026-04-22T10:11:00Z",
                    "updated_at": "2026-04-22T10:11:00Z",
                    "notified_at": None,
                },
            }
        )

    service._run_command = fake_run  # type: ignore[method-assign]

    response = service.next_task(
        CodexControlNextTaskRequest(
            worker_id="builder-alpha",
            wait=True,
            wait_reason="waiting for active scope",
        )
    )

    assert captured_command is not None
    assert captured_command[:4] == [
        "python-test",
        str(mission_control_script),
        "--json",
        "next-task",
    ]
    assert "--wait" in captured_command
    assert "--wait-reason" in captured_command
    assert response.decision == "waiting"
    assert response.task is not None
    assert response.task.task_id == "builder-task"
    assert response.waiter is not None
    assert response.waiter.worker_id == "builder-alpha"
    assert response.blockers[0].task_id == "active-scope"


def test_mark_notifications_read_returns_notification_records(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir()
    mission_control_script = scripts_dir / "mission_control.py"
    mission_control_script.write_text("# placeholder\n", encoding="utf-8")

    service = CodexControlService(repo_root=repo_root, python_executable="python-test")
    captured_command: list[str] | None = None

    def fake_run(command: list[str], *, cwd: Path | None = None) -> str:
        nonlocal captured_command
        captured_command = command
        return json.dumps(
            {
                "status": "ok",
                "notifications": [
                    {
                        "notification_id": 3,
                        "worker_id": "builder-alpha",
                        "task_id": "builder-task",
                        "kind": "task-ready",
                        "status": "unread",
                        "message": "Task ready to claim.",
                        "created_at": "2026-04-22T10:12:00Z",
                        "read_at": None,
                    }
                ],
            }
        )

    service._run_command = fake_run  # type: ignore[method-assign]

    response = service.mark_notifications_read(worker_id="builder-alpha")

    assert captured_command is not None
    assert captured_command[:4] == [
        "python-test",
        str(mission_control_script),
        "--json",
        "notifications",
    ]
    assert "--all" in captured_command
    assert "--mark-read" in captured_command
    assert response.notifications[0].worker_id == "builder-alpha"


def test_launch_terminal_invokes_mission_control_with_expected_args(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir()
    mission_control_script = scripts_dir / "mission_control.py"
    mission_control_script.write_text("# placeholder\n", encoding="utf-8")

    service = CodexControlService(repo_root=repo_root, python_executable="python-test")
    captured_command: list[str] | None = None

    def fake_run(command: list[str], *, cwd: Path | None = None) -> str:
        nonlocal captured_command
        captured_command = command
        return json.dumps(
            {
                "status": "ok",
                "terminal_session": {
                    "session_id": "terminal-builder-alpha-001",
                    "worker_id": "builder-alpha",
                    "task_id": "builder-task",
                    "label": "Builder dev server",
                    "cwd": str(repo_root),
                    "command": ["python", "-m", "http.server", "9000"],
                    "status": "running",
                    "pid": 4242,
                    "log_path": str(repo_root / ".git" / "terminal.log"),
                    "created_at": "2026-04-22T12:00:00Z",
                    "started_at": "2026-04-22T12:00:00Z",
                    "updated_at": "2026-04-22T12:00:00Z",
                    "exited_at": None,
                    "stop_requested_at": None,
                    "stop_requested_by": None,
                    "stop_reason": None,
                    "tail_preview": [],
                },
            }
        )

    service._run_command = fake_run  # type: ignore[method-assign]

    response = service.launch_terminal(
        CodexControlTerminalLaunchRequest(
            worker_id="builder-alpha",
            label="Builder dev server",
            command=["python", "-m", "http.server", "9000"],
            cwd=str(repo_root),
            task_id="builder-task",
        )
    )

    assert captured_command is not None
    assert captured_command[:4] == [
        "python-test",
        str(mission_control_script),
        "--json",
        "launch-terminal",
    ]
    assert "--worker-id" in captured_command
    assert "--label" in captured_command
    assert "--command-json" in captured_command
    assert "--cwd" in captured_command
    assert "--task-id" in captured_command
    assert response.terminal_session.worker_id == "builder-alpha"
    assert response.terminal_session.status == "running"


def test_stop_terminal_invokes_mission_control_with_expected_args(tmp_path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir()
    mission_control_script = scripts_dir / "mission_control.py"
    mission_control_script.write_text("# placeholder\n", encoding="utf-8")

    service = CodexControlService(repo_root=repo_root, python_executable="python-test")
    captured_command: list[str] | None = None

    def fake_run(command: list[str], *, cwd: Path | None = None) -> str:
        nonlocal captured_command
        captured_command = command
        return json.dumps(
            {
                "status": "ok",
                "terminal_session": {
                    "session_id": "terminal-builder-alpha-001",
                    "worker_id": "builder-alpha",
                    "task_id": "builder-task",
                    "label": "Builder dev server",
                    "cwd": str(repo_root),
                    "command": ["python", "-m", "http.server", "9000"],
                    "status": "stopped",
                    "pid": 4242,
                    "log_path": str(repo_root / ".git" / "terminal.log"),
                    "created_at": "2026-04-22T12:00:00Z",
                    "started_at": "2026-04-22T12:00:00Z",
                    "updated_at": "2026-04-22T12:05:00Z",
                    "exited_at": "2026-04-22T12:05:00Z",
                    "stop_requested_at": "2026-04-22T12:05:00Z",
                    "stop_requested_by": "builder-alpha",
                    "stop_reason": "Urgent override requested from Builder.",
                    "tail_preview": ["stopping now"],
                },
            }
        )

    service._run_command = fake_run  # type: ignore[method-assign]

    response = service.stop_terminal(
        session_id="terminal-builder-alpha-001",
        request=CodexControlTerminalStopRequest(
            requested_by="builder-alpha",
            reason="Urgent override requested from Builder.",
            force=True,
        ),
    )

    assert captured_command is not None
    assert captured_command[:4] == [
        "python-test",
        str(mission_control_script),
        "--json",
        "stop-terminal",
    ]
    assert "--session-id" in captured_command
    assert "--requested-by" in captured_command
    assert "--reason" in captured_command
    assert "--force" in captured_command
    assert response.terminal_session.session_id == "terminal-builder-alpha-001"
    assert response.terminal_session.status == "stopped"
