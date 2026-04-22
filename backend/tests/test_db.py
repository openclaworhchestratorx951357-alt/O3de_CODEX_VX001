from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import app.services.db as db
from app.models.control_plane import (
    ArtifactRecord,
    EventRecord,
    EventSeverity,
    ExecutionRecord,
    ExecutionStatus,
    ExecutorRecord,
    RunRecord,
    RunStatus,
    WorkspaceRecord,
)
from app.repositories.control_plane import control_plane_repository
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
            "project_root_path": "/tmp/project",
            "project_manifest_relative_path": "project.json",
            "project_manifest_read_mode": "read-only",
            "project_manifest_source_of_truth": "project_root/project.json",
            "project_manifest_workspace_local": True,
            "project_manifest_within_project_root": True,
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
            "available_project_config_keys": ["project_name", "version"],
            "available_project_config_count": 2,
            "available_project_origin": {
                "template": "SchemaTemplate",
                "source": "manifest"
            },
            "available_project_origin_type": "object",
            "available_project_origin_keys": ["source", "template"],
            "project_origin_present": True,
            "available_project_id": "{33333333-3333-3333-3333-333333333333}",
            "project_id_present": True,
            "available_user_tags": ["schema", "contract"],
            "available_user_tag_count": 2,
            "identity_fields_present": True,
            "available_display_name": "Schema Project",
            "available_icon_path": "icons/schema.svg",
            "available_restricted_platform_name": "linux",
            "presentation_fields_present": True,
            "available_compatible_engines": ["o3de"],
            "available_compatible_engine_count": 1,
            "available_engine_api_dependency_keys": ["framework"],
            "available_engine_api_dependency_count": 1,
            "engine_compatibility_fields_present": True,
            "requested_project_config_keys": ["project_name", "version"],
            "matched_requested_project_config_count": 2,
            "missing_requested_project_config_count": 0,
            "project_config_fields_present": True,
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
            "available_gem_names": ["SchemaGem"],
            "available_gem_count": 1,
            "gem_names": ["SchemaGem"],
            "gem_names_count": 1,
            "gem_entries_present": True,
            "requested_gem_subset_present": True,
            "manifest_settings": {"version": "1.0.0"},
            "manifest_settings_keys": ["version"],
            "requested_build_state_evidence": [],
            "build_state_evidence_source": "not-requested",
            "build_state_selection_mode": "not-requested",
            "build_state_real_path_available": False,
            "requested_build_state_subset_present": False,
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
            "fallback_category": "manifest-missing",
            "fallback_reason": "Manifest file was not found."
            ,
            "project_root_path": "/tmp/project",
            "expected_project_manifest_path": "/tmp/project/project.json",
            "expected_project_manifest_relative_path": "project.json",
            "project_manifest_source_of_truth": "project_root/project.json"
        },
    )

    assert errors == []


def test_schema_validation_service_accepts_real_build_configure_execution_details() -> None:
    errors = schema_validation_service.validate_tool_args(
        schema_ref="schemas/tools/build.configure.execution-details.schema.json",
        payload={
            "inspection_surface": "build_configure_preflight",
            "execution_boundary": "Hybrid mode enabled a real plan-only preflight path.",
            "adapter_family": "project-build",
            "adapter_mode": "hybrid",
            "adapter_contract_version": "v0.1",
            "project_root_path": "/tmp/project",
            "project_manifest_path": "/tmp/project/project.json",
            "project_manifest_relative_path": "project.json",
            "project_manifest_read_mode": "read-only",
            "project_manifest_source_of_truth": "project_root/project.json",
            "project_manifest_workspace_local": True,
            "project_manifest_within_project_root": True,
            "preflight_execution_mode": "plan-only",
            "manifest_keys": ["project_name"],
            "project_name": "ConfigureProject",
            "plan_details": {"preset": "profile"},
        },
    )

    assert errors == []


