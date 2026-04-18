import json
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from app.models.request_envelope import RequestEnvelope
from app.services.approvals import approvals_service
from app.services.artifacts import artifacts_service
from app.services.db import configure_database, initialize_database, reset_database
from app.services.dispatcher import dispatcher_service
from app.services.events import events_service
from app.services.executions import executions_service
from app.services.locks import locks_service
from app.services.runs import runs_service
from app.services.schema_validation import schema_validation_service


def make_request(
    agent: str,
    tool: str,
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
) -> RequestEnvelope:
    return RequestEnvelope(
        request_id="req-1",
        tool=tool,
        agent=agent,
        project_root=project_root,
        engine_root="/tmp/engine",
        dry_run=dry_run,
        locks=[],
        timeout_s=30,
        args={},
    )


def make_settings_patch_request() -> RequestEnvelope:
    request = make_request("project-build", "settings.patch")
    request.args = {
        "registry_path": "/O3DE/Settings",
        "operations": [
            {
                "op": "set",
                "path": "/render/quality",
                "value": "high",
            }
        ],
    }
    return request


def approve_settings_patch_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_settings_patch_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_settings_patch_request()
    approved_request.approval_token = approval.token
    return approved_request


def make_gem_enable_request() -> RequestEnvelope:
    request = make_request("project-build", "gem.enable")
    request.args = {
        "gem_name": "ExampleGem",
    }
    return request


def approve_gem_enable_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_gem_enable_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_gem_enable_request()
    approved_request.approval_token = approval.token
    return approved_request


def make_build_compile_request() -> RequestEnvelope:
    request = make_request("project-build", "build.compile")
    request.args = {
        "targets": ["Editor"],
    }
    return request


def approve_build_compile_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_build_compile_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_build_compile_request()
    approved_request.approval_token = approval.token
    return approved_request


def make_asset_processor_status_request() -> RequestEnvelope:
    request = make_request("asset-pipeline", "asset.processor.status")
    request.args = {
        "include_jobs": True,
        "include_platforms": True,
    }
    return request


def make_asset_source_inspect_request() -> RequestEnvelope:
    request = make_request("asset-pipeline", "asset.source.inspect")
    request.args = {
        "source_path": "Assets/Textures/example.png",
        "include_products": True,
        "include_dependencies": True,
    }
    return request


def make_asset_batch_process_request() -> RequestEnvelope:
    request = make_request("asset-pipeline", "asset.batch.process")
    request.args = {
        "source_glob": "Assets/**/*.fbx",
        "platforms": ["pc"],
        "clean": False,
        "max_jobs": 4,
    }
    return request


def approve_asset_batch_process_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_asset_batch_process_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_asset_batch_process_request()
    approved_request.approval_token = approval.token
    return approved_request


def make_render_material_inspect_request() -> RequestEnvelope:
    request = make_request("render-lookdev", "render.material.inspect")
    request.args = {
        "material_path": "Materials/Example.material",
        "include_shader_data": True,
        "include_references": True,
    }
    return request


def make_render_capture_viewport_request() -> RequestEnvelope:
    request = make_request("render-lookdev", "render.capture.viewport")
    request.args = {
        "output_label": "baseline-shot",
        "camera_entity_id": "camera-001",
        "resolution": {
            "width": 1280,
            "height": 720,
        },
    }
    return request


def make_test_visual_diff_request() -> RequestEnvelope:
    request = make_request("validation", "test.visual.diff")
    request.args = {
        "baseline_artifact_id": "artifact-baseline-001",
        "candidate_artifact_id": "artifact-candidate-001",
        "threshold": 0.1,
    }
    return request


def make_test_run_editor_python_request() -> RequestEnvelope:
    request = make_request("validation", "test.run.editor_python")
    request.args = {
        "test_modules": ["Automated.testing.sample_test"],
        "editor_args": ["--autotest_mode"],
        "timeout_s": 120,
    }
    return request


