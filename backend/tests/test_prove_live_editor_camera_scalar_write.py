from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
PROOF_HELPER_PATH = (
    REPO_ROOT / "backend" / "runtime" / "prove_live_editor_camera_scalar_write.py"
)


def load_proof_module():
    runtime_dir = str(PROOF_HELPER_PATH.parent)
    if runtime_dir not in sys.path:
        sys.path.insert(0, runtime_dir)
    spec = importlib.util.spec_from_file_location(
        "prove_live_editor_camera_scalar_write",
        PROOF_HELPER_PATH,
    )
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def readback_payload(component_id: str, value: bool) -> dict:
    return {
        "runtime_result": {
            "ok": True,
            "component_id": component_id,
            "property_path": (
                "Controller|Configuration|Make active camera on activation?"
            ),
            "value": value,
            "value_type": "bool",
            "bridge_command_id": f"bridge-read-{value}",
        }
    }


def write_payload(
    *,
    component_id: str,
    previous_value: bool,
    requested_value: bool,
    write_admission: bool = False,
) -> dict:
    return {
        "runtime_result": {
            "ok": True,
            "proof_only": True,
            "public_admission": False,
            "write_admission": write_admission,
            "property_list_admission": False,
            "bridge_operation": "editor.camera.scalar.write.proof",
            "component_name": "Camera",
            "component_id": component_id,
            "component_id_provenance": "admitted_runtime_component_add_result",
            "property_path": (
                "Controller|Configuration|Make active camera on activation?"
            ),
            "previous_value": previous_value,
            "requested_value": requested_value,
            "value": requested_value,
            "value_type": "bool",
            "write_verified": True,
            "bridge_command_id": f"bridge-write-{requested_value}",
        }
    }


def runtime_steps(*, cleanup_succeeded: bool = True) -> dict:
    component_id = "EntityComponentIdPair(EntityId(101), 201)"
    return {
        "target_info": {
            "selected": {
                "entity_id": "101",
                "entity_name": "CodexCameraScalarWriteProofEntity_test",
                "component": "Camera",
                "component_id": component_id,
                "component_id_provenance": "admitted_runtime_component_add_result",
            }
        },
        "before_get": readback_payload(component_id, False),
        "write_inverse": write_payload(
            component_id=component_id,
            previous_value=False,
            requested_value=True,
        ),
        "after_get": readback_payload(component_id, True),
        "restore_value": write_payload(
            component_id=component_id,
            previous_value=True,
            requested_value=False,
        ),
        "restored_get": readback_payload(component_id, False),
        "cleanup_restore": {
            "restore_invoked": True,
            "restore_succeeded": cleanup_succeeded,
            "restore_result": (
                "restored_and_verified"
                if cleanup_succeeded
                else "restore_verification_failed"
            ),
            "restore_boundary_id": "restore-boundary-1",
            "restore_boundary_scope": "loaded_level_prefab_file",
            "restore_strategy": "filesystem_prefab_restore_from_backup",
        },
    }


def test_live_control_scripts_expose_camera_scalar_write_proof_command() -> None:
    live_control = REPO_ROOT / "backend" / "runtime" / "live_verify_control.ps1"
    dev_script = REPO_ROOT / "scripts" / "dev.ps1"
    gitignore = REPO_ROOT / ".gitignore"
    bridge_setup = REPO_ROOT / "scripts" / "setup_control_plane_editor_bridge.ps1"

    assert "prove_live_editor_camera_scalar_write.py" in live_control.read_text(
        encoding="utf-8"
    )
    assert '"camera-scalar-write-proof"' in live_control.read_text(encoding="utf-8")
    assert "live-camera-scalar-write-proof" in dev_script.read_text(encoding="utf-8")
    assert "live_editor_camera_scalar_write_proof_*.json" in gitignore.read_text(
        encoding="utf-8"
    )
    bridge_text = bridge_setup.read_text(encoding="utf-8")
    assert "editor.camera.scalar.write.proof" in bridge_text
    assert "Controller|Configuration|Make active camera on activation?" in bridge_text
    assert "EditorComponentAPIBus.SetComponentProperty" in bridge_text
    assert "editor.component.property.write" not in bridge_text
    assert "PropertyTreeEditor.set_value" not in bridge_text