def test_schema_validation_service_accepts_simulated_build_configure_fallback_details() -> None:
    errors = schema_validation_service.validate_tool_args(
        schema_ref="schemas/tools/build.configure.execution-details.schema.json",
        payload={
            "inspection_surface": "simulated",
            "execution_boundary": (
                "Execution mode is simulated until real O3DE adapters are implemented."
            ),
            "adapter_family": "project-build",
            "adapter_mode": "hybrid",
            "adapter_contract_version": "v0.1",
            "real_path_available": False,
            "fallback_category": "dry-run-required",
            "fallback_reason": "Real build.configure preflight requires dry_run=true.",
            "project_root_path": "/tmp/project",
            "expected_project_manifest_path": "/tmp/project/project.json",
            "expected_project_manifest_relative_path": "project.json",
            "project_manifest_source_of_truth": "project_root/project.json",
        },
    )

    assert errors == []


def test_schema_validation_service_accepts_real_settings_patch_execution_details() -> None:
    errors = schema_validation_service.validate_tool_args(
        schema_ref="schemas/tools/settings.patch.execution-details.schema.json",
        payload={
            "inspection_surface": "settings_patch_preflight",
            "execution_boundary": "Hybrid mode enabled a real settings.patch preflight path.",
            "simulated": False,
            "adapter_family": "project-build",
            "adapter_mode": "hybrid",
            "adapter_contract_version": "v0.1",
            "project_root_path": "/tmp/project",
            "project_manifest_path": "/tmp/project/project.json",
            "project_manifest_relative_path": "project.json",
            "project_manifest_read_mode": "read-only",
            "project_manifest_source_of_truth": "project_root/project.json",
            "project_manifest_workspace_local": True,
            "project_manifest_within_project_root": True,
            "project_name": "SettingsProject",
            "registry_path": "/O3DE/Settings",
            "operation_count": 1,
            "supported_operation_count": 1,
            "unsupported_operation_count": 0,
            "admitted_registry_path": "/O3DE/Settings",
            "admitted_manifest_paths": ["/version"],
            "backup_target": "/tmp/project/project.json.bak",
            "backup_created": True,
            "mutation_ready": True,
            "plan_details": {"patch_plan_valid": True},
        },
    )

    assert errors == []