def approve_test_run_editor_python_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_test_run_editor_python_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_test_run_editor_python_request()
    approved_request.approval_token = approval.token
    return approved_request


def make_test_run_gtest_request() -> RequestEnvelope:
    request = make_request("validation", "test.run.gtest")
    request.args = {
        "test_targets": ["AzCoreTests"],
        "filter": "Smoke*",
        "timeout_s": 120,
    }
    return request


def approve_test_run_gtest_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_test_run_gtest_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_test_run_gtest_request()
    approved_request.approval_token = approval.token
    return approved_request


def make_test_tiaf_sequence_request() -> RequestEnvelope:
    request = make_request("validation", "test.tiaf.sequence")
    request.args = {
        "sequence_name": "smoke-sequence",
        "platforms": ["windows"],
        "shard_count": 2,
    }
    return request


def approve_test_tiaf_sequence_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_test_tiaf_sequence_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_test_tiaf_sequence_request()
    approved_request.approval_token = approval.token
    return approved_request


def make_editor_session_open_request() -> RequestEnvelope:
    request = make_request("editor-control", "editor.session.open")
    request.args = {
        "session_mode": "open",
        "project_path": "/tmp/project",
        "level_path": "Levels/Main.level",
        "timeout_s": 30,
    }
    return request


def approve_editor_session_open_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_editor_session_open_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_editor_session_open_request()
    approved_request.approval_token = approval.token
    return approved_request


def make_editor_level_open_request() -> RequestEnvelope:
    request = make_request("editor-control", "editor.level.open")
    request.args = {
        "level_path": "Levels/Main.level",
        "make_writable": True,
        "focus_viewport": True,
    }
    return request


def approve_editor_level_open_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_editor_level_open_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_editor_level_open_request()
    approved_request.approval_token = approval.token
    return approved_request


def make_editor_entity_create_request() -> RequestEnvelope:
    request = make_request("editor-control", "editor.entity.create")
    request.args = {
        "entity_name": "ExampleEntity",
        "level_path": "Levels/Main.level",
        "position": {
            "x": 1,
            "y": 2,
            "z": 3,
        },
    }
    return request


def approve_editor_entity_create_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_editor_entity_create_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_editor_entity_create_request()
    approved_request.approval_token = approval.token
    return approved_request


def make_editor_component_add_request() -> RequestEnvelope:
    request = make_request("editor-control", "editor.component.add")
    request.args = {
        "entity_id": "entity-001",
        "components": ["Mesh", "Transform"],
        "level_path": "Levels/Main.level",
    }
    return request


def approve_editor_component_add_request() -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_editor_component_add_request())
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_editor_component_add_request()
    approved_request.approval_token = approval.token
    return approved_request


@contextmanager
def isolated_database() -> Path:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        db_path = Path(temp_dir) / "control-plane.sqlite3"
        configure_database(db_path)
        initialize_database()
        reset_database()
        try:
            yield db_path
        finally:
            configure_database(None)


def test_dispatch_accepts_valid_agent_and_tool() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(
            make_request("project-build", "project.inspect")
        )
        assert response.ok is True
        assert response.error is None
        assert response.operation_id is not None
        assert response.result is not None
        assert response.result.simulated is True
        assert len(response.artifacts) == 1
        execution = executions_service.list_executions()[0]
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["adapter_family"] == "project-build"
        assert execution.details["adapter_contract_version"] == "v0.1"
        assert artifact is not None
        assert artifact.metadata["adapter_family"] == "project-build"
        assert artifact.metadata["adapter_contract_version"] == "v0.1"


def test_dispatch_rejects_unknown_agent() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(
            make_request("unknown-agent", "project.inspect")
        )
        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_AGENT"


def test_dispatch_rejects_invalid_tool_for_agent() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(
            make_request("project-build", "render.capture.viewport")
        )
        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_TOOL"


def test_dispatch_requires_approval_for_mutating_tool() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(
            make_request("project-build", "build.configure")
        )
        assert response.ok is False
        assert response.approval_id is not None
        assert response.error is not None
        assert response.error.code == "APPROVAL_REQUIRED"