def test_allowed_target_requires_exact_camera_bool_path_and_live_add_provenance() -> None:
    module = load_proof_module()

    allowed = module.require_allowed_camera_write_target(
        component_name="Camera",
        property_path="Controller|Configuration|Make active camera on activation?",
        value=True,
        component_id_provenance="admitted_runtime_component_add_result",
        restore_boundary_id="restore-boundary-1",
    )

    assert allowed["component_name"] == "Camera"
    assert allowed["property_path"] == (
        "Controller|Configuration|Make active camera on activation?"
    )
    assert allowed["value_type"] == "bool"


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"component_name": "Mesh"}, "Camera component"),
        ({"property_path": "Controller|Configuration|Field of view"}, "selected"),
        ({"value": "true"}, "bool"),
        ({"component_id_provenance": "prefab_json"}, "component-add provenance"),
        ({"restore_boundary_id": ""}, "restore boundary"),
    ],
)
def test_allowed_target_rejects_arbitrary_components_paths_and_values(
    overrides: dict,
    message: str,
) -> None:
    module = load_proof_module()
    kwargs = {
        "component_name": "Camera",
        "property_path": "Controller|Configuration|Make active camera on activation?",
        "value": True,
        "component_id_provenance": "admitted_runtime_component_add_result",
        "restore_boundary_id": "restore-boundary-1",
        **overrides,
    }

    with pytest.raises(module.CameraScalarWriteProofError, match=message):
        module.require_allowed_camera_write_target(**kwargs)


def test_adapters_boundary_rejects_public_property_write_or_proof_exposure() -> None:
    module = load_proof_module()

    with pytest.raises(module.CameraScalarWriteProofError, match="exposes"):
        module.require_adapters_boundary(
            {
                "adapters": {
                    "configured_mode": "hybrid",
                    "active_mode": "hybrid",
                    "real_tool_paths": [
                        "editor.session.open",
                        "editor.level.open",
                        "editor.component.property.write",
                    ],
                }
            }
        )

    with pytest.raises(module.CameraScalarWriteProofError, match="exposes"):
        module.require_adapters_boundary(
            {
                "adapters": {
                    "configured_mode": "hybrid",
                    "active_mode": "hybrid",
                    "real_tool_paths": [
                        "editor.session.open",
                        "editor.level.open",
                        "editor.camera.scalar.write.proof",
                    ],
                }
            }
        )


def test_success_summary_captures_before_write_after_restore_evidence() -> None:
    module = load_proof_module()

    summary = module.build_success_summary(
        safe_level_info={"selected_level_path": "Levels/TestLoevel01"},
        runtime_steps=runtime_steps(),
        adapters_boundary={"active_mode": "hybrid", "configured_mode": "hybrid"},
    )

    assert summary["succeeded"] is True
    assert summary["status"] == "succeeded_verified"
    assert summary["component_name"] == "Camera"
    assert summary["property_path"] == (
        "Controller|Configuration|Make active camera on activation?"
    )
    assert summary["original_value"] is False
    assert summary["attempted_value"] is True
    assert summary["changed_value"] is True
    assert summary["restored_value"] is False
    assert summary["value_restore_succeeded"] is True
    assert summary["loaded_level_cleanup_restore_succeeded"] is True
    assert summary["write_admission"] is False
    assert summary["property_list_admission"] is False
    assert summary["public_admission"] is False


def test_restore_failure_prevents_success_even_after_value_restore() -> None:
    module = load_proof_module()

    summary = module.build_success_summary(
        safe_level_info={"selected_level_path": "Levels/TestLoevel01"},
        runtime_steps=runtime_steps(cleanup_succeeded=False),
        adapters_boundary={"active_mode": "hybrid", "configured_mode": "hybrid"},
    )

    assert summary["succeeded"] is False
    assert summary["status"] == "loaded_level_cleanup_restore_failed"
    assert summary["value_restore_succeeded"] is True
    assert summary["loaded_level_cleanup_restore_succeeded"] is False


def test_write_review_rejects_any_write_or_property_list_admission_flag() -> None:
    module = load_proof_module()
    component_id = "EntityComponentIdPair(EntityId(101), 201)"

    with pytest.raises(module.CameraScalarWriteProofError, match="admitted"):
        module.require_camera_write_result(
            write_payload(
                component_id=component_id,
                previous_value=False,
                requested_value=True,
                write_admission=True,
            ),
            component_id=component_id,
            expected_previous_value=False,
            expected_value=True,
            label="write_inverse",
        )
