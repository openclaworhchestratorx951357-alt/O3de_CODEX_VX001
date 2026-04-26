import hashlib
import json
import subprocess
from collections import deque
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pytest

from app.models.control_plane import ExecutionStatus
from app.models.request_envelope import RequestEnvelope
from app.services.approvals import approvals_service
from app.services.artifacts import artifacts_service
from app.services.adapters import AdapterExecutionRejected, adapter_service
from app.services.editor_automation_runtime import (
    CAMERA_BOOL_WRITE_CAPABILITY,
    CAMERA_SCALAR_WRITE_PROOF_COMPONENT,
    CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH,
    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT,
    editor_automation_runtime_service,
)
from app.services.db import configure_database, initialize_database, reset_database
from app.services.dispatcher import dispatcher_service
from app.services.events import events_service
from app.services.executions import executions_service
from app.services.locks import locks_service
from app.services.runs import runs_service
from app.services.schema_validation import schema_validation_service


def create_test_artifact_record(
    *,
    path: Path,
    label: str,
    content_type: str = "image/png",
) -> str:
    seed_request = RequestEnvelope(
        request_id=f"seed-{label.lower().replace(' ', '-')}",
        tool="test.visual.diff",
        agent="validation",
        project_root=str(path.parent),
        engine_root=str(path.parent),
        dry_run=True,
        locks=[],
        timeout_s=30,
        args={},
    )
    run = runs_service.create_run(
        seed_request,
        requested_locks=[],
        execution_mode="real",
    )
    execution = executions_service.create_execution(
        run_id=run.id,
        request_id=seed_request.request_id,
        agent="validation",
        tool="test.visual.diff",
        execution_mode="real",
        status=ExecutionStatus.SUCCEEDED,
        result_summary="Seed artifact execution.",
    )
    artifact = artifacts_service.create_artifact(
        run_id=run.id,
        execution_id=execution.id,
        label=label,
        kind="test_image",
        uri=path.as_uri(),
        path=str(path),
        content_type=content_type,
        simulated=False,
        metadata={
            "tool": "test.seed",
            "agent": "validation",
            "execution_mode": "real",
            "inspection_surface": "seeded_artifact",
        },
        artifact_role="evidence",
        retention_class="test-log-evidence",
        evidence_completeness="seeded-local-file",
    )
    return artifact.id


def create_test_image(
    path: Path,
    *,
    size: tuple[int, int],
    color: tuple[int, int, int, int],
) -> None:
    try:
        from PIL import Image
    except ImportError:
        pytest.skip(
            "Pillow is required only for PNG fixture generation in visual diff tests."
        )

    image = Image.new("RGBA", size, color)
    image.save(path, format="PNG")


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


def make_gem_enable_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    gem_name: str = "ExampleGem",
    version: str | None = None,
    optional: bool | None = None,
) -> RequestEnvelope:
    request = make_request(
        "project-build",
        "gem.enable",
        project_root=project_root,
        dry_run=dry_run,
    )
    request.args = {"gem_name": gem_name}
    if version is not None:
        request.args["version"] = version
    if optional is not None:
        request.args["optional"] = optional
    return request


def approve_gem_enable_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    gem_name: str = "ExampleGem",
    version: str | None = None,
    optional: bool | None = None,
) -> RequestEnvelope:
    first = dispatcher_service.dispatch(
        make_gem_enable_request(
            project_root=project_root,
            dry_run=dry_run,
            gem_name=gem_name,
            version=version,
            optional=optional,
        )
    )
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_gem_enable_request(
        project_root=project_root,
        dry_run=dry_run,
        gem_name=gem_name,
        version=version,
        optional=optional,
    )
    approved_request.approval_token = approval.token
    return approved_request


def make_build_compile_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    targets: list[str] | None = None,
) -> RequestEnvelope:
    request = make_request(
        "project-build",
        "build.compile",
        project_root=project_root,
        dry_run=dry_run,
    )
    request.args = {
        "targets": targets or ["Editor"],
    }
    return request


def approve_build_compile_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    targets: list[str] | None = None,
) -> RequestEnvelope:
    first = dispatcher_service.dispatch(
        make_build_compile_request(
            project_root=project_root,
            dry_run=dry_run,
            targets=targets,
        )
    )
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_build_compile_request(
        project_root=project_root,
        dry_run=dry_run,
        targets=targets,
    )
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


def make_asset_batch_process_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    source_glob: str = "Assets/**/*.fbx",
    platforms: list[str] | None = None,
) -> RequestEnvelope:
    request = make_request(
        "asset-pipeline",
        "asset.batch.process",
        project_root=project_root,
        dry_run=dry_run,
    )
    request.args = {
        "source_glob": source_glob,
        "platforms": platforms or ["pc"],
        "clean": False,
        "max_jobs": 4,
    }
    return request


def approve_asset_batch_process_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    source_glob: str = "Assets/**/*.fbx",
    platforms: list[str] | None = None,
) -> RequestEnvelope:
    first = dispatcher_service.dispatch(
        make_asset_batch_process_request(
            project_root=project_root,
            dry_run=dry_run,
            source_glob=source_glob,
            platforms=platforms,
        )
    )
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_asset_batch_process_request(
        project_root=project_root,
        dry_run=dry_run,
        source_glob=source_glob,
        platforms=platforms,
    )
    approved_request.approval_token = approval.token
    return approved_request


def make_asset_move_safe_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = False,
    source_path: str = "Assets/Old/example.fbx",
    destination_path: str = "Assets/New/example.fbx",
    update_references: bool = True,
    dry_run_plan: bool = True,
) -> RequestEnvelope:
    request = make_request(
        "asset-pipeline",
        "asset.move.safe",
        project_root=project_root,
        dry_run=dry_run,
    )
    request.args = {
        "source_path": source_path,
        "destination_path": destination_path,
        "update_references": update_references,
        "dry_run_plan": dry_run_plan,
    }
    return request


def approve_asset_move_safe_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = False,
    source_path: str = "Assets/Old/example.fbx",
    destination_path: str = "Assets/New/example.fbx",
    update_references: bool = True,
    dry_run_plan: bool = True,
) -> RequestEnvelope:
    first = dispatcher_service.dispatch(
        make_asset_move_safe_request(
            project_root=project_root,
            dry_run=dry_run,
            source_path=source_path,
            destination_path=destination_path,
            update_references=update_references,
            dry_run_plan=dry_run_plan,
        )
    )
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_asset_move_safe_request(
        project_root=project_root,
        dry_run=dry_run,
        source_path=source_path,
        destination_path=destination_path,
        update_references=update_references,
        dry_run_plan=dry_run_plan,
    )
    approved_request.approval_token = approval.token
    return approved_request


def make_render_material_inspect_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    material_path: str = "Materials/Example.material",
    include_shader_data: bool = True,
    include_references: bool = True,
) -> RequestEnvelope:
    request = make_request(
        "render-lookdev",
        "render.material.inspect",
        project_root=project_root,
        dry_run=dry_run,
    )
    request.args = {
        "material_path": material_path,
        "include_shader_data": include_shader_data,
        "include_references": include_references,
    }
    return request


def make_render_material_patch_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    material_path: str = "Materials/Example.material",
    property_overrides: dict[str, object] | None = None,
    create_backup: bool = True,
    shader_targets_for_review: list[str] | None = None,
) -> RequestEnvelope:
    request = make_request(
        "render-lookdev",
        "render.material.patch",
        project_root=project_root,
        dry_run=dry_run,
    )
    request.args = {
        "material_path": material_path,
        "property_overrides": property_overrides
        or {
            "baseColor.factor": [1.0, 0.2, 0.2, 1.0],
        },
        "create_backup": create_backup,
    }
    if shader_targets_for_review:
        request.args["shader_targets_for_review"] = shader_targets_for_review
    return request


def approve_render_material_patch_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    material_path: str = "Materials/Example.material",
    property_overrides: dict[str, object] | None = None,
    create_backup: bool = True,
    shader_targets_for_review: list[str] | None = None,
) -> RequestEnvelope:
    first = dispatcher_service.dispatch(
        make_render_material_patch_request(
            project_root=project_root,
            dry_run=dry_run,
            material_path=material_path,
            property_overrides=property_overrides,
            create_backup=create_backup,
            shader_targets_for_review=shader_targets_for_review,
        )
    )
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_render_material_patch_request(
        project_root=project_root,
        dry_run=dry_run,
        material_path=material_path,
        property_overrides=property_overrides,
        create_backup=create_backup,
        shader_targets_for_review=shader_targets_for_review,
    )
    approved_request.approval_token = approval.token
    return approved_request


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


def make_render_shader_rebuild_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    shader_targets: list[str] | None = None,
    platforms: list[str] | None = None,
    force: bool = True,
) -> RequestEnvelope:
    request = make_request(
        "render-lookdev",
        "render.shader.rebuild",
        project_root=project_root,
        dry_run=dry_run,
    )
    request.args = {
        "shader_targets": shader_targets or ["ExampleShader"],
        "platforms": platforms or ["pc"],
        "force": force,
    }
    return request


def approve_render_shader_rebuild_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
    shader_targets: list[str] | None = None,
    platforms: list[str] | None = None,
    force: bool = True,
) -> RequestEnvelope:
    first = dispatcher_service.dispatch(
        make_render_shader_rebuild_request(
            project_root=project_root,
            dry_run=dry_run,
            shader_targets=shader_targets,
            platforms=platforms,
            force=force,
        )
    )
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_render_shader_rebuild_request(
        project_root=project_root,
        dry_run=dry_run,
        shader_targets=shader_targets,
        platforms=platforms,
        force=force,
    )
    approved_request.approval_token = approval.token
    return approved_request


def make_test_visual_diff_request(
    *,
    baseline_artifact_id: str = "artifact-baseline-001",
    candidate_artifact_id: str = "artifact-candidate-001",
) -> RequestEnvelope:
    request = make_request("validation", "test.visual.diff")
    request.args = {
        "baseline_artifact_id": baseline_artifact_id,
        "candidate_artifact_id": candidate_artifact_id,
        "threshold": 0.1,
    }
    return request


def make_test_run_editor_python_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
) -> RequestEnvelope:
    request = make_request(
        "validation",
        "test.run.editor_python",
        project_root=project_root,
        dry_run=dry_run,
    )
    request.args = {
        "test_modules": ["Automated.testing.sample_test"],
        "editor_args": ["--autotest_mode"],
        "timeout_s": 120,
    }
    return request


def approve_test_run_editor_python_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
) -> RequestEnvelope:
    first = dispatcher_service.dispatch(
        make_test_run_editor_python_request(project_root=project_root, dry_run=dry_run)
    )
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_test_run_editor_python_request(
        project_root=project_root,
        dry_run=dry_run,
    )
    approved_request.approval_token = approval.token
    return approved_request


def make_test_run_gtest_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
) -> RequestEnvelope:
    request = make_request(
        "validation",
        "test.run.gtest",
        project_root=project_root,
        dry_run=dry_run,
    )
    request.args = {
        "test_targets": ["AzCoreTests"],
        "filter": "Smoke*",
        "timeout_s": 120,
    }
    return request


def approve_test_run_gtest_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
) -> RequestEnvelope:
    first = dispatcher_service.dispatch(
        make_test_run_gtest_request(project_root=project_root, dry_run=dry_run)
    )
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_test_run_gtest_request(project_root=project_root, dry_run=dry_run)
    approved_request.approval_token = approval.token
    return approved_request


def make_test_tiaf_sequence_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
) -> RequestEnvelope:
    request = make_request(
        "validation",
        "test.tiaf.sequence",
        project_root=project_root,
        dry_run=dry_run,
    )
    request.args = {
        "sequence_name": "smoke-sequence",
        "platforms": ["windows"],
        "shard_count": 2,
    }
    return request


def approve_test_tiaf_sequence_request(
    *,
    project_root: str = "/tmp/project",
    dry_run: bool = True,
) -> RequestEnvelope:
    first = dispatcher_service.dispatch(
        make_test_tiaf_sequence_request(project_root=project_root, dry_run=dry_run)
    )
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_test_tiaf_sequence_request(
        project_root=project_root,
        dry_run=dry_run,
    )
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
        "entity_id": "101",
        "components": ["Mesh"],
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


def make_editor_entity_exists_request() -> RequestEnvelope:
    request = make_request("editor-control", "editor.entity.exists")
    request.args = {
        "entity_id": "101",
        "level_path": "Levels/Main.level",
    }
    return request


def make_editor_component_property_get_request() -> RequestEnvelope:
    request = make_request("editor-control", "editor.component.property.get")
    request.args = {
        "component_id": "EntityComponentIdPair(EntityId(101), 201)",
        "property_path": "Controller|Configuration|Model Asset",
        "level_path": "Levels/Main.level",
    }
    return request


def make_camera_bool_write_request(
    *,
    project_root: str = "/tmp/project",
    component_name: str = CAMERA_SCALAR_WRITE_PROOF_COMPONENT,
    property_path: str = CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH,
    value: object = True,
) -> RequestEnvelope:
    request = make_request(
        "editor-control",
        CAMERA_BOOL_WRITE_CAPABILITY,
        project_root=project_root,
        dry_run=False,
    )
    request.args = {
        "component_name": component_name,
        "component_id": "EntityComponentIdPair(EntityId(101), 301)",
        "component_id_provenance": (
            COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
        ),
        "property_path": property_path,
        "value": value,
        "expected_current_value": False,
        "level_path": "Levels/Main.level",
        "restore_boundary_id": "restore-boundary-1",
    }
    return request


def approve_camera_bool_write_request(**overrides: object) -> RequestEnvelope:
    first = dispatcher_service.dispatch(make_camera_bool_write_request(**overrides))
    approval = approvals_service.get_approval(first.approval_id or "")
    assert approval is not None
    approvals_service.approve(approval.id)

    approved_request = make_camera_bool_write_request(**overrides)
    approved_request.approval_token = approval.token
    return approved_request


def make_editor_component_find_request() -> RequestEnvelope:
    request = make_request("editor-control", "editor.component.find")
    request.args = {
        "entity_id": "101",
        "component_name": "Mesh",
        "level_path": "Levels/Main.level",
    }
    return request


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


def write_editor_project_manifest(project_root: Path) -> None:
    (project_root / "project.json").write_text(
        json.dumps(
            {
                "project_name": "EditorRuntimeProject",
                "gem_names": ["PythonEditorBindings"],
            }
        ),
        encoding="utf-8",
    )


def write_level_file(
    project_root: Path,
    *,
    level_path: str = "Levels/Main.level",
    content: str = '{\n  "level": "baseline"\n}\n',
) -> Path:
    resolved_path = project_root / level_path
    resolved_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_path.write_text(content, encoding="utf-8")
    return resolved_path


def editor_state_path_for(project_root: Path) -> Path:
    return (
        Path(__file__).resolve().parents[1]
        / "runtime"
        / "editor_state"
        / f"{hashlib.sha1(str(project_root.resolve()).encode('utf-8')).hexdigest()[:16]}.json"
    )


def make_editor_runtime_subprocess(expected_runtime_result: dict[str, object]):
    def _subprocess_run(
        command: list[str],
        *,
        capture_output: bool,
        text: bool,
        timeout: int,
        check: bool,
    ) -> subprocess.CompletedProcess[str]:
        assert "--result" in command
        result_path = Path(command[command.index("--result") + 1])
        result_path.write_text(json.dumps(expected_runtime_result), encoding="utf-8")
        return subprocess.CompletedProcess(
            args=command,
            returncode=0,
            stdout="",
            stderr="",
        )

    return _subprocess_run