def test_dispatch_rejects_args_that_fail_tool_schema_validation() -> None:
    with isolated_database():
        request = make_request("project-build", "build.compile")
        request.args = {"targets": []}
        response = dispatcher_service.dispatch(request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_ARGS"
        assert response.error.details is not None
        assert response.error.details["args_schema_ref"].endswith(
            "build.compile.args.schema.json"
        )


def test_dispatch_rejects_simulated_result_that_fails_result_schema_validation() -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_tool_result",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(
                make_request("project-build", "project.inspect")
            )

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_RESULT"
        assert response.error.details is not None
        assert response.error.details["result_schema_ref"].endswith(
            "project.inspect.result.schema.json"
        )


def test_dispatch_rejects_when_project_inspect_execution_details_fail_schema_validation() -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[
                (
                    "$.inspection_surface: expected one of ['simulated', "
                    "'project_manifest']"
                )
            ],
        ):
            response = dispatcher_service.dispatch(
                make_request("project-build", "project.inspect")
            )

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"


def test_dispatch_rejects_when_project_inspect_artifact_metadata_fail_schema_validation() -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'project.inspect'"],
            ):
                response = dispatcher_service.dispatch(
                    make_request("project-build", "project.inspect")
                )

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"


def test_dispatch_rejects_when_build_configure_execution_details_fail_schema_validation() -> None:
    with isolated_database():
        first = dispatcher_service.dispatch(make_request("project-build", "build.configure"))
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        approved_request = make_request("project-build", "build.configure")
        approved_request.approval_token = approval.token

        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[
                (
                    "$.inspection_surface: expected one of ['simulated', "
                    "'build_configure_preflight']"
                )
            ],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "build.configure.execution-details.schema.json"
        )


def test_dispatch_rejects_when_build_configure_artifact_metadata_fail_schema_validation() -> None:
    with isolated_database():
        first = dispatcher_service.dispatch(make_request("project-build", "build.configure"))
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        approved_request = make_request("project-build", "build.configure")
        approved_request.approval_token = approval.token

        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'build.configure'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "build.configure.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_settings_patch_execution_details_fail_schema_validation() -> None:
    with isolated_database():
        approved_request = approve_settings_patch_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "settings.patch.execution-details.schema.json"
        )


def test_dispatch_rejects_when_settings_patch_artifact_metadata_fail_schema_validation() -> None:
    with isolated_database():
        approved_request = approve_settings_patch_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.execution_mode: expected constant value 'simulated'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "settings.patch.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_gem_enable_execution_details_fail_schema_validation() -> None:
    with isolated_database():
        approved_request = approve_gem_enable_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "gem.enable.execution-details.schema.json"
        )


def test_dispatch_rejects_when_gem_enable_artifact_metadata_fail_schema_validation() -> None:
    with isolated_database():
        approved_request = approve_gem_enable_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.execution_mode: expected constant value 'simulated'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "gem.enable.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_build_compile_execution_details_fail_schema_validation() -> None:
    with isolated_database():
        approved_request = approve_build_compile_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "build.compile.execution-details.schema.json"
        )


def test_dispatch_rejects_when_build_compile_artifact_metadata_fail_schema_validation() -> None:
    with isolated_database():
        approved_request = approve_build_compile_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.execution_mode: expected constant value 'simulated'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "build.compile.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_asset_processor_status_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(make_asset_processor_status_request())

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "asset.processor.status.execution-details.schema.json"
        )


def test_dispatch_rejects_when_asset_batch_process_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_asset_batch_process_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "asset.batch.process.execution-details.schema.json"
        )


def test_dispatch_rejects_when_asset_processor_status_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.execution_mode: expected constant value 'simulated'"],
            ):
                response = dispatcher_service.dispatch(make_asset_processor_status_request())

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "asset.processor.status.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_asset_batch_process_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_asset_batch_process_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'asset.batch.process'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "asset.batch.process.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_asset_source_inspect_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(make_asset_source_inspect_request())

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "asset.source.inspect.execution-details.schema.json"
        )


