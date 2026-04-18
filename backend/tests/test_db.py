from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import app.services.db as db
from app.services.schema_validation import schema_validation_service


def test_localappdata_failure_falls_back_to_repo_runtime() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        blocked_local = Path(temp_dir) / "blocked-localappdata"
        repo_fallback = Path(temp_dir) / "repo-runtime" / "control_plane.sqlite3"
        original_initialize = db._initialize_database_file

        def fake_initialize(path: Path) -> None:
            if path == (
                blocked_local / "O3DE_CODEX_VX001" / "control-plane" / "control_plane.sqlite3"
            ):
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
        with patch.object(
            db,
            "_initialize_database_file",
            side_effect=PermissionError("explicit path denied"),
        ):
            status = db.get_database_runtime_status(force_refresh=True)

    assert status.ready is False
    assert status.active_path == impossible_path.resolve()
    assert status.error is not None
    assert "explicit path denied" in status.error


def test_operator_fallback_path_is_used_before_repo_fallback() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        blocked_local = Path(temp_dir) / "blocked-localappdata"
        operator_dir = Path(temp_dir) / "known-good-operator-dir"
        repo_fallback = Path(temp_dir) / "repo-runtime" / "control_plane.sqlite3"
        original_initialize = db._initialize_database_file

        def fake_initialize(path: Path) -> None:
            if path == (
                blocked_local / "O3DE_CODEX_VX001" / "control-plane" / "control_plane.sqlite3"
            ):
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


def test_schema_validation_service_accepts_real_project_inspect_result() -> None:
    errors = schema_validation_service.validate_tool_result(
        schema_ref="schemas/tools/project.inspect.result.schema.json",
        payload={
            "status": "real_success",
            "tool": "project.inspect",
            "agent": "project-build",
            "project_root": "/tmp/project",
            "engine_root": "/tmp/engine",
            "dry_run": True,
            "simulated": False,
            "execution_mode": "real",
            "approval_class": "read_only",
            "locks_acquired": ["project_config"],
            "message": "Real project inspection completed.",
        },
    )

    assert errors == []


def test_schema_validation_service_accepts_real_project_inspect_execution_details() -> None:
    errors = schema_validation_service.validate_tool_args(
        schema_ref="schemas/tools/project.inspect.execution-details.schema.json",
        payload={
            "inspection_surface": "project_manifest",
            "execution_boundary": "Hybrid mode enabled a real read-only manifest path.",
            "adapter_family": "project-build",
            "adapter_mode": "hybrid",
            "adapter_contract_version": "v0.1",
            "inspection_evidence": [
                "project_manifest",
                "project_config",
                "gem_names",
                "manifest_settings"
            ],
            "project_manifest_path": "/tmp/project/project.json",
            "manifest_keys": ["project_name", "version", "gem_names"],
            "project_name": "SchemaProject",
            "include_flags": {
                "include_project_config": True,
                "include_gems": True,
                "include_settings": True,
                "include_build_state": False
            },
            "project_config": {
                "project_name": "SchemaProject",
                "version": "1.0.0"
            },
            "project_config_keys": ["project_name", "version"],
            "requested_project_config_keys": ["project_name", "version"],
            "requested_settings_evidence": [
                "manifest_settings",
                "manifest_settings_keys",
                "requested_settings_keys",
                "matched_requested_settings_keys",
                "missing_requested_settings_keys"
            ],
            "settings_selection_mode": "requested-subset",
            "requested_settings_keys": ["version", "missing_setting"],
            "matched_requested_settings_keys": ["version"],
            "missing_requested_settings_keys": ["missing_setting"],
            "requested_gem_evidence": [
                "gem_names",
                "gem_names_count",
                "requested_gem_names",
                "matched_requested_gem_names",
                "missing_requested_gem_names"
            ],
            "gem_selection_mode": "requested-subset",
            "requested_gem_names": ["SchemaGem", "MissingGem"],
            "matched_requested_gem_names": ["SchemaGem"],
            "missing_requested_gem_names": ["MissingGem"],
            "gem_names": ["SchemaGem"],
            "gem_names_count": 1,
            "gem_entries_present": True,
            "requested_gem_subset_present": True,
            "manifest_settings": {"version": "1.0.0"},
            "manifest_settings_keys": ["version"],
            "requested_settings_subset_present": True
        },
    )

    assert errors == []