class FakeEditorRuntimeProcess:
    def __init__(
        self,
        *,
        command: list[str],
        expected_runtime_result: dict[str, object],
        returncode: int = 0,
    ) -> None:
        self.args = command
        self.returncode: int | None = None
        self._final_returncode = returncode
        self._stdout = ""
        self._stderr = ""
        self._poll_sequence = deque([None, None])
        runpythonargs = command[command.index("--runpythonargs") + 1]
        result_arg = runpythonargs.split("--result ", 1)[1].strip()
        self._result_path = Path(result_arg)
        self._result_path.write_text(json.dumps(expected_runtime_result), encoding="utf-8")

    def poll(self) -> int | None:
        if self._poll_sequence:
            return self._poll_sequence.popleft()
        return self.returncode

    def communicate(self, timeout: int | None = None) -> tuple[str, str]:
        self.returncode = self._final_returncode
        return self._stdout, self._stderr

    def terminate(self) -> None:
        self.returncode = self._final_returncode

    def kill(self) -> None:
        self.returncode = self._final_returncode


def make_editor_runtime_popen(expected_runtime_result: dict[str, object]):
    def _popen(
        command: list[str],
        *,
        stdout: int | None,
        stderr: int | None,
    ) -> FakeEditorRuntimeProcess:
        assert stdout == subprocess.DEVNULL
        assert stderr == subprocess.DEVNULL
        return FakeEditorRuntimeProcess(
            command=command,
            expected_runtime_result=expected_runtime_result,
        )

    return _popen


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


@pytest.mark.parametrize(
    "tool_name",
    [
        "editor.component.property.list",
        "editor.component.property.write",
        "editor.component.property.set",
        "editor.camera.scalar.write.proof",
    ],
)
def test_dispatch_rejects_property_list_write_and_proof_only_tools(
    tool_name: str,
) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(
            make_request("editor-control", tool_name)
        )
        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_TOOL"


def test_dispatch_requires_approval_for_exact_camera_bool_write_corridor() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(make_camera_bool_write_request())
        assert response.ok is False
        assert response.approval_id is not None
        assert response.error is not None
        assert response.error.code == "APPROVAL_REQUIRED"


@pytest.mark.parametrize(
    "envelope",
    [
        make_request("editor-control", "editor.component.property.write"),
        make_request("editor-control", "editor.component.property.set"),
        make_request("editor-control", "editor.component.property.list"),
    ],
)
def test_dispatch_keeps_broad_property_write_and_list_surfaces_unavailable(
    envelope: RequestEnvelope,
) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(envelope)
        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_TOOL"


@pytest.mark.parametrize(
    ("overrides", "expected_detail"),
    [
        ({"component_name": "Mesh"}, "component_name"),
        ({"property_path": "Controller|Configuration|Field of view"}, "property_path"),
        ({"value": "true"}, "value"),
    ],
)
def test_dispatch_schema_rejects_non_exact_camera_bool_write_args(
    overrides: dict[str, object],
    expected_detail: str,
) -> None:
    with isolated_database():
        request = make_camera_bool_write_request(**overrides)
        response = dispatcher_service.dispatch(request)
        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_ARGS"
        assert response.error.details is not None
        assert expected_detail in "\n".join(
            response.error.details["arg_validation_errors"]
        )


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


def test_dispatch_rejects_when_asset_move_safe_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_asset_move_safe_request()
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
            "asset.move.safe.execution-details.schema.json"
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


def test_dispatch_rejects_when_asset_move_safe_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_asset_move_safe_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'asset.move.safe'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "asset.move.safe.artifact-metadata.schema.json"
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


def test_dispatch_rejects_when_render_material_patch_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_render_material_patch_request()
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
            "render.material.patch.execution-details.schema.json"
        )


def test_dispatch_rejects_when_render_shader_rebuild_execution_details_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_render_shader_rebuild_request()
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
            "render.shader.rebuild.execution-details.schema.json"
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


def test_dispatch_rejects_when_render_material_patch_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_render_material_patch_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'render.material.patch'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "render.material.patch.artifact-metadata.schema.json"
        )


def test_dispatch_rejects_when_render_shader_rebuild_artifact_metadata_fail_schema_validation(
    ) -> None:
    with isolated_database():
        approved_request = approve_render_shader_rebuild_request()
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_execution_details",
            return_value=[],
        ):
            with patch(
                "app.services.dispatcher.schema_validation_service.validate_artifact_metadata",
                return_value=["$.tool: expected constant value 'render.shader.rebuild'"],
            ):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_PERSISTED_PAYLOAD"
        assert response.error.details is not None
        assert response.error.details["persisted_payload_kind"] == "artifact metadata"
        assert response.error.details["persisted_schema_ref"].endswith(
            "render.shader.rebuild.artifact-metadata.schema.json"
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
                    "project_id": "{11111111-1111-1111-1111-111111111111}",
                    "project_name": "Phase7Project",
                    "display_name": "Phase Seven Project",
                    "gem_names": ["ExampleGem"],
                    "compatible_engines": ["o3de"],
                    "engine_api_dependencies": {"framework": "1.0.0"},
                    "origin": {"template": "DefaultProject", "source": "manifest"},
                    "user_tags": ["sandbox", "phase7"],
                    "icon_path": "icons/project.svg",
                    "restricted_platform_name": "pc",
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
        assert execution.details["requested_project_config_evidence"] == [
            "project_config",
            "project_config_keys",
            "requested_project_config_keys",
            "matched_requested_project_config_keys",
            "missing_requested_project_config_keys",
        ]
        assert execution.details["project_config_selection_mode"] == "requested-subset"
        assert execution.details["project_config_keys"] == [
            "compatible_engines",
            "project_name",
            "version",
        ]
        assert execution.details["available_project_config_keys"] == [
            "compatible_engines",
            "display_name",
            "engine_api_dependencies",
            "icon_path",
            "origin",
            "project_id",
            "project_name",
            "restricted_platform_name",
            "user_tags",
            "version",
        ]
        assert execution.details["available_project_config_count"] == 10
        assert execution.details["available_project_origin"] == {
            "template": "DefaultProject",
            "source": "manifest",
        }
        assert execution.details["available_project_origin_type"] == "object"
        assert execution.details["available_project_origin_keys"] == [
            "source",
            "template",
        ]
        assert execution.details["project_origin_present"] is True
        assert (
            execution.details["available_project_id"]
            == "{11111111-1111-1111-1111-111111111111}"
        )
        assert execution.details["project_id_present"] is True
        assert execution.details["available_user_tags"] == ["sandbox", "phase7"]
        assert execution.details["available_user_tag_count"] == 2
        assert execution.details["identity_fields_present"] is True
        assert execution.details["available_display_name"] == "Phase Seven Project"
        assert execution.details["available_icon_path"] == "icons/project.svg"
        assert execution.details["available_restricted_platform_name"] == "pc"
        assert execution.details["presentation_fields_present"] is True
        assert execution.details["available_compatible_engines"] == ["o3de"]
        assert execution.details["available_compatible_engine_count"] == 1
        assert execution.details["available_engine_api_dependency_keys"] == ["framework"]
        assert execution.details["available_engine_api_dependency_count"] == 1
        assert execution.details["engine_compatibility_fields_present"] is True
        assert execution.details["requested_project_config_keys"] == [
            "project_name",
            "version",
            "compatible_engines",
        ]
        assert execution.details["matched_requested_project_config_keys"] == [
            "project_name",
            "version",
            "compatible_engines",
        ]
        assert execution.details["missing_requested_project_config_keys"] == []
        assert execution.details["matched_requested_project_config_count"] == 3
        assert execution.details["missing_requested_project_config_count"] == 0
        assert execution.details["project_config_fields_present"] is True
        assert execution.details["requested_project_config_subset_present"] is True
        assert execution.details["requested_settings_evidence"] == [
            "manifest_settings",
            "manifest_settings_keys",
            "requested_settings_keys",
            "matched_requested_settings_keys",
            "missing_requested_settings_keys",
        ]
        assert execution.details["settings_evidence_source"] == "project_manifest_top_level"
        assert execution.details["settings_selection_mode"] == "requested-subset"
        assert execution.details["requested_settings_keys"] == ["version", "missing_setting"]
        assert execution.details["matched_requested_settings_keys"] == ["version"]
        assert execution.details["missing_requested_settings_keys"] == ["missing_setting"]
        assert execution.details["matched_requested_settings_count"] == 1
        assert execution.details["missing_requested_settings_count"] == 1
        assert execution.details["requested_gem_evidence"] == [
            "gem_names",
            "gem_names_count",
            "requested_gem_names",
            "matched_requested_gem_names",
            "missing_requested_gem_names",
        ]
        assert execution.details["gem_evidence_source"] == "project_manifest_gem_names"
        assert execution.details["gem_selection_mode"] == "requested-subset"
        assert execution.details["requested_gem_names"] == ["ExampleGem", "MissingGem"]
        assert execution.details["matched_requested_gem_names"] == ["ExampleGem"]
        assert execution.details["missing_requested_gem_names"] == ["MissingGem"]
        assert execution.details["matched_requested_gem_count"] == 1
        assert execution.details["missing_requested_gem_count"] == 1
        assert execution.details["available_gem_names"] == ["ExampleGem"]
        assert execution.details["available_gem_count"] == 1
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
        assert artifact.metadata["available_project_config_keys"] == [
            "compatible_engines",
            "display_name",
            "engine_api_dependencies",
            "icon_path",
            "origin",
            "project_id",
            "project_name",
            "restricted_platform_name",
            "user_tags",
            "version",
        ]
        assert artifact.metadata["available_project_config_count"] == 10
        assert artifact.metadata["available_project_origin"] == {
            "template": "DefaultProject",
            "source": "manifest",
        }
        assert artifact.metadata["available_project_origin_type"] == "object"
        assert artifact.metadata["available_project_origin_keys"] == [
            "source",
            "template",
        ]
        assert artifact.metadata["project_origin_present"] is True
        assert (
            artifact.metadata["available_project_id"]
            == "{11111111-1111-1111-1111-111111111111}"
        )
        assert artifact.metadata["project_id_present"] is True
        assert artifact.metadata["available_user_tags"] == ["sandbox", "phase7"]
        assert artifact.metadata["available_user_tag_count"] == 2
        assert artifact.metadata["identity_fields_present"] is True
        assert artifact.metadata["available_display_name"] == "Phase Seven Project"
        assert artifact.metadata["available_icon_path"] == "icons/project.svg"
        assert artifact.metadata["available_restricted_platform_name"] == "pc"
        assert artifact.metadata["presentation_fields_present"] is True
        assert artifact.metadata["available_compatible_engines"] == ["o3de"]
        assert artifact.metadata["available_compatible_engine_count"] == 1
        assert artifact.metadata["available_engine_api_dependency_keys"] == ["framework"]
        assert artifact.metadata["available_engine_api_dependency_count"] == 1
        assert artifact.metadata["engine_compatibility_fields_present"] is True
        assert artifact.metadata["matched_requested_project_config_count"] == 3
        assert artifact.metadata["missing_requested_project_config_count"] == 0
        assert artifact.metadata["project_config_fields_present"] is True
        assert artifact.metadata["requested_settings_evidence"] == [
            "manifest_settings",
            "manifest_settings_keys",
            "requested_settings_keys",
            "matched_requested_settings_keys",
            "missing_requested_settings_keys",
        ]
        assert artifact.metadata["settings_evidence_source"] == "project_manifest_top_level"
        assert artifact.metadata["settings_selection_mode"] == "requested-subset"
        assert artifact.metadata["requested_settings_keys"] == ["version", "missing_setting"]
        assert artifact.metadata["matched_requested_settings_keys"] == ["version"]
        assert artifact.metadata["missing_requested_settings_keys"] == ["missing_setting"]
        assert artifact.metadata["matched_requested_settings_count"] == 1
        assert artifact.metadata["missing_requested_settings_count"] == 1
        assert artifact.metadata["requested_gem_evidence"] == [
            "gem_names",
            "gem_names_count",
            "requested_gem_names",
            "matched_requested_gem_names",
            "missing_requested_gem_names",
        ]
        assert artifact.metadata["gem_evidence_source"] == "project_manifest_gem_names"
        assert artifact.metadata["gem_selection_mode"] == "requested-subset"
        assert artifact.metadata["requested_gem_names"] == ["ExampleGem", "MissingGem"]
        assert artifact.metadata["matched_requested_gem_names"] == ["ExampleGem"]
        assert artifact.metadata["missing_requested_gem_names"] == ["MissingGem"]
        assert artifact.metadata["matched_requested_gem_count"] == 1
        assert artifact.metadata["missing_requested_gem_count"] == 1
        assert artifact.metadata["available_gem_names"] == ["ExampleGem"]
        assert artifact.metadata["available_gem_count"] == 1
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
        assert execution.details["available_project_config_keys"] == ["project_name"]
        assert execution.details["available_project_config_count"] == 1
        assert execution.details["available_project_origin"] is None
        assert execution.details["available_project_origin_type"] == "null"
        assert execution.details["available_project_origin_keys"] == []
        assert execution.details["project_origin_present"] is False
        assert execution.details["available_project_id"] is None
        assert execution.details["project_id_present"] is False
        assert execution.details["available_user_tags"] == []
        assert execution.details["available_user_tag_count"] == 0
        assert execution.details["identity_fields_present"] is False
        assert execution.details["available_display_name"] is None
        assert execution.details["available_icon_path"] is None
        assert execution.details["available_restricted_platform_name"] is None
        assert execution.details["presentation_fields_present"] is False
        assert execution.details["available_compatible_engines"] == []
        assert execution.details["available_compatible_engine_count"] == 0
        assert execution.details["available_engine_api_dependency_keys"] == []
        assert execution.details["available_engine_api_dependency_count"] == 0
        assert execution.details["engine_compatibility_fields_present"] is False
        assert execution.details["requested_project_config_evidence"] == [
            "project_config",
            "project_config_keys",
            "requested_project_config_keys",
            "matched_requested_project_config_keys",
            "missing_requested_project_config_keys",
        ]
        assert execution.details["project_config_selection_mode"] == "requested-subset"
        assert execution.details["requested_project_config_keys"] == ["version", "summary"]
        assert execution.details["matched_requested_project_config_keys"] == []
        assert execution.details["missing_requested_project_config_keys"] == [
            "version",
            "summary",
        ]
        assert execution.details["matched_requested_project_config_count"] == 0
        assert execution.details["missing_requested_project_config_count"] == 2
        assert execution.details["project_config_fields_present"] is False
        assert execution.details["requested_project_config_subset_present"] is False
        assert execution.details["requested_settings_evidence"] == [
            "manifest_settings",
            "manifest_settings_keys",
            "requested_settings_keys",
            "matched_requested_settings_keys",
            "missing_requested_settings_keys",
        ]
        assert execution.details["settings_evidence_source"] == "project_manifest_top_level"
        assert execution.details["settings_selection_mode"] == "requested-subset"
        assert execution.details["requested_settings_keys"] == ["summary", "missing_setting"]
        assert execution.details["matched_requested_settings_keys"] == []
        assert execution.details["missing_requested_settings_keys"] == [
            "summary",
            "missing_setting",
        ]
        assert execution.details["matched_requested_settings_count"] == 0
        assert execution.details["missing_requested_settings_count"] == 2
        assert execution.details["requested_gem_evidence"] == [
            "gem_names",
            "gem_names_count",
            "requested_gem_names",
            "matched_requested_gem_names",
            "missing_requested_gem_names",
        ]
        assert execution.details["gem_evidence_source"] == "project_manifest_gem_names"
        assert execution.details["gem_selection_mode"] == "requested-subset"
        assert execution.details["requested_gem_names"] == ["MissingGem"]
        assert execution.details["matched_requested_gem_names"] == []
        assert execution.details["missing_requested_gem_names"] == ["MissingGem"]
        assert execution.details["matched_requested_gem_count"] == 0
        assert execution.details["missing_requested_gem_count"] == 1
        assert execution.details["available_gem_names"] == []
        assert execution.details["available_gem_count"] == 0
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
            "None of the requested_project_config_keys matched manifest-backed "
            "project-config fields" in warning
            for warning in execution.warnings
        )
        assert any(
            "Some requested_project_config_keys were not present in manifest-backed "
            "project-config fields: version, summary." in warning
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
        assert execution.details["fallback_category"] == "manifest-missing"
        assert "fallback_reason" in execution.details
        assert execution.details["project_root_path"] == str(Path(temp_dir).resolve())
        assert execution.details["expected_project_manifest_relative_path"] == "project.json"
        assert (
            execution.details["expected_project_manifest_path"]
            == str((Path(temp_dir).resolve() / "project.json"))
        )
        assert (
            execution.details["project_manifest_source_of_truth"]
            == "project_root/project.json"
        )
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="project.inspect",
                payload=execution.details,
            )
            == []
        )