def test_dispatch_rejects_when_asset_source_inspect_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.execution_mode: expected constant value 'simulated'"],
            ):
                response = dispatcher_service.dispatch(make_asset_source_inspect_request())

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "asset.source.inspect.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_render_material_inspect_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(make_render_material_inspect_request())

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "render.material.inspect.execution-details.schema.json"
        )


def test_dispatch_rejects_when_render_material_inspect_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.execution_mode: expected constant value 'simulated'"],
            ):
                response = dispatcher_service.dispatch(make_render_material_inspect_request())

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "render.material.inspect.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_render_capture_viewport_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(make_render_capture_viewport_request())

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "render.capture.viewport.execution-details.schema.json"
        )


def test_dispatch_rejects_when_render_capture_viewport_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.execution_mode: expected constant value 'simulated'"],
            ):
                response = dispatcher_service.dispatch(make_render_capture_viewport_request())

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "render.capture.viewport.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_test_visual_diff_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(make_test_visual_diff_request())

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "test.visual.diff.execution-details.schema.json"
        )


def test_dispatch_rejects_when_test_visual_diff_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.execution_mode: expected constant value 'simulated'"],
            ):
                response = dispatcher_service.dispatch(make_test_visual_diff_request())

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "test.visual.diff.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_test_run_editor_python_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_test_run_editor_python_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "test.run.editor_python.execution-details.schema.json"
        )


def test_dispatch_rejects_when_test_run_editor_python_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_test_run_editor_python_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'test.run.editor_python'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "test.run.editor_python.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_test_run_gtest_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_test_run_gtest_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "test.run.gtest.execution-details.schema.json"
        )


def test_dispatch_rejects_when_test_run_gtest_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_test_run_gtest_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'test.run.gtest'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "test.run.gtest.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_test_tiaf_sequence_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_test_tiaf_sequence_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "test.tiaf.sequence.execution-details.schema.json"
        )


def test_dispatch_rejects_when_test_tiaf_sequence_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_test_tiaf_sequence_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'test.tiaf.sequence'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "test.tiaf.sequence.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_editor_session_open_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_editor_session_open_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "editor.session.open.execution-details.schema.json"
        )


def test_dispatch_rejects_when_editor_session_open_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_editor_session_open_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'editor.session.open'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "editor.session.open.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_editor_level_open_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_editor_level_open_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "editor.level.open.execution-details.schema.json"
        )


def test_dispatch_rejects_when_editor_level_open_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_editor_level_open_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'editor.level.open'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "editor.level.open.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_editor_entity_create_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_editor_entity_create_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "editor.entity.create.execution-details.schema.json"
        )


def test_dispatch_rejects_when_editor_entity_create_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_editor_entity_create_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'editor.entity.create'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "editor.entity.create.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_editor_component_add_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_editor_component_add_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "execution details"
        assert response.error.details["persisted_schema_ref"].endswith(
            "editor.component.add.execution-details.schema.json"
        )


def test_dispatch_rejects_when_editor_component_add_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_editor_component_add_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'editor.component.add'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "editor.component.add.artifact-metadata.schema.json"
        )


def test_dispatch_accepts_after_approval() -> None:
    with isolated_database():
        first = dispatcher_service.dispatch(make_request("project-build", "build.configure"))
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        approved_request = make_request("project-build", "build.configure")
        approved_request.approval_token = approval.token
        response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.execution_mode == "simulated"
        assert len(executions_service.list_executions()) >= 2


