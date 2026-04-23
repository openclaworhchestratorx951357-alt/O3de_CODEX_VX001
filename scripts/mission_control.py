from __future__ import annotations

import argparse
import json
import os
import sqlite3
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

if os.name == "nt":
    import ctypes
    from ctypes import wintypes
else:
    import signal


DEFAULT_BASE_BRANCH = "codex/control-plane/o3de-thread-launchpad-stable"
DEFAULT_STATE_DIR_NAME = "codex-mission-control"
DEFAULT_DB_NAME = "mission-control.sqlite3"
DEFAULT_BOARD_JSON_NAME = "latest-board.json"
DEFAULT_BOARD_TEXT_NAME = "latest-board.txt"

ACTIVE_TASK_STATUSES = {"in_progress", "blocked", "review"}
WAIT_STATUSES = {"waiting", "ready", "consumed", "cancelled"}
NOTIFICATION_STATUSES = {"unread", "read"}
WORKER_STATUSES = {"idle", "active", "blocked", "review"}
TASK_STATUSES = {"pending", "in_progress", "blocked", "review", "completed"}
TERMINAL_SESSION_STATUSES = {"running", "stopping", "stopped", "exited", "failed"}
WINDOWS_CREATE_NEW_CONSOLE = 0x00000010
WINDOWS_CREATE_NEW_PROCESS_GROUP = 0x00000200
DEFAULT_WORKER_CAPABILITY_TAGS = ("repo_read", "mission_control")
SUPPORTED_WORKER_CAPABILITY_TAGS = {
    "repo_read",
    "repo_edit",
    "frontend_ui",
    "backend_api",
    "o3de_bridge",
    "mission_control",
    "proof_validation",
    "docs_runbook",
    "terminal_observe",
    "terminal_control",
    "artifact_review",
    "source_upload_context",
}


class MissionControlError(RuntimeError):
    """Raised when mission control cannot complete a requested action."""


def normalize_worker_capability_tag(value: str) -> str:
    return value.strip().lower().replace("-", "_").replace(" ", "_")


def normalize_worker_capability_tags(values: Iterable[str] | None) -> list[str]:
    tags: list[str] = []
    for value in values or []:
        tag = normalize_worker_capability_tag(value)
        if not tag:
            continue
        if tag not in SUPPORTED_WORKER_CAPABILITY_TAGS:
            supported = ", ".join(sorted(SUPPORTED_WORKER_CAPABILITY_TAGS))
            raise MissionControlError(f"Unsupported worker capability '{value}'. Supported tags: {supported}.")
        if tag not in tags:
            tags.append(tag)
    return tags