def test_project_inspect_fallback_records_unreadable_manifest_category_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text("{not-json", encoding="utf-8")
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                make_request(
                    "project-build",
                    "project.inspect",
                    project_root=str(project_root),
                )
            )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        execution = executions_service.list_executions()[0]
        assert execution.details["real_path_available"] is False
        assert execution.details["fallback_category"] == "manifest-unreadable"
        assert "could not be read cleanly" in execution.details["fallback_reason"]
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert artifact is not None
        assert artifact.metadata["fallback_category"] == "manifest-unreadable"
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


def test_project_inspect_records_requested_build_state_as_explicitly_unavailable_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps(
                {
                    "project_name": "Phase7BuildStateProject",
                    "version": "7.1.0",
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
                "project_config_keys": ["project_name"],
                "include_build_state": True,
            }
            response = dispatcher_service.dispatch(request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["project_root_path"] == str(project_root.resolve())
        assert execution.details["project_manifest_relative_path"] == "project.json"
        assert execution.details["project_manifest_read_mode"] == "read-only"
        assert (
            execution.details["project_manifest_source_of_truth"]
            == "project_root/project.json"
        )
        assert execution.details["project_manifest_workspace_local"] is True
        assert execution.details["project_manifest_within_project_root"] is True
        assert execution.details["requested_build_state_evidence"] == [
            "build_state_request",
            "build_state_unavailable",
        ]
        assert execution.details["build_state_evidence_source"] == "simulated_unavailable"
        assert execution.details["build_state_selection_mode"] == "requested-unavailable"
        assert execution.details["build_state_real_path_available"] is False
        assert execution.details["requested_build_state_subset_present"] is False
        assert any(
            "Build-state inspection remains simulated in this slice" in warning
            for warning in execution.warnings
        )
        assert artifact is not None
        assert artifact.metadata["project_root_path"] == str(project_root.resolve())
        assert artifact.metadata["project_manifest_relative_path"] == "project.json"
        assert artifact.metadata["requested_build_state_evidence"] == [
            "build_state_request",
            "build_state_unavailable",
        ]
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
        assert execution.details["project_root_path"] == str(project_root.resolve())
        assert execution.details["project_manifest_relative_path"] == "project.json"
        assert execution.details["project_manifest_read_mode"] == "read-only"
        assert (
            execution.details["project_manifest_source_of_truth"]
            == "project_root/project.json"
        )
        assert execution.details["project_manifest_workspace_local"] is True
        assert execution.details["project_manifest_within_project_root"] is True
        assert execution.details["preflight_execution_mode"] == "plan-only"
        assert execution.details["plan_details"]["preset"] == "profile"
        assert execution.details["plan_details"]["generator"] == "Ninja"
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["project_root_path"] == str(project_root.resolve())
        assert artifact.metadata["project_manifest_relative_path"] == "project.json"
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
        assert execution.details["fallback_category"] == "dry-run-required"
        assert "dry_run=true" in execution.details["fallback_reason"]
        assert execution.details["project_root_path"] == str(project_root.resolve())
        assert execution.details["expected_project_manifest_relative_path"] == "project.json"
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert artifact is not None
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="build.configure",
                payload=execution.details,
            )
            == []
        )


def test_build_configure_fallback_records_unreadable_manifest_category_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text("{not-json", encoding="utf-8")
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
        assert execution.details["real_path_available"] is False
        assert execution.details["fallback_category"] == "manifest-unreadable"
        assert "could not be read cleanly" in execution.details["fallback_reason"]
        assert artifact is not None
        assert artifact.metadata["fallback_category"] == "manifest-unreadable"
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="build.configure",
                payload=artifact.metadata,
            )
            == []
        )


def test_settings_patch_uses_real_preflight_path_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "Phase7SettingsProject",
                    "version": "1.2.3",
                    "display_name": "Phase 7 Settings",
                }
            ),
            encoding="utf-8",
        )
        initial_request = make_settings_patch_request()
        initial_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(initial_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "settings.patch",
                project_root=str(project_root),
            )
            approved_request.approval_token = approval.token
            approved_request.args = {
                "registry_path": "/O3DE/Settings",
                "operations": [
                    {"op": "set", "path": "/version", "value": "1.2.4"},
                    {"op": "set", "path": "/render/quality", "value": "high"},
                ],
            }
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        assert "no settings were written" in response.result.message
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "settings_patch_preflight"
        assert execution.details["project_root_path"] == str(project_root.resolve())
        assert execution.details["project_manifest_relative_path"] == "project.json"
        assert execution.details["project_manifest_read_mode"] == "read-only"
        assert (
            execution.details["project_manifest_source_of_truth"]
            == "project_root/project.json"
        )
        assert execution.details["project_manifest_workspace_local"] is True
        assert execution.details["project_manifest_within_project_root"] is True
        assert execution.details["project_name"] == "Phase7SettingsProject"
        assert execution.details["registry_path"] == "/O3DE/Settings"
        assert execution.details["operation_count"] == 2
        assert execution.details["supported_operation_count"] == 1
        assert execution.details["unsupported_operation_count"] == 1
        assert execution.details["admitted_registry_path"] == "/O3DE/Settings"
        assert "/version" in execution.details["admitted_manifest_paths"]
        assert execution.details["backup_target"].endswith("project.json.bak")
        assert execution.details["backup_created"] is True
        assert Path(execution.details["backup_target"]).is_file()
        assert execution.details["supported_operation_paths"] == ["/version"]
        assert execution.details["unsupported_operation_paths"] == ["/render/quality"]
        assert execution.details["rollback_strategy"] == "restore-project-manifest-backup"
        assert execution.details["rollback_ready"] is True
        assert execution.details["patch_plan_valid"] is False
        assert execution.details["post_backup_validation"]["registry_path_admitted"] is True
        assert execution.details["post_backup_validation"]["supported_operations_present"] is True
        assert execution.details["post_backup_validation"]["unsupported_operations_present"] is True
        assert execution.details["post_backup_validation"]["patch_plan_valid"] is False
        assert execution.details["post_backup_validation"]["mutation_ready"] is False
        assert execution.details["post_backup_validation"]["mutation_blocked"] is False
        assert execution.details["mutation_ready"] is False
        assert execution.details["mutation_blocked"] is False
        assert execution.details["mutation_blocked_reason"] is None
        assert execution.details["mutation_audit"]["phase"] == "preflight"
        assert execution.details["mutation_audit"]["status"] == "preflight"
        assert execution.details["mutation_audit"]["backup_created"] is True
        assert (
            execution.details["mutation_audit"]["summary"]
            == (
                "The real settings.patch path published preflight evidence "
                "only; no settings were written."
            )
        )
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "settings_patch_preflight"
        assert artifact.metadata["project_root_path"] == str(project_root.resolve())
        assert artifact.metadata["project_manifest_relative_path"] == "project.json"
        assert artifact.metadata["mutation_audit"]["phase"] == "preflight"
        assert artifact.metadata["plan_details"]["supported_operation_count"] == 1
        assert artifact.metadata["plan_details"]["unsupported_operation_count"] == 1
        assert artifact.metadata["plan_details"]["backup_created"] is True
        assert artifact.metadata["plan_details"]["rollback_ready"] is True
        assert artifact.metadata["plan_details"]["patch_plan_valid"] is False
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


def test_settings_patch_falls_back_to_simulated_when_not_dry_run_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text("{}", encoding="utf-8")
        initial_request = make_settings_patch_request()
        initial_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(initial_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "settings.patch",
                project_root=str(project_root),
                dry_run=False,
            )
            approved_request.approval_token = approval.token
            approved_request.args = make_settings_patch_request().args
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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["real_path_available"] is False
        assert execution.details["fallback_category"] == "mutation-not-admitted"
        assert (
            "fully admitted manifest-backed set-only path"
            in execution.details["fallback_reason"]
        )
        assert execution.details["project_root_path"] == str(project_root.resolve())
        assert execution.details["expected_project_manifest_relative_path"] == "project.json"
        assert artifact is not None
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


def test_settings_patch_fallback_records_unreadable_manifest_category_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text("{not-json", encoding="utf-8")
        initial_request = make_settings_patch_request()
        initial_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(initial_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "settings.patch",
                project_root=str(project_root),
            )
            approved_request.approval_token = approval.token
            approved_request.args = {
                "registry_path": "/O3DE/Settings",
                "operations": [{"op": "set", "path": "/version", "value": "1.2.4"}],
            }
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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["real_path_available"] is False
        assert execution.details["fallback_category"] == "manifest-unreadable"
        assert "could not be read cleanly" in execution.details["fallback_reason"]
        assert artifact is not None
        assert artifact.metadata["fallback_category"] == "manifest-unreadable"


def test_settings_patch_reports_fully_valid_patch_plan_when_all_operations_are_admitted() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "FullyAdmittedProject", "version": "1.0.0"}),
            encoding="utf-8",
        )
        initial_request = make_settings_patch_request()
        initial_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(initial_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "settings.patch",
                project_root=str(project_root),
            )
            approved_request.approval_token = approval.token
            approved_request.args = {
                "registry_path": "/O3DE/Settings",
                "operations": [{"op": "set", "path": "/version", "value": "1.0.1"}],
            }
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["supported_operation_paths"] == ["/version"]
        assert execution.details["unsupported_operation_paths"] == []
        assert execution.details["backup_created"] is True
        assert execution.details["rollback_ready"] is True
        assert execution.details["patch_plan_valid"] is True
        assert execution.details["post_backup_validation"]["patch_plan_valid"] is True
        assert execution.details["post_backup_validation"]["mutation_ready"] is True
        assert execution.details["post_backup_validation"]["mutation_blocked"] is True
        assert execution.details["mutation_ready"] is True
        assert execution.details["mutation_blocked"] is True
        assert execution.details["mutation_audit"]["phase"] == "preflight"
        assert execution.details["mutation_audit"]["status"] == "blocked"
        assert "mutation-ready" in execution.details["mutation_audit"]["summary"]
        assert "intentionally write-disabled" in execution.details["mutation_blocked_reason"]
        assert "ready for mutation" in response.result.message
        assert any(
            "mutation-ready but intentionally write-blocked" in warning
            for warning in execution.warnings
        )


def test_settings_patch_writes_manifest_on_fully_admitted_path_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps({"project_name": "WritableProject", "version": "1.0.0"}),
            encoding="utf-8",
        )
        initial_request = make_settings_patch_request()
        initial_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(initial_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "settings.patch",
                project_root=str(project_root),
                dry_run=False,
            )
            approved_request.approval_token = approval.token
            approved_request.args = {
                "registry_path": "/O3DE/Settings",
                "operations": [{"op": "set", "path": "/version", "value": "1.0.1"}],
            }
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert "settings were written" in response.result.message
        persisted_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert persisted_manifest["version"] == "1.0.1"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "settings_patch_mutation"
        assert execution.details["mutation_applied"] is True
        assert execution.details["mutation_ready"] is True
        assert execution.details["mutation_blocked"] is False
        assert execution.details["applied_operation_count"] == 1
        assert execution.details["rollback_attempted"] is False
        assert execution.details["rollback_succeeded"] is False
        assert execution.details["rollback_outcome"] is None
        assert execution.details["post_write_verification_attempted"] is True
        assert execution.details["post_write_verification_succeeded"] is True
        assert execution.details["verified_operation_paths"] == ["/version"]
        assert execution.details["verification_mismatched_paths"] == []
        assert execution.details["backup_source_path"].endswith("project.json")
        assert execution.details["mutation_audit"]["phase"] == "mutation"
        assert execution.details["mutation_audit"]["status"] == "succeeded"
        assert execution.details["mutation_audit"]["post_write_verification_succeeded"] is True
        assert artifact is not None
        assert artifact.metadata["inspection_surface"] == "settings_patch_mutation"
        assert artifact.metadata["mutation_applied"] is True
        assert artifact.metadata["post_write_verification_succeeded"] is True
        assert artifact.metadata["mutation_audit"]["status"] == "succeeded"


def test_settings_patch_rolls_back_when_manifest_write_fails() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps({"project_name": "WriteFailProject", "version": "1.0.0"}),
            encoding="utf-8",
        )
        initial_request = make_settings_patch_request()
        initial_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(initial_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        original_write_text = Path.write_text
        failed_once = {"manifest_write": False}

        def patched_write_text(
            self: Path,
            data: str,
            *args: object,
            **kwargs: object,
        ) -> int:
            if self == manifest_path and not failed_once["manifest_write"]:
                failed_once["manifest_write"] = True
                raise OSError("write failed")
            return original_write_text(self, data, *args, **kwargs)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "settings.patch",
                project_root=str(project_root),
                dry_run=False,
            )
            approved_request.approval_token = approval.token
            approved_request.args = {
                "registry_path": "/O3DE/Settings",
                "operations": [{"op": "set", "path": "/version", "value": "1.0.1"}],
            }
            with patch("pathlib.Path.write_text", new=patched_write_text):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "ADAPTER_PRECHECK_FAILED"
        restored_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert restored_manifest["version"] == "1.0.0"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["rollback_attempted"] is True
        assert execution.details["rollback_succeeded"] is True
        assert execution.details["rollback_trigger"] == "mutation_write_failure"
        assert execution.details["rollback_outcome"] == "restored_and_verified"
        assert execution.details["rollback_verification_attempted"] is True
        assert execution.details["rollback_verification_succeeded"] is True
        assert execution.details["backup_source_path"].endswith("project.json")
        assert execution.details["mutation_audit"]["phase"] == "rollback"
        assert execution.details["mutation_audit"]["status"] == "rolled_back"
        assert execution.details["mutation_audit"]["rollback_trigger"] == "mutation_write_failure"