def test_dispatch_blocks_when_lock_is_owned() -> None:
    with isolated_database():
        first = dispatcher_service.dispatch(make_request("project-build", "build.configure"))
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        blocking_request = make_request("project-build", "build.configure")
        blocking_request.approval_token = approval.token
        blocking_run_response = dispatcher_service.dispatch(blocking_request)
        assert blocking_run_response.ok is True
        blocking_run_id = blocking_run_response.operation_id
        assert blocking_run_id is not None

        locks_service.acquire(["build_tree"], owner_run_id=blocking_run_id)
        blocked_request = make_request("project-build", "build.configure")
        blocked_request.approval_token = approval.token
        blocked = dispatcher_service.dispatch(blocked_request)

        assert blocked.ok is False
        assert blocked.error is not None
        assert blocked.error.code == "STATE_LOCKED"
        assert any(lock.name == "build_tree" for lock in locks_service.list_locks())

        locks_service.release(blocking_run_id)


def test_every_dispatch_attempt_creates_a_run_record() -> None:
    with isolated_database():
        before = len(runs_service.list_runs())
        dispatcher_service.dispatch(make_request("not-a-real-agent", "project.inspect"))
        after = len(runs_service.list_runs())
        assert after == before + 1


def test_events_and_runs_remain_queryable_after_restart() -> None:
    with isolated_database() as db_path:
        response = dispatcher_service.dispatch(make_request("project-build", "project.inspect"))
        run_id = response.operation_id
        assert run_id is not None
        artifact_id = response.artifacts[0]
        execution_id = executions_service.list_executions()[0].id

        configure_database(db_path)
        initialize_database()

        persisted_run = runs_service.get_run(run_id)
        persisted_events = events_service.list_events()
        persisted_execution = executions_service.get_execution(execution_id)
        persisted_artifact = artifacts_service.get_artifact(artifact_id)
        assert persisted_run is not None
        assert any(event.run_id == run_id for event in persisted_events)
        assert persisted_execution is not None
        assert persisted_execution.execution_mode == "simulated"
        assert persisted_execution.details["adapter_family"] == "project-build"
        assert persisted_execution.details["adapter_contract_version"] == "v0.1"
        assert persisted_artifact is not None
        assert persisted_artifact.simulated is True
        assert persisted_artifact.metadata["adapter_family"] == "project-build"
        assert persisted_artifact.metadata["adapter_contract_version"] == "v0.1"


def test_dispatch_rejects_when_adapter_mode_is_invalid() -> None:
    with isolated_database():
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "real"}, clear=False):
            response = dispatcher_service.dispatch(
                make_request("project-build", "project.inspect")
            )

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "ADAPTER_NOT_READY"


