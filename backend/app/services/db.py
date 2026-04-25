import json
import os
import sqlite3
import threading
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator

DEFAULT_DB_PATH = Path(__file__).resolve().parents[3] / ".runtime" / "control_plane.sqlite3"
OPERATOR_FALLBACK_FILENAME = "control_plane.sqlite3"

_db_lock = threading.Lock()
_configured_db_path: Path | None = None
_database_runtime_status: "DatabaseRuntimeStatus | None" = None


@dataclass(slots=True)
class DatabaseRuntimeStatus:
    ready: bool
    requested_strategy: str
    requested_path: Path
    active_strategy: str
    active_path: Path
    warning: str | None = None
    error: str | None = None
    attempted_paths: list[str] = field(default_factory=list)


class DatabaseInitializationError(RuntimeError):
    pass


def _invalidate_database_runtime_status() -> None:
    global _database_runtime_status
    _database_runtime_status = None


def configure_database(path: str | Path | None) -> Path:
    global _configured_db_path
    _configured_db_path = Path(path).resolve() if path else None
    _invalidate_database_runtime_status()
    return get_database_path()


def get_database_path() -> Path:
    return get_database_runtime_status().active_path


def get_database_strategy_summary() -> str:
    status = get_database_runtime_status()
    base = f"SQLite via {status.active_strategy} ({status.active_path})"
    if status.warning:
        return f"{base}; warning: {status.warning}"
    if status.error:
        return f"{base}; error: {status.error}"
    return base


def get_database_runtime_warning() -> str | None:
    status = get_database_runtime_status()
    return status.warning or status.error


def is_database_ready() -> bool:
    return get_database_runtime_status().ready


def get_local_appdata_database_path(optional: bool = False) -> Path | None:
    local_appdata = os.getenv("LOCALAPPDATA")
    if not local_appdata:
        if optional:
            return None
        return DEFAULT_DB_PATH
    return (
        Path(local_appdata).resolve()
        / "O3DE_CODEX_VX001"
        / "control-plane"
        / "control_plane.sqlite3"
    )


def get_operator_fallback_database_path(optional: bool = False) -> Path | None:
    fallback_dir = os.getenv("O3DE_CONTROL_PLANE_DB_FALLBACK_DIR", "").strip()
    if not fallback_dir:
        if optional:
            return None
        return DEFAULT_DB_PATH
    return Path(fallback_dir).resolve() / OPERATOR_FALLBACK_FILENAME


def _database_candidates() -> list[tuple[str, Path]]:
    if _configured_db_path is not None:
        return [("configured path", _configured_db_path)]

    configured = os.getenv("O3DE_CONTROL_PLANE_DB_PATH")
    if configured:
        return [("O3DE_CONTROL_PLANE_DB_PATH", Path(configured).resolve())]

    strategy = os.getenv("O3DE_CONTROL_PLANE_DB_STRATEGY", "").strip().lower()
    local_appdata_path = get_local_appdata_database_path(optional=True)
    operator_fallback_path = get_operator_fallback_database_path(optional=True)

    if strategy == "repo":
        return [("repo-local runtime strategy", DEFAULT_DB_PATH)]
    if strategy == "operator":
        candidates: list[tuple[str, Path]] = []
        if operator_fallback_path is not None:
            candidates.append(("operator fallback strategy", operator_fallback_path))
        candidates.append(("repo-local runtime fallback", DEFAULT_DB_PATH))
        return candidates
    if strategy == "localappdata":
        candidates: list[tuple[str, Path]] = []
        if local_appdata_path is not None:
            candidates.append(("LOCALAPPDATA strategy", local_appdata_path))
        if operator_fallback_path is not None:
            candidates.append(("operator fallback path", operator_fallback_path))
        candidates.append(("repo-local runtime fallback", DEFAULT_DB_PATH))
        return candidates

    candidates = []
    if local_appdata_path is not None:
        candidates.append(("LOCALAPPDATA default", local_appdata_path))
    if operator_fallback_path is not None:
        candidates.append(("operator fallback path", operator_fallback_path))
    candidates.append(("repo-local runtime fallback", DEFAULT_DB_PATH))
    return candidates


def _requested_database_target() -> tuple[str, Path]:
    return _database_candidates()[0]