def test_settings_patch_rolls_back_when_post_write_verification_fails() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps({"project_name": "VerificationFailProject", "version": "1.0.0"}),
            encoding="utf-8",
        )
        initial_request = make_settings_patch_request()
        initial_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(initial_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        original_read_text = Path.read_text

        def patched_read_text(self: Path, *args: object, **kwargs: object) -> str:
            if self == manifest_path:
                current = original_read_text(self, *args, **kwargs)
                payload = json.loads(current)
                if payload.get("version") == "1.0.1":
                    payload["version"] = "1.0.0"
                    return json.dumps(payload)
            return original_read_text(self, *args, **kwargs)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "settings.patch",
                project_root=str(project_root),
                dry_run=False,
            )
            approved_request.approval_token = approval.token
            approved_request.args = {
                "registry_path": "/O3DE/Settings",
                "operations": [{"op": "set", "path": "/version", "value": "1.0.1"}],
            }
            with patch("pathlib.Path.read_text", new=patched_read_text):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "ADAPTER_PRECHECK_FAILED"
        assert "post-write verification" in response.error.message
        restored_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert restored_manifest["version"] == "1.0.0"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["rollback_attempted"] is True
        assert execution.details["rollback_succeeded"] is True
        assert execution.details["rollback_trigger"] == "post_write_verification_value_mismatch"
        assert execution.details["rollback_outcome"] == "restored_and_verified"
        assert execution.details["rollback_verification_attempted"] is True
        assert execution.details["rollback_verification_succeeded"] is True
        assert execution.details["post_write_verification_attempted"] is True
        assert execution.details["post_write_verification_succeeded"] is False
        assert execution.details["mutation_audit"]["phase"] == "rollback"
        assert execution.details["mutation_audit"]["status"] == "rolled_back"
        assert (
            execution.details["mutation_audit"]["rollback_trigger"]
            == "post_write_verification_value_mismatch"
        )


def test_settings_patch_rejects_when_backup_creation_fails_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "BackupFailProject", "version": "1.0.0"}),
            encoding="utf-8",
        )
        initial_request = make_settings_patch_request()
        initial_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(initial_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "settings.patch",
                project_root=str(project_root),
            )
            approved_request.approval_token = approval.token
            approved_request.args = {
                "registry_path": "/O3DE/Settings",
                "operations": [{"op": "set", "path": "/version", "value": "1.0.1"}],
            }
            with patch("pathlib.Path.write_text", side_effect=OSError("disk full")):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "ADAPTER_PRECHECK_FAILED"
        assert "backup file could not be created" in response.error.message
        assert response.error.details is not None
        assert response.error.details["backup_created"] is False
        assert response.error.details["backup_target"].endswith("project.json.bak")
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.status.value == "failed"
        assert execution.details["backup_created"] is False
        assert execution.details["backup_error"] == "disk full"
        assert any("backup file could not be created" in warning for warning in response.warnings)


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


def test_settings_patch_events_use_plan_only_wording_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "PlanOnlySettingsProject", "version": "1.0.0"}),
            encoding="utf-8",
        )
        initial_request = make_settings_patch_request()
        initial_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(initial_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            approved_request = make_request(
                "project-build",
                "settings.patch",
                project_root=str(project_root),
            )
            approved_request.approval_token = approval.token
            approved_request.args = {
                "registry_path": "/O3DE/Settings",
                "operations": [{"op": "set", "path": "/version", "value": "1.0.1"}],
            }
            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        events = events_service.list_events()
        dispatch_event = next(
            event
            for event in reversed(events)
            if event.run_id == response.operation_id
            and event.category == "dispatch"
            and event.details.get("capability_status") == "mutation-gated"
        )
        locks_event = next(
            event
            for event in reversed(events)
            if event.run_id == response.operation_id and event.category == "locks"
        )
        assert "plan-only settings.patch preflight" in dispatch_event.message
        assert "plan-only settings.patch preflight" in locks_event.message


def test_editor_session_open_uses_real_runtime_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)

        first_request = make_editor_session_open_request()
        first_request.project_root = str(project_root)
        first_request.args["project_path"] = str(project_root)
        first = dispatcher_service.dispatch(first_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        approved_request = make_editor_session_open_request()
        approved_request.project_root = str(project_root)
        approved_request.dry_run = False
        approved_request.approval_token = approval.token
        approved_request.args["project_path"] = str(project_root)

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                with patch.object(
                    editor_automation_runtime_service,
                    "_bridge_is_healthy",
                    return_value=False,
                ):
                    with patch.object(
                        editor_automation_runtime_service,
                        "_launch_bridge_host",
                        return_value=None,
                    ):
                        with patch.object(
                            editor_automation_runtime_service,
                            "_invoke_bridge_command",
                            return_value={
                                "protocol_version": "v1",
                                "bridge_command_id": "bridge-command-1",
                                "request_id": approved_request.request_id,
                                "operation": "editor.session.open",
                                "success": True,
                                "status": "ok",
                                "bridge_name": "ControlPlaneEditorBridge",
                                "bridge_version": "0.1.0",
                                "started_at": "2026-04-20T00:00:00Z",
                                "finished_at": "2026-04-20T00:00:01Z",
                                "result_summary": "Persistent bridge editor session is available.",
                                "details": {
                                    "active_level_path": "Levels/Main.level",
                                    "selected_entity_count": 0,
                                },
                                "evidence_refs": [],
                            },
                        ):
                            response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.execution_mode == "real"
        assert response.result.simulated is False
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "editor_session_runtime"
        assert execution.details["runner_family"] == "editor-python-bindings"
        assert execution.details["editor_transport"] == "bridge"
        assert execution.details["bridge_command_id"] == "bridge-command-1"
        assert execution.executor_id == "executor-editor-control-real-local"
        assert execution.workspace_id == f"workspace-editor-{project_root.name.lower()}"
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "editor_session_runtime"
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


def test_editor_level_open_rejects_without_admitted_editor_session() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)

        first_request = make_editor_level_open_request()
        first_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(first_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        approved_request = make_editor_level_open_request()
        approved_request.project_root = str(project_root)
        approved_request.dry_run = False
        approved_request.approval_token = approval.token

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                with patch.object(
                    editor_automation_runtime_service,
                    "_bridge_is_healthy",
                    return_value=False,
                ):
                    response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "ADAPTER_PRECHECK_FAILED"
        assert response.error.details is not None
        assert response.error.details["inspection_surface"] == "editor_runtime_preflight"
        assert response.error.details["preflight_reason"] == "editor-session-not-ensured"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["preflight_reason"] == "editor-session-not-ensured"
        assert execution.executor_id is None
        assert execution.workspace_id is None


def test_editor_entity_create_rejects_without_loaded_level() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)

        first_request = make_editor_entity_create_request()
        first_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(first_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        approved_request = make_editor_entity_create_request()
        approved_request.project_root = str(project_root)
        approved_request.dry_run = False
        approved_request.approval_token = approval.token

        session_state_path = editor_state_path_for(project_root)
        session_state_path.parent.mkdir(parents=True, exist_ok=True)
        session_state_path.write_text(
            json.dumps({"session_active": True}),
            encoding="utf-8",
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_EDITOR_SCRIPT_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                response = dispatcher_service.dispatch(approved_request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "ADAPTER_PRECHECK_FAILED"
        assert response.error.details is not None
        assert response.error.details["preflight_reason"] == "level-not-loaded"


def test_editor_entity_create_uses_real_runtime_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)

        first_request = make_editor_entity_create_request()
        first_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(first_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        approved_request = make_editor_entity_create_request()
        approved_request.project_root = str(project_root)
        approved_request.dry_run = False
        approved_request.approval_token = approval.token

        session_state_path = editor_state_path_for(project_root)
        session_state_path.parent.mkdir(parents=True, exist_ok=True)
        session_state_path.write_text(
            json.dumps(
                {
                    "session_active": True,
                    "loaded_level_path": "Levels/Main.level",
                }
            ),
            encoding="utf-8",
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_entity_create",
                return_value={
                    "runtime_result": {
                        "ok": True,
                        "entity_id": "101",
                        "entity_name": "ExampleEntity",
                        "modified_entities": ["101"],
                        "exact_editor_apis": [
                            "ControlPlaneEditorBridge filesystem inbox",
                            "editor.entity.create",
                        ],
                        "entity_id_source": "editor_entity_context_create",
                        "direct_return_entity_id": "101",
                        "notification_entity_ids": [],
                        "selected_entity_count_before_create": 0,
                        "level_path": "Levels/Main.level",
                        "loaded_level_path": "Levels/Main.level",
                        "name_mutation_ran": False,
                        "name_mutation_succeeded": True,
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.entity.create",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-entity-1",
                        "bridge_result_summary": "editor.entity.create completed.",
                        "bridge_heartbeat_seen_at": "2026-04-21T00:00:01Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "bridge_selected_entity_count": 0,
                        "bridge_prefab_context_notes": (
                            "Selection was cleared before create to avoid selected-entity or prefab ownership ambiguity."
                        ),
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
                },
            ):
                with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                    response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.execution_mode == "real"
        assert response.result.simulated is False
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "editor_entity_created"
        assert execution.details["entity_name"] == "ExampleEntity"
        assert execution.details["entity_id"] == "101"
        assert execution.details["entity_id_source"] == "editor_entity_context_create"
        assert execution.details["selected_entity_count_before_create"] == 0
        assert execution.details["name_mutation_succeeded"] is True
        assert execution.details["bridge_available"] is True
        assert execution.details["bridge_operation"] == "editor.entity.create"
        assert execution.executor_id == "executor-editor-control-real-local"
        assert execution.workspace_id == f"workspace-editor-{project_root.name.lower()}"
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "editor_entity_created"
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


def test_editor_entity_create_captures_restore_boundary_before_mutation() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)
        level_file_path = write_level_file(project_root)

        session_state_path = editor_state_path_for(project_root)
        session_state_path.parent.mkdir(parents=True, exist_ok=True)
        session_state_path.write_text(
            json.dumps(
                {
                    "session_active": True,
                    "loaded_level_path": "Levels/Main.level",
                }
            ),
            encoding="utf-8",
        )

        with patch.object(
            editor_automation_runtime_service,
            "_resolve_bridge_runner",
            return_value=["fake-editor-runner"],
        ):
            with patch.object(
                editor_automation_runtime_service,
                "_bridge_host_available",
                return_value=True,
            ):
                with patch.object(
                    editor_automation_runtime_service,
                    "_invoke_bridge_command",
                    return_value={
                        "success": True,
                        "bridge_command_id": "bridge-entity-restore-1",
                        "operation": "editor.entity.create",
                        "protocol_version": "v1",
                        "finished_at": "2026-04-24T00:00:01Z",
                        "result_summary": "editor.entity.create completed.",
                        "details": {
                            "entity_id": "101",
                            "entity_name": "ExampleEntity",
                            "level_path": "Levels/Main.level",
                            "entity_id_source": "editor_entity_context_create",
                            "direct_return_entity_id": "101",
                            "notification_entity_ids": [],
                            "selected_entity_count_before_create": 0,
                            "name_mutation_ran": False,
                            "name_mutation_succeeded": True,
                        },
                    },
                ):
                    runtime_payload = editor_automation_runtime_service.execute_entity_create(
                        request_id="req-editor-restore-entity-1",
                        session_id=None,
                        workspace_id=None,
                        executor_id=None,
                        project_root=str(project_root),
                        engine_root=str(project_root),
                        dry_run=False,
                        args={
                            "entity_name": "ExampleEntity",
                            "level_path": "Levels/Main.level",
                        },
                        locks_acquired=[],
                    )

        runtime_result = runtime_payload["runtime_result"]
        assert runtime_result["restore_boundary_created"] is True
        assert runtime_result["restore_boundary_available"] is True
        assert runtime_result["restore_invoked"] is False
        assert runtime_result["restore_result"] == "available_not_invoked"
        assert runtime_result["restore_strategy"] == (
            "restore-loaded-level-file-from-pre-mutation-backup"
        )
        backup_path = Path(runtime_result["restore_boundary_backup_path"])
        assert backup_path.is_file()
        assert backup_path.read_text(encoding="utf-8") == level_file_path.read_text(
            encoding="utf-8"
        )
        persisted_state = json.loads(session_state_path.read_text(encoding="utf-8"))
        assert (
            persisted_state["available_restore_boundary"]["restore_boundary_id"]
            == runtime_result["restore_boundary_id"]
        )


def test_editor_component_add_uses_real_runtime_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)

        first_request = make_editor_component_add_request()
        first_request.project_root = str(project_root)
        first = dispatcher_service.dispatch(first_request)
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        approved_request = make_editor_component_add_request()
        approved_request.project_root = str(project_root)
        approved_request.dry_run = False
        approved_request.approval_token = approval.token

        session_state_path = editor_state_path_for(project_root)
        session_state_path.parent.mkdir(parents=True, exist_ok=True)
        session_state_path.write_text(
            json.dumps(
                {
                    "session_active": True,
                    "loaded_level_path": "Levels/Main.level",
                }
            ),
            encoding="utf-8",
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_component_add",
                return_value={
                    "runtime_result": {
                        "ok": True,
                        "entity_id": "101",
                        "entity_name": "ExampleEntity",
                        "added_components": ["Mesh"],
                        "added_component_refs": [
                            {
                                "component": "Mesh",
                                "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                                "entity_id": "101",
                            }
                        ],
                        "rejected_components": [],
                        "modified_entities": ["101"],
                        "level_path": "Levels/Main.level",
                        "loaded_level_path": "Levels/Main.level",
                        "exact_editor_apis": [
                            "ControlPlaneEditorBridge filesystem inbox",
                            "editor.component.add",
                        ],
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.component.add",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-component-1",
                        "bridge_result_summary": "editor.component.add completed.",
                        "bridge_heartbeat_seen_at": "2026-04-22T00:00:01Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "bridge_selected_entity_count": 0,
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
                },
            ):
                with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                    response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.execution_mode == "real"
        assert response.result.simulated is False
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "editor_component_added"
        assert execution.details["entity_id"] == "101"
        assert execution.details["entity_name"] == "ExampleEntity"
        assert execution.details["added_components"] == ["Mesh"]
        assert execution.details["added_component_refs"] == [
            {
                "component": "Mesh",
                "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                "entity_id": "101",
            }
        ]
        assert execution.details["rejected_components"] == []
        assert execution.details["bridge_available"] is True
        assert execution.details["bridge_operation"] == "editor.component.add"
        assert execution.executor_id == "executor-editor-control-real-local"
        assert execution.workspace_id == f"workspace-editor-{project_root.name.lower()}"
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "editor_component_added"
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


def test_editor_component_add_captures_restore_boundary_before_mutation() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)
        write_level_file(project_root)

        session_state_path = editor_state_path_for(project_root)
        session_state_path.parent.mkdir(parents=True, exist_ok=True)
        session_state_path.write_text(
            json.dumps(
                {
                    "session_active": True,
                    "loaded_level_path": "Levels/Main.level",
                    "last_created_entity_id": "101",
                    "last_created_entity_name": "ExampleEntity",
                }
            ),
            encoding="utf-8",
        )

        with patch.object(
            editor_automation_runtime_service,
            "_resolve_bridge_runner",
            return_value=["fake-editor-runner"],
        ):
            with patch.object(
                editor_automation_runtime_service,
                "_bridge_host_available",
                return_value=True,
            ):
                with patch.object(
                    editor_automation_runtime_service,
                    "_invoke_bridge_command",
                    return_value={
                        "success": True,
                        "bridge_command_id": "bridge-component-restore-1",
                        "operation": "editor.component.add",
                        "protocol_version": "v1",
                        "finished_at": "2026-04-24T00:00:02Z",
                        "result_summary": "editor.component.add completed.",
                        "details": {
                            "entity_id": "101",
                            "entity_name": "ExampleEntity",
                            "added_components": ["Mesh"],
                            "added_component_refs": [
                                {
                                    "component": "Mesh",
                                    "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                                    "entity_id": "101",
                                }
                            ],
                            "rejected_components": [],
                            "modified_entities": ["101"],
                            "level_path": "Levels/Main.level",
                            "loaded_level_path": "Levels/Main.level",
                        },
                    },
                ):
                    runtime_payload = editor_automation_runtime_service.execute_component_add(
                        request_id="req-editor-restore-component-1",
                        session_id=None,
                        workspace_id=None,
                        executor_id=None,
                        project_root=str(project_root),
                        engine_root=str(project_root),
                        dry_run=False,
                        args={
                            "entity_id": "101",
                            "components": ["Mesh"],
                            "level_path": "Levels/Main.level",
                        },
                        locks_acquired=[],
                    )

        runtime_result = runtime_payload["runtime_result"]
        assert runtime_result["restore_boundary_created"] is True
        assert runtime_result["restore_boundary_available"] is True
        assert runtime_result["restore_invoked"] is False
        assert runtime_result["restore_result"] == "available_not_invoked"
        assert runtime_result["restore_strategy"] == (
            "restore-loaded-level-file-from-pre-mutation-backup"
        )


def test_editor_component_add_restores_level_snapshot_when_bridge_fails() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)
        level_file_path = write_level_file(
            project_root,
            content='{\n  "level": "before-component-add"\n}\n',
        )

        session_state_path = editor_state_path_for(project_root)
        session_state_path.parent.mkdir(parents=True, exist_ok=True)
        session_state_path.write_text(
            json.dumps(
                {
                    "session_active": True,
                    "loaded_level_path": "Levels/Main.level",
                    "last_created_entity_id": "101",
                    "last_created_entity_name": "ExampleEntity",
                }
            ),
            encoding="utf-8",
        )

        def failing_bridge_command(**_: object) -> dict[str, object]:
            level_file_path.write_text(
                '{\n  "level": "mutated-before-restore"\n}\n',
                encoding="utf-8",
            )
            raise AdapterExecutionRejected(
                "editor.component.add bridge command failed after mutation.",
                details={"bridge_operation": "editor.component.add"},
                logs=["Bridge reported editor.component.add failure."],
            )

        with patch.object(
            editor_automation_runtime_service,
            "_resolve_bridge_runner",
            return_value=["fake-editor-runner"],
        ):
            with patch.object(
                editor_automation_runtime_service,
                "_bridge_host_available",
                return_value=True,
            ):
                with patch.object(
                    editor_automation_runtime_service,
                    "_invoke_bridge_command",
                    side_effect=failing_bridge_command,
                ):
                    with pytest.raises(AdapterExecutionRejected) as exc_info:
                        editor_automation_runtime_service.execute_component_add(
                            request_id="req-editor-restore-component-fail-1",
                            session_id=None,
                            workspace_id=None,
                            executor_id=None,
                            project_root=str(project_root),
                            engine_root=str(project_root),
                            dry_run=False,
                            args={
                                "entity_id": "101",
                                "components": ["Mesh"],
                                "level_path": "Levels/Main.level",
                            },
                            locks_acquired=[],
                        )

        assert level_file_path.read_text(encoding="utf-8") == (
            '{\n  "level": "before-component-add"\n}\n'
        )
        assert exc_info.value.details["restore_boundary_created"] is True
        assert exc_info.value.details["restore_invoked"] is True
        assert exc_info.value.details["restore_attempted"] is True
        assert exc_info.value.details["restore_succeeded"] is True
        assert exc_info.value.details["restore_result"] == "restored_and_verified"
        assert exc_info.value.details["restore_trigger"] == (
            "editor-component-add-bridge-failure"
        )
        persisted_state = json.loads(session_state_path.read_text(encoding="utf-8"))
        assert persisted_state["available_restore_boundary"]["restore_result"] == (
            "restored_and_verified"
        )


def test_editor_component_property_get_uses_real_runtime_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)

        request = make_editor_component_property_get_request()
        request.project_root = str(project_root)
        request.dry_run = False

        session_state_path = editor_state_path_for(project_root)
        session_state_path.parent.mkdir(parents=True, exist_ok=True)
        session_state_path.write_text(
            json.dumps(
                {
                    "session_active": True,
                    "loaded_level_path": "Levels/Main.level",
                }
            ),
            encoding="utf-8",
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_component_property_get",
                return_value={
                    "runtime_result": {
                        "ok": True,
                        "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                        "property_path": "Controller|Configuration|Model Asset",
                        "value": "objects/example.azmodel",
                        "value_type": "AZ::Data::Asset<AZ::Data::AssetData>",
                        "read_only": True,
                        "write_occurred": False,
                        "entity_id": "101",
                        "level_path": "Levels/Main.level",
                        "loaded_level_path": "Levels/Main.level",
                        "exact_editor_apis": [
                            "ControlPlaneEditorBridge filesystem inbox",
                            "editor.component.property.get",
                        ],
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.component.property.get",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-component-property-1",
                        "bridge_result_summary": "editor.component.property.get completed.",
                        "bridge_heartbeat_seen_at": "2026-04-22T00:00:01Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
                },
            ):
                with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                    response = dispatcher_service.dispatch(request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.execution_mode == "real"
        assert response.result.simulated is False
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "editor_component_property_read"
        assert execution.details["component_id"] == "EntityComponentIdPair(EntityId(101), 201)"
        assert execution.details["property_path"] == "Controller|Configuration|Model Asset"
        assert execution.details["value"] == "objects/example.azmodel"
        assert execution.details["value_type"] == "AZ::Data::Asset<AZ::Data::AssetData>"
        assert execution.details["read_only"] is True
        assert execution.details["write_occurred"] is False
        assert execution.details["entity_id"] == "101"
        assert execution.details["bridge_available"] is True
        assert execution.details["bridge_operation"] == "editor.component.property.get"
        assert execution.executor_id == "executor-editor-control-real-local"
        assert execution.workspace_id == f"workspace-editor-{project_root.name.lower()}"
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "editor_component_property_read"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="editor.component.property.get",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="editor.component.property.get",
                payload=artifact.metadata,
            )
            == []
        )