def test_project_inspect_uses_real_manifest_path_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps(
                {
                    "project_name": "Phase7Project",
                    "gem_names": ["ExampleGem"],
                    "compatible_engines": ["o3de"],
                    "version": "1.0.0",
                }
            ),
            encoding="utf-8",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            request = make_request(
                "project-build",
                "project.inspect",
                project_root=str(project_root),
            )
            request.args = {
                "include_project_config": True,
                "project_config_keys": ["project_name", "version", "compatible_engines"],
                "include_gems": True,
                "requested_gem_names": ["ExampleGem", "MissingGem"],
                "include_settings": True,
                "requested_settings_keys": ["version", "missing_setting"],
            }
            response = dispatcher_service.dispatch(request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        assert "Phase7Project" in response.result.message
        execution = executions_service.list_executions()[0]
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "project_manifest"
        assert execution.details["inspection_evidence"] == [
            "project_manifest",
            "project_config",
            "gem_names",
            "manifest_settings",
        ]
        assert execution.details["project_manifest_path"].endswith("project.json")
        assert execution.details["project_name"] == "Phase7Project"
        assert execution.details["project_config"]["project_name"] == "Phase7Project"
        assert execution.details["project_config"]["version"] == "1.0.0"
        assert execution.details["project_config_keys"] == [
            "compatible_engines",
            "project_name",
            "version",
        ]
        assert execution.details["requested_project_config_keys"] == [
            "project_name",
            "version",
            "compatible_engines",
        ]
        assert execution.details["requested_settings_evidence"] == [
            "manifest_settings",
            "manifest_settings_keys",
            "requested_settings_keys",
            "matched_requested_settings_keys",
            "missing_requested_settings_keys",
        ]
        assert execution.details["settings_selection_mode"] == "requested-subset"
        assert execution.details["requested_settings_keys"] == ["version", "missing_setting"]
        assert execution.details["matched_requested_settings_keys"] == ["version"]
        assert execution.details["missing_requested_settings_keys"] == ["missing_setting"]
        assert execution.details["requested_gem_evidence"] == [
            "gem_names",
            "gem_names_count",
            "requested_gem_names",
            "matched_requested_gem_names",
            "missing_requested_gem_names",
        ]
        assert execution.details["gem_selection_mode"] == "requested-subset"
        assert execution.details["requested_gem_names"] == ["ExampleGem", "MissingGem"]
        assert execution.details["matched_requested_gem_names"] == ["ExampleGem"]
        assert execution.details["missing_requested_gem_names"] == ["MissingGem"]
        assert execution.details["gem_names"] == ["ExampleGem"]
        assert execution.details["gem_names_count"] == 1
        assert execution.details["gem_entries_present"] is True
        assert execution.details["requested_gem_subset_present"] is True
        assert execution.details["manifest_settings"]["version"] == "1.0.0"
        assert execution.details["manifest_settings_keys"] == ["version"]
        assert execution.details["requested_settings_subset_present"] is True
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["project_name"] == "Phase7Project"
        assert artifact.metadata["project_config"]["version"] == "1.0.0"
        assert artifact.metadata["requested_settings_evidence"] == [
            "manifest_settings",
            "manifest_settings_keys",
            "requested_settings_keys",
            "matched_requested_settings_keys",
            "missing_requested_settings_keys",
        ]
        assert artifact.metadata["settings_selection_mode"] == "requested-subset"
        assert artifact.metadata["requested_settings_keys"] == ["version", "missing_setting"]
        assert artifact.metadata["matched_requested_settings_keys"] == ["version"]
        assert artifact.metadata["missing_requested_settings_keys"] == ["missing_setting"]
        assert artifact.metadata["requested_gem_evidence"] == [
            "gem_names",
            "gem_names_count",
            "requested_gem_names",
            "matched_requested_gem_names",
            "missing_requested_gem_names",
        ]
        assert artifact.metadata["gem_selection_mode"] == "requested-subset"
        assert artifact.metadata["requested_gem_names"] == ["ExampleGem", "MissingGem"]
        assert artifact.metadata["matched_requested_gem_names"] == ["ExampleGem"]
        assert artifact.metadata["missing_requested_gem_names"] == ["MissingGem"]
        assert artifact.metadata["gem_names"] == ["ExampleGem"]
        assert artifact.metadata["gem_entries_present"] is True
        assert artifact.metadata["requested_gem_subset_present"] is True
        assert artifact.metadata["manifest_settings"]["version"] == "1.0.0"
        assert artifact.metadata["manifest_settings_keys"] == ["version"]
        assert artifact.metadata["requested_settings_subset_present"] is True
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="project.inspect",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="project.inspect",
                payload=artifact.metadata,
            )
            == []
        )


