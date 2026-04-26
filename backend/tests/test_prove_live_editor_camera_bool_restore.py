from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
PROOF_HELPER_PATH = (
    REPO_ROOT / "backend" / "runtime" / "prove_live_editor_camera_bool_restore.py"
)


def load_proof_module():
    runtime_dir = str(PROOF_HELPER_PATH.parent)
    if runtime_dir not in sys.path:
        sys.path.insert(0, runtime_dir)
    spec = importlib.util.spec_from_file_location(
        "prove_live_editor_camera_bool_restore",
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
) -> dict:
    return {
        "runtime_result": {
            "ok": True,
            "proof_only": True,
            "public_admission": False,
            "write_admission": False,
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


def runtime_steps(
    *,
    cleanup_succeeded: bool = True,
    restored_value: bool = False,
) -> dict:
    component_id = "EntityComponentIdPair(EntityId(101), 201)"
    return {
        "target_info": {
            "selected": {
                "entity_id": "101",
                "entity_name": "CodexCameraBoolRestoreProofEntity_test",
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
        "restored_get": readback_payload(component_id, restored_value),
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


def test_live_control_scripts_expose_camera_bool_restore_proof_command() -> None:
    live_control = REPO_ROOT / "backend" / "runtime" / "live_verify_control.ps1"
    dev_script = REPO_ROOT / "scripts" / "dev.ps1"
    gitignore = REPO_ROOT / ".gitignore"

    live_control_text = live_control.read_text(encoding="utf-8")
    dev_script_text = dev_script.read_text(encoding="utf-8")

    assert "prove_live_editor_camera_bool_restore.py" in live_control_text
    assert '"camera-bool-restore-proof"' in live_control_text
    assert "live-camera-bool-restore-proof" in dev_script_text
    assert "live_editor_camera_bool_restore_proof_*.json" in gitignore.read_text(
        encoding="utf-8"
    )


def test_allowed_restore_target_requires_exact_camera_bool_before_value() -> None:
    module = load_proof_module()

    allowed = module.require_allowed_camera_restore_target(
        component_name="Camera",
        property_path="Controller|Configuration|Make active camera on activation?",
        before_value=True,
        restore_value=True,
        component_id_provenance="admitted_runtime_component_add_result",
        restore_boundary_id="restore-boundary-1",
    )

    assert allowed["component_name"] == "Camera"
    assert allowed["property_path"] == (
        "Controller|Configuration|Make active camera on activation?"
    )
    assert allowed["restore_value"] is True
    assert allowed["value_type"] == "bool"


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"component_name": "Mesh"}, "Camera component"),
        ({"property_path": "Controller|Configuration|Field of view"}, "selected"),
        ({"before_value": None}, "before-value evidence"),
        ({"restore_value": "true"}, "bool restore values"),
        ({"restore_value": False}, "previously observed"),
        ({"component_id_provenance": "prefab_json"}, "component-add provenance"),
        ({"restore_boundary_id": ""}, "restore boundary"),
    ],
)
def test_allowed_restore_target_rejects_generic_or_unproven_restore(
    overrides: dict,
    message: str,
) -> None:
    module = load_proof_module()
    kwargs = {
        "component_name": "Camera",
        "property_path": "Controller|Configuration|Make active camera on activation?",
        "before_value": True,
        "restore_value": True,
        "component_id_provenance": "admitted_runtime_component_add_result",
        "restore_boundary_id": "restore-boundary-1",
        **overrides,
    }

    with pytest.raises(module.CameraBoolRestoreProofError, match=message):
        module.require_allowed_camera_restore_target(**kwargs)


@pytest.mark.parametrize(
    "exposed_path",
    [
        "editor.component.property.list",
        "editor.component.property.write",
        "editor.component.property.restore",
        "editor.component.property.restore.camera_bool_make_active_on_activation",
        "editor.camera.bool.restore.proof",
    ],
)
def test_adapters_boundary_rejects_public_list_write_or_restore_exposure(
    exposed_path: str,
) -> None:
    module = load_proof_module()

    with pytest.raises(module.CameraBoolRestoreProofError, match="exposes"):
        module.require_adapters_boundary(
            {
                "adapters": {
                    "configured_mode": "hybrid",
                    "active_mode": "hybrid",
                    "real_tool_paths": [
                        "editor.session.open",
                        "editor.level.open",
                        exposed_path,
                    ],
                }
            }
        )


def test_success_summary_captures_reverse_write_restore_evidence() -> None:
    module = load_proof_module()

    summary = module.build_success_summary(
        safe_level_info={"selected_level_path": "Levels/TestLoevel01"},
        runtime_steps=runtime_steps(),
        adapters_boundary={"active_mode": "hybrid", "configured_mode": "hybrid"},
    )

    assert summary["succeeded"] is True
    assert summary["status"] == "restore_succeeded_verified"
    assert summary["component_name"] == "Camera"
    assert summary["property_path"] == (
        "Controller|Configuration|Make active camera on activation?"
    )
    assert summary["before_value"] is False
    assert summary["changed_value"] is True
    assert summary["restore_value"] is False
    assert summary["restored_readback"] is False
    assert summary["verification_status"] == "restored_readback_verified"
    assert summary["write_occurred"] is True
    assert summary["restore_occurred"] is True
    assert summary["generalized_undo_available"] is False
    assert summary["write_admission"] is False
    assert summary["restore_admission"] is False
    assert summary["public_restore_capability_admitted"] is False
    assert summary["property_list_admission"] is False
    assert summary["public_admission"] is False


def test_loaded_level_restore_failure_prevents_success() -> None:
    module = load_proof_module()

    summary = module.build_success_summary(
        safe_level_info={"selected_level_path": "Levels/TestLoevel01"},
        runtime_steps=runtime_steps(cleanup_succeeded=False),
        adapters_boundary={"active_mode": "hybrid", "configured_mode": "hybrid"},
    )

    assert summary["succeeded"] is False
    assert summary["status"] == "restore_postcondition_failed"
    assert summary["verification_status"] == "restored_readback_verified"
    assert summary["loaded_level_cleanup_restore_succeeded"] is False


def test_restored_readback_mismatch_prevents_success_summary() -> None:
    module = load_proof_module()

    with pytest.raises(module.camera_write.CameraScalarWriteProofError, match="expected bool"):
        module.build_success_summary(
            safe_level_info={"selected_level_path": "Levels/TestLoevel01"},
            runtime_steps=runtime_steps(restored_value=True),
            adapters_boundary={"active_mode": "hybrid", "configured_mode": "hybrid"},
        )


def test_public_restore_capability_remains_unadmitted_in_public_surfaces() -> None:
    capability = "editor.component.property.restore.camera_bool_make_active_on_activation"
    public_surface_files = [
        REPO_ROOT / "backend" / "app" / "services" / "capability_registry.py",
        REPO_ROOT / "backend" / "app" / "services" / "catalog.py",
        REPO_ROOT / "backend" / "app" / "api" / "routes" / "adapters.py",
        REPO_ROOT / "backend" / "app" / "services" / "prompt_orchestrator.py",
    ]

    for path in public_surface_files:
        assert capability not in path.read_text(encoding="utf-8")