def test_exact_camera_bool_write_uses_real_runtime_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)

        request = approve_camera_bool_write_request(project_root=str(project_root))
        runtime_result = {
            "ok": True,
            "message": (
                "Camera bool scalar property was written through the exact "
                "admitted public corridor."
            ),
            "tool": CAMERA_BOOL_WRITE_CAPABILITY,
            "capability_name": CAMERA_BOOL_WRITE_CAPABILITY,
            "proof_bridge_operation": "editor.camera.scalar.write.proof",
            "proof_only": False,
            "public_admission": True,
            "write_admission": True,
            "admission_class": "content_write",
            "generalized_undo_available": False,
            "property_list_admission": False,
            "component_name": CAMERA_SCALAR_WRITE_PROOF_COMPONENT,
            "component_id": "EntityComponentIdPair(EntityId(101), 301)",
            "component_id_provenance": (
                COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
            ),
            "property_path": CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH,
            "value_type": "bool",
            "previous_value": False,
            "requested_value": True,
            "value": True,
            "changed": True,
            "write_verified": True,
            "restore_boundary_id": "restore-boundary-1",
            "target_status": "admitted_exact_camera_bool_write",
            "restore_or_revert_guidance": (
                "This is not generalized undo. Rerun exact corridor with previous_value."
            ),
            "level_path": "Levels/Main.level",
            "loaded_level_path": "Levels/Main.level",
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.camera.scalar.write.proof",
                "EditorComponentAPIBus.GetComponentProperty",
                "EditorComponentAPIBus.SetComponentProperty",
            ],
            "bridge_available": True,
            "bridge_name": "ControlPlaneEditorBridge",
            "bridge_version": "0.1.0",
            "bridge_operation": "editor.camera.scalar.write.proof",
            "bridge_contract_version": "v1",
            "bridge_command_id": "bridge-camera-bool-write-1",
            "bridge_result_summary": "Camera scalar bool property write was verified.",
            "bridge_heartbeat_seen_at": "2026-04-26T00:00:01Z",
            "bridge_queue_mode": "filesystem-inbox",
            "editor_transport": "bridge",
        }

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_camera_bool_make_active_on_activation_write",
                return_value={
                    "runtime_result": runtime_result,
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
                },
            ):
                response = dispatcher_service.dispatch(request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.tool == CAMERA_BOOL_WRITE_CAPABILITY
        assert response.result.execution_mode == "real"
        assert response.result.simulated is False
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == response.operation_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "editor_camera_bool_property_write"
        assert execution.details["component_name"] == CAMERA_SCALAR_WRITE_PROOF_COMPONENT
        assert execution.details["property_path"] == CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH
        assert execution.details["value"] is True
        assert execution.details["write_verified"] is True
        assert execution.details["capability_name"] == CAMERA_BOOL_WRITE_CAPABILITY
        assert execution.details["approval_class"] == "content_write"
        assert execution.details["admission_class"] == "content_write"
        assert execution.details["generalized_undo_available"] is False
        assert "not generalized undo" in execution.details["restore_or_revert_guidance"]
        assert execution.details["public_admission"] is True
        assert execution.details["property_list_admission"] is False
        assert artifact is not None
        assert artifact.metadata["inspection_surface"] == "editor_camera_bool_property_write"
        assert artifact.metadata["capability_name"] == CAMERA_BOOL_WRITE_CAPABILITY


def test_editor_component_find_uses_real_runtime_with_live_provenance() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)

        request = make_editor_component_find_request()
        request.project_root = str(project_root)
        request.dry_run = False
        component_id = "EntityComponentIdPair(EntityId(101), 201)"

        session_state_path = editor_state_path_for(project_root)
        session_state_path.parent.mkdir(parents=True, exist_ok=True)
        session_state_path.write_text(
            json.dumps(
                {
                    "session_active": True,
                    "loaded_level_path": "Levels/Main.level",
                }
            ),
            encoding="utf-8",
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_component_find",
                return_value={
                    "runtime_result": {
                        "ok": True,
                        "found": True,
                        "lookup_mode": "entity_id",
                        "entity_id": "101",
                        "entity_name": "ExampleEntity",
                        "component_name": "Mesh",
                        "component_id": component_id,
                        "component_id_provenance": "admitted_runtime_component_discovery_result",
                        "component_refs": [
                            {
                                "component": "Mesh",
                                "component_id": component_id,
                                "component_id_provenance": "admitted_runtime_component_discovery_result",
                                "entity_id": "101",
                                "entity_name": "ExampleEntity",
                            }
                        ],
                        "matched_count": 1,
                        "ambiguous": False,
                        "level_path": "Levels/Main.level",
                        "loaded_level_path": "Levels/Main.level",
                        "exact_editor_apis": [
                            "ControlPlaneEditorBridge filesystem inbox",
                            "editor.component.find",
                            "EditorComponentAPIBus.HasComponentOfType",
                            "EditorComponentAPIBus.GetComponentOfType",
                        ],
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.component.find",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-component-find-1",
                        "bridge_result_summary": "editor.component.find completed.",
                        "bridge_heartbeat_seen_at": "2026-04-22T00:00:01Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
                },
            ):
                with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                    response = dispatcher_service.dispatch(request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.execution_mode == "real"
        assert response.result.simulated is False
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "editor_component_discovery_read"
        assert execution.details["found"] is True
        assert execution.details["component_id"] == component_id
        assert (
            execution.details["component_id_provenance"]
            == "admitted_runtime_component_discovery_result"
        )
        assert execution.details["component_refs"][0]["component_id"] == component_id
        assert execution.details["bridge_operation"] == "editor.component.find"
        assert artifact is not None
        assert artifact.metadata["inspection_surface"] == "editor_component_discovery_read"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="editor.component.find",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="editor.component.find",
                payload=artifact.metadata,
            )
            == []
        )


def test_editor_entity_exists_simulated_persisted_payloads_match_published_schemas() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(make_editor_entity_exists_request())

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
                tool_name="editor.entity.exists",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="editor.entity.exists",
                payload=artifact.metadata,
            )
            == []
        )


def test_editor_entity_exists_uses_real_runtime_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        write_editor_project_manifest(project_root)

        request = make_editor_entity_exists_request()
        request.project_root = str(project_root)
        request.dry_run = False

        session_state_path = editor_state_path_for(project_root)
        session_state_path.parent.mkdir(parents=True, exist_ok=True)
        session_state_path.write_text(
            json.dumps(
                {
                    "session_active": True,
                    "loaded_level_path": "Levels/Main.level",
                }
            ),
            encoding="utf-8",
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_entity_exists",
                return_value={
                    "runtime_result": {
                        "ok": True,
                        "exists": True,
                        "lookup_mode": "entity_id",
                        "entity_id": "101",
                        "entity_name": "ExampleEntity",
                        "requested_entity_id": "101",
                        "matched_count": 1,
                        "matched_entity_ids": ["101"],
                        "ambiguous": False,
                        "level_path": "Levels/Main.level",
                        "loaded_level_path": "Levels/Main.level",
                        "exact_editor_apis": [
                            "ControlPlaneEditorBridge filesystem inbox",
                            "editor.entity.exists",
                        ],
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.entity.exists",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-entity-exists-1",
                        "bridge_result_summary": "editor.entity.exists completed.",
                        "bridge_heartbeat_seen_at": "2026-04-22T00:00:01Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
                },
            ):
                with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                    response = dispatcher_service.dispatch(request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.execution_mode == "real"
        assert response.result.simulated is False
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "editor_entity_exists_read"
        assert execution.details["exists"] is True
        assert execution.details["lookup_mode"] == "entity_id"
        assert execution.details["entity_id"] == "101"
        assert execution.details["entity_name"] == "ExampleEntity"
        assert execution.details["matched_count"] == 1
        assert execution.details["matched_entity_ids"] == ["101"]
        assert execution.details["ambiguous"] is False
        assert execution.details["bridge_available"] is True
        assert execution.details["bridge_operation"] == "editor.entity.exists"
        assert execution.executor_id == "executor-editor-control-real-local"
        assert execution.workspace_id == f"workspace-editor-{project_root.name.lower()}"
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "editor_entity_exists_read"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="editor.entity.exists",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="editor.entity.exists",
                payload=artifact.metadata,
            )
            == []
        )


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


def test_gem_enable_uses_real_preflight_substrate_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        manifest_path.write_text(
            json.dumps(
                {
                    "project_name": "GemProject",
                    "version": "1.0.0",
                    "gem_names": ["ExampleGem"],
                }
            ),
            encoding="utf-8",
        )
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text("CMAKE_GENERATOR:INTERNAL=Ninja\n", encoding="utf-8")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_gem_enable_request(
                    project_root=str(project_root),
                    version="1.2.3",
                    optional=True,
                )
            )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "gem_enable_preflight"
        assert execution.details["preflight_execution_mode"] == "plan-only"
        assert execution.details["requested_gem_name"] == "ExampleGem"
        assert execution.details["requested_version"] == "1.2.3"
        assert execution.details["requested_optional"] is True
        assert execution.details["requested_gem_already_enabled"] is True
        assert execution.details["manifest_mutation_required"] is False
        assert execution.details["configured_build_tree_available"] is True
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_artifact_produced"] is False
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "gem_enable_preflight"


def test_gem_enable_records_missing_manifest_gem_state_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps({"project_name": "GemProject", "version": "1.0.0", "gem_names": []}),
            encoding="utf-8",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_gem_enable_request(project_root=str(project_root))
            )

        assert response.ok is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["inspection_surface"] == "gem_enable_preflight"
        assert execution.details["requested_gem_already_enabled"] is False
        assert execution.details["manifest_mutation_required"] is True
        assert execution.details["manifest_write_available"] is True
        assert execution.details["backup_created"] is True
        assert execution.details["mutation_ready"] is True
        assert execution.details["mutation_blocked"] is True
        assert execution.details["matched_requested_gem_names"] == []
        assert execution.details["missing_requested_gem_names"] == ["ExampleGem"]
        assert execution.details["configured_build_tree_available"] is False
        assert execution.details["gem_entries_present"] is False
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_unavailable_reason"] is not None
        assert any(
            "configured build-tree evidence remains unavailable" in warning.lower()
            for warning in execution.warnings
        )