def test_schema_validation_service_accepts_simulated_project_inspect_execution_details() -> None:
    errors = schema_validation_service.validate_tool_args(
        schema_ref="schemas/tools/project.inspect.execution-details.schema.json",
        payload={
            "inspection_surface": "simulated",
            "execution_boundary": (
                "Execution mode is simulated until real O3DE adapters are implemented."
            ),
            "adapter_family": "project-build",
            "adapter_mode": "hybrid",
            "adapter_contract_version": "v0.1",
            "real_path_available": False,
            "fallback_reason": "Manifest file was not found."
        },
    )

    assert errors == []


def test_schema_validation_service_accepts_real_project_inspect_artifact_metadata() -> None:
    errors = schema_validation_service.validate_tool_args(
        schema_ref="schemas/tools/project.inspect.artifact-metadata.schema.json",
        payload={
            "tool": "project.inspect",
            "agent": "project-build",
            "execution_mode": "real",
            "adapter_family": "project-build",
            "adapter_mode": "hybrid",
            "adapter_contract_version": "v0.1",
            "inspection_surface": "project_manifest",
            "execution_boundary": "Hybrid mode enabled a real read-only manifest path.",
            "inspection_evidence": [
                "project_manifest",
                "project_config",
                "gem_names",
                "manifest_settings"
            ],
            "project_manifest_path": "/tmp/project/project.json",
            "manifest_keys": ["project_name", "version", "gem_names"],
            "project_name": "SchemaProject",
            "include_flags": {
                "include_project_config": True,
                "include_gems": True,
                "include_settings": True,
                "include_build_state": False
            },
            "project_config": {
                "project_name": "SchemaProject",
                "version": "1.0.0"
            },
            "project_config_keys": ["project_name", "version"],
            "requested_project_config_keys": ["project_name", "version"],
            "requested_settings_evidence": [
                "manifest_settings",
                "manifest_settings_keys",
                "requested_settings_keys",
                "matched_requested_settings_keys",
                "missing_requested_settings_keys"
            ],
            "settings_selection_mode": "requested-subset",
            "requested_settings_keys": ["version", "missing_setting"],
            "matched_requested_settings_keys": ["version"],
            "missing_requested_settings_keys": ["missing_setting"],
            "requested_gem_evidence": [
                "gem_names",
                "gem_names_count",
                "requested_gem_names",
                "matched_requested_gem_names",
                "missing_requested_gem_names"
            ],
            "gem_selection_mode": "requested-subset",
            "requested_gem_names": ["SchemaGem", "MissingGem"],
            "matched_requested_gem_names": ["SchemaGem"],
            "missing_requested_gem_names": ["MissingGem"],
            "gem_names": ["SchemaGem"],
            "gem_names_count": 1,
            "gem_entries_present": True,
            "requested_gem_subset_present": True,
            "manifest_settings": {"version": "1.0.0"},
            "manifest_settings_keys": ["version"],
            "requested_settings_subset_present": True
        },
    )

    assert errors == []


def test_schema_validation_service_validates_project_inspect_persisted_payload_helpers() -> None:
    execution_detail_errors = schema_validation_service.validate_execution_details(
        tool_name="project.inspect",
        payload={
            "inspection_surface": "project_manifest",
            "execution_boundary": "Hybrid mode enabled a real read-only manifest path.",
            "adapter_family": "project-build",
            "adapter_mode": "hybrid",
            "adapter_contract_version": "v0.1",
        },
    )
    artifact_metadata_errors = schema_validation_service.validate_artifact_metadata(
        tool_name="project.inspect",
        payload={
            "tool": "project.inspect",
            "agent": "project-build",
            "execution_mode": "real",
            "inspection_surface": "project_manifest",
            "execution_boundary": "Hybrid mode enabled a real read-only manifest path.",
            "adapter_family": "project-build",
            "adapter_mode": "hybrid",
            "adapter_contract_version": "v0.1",
        },
    )

    assert execution_detail_errors == []
    assert artifact_metadata_errors == []


