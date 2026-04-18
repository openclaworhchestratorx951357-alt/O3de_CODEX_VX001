from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import app.services.db as db
from app.services.schema_validation import schema_validation_service


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


def test_schema_validation_service_rejects_invalid_build_compile_args() -> None:
    errors = schema_validation_service.validate_tool_args(
        schema_ref="schemas/tools/build.compile.args.schema.json",
        payload={"targets": []},
    )

    assert errors
    assert "at least 1 item" in errors[0]


def test_schema_validation_service_accepts_simulated_project_inspect_result() -> None:
    errors = schema_validation_service.validate_tool_result(
        schema_ref="schemas/tools/project.inspect.result.schema.json",
        payload={
            "status": "simulated_success",
            "tool": "project.inspect",
            "agent": "project-build",
            "project_root": "/tmp/project",
            "engine_root": "/tmp/engine",
            "dry_run": True,
            "simulated": True,
            "execution_mode": "simulated",
            "approval_class": "read_only",
            "locks_acquired": ["project_config"],
            "message": "Simulated project inspection completed.",
        },
    )

    assert errors == []


def test_schema_validation_service_reports_subset_capabilities_truthfully() -> None:
    capability = schema_validation_service.get_capability_status()

    assert capability.mode == "subset-json-schema"
    assert capability.schema_scope == "published-tool-arg-result-schemas"
    assert capability.supports_request_args is True
    assert capability.supports_result_conformance is True
    assert "$ref" in capability.active_keywords
    assert capability.active_unsupported_keywords == []
    assert "$schema" in capability.active_metadata_keywords
    assert "allOf" in capability.supported_keywords
    assert "oneOf" in capability.unsupported_keywords
    assert any("does not claim full JSON Schema support" in note for note in capability.notes)
    assert any(
        "published tool arg/result schema files" in note for note in capability.notes
    )
    assert any(
        "active unsupported keywords should remain empty" in note
        for note in capability.notes
    )