def test_gem_enable_writes_manifest_on_fully_admitted_path_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps({"project_name": "GemProject", "gem_names": []}),
            encoding="utf-8",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_gem_enable_request(project_root=str(project_root), dry_run=False)
            )

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "gem_enable_mutation"
        assert execution.details["requested_gem_name"] == "ExampleGem"
        assert execution.details["requested_gem_already_enabled"] is False
        assert execution.details["manifest_mutation_required"] is True
        assert execution.details["backup_created"] is True
        assert execution.details["mutation_ready"] is True
        assert execution.details["mutation_blocked"] is False
        assert execution.details["mutation_applied"] is True
        assert execution.details["execution_attempted"] is True
        assert execution.details["result_status"] == "mutation-applied"
        assert execution.details["post_write_verification_attempted"] is True
        assert execution.details["post_write_verification_succeeded"] is True
        assert execution.details["verified_requested_gem_present"] is True
        assert execution.details["matched_requested_gem_names"] == ["ExampleGem"]
        assert execution.details["missing_requested_gem_names"] == []
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "gem_enable_mutation"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert manifest["gem_names"] == ["ExampleGem"]


def test_gem_enable_rolls_back_when_manifest_write_fails() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps({"project_name": "GemProject", "gem_names": []}),
            encoding="utf-8",
        )

        original_write_text = Path.write_text
        failed_once = {"manifest_write": False}

        def patched_write_text(
            self: Path,
            data: str,
            *args: object,
            **kwargs: object,
        ) -> int:
            if self == manifest_path and not failed_once["manifest_write"]:
                failed_once["manifest_write"] = True
                raise OSError("write failed")
            return original_write_text(self, data, *args, **kwargs)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch("pathlib.Path.write_text", new=patched_write_text):
                response = dispatcher_service.dispatch(
                    approve_gem_enable_request(project_root=str(project_root), dry_run=False)
                )

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "ADAPTER_PRECHECK_FAILED"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["inspection_surface"] == "gem_enable_mutation"
        assert execution.details["rollback_attempted"] is True
        assert execution.details["rollback_succeeded"] is True
        assert execution.details["rollback_trigger"] == "mutation_write_failure"
        assert execution.details["rollback_outcome"] == "restored_and_verified"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert manifest["gem_names"] == []


def test_gem_enable_real_persisted_payloads_match_published_schemas() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps({"project_name": "GemProject", "gem_names": []}),
            encoding="utf-8",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_gem_enable_request(project_root=str(project_root), dry_run=False)
            )

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "gem_enable_mutation"
        assert execution.details["requested_gem_already_enabled"] is False
        assert execution.details["mutation_applied"] is True
        assert execution.details["execution_attempted"] is True
        assert execution.details["result_artifact_produced"] is False
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "gem_enable_mutation"
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


def test_build_compile_uses_real_preflight_substrate_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        target_path = project_root / "build" / "windows" / "bin" / "profile" / "Editor.exe"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text("CMAKE_GENERATOR:INTERNAL=Ninja\n", encoding="utf-8")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"build-target")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_build_compile_request(project_root=str(project_root))
            )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "build_compile_preflight"
        assert execution.details["preflight_execution_mode"] == "plan-only"
        assert execution.details["configured_build_tree_available"] is True
        assert (
            execution.details["target_artifact_candidates_found_for_all_requested_targets"]
            is True
        )
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_artifact_produced"] is False
        assert str(target_path) in execution.details["resolved_target_candidate_paths"]
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "build_compile_preflight"


def test_build_compile_real_persisted_payloads_match_published_schemas() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "linux" / "CMakeCache.txt"
        target_path = project_root / "build" / "linux" / "bin" / "profile" / "Editor"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text("CMAKE_BUILD_TYPE:STRING=profile\n", encoding="utf-8")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"build-target-schema")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_build_compile_request(project_root=str(project_root))
            )

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_status"] == "not_attempted_preflight_blocked"
        assert execution.details["build_execution_policy_allowed"] is True
        assert execution.details["pre_run_target_candidate_evidence"]
        assert artifact is not None
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


def test_build_compile_uses_real_runner_substrate_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        build_tree = cache_path.parent
        target_path = build_tree / "bin" / "profile" / "Editor.exe"
        cmake_path = build_tree / "cmake.exe"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            f"CMAKE_GENERATOR:INTERNAL=Ninja\nCMAKE_COMMAND:FILEPATH={cmake_path}\n",
            encoding="utf-8",
        )
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"build-target")
        cmake_path.write_text("", encoding="utf-8")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.subprocess.run",
                return_value=subprocess.CompletedProcess(
                    args=[str(cmake_path), "--build", str(build_tree), "--target", "Editor"],
                    returncode=0,
                    stdout="build ok",
                    stderr="",
                ),
            ):
                response = dispatcher_service.dispatch(
                    approve_build_compile_request(
                        project_root=str(project_root),
                        dry_run=False,
                    )
                )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "build_compile_runner"
        assert execution.details["execution_attempted"] is True
        assert execution.details["build_runner_available"] is True
        assert execution.details["exit_code_available"] is True
        assert execution.details["exit_code"] == 0
        assert execution.details["result_artifact_produced"] is True
        assert execution.details["result_artifact_path"]
        assert execution.details["result_artifact_content_type"] == "text/plain"
        assert execution.details["result_status"] == "attempted_but_output_unverified"
        assert execution.details["target_candidate_revalidation_attempted"] is True
        assert execution.details["target_candidate_revalidation_changed_count"] == 0
        assert execution.details["compiled_output_verified"] is False
        assert execution.details["runner_command"][:4] == [
            str(cmake_path),
            "--build",
            str(build_tree),
            "--target",
        ]
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "build_compile_runner"
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


def test_build_compile_marks_succeeded_when_generic_candidate_revalidation_proves_output_change() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        build_tree = cache_path.parent
        target_path = build_tree / "bin" / "profile" / "Editor.exe"
        cmake_path = build_tree / "cmake.exe"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            f"CMAKE_GENERATOR:INTERNAL=Ninja\nCMAKE_COMMAND:FILEPATH={cmake_path}\n",
            encoding="utf-8",
        )
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"build-target")
        cmake_path.write_text("", encoding="utf-8")

        def _run_and_update_target(*args, **kwargs) -> subprocess.CompletedProcess[str]:
            target_path.write_bytes(b"build-target-updated")
            target_path.touch()
            return subprocess.CompletedProcess(
                args=[str(cmake_path), "--build", str(build_tree), "--target", "Editor"],
                returncode=0,
                stdout="build ok",
                stderr="",
            )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.subprocess.run",
                side_effect=_run_and_update_target,
            ):
                response = dispatcher_service.dispatch(
                    approve_build_compile_request(
                        project_root=str(project_root),
                        dry_run=False,
                    )
                )

        assert response.ok is True
        assert response.result is not None
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["result_status"] == "succeeded"
        assert execution.details["compiled_output_verified"] is True
        assert str(target_path) in execution.details["target_candidate_revalidation_verified_paths"]
        assert execution.details["target_candidate_revalidation_changed_count"] >= 1
        assert execution.details["compiled_output_verification_basis"]


def test_build_compile_records_failed_exit_code_runner_evidence() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        build_tree = cache_path.parent
        target_path = build_tree / "bin" / "profile" / "Editor.exe"
        cmake_path = build_tree / "cmake.exe"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            f"CMAKE_GENERATOR:INTERNAL=Ninja\nCMAKE_COMMAND:FILEPATH={cmake_path}\n",
            encoding="utf-8",
        )
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"build-target")
        cmake_path.write_text("", encoding="utf-8")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.subprocess.run",
                return_value=subprocess.CompletedProcess(
                    args=[str(cmake_path), "--build", str(build_tree), "--target", "Editor"],
                    returncode=2,
                    stdout="build failed",
                    stderr="compile error",
                ),
            ):
                response = dispatcher_service.dispatch(
                    approve_build_compile_request(
                        project_root=str(project_root),
                        dry_run=False,
                    )
                )

        assert response.ok is True
        assert response.result is not None
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["execution_attempted"] is True
        assert execution.details["result_status"] == "failed_exit_code"
        assert execution.details["exit_code_available"] is True
        assert execution.details["exit_code"] == 2
        assert execution.details["compiled_output_verified"] is False


def test_build_compile_records_timed_out_runner_evidence() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        build_tree = cache_path.parent
        target_path = build_tree / "bin" / "profile" / "Editor.exe"
        cmake_path = build_tree / "cmake.exe"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            f"CMAKE_GENERATOR:INTERNAL=Ninja\nCMAKE_COMMAND:FILEPATH={cmake_path}\n",
            encoding="utf-8",
        )
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"build-target")
        cmake_path.write_text("", encoding="utf-8")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.subprocess.run",
                side_effect=subprocess.TimeoutExpired(
                    cmd=[str(cmake_path), "--build", str(build_tree), "--target", "Editor"],
                    timeout=120,
                    output="partial stdout",
                    stderr="partial stderr",
                ),
            ):
                response = dispatcher_service.dispatch(
                    approve_build_compile_request(
                        project_root=str(project_root),
                        dry_run=False,
                    )
                )

        assert response.ok is True
        assert response.result is not None
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["execution_attempted"] is True
        assert execution.details["result_status"] == "timed_out"
        assert execution.details["runner_timed_out"] is True
        assert execution.details["exit_code_available"] is False
        assert execution.details["compiled_output_verified"] is False


def test_build_compile_records_missing_runner_classification() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        target_path = project_root / "build" / "windows" / "bin" / "profile" / "Editor.exe"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text("CMAKE_GENERATOR:INTERNAL=Ninja\n", encoding="utf-8")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"build-target")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.ProjectBuildHybridAdapter._probe_build_compile_runner",
                return_value={
                    "build_runner_available": False,
                    "build_runner_path": None,
                    "build_runner_exists": False,
                    "build_runner_source": "unavailable",
                    "build_runner_probe_method": "cmake-cache-lookup+host-path-lookup",
                    "build_runner_candidate_paths": [],
                },
            ):
                response = dispatcher_service.dispatch(
                    approve_build_compile_request(
                        project_root=str(project_root),
                        dry_run=False,
                    )
                )

        assert response.ok is True
        assert response.result is not None
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_status"] == "not_attempted_missing_runner"
        assert execution.details["build_runner_available"] is False


def test_build_compile_records_policy_blocked_classification_when_runner_execution_is_not_admitted() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        cache_path = project_root / "build" / "windows" / "CMakeCache.txt"
        build_tree = cache_path.parent
        target_path = build_tree / "bin" / "profile" / "Editor.exe"
        cmake_path = build_tree / "cmake.exe"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            f"CMAKE_GENERATOR:INTERNAL=Ninja\nCMAKE_COMMAND:FILEPATH={cmake_path}\n",
            encoding="utf-8",
        )
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"build-target")
        cmake_path.write_text("", encoding="utf-8")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            report = adapter_service.execute(
                request_id="build-compile-policy-blocked-1",
                session_id=None,
                workspace_id=None,
                executor_id=None,
                tool="build.compile",
                agent="project-build",
                project_root=str(project_root),
                engine_root="/tmp/engine",
                dry_run=False,
                args={"targets": ["Editor"]},
                approval_class="read_only",
                locks_acquired=[],
            )

        assert report.execution_details["execution_attempted"] is False
        assert report.execution_details["result_status"] == "not_attempted_policy_blocked"
        assert report.execution_details["build_execution_policy_allowed"] is False


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


def test_asset_processor_status_real_persisted_payloads_match_published_schemas() -> None:
    with isolated_database():
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.AssetPipelineHybridAdapter._probe_asset_processor_runtime",
                return_value={
                    "runtime_probe_available": True,
                    "runtime_probe_method": "windows-tasklist",
                    "runtime_process_ids": [4242],
                    "runtime_process_names": ["AssetProcessor.exe"],
                },
            ):
                response = dispatcher_service.dispatch(make_asset_processor_status_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "asset_processor_runtime"
        assert execution.details["runtime_probe_available"] is True
        assert execution.details["runtime_status"] == "running"
        assert execution.details["runtime_process_count"] == 1
        assert execution.details["job_evidence_available"] is False
        assert execution.details["platform_evidence_available"] is False
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "asset_processor_runtime"
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


def test_asset_batch_process_uses_real_preflight_substrate_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Models" / "ship.fbx"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(b"asset-batch-source")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.AssetPipelineHybridAdapter._probe_asset_processor_runtime",
                return_value={
                    "runtime_probe_available": True,
                    "runtime_probe_method": "windows-tasklist",
                    "runtime_process_ids": [5150],
                    "runtime_process_names": ["AssetProcessor.exe"],
                },
            ):
                response = dispatcher_service.dispatch(
                    approve_asset_batch_process_request(project_root=str(project_root))
                )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "asset_batch_preflight"
        assert execution.details["preflight_execution_mode"] == "plan-only"
        assert execution.details["runtime_available"] is True
        assert execution.details["source_candidate_match_count"] == 1
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_artifact_produced"] is False
        assert str(source_path) in execution.details["resolved_source_candidate_paths"]
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "asset_batch_preflight"
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


def test_asset_batch_process_records_dry_run_fallback_provenance_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_asset_batch_process_request(
                    project_root=str(project_root),
                    dry_run=False,
                )
            )

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
        assert execution.details["fallback_category"] == "dry-run-required"
        assert execution.details["project_root_path"] == str(project_root.resolve())


def test_asset_move_safe_uses_real_preflight_substrate_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Old" / "example.fbx"
        destination_path = project_root / "Assets" / "New" / "example.fbx"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(b"asset-move-source")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_asset_move_safe_request(
                    project_root=str(project_root),
                    source_path="Assets/Old/example.fbx",
                    destination_path="Assets/New/example.fbx",
                    dry_run=False,
                    dry_run_plan=True,
                )
            )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "asset_move_preflight"
        assert execution.details["preflight_execution_mode"] == "plan-only"
        assert execution.details["move_plan_requested"] is True
        assert execution.details["source_exists"] is True
        assert execution.details["source_is_file"] is True
        assert execution.details["destination_exists"] is False
        assert execution.details["destination_parent_exists"] is True
        assert execution.details["source_destination_same_path"] is False
        assert execution.details["identity_corridor_available"] is True
        assert execution.details["update_references_requested"] is True
        assert execution.details["reference_preflight_available"] is False
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_artifact_produced"] is False
        assert execution.details["source_path_resolved"] == str(source_path.resolve())
        assert execution.details["destination_path_resolved"] == str(destination_path.resolve())
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "asset_move_preflight"


def test_asset_move_safe_records_plan_required_fallback_provenance_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Old" / "example.fbx"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(b"asset-move-fallback")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_asset_move_safe_request(
                    project_root=str(project_root),
                    source_path="Assets/Old/example.fbx",
                    destination_path="Assets/New/example.fbx",
                    dry_run=False,
                    dry_run_plan=False,
                )
            )

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
        assert execution.details["fallback_category"] == "plan-required"
        assert execution.details["project_root_path"] == str(project_root.resolve())


