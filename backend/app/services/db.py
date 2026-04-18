import json
import os
import sqlite3
import threading
from functools import lru_cache
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator


DEFAULT_DB_PATH = Path(__file__).resolve().parents[3] / ".runtime" / "control_plane.sqlite3"

_db_lock = threading.Lock()
_configured_db_path: Path | None = None


def configure_database(path: str | Path | None) -> Path:
    global _configured_db_path
    _configured_db_path = Path(path).resolve() if path else None
    return get_database_path()


def get_database_path() -> Path:
    if _configured_db_path is not None:
        return _configured_db_path

    configured = os.getenv("O3DE_CONTROL_PLANE_DB_PATH")
    if configured:
        return Path(configured).resolve()

    strategy = os.getenv("O3DE_CONTROL_PLANE_DB_STRATEGY", "").strip().lower()
    if strategy == "repo":
        return DEFAULT_DB_PATH
    if strategy == "localappdata":
        return get_local_appdata_database_path()

    fallback = get_local_appdata_database_path(optional=True)
    if fallback is not None:
        return fallback

    return DEFAULT_DB_PATH


def get_database_strategy_summary() -> str:
    env_path = os.getenv("O3DE_CONTROL_PLANE_DB_PATH")
    if env_path:
        return f"SQLite via O3DE_CONTROL_PLANE_DB_PATH ({get_database_path()})"
    strategy = os.getenv("O3DE_CONTROL_PLANE_DB_STRATEGY", "").strip().lower()
    if strategy == "repo":
        return f"SQLite via repo-local runtime strategy ({get_database_path()})"
    if strategy == "localappdata":
        return f"SQLite via LOCALAPPDATA strategy ({get_database_path()})"
    if get_database_path() == DEFAULT_DB_PATH:
        return f"SQLite via repo-local runtime default ({get_database_path()})"
    return f"SQLite via LOCALAPPDATA default ({get_database_path()})"


@lru_cache(maxsize=1)
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


def initialize_database() -> Path:
    db_path = get_database_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    with _db_lock:
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
                """
            )
    return db_path


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
