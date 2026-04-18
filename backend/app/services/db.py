from contextlib import contextmanager
from dataclasses import dataclass, field
import json
import os
from pathlib import Path
import sqlite3
import threading
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
                category TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
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
                metadata TEXT NOT NULL,
                FOREIGN KEY(run_id) REFERENCES runs(id),
                FOREIGN KEY(execution_id) REFERENCES executions(id)
            );

            CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_executions_run_id ON executions(run_id, started_at DESC);
            CREATE INDEX IF NOT EXISTS idx_artifacts_run_id ON artifacts(run_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS db_write_probe (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marker TEXT NOT NULL
            );
            """
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
        conn.execute("DELETE FROM artifacts")
        conn.execute("DELETE FROM executions")
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