def test_asset_move_safe_real_persisted_payloads_match_published_schemas() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Old" / "example.fbx"
        destination_path = project_root / "Assets" / "New" / "example.fbx"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(b"asset-move-schema")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_asset_move_safe_request(
                    project_root=str(project_root),
                    source_path="Assets/Old/example.fbx",
                    destination_path="Assets/New/example.fbx",
                    dry_run=False,
                    dry_run_plan=True,
                )
            )

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_status"] == "not-attempted"
        assert artifact is not None
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="asset.move.safe",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="asset.move.safe",
                payload=artifact.metadata,
            )
            == []
        )


def test_asset_source_inspect_real_persisted_payloads_match_published_schemas() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        source_path = project_root / "Assets" / "Textures" / "example.png"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_bytes = b"real-asset-source"
        source_path.write_bytes(source_bytes)

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with isolated_database():
                request = make_asset_source_inspect_request()
                request.project_root = str(project_root)
                response = dispatcher_service.dispatch(request)
                assert response.ok is True
                assert response.result is not None
                assert response.result.simulated is False
                assert response.result.execution_mode == "real"
                run_id = response.operation_id
                assert run_id is not None
                execution = next(
                    execution
                    for execution in executions_service.list_executions()
                    if execution.run_id == run_id
                )
                artifact = artifacts_service.get_artifact(response.artifacts[0])
                assert execution.details["inspection_surface"] == "asset_source_file"
                assert execution.details["simulated"] is False
                assert execution.details["source_path_relative_to_project_root"] == (
                    "Assets/Textures/example.png"
                )
                assert execution.details["source_exists"] is True
                assert execution.details["source_is_file"] is True
                assert execution.details["source_resolution_status"] == "resolved-file"
                assert execution.details["source_size_bytes"] == len(source_bytes)
                assert execution.details["product_evidence_requested"] is True
                assert execution.details["product_evidence_available"] is False
                assert execution.details["dependency_evidence_requested"] is True
                assert execution.details["dependency_evidence_available"] is False
                assert artifact is not None
                assert artifact.simulated is False
                assert artifact.metadata["execution_mode"] == "real"
                assert artifact.metadata["inspection_surface"] == "asset_source_file"
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


def test_render_material_inspect_uses_real_runtime_probe_substrate_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        material_path = project_root / "Materials" / "Example.material"
        material_path.parent.mkdir(parents=True, exist_ok=True)
        material_path.write_text(
            json.dumps(
                {
                    "materialType": "ReadbackMaterial",
                    "propertyValues": {"roughness": 0.5, "metallic": 0.1},
                }
            ),
            encoding="utf-8",
        )
        runtime_result = {
            "ok": True,
            "message": "Material inspection substrate probe completed against the admitted editor runtime path.",
            "runtime_probe_attempted": True,
            "runtime_probe_method": "editor-runtime-get-context",
            "runtime_available": True,
            "material_inspection_requested": True,
            "material_inspection_attempted": False,
            "material_runtime_mode": "runtime-probe-only",
            "material_operation_available": False,
            "material_evidence_produced": False,
            "material_evidence_path": None,
            "material_unavailable_reason": "No admitted real material inspection path is available in this slice.",
            "material_path": "Materials/Example.material",
            "include_shader_data_requested": True,
            "include_references_requested": True,
            "active_level_path": "Levels/Main.level",
            "editor_transport": "oneshot",
            "bridge_name": "ControlPlaneEditorBridge",
            "bridge_available": True,
            "bridge_operation": "GetEditorContext",
            "bridge_contract_version": "v0.1",
            "bridge_result_summary": "Context available",
        }
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_render_material_inspect",
                return_value={
                    "runtime_result": runtime_result,
                    "runner_command": ["Editor.exe"],
                    "manifest": {},
                    "runtime_script": "backend/runtime/editor_scripts/render_material_probe.py",
                },
            ):
                response = dispatcher_service.dispatch(
                    make_render_material_inspect_request(project_root=str(project_root))
                )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "render_material_runtime_probe"
        assert execution.details["runtime_available"] is True
        assert execution.details["material_inspection_attempted"] is True
        assert execution.details["material_evidence_produced"] is True
        assert execution.details["material_readback_available"] is True
        assert execution.details["material_path_resolved"] == str(material_path.resolve())
        assert (
            execution.details["material_path_relative_to_project_root"]
            == "Materials/Example.material"
        )
        assert execution.details["property_values_field_present"] is True
        assert execution.details["property_value_count"] == 2
        assert execution.details["material_runtime_readback_available"] is False
        assert execution.details["shader_data_available"] is False
        assert execution.details["references_available"] is False
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "render_material_runtime_probe"


def test_render_material_inspect_real_persisted_payloads_match_published_schemas() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        material_path = project_root / "Materials" / "Example.material"
        material_path.parent.mkdir(parents=True, exist_ok=True)
        material_path.write_text(
            json.dumps(
                {
                    "materialType": "ReadbackMaterial",
                    "propertyValues": {"roughness": 0.5},
                }
            ),
            encoding="utf-8",
        )
        runtime_result = {
            "ok": True,
            "message": "Material inspection substrate probe completed, but runtime material support remains unavailable in this editor context.",
            "runtime_probe_attempted": True,
            "runtime_probe_method": "editor-runtime-get-context",
            "runtime_available": False,
            "material_inspection_requested": True,
            "material_inspection_attempted": False,
            "material_runtime_mode": "runtime-probe-only",
            "material_operation_available": False,
            "material_evidence_produced": False,
            "material_evidence_path": None,
            "material_unavailable_reason": "No admitted real material inspection path is available in this slice.",
            "material_path": "Materials/Example.material",
            "include_shader_data_requested": True,
            "include_references_requested": True,
            "active_level_path": None,
            "editor_transport": "oneshot",
            "bridge_name": "ControlPlaneEditorBridge",
            "bridge_available": False,
            "bridge_operation": "GetEditorContext",
            "bridge_contract_version": "v0.1",
            "bridge_result_summary": "Runtime unavailable",
        }
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_render_material_inspect",
                return_value={
                    "runtime_result": runtime_result,
                    "runner_command": ["Editor.exe"],
                    "manifest": {},
                    "runtime_script": "backend/runtime/editor_scripts/render_material_probe.py",
                },
            ):
                response = dispatcher_service.dispatch(
                    make_render_material_inspect_request(project_root=str(project_root))
                )

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert artifact is not None
        assert execution.details["material_evidence_produced"] is True
        assert execution.details["runtime_available"] is False
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


def test_render_material_patch_uses_real_preflight_path_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        material_path = project_root / "Materials" / "Example.material"
        material_path.parent.mkdir(parents=True, exist_ok=True)
        material_path.write_text(
            json.dumps(
                {
                    "materialType": "TestMaterial",
                    "propertyValues": {"roughness": 0.5},
                }
            ),
            encoding="utf-8",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_render_material_patch_request(
                    project_root=str(project_root),
                    material_path="Materials/Example.material",
                    property_overrides={"roughness": 0.2},
                    dry_run=True,
                )
            )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "render_material_patch_preflight"
        assert execution.details["material_path"] == str(material_path.resolve())
        assert execution.details["material_path_relative_to_project_root"] == str(
            Path("Materials") / "Example.material"
        )
        assert execution.details["backup_created"] is True
        assert execution.details["mutation_ready"] is True
        assert execution.details["mutation_blocked"] is True
        assert execution.details["mutation_applied"] is False
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_artifact_produced"] is False
        assert execution.details["material_runtime_readback_available"] is False
        assert execution.details["shader_rebuild_available"] is False
        assert execution.details["reference_repair_available"] is False
        persisted_material = json.loads(material_path.read_text(encoding="utf-8"))
        assert persisted_material["propertyValues"]["roughness"] == 0.5
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "render_material_patch_preflight"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="render.material.patch",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="render.material.patch",
                payload=artifact.metadata,
            )
            == []
        )


def test_render_material_patch_uses_real_mutation_path_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        material_path = project_root / "Materials" / "Example.material"
        material_path.parent.mkdir(parents=True, exist_ok=True)
        material_path.write_text(
            json.dumps(
                {
                    "materialType": "TestMaterial",
                    "propertyValues": {"roughness": 0.5},
                }
            ),
            encoding="utf-8",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_render_material_patch_request(
                    project_root=str(project_root),
                    material_path="Materials/Example.material",
                    property_overrides={"roughness": 0.2, "metallic": 1.0},
                    dry_run=False,
                )
            )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "render_material_patch_mutation"
        assert execution.details["mutation_ready"] is True
        assert execution.details["mutation_blocked"] is False
        assert execution.details["mutation_applied"] is True
        assert execution.details["execution_attempted"] is True
        assert execution.details["post_write_verification_attempted"] is True
        assert execution.details["post_write_verification_succeeded"] is True
        assert execution.details["rollback_attempted"] is False
        assert sorted(execution.details["verified_override_keys"]) == [
            "metallic",
            "roughness",
        ]
        persisted_material = json.loads(material_path.read_text(encoding="utf-8"))
        assert persisted_material["propertyValues"]["roughness"] == 0.2
        assert persisted_material["propertyValues"]["metallic"] == 1.0
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "render_material_patch_mutation"
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="render.material.patch",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="render.material.patch",
                payload=artifact.metadata,
            )
            == []
        )


def test_render_material_patch_records_post_patch_shader_preflight_review_when_explicit_targets_are_provided(
) -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        material_path = project_root / "Materials" / "Example.material"
        build_root = project_root / "build"
        shader_path = project_root / "Assets" / "Shaders" / "ExampleShader.shader"
        material_path.parent.mkdir(parents=True, exist_ok=True)
        build_root.mkdir(parents=True, exist_ok=True)
        shader_path.parent.mkdir(parents=True, exist_ok=True)
        material_path.write_text(
            json.dumps(
                {
                    "materialType": "TestMaterial",
                    "propertyValues": {"roughness": 0.5},
                }
            ),
            encoding="utf-8",
        )
        (build_root / "CMakeCache.txt").write_text("PROJECT_NAME=ShaderPatch\n", encoding="utf-8")
        shader_path.write_text("shader-source", encoding="utf-8")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_render_material_patch_request(
                    project_root=str(project_root),
                    material_path="Materials/Example.material",
                    property_overrides={"roughness": 0.2},
                    dry_run=False,
                    shader_targets_for_review=["ExampleShader"],
                )
            )

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "render_material_patch_mutation"
        assert execution.details["mutation_applied"] is True
        assert execution.details["post_patch_shader_preflight_review_requested"] is True
        assert execution.details["post_patch_shader_preflight_review_attempted"] is True
        assert execution.details["post_patch_shader_preflight_review_ready"] is True
        assert execution.details["post_patch_shader_preflight_review_requested_targets"] == [
            "ExampleShader"
        ]
        shader_review = execution.details["post_patch_shader_preflight_review"]
        assert shader_review["inspection_surface"] == "render_shader_rebuild_preflight"
        assert shader_review["configured_build_tree_available"] is True
        assert shader_review["shader_source_candidates_found_for_all_requested_targets"] is True
        assert str(shader_path) in shader_review["resolved_shader_candidate_paths"]
        assert shader_review["execution_attempted"] is False
        assert shader_review["result_artifact_produced"] is False
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["post_patch_shader_preflight_review_attempted"] is True
        assert artifact.metadata["post_patch_shader_preflight_review"]["inspection_surface"] == (
            "render_shader_rebuild_preflight"
        )
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="render.material.patch",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="render.material.patch",
                payload=artifact.metadata,
            )
            == []
        )


def test_render_material_patch_simulated_persisted_payloads_match_published_schemas(
) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_render_material_patch_request())

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
                tool_name="render.material.patch",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="render.material.patch",
                payload=artifact.metadata,
            )
            == []
        )


def test_render_shader_rebuild_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(approve_render_shader_rebuild_request())

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
                tool_name="render.shader.rebuild",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="render.shader.rebuild",
                payload=artifact.metadata,
            )
            == []
        )


def test_render_shader_rebuild_uses_real_preflight_substrate_in_hybrid_mode() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        build_root = project_root / "build"
        build_root.mkdir(parents=True, exist_ok=True)
        (build_root / "CMakeCache.txt").write_text("PROJECT_NAME=ShaderBuild\n", encoding="utf-8")
        shader_path = project_root / "Assets" / "Shaders" / "ExampleShader.shader"
        shader_path.parent.mkdir(parents=True, exist_ok=True)
        shader_path.write_text("shader-source", encoding="utf-8")

        with isolated_database():
            with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
                response = dispatcher_service.dispatch(
                    approve_render_shader_rebuild_request(project_root=str(project_root))
                )
            assert response.ok is True
            assert response.result is not None
            assert response.result.simulated is False
            assert response.result.execution_mode == "real"
            run_id = response.operation_id
            assert run_id is not None
            execution = next(
                execution
                for execution in executions_service.list_executions()
                if execution.run_id == run_id
            )
            artifact = artifacts_service.get_artifact(response.artifacts[0])
            assert execution.details["inspection_surface"] == "render_shader_rebuild_preflight"
            assert execution.details["configured_build_tree_available"] is True
            assert execution.details["shader_source_candidates_found_for_all_requested_targets"] is True
            assert execution.details["execution_attempted"] is False
            assert execution.details["result_artifact_produced"] is False
            assert str(shader_path) in execution.details["resolved_shader_candidate_paths"]
            assert artifact is not None
            assert artifact.simulated is False
            assert artifact.metadata["execution_mode"] == "real"
            assert artifact.metadata["inspection_surface"] == "render_shader_rebuild_preflight"