def test_schema_validation_service_reports_subset_capabilities_truthfully() -> None:
    capability = schema_validation_service.get_capability_status()

    assert capability.mode == "subset-json-schema"
    assert capability.schema_scope == "published-tool-arg-result-schemas"
    assert capability.supports_request_args is True
    assert capability.supports_result_conformance is True
    assert capability.supports_persisted_execution_details is True
    assert capability.supports_persisted_artifact_metadata is True
    assert "$ref" in capability.active_keywords
    assert capability.active_unsupported_keywords == []
    assert "$schema" in capability.active_metadata_keywords
    assert "allOf" in capability.supported_keywords
    assert "oneOf" in capability.unsupported_keywords
    assert capability.persisted_execution_details_tool_count == 11
    assert capability.persisted_artifact_metadata_tool_count == 11
    assert capability.persisted_execution_details_tools == [
        "asset.processor.status",
        "asset.source.inspect",
        "build.compile",
        "build.configure",
        "editor.session.open",
        "gem.enable",
        "project.inspect",
        "render.capture.viewport",
        "render.material.inspect",
        "settings.patch",
        "test.visual.diff",
    ]
    assert capability.persisted_artifact_metadata_tools == [
        "asset.processor.status",
        "asset.source.inspect",
        "build.compile",
        "build.configure",
        "editor.session.open",
        "gem.enable",
        "project.inspect",
        "render.capture.viewport",
        "render.material.inspect",
        "settings.patch",
        "test.visual.diff",
    ]
    assert [item.model_dump() for item in capability.persisted_family_coverage] == [
        {
            "family": "editor-control",
            "total_tools": 4,
            "execution_details_tools": 1,
            "artifact_metadata_tools": 1,
            "covered_tools": [
                "editor.session.open",
            ],
            "uncovered_tools": [
                "editor.component.add",
                "editor.entity.create",
                "editor.level.open",
            ],
        },
        {
            "family": "asset-pipeline",
            "total_tools": 4,
            "execution_details_tools": 2,
            "artifact_metadata_tools": 2,
            "covered_tools": [
                "asset.processor.status",
                "asset.source.inspect",
            ],
            "uncovered_tools": [
                "asset.batch.process",
                "asset.move.safe",
            ],
        },
        {
            "family": "project-build",
            "total_tools": 5,
            "execution_details_tools": 5,
            "artifact_metadata_tools": 5,
            "covered_tools": [
                "build.compile",
                "build.configure",
                "gem.enable",
                "project.inspect",
                "settings.patch",
            ],
            "uncovered_tools": [],
        },
        {
            "family": "render-lookdev",
            "total_tools": 4,
            "execution_details_tools": 2,
            "artifact_metadata_tools": 2,
            "covered_tools": [
                "render.capture.viewport",
                "render.material.inspect",
            ],
            "uncovered_tools": [
                "render.material.patch",
                "render.shader.rebuild",
            ],
        },
        {
            "family": "validation",
            "total_tools": 4,
            "execution_details_tools": 1,
            "artifact_metadata_tools": 1,
            "covered_tools": [
                "test.visual.diff",
            ],
            "uncovered_tools": [
                "test.run.editor_python",
                "test.run.gtest",
                "test.tiaf.sequence",
            ],
        },
    ]
    assert any("does not claim full JSON Schema support" in note for note in capability.notes)
    assert any(
        "published tool arg/result schema files" in note for note in capability.notes
    )
    assert any(
        "active unsupported keywords should remain empty" in note
        for note in capability.notes
    )
    assert any(
        "Persisted payload coverage is reported separately" in note
        for note in capability.notes
    )
