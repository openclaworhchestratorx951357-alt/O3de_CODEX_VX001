from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from app.models.api import (
    CodexControlBoardStatus,
    CodexControlLaneCreateRequest,
    CodexControlLaneCreateResponse,
    CodexControlNotificationCreateRequest,
    CodexControlNotification,
    CodexControlNotificationsResponse,
    CodexControlNextTaskRequest,
    CodexControlNextTaskResponse,
    CodexControlStatusResponse,
    CodexControlTerminalLaunchRequest,
    CodexControlTerminalSession,
    CodexControlTerminalSessionResponse,
    CodexControlTerminalStopRequest,
    CodexControlTaskActionRequest,
    CodexControlTaskCreateRequest,
    CodexControlTaskSupersedeRequest,
    CodexControlTaskSupersedeResponse,
    CodexControlTask,
    CodexControlTaskResponse,
    CodexControlTaskWaitRequest,
    CodexControlWaiter,
    CodexControlWaiterResponse,
    CodexControlWorker,
    CodexControlWorkerHeartbeatRequest,
    CodexControlWorkerResponse,
    CodexControlWorkerSyncRequest,
    CodexControlWorktree,
    CodexHarnessStatus,
)

RECOMMENDED_BASE_BRANCH = "codex/control-plane/o3de-thread-launchpad-stable"
MISSION_CONTROL_STATE_DIR_NAME = "codex-mission-control"