def test_project_inspect_reports_empty_requested_manifest_evidence_truthfully() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "LeanProject"}),
            encoding="utf-8",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            request = make_request(
                "project-build",
                "project.inspect",
                project_root=str(project_root),
            )
            request.args = {
                "include_project_config": True,
                "project_config_keys": ["version", "summary"],
                "include_gems": True,
                "requested_gem_names": ["MissingGem"],
                "include_settings": True,
                "requested_settings_keys": ["summary", "missing_setting"],
            }
            response = dispatcher_service.dispatch(request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["project_config"] == {}
        assert execution.details["project_config_keys"] == []
        assert execution.details["requested_project_config_keys"] == ["version", "summary"]
        assert execution.details["requested_settings_evidence"] == [
            "manifest_settings",
            "manifest_settings_keys",
            "requested_settings_keys",
            "matched_requested_settings_keys",
            "missing_requested_settings_keys",
        ]
        assert execution.details["settings_selection_mode"] == "requested-subset"
        assert execution.details["requested_settings_keys"] == ["summary", "missing_setting"]
        assert execution.details["matched_requested_settings_keys"] == []
        assert execution.details["missing_requested_settings_keys"] == [
            "summary",
            "missing_setting",
        ]
        assert execution.details["requested_gem_evidence"] == [
            "gem_names",
            "gem_names_count",
            "requested_gem_names",
            "matched_requested_gem_names",
            "missing_requested_gem_names",
        ]
        assert execution.details["gem_selection_mode"] == "requested-subset"
        assert execution.details["requested_gem_names"] == ["MissingGem"]
        assert execution.details["matched_requested_gem_names"] == []
        assert execution.details["missing_requested_gem_names"] == ["MissingGem"]
        assert execution.details["gem_names"] == []
        assert execution.details["gem_names_count"] == 0
        assert execution.details["gem_entries_present"] is False
        assert execution.details["requested_gem_subset_present"] is False
        assert execution.details["manifest_settings"] == {}
        assert execution.details["manifest_settings_keys"] == []
        assert execution.details["requested_settings_subset_present"] is False
        assert any(
            "No manifest-backed project-config fields were present" in warning
            for warning in execution.warnings
        )
        assert any(
            "No manifest-backed settings fields were present" in warning
            for warning in execution.warnings
        )
        assert any(
            "None of the requested_settings_keys matched manifest-backed settings fields"
            in warning
            for warning in execution.warnings
        )
        assert any("No gem_names entries were present" in warning for warning in execution.warnings)
        assert any(
            "None of the requested_gem_names matched manifest-backed gem_names entries"
            in warning
            for warning in execution.warnings
        )


def test_project_inspect_falls_back_to_simulated_when_manifest_is_missing_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                make_request(
                    "project-build",
                    "project.inspect",
                    project_root=temp_dir,
                )
            )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        assert response.result.execution_mode == "simulated"
        execution = executions_service.list_executions()[0]
        assert execution.details["real_path_available"] is False
        assert "fallback_reason" in execution.details
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="project.inspect",
                payload=execution.details,
            )
            == []
        )


def test_build_configure_uses_real_preflight_path_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps({"project_name": "Phase7ConfigureProject"}),
            encoding="utf-8",
        )
        first = dispatcher_service.dispatch(
            make_request(
                "project-build",
                "build.configure",
                project_root=str(project_root),
            )
        )
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "build.configure",
                project_root=str(project_root),
            )
            approved_request.approval_token = approval.token
            approved_request.args = {"preset": "profile", "generator": "Ninja"}
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        assert "no configure command was executed" in response.result.message
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "build_configure_preflight"
        assert execution.details["plan_details"]["preset"] == "profile"
        assert execution.details["plan_details"]["generator"] == "Ninja"
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["plan_details"]["preset"] == "profile"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="build.configure",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="build.configure",
                payload=artifact.metadata,
            )
            == []
        )


def test_build_configure_falls_back_to_simulated_when_not_dry_run_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text("{}", encoding="utf-8")
        first = dispatcher_service.dispatch(
            make_request(
                "project-build",
                "build.configure",
                project_root=str(project_root),
            )
        )
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "build.configure",
                project_root=str(project_root),
                dry_run=False,
            )
            approved_request.approval_token = approval.token
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["real_path_available"] is False
        assert "dry_run=true" in execution.details["fallback_reason"]
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert artifact is not None
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="build.configure",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="build.configure",
                payload=artifact.metadata,
            )
            == []
        )


def test_dispatch_events_publish_capability_status_vocabulary() -> None:
    with isolated_database():
        dispatcher_service.dispatch(make_request("project-build", "project.inspect"))
        events = events_service.list_events()
        dispatch_event = next(event for event in events if event.category == "dispatch")
        assert dispatch_event.details["capability_status"] == "hybrid-read-only"
        assert "hybrid-read-only" in dispatch_event.message


