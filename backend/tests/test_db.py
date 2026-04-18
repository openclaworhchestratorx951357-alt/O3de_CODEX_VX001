from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import app.services.db as db


def test_localappdata_failure_falls_back_to_repo_runtime() -> None:
    with TemporaryDirectory() as temp_dir:
        blocked_local = Path(temp_dir) / "blocked-localappdata"
        repo_fallback = Path(temp_dir) / "repo-runtime" / "control_plane.sqlite3"
        original_initialize = db._initialize_database_file

        def fake_initialize(path: Path) -> None:
            if path == blocked_local / "O3DE_CODEX_VX001" / "control-plane" / "control_plane.sqlite3":
                raise PermissionError("LOCALAPPDATA denied for test")
            original_initialize(path)

        db.configure_database(None)
        with patch.dict("os.environ", {"LOCALAPPDATA": str(blocked_local)}, clear=False):
            with patch.object(db, "DEFAULT_DB_PATH", repo_fallback):
                with patch.object(db, "_initialize_database_file", side_effect=fake_initialize):
                    status = db.get_database_runtime_status(force_refresh=True)

        assert status.ready is True
        assert status.active_path == repo_fallback
        assert status.active_strategy == "repo-local runtime fallback"
        assert status.warning is not None
        assert "unavailable" in status.warning


def test_explicit_database_path_failure_stays_unhealthy() -> None:
    impossible_path = Path("Z:/this/path/should/not/exist/control_plane.sqlite3")
    db.configure_database(None)
    with patch.dict(
        "os.environ",
        {"O3DE_CONTROL_PLANE_DB_PATH": str(impossible_path)},
        clear=False,
    ):
        with patch.object(db, "_initialize_database_file", side_effect=PermissionError("explicit path denied")):
            status = db.get_database_runtime_status(force_refresh=True)

    assert status.ready is False
    assert status.active_path == impossible_path.resolve()
    assert status.error is not None
    assert "explicit path denied" in status.error


def test_operator_fallback_path_is_used_before_repo_fallback() -> None:
    with TemporaryDirectory() as temp_dir:
        blocked_local = Path(temp_dir) / "blocked-localappdata"
        operator_dir = Path(temp_dir) / "known-good-operator-dir"
        repo_fallback = Path(temp_dir) / "repo-runtime" / "control_plane.sqlite3"
        original_initialize = db._initialize_database_file

        def fake_initialize(path: Path) -> None:
            if path == blocked_local / "O3DE_CODEX_VX001" / "control-plane" / "control_plane.sqlite3":
                raise PermissionError("LOCALAPPDATA denied for test")
            original_initialize(path)

        db.configure_database(None)
        with patch.dict(
            "os.environ",
            {
                "LOCALAPPDATA": str(blocked_local),
                "O3DE_CONTROL_PLANE_DB_FALLBACK_DIR": str(operator_dir),
            },
            clear=False,
        ):
            with patch.object(db, "DEFAULT_DB_PATH", repo_fallback):
                with patch.object(db, "_initialize_database_file", side_effect=fake_initialize):
                    status = db.get_database_runtime_status(force_refresh=True)

        assert status.ready is True
        assert status.active_strategy == "operator fallback path"
        assert status.active_path == operator_dir / "control_plane.sqlite3"
        assert status.warning is not None
        assert "using" in status.warning