class CodexControlService:
    def __init__(self, *, repo_root: Path | None = None, python_executable: str | None = None):
        self.repo_root = (repo_root or Path(__file__).resolve().parents[3]).resolve()
        self.python_executable = python_executable or sys.executable

    @property
    def mission_control_script_path(self) -> Path:
        return self.repo_root / "scripts" / "mission_control.py"

    @property
    def mission_control_wrapper_path(self) -> Path:
        return self.repo_root / "scripts" / "mission_control.ps1"

    def _run_command(self, command: list[str], *, cwd: Path | None = None) -> str:
        result = subprocess.run(
            command,
            cwd=str(cwd or self.repo_root),
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            details = result.stderr.strip() or result.stdout.strip() or f"exit code {result.returncode}"
            raise ValueError(details)
        return result.stdout.strip()

    def _git_common_dir(self) -> Path:
        output = self._run_command(
            ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
            cwd=self.repo_root,
        )
        return Path(output).resolve()

    def _current_branch(self) -> str | None:
        branch_name = self._run_command(["git", "branch", "--show-current"], cwd=self.repo_root)
        return branch_name or None

    def _paths_match(self, left: str, right: str) -> bool:
        try:
            return Path(left).resolve() == Path(right).resolve()
        except OSError:
            return left.rstrip("\\/").lower() == right.rstrip("\\/").lower()

    def _parse_worktree_list(self, output: str) -> list[CodexControlWorktree]:
        entries: list[dict[str, object]] = []
        current: dict[str, object] = {}
        for raw_line in output.splitlines():
            line = raw_line.strip()
            if not line:
                if current:
                    entries.append(current)
                    current = {}
                continue
            key, _, remainder = line.partition(" ")
            value = remainder.strip()
            if key == "worktree":
                current["path"] = value
            elif key == "HEAD":
                current["head"] = value
            elif key == "branch":
                current["branch_name"] = value.removeprefix("refs/heads/")
            elif key in {"bare", "detached", "locked", "prunable"}:
                current[key] = True

        if current:
            entries.append(current)

        worktrees: list[CodexControlWorktree] = []
        for entry in entries:
            path = str(entry.get("path") or "")
            if not path:
                continue
            worktrees.append(
                CodexControlWorktree(
                    path=path,
                    branch_name=entry.get("branch_name") if isinstance(entry.get("branch_name"), str) else None,
                    head=entry.get("head") if isinstance(entry.get("head"), str) else None,
                    bare=bool(entry.get("bare", False)),
                    detached=bool(entry.get("detached", False)),
                    locked=bool(entry.get("locked", False)),
                    prunable=bool(entry.get("prunable", False)),
                    is_current_repo=self._paths_match(path, str(self.repo_root)),
                )
            )
        return worktrees

    def _list_worktrees(self) -> list[CodexControlWorktree]:
        output = self._run_command(["git", "worktree", "list", "--porcelain"], cwd=self.repo_root)
        return self._parse_worktree_list(output)

    def _run_mission_control_command(self, arguments: list[str]) -> dict:
        if not self.mission_control_script_path.exists():
            raise ValueError(
                "Mission control tooling is unavailable because scripts/mission_control.py is missing."
            )

        command = [
            self.python_executable,
            str(self.mission_control_script_path),
            "--json",
            *arguments,
        ]
        output = self._run_command(command, cwd=self.repo_root)
        try:
            payload = json.loads(output)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Mission control returned non-JSON output for {' '.join(arguments)}: {exc}"
            ) from exc
        if not isinstance(payload, dict):
            raise ValueError(
                f"Mission control returned an unexpected payload shape for {' '.join(arguments)}."
            )
        return payload

    def _load_board(
        self,
        *,
        board_json_path: Path,
        board_text_path: Path,
    ) -> tuple[CodexControlBoardStatus, list[str]]:
        notes: list[str] = []
        if not board_json_path.exists():
            return (
                CodexControlBoardStatus(
                    available=False,
                    board_json_path=str(board_json_path),
                    board_text_path=str(board_text_path),
                ),
                notes,
            )

        try:
            payload = json.loads(board_json_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            notes.append(f"Mission control board could not be read cleanly: {exc}")
            return (
                CodexControlBoardStatus(
                    available=False,
                    board_json_path=str(board_json_path),
                    board_text_path=str(board_text_path),
                ),
                notes,
            )

        workers = [CodexControlWorker(**worker) for worker in payload.get("workers", [])]
        tasks = [CodexControlTask(**task) for task in payload.get("tasks", [])]
        waiters = [CodexControlWaiter(**waiter) for waiter in payload.get("waiters", [])]
        notifications = [
            CodexControlNotification(**notification)
            for notification in payload.get("notifications", [])
        ]
        terminal_sessions = [
            CodexControlTerminalSession(**terminal_session)
            for terminal_session in payload.get("terminal_sessions", [])
        ]
        return (
            CodexControlBoardStatus(
                available=True,
                generated_at=payload.get("generated_at"),
                repo_root=payload.get("repo_root"),
                state_dir=payload.get("state_dir"),
                board_json_path=str(board_json_path),
                board_text_path=str(board_text_path),
                workers=workers,
                tasks=tasks,
                waiters=waiters,
                notifications=notifications,
                terminal_sessions=terminal_sessions,
            ),
            notes,
        )

    def _build_harnesses(self, *, mission_control_available: bool) -> list[CodexHarnessStatus]:
        return [
            CodexHarnessStatus(
                harness_id="manual_handoff",
                label="Manual handoff",
                configured=mission_control_available,
                status="ready" if mission_control_available else "unavailable",
                detail=(
                    "The app can surface repo worktrees, mission-control lanes, and lane creation now. "
                    "Actual Codex task execution still expects an operator handoff through Codex Desktop."
                ),
                notes=[
                    "Keep the control-plane repo as the orchestration substrate.",
                    "Use launchpad-based worktrees to avoid stale ports and cross-thread collisions.",
                ],
            ),
            CodexHarnessStatus(
                harness_id="codex_sdk",
                label="Codex SDK",
                configured=False,
                status="not-configured",
                detail=(
                    "A supported SDK-backed automation surface is not wired in this slice. "
                    "This workspace is preparing the repo-side control surface first."
                ),
                notes=[],
            ),
            CodexHarnessStatus(
                harness_id="codex_app_server",
                label="Codex App Server",
                configured=False,
                status="not-configured",
                detail=(
                    "No repo-owned App Server integration is configured yet. "
                    "Treat current builder operations as control-plane scaffolding, not autonomous Codex execution."
                ),
                notes=[],
            ),
        ]

    def get_status(self) -> CodexControlStatusResponse:
        git_common_dir = self._git_common_dir()
        state_dir = git_common_dir / MISSION_CONTROL_STATE_DIR_NAME
        board_json_path = state_dir / "latest-board.json"
        board_text_path = state_dir / "latest-board.txt"
        board, board_notes = self._load_board(
            board_json_path=board_json_path,
            board_text_path=board_text_path,
        )
        mission_control_available = self.mission_control_script_path.exists()
        notes = list(board_notes)

        if mission_control_available and not board.available:
            notes.append(
                "Mission control tooling is present, but no shared board snapshot is available yet. "
                "Create or sync a lane to seed the board."
            )
        if not mission_control_available:
            notes.append("Mission control script is missing, so builder automation cannot create or inspect lanes.")

        worktrees = self._list_worktrees()
        return CodexControlStatusResponse(
            repo_root=str(self.repo_root),
            git_common_dir=str(git_common_dir),
            current_branch=self._current_branch(),
            mission_control_script_path=str(self.mission_control_script_path),
            mission_control_wrapper_path=(
                str(self.mission_control_wrapper_path)
                if self.mission_control_wrapper_path.exists()
                else None
            ),
            mission_control_available=mission_control_available,
            recommended_base_branch=RECOMMENDED_BASE_BRANCH,
            board=board,
            worktrees=worktrees,
            harnesses=self._build_harnesses(mission_control_available=mission_control_available),
            notes=notes,
        )

    def create_lane(self, request: CodexControlLaneCreateRequest) -> CodexControlLaneCreateResponse:
        arguments = [
            "create-lane",
            "--worker-id",
            request.worker_id,
        ]
        if request.display_name:
            arguments.extend(["--display-name", request.display_name])
        if request.branch_name:
            arguments.extend(["--branch-name", request.branch_name])
        if request.worktree_path:
            arguments.extend(["--worktree-path", request.worktree_path])
        if request.base_branch:
            arguments.extend(["--base-branch", request.base_branch])
        if not request.bootstrap:
            arguments.append("--no-bootstrap")

        payload = self._run_mission_control_command(arguments)

        return CodexControlLaneCreateResponse(
            status=str(payload.get("status") or "ok"),
            worker=CodexControlWorker(**payload["worker"]),
            worktree_path=str(payload["worktree_path"]),
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def sync_worker(self, request: CodexControlWorkerSyncRequest) -> CodexControlWorkerResponse:
        arguments = [
            "sync-worker",
            "--worker-id",
            request.worker_id,
            "--status",
            request.status,
        ]
        if request.display_name:
            arguments.extend(["--display-name", request.display_name])
        if request.branch_name:
            arguments.extend(["--branch-name", request.branch_name])
        if request.worktree_path:
            arguments.extend(["--worktree-path", request.worktree_path])
        if request.base_branch:
            arguments.extend(["--base-branch", request.base_branch])
        if request.summary:
            arguments.extend(["--summary", request.summary])

        payload = self._run_mission_control_command(arguments)
        return CodexControlWorkerResponse(
            status=str(payload.get("status") or "ok"),
            worker=CodexControlWorker(**payload["worker"]),
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def heartbeat_worker(
        self,
        *,
        worker_id: str,
        request: CodexControlWorkerHeartbeatRequest,
    ) -> CodexControlWorkerResponse:
        arguments = ["heartbeat", "--worker-id", worker_id]
        if request.status:
            arguments.extend(["--status", request.status])
        if request.summary:
            arguments.extend(["--summary", request.summary])
        if request.current_task_id:
            arguments.extend(["--current-task-id", request.current_task_id])
        if request.branch_name:
            arguments.extend(["--branch-name", request.branch_name])
        if request.worktree_path:
            arguments.extend(["--worktree-path", request.worktree_path])
        if request.base_branch:
            arguments.extend(["--base-branch", request.base_branch])

        payload = self._run_mission_control_command(arguments)
        return CodexControlWorkerResponse(
            status=str(payload.get("status") or "ok"),
            worker=CodexControlWorker(**payload["worker"]),
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def create_task(self, request: CodexControlTaskCreateRequest) -> CodexControlTaskResponse:
        if not request.scope_paths:
            raise ValueError("At least one scope path is required before creating a mission-control task.")

        arguments = [
            "add-task",
            "--title",
            request.title,
            "--summary",
            request.summary,
            "--priority",
            str(request.priority),
        ]
        if request.branch_prefix:
            arguments.extend(["--branch-prefix", request.branch_prefix])
        for scope_path in request.scope_paths:
            arguments.extend(["--scope-path", scope_path])

        payload = self._run_mission_control_command(arguments)
        return CodexControlTaskResponse(
            status=str(payload.get("status") or "ok"),
            task=CodexControlTask(**payload["task"]),
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def claim_task(
        self,
        *,
        task_id: str,
        request: CodexControlTaskActionRequest,
    ) -> CodexControlTaskResponse:
        payload = self._run_mission_control_command(
            ["claim-task", "--worker-id", request.worker_id, "--task-id", task_id]
        )
        return CodexControlTaskResponse(
            status=str(payload.get("status") or "ok"),
            task=CodexControlTask(**payload["task"]),
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def release_task(
        self,
        *,
        task_id: str,
        request: CodexControlTaskActionRequest,
    ) -> CodexControlTaskResponse:
        payload = self._run_mission_control_command(
            ["release-task", "--worker-id", request.worker_id, "--task-id", task_id]
        )
        return CodexControlTaskResponse(
            status=str(payload.get("status") or "ok"),
            task=CodexControlTask(**payload["task"]),
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def complete_task(
        self,
        *,
        task_id: str,
        request: CodexControlTaskActionRequest,
    ) -> CodexControlTaskResponse:
        payload = self._run_mission_control_command(
            ["complete-task", "--worker-id", request.worker_id, "--task-id", task_id]
        )
        task_payload = dict(payload["task"])
        task_payload.pop("released_waiters", None)
        return CodexControlTaskResponse(
            status=str(payload.get("status") or "ok"),
            task=CodexControlTask(**task_payload),
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def supersede_task(
        self,
        *,
        task_id: str,
        request: CodexControlTaskSupersedeRequest,
    ) -> CodexControlTaskSupersedeResponse:
        arguments = [
            "supersede-task",
            "--worker-id",
            request.worker_id,
            "--task-id",
            task_id,
            "--replacement-title",
            request.replacement_title,
            "--replacement-summary",
            request.replacement_summary,
            "--replacement-priority",
            str(request.replacement_priority),
            "--supersede-reason",
            request.supersede_reason,
        ]
        for scope_path in request.replacement_scope_paths:
            arguments.extend(["--replacement-scope-path", scope_path])
        if request.replacement_branch_prefix:
            arguments.extend(["--replacement-branch-prefix", request.replacement_branch_prefix])
        if request.replacement_task_id:
            arguments.extend(["--replacement-task-id", request.replacement_task_id])
        if request.requested_by:
            arguments.extend(["--requested-by", request.requested_by])
        if not request.stop_active_terminal:
            arguments.append("--keep-active-terminal")

        payload = self._run_mission_control_command(arguments)
        return CodexControlTaskSupersedeResponse(
            status=str(payload.get("status") or "ok"),
            superseded_task=CodexControlTask(**payload["superseded_task"]),
            replacement_task=CodexControlTask(**payload["replacement_task"]),
            stopped_terminal_session=CodexControlTerminalSession(**payload["stopped_terminal_session"])
            if isinstance(payload.get("stopped_terminal_session"), dict)
            else None,
            notified_workers=[
                str(worker_id)
                for worker_id in payload.get("notified_workers", [])
                if isinstance(worker_id, str)
            ],
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def wait_for_task(
        self,
        *,
        task_id: str,
        request: CodexControlTaskWaitRequest,
    ) -> CodexControlWaiterResponse:
        payload = self._run_mission_control_command(
            [
                "wait-task",
                "--worker-id",
                request.worker_id,
                "--task-id",
                task_id,
                "--reason",
                request.reason,
            ]
        )
        return CodexControlWaiterResponse(
            status=str(payload.get("status") or "ok"),
            waiter=CodexControlWaiter(**payload["waiter"]),
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def next_task(self, request: CodexControlNextTaskRequest) -> CodexControlNextTaskResponse:
        arguments = ["next-task", "--worker-id", request.worker_id]
        if request.claim:
            arguments.append("--claim")
        if request.wait:
            arguments.append("--wait")
        if request.wait_reason:
            arguments.extend(["--wait-reason", request.wait_reason])

        payload = self._run_mission_control_command(arguments)
        return CodexControlNextTaskResponse(
            status=str(payload.get("status") or "ok"),
            decision=str(payload.get("decision") or "none"),
            task=CodexControlTask(**payload["task"]) if isinstance(payload.get("task"), dict) else None,
            blockers=[
                CodexControlTask(**blocker)
                for blocker in payload.get("blockers", [])
                if isinstance(blocker, dict)
            ],
            waiter=CodexControlWaiter(**payload["waiter"])
            if isinstance(payload.get("waiter"), dict)
            else None,
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def list_notifications(
        self,
        *,
        worker_id: str,
        include_all: bool,
    ) -> CodexControlNotificationsResponse:
        arguments = ["notifications", "--worker-id", worker_id]
        if include_all:
            arguments.append("--all")
        payload = self._run_mission_control_command(arguments)
        return CodexControlNotificationsResponse(
            status=str(payload.get("status") or "ok"),
            notifications=[
                CodexControlNotification(**notification)
                for notification in payload.get("notifications", [])
                if isinstance(notification, dict)
            ],
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def mark_notifications_read(self, *, worker_id: str) -> CodexControlNotificationsResponse:
        payload = self._run_mission_control_command(
            ["notifications", "--worker-id", worker_id, "--all", "--mark-read"]
        )
        return CodexControlNotificationsResponse(
            status=str(payload.get("status") or "ok"),
            notifications=[
                CodexControlNotification(**notification)
                for notification in payload.get("notifications", [])
                if isinstance(notification, dict)
            ],
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def notify_worker(
        self,
        *,
        worker_id: str,
        request: CodexControlNotificationCreateRequest,
    ) -> CodexControlNotificationsResponse:
        arguments = [
            "notify-worker",
            "--worker-id",
            worker_id,
            "--kind",
            request.kind,
            "--message",
            request.message,
        ]
        if request.task_id:
            arguments.extend(["--task-id", request.task_id])
        payload = self._run_mission_control_command(arguments)
        return CodexControlNotificationsResponse(
            status=str(payload.get("status") or "ok"),
            notifications=[
                CodexControlNotification(**notification)
                for notification in payload.get("notifications", [])
                if isinstance(notification, dict)
            ],
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def launch_terminal(
        self,
        request: CodexControlTerminalLaunchRequest,
    ) -> CodexControlTerminalSessionResponse:
        if not request.command:
            raise ValueError("A managed worker terminal requires at least one command argument.")

        arguments = [
            "launch-terminal",
            "--worker-id",
            request.worker_id,
            "--label",
            request.label,
            "--command-json",
            json.dumps(request.command),
        ]
        if request.cwd:
            arguments.extend(["--cwd", request.cwd])
        if request.task_id:
            arguments.extend(["--task-id", request.task_id])

        payload = self._run_mission_control_command(arguments)
        return CodexControlTerminalSessionResponse(
            status=str(payload.get("status") or "ok"),
            terminal_session=CodexControlTerminalSession(**payload["terminal_session"]),
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )

    def stop_terminal(
        self,
        *,
        session_id: str,
        request: CodexControlTerminalStopRequest,
    ) -> CodexControlTerminalSessionResponse:
        arguments = ["stop-terminal", "--session-id", session_id]
        if request.requested_by:
            arguments.extend(["--requested-by", request.requested_by])
        if request.reason:
            arguments.extend(["--reason", request.reason])
        if request.force:
            arguments.append("--force")

        payload = self._run_mission_control_command(arguments)
        return CodexControlTerminalSessionResponse(
            status=str(payload.get("status") or "ok"),
            terminal_session=CodexControlTerminalSession(**payload["terminal_session"]),
            board_json_path=payload.get("board_json_path"),
            board_text_path=payload.get("board_text_path"),
        )


codex_control_service = CodexControlService()