def test_render_shader_rebuild_real_persisted_payloads_match_published_schemas() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        build_root = project_root / "build"
        build_root.mkdir(parents=True, exist_ok=True)
        (build_root / "CMakeCache.txt").write_text("PROJECT_NAME=ShaderBuild\n", encoding="utf-8")
        shader_path = project_root / "Assets" / "Shaders" / "ExampleShader.shader"
        shader_path.parent.mkdir(parents=True, exist_ok=True)
        shader_path.write_text("shader-source", encoding="utf-8")

        with isolated_database():
            with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
                response = dispatcher_service.dispatch(
                    approve_render_shader_rebuild_request(project_root=str(project_root))
                )
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
            artifact = artifacts_service.get_artifact(response.artifacts[0])
            assert execution.details["inspection_surface"] == "render_shader_rebuild_preflight"
            assert execution.details["simulated"] is False
            assert artifact is not None
            assert artifact.simulated is False
            assert artifact.metadata["execution_mode"] == "real"
            assert artifact.metadata["inspection_surface"] == "render_shader_rebuild_preflight"
            assert (
                schema_validation_service.validate_execution_details(
                    tool_name="render.shader.rebuild",
                    payload=execution.details,
                )
                == []
            )
            assert (
                schema_validation_service.validate_artifact_metadata(
                    tool_name="render.shader.rebuild",
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


def test_render_capture_viewport_uses_real_runtime_probe_substrate_in_hybrid_mode() -> None:
    with isolated_database():
        runtime_result = {
            "ok": True,
            "message": "Viewport capture substrate probe completed against the admitted editor runtime path.",
            "runtime_probe_attempted": True,
            "runtime_probe_method": "editor-runtime-get-context",
            "runtime_available": True,
            "capture_requested": True,
            "capture_attempted": False,
            "capture_runtime_mode": "runtime-probe-only",
            "capture_operation_available": False,
            "capture_artifact_produced": False,
            "capture_artifact_path": None,
            "capture_artifact_content_type": None,
            "capture_artifact_size_bytes": None,
            "capture_unavailable_reason": "No admitted real screenshot production path is available in this slice.",
            "output_label": "baseline-shot",
            "camera_entity_id": "camera-001",
            "requested_resolution": {"width": 1280, "height": 720},
            "active_level_path": "Levels/Main.level",
            "editor_transport": "oneshot",
            "bridge_name": "ControlPlaneEditorBridge",
            "bridge_available": True,
            "bridge_operation": "GetEditorContext",
            "bridge_contract_version": "v0.1",
            "bridge_result_summary": "Context available",
        }
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_render_capture_viewport",
                return_value={
                    "runtime_result": runtime_result,
                    "runner_command": ["Editor.exe"],
                    "manifest": {},
                    "runtime_script": "backend/runtime/editor_scripts/render_capture_probe.py",
                },
            ):
                response = dispatcher_service.dispatch(make_render_capture_viewport_request())

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "render_capture_runtime_probe"
        assert execution.details["runtime_available"] is True
        assert execution.details["capture_attempted"] is False
        assert execution.details["capture_artifact_produced"] is False
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "render_capture_runtime_probe"


def test_render_capture_viewport_real_persisted_payloads_match_published_schemas() -> None:
    with isolated_database():
        runtime_result = {
            "ok": True,
            "message": "Viewport capture substrate probe completed, but runtime capture support remains unavailable in this editor context.",
            "runtime_probe_attempted": True,
            "runtime_probe_method": "editor-runtime-get-context",
            "runtime_available": False,
            "capture_requested": True,
            "capture_attempted": False,
            "capture_runtime_mode": "runtime-probe-only",
            "capture_operation_available": False,
            "capture_artifact_produced": False,
            "capture_artifact_path": None,
            "capture_artifact_content_type": None,
            "capture_artifact_size_bytes": None,
            "capture_unavailable_reason": "No admitted real screenshot production path is available in this slice.",
            "output_label": "baseline-shot",
            "camera_entity_id": "camera-001",
            "requested_resolution": {"width": 1280, "height": 720},
            "active_level_path": None,
            "editor_transport": "oneshot",
            "bridge_name": "ControlPlaneEditorBridge",
            "bridge_available": False,
            "bridge_operation": "GetEditorContext",
            "bridge_contract_version": "v0.1",
            "bridge_result_summary": "Runtime unavailable",
        }
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_render_capture_viewport",
                return_value={
                    "runtime_result": runtime_result,
                    "runner_command": ["Editor.exe"],
                    "manifest": {},
                    "runtime_script": "backend/runtime/editor_scripts/render_capture_probe.py",
                },
            ):
                response = dispatcher_service.dispatch(make_render_capture_viewport_request())

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert artifact is not None
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


def test_test_visual_diff_uses_real_artifact_comparison_substrate_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        root = Path(temp_dir)
        baseline_path = root / "baseline.png"
        candidate_path = root / "candidate.png"
        create_test_image(baseline_path, size=(2, 2), color=(255, 0, 0, 255))
        create_test_image(candidate_path, size=(2, 2), color=(0, 0, 255, 255))

        baseline_artifact_id = create_test_artifact_record(
            path=baseline_path,
            label="Baseline image",
        )
        candidate_artifact_id = create_test_artifact_record(
            path=candidate_path,
            label="Candidate image",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                make_test_visual_diff_request(
                    baseline_artifact_id=baseline_artifact_id,
                    candidate_artifact_id=candidate_artifact_id,
                )
            )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "artifact_file_comparison"
        assert execution.details["comparison_available"] is True
        assert execution.details["comparison_status"] == "different"
        assert execution.details["byte_identical"] is False
        assert execution.details["baseline_image_decodable"] is True
        assert execution.details["baseline_image_width"] == 2
        assert execution.details["baseline_image_height"] == 2
        assert execution.details["baseline_image_mode"] == "RGBA"
        assert execution.details["baseline_image_channel_count"] == 4
        assert execution.details["candidate_image_decodable"] is True
        assert execution.details["candidate_image_width"] == 2
        assert execution.details["candidate_image_height"] == 2
        assert execution.details["candidate_image_mode"] == "RGBA"
        assert execution.details["candidate_image_channel_count"] == 4
        assert execution.details["visual_metric_input_compatible"] is True
        assert execution.details["visual_metric_available"] is True
        assert execution.details["visual_metric_name"] == "exact_rgba_pixel_match_ratio"
        assert execution.details["visual_metric_value"] == 0.0
        assert execution.details["visual_metric_color_space"] == "RGBA"
        assert execution.details["visual_metric_total_pixels"] == 4
        assert execution.details["visual_metric_matching_pixels"] == 0
        assert execution.details["visual_metric_mismatched_pixels"] == 4
        assert execution.details["baseline_artifact_found"] is True
        assert execution.details["candidate_artifact_found"] is True
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "artifact_file_comparison"


def test_test_visual_diff_real_persisted_payloads_match_published_schemas() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        root = Path(temp_dir)
        baseline_path = root / "baseline.png"
        candidate_path = root / "candidate.png"
        create_test_image(baseline_path, size=(1, 1), color=(0, 255, 0, 255))
        create_test_image(candidate_path, size=(1, 1), color=(0, 255, 0, 255))

        baseline_artifact_id = create_test_artifact_record(
            path=baseline_path,
            label="Baseline schema image",
        )
        candidate_artifact_id = create_test_artifact_record(
            path=candidate_path,
            label="Candidate schema image",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                make_test_visual_diff_request(
                    baseline_artifact_id=baseline_artifact_id,
                    candidate_artifact_id=candidate_artifact_id,
                )
            )

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["comparison_status"] == "identical"
        assert execution.details["byte_identical"] is True
        assert execution.details["decoded_image_inputs"] is True
        assert artifact is not None
        assert (
            schema_validation_service.validate_execution_details(
                tool_name="test.visual.diff",
                payload=execution.details,
            )
            == []
        )


def test_test_visual_diff_reports_decode_substrate_unavailable_without_pillow() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        root = Path(temp_dir)
        baseline_path = root / "baseline.png"
        candidate_path = root / "candidate.png"
        baseline_path.write_bytes(b"baseline-bytes")
        candidate_path.write_bytes(b"candidate-bytes")

        baseline_artifact_id = create_test_artifact_record(
            path=baseline_path,
            label="Baseline no pillow image",
        )
        candidate_artifact_id = create_test_artifact_record(
            path=candidate_path,
            label="Candidate no pillow image",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            with patch("app.services.adapters.Image", None):
                response = dispatcher_service.dispatch(
                    make_test_visual_diff_request(
                        baseline_artifact_id=baseline_artifact_id,
                        candidate_artifact_id=candidate_artifact_id,
                    )
                )

        assert response.ok is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["baseline_image_decode_attempted"] is False
        assert execution.details["baseline_image_decode_substrate_available"] is False
        assert execution.details["baseline_image_decode_status"] == (
            "decode-substrate-unavailable"
        )
        assert execution.details["candidate_image_decode_attempted"] is False
        assert execution.details["candidate_image_decode_substrate_available"] is False
        assert execution.details["candidate_image_decode_status"] == (
            "decode-substrate-unavailable"
        )
        assert "Pillow is not installed" in execution.details[
            "baseline_image_decode_unavailable_reason"
        ]
        assert "baseline_image_decode" in execution.details["unavailable_evidence"]
        assert "candidate_image_decode" in execution.details["unavailable_evidence"]
        assert execution.details["comparison_available"] is True
        assert execution.details["visual_metric_available"] is False


def test_test_visual_diff_reports_decode_unavailable_for_non_image_inputs() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        root = Path(temp_dir)
        baseline_path = root / "baseline.png"
        candidate_path = root / "candidate.txt"
        create_test_image(baseline_path, size=(1, 2), color=(255, 255, 0, 255))
        candidate_path.write_text("not an image", encoding="utf-8")

        baseline_artifact_id = create_test_artifact_record(
            path=baseline_path,
            label="Baseline decode image",
        )
        candidate_artifact_id = create_test_artifact_record(
            path=candidate_path,
            label="Candidate decode text",
            content_type="text/plain",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                make_test_visual_diff_request(
                    baseline_artifact_id=baseline_artifact_id,
                    candidate_artifact_id=candidate_artifact_id,
                )
            )

        assert response.ok is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["baseline_image_decodable"] is True
        assert execution.details["candidate_image_decodable"] is False
        assert execution.details["candidate_image_decode_attempted"] is True
        assert execution.details["candidate_image_decode_status"] == "unsupported-or-not-image"
        assert execution.details["candidate_image_decode_unavailable_reason"]
        assert "candidate_image_decode" in execution.details["unavailable_evidence"]
        assert artifact is not None
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="test.visual.diff",
                payload=artifact.metadata,
            )
            == []
        )


def test_test_visual_diff_reports_metric_unavailable_for_dimension_mismatch() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        root = Path(temp_dir)
        baseline_path = root / "baseline.png"
        candidate_path = root / "candidate.png"
        create_test_image(baseline_path, size=(2, 2), color=(255, 255, 255, 255))
        create_test_image(candidate_path, size=(3, 1), color=(255, 255, 255, 255))

        baseline_artifact_id = create_test_artifact_record(
            path=baseline_path,
            label="Baseline metric mismatch image",
        )
        candidate_artifact_id = create_test_artifact_record(
            path=candidate_path,
            label="Candidate metric mismatch image",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                make_test_visual_diff_request(
                    baseline_artifact_id=baseline_artifact_id,
                    candidate_artifact_id=candidate_artifact_id,
                )
            )

        assert response.ok is True
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        assert execution.details["baseline_image_decodable"] is True
        assert execution.details["candidate_image_decodable"] is True
        assert execution.details["visual_metric_input_compatible"] is False
        assert execution.details["visual_metric_available"] is False
        assert execution.details["visual_metric_name"] is None
        assert execution.details["visual_metric_value"] is None
        assert "same dimensions" in execution.details["visual_metric_unavailable_reason"]


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


def test_test_run_editor_python_uses_real_preflight_substrate_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        runner_path = project_root / "EditorPythonRunner.exe"
        runner_path.write_bytes(b"editor-python-runner")

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_PROJECT_ROOT": str(project_root),
                "O3DE_EDITOR_SCRIPT_RUNNER": str(runner_path),
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.o3de_target_service.get_bridge_status",
                return_value=type(
                    "BridgeStatus",
                    (),
                    {
                        "configured": True,
                        "project_root": str(project_root),
                        "heartbeat_fresh": True,
                        "heartbeat_path": str(project_root / "user" / "ControlPlaneBridge" / "heartbeat" / "status.json"),
                        "runner_process_active": False,
                    },
                )(),
            ):
                response = dispatcher_service.dispatch(
                    approve_test_run_editor_python_request(project_root=str(project_root))
                )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "editor_python_runner_preflight"
        assert execution.details["preflight_execution_mode"] == "plan-only"
        assert execution.details["runner_runtime_available"] is True
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_artifact_produced"] is False
        assert execution.details["runtime_runner_exists"] is True
        assert execution.details["runtime_runner_path"] == str(runner_path.resolve())
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "editor_python_runner_preflight"


def test_test_run_editor_python_real_persisted_payloads_match_published_schemas() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        runner_path = project_root / "EditorPythonRunner.exe"
        runner_path.write_bytes(b"editor-python-runner-schema")

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_PROJECT_ROOT": str(project_root),
                "O3DE_EDITOR_SCRIPT_RUNNER": str(runner_path),
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.o3de_target_service.get_bridge_status",
                return_value=type(
                    "BridgeStatus",
                    (),
                    {
                        "configured": False,
                        "project_root": None,
                        "heartbeat_fresh": False,
                        "heartbeat_path": None,
                        "runner_process_active": False,
                    },
                )(),
            ):
                response = dispatcher_service.dispatch(
                    approve_test_run_editor_python_request(project_root=str(project_root))
                )

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_status"] == "not-attempted"
        assert artifact is not None
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


def test_test_run_gtest_uses_real_preflight_substrate_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        runner_path = (
            project_root / "build" / "windows" / "bin" / "profile" / "AzCoreTests.exe"
        )
        runner_path.parent.mkdir(parents=True, exist_ok=True)
        runner_path.write_bytes(b"gtest-runner")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_test_run_gtest_request(project_root=str(project_root))
            )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "gtest_runner_preflight"
        assert execution.details["preflight_execution_mode"] == "plan-only"
        assert execution.details["runner_runtime_available"] is True
        assert execution.details["target_resolution_complete"] is True
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_artifact_produced"] is False
        assert execution.details["exit_code_available"] is False
        assert str(runner_path) in execution.details["resolved_runner_paths"]
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "gtest_runner_preflight"


def test_test_run_gtest_real_persisted_payloads_match_published_schemas() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        runner_path = (
            project_root / "build" / "linux" / "bin" / "profile" / "AzCoreTests"
        )
        runner_path.parent.mkdir(parents=True, exist_ok=True)
        runner_path.write_bytes(b"gtest-runner-schema")

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                approve_test_run_gtest_request(project_root=str(project_root))
            )

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["runner_runtime_available"] is True
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_status"] == "not-attempted"
        assert artifact is not None
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


def test_test_tiaf_sequence_uses_real_preflight_substrate_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_PROJECT_ROOT": str(project_root),
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.o3de_target_service.get_bridge_status",
                return_value=type(
                    "BridgeStatus",
                    (),
                    {
                        "configured": True,
                        "project_root": str(project_root),
                        "heartbeat_fresh": True,
                        "heartbeat_path": str(
                            project_root / "user" / "ControlPlaneBridge" / "heartbeat" / "status.json"
                        ),
                        "runner_process_active": False,
                    },
                )(),
            ):
                response = dispatcher_service.dispatch(
                    approve_test_tiaf_sequence_request(project_root=str(project_root))
                )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        run_id = response.operation_id
        assert run_id is not None
        execution = next(
            execution
            for execution in executions_service.list_executions()
            if execution.run_id == run_id
        )
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "tiaf_runner_preflight"
        assert execution.details["preflight_execution_mode"] == "plan-only"
        assert execution.details["runner_runtime_available"] is True
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_artifact_produced"] is False
        assert execution.details["sequence_name"] == "smoke-sequence"
        assert execution.details["requested_platforms"] == ["windows"]
        assert artifact is not None
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["inspection_surface"] == "tiaf_runner_preflight"


def test_test_tiaf_sequence_real_persisted_payloads_match_published_schemas() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
                "O3DE_TARGET_PROJECT_ROOT": str(project_root),
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.o3de_target_service.get_bridge_status",
                return_value=type(
                    "BridgeStatus",
                    (),
                    {
                        "configured": False,
                        "project_root": None,
                        "heartbeat_fresh": False,
                        "heartbeat_path": None,
                        "runner_process_active": False,
                    },
                )(),
            ):
                response = dispatcher_service.dispatch(
                    approve_test_tiaf_sequence_request(project_root=str(project_root))
                )

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
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["execution_attempted"] is False
        assert execution.details["result_status"] == "not-attempted"
        assert artifact is not None
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


def test_editor_component_find_simulated_persisted_payloads_match_published_schemas() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(make_editor_component_find_request())

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
                tool_name="editor.component.find",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="editor.component.find",
                payload=artifact.metadata,
            )
            == []
        )


def test_editor_component_property_get_simulated_persisted_payloads_match_published_schemas(
    ) -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(make_editor_component_property_get_request())

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
                tool_name="editor.component.property.get",
                payload=execution.details,
            )
            == []
        )
        assert (
            schema_validation_service.validate_artifact_metadata(
                tool_name="editor.component.property.get",
                payload=artifact.metadata,
            )
            == []
        )