def test_build_configure_events_use_plan_only_wording_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "PlanOnlyProject"}),
            encoding="utf-8",
        )
        first = dispatcher_service.dispatch(
            make_request(
                "project-build",
                "build.configure",
                project_root=str(project_root),
            )
        )
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "build.configure",
                project_root=str(project_root),
            )
            approved_request.approval_token = approval.token
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        events = events_service.list_events()
        dispatch_event = next(
            event
            for event in reversed(events)
            if event.run_id == response.operation_id
            and event.category == "dispatch"
            and event.details.get("capability_status") == "plan-only"
        )
        locks_event = next(
            event
            for event in reversed(events)
            if event.run_id == response.operation_id and event.category == "locks"
        )
        assert "plan-only build.configure preflight" in dispatch_event.message
        assert "plan-only build.configure preflight" in locks_event.message


def test_settings_patch_simulated_persisted_payloads_match_published_schemas() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_settings_patch_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="settings.patch",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="settings.patch",
                payload=artifact.metadata,
            )
            == []
        )


def test_gem_enable_simulated_persisted_payloads_match_published_schemas() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_gem_enable_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="gem.enable",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="gem.enable",
                payload=artifact.metadata,
            )
            == []
        )


def test_build_compile_simulated_persisted_payloads_match_published_schemas() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_build_compile_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="build.compile",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="build.compile",
                payload=artifact.metadata,
            )
            == []
        )


def test_asset_processor_status_simulated_persisted_payloads_match_published_schemas() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(make_asset_processor_status_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="asset.processor.status",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="asset.processor.status",
                payload=artifact.metadata,
            )
            == []
        )


def test_asset_batch_process_simulated_persisted_payloads_match_published_schemas() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_asset_batch_process_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="asset.batch.process",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="asset.batch.process",
                payload=artifact.metadata,
            )
            == []
        )


def test_asset_source_inspect_simulated_persisted_payloads_match_published_schemas() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(make_asset_source_inspect_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="asset.source.inspect",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="asset.source.inspect",
                payload=artifact.metadata,
            )
            == []
        )


def test_render_material_inspect_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(make_render_material_inspect_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="render.material.inspect",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="render.material.inspect",
                payload=artifact.metadata,
            )
            == []
        )


def test_render_capture_viewport_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(make_render_capture_viewport_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="render.capture.viewport",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="render.capture.viewport",
                payload=artifact.metadata,
            )
            == []
        )


def test_test_visual_diff_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(make_test_visual_diff_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="test.visual.diff",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="test.visual.diff",
                payload=artifact.metadata,
            )
            == []
        )


def test_test_run_editor_python_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_test_run_editor_python_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="test.run.editor_python",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="test.run.editor_python",
                payload=artifact.metadata,
            )
            == []
        )


def test_test_run_gtest_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_test_run_gtest_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="test.run.gtest",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="test.run.gtest",
                payload=artifact.metadata,
            )
            == []
        )


def test_test_tiaf_sequence_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_test_tiaf_sequence_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="test.tiaf.sequence",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="test.tiaf.sequence",
                payload=artifact.metadata,
            )
            == []
        )


def test_editor_session_open_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_editor_session_open_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="editor.session.open",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="editor.session.open",
                payload=artifact.metadata,
            )
            == []
        )


def test_editor_level_open_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_editor_level_open_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="editor.level.open",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="editor.level.open",
                payload=artifact.metadata,
            )
            == []
        )


def test_editor_entity_create_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_editor_entity_create_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="editor.entity.create",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="editor.entity.create",
                payload=artifact.metadata,
            )
            == []
        )


def test_editor_component_add_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_editor_component_add_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "simulated"
        assert execution.details["simulated"] is True
        assert artifact is not None
        assert artifact.simulated is True
        assert artifact.metadata["execution_mode"] == "simulated"
        assert artifact.metadata["inspection_surface"] == "simulated"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="editor.component.add",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="editor.component.add",
                payload=artifact.metadata,
            )
            == []
        )