def _initialize_database_file(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY,
                request_id TEXT NOT NULL,
                agent TEXT NOT NULL,
                tool TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                dry_run INTEGER NOT NULL,
                approval_id TEXT,
                approval_token TEXT,
                requested_locks TEXT NOT NULL,
                granted_locks TEXT NOT NULL,
                warnings TEXT NOT NULL,
                execution_mode TEXT NOT NULL,
                result_summary TEXT
            );

            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                run_id TEXT NOT NULL,
                request_id TEXT NOT NULL,
                agent TEXT NOT NULL,
                tool TEXT NOT NULL,
                approval_class TEXT NOT NULL,
                status TEXT NOT NULL,
                reason TEXT,
                token TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                decided_at TEXT,
                FOREIGN KEY(run_id) REFERENCES runs(id)
            );

            CREATE TABLE IF NOT EXISTS locks (
                name TEXT PRIMARY KEY,
                owner_run_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(owner_run_id) REFERENCES runs(id)
            );

            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                run_id TEXT,
                execution_id TEXT,
                executor_id TEXT,
                workspace_id TEXT,
                category TEXT NOT NULL,
                event_type TEXT,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                previous_state TEXT,
                current_state TEXT,
                failure_category TEXT,
                details TEXT NOT NULL,
                FOREIGN KEY(run_id) REFERENCES runs(id)
            );

            CREATE TABLE IF NOT EXISTS executions (
                id TEXT PRIMARY KEY,
                run_id TEXT NOT NULL,
                request_id TEXT NOT NULL,
                agent TEXT NOT NULL,
                tool TEXT NOT NULL,
                execution_mode TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                warnings TEXT NOT NULL,
                logs TEXT NOT NULL,
                artifact_ids TEXT NOT NULL,
                executor_id TEXT,
                workspace_id TEXT,
                runner_family TEXT,
                execution_attempt_state TEXT,
                failure_category TEXT,
                failure_stage TEXT,
                approval_class TEXT,
                lock_scope TEXT,
                backup_class TEXT,
                rollback_class TEXT,
                retention_class TEXT,
                details TEXT NOT NULL,
                result_summary TEXT,
                FOREIGN KEY(run_id) REFERENCES runs(id)
            );

            CREATE TABLE IF NOT EXISTS artifacts (
                id TEXT PRIMARY KEY,
                run_id TEXT NOT NULL,
                execution_id TEXT NOT NULL,
                label TEXT NOT NULL,
                kind TEXT NOT NULL,
                uri TEXT NOT NULL,
                path TEXT,
                content_type TEXT,
                simulated INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                artifact_role TEXT,
                executor_id TEXT,
                workspace_id TEXT,
                retention_class TEXT,
                evidence_completeness TEXT,
                metadata TEXT NOT NULL,
                FOREIGN KEY(run_id) REFERENCES runs(id),
                FOREIGN KEY(execution_id) REFERENCES executions(id)
            );

            CREATE TABLE IF NOT EXISTS executors (
                id TEXT PRIMARY KEY,
                executor_kind TEXT NOT NULL,
                executor_label TEXT NOT NULL,
                executor_host_label TEXT NOT NULL,
                execution_mode_class TEXT NOT NULL,
                availability_state TEXT NOT NULL,
                supported_runner_families TEXT NOT NULL,
                capability_snapshot TEXT NOT NULL,
                last_heartbeat_at TEXT,
                last_failure_summary TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                workspace_kind TEXT NOT NULL,
                workspace_root TEXT NOT NULL,
                workspace_state TEXT NOT NULL,
                cleanup_policy TEXT NOT NULL,
                retention_class TEXT NOT NULL,
                engine_binding TEXT NOT NULL,
                project_binding TEXT NOT NULL,
                runner_family TEXT NOT NULL,
                owner_run_id TEXT,
                owner_execution_id TEXT,
                owner_executor_id TEXT,
                created_at TEXT NOT NULL,
                activated_at TEXT,
                completed_at TEXT,
                cleaned_at TEXT,
                last_failure_summary TEXT
            );

            CREATE TABLE IF NOT EXISTS prompt_sessions (
                prompt_id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL,
                status TEXT NOT NULL,
                prompt_text TEXT NOT NULL,
                project_root TEXT NOT NULL,
                engine_root TEXT NOT NULL,
                dry_run INTEGER NOT NULL,
                preferred_domains TEXT NOT NULL,
                operator_note TEXT,
                child_run_ids TEXT NOT NULL,
                child_execution_ids TEXT NOT NULL,
                child_artifact_ids TEXT NOT NULL,
                child_event_ids TEXT NOT NULL,
                workspace_id TEXT,
                executor_id TEXT,
                plan_summary TEXT,
                evidence_summary TEXT,
                admitted_capabilities TEXT NOT NULL,
                refused_capabilities TEXT NOT NULL,
                final_result_summary TEXT,
                next_step_index INTEGER NOT NULL DEFAULT 0,
                current_step_id TEXT,
                pending_approval_id TEXT,
                pending_approval_token TEXT,
                last_error_code TEXT,
                last_error_retryable INTEGER NOT NULL DEFAULT 0,
                step_attempts TEXT NOT NULL DEFAULT '{}',
                plan_json TEXT,
                latest_child_responses TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS autonomy_objectives (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL,
                priority INTEGER NOT NULL,
                target_scopes TEXT NOT NULL,
                success_criteria TEXT NOT NULL,
                owner_kind TEXT NOT NULL,
                metadata TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_reviewed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS autonomy_jobs (
                id TEXT PRIMARY KEY,
                objective_id TEXT,
                job_kind TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                status TEXT NOT NULL,
                assigned_lane TEXT,
                resource_keys TEXT NOT NULL,
                depends_on TEXT NOT NULL,
                input_payload TEXT NOT NULL,
                output_payload TEXT NOT NULL,
                retry_count INTEGER NOT NULL,
                max_retries INTEGER NOT NULL,
                last_error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                started_at TEXT,
                finished_at TEXT,
                FOREIGN KEY(objective_id) REFERENCES autonomy_objectives(id)
            );

            CREATE TABLE IF NOT EXISTS autonomy_observations (
                id TEXT PRIMARY KEY,
                source_kind TEXT NOT NULL,
                source_ref TEXT,
                category TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS autonomy_healing_actions (
                id TEXT PRIMARY KEY,
                observation_id TEXT,
                job_id TEXT,
                action_kind TEXT NOT NULL,
                summary TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                resolved_at TEXT,
                FOREIGN KEY(observation_id) REFERENCES autonomy_observations(id),
                FOREIGN KEY(job_id) REFERENCES autonomy_jobs(id)
            );

            CREATE TABLE IF NOT EXISTS autonomy_memories (
                id TEXT PRIMARY KEY,
                memory_kind TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT NOT NULL,
                confidence REAL,
                source_refs TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_executions_run_id ON executions(run_id, started_at DESC);
            CREATE INDEX IF NOT EXISTS idx_artifacts_run_id ON artifacts(run_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_executions_executor_id ON executions(executor_id, started_at DESC);
            CREATE INDEX IF NOT EXISTS idx_executions_workspace_id ON executions(workspace_id, started_at DESC);
            CREATE INDEX IF NOT EXISTS idx_events_execution_id ON events(execution_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON events(workspace_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_artifacts_execution_role ON artifacts(execution_id, artifact_role, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_workspaces_owner_run_id ON workspaces(owner_run_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_workspaces_state ON workspaces(workspace_state, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_executors_availability_state ON executors(availability_state, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_prompt_sessions_status ON prompt_sessions(status, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_prompt_sessions_created_at ON prompt_sessions(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_autonomy_objectives_status ON autonomy_objectives(status, priority DESC, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_autonomy_jobs_status ON autonomy_jobs(status, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_autonomy_jobs_objective ON autonomy_jobs(objective_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_autonomy_observations_severity ON autonomy_observations(severity, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_autonomy_healing_status ON autonomy_healing_actions(status, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_autonomy_memories_kind ON autonomy_memories(memory_kind, updated_at DESC);

            CREATE TABLE IF NOT EXISTS db_write_probe (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marker TEXT NOT NULL
            );
            """
        )
        _ensure_table_columns(
            connection,
            "prompt_sessions",
            {
                "next_step_index": "INTEGER NOT NULL DEFAULT 0",
                "current_step_id": "TEXT",
                "pending_approval_id": "TEXT",
                "pending_approval_token": "TEXT",
                "last_error_code": "TEXT",
                "last_error_retryable": "INTEGER NOT NULL DEFAULT 0",
                "step_attempts": "TEXT NOT NULL DEFAULT '{}'",
            },
        )
        _ensure_table_columns(
            connection,
            "executions",
            {
                "executor_id": "TEXT",
                "workspace_id": "TEXT",
                "runner_family": "TEXT",
                "execution_attempt_state": "TEXT",
                "failure_category": "TEXT",
                "failure_stage": "TEXT",
                "approval_class": "TEXT",
                "lock_scope": "TEXT",
                "backup_class": "TEXT",
                "rollback_class": "TEXT",
                "retention_class": "TEXT",
            },
        )
        _ensure_table_columns(
            connection,
            "events",
            {
                "execution_id": "TEXT",
                "executor_id": "TEXT",
                "workspace_id": "TEXT",
                "event_type": "TEXT",
                "previous_state": "TEXT",
                "current_state": "TEXT",
                "failure_category": "TEXT",
            },
        )
        _ensure_table_columns(
            connection,
            "artifacts",
            {
                "artifact_role": "TEXT",
                "executor_id": "TEXT",
                "workspace_id": "TEXT",
                "retention_class": "TEXT",
                "evidence_completeness": "TEXT",
            },
        )
        cursor = connection.execute(
            "INSERT INTO db_write_probe (marker) VALUES (?)",
            ("initialization-probe",),
        )
        connection.execute(
            "DELETE FROM db_write_probe WHERE id = ?",
            (cursor.lastrowid,),
        )
        connection.commit()


def _ensure_table_columns(
    connection: sqlite3.Connection,
    table_name: str,
    columns: dict[str, str],
) -> None:
    existing_columns = {
        row[1]
        for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    for column_name, column_type in columns.items():
        if column_name in existing_columns:
            continue
        connection.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
        )


def get_database_runtime_status(*, force_refresh: bool = False) -> DatabaseRuntimeStatus:
    global _database_runtime_status
    with _db_lock:
        if _database_runtime_status is not None and not force_refresh:
            return _database_runtime_status

        requested_strategy, requested_path = _requested_database_target()
        attempted_paths: list[str] = []
        candidate_errors: list[str] = []

        for candidate_strategy, candidate_path in _database_candidates():
            attempted_paths.append(f"{candidate_strategy}: {candidate_path}")
            try:
                _initialize_database_file(candidate_path)
            except (OSError, sqlite3.Error) as exc:
                candidate_errors.append(f"{candidate_strategy} failed: {exc}")
                continue

            warning: str | None = None
            if candidate_path != requested_path:
                warning = (
                    f"Preferred database target '{requested_path}' was unavailable; "
                    f"using '{candidate_path}' instead."
                )
            _database_runtime_status = DatabaseRuntimeStatus(
                ready=True,
                requested_strategy=requested_strategy,
                requested_path=requested_path,
                active_strategy=candidate_strategy,
                active_path=candidate_path,
                warning=warning,
                attempted_paths=attempted_paths,
            )
            return _database_runtime_status

        _database_runtime_status = DatabaseRuntimeStatus(
            ready=False,
            requested_strategy=requested_strategy,
            requested_path=requested_path,
            active_strategy=requested_strategy,
            active_path=requested_path,
            error="; ".join(candidate_errors) or "No usable database path could be initialized.",
            attempted_paths=attempted_paths,
        )
        return _database_runtime_status


def initialize_database(*, raise_on_failure: bool = True) -> Path:
    status = get_database_runtime_status(force_refresh=True)
    if not status.ready:
        if raise_on_failure:
            raise DatabaseInitializationError(status.error or "Database initialization failed.")
        return status.active_path
    return status.active_path


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    db_path = initialize_database()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def reset_database() -> None:
    initialize_database()
    with connection() as conn:
        conn.execute("DELETE FROM autonomy_healing_actions")
        conn.execute("DELETE FROM autonomy_observations")
        conn.execute("DELETE FROM autonomy_jobs")
        conn.execute("DELETE FROM autonomy_objectives")
        conn.execute("DELETE FROM autonomy_memories")
        conn.execute("DELETE FROM artifacts")
        conn.execute("DELETE FROM executions")
        conn.execute("DELETE FROM workspaces")
        conn.execute("DELETE FROM executors")
        conn.execute("DELETE FROM prompt_sessions")
        conn.execute("DELETE FROM approvals")
        conn.execute("DELETE FROM locks")
        conn.execute("DELETE FROM events")
        conn.execute("DELETE FROM runs")


def encode_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True)


def decode_json(value: str | None, fallback: Any) -> Any:
    if value is None:
        return fallback
    return json.loads(value)