def test_schema_validation_service_accepts_simulated_settings_patch_fallback_details() -> None:
    errors = schema_validation_service.validate_tool_args(
        schema_ref="schemas/tools/settings.patch.execution-details.schema.json",
        payload={
            "inspection_surface": "simulated",
            "execution_boundary": (
                "Execution mode is simulated until real O3DE adapters are implemented."
            ),
            "simulated": True,
            "adapter_family": "project-build",
            "adapter_mode": "hybrid",
            "adapter_contract_version": "v0.1",
            "real_path_available": False,
            "fallback_category": "manifest-missing",
            "fallback_reason": "Manifest file was not found.",
            "project_root_path": "/tmp/project",
            "expected_project_manifest_path": "/tmp/project/project.json",
            "expected_project_manifest_relative_path": "project.json",
            "project_manifest_source_of_truth": "project_root/project.json",
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
            "project_root_path": "/tmp/project",
            "project_manifest_relative_path": "project.json",
            "project_manifest_read_mode": "read-only",
            "project_manifest_source_of_truth": "project_root/project.json",
            "project_manifest_workspace_local": True,
            "project_manifest_within_project_root": True,
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
            "available_project_config_keys": ["project_name", "version"],
            "available_project_config_count": 2,
            "available_project_origin": {
                "template": "SchemaTemplate",
                "source": "manifest"
            },
            "available_project_origin_type": "object",
            "available_project_origin_keys": ["source", "template"],
            "project_origin_present": True,
            "available_project_id": "{33333333-3333-3333-3333-333333333333}",
            "project_id_present": True,
            "available_user_tags": ["schema", "contract"],
            "available_user_tag_count": 2,
            "identity_fields_present": True,
            "available_display_name": "Schema Project",
            "available_icon_path": "icons/schema.svg",
            "available_restricted_platform_name": "linux",
            "presentation_fields_present": True,
            "available_compatible_engines": ["o3de"],
            "available_compatible_engine_count": 1,
            "available_engine_api_dependency_keys": ["framework"],
            "available_engine_api_dependency_count": 1,
            "engine_compatibility_fields_present": True,
            "requested_project_config_keys": ["project_name", "version"],
            "matched_requested_project_config_count": 2,
            "missing_requested_project_config_count": 0,
            "project_config_fields_present": True,
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
            "available_gem_names": ["SchemaGem"],
            "available_gem_count": 1,
            "gem_names": ["SchemaGem"],
            "gem_names_count": 1,
            "gem_entries_present": True,
            "requested_gem_subset_present": True,
            "manifest_settings": {"version": "1.0.0"},
            "manifest_settings_keys": ["version"],
            "requested_build_state_evidence": [],
            "build_state_evidence_source": "not-requested",
            "build_state_selection_mode": "not-requested",
            "build_state_real_path_available": False,
            "requested_build_state_subset_present": False,
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
    assert capability.persisted_execution_details_tool_count == 22
    assert capability.persisted_artifact_metadata_tool_count == 22
    assert capability.persisted_execution_details_tools == [
        "asset.batch.process",
        "asset.move.safe",
        "asset.processor.status",
        "asset.source.inspect",
        "build.compile",
        "build.configure",
        "editor.component.add",
        "editor.component.property.get",
        "editor.entity.create",
        "editor.level.open",
        "editor.session.open",
        "gem.enable",
        "project.inspect",
        "render.capture.viewport",
        "render.material.inspect",
        "render.material.patch",
        "render.shader.rebuild",
        "settings.patch",
        "test.run.editor_python",
        "test.run.gtest",
        "test.tiaf.sequence",
        "test.visual.diff",
    ]
    assert capability.persisted_artifact_metadata_tools == [
        "asset.batch.process",
        "asset.move.safe",
        "asset.processor.status",
        "asset.source.inspect",
        "build.compile",
        "build.configure",
        "editor.component.add",
        "editor.component.property.get",
        "editor.entity.create",
        "editor.level.open",
        "editor.session.open",
        "gem.enable",
        "project.inspect",
        "render.capture.viewport",
        "render.material.inspect",
        "render.material.patch",
        "render.shader.rebuild",
        "settings.patch",
        "test.run.editor_python",
        "test.run.gtest",
        "test.tiaf.sequence",
        "test.visual.diff",
    ]
    assert [item.model_dump() for item in capability.persisted_family_coverage] == [
        {
            "family": "editor-control",
            "total_tools": 5,
            "execution_details_tools": 5,
            "artifact_metadata_tools": 5,
            "covered_tools": [
                "editor.component.add",
                "editor.component.property.get",
                "editor.entity.create",
                "editor.level.open",
                "editor.session.open",
            ],
            "uncovered_tools": [],
        },
        {
            "family": "asset-pipeline",
            "total_tools": 4,
            "execution_details_tools": 4,
            "artifact_metadata_tools": 4,
            "covered_tools": [
                "asset.batch.process",
                "asset.move.safe",
                "asset.processor.status",
                "asset.source.inspect",
            ],
            "uncovered_tools": [],
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
            "execution_details_tools": 4,
            "artifact_metadata_tools": 4,
            "covered_tools": [
                "render.capture.viewport",
                "render.material.inspect",
                "render.material.patch",
                "render.shader.rebuild",
            ],
            "uncovered_tools": [],
        },
        {
            "family": "validation",
            "total_tools": 4,
            "execution_details_tools": 4,
            "artifact_metadata_tools": 4,
            "covered_tools": [
                "test.run.editor_python",
                "test.run.gtest",
                "test.tiaf.sequence",
                "test.visual.diff",
            ],
            "uncovered_tools": [],
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


def test_database_initialization_adds_phase_6b_tables_and_columns() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        db_path = Path(temp_dir) / "phase-6b.sqlite3"
        db.configure_database(db_path)
        initialized_path = db.initialize_database()

        assert initialized_path == db_path.resolve()

        with db.connection() as conn:
            execution_columns = {
                row["name"]
                for row in conn.execute("PRAGMA table_info(executions)").fetchall()
            }
            event_columns = {
                row["name"] for row in conn.execute("PRAGMA table_info(events)").fetchall()
            }
            artifact_columns = {
                row["name"]
                for row in conn.execute("PRAGMA table_info(artifacts)").fetchall()
            }
            executor_table = conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'executors'"
            ).fetchone()
            workspace_table = conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'workspaces'"
            ).fetchone()

        assert {
            "executor_id",
            "workspace_id",
            "runner_family",
            "execution_attempt_state",
            "failure_category",
            "failure_stage",
            "approval_class",
            "lock_scope",
            "backup_class",
            "rollback_class",
            "retention_class",
        }.issubset(execution_columns)
        assert {
            "execution_id",
            "executor_id",
            "workspace_id",
            "event_type",
            "previous_state",
            "current_state",
            "failure_category",
        }.issubset(event_columns)
        assert {
            "artifact_role",
            "executor_id",
            "workspace_id",
            "retention_class",
            "evidence_completeness",
        }.issubset(artifact_columns)
        assert executor_table is not None
        assert workspace_table is not None


def test_repository_round_trip_supports_phase_6b_substrate_records() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        db.configure_database(Path(temp_dir) / "phase-6b-roundtrip.sqlite3")
        db.reset_database()

        now = datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc)
        control_plane_repository.create_run(
            RunRecord(
                id="run-1",
                request_id="request-1",
                agent="project-build",
                tool="build.configure",
                status=RunStatus.SUCCEEDED,
                created_at=now,
                updated_at=now,
            )
        )
        executor = control_plane_repository.create_executor(
            ExecutorRecord(
                id="executor-1",
                executor_kind="container-backed",
                executor_label="Primary Executor",
                executor_host_label="docker-local",
                execution_mode_class="simulated",
                availability_state="available",
                supported_runner_families=["cli", "file-manifest"],
                capability_snapshot={"docker": True},
                last_heartbeat_at=now,
                created_at=now,
                updated_at=now,
            )
        )
        workspace = control_plane_repository.create_workspace(
            WorkspaceRecord(
                id="workspace-1",
                workspace_kind="ephemeral-local",
                workspace_root="/tmp/workspace-1",
                workspace_state="ready",
                cleanup_policy="cleanup-after-run",
                retention_class="ephemeral-success",
                engine_binding={"engine_root": "/tmp/engine"},
                project_binding={"project_root": "/tmp/project"},
                runner_family="cli",
                owner_run_id="run-1",
                owner_execution_id="exe-1",
                owner_executor_id=executor.id,
                created_at=now,
                activated_at=now,
            )
        )
        execution = control_plane_repository.create_execution(
            ExecutionRecord(
                id="exe-1",
                run_id="run-1",
                request_id="request-1",
                agent="project-build",
                tool="build.configure",
                execution_mode="simulated",
                status=ExecutionStatus.SUCCEEDED,
                started_at=now,
                finished_at=now,
                executor_id=executor.id,
                workspace_id=workspace.id,
                runner_family="cli",
                execution_attempt_state="completed",
                approval_class="plan-sensitive",
                lock_scope="workspace",
                backup_class="none",
                rollback_class="none",
                retention_class="ephemeral-success",
                details={"inspection_surface": "simulated"},
            )
        )
        artifact = control_plane_repository.create_artifact(
            ArtifactRecord(
                id="art-1",
                run_id="run-1",
                execution_id=execution.id,
                label="execution-summary",
                kind="summary",
                uri="memory://art-1",
                simulated=True,
                created_at=now,
                artifact_role="summary",
                executor_id=executor.id,
                workspace_id=workspace.id,
                retention_class="ephemeral-success",
                evidence_completeness="summary-only",
                metadata={"execution_mode": "simulated"},
            )
        )
        event = control_plane_repository.create_event(
            EventRecord(
                id="evt-1",
                run_id="run-1",
                execution_id=execution.id,
                executor_id=executor.id,
                workspace_id=workspace.id,
                category="execution",
                event_type="runner.completed",
                severity=EventSeverity.INFO,
                message="Runner completed.",
                created_at=now,
                previous_state="running",
                current_state="completed",
                details={"summary": "completed"},
            )
        )

        stored_executor = control_plane_repository.get_executor(executor.id)
        stored_workspace = control_plane_repository.get_workspace(workspace.id)
        stored_execution = control_plane_repository.get_execution(execution.id)
        stored_artifact = control_plane_repository.get_artifact(artifact.id)
        stored_event = next(
            item for item in control_plane_repository.list_events() if item.id == event.id
        )

        assert stored_executor is not None
        assert stored_executor.supported_runner_families == ["cli", "file-manifest"]
        assert stored_executor.capability_snapshot == {"docker": True}
        assert stored_workspace is not None
        assert stored_workspace.owner_executor_id == executor.id
        assert stored_workspace.engine_binding == {"engine_root": "/tmp/engine"}
        assert stored_execution is not None
        assert stored_execution.executor_id == executor.id
        assert stored_execution.workspace_id == workspace.id
        assert stored_execution.execution_attempt_state == "completed"
        assert stored_execution.lock_scope == "workspace"
        assert stored_artifact is not None
        assert stored_artifact.artifact_role == "summary"
        assert stored_artifact.executor_id == executor.id
        assert stored_artifact.evidence_completeness == "summary-only"
        assert stored_event.execution_id == execution.id
        assert stored_event.event_type == "runner.completed"
        assert stored_event.current_state == "completed"


def test_repository_reads_legacy_phase_6b_null_columns_without_breaking() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        db.configure_database(Path(temp_dir) / "phase-6b-legacy.sqlite3")
        db.reset_database()

        with db.connection() as conn:
            conn.execute(
                """
                INSERT INTO runs (
                    id, request_id, agent, tool, status, created_at, updated_at,
                    dry_run, approval_id, approval_token, requested_locks,
                    granted_locks, warnings, execution_mode, result_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "run-legacy",
                    "request-legacy",
                    "project-build",
                    "project.inspect",
                    "succeeded",
                    datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc).isoformat(),
                    datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc).isoformat(),
                    1,
                    None,
                    None,
                    db.encode_json([]),
                    db.encode_json([]),
                    db.encode_json([]),
                    "simulated",
                    "legacy run",
                ),
            )
            conn.execute(
                """
                INSERT INTO executions (
                    id, run_id, request_id, agent, tool, execution_mode, status,
                    started_at, finished_at, warnings, logs, artifact_ids, details, result_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "exe-legacy",
                    "run-legacy",
                    "request-legacy",
                    "project-build",
                    "project.inspect",
                    "simulated",
                    "succeeded",
                    datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc).isoformat(),
                    None,
                    db.encode_json([]),
                    db.encode_json([]),
                    db.encode_json([]),
                    db.encode_json({"inspection_surface": "simulated"}),
                    "legacy execution",
                ),
            )
            conn.execute(
                """
                INSERT INTO artifacts (
                    id, run_id, execution_id, label, kind, uri, path, content_type,
                    simulated, created_at, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "art-legacy",
                    "run-legacy",
                    "exe-legacy",
                    "legacy artifact",
                    "summary",
                    "memory://art-legacy",
                    None,
                    None,
                    1,
                    datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc).isoformat(),
                    db.encode_json({"execution_mode": "simulated"}),
                ),
            )
            conn.execute(
                """
                INSERT INTO events (
                    id, run_id, category, severity, message, created_at, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "evt-legacy",
                    "run-legacy",
                    "execution",
                    "info",
                    "legacy event",
                    datetime(2026, 4, 20, 12, 0, tzinfo=timezone.utc).isoformat(),
                    db.encode_json({"summary": "legacy"}),
                ),
            )

        execution = control_plane_repository.get_execution("exe-legacy")
        artifact = control_plane_repository.get_artifact("art-legacy")
        event = next(
            item for item in control_plane_repository.list_events() if item.id == "evt-legacy"
        )

        assert execution is not None
        assert execution.executor_id is None
        assert execution.workspace_id is None
        assert execution.execution_attempt_state is None
        assert artifact is not None
        assert artifact.artifact_role is None
        assert artifact.executor_id is None
        assert event.execution_id is None
        assert event.event_type is None