def parse_worker_capability_tags(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return normalize_worker_capability_tags(str(entry) for entry in parsed)


def normalize_context_sources(values: Iterable[str] | None) -> list[str]:
    sources: list[str] = []
    for value in values or []:
        source = value.strip()
        if source and source not in sources:
            sources.append(source)
    return sources


def parse_context_sources(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return normalize_context_sources(str(entry) for entry in parsed)


@dataclass(frozen=True)
class Context:
    cwd: Path
    repo_root: Path
    git_common_dir: Path
    state_dir: Path
    db_path: Path
    board_json_path: Path
    board_text_path: Path


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def is_windows() -> bool:
    return os.name == "nt"


def slugify(value: str) -> str:
    cleaned: list[str] = []
    for char in value.strip().lower():
        if char.isalnum():
            cleaned.append(char)
        elif cleaned and cleaned[-1] != "-":
            cleaned.append("-")
    slug = "".join(cleaned).strip("-")
    return slug or "worker"


def normalize_scope_path(value: str) -> str:
    normalized = value.replace("\\", "/").strip()
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized.strip("/")


def normalize_scope_paths(values: Iterable[str]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = normalize_scope_path(value)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(normalized)
    return ordered


def scopes_overlap(left: Iterable[str], right: Iterable[str]) -> bool:
    left_scopes = normalize_scope_paths(left)
    right_scopes = normalize_scope_paths(right)
    for left_scope in left_scopes:
        for right_scope in right_scopes:
            if left_scope == right_scope:
                return True
            if left_scope.startswith(right_scope + "/"):
                return True
            if right_scope.startswith(left_scope + "/"):
                return True
    return False


def run_command(command: list[str], *, cwd: Path) -> str:
    result = subprocess.run(
        command,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        details = result.stderr.strip() or result.stdout.strip() or f"exit code {result.returncode}"
        raise MissionControlError(f"Command failed: {' '.join(command)} :: {details}")
    return result.stdout.strip()


def detect_context(*, cwd: Path, state_dir_override: str | None) -> Context:
    repo_root = Path(run_command(["git", "rev-parse", "--show-toplevel"], cwd=cwd)).resolve()
    git_common_dir = Path(
        run_command(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], cwd=cwd)
    ).resolve()
    if state_dir_override:
        state_dir = Path(state_dir_override).expanduser().resolve()
    else:
        state_dir = git_common_dir / DEFAULT_STATE_DIR_NAME
    state_dir.mkdir(parents=True, exist_ok=True)
    return Context(
        cwd=cwd,
        repo_root=repo_root,
        git_common_dir=git_common_dir,
        state_dir=state_dir,
        db_path=state_dir / DEFAULT_DB_NAME,
        board_json_path=state_dir / DEFAULT_BOARD_JSON_NAME,
        board_text_path=state_dir / DEFAULT_BOARD_TEXT_NAME,
    )


def connect_db(context: Context) -> sqlite3.Connection:
    conn = sqlite3.connect(str(context.db_path), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS workers (
            worker_id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            agent_profile TEXT,
            identity_notes TEXT,
            personality_notes TEXT,
            soul_directive TEXT,
            memory_notes TEXT,
            bootstrap_notes TEXT,
            capability_tags_json TEXT NOT NULL DEFAULT '[]',
            context_sources_json TEXT NOT NULL DEFAULT '[]',
            avatar_label TEXT,
            avatar_color TEXT,
            avatar_uri TEXT,
            branch_name TEXT,
            worktree_path TEXT,
            base_branch TEXT NOT NULL,
            status TEXT NOT NULL,
            current_task_id TEXT,
            summary TEXT,
            resume_notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
            task_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            priority INTEGER NOT NULL,
            status TEXT NOT NULL,
            scope_paths_json TEXT NOT NULL,
            recommended_branch_prefix TEXT,
            claimed_by_worker_id TEXT,
            claimed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT,
            superseded_by_task_id TEXT,
            superseded_at TEXT,
            supersede_reason TEXT
        );

        CREATE TABLE IF NOT EXISTS waiters (
            waiter_id INTEGER PRIMARY KEY AUTOINCREMENT,
            worker_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            notified_at TEXT
        );

        CREATE TABLE IF NOT EXISTS notifications (
            notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
            worker_id TEXT NOT NULL,
            task_id TEXT,
            kind TEXT NOT NULL,
            status TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            read_at TEXT
        );

        CREATE TABLE IF NOT EXISTS terminal_sessions (
            session_id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            task_id TEXT,
            label TEXT NOT NULL,
            cwd TEXT NOT NULL,
            command_json TEXT NOT NULL,
            status TEXT NOT NULL,
            pid INTEGER,
            log_path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            started_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            exited_at TEXT,
            stop_requested_at TEXT,
            stop_requested_by TEXT,
            stop_reason TEXT
        );
        """
    )
    ensure_table_columns(
        conn,
        "workers",
        {
            "agent_profile": "TEXT",
            "identity_notes": "TEXT",
            "personality_notes": "TEXT",
            "soul_directive": "TEXT",
            "memory_notes": "TEXT",
            "bootstrap_notes": "TEXT",
            "capability_tags_json": "TEXT NOT NULL DEFAULT '[]'",
            "context_sources_json": "TEXT NOT NULL DEFAULT '[]'",
            "avatar_label": "TEXT",
            "avatar_color": "TEXT",
            "avatar_uri": "TEXT",
            "resume_notes": "TEXT",
        },
    )
    ensure_table_columns(
        conn,
        "tasks",
        {
            "superseded_by_task_id": "TEXT",
            "superseded_at": "TEXT",
            "supersede_reason": "TEXT",
        },
    )
    conn.commit()


def ensure_table_columns(
    conn: sqlite3.Connection,
    table_name: str,
    columns: dict[str, str],
) -> None:
    existing_columns = {
        str(row["name"])
        for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    for column_name, column_type in columns.items():
        if column_name in existing_columns:
            continue
        conn.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
        )


def row_to_worker(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    worker = dict(row)
    worker["capability_tags"] = parse_worker_capability_tags(worker.pop("capability_tags_json", None))
    worker["context_sources"] = parse_context_sources(worker.pop("context_sources_json", None))
    worker.setdefault("agent_profile", None)
    worker.setdefault("identity_notes", None)
    worker.setdefault("personality_notes", None)
    worker.setdefault("soul_directive", None)
    worker.setdefault("memory_notes", None)
    worker.setdefault("bootstrap_notes", None)
    worker.setdefault("avatar_label", None)
    worker.setdefault("avatar_color", None)
    worker.setdefault("avatar_uri", None)
    worker.setdefault("resume_notes", None)
    return worker


def row_to_task(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    task = dict(row)
    if task.get("task_id") is None:
        return None
    task["scope_paths"] = json.loads(task.pop("scope_paths_json"))
    task.setdefault("superseded_by_task_id", None)
    task.setdefault("superseded_at", None)
    task.setdefault("supersede_reason", None)
    return task


def read_log_tail(log_path: Path, *, max_lines: int = 12) -> list[str]:
    try:
        if not log_path.exists():
            return []
        lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return []
    return lines[-max_lines:]


def quote_powershell_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def render_powershell_array(values: Iterable[str]) -> str:
    return "@(" + ", ".join(quote_powershell_literal(value) for value in values) + ")"


def write_windows_terminal_launcher(
    *,
    launcher_path: Path,
    session_id: str,
    label: str,
    cwd: Path,
    command: list[str],
    log_path: Path,
) -> None:
    command_preview = " ".join(command)
    launcher_lines = [
        "$ErrorActionPreference = 'Continue'",
        "$ProgressPreference = 'SilentlyContinue'",
        f"$sessionId = {quote_powershell_literal(session_id)}",
        f"$logPath = {quote_powershell_literal(str(log_path))}",
        f"$command = {render_powershell_array(command)}",
        f"$host.UI.RawUI.WindowTitle = {quote_powershell_literal(label)}",
        f"Set-Location -LiteralPath {quote_powershell_literal(str(cwd))}",
        "try {",
        "  Start-Transcript -Path $logPath -Append -Force | Out-Null",
        "} catch {",
        '  Write-Host "Transcript unavailable: $($_.Exception.Message)"',
        "}",
        f'Write-Host "[managed terminal] {session_id}"',
        f'Write-Host "[cwd] {cwd}"',
        f'Write-Host "[command] {command_preview}"',
        "if ($command.Length -gt 1) {",
        "  & $command[0] @($command[1..($command.Length - 1)])",
        "} else {",
        "  & $command[0]",
        "}",
        "$exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }",
        'Write-Host ""',
        'Write-Host "Command exited with code $exitCode. This worker terminal will stay open until you close it."',
    ]
    launcher_path.write_text("\n".join(launcher_lines) + "\n", encoding="utf-8")


def process_exists(pid: int | None) -> bool:
    if pid is None or pid <= 0:
        return False

    if is_windows():
        process_handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
        if not process_handle:
            return False
        try:
            exit_code = wintypes.DWORD()
            if not ctypes.windll.kernel32.GetExitCodeProcess(process_handle, ctypes.byref(exit_code)):
                return False
            return exit_code.value == 259
        finally:
            ctypes.windll.kernel32.CloseHandle(process_handle)

    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def terminate_process(pid: int | None, *, force: bool) -> bool:
    if pid is None or pid <= 0:
        return False

    if is_windows():
        process_handle = ctypes.windll.kernel32.OpenProcess(0x0001, False, pid)
        if not process_handle:
            return False
        try:
            return bool(ctypes.windll.kernel32.TerminateProcess(process_handle, 1))
        finally:
            ctypes.windll.kernel32.CloseHandle(process_handle)

    signal_type = signal.SIGKILL if force else signal.SIGTERM
    try:
        os.kill(pid, signal_type)
    except OSError:
        return False
    return True


def row_to_terminal_session(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    session = dict(row)
    if session.get("session_id") is None:
        return None
    log_path = Path(str(session.get("log_path") or ""))
    session["command"] = json.loads(session.pop("command_json"))
    session["tail_preview"] = read_log_tail(log_path)
    return session


def fetch_worker(conn: sqlite3.Connection, worker_id: str) -> dict[str, Any]:
    worker = row_to_worker(conn.execute("SELECT * FROM workers WHERE worker_id = ?", (worker_id,)).fetchone())
    if worker is None:
        raise MissionControlError(f"Unknown worker '{worker_id}'. Use sync-worker or create-lane first.")
    return worker


def fetch_task(conn: sqlite3.Connection, task_id: str) -> dict[str, Any]:
    task = row_to_task(conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone())
    if task is None:
        raise MissionControlError(f"Unknown task '{task_id}'.")
    return task


def task_exists(conn: sqlite3.Connection, task_id: str) -> bool:
    row = conn.execute("SELECT 1 FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
    return row is not None


def allocate_task_id(conn: sqlite3.Connection, seed: str) -> str:
    base_task_id = slugify(seed)
    candidate = base_task_id
    suffix = 2
    while task_exists(conn, candidate):
        candidate = f"{base_task_id}-{suffix}"
        suffix += 1
    return candidate


def fetch_active_task_for_worker(conn: sqlite3.Connection, worker_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        """
        SELECT t.*
        FROM workers w
        LEFT JOIN tasks t ON t.task_id = w.current_task_id
        WHERE w.worker_id = ?
        """,
        (worker_id,),
    ).fetchone()
    task = row_to_task(row)
    if task and task["status"] in ACTIVE_TASK_STATUSES:
        return task
    return None


def task_blockers(
    conn: sqlite3.Connection,
    scope_paths: Iterable[str],
    *,
    ignore_task_id: str | None = None,
) -> list[dict[str, Any]]:
    blockers: list[dict[str, Any]] = []
    rows = conn.execute(
        """
        SELECT *
        FROM tasks
        WHERE status IN ('in_progress', 'blocked', 'review')
          AND superseded_by_task_id IS NULL
        ORDER BY updated_at ASC
        """
    ).fetchall()
    for row in rows:
        task = row_to_task(row)
        if ignore_task_id and task["task_id"] == ignore_task_id:
            continue
        if scopes_overlap(task["scope_paths"], scope_paths):
            blockers.append(task)
    return blockers


def mark_task_waiters_ready(conn: sqlite3.Connection, task_id: str) -> list[dict[str, Any]]:
    task = fetch_task(conn, task_id)
    if task["status"] != "pending":
        return []

    blockers = task_blockers(conn, task["scope_paths"], ignore_task_id=task_id)
    if blockers:
        return []

    ready_waiters: list[dict[str, Any]] = []
    rows = conn.execute(
        """
        SELECT *
        FROM waiters
        WHERE task_id = ? AND status = 'waiting'
        ORDER BY waiter_id ASC
        """,
        (task_id,),
    ).fetchall()
    for row in rows:
        waiter = dict(row)
        now = utc_now()
        conn.execute(
            """
            UPDATE waiters
            SET status = 'ready', updated_at = ?, notified_at = ?
            WHERE waiter_id = ?
            """,
            (now, now, waiter["waiter_id"]),
        )
        message = f"Task {task_id} is ready to claim; its overlapping scope is clear."
        conn.execute(
            """
            INSERT INTO notifications (worker_id, task_id, kind, status, message, created_at)
            VALUES (?, ?, 'task-ready', 'unread', ?, ?)
            """,
            (waiter["worker_id"], task_id, message, now),
        )
        ready_waiters.append(
            {
                "waiter_id": waiter["waiter_id"],
                "worker_id": waiter["worker_id"],
                "task_id": task_id,
                "message": message,
                "notified_at": now,
            }
        )
    return ready_waiters


def mark_all_waiters_ready(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    ready: list[dict[str, Any]] = []
    rows = conn.execute("SELECT task_id FROM tasks WHERE status = 'pending' ORDER BY priority DESC, created_at ASC").fetchall()
    for row in rows:
        ready.extend(mark_task_waiters_ready(conn, row["task_id"]))
    return ready


def upsert_worker(
    conn: sqlite3.Connection,
    *,
    worker_id: str,
    display_name: str,
    branch_name: str,
    worktree_path: str,
    base_branch: str,
    status: str,
    summary: str | None,
    current_task_id: str | None = None,
    agent_profile: str | None = None,
    identity_notes: str | None = None,
    personality_notes: str | None = None,
    soul_directive: str | None = None,
    memory_notes: str | None = None,
    bootstrap_notes: str | None = None,
    capability_tags: Iterable[str] | None = None,
    context_sources: Iterable[str] | None = None,
    avatar_label: str | None = None,
    avatar_color: str | None = None,
    avatar_uri: str | None = None,
    resume_notes: str | None = None,
) -> dict[str, Any]:
    if status not in WORKER_STATUSES:
        raise MissionControlError(f"Unsupported worker status '{status}'.")
    now = utc_now()
    existing = conn.execute("SELECT * FROM workers WHERE worker_id = ?", (worker_id,)).fetchone()
    existing_worker = row_to_worker(existing)
    next_agent_profile = agent_profile if agent_profile is not None else existing_worker.get("agent_profile") if existing_worker else None
    next_identity_notes = identity_notes if identity_notes is not None else existing_worker.get("identity_notes") if existing_worker else None
    next_personality_notes = personality_notes if personality_notes is not None else existing_worker.get("personality_notes") if existing_worker else None
    next_soul_directive = soul_directive if soul_directive is not None else existing_worker.get("soul_directive") if existing_worker else None
    next_memory_notes = memory_notes if memory_notes is not None else existing_worker.get("memory_notes") if existing_worker else None
    next_bootstrap_notes = bootstrap_notes if bootstrap_notes is not None else existing_worker.get("bootstrap_notes") if existing_worker else None
    next_capability_tags = (
        normalize_worker_capability_tags(capability_tags)
        if capability_tags is not None
        else existing_worker.get("capability_tags") if existing_worker else list(DEFAULT_WORKER_CAPABILITY_TAGS)
    )
    next_context_sources = (
        normalize_context_sources(context_sources)
        if context_sources is not None
        else existing_worker.get("context_sources") if existing_worker else []
    )
    next_avatar_label = avatar_label if avatar_label is not None else existing_worker.get("avatar_label") if existing_worker else None
    next_avatar_color = avatar_color if avatar_color is not None else existing_worker.get("avatar_color") if existing_worker else None
    next_avatar_uri = avatar_uri if avatar_uri is not None else existing_worker.get("avatar_uri") if existing_worker else None
    next_resume_notes = resume_notes if resume_notes is not None else existing_worker.get("resume_notes") if existing_worker else None
    capability_tags_json = json.dumps(next_capability_tags, separators=(",", ":"))
    context_sources_json = json.dumps(next_context_sources, separators=(",", ":"))
    if existing is None:
        conn.execute(
            """
            INSERT INTO workers (
                worker_id, display_name, agent_profile, identity_notes, personality_notes,
                soul_directive, memory_notes, bootstrap_notes, capability_tags_json,
                context_sources_json, avatar_label,
                avatar_color, avatar_uri, branch_name, worktree_path, base_branch,
                status, current_task_id, summary, resume_notes, created_at, updated_at, last_seen_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                worker_id,
                display_name,
                next_agent_profile,
                next_identity_notes,
                next_personality_notes,
                next_soul_directive,
                next_memory_notes,
                next_bootstrap_notes,
                capability_tags_json,
                context_sources_json,
                next_avatar_label,
                next_avatar_color,
                next_avatar_uri,
                branch_name,
                worktree_path,
                base_branch,
                status,
                current_task_id,
                summary,
                next_resume_notes,
                now,
                now,
                now,
            ),
        )
    else:
        conn.execute(
            """
            UPDATE workers
            SET display_name = ?, agent_profile = ?, identity_notes = ?, personality_notes = ?,
                soul_directive = ?, memory_notes = ?, bootstrap_notes = ?, capability_tags_json = ?,
                context_sources_json = ?, avatar_label = ?, avatar_color = ?, avatar_uri = ?,
                branch_name = ?, worktree_path = ?, base_branch = ?,
                status = ?, current_task_id = ?, summary = ?, resume_notes = ?, updated_at = ?, last_seen_at = ?
            WHERE worker_id = ?
            """,
            (
                display_name,
                next_agent_profile,
                next_identity_notes,
                next_personality_notes,
                next_soul_directive,
                next_memory_notes,
                next_bootstrap_notes,
                capability_tags_json,
                context_sources_json,
                next_avatar_label,
                next_avatar_color,
                next_avatar_uri,
                branch_name,
                worktree_path,
                base_branch,
                status,
                current_task_id,
                summary,
                next_resume_notes,
                now,
                now,
                worker_id,
            ),
        )
    return fetch_worker(conn, worker_id)


def create_waiter(conn: sqlite3.Connection, *, worker_id: str, task_id: str, reason: str) -> dict[str, Any]:
    existing = conn.execute(
        """
        SELECT *
        FROM waiters
        WHERE worker_id = ? AND task_id = ? AND status IN ('waiting', 'ready')
        ORDER BY waiter_id DESC
        LIMIT 1
        """,
        (worker_id, task_id),
    ).fetchone()
    if existing:
        return dict(existing)

    now = utc_now()
    conn.execute(
        """
        INSERT INTO waiters (worker_id, task_id, reason, status, created_at, updated_at)
        VALUES (?, ?, ?, 'waiting', ?, ?)
        """,
        (worker_id, task_id, reason, now, now),
    )
    row = conn.execute("SELECT * FROM waiters WHERE rowid = last_insert_rowid()").fetchone()
    return dict(row)


def create_task_record(
    conn: sqlite3.Connection,
    *,
    task_id: str | None,
    title: str,
    summary: str,
    priority: int,
    scope_paths: Iterable[str],
    branch_prefix: str | None,
) -> dict[str, Any]:
    normalized_scope_paths = normalize_scope_paths(scope_paths)
    if not normalized_scope_paths:
        raise MissionControlError("At least one scope path is required.")

    resolved_task_id = task_id or allocate_task_id(conn, title)
    if task_exists(conn, resolved_task_id):
        raise MissionControlError(f"Task '{resolved_task_id}' already exists.")

    now = utc_now()
    conn.execute(
        """
        INSERT INTO tasks (
            task_id, title, summary, priority, status, scope_paths_json,
            recommended_branch_prefix, claimed_by_worker_id, claimed_at,
            created_at, updated_at, completed_at,
            superseded_by_task_id, superseded_at, supersede_reason
        )
        VALUES (?, ?, ?, ?, 'pending', ?, ?, NULL, NULL, ?, ?, NULL, NULL, NULL, NULL)
        """,
        (
            resolved_task_id,
            title,
            summary,
            priority,
            json.dumps(normalized_scope_paths),
            branch_prefix,
            now,
            now,
        ),
    )
    return fetch_task(conn, resolved_task_id)


def create_notification(
    conn: sqlite3.Connection,
    *,
    worker_id: str,
    kind: str,
    message: str,
    task_id: str | None = None,
) -> dict[str, Any]:
    fetch_worker(conn, worker_id)
    now = utc_now()
    conn.execute(
        """
        INSERT INTO notifications (worker_id, task_id, kind, status, message, created_at)
        VALUES (?, ?, ?, 'unread', ?, ?)
        """,
        (worker_id, task_id, kind, message, now),
    )
    row = conn.execute("SELECT * FROM notifications WHERE rowid = last_insert_rowid()").fetchone()
    return dict(row)


def fetch_active_terminal_for_worker(
    conn: sqlite3.Connection,
    worker_id: str,
) -> dict[str, Any] | None:
    row = conn.execute(
        """
        SELECT *
        FROM terminal_sessions
        WHERE worker_id = ? AND status IN ('running', 'stopping')
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (worker_id,),
    ).fetchone()
    return row_to_terminal_session(row)


def fetch_terminal_session(conn: sqlite3.Connection, session_id: str) -> dict[str, Any]:
    session = row_to_terminal_session(
        conn.execute(
            "SELECT * FROM terminal_sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    )
    if session is None:
        raise MissionControlError(f"Unknown terminal session '{session_id}'.")
    return session


def reconcile_terminal_sessions(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        """
        SELECT *
        FROM terminal_sessions
        WHERE status IN ('running', 'stopping')
        ORDER BY created_at ASC
        """
    ).fetchall()
    for row in rows:
        session = dict(row)
        if process_exists(session["pid"]):
            continue

        now = utc_now()
        next_status = "stopped" if session.get("stop_requested_at") else "exited"
        conn.execute(
            """
            UPDATE terminal_sessions
            SET status = ?, exited_at = COALESCE(exited_at, ?), updated_at = ?
            WHERE session_id = ?
            """,
            (next_status, now, now, session["session_id"]),
        )


def launch_terminal_session(
    conn: sqlite3.Connection,
    context: Context,
    *,
    worker_id: str,
    label: str,
    command: list[str],
    cwd: str | None,
    task_id: str | None,
) -> dict[str, Any]:
    if not command:
        raise MissionControlError("Managed terminals require a non-empty command.")

    worker = fetch_worker(conn, worker_id)
    if task_id is not None:
        fetch_task(conn, task_id)

    existing = conn.execute(
        """
        SELECT session_id
        FROM terminal_sessions
        WHERE worker_id = ? AND status IN ('running', 'stopping')
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (worker_id,),
    ).fetchone()
    if existing:
        raise MissionControlError(
            f"Worker '{worker_id}' already has an active managed terminal: {existing['session_id']}."
        )

    command_cwd = Path(cwd or worker.get("worktree_path") or context.repo_root).resolve()
    if not command_cwd.exists():
        raise MissionControlError(f"Managed terminal cwd does not exist: {command_cwd}")

    terminal_logs_dir = context.state_dir / "terminal-logs"
    terminal_logs_dir.mkdir(parents=True, exist_ok=True)

    session_id = f"terminal-{worker_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
    log_path = terminal_logs_dir / f"{session_id}.log"
    now = utc_now()

    process_command = command
    popen_kwargs: dict[str, Any] = {"cwd": str(command_cwd)}
    if is_windows():
        launcher_path = terminal_logs_dir / f"{session_id}.ps1"
        write_windows_terminal_launcher(
            launcher_path=launcher_path,
            session_id=session_id,
            label=label,
            cwd=command_cwd,
            command=command,
            log_path=log_path,
        )
        process_command = [
            "powershell.exe",
            "-NoLogo",
            "-NoExit",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(launcher_path),
        ]
        popen_kwargs["creationflags"] = WINDOWS_CREATE_NEW_CONSOLE | WINDOWS_CREATE_NEW_PROCESS_GROUP
    else:
        popen_kwargs.update({
            "stdin": subprocess.DEVNULL,
            "stderr": subprocess.STDOUT,
            "text": True,
        })
        popen_kwargs["start_new_session"] = True

    log_path.write_text(
        f"[{now}] Launching managed terminal {session_id}: {' '.join(command)}\n",
        encoding="utf-8",
    )

    if is_windows():
        process = subprocess.Popen(process_command, **popen_kwargs)
    else:
        with log_path.open("a", encoding="utf-8") as log_file:
            process = subprocess.Popen(
                process_command,
                stdout=log_file,
                **popen_kwargs,
            )

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
            session_id,
            worker_id,
            task_id,
            label,
            str(command_cwd),
            json.dumps(command),
            process.pid,
            str(log_path),
            now,
            now,
            now,
        ),
    )
    return fetch_terminal_session(conn, session_id)


def stop_terminal_session(
    conn: sqlite3.Connection,
    *,
    session_id: str,
    requested_by: str | None,
    reason: str | None,
    force: bool,
) -> dict[str, Any]:
    session = fetch_terminal_session(conn, session_id)
    if session["status"] not in {"running", "stopping"}:
        return session

    now = utc_now()
    terminated = terminate_process(session.get("pid"), force=force)
    next_status = "stopped" if terminated or not process_exists(session.get("pid")) else "stopping"
    exited_at = now if next_status == "stopped" else None
    conn.execute(
        """
        UPDATE terminal_sessions
        SET status = ?, updated_at = ?, exited_at = COALESCE(exited_at, ?),
            stop_requested_at = ?, stop_requested_by = ?, stop_reason = ?
        WHERE session_id = ?
        """,
        (
            next_status,
            now,
            exited_at,
            now,
            requested_by,
            reason,
            session_id,
        ),
    )
    return fetch_terminal_session(conn, session_id)


def consume_waiters(conn: sqlite3.Connection, *, worker_id: str, task_id: str) -> None:
    now = utc_now()
    conn.execute(
        """
        UPDATE waiters
        SET status = 'consumed', updated_at = ?
        WHERE worker_id = ? AND task_id = ? AND status IN ('waiting', 'ready')
        """,
        (now, worker_id, task_id),
    )


def choose_next_task(conn: sqlite3.Connection, *, worker_id: str) -> dict[str, Any]:
    active = fetch_active_task_for_worker(conn, worker_id)
    if active is not None:
        return {"decision": "continue", "task": active}

    ready_waiters = conn.execute(
        """
        SELECT w.task_id
        FROM waiters w
        JOIN tasks t ON t.task_id = w.task_id
        WHERE w.worker_id = ? AND w.status = 'ready' AND t.status = 'pending'
        ORDER BY w.waiter_id ASC
        """,
        (worker_id,),
    ).fetchall()
    for row in ready_waiters:
        task = fetch_task(conn, row["task_id"])
        blockers = task_blockers(conn, task["scope_paths"], ignore_task_id=task["task_id"])
        if not blockers:
            return {"decision": "ready", "task": task, "blockers": []}

    blocked_candidate: dict[str, Any] | None = None
    rows = conn.execute(
        """
        SELECT *
        FROM tasks
        WHERE status = 'pending'
        ORDER BY priority DESC, created_at ASC
        """
    ).fetchall()
    for row in rows:
        task = row_to_task(row)
        blockers = task_blockers(conn, task["scope_paths"], ignore_task_id=task["task_id"])
        if not blockers:
            return {"decision": "claimable", "task": task, "blockers": []}
        if blocked_candidate is None:
            blocked_candidate = {"task": task, "blockers": blockers}
    return {"decision": "blocked" if blocked_candidate else "none", **(blocked_candidate or {})}


def claim_task(conn: sqlite3.Connection, *, worker_id: str, task_id: str) -> dict[str, Any]:
    worker = fetch_worker(conn, worker_id)
    task = fetch_task(conn, task_id)
    if task["status"] != "pending":
        raise MissionControlError(f"Task '{task_id}' is not pending; current status is {task['status']}.")

    blockers = task_blockers(conn, task["scope_paths"], ignore_task_id=task["task_id"])
    if blockers:
        blocker_ids = ", ".join(blocker["task_id"] for blocker in blockers)
        raise MissionControlError(f"Task '{task_id}' is blocked by active overlapping work: {blocker_ids}.")

    if worker["current_task_id"] and worker["current_task_id"] != task_id:
        active = fetch_active_task_for_worker(conn, worker_id)
        if active is not None:
            raise MissionControlError(
                f"Worker '{worker_id}' already owns active task '{active['task_id']}'. Complete or release it first."
            )

    now = utc_now()
    conn.execute(
        """
        UPDATE tasks
        SET status = 'in_progress', claimed_by_worker_id = ?, claimed_at = ?, updated_at = ?,
            superseded_by_task_id = NULL, superseded_at = NULL, supersede_reason = NULL
        WHERE task_id = ?
        """,
        (worker_id, now, now, task_id),
    )
    conn.execute(
        """
        UPDATE workers
        SET status = 'active', current_task_id = ?, updated_at = ?, last_seen_at = ?
        WHERE worker_id = ?
        """,
        (task_id, now, now, worker_id),
    )
    consume_waiters(conn, worker_id=worker_id, task_id=task_id)
    return fetch_task(conn, task_id)


def supersede_task(
    conn: sqlite3.Connection,
    *,
    worker_id: str,
    task_id: str,
    replacement_title: str,
    replacement_summary: str,
    replacement_priority: int,
    replacement_scope_paths: Iterable[str],
    replacement_branch_prefix: str | None,
    replacement_task_id: str | None,
    supersede_reason: str,
    requested_by: str | None,
    stop_active_terminal: bool,
) -> dict[str, Any]:
    worker = fetch_worker(conn, worker_id)
    active_task = fetch_active_task_for_worker(conn, worker_id)
    if active_task is None or active_task["task_id"] != task_id:
        raise MissionControlError(
            f"Task '{task_id}' is not the current active task for worker '{worker_id}'."
        )

    superseded_task = fetch_task(conn, task_id)
    next_scope_paths = normalize_scope_paths(replacement_scope_paths) or superseded_task["scope_paths"]
    next_branch_prefix = replacement_branch_prefix or superseded_task.get("recommended_branch_prefix")
    replacement_blockers = task_blockers(
        conn,
        next_scope_paths,
        ignore_task_id=superseded_task["task_id"],
    )
    if replacement_blockers:
        blocker_ids = ", ".join(blocker["task_id"] for blocker in replacement_blockers)
        raise MissionControlError(
            "Urgent replacement task is still blocked by overlapping active work: "
            f"{blocker_ids}."
        )

    replacement_task = create_task_record(
        conn,
        task_id=replacement_task_id,
        title=replacement_title,
        summary=replacement_summary,
        priority=replacement_priority,
        scope_paths=next_scope_paths,
        branch_prefix=next_branch_prefix,
    )

    now = utc_now()
    conn.execute(
        """
        UPDATE tasks
        SET status = 'blocked', updated_at = ?, superseded_by_task_id = ?,
            superseded_at = ?, supersede_reason = ?
        WHERE task_id = ?
        """,
        (
            now,
            replacement_task["task_id"],
            now,
            supersede_reason,
            superseded_task["task_id"],
        ),
    )
    conn.execute(
        """
        UPDATE workers
        SET current_task_id = NULL, updated_at = ?, last_seen_at = ?
        WHERE worker_id = ? AND current_task_id = ?
        """,
        (now, now, worker_id, superseded_task["task_id"]),
    )
    claimed_replacement_task = claim_task(
        conn,
        worker_id=worker_id,
        task_id=replacement_task["task_id"],
    )
    conn.execute(
        """
        UPDATE workers
        SET summary = ?, updated_at = ?, last_seen_at = ?
        WHERE worker_id = ?
        """,
        (
            f"Urgent override: {claimed_replacement_task['title']}",
            now,
            now,
            worker_id,
        ),
    )

    stopped_terminal_session: dict[str, Any] | None = None
    if stop_active_terminal:
        active_terminal = fetch_active_terminal_for_worker(conn, worker_id)
        if active_terminal is not None:
            stopped_terminal_session = stop_terminal_session(
                conn,
                session_id=active_terminal["session_id"],
                requested_by=requested_by or worker["worker_id"],
                reason=(
                    f"Urgent override superseded task {superseded_task['task_id']} "
                    f"with {claimed_replacement_task['task_id']}."
                ),
                force=True,
            )

    notified_workers: list[str] = []
    notified_worker_ids: set[str] = set()

    def notify_once(target_worker_id: str, *, kind: str, message: str) -> None:
        if target_worker_id in notified_worker_ids:
            return
        create_notification(
            conn,
            worker_id=target_worker_id,
            kind=kind,
            message=message,
            task_id=claimed_replacement_task["task_id"],
        )
        notified_worker_ids.add(target_worker_id)
        notified_workers.append(target_worker_id)

    notify_once(
        worker_id,
        kind="task-superseded",
        message=(
            f"Task {superseded_task['task_id']} was superseded by urgent task "
            f"{claimed_replacement_task['task_id']}. Refresh Builder before continuing."
        ),
    )

    overlapping_waiters = conn.execute(
        """
        SELECT DISTINCT w.worker_id, w.task_id
        FROM waiters w
        WHERE w.status IN ('waiting', 'ready')
        ORDER BY w.worker_id ASC, w.task_id ASC
        """
    ).fetchall()
    for waiter_row in overlapping_waiters:
        target_worker_id = str(waiter_row["worker_id"])
        if target_worker_id == worker_id:
            continue
        waiter_task = fetch_task(conn, str(waiter_row["task_id"]))
        if not scopes_overlap(waiter_task["scope_paths"], claimed_replacement_task["scope_paths"]):
            continue
        notify_once(
            target_worker_id,
            kind="refresh-request",
            message=(
                f"Urgent task {claimed_replacement_task['task_id']} now owns overlapping scope "
                f"after superseding {superseded_task['task_id']}. Refresh your lane state."
            ),
        )

    return {
        "superseded_task": fetch_task(conn, superseded_task["task_id"]),
        "replacement_task": fetch_task(conn, claimed_replacement_task["task_id"]),
        "stopped_terminal_session": stopped_terminal_session,
        "notified_workers": notified_workers,
    }


def release_task(conn: sqlite3.Connection, *, worker_id: str, task_id: str) -> dict[str, Any]:
    task = fetch_task(conn, task_id)
    if task["claimed_by_worker_id"] != worker_id:
        raise MissionControlError(f"Task '{task_id}' is not currently owned by worker '{worker_id}'.")

    now = utc_now()
    conn.execute(
        """
        UPDATE tasks
        SET status = 'pending', claimed_by_worker_id = NULL, claimed_at = NULL, updated_at = ?,
            superseded_by_task_id = NULL, superseded_at = NULL, supersede_reason = NULL
        WHERE task_id = ?
        """,
        (now, task_id),
    )
    conn.execute(
        """
        UPDATE workers
        SET status = 'idle', current_task_id = NULL, updated_at = ?, last_seen_at = ?
        WHERE worker_id = ? AND current_task_id = ?
        """,
        (now, now, worker_id, task_id),
    )
    mark_task_waiters_ready(conn, task_id)
    return fetch_task(conn, task_id)


def complete_task(conn: sqlite3.Connection, *, worker_id: str, task_id: str) -> dict[str, Any]:
    task = fetch_task(conn, task_id)
    if task["claimed_by_worker_id"] != worker_id:
        raise MissionControlError(f"Task '{task_id}' is not currently owned by worker '{worker_id}'.")

    now = utc_now()
    conn.execute(
        """
        UPDATE tasks
        SET status = 'completed', updated_at = ?, completed_at = ?
        WHERE task_id = ?
        """,
        (now, now, task_id),
    )
    conn.execute(
        """
        UPDATE workers
        SET status = 'idle', current_task_id = NULL, updated_at = ?, last_seen_at = ?
        WHERE worker_id = ? AND current_task_id = ?
        """,
        (now, now, worker_id, task_id),
    )
    ready = mark_all_waiters_ready(conn)
    completed = fetch_task(conn, task_id)
    completed["released_waiters"] = ready
    return completed


def build_board_snapshot(conn: sqlite3.Connection, context: Context) -> dict[str, Any]:
    reconcile_terminal_sessions(conn)
    workers = [row_to_worker(row) for row in conn.execute("SELECT * FROM workers ORDER BY worker_id ASC").fetchall()]
    tasks = [row_to_task(row) for row in conn.execute("SELECT * FROM tasks ORDER BY priority DESC, created_at ASC").fetchall()]
    waiters = [dict(row) for row in conn.execute("SELECT * FROM waiters ORDER BY waiter_id ASC").fetchall()]
    notifications = [
        dict(row)
        for row in conn.execute(
            "SELECT * FROM notifications ORDER BY notification_id DESC LIMIT 25"
        ).fetchall()
    ]
    terminal_sessions = [
        row_to_terminal_session(row)
        for row in conn.execute(
            "SELECT * FROM terminal_sessions ORDER BY created_at DESC LIMIT 25"
        ).fetchall()
    ]
    for task in tasks:
        task["blockers"] = [blocker["task_id"] for blocker in task_blockers(conn, task["scope_paths"], ignore_task_id=task["task_id"])]
    return {
        "generated_at": utc_now(),
        "repo_root": str(context.repo_root),
        "state_dir": str(context.state_dir),
        "workers": workers,
        "tasks": tasks,
        "waiters": waiters,
        "notifications": notifications,
        "terminal_sessions": [session for session in terminal_sessions if session is not None],
    }


def write_board_files(context: Context, snapshot: dict[str, Any]) -> str:
    context.board_json_path.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")

    lines = [
        "Mission Control Board",
        f"generated_at: {snapshot['generated_at']}",
        f"repo_root: {snapshot['repo_root']}",
        f"state_dir: {snapshot['state_dir']}",
        "",
        "Workers:",
    ]
    if snapshot["workers"]:
        for worker in snapshot["workers"]:
            summary = worker["summary"] or ""
            capabilities = ",".join(worker.get("capability_tags") or []) or "-"
            context_sources = ",".join(worker.get("context_sources") or []) or "-"
            lines.append(
                f"- {worker['worker_id']} [{worker['status']}] branch={worker['branch_name'] or '-'} "
                f"task={worker['current_task_id'] or '-'} {summary}".rstrip()
            )
            lines.append(f"  profile: {worker.get('agent_profile') or '-'} capabilities={capabilities}")
            lines.append(f"  context_sources: {context_sources}")
            if worker.get("identity_notes"):
                lines.append(f"  identity: {worker['identity_notes']}")
            if worker.get("personality_notes"):
                lines.append(f"  personality: {worker['personality_notes']}")
            if worker.get("soul_directive"):
                lines.append(f"  soul_directive: {worker['soul_directive']}")
            if worker.get("memory_notes"):
                lines.append(f"  memory: {worker['memory_notes']}")
            if worker.get("bootstrap_notes"):
                lines.append(f"  bootstrap: {worker['bootstrap_notes']}")
            if worker.get("resume_notes"):
                lines.append(f"  resume: {worker['resume_notes']}")
    else:
        lines.append("- none")

    lines.append("")
    lines.append("Tasks:")
    if snapshot["tasks"]:
        for task in snapshot["tasks"]:
            blockers = ",".join(task["blockers"]) if task["blockers"] else "-"
            scopes = ", ".join(task["scope_paths"]) or "-"
            lines.append(
                f"- {task['task_id']} [{task['status']}] prio={task['priority']} "
                f"worker={task['claimed_by_worker_id'] or '-'} blockers={blockers}"
            )
            lines.append(f"  title: {task['title']}")
            lines.append(f"  scopes: {scopes}")
            if task.get("superseded_by_task_id"):
                lines.append(
                    "  superseded_by: "
                    f"{task['superseded_by_task_id']} at {task.get('superseded_at') or '-'}"
                )
            if task.get("supersede_reason"):
                lines.append(f"  supersede_reason: {task['supersede_reason']}")
    else:
        lines.append("- none")

    lines.append("")
    lines.append("Waiters:")
    active_waiters = [waiter for waiter in snapshot["waiters"] if waiter["status"] in {"waiting", "ready"}]
    if active_waiters:
        for waiter in active_waiters:
            lines.append(
                f"- {waiter['worker_id']} -> {waiter['task_id']} [{waiter['status']}] reason={waiter['reason']}"
            )
    else:
        lines.append("- none")

    lines.append("")
    lines.append("Unread Notifications:")
    unread = [notice for notice in snapshot["notifications"] if notice["status"] == "unread"]
    if unread:
        for notice in unread:
            lines.append(f"- {notice['worker_id']} :: {notice['message']}")
    else:
        lines.append("- none")

    lines.append("")
    lines.append("Managed Terminals:")
    if snapshot["terminal_sessions"]:
        for session in snapshot["terminal_sessions"]:
            lines.append(
                f"- {session['worker_id']} :: {session['session_id']} [{session['status']}] "
                f"pid={session['pid'] or '-'} label={session['label']}"
            )
            lines.append(f"  command: {' '.join(session['command'])}")
            lines.append(f"  log: {session['log_path']}")
    else:
        lines.append("- none")

    text = "\n".join(lines) + "\n"
    context.board_text_path.write_text(text, encoding="utf-8")
    return text


def emit_result(context: Context, *, payload: dict[str, Any], as_json: bool) -> int:
    with connect_db(context) as conn:
        ensure_schema(conn)
        snapshot = build_board_snapshot(conn, context)
    board_text = write_board_files(context, snapshot)
    payload = dict(payload)
    payload["board_json_path"] = str(context.board_json_path)
    payload["board_text_path"] = str(context.board_text_path)
    if as_json:
        print(json.dumps(payload, indent=2))
    else:
        print(board_text, end="")
    return 0


def command_init(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
    return {"status": "ok", "state_dir": str(context.state_dir), "db_path": str(context.db_path)}


def command_sync_worker(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    branch_name = args.branch_name or run_command(["git", "branch", "--show-current"], cwd=context.cwd)
    worktree_path = str(Path(args.worktree_path).resolve()) if args.worktree_path else str(context.cwd)
    worker_id = args.worker_id or slugify(branch_name)
    display_name = args.display_name or worker_id
    status = args.status or "idle"
    with connect_db(context) as conn:
        ensure_schema(conn)
        worker = upsert_worker(
            conn,
            worker_id=worker_id,
            display_name=display_name,
            branch_name=branch_name,
            worktree_path=worktree_path,
            base_branch=args.base_branch,
            status=status,
            summary=args.summary,
            agent_profile=args.agent_profile,
            identity_notes=args.identity_notes,
            personality_notes=args.personality_notes,
            soul_directive=args.soul_directive,
            memory_notes=args.memory_notes,
            bootstrap_notes=args.bootstrap_notes,
            capability_tags=args.capability_tag,
            context_sources=args.context_source,
            avatar_label=args.avatar_label,
            avatar_color=args.avatar_color,
            avatar_uri=args.avatar_uri,
            resume_notes=args.resume_notes,
        )
        conn.commit()
    return {"status": "ok", "worker": worker}


def command_create_lane(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    worker_id = slugify(args.worker_id)
    branch_name = args.branch_name or f"codex/worker/{worker_id}"
    worktree_path = Path(args.worktree_path) if args.worktree_path else context.repo_root.parent / f"{context.repo_root.name}-{worker_id}"
    if worktree_path.exists():
        raise MissionControlError(f"Refusing to create lane because worktree path already exists: {worktree_path}")

    run_command(
        ["git", "worktree", "add", str(worktree_path), "-b", branch_name, args.base_branch],
        cwd=context.repo_root,
    )

    if not args.no_bootstrap:
        bootstrap_script = worktree_path / "scripts" / "dev.ps1"
        run_command(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(bootstrap_script), "bootstrap-worktree"],
            cwd=worktree_path,
        )

    with connect_db(context) as conn:
        ensure_schema(conn)
        worker = upsert_worker(
            conn,
            worker_id=worker_id,
            display_name=args.display_name or worker_id,
            branch_name=branch_name,
            worktree_path=str(worktree_path.resolve()),
            base_branch=args.base_branch,
            status="idle",
            summary="lane created",
            agent_profile=args.agent_profile,
            identity_notes=args.identity_notes,
            personality_notes=args.personality_notes,
            soul_directive=args.soul_directive,
            memory_notes=args.memory_notes,
            bootstrap_notes=args.bootstrap_notes,
            capability_tags=args.capability_tag,
            context_sources=args.context_source,
            avatar_label=args.avatar_label,
            avatar_color=args.avatar_color,
            avatar_uri=args.avatar_uri,
            resume_notes=args.resume_notes,
        )
        conn.commit()
    return {"status": "ok", "worker": worker, "worktree_path": str(worktree_path.resolve())}


def command_add_task(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        task = create_task_record(
            conn,
            task_id=args.task_id or slugify(args.title),
            title=args.title,
            summary=args.summary,
            priority=args.priority,
            scope_paths=args.scope_path,
            branch_prefix=args.branch_prefix,
        )
        conn.commit()
    return {"status": "ok", "task": task}


def command_claim_task(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        task = claim_task(conn, worker_id=args.worker_id, task_id=args.task_id)
        conn.commit()
    return {"status": "ok", "task": task}


def command_release_task(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        task = release_task(conn, worker_id=args.worker_id, task_id=args.task_id)
        conn.commit()
    return {"status": "ok", "task": task}


def command_complete_task(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        task = complete_task(conn, worker_id=args.worker_id, task_id=args.task_id)
        conn.commit()
    return {"status": "ok", "task": task}


def command_supersede_task(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        result = supersede_task(
            conn,
            worker_id=args.worker_id,
            task_id=args.task_id,
            replacement_title=args.replacement_title,
            replacement_summary=args.replacement_summary,
            replacement_priority=args.replacement_priority,
            replacement_scope_paths=args.replacement_scope_path,
            replacement_branch_prefix=args.replacement_branch_prefix,
            replacement_task_id=args.replacement_task_id,
            supersede_reason=args.supersede_reason,
            requested_by=args.requested_by,
            stop_active_terminal=not bool(args.keep_active_terminal),
        )
        conn.commit()
    return {"status": "ok", **result}


def command_heartbeat(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        worker = fetch_worker(conn, args.worker_id)
        status = args.status or worker["status"]
        current_task_id = args.current_task_id if args.current_task_id is not None else worker["current_task_id"]
        summary = args.summary if args.summary is not None else worker["summary"]
        worker = upsert_worker(
            conn,
            worker_id=worker["worker_id"],
            display_name=worker["display_name"],
            branch_name=args.branch_name or worker["branch_name"] or "",
            worktree_path=args.worktree_path or worker["worktree_path"] or "",
            base_branch=args.base_branch or worker["base_branch"],
            status=status,
            summary=summary,
            current_task_id=current_task_id,
            agent_profile=args.agent_profile,
            identity_notes=args.identity_notes,
            personality_notes=args.personality_notes,
            soul_directive=args.soul_directive,
            memory_notes=args.memory_notes,
            bootstrap_notes=args.bootstrap_notes,
            capability_tags=args.capability_tag,
            context_sources=args.context_source,
            avatar_label=args.avatar_label,
            avatar_color=args.avatar_color,
            avatar_uri=args.avatar_uri,
            resume_notes=args.resume_notes,
        )
        conn.commit()
    return {"status": "ok", "worker": worker}


def command_next_task(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        fetch_worker(conn, args.worker_id)
        decision = choose_next_task(conn, worker_id=args.worker_id)
        if decision["decision"] in {"claimable", "ready"} and args.claim:
            task = claim_task(conn, worker_id=args.worker_id, task_id=decision["task"]["task_id"])
            conn.commit()
            return {"status": "ok", "decision": "claimed", "task": task}

        if decision["decision"] == "blocked" and args.wait:
            waiter = create_waiter(
                conn,
                worker_id=args.worker_id,
                task_id=decision["task"]["task_id"],
                reason=args.wait_reason or "waiting for overlapping scope/resource to clear",
            )
            conn.commit()
            return {
                "status": "ok",
                "decision": "waiting",
                "task": decision["task"],
                "blockers": decision["blockers"],
                "waiter": waiter,
            }

        conn.commit()
    return {"status": "ok", **decision}


def command_wait_task(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        fetch_worker(conn, args.worker_id)
        fetch_task(conn, args.task_id)
        waiter = create_waiter(conn, worker_id=args.worker_id, task_id=args.task_id, reason=args.reason)
        conn.commit()
    return {"status": "ok", "waiter": waiter}


def command_notifications(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        rows = conn.execute(
            """
            SELECT *
            FROM notifications
            WHERE worker_id = ? AND (? OR status = 'unread')
            ORDER BY notification_id DESC
            """,
            (args.worker_id, 1 if args.all else 0),
        ).fetchall()
        notifications = [dict(row) for row in rows]
        if args.mark_read:
            now = utc_now()
            conn.execute(
                """
                UPDATE notifications
                SET status = 'read', read_at = ?
                WHERE worker_id = ? AND status = 'unread'
                """,
                (now, args.worker_id),
            )
            conn.commit()
    return {"status": "ok", "notifications": notifications}


def command_notify_worker(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        create_notification(
            conn,
            worker_id=args.worker_id,
            kind=args.kind,
            message=args.message,
            task_id=args.task_id,
        )
        rows = conn.execute(
            """
            SELECT *
            FROM notifications
            WHERE worker_id = ?
            ORDER BY notification_id DESC
            LIMIT 25
            """,
            (args.worker_id,),
        ).fetchall()
        notifications = [dict(row) for row in rows]
        conn.commit()
    return {"status": "ok", "notifications": notifications}


def command_launch_terminal(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    try:
        command = json.loads(args.command_json)
    except json.JSONDecodeError as exc:
        raise MissionControlError(f"--command-json must be valid JSON. {exc}") from exc
    if not isinstance(command, list) or not all(isinstance(entry, str) and entry for entry in command):
        raise MissionControlError("--command-json must decode to a JSON array of non-empty strings.")

    with connect_db(context) as conn:
        ensure_schema(conn)
        terminal_session = launch_terminal_session(
            conn,
            context,
            worker_id=args.worker_id,
            label=args.label,
            command=command,
            cwd=args.cwd,
            task_id=args.task_id,
        )
        conn.commit()
    return {"status": "ok", "terminal_session": terminal_session}


def command_stop_terminal(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
        terminal_session = stop_terminal_session(
            conn,
            session_id=args.session_id,
            requested_by=args.requested_by,
            reason=args.reason,
            force=bool(args.force),
        )
        conn.commit()
    return {"status": "ok", "terminal_session": terminal_session}


def command_board(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    with connect_db(context) as conn:
        ensure_schema(conn)
    return {"status": "ok"}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Shared worktree coordination for Codex O3DE threads.")
    parser.add_argument("--state-dir", help="Override the shared mission-control state directory.")
    parser.add_argument("--json", action="store_true", help="Print structured JSON instead of the text board.")

    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init")
    subparsers.add_parser("board")

    sync = subparsers.add_parser("sync-worker")
    sync.add_argument("--worker-id")
    sync.add_argument("--display-name")
    sync.add_argument("--branch-name")
    sync.add_argument("--worktree-path")
    sync.add_argument("--base-branch", default=DEFAULT_BASE_BRANCH)
    sync.add_argument("--status", default="idle")
    sync.add_argument("--summary")
    sync.add_argument("--agent-profile")
    sync.add_argument("--identity-notes")
    sync.add_argument("--personality-notes")
    sync.add_argument("--soul-directive")
    sync.add_argument("--memory-notes")
    sync.add_argument("--bootstrap-notes")
    sync.add_argument("--capability-tag", action="append")
    sync.add_argument("--context-source", action="append")
    sync.add_argument("--resume-notes")
    sync.add_argument("--avatar-label")
    sync.add_argument("--avatar-color")
    sync.add_argument("--avatar-uri")

    create_lane = subparsers.add_parser("create-lane")
    create_lane.add_argument("--worker-id", required=True)
    create_lane.add_argument("--display-name")
    create_lane.add_argument("--branch-name")
    create_lane.add_argument("--worktree-path")
    create_lane.add_argument("--base-branch", default=DEFAULT_BASE_BRANCH)
    create_lane.add_argument("--no-bootstrap", action="store_true")
    create_lane.add_argument("--agent-profile")
    create_lane.add_argument("--identity-notes")
    create_lane.add_argument("--personality-notes")
    create_lane.add_argument("--soul-directive")
    create_lane.add_argument("--memory-notes")
    create_lane.add_argument("--bootstrap-notes")
    create_lane.add_argument("--capability-tag", action="append")
    create_lane.add_argument("--context-source", action="append")
    create_lane.add_argument("--resume-notes")
    create_lane.add_argument("--avatar-label")
    create_lane.add_argument("--avatar-color")
    create_lane.add_argument("--avatar-uri")

    add_task = subparsers.add_parser("add-task")
    add_task.add_argument("--task-id")
    add_task.add_argument("--title", required=True)
    add_task.add_argument("--summary", required=True)
    add_task.add_argument("--priority", type=int, default=100)
    add_task.add_argument("--branch-prefix")
    add_task.add_argument("--scope-path", action="append", default=[])

    claim = subparsers.add_parser("claim-task")
    claim.add_argument("--worker-id", required=True)
    claim.add_argument("--task-id", required=True)

    release = subparsers.add_parser("release-task")
    release.add_argument("--worker-id", required=True)
    release.add_argument("--task-id", required=True)

    complete = subparsers.add_parser("complete-task")
    complete.add_argument("--worker-id", required=True)
    complete.add_argument("--task-id", required=True)

    supersede = subparsers.add_parser("supersede-task")
    supersede.add_argument("--worker-id", required=True)
    supersede.add_argument("--task-id", required=True)
    supersede.add_argument("--replacement-title", required=True)
    supersede.add_argument("--replacement-summary", required=True)
    supersede.add_argument("--replacement-priority", type=int, default=200)
    supersede.add_argument("--replacement-scope-path", action="append", default=[])
    supersede.add_argument("--replacement-branch-prefix")
    supersede.add_argument("--replacement-task-id")
    supersede.add_argument("--supersede-reason", required=True)
    supersede.add_argument("--requested-by")
    supersede.add_argument("--keep-active-terminal", action="store_true")

    heartbeat = subparsers.add_parser("heartbeat")
    heartbeat.add_argument("--worker-id", required=True)
    heartbeat.add_argument("--status")
    heartbeat.add_argument("--summary")
    heartbeat.add_argument("--current-task-id")
    heartbeat.add_argument("--branch-name")
    heartbeat.add_argument("--worktree-path")
    heartbeat.add_argument("--base-branch")
    heartbeat.add_argument("--agent-profile")
    heartbeat.add_argument("--identity-notes")
    heartbeat.add_argument("--personality-notes")
    heartbeat.add_argument("--soul-directive")
    heartbeat.add_argument("--memory-notes")
    heartbeat.add_argument("--bootstrap-notes")
    heartbeat.add_argument("--capability-tag", action="append")
    heartbeat.add_argument("--context-source", action="append")
    heartbeat.add_argument("--resume-notes")
    heartbeat.add_argument("--avatar-label")
    heartbeat.add_argument("--avatar-color")
    heartbeat.add_argument("--avatar-uri")

    next_task = subparsers.add_parser("next-task")
    next_task.add_argument("--worker-id", required=True)
    next_task.add_argument("--claim", action="store_true")
    next_task.add_argument("--wait", action="store_true")
    next_task.add_argument("--wait-reason")

    wait_task = subparsers.add_parser("wait-task")
    wait_task.add_argument("--worker-id", required=True)
    wait_task.add_argument("--task-id", required=True)
    wait_task.add_argument("--reason", required=True)

    notifications = subparsers.add_parser("notifications")
    notifications.add_argument("--worker-id", required=True)
    notifications.add_argument("--all", action="store_true")
    notifications.add_argument("--mark-read", action="store_true")

    notify_worker = subparsers.add_parser("notify-worker")
    notify_worker.add_argument("--worker-id", required=True)
    notify_worker.add_argument("--kind", required=True)
    notify_worker.add_argument("--message", required=True)
    notify_worker.add_argument("--task-id")

    launch_terminal = subparsers.add_parser("launch-terminal")
    launch_terminal.add_argument("--worker-id", required=True)
    launch_terminal.add_argument("--label", required=True)
    launch_terminal.add_argument("--command-json", required=True)
    launch_terminal.add_argument("--cwd")
    launch_terminal.add_argument("--task-id")

    stop_terminal = subparsers.add_parser("stop-terminal")
    stop_terminal.add_argument("--session-id", required=True)
    stop_terminal.add_argument("--requested-by")
    stop_terminal.add_argument("--reason")
    stop_terminal.add_argument("--force", action="store_true")

    return parser


def dispatch(args: argparse.Namespace, context: Context) -> dict[str, Any]:
    handlers = {
        "init": command_init,
        "board": command_board,
        "sync-worker": command_sync_worker,
        "create-lane": command_create_lane,
        "add-task": command_add_task,
        "claim-task": command_claim_task,
        "release-task": command_release_task,
        "complete-task": command_complete_task,
        "supersede-task": command_supersede_task,
        "heartbeat": command_heartbeat,
        "next-task": command_next_task,
        "wait-task": command_wait_task,
        "notifications": command_notifications,
        "notify-worker": command_notify_worker,
        "launch-terminal": command_launch_terminal,
        "stop-terminal": command_stop_terminal,
    }
    return handlers[args.command](args, context)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        context = detect_context(cwd=Path.cwd(), state_dir_override=args.state_dir)
        result = dispatch(args, context)
        return emit_result(context, payload=result, as_json=args.json)
    except MissionControlError as exc:
        print(f"mission-control error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
