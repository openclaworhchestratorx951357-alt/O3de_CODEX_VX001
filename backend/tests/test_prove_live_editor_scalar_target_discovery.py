from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
PROOF_HELPER_PATH = (
    REPO_ROOT / "backend" / "runtime" / "prove_live_editor_scalar_target_discovery.py"
)


def load_proof_module():
    runtime_dir = str(PROOF_HELPER_PATH.parent)
    if runtime_dir not in sys.path:
        sys.path.insert(0, runtime_dir)
    spec = importlib.util.spec_from_file_location(
        "prove_live_editor_scalar_target_discovery",
        PROOF_HELPER_PATH,
    )
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def target_info(component_name: str = "Camera") -> dict:
    return {
        "selected": {
            "component": component_name,
            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
            "component_id_provenance": "admitted_runtime_component_add_result",
            "entity_id": "101",
            "entity_name": f"{component_name}ProofEntity",
        }
    }


def discovery(selected_candidate: dict | None, blocker: str | None = None) -> dict:
    return {
        "scalar_target_discovery": {
            "set_component_property_attempted": False,
            "write_target_admitted": False,
            "write_admission": False,
            "property_list_admission": False,
            "selected_candidate": selected_candidate,
            "blocker_code": blocker,
        }
    }


def selected_candidate(
    *,
    property_path: str = "Controller|Configuration|Field of view",
    source: str = "PropertyTreeEditor.build_paths_list_with_types",
    value=True,
    value_type: str = "bool",
) -> dict:
    use_tree = source.startswith("PropertyTreeEditor")
    return {
        "component_name": "Camera",
        "property_path": property_path,
        "property_path_kind": "named_component_property",
        "source": source,
        "discovery_method": source,
        "success": True,
        "value": value,
        "value_type": value_type,
        "value_type_hint": value_type,
        "runtime_value_type": type(value).__name__,
        "runtime_value_shape": "scalar",
        "value_preview": str(value),
        "scalar_or_text_like": True,
        "get_component_property_attempted": not use_tree,
        "property_tree_get_value_attempted": use_tree,
        "set_component_property_attempted": False,
        "target_status": "readback_only_candidate",
        "write_admission": False,
        "property_list_admission": False,
    }


def test_live_control_scripts_expose_scalar_target_discovery_command() -> None:
    live_control = REPO_ROOT / "backend" / "runtime" / "live_verify_control.ps1"
    dev_script = REPO_ROOT / "scripts" / "dev.ps1"
    gitignore = REPO_ROOT / ".gitignore"
    bridge_setup = REPO_ROOT / "scripts" / "setup_control_plane_editor_bridge.ps1"

    assert "prove_live_editor_scalar_target_discovery.py" in live_control.read_text(
        encoding="utf-8"
    )
    assert '"scalar-target-discovery-proof"' in live_control.read_text(encoding="utf-8")
    assert "live-scalar-target-discovery-proof" in dev_script.read_text(
        encoding="utf-8"
    )
    assert "live_editor_scalar_target_discovery_proof_*.json" in gitignore.read_text(
        encoding="utf-8"
    )
    bridge_text = bridge_setup.read_text(encoding="utf-8")
    assert "include_scalar_target_discovery" in bridge_text
    assert "PropertyTreeEditor.get_value" in bridge_text
    assert "SetComponentProperty" not in bridge_text
    assert "set_value" not in bridge_text


def test_probe_plan_uses_allowlisted_camera_and_comment_but_excludes_mesh() -> None:
    module = load_proof_module()

    plan = module.component_probe_plan()

    assert plan["candidate_components"] == ["Camera", "Comment"]
    excluded = {item["component_name"]: item["reason"] for item in plan["excluded_components"]}
    assert "Mesh" in excluded
    assert "render-adjacent" in excluded["Mesh"]


def test_comment_root_xyzw_result_is_rejected_as_non_scalar() -> None:
    module = load_proof_module()

    assert module._value_shape({"x": 1, "y": 2, "z": 3, "w": 4}) == "xyzw_object"
    assert (
        module._value_is_scalar_or_text_like(
            {"x": 1, "y": 2, "z": 3, "w": 4},
            "AZStd::string",
        )
        is False
    )


def test_empty_path_is_not_selected_as_first_write_candidate() -> None:
    module = load_proof_module()

    with pytest.raises(module.ScalarTargetDiscoveryProofError, match="empty/root"):
        module.review_component_scalar_discovery_result(
            discovery(
                selected_candidate(
                    property_path="",
                    value="comment text",
                    value_type="AZStd::string",
                )
            ),
            target_info=target_info("Comment"),
            component_name="Comment",
        )


def test_named_string_path_with_successful_readback_is_selected() -> None:
    module = load_proof_module()

    review = module.review_component_scalar_discovery_result(
        discovery(
            selected_candidate(
                property_path="Controller|Configuration|Display name",
                value="safe label",
                value_type="AZStd::string",
            )
        ),
        target_info=target_info(),
        component_name="Camera",
    )

    assert review["status"] == "candidate_selected_readback_only"
    assert review["selected_candidate"]["property_path"] == (
        "Controller|Configuration|Display name"
    )
    assert review["selected_candidate"]["target_status"] == "readback_only_candidate"
    assert review["write_admission"] is False
    assert review["property_list_admission"] is False


@pytest.mark.parametrize(
    ("value", "value_type"),
    [
        (True, "bool"),
        (12, "int"),
        (75.0, "float"),
    ],
)
def test_named_scalar_paths_with_successful_readback_are_selected(
    value: bool | int | float,
    value_type: str,
) -> None:
    module = load_proof_module()

    review = module.review_component_scalar_discovery_result(
        discovery(selected_candidate(value=value, value_type=value_type)),
        target_info=target_info(),
        component_name="Camera",
    )

    assert review["target_selected"] is True
    assert review["selected_candidate"]["property_path_kind"] == (
        "named_component_property"
    )
    assert review["selected_candidate"]["write_admission"] is False


@pytest.mark.parametrize(
    "property_path",
    [
        "Controller|Configuration|Model Asset",
        "Controller|Configuration|Target texture",
        "Controller|Configuration|Pipeline template",
        "Controller|Configuration|Transform",
    ],
)
def test_asset_material_render_and_transform_paths_are_rejected(
    property_path: str,
) -> None:
    module = load_proof_module()

    with pytest.raises(module.ScalarTargetDiscoveryProofError, match="out-of-scope"):
        module.review_component_scalar_discovery_result(
            discovery(
                selected_candidate(
                    property_path=property_path,
                    value="unsafe",
                    value_type="AZStd::string",
                )
            ),
            target_info=target_info(),
            component_name="Camera",
        )


def test_vector_color_or_container_shaped_values_are_rejected() -> None:
    module = load_proof_module()
    candidate = selected_candidate(
        value={"x": 1, "y": 2, "z": 3, "w": 4},
        value_type="AZStd::string",
    )
    candidate["runtime_value_shape"] = "xyzw_object"

    with pytest.raises(module.ScalarTargetDiscoveryProofError, match="non-scalar"):
        module.review_component_scalar_discovery_result(
            discovery(candidate),
            target_info=target_info(),
            component_name="Camera",
        )

    assert module._value_shape([1, 2, 3]) == "list"
    assert module._value_is_scalar_or_text_like([1, 2, 3], "list") is False


def test_per_component_blockers_are_recorded() -> None:
    module = load_proof_module()

    summary = module.build_success_summary(
        safe_level_info={"selected_level_path": "Levels/TestLoevel01"},
        adapters_boundary={"active_mode": "hybrid", "configured_mode": "hybrid"},
        component_results=[
            {
                "component_name": "Camera",
                "status": "blocked",
                "blocker_code": "camera_scalar_candidate_not_found",
                "restore_succeeded": True,
            },
            {
                "component_name": "Comment",
                "status": "blocked",
                "blocker_code": "comment_root_string_readback_failed",
                "restore_succeeded": True,
            },
        ],
        excluded_components=[],
    )

    assert summary["status"] == "blocked"
    assert summary["blocker_code"] == "scalar_candidate_not_found"
    assert summary["component_blockers"] == {
        "Camera": "camera_scalar_candidate_not_found",
        "Comment": "comment_root_string_readback_failed",
    }
    assert summary["property_list_admission"] is False
    assert summary["write_admission"] is False


def test_no_write_admission_fields_are_accepted_as_true() -> None:
    module = load_proof_module()
    payload = discovery(None)
    payload["scalar_target_discovery"]["write_admission"] = True

    with pytest.raises(module.ScalarTargetDiscoveryProofError, match="write"):
        module.review_component_scalar_discovery_result(
            payload,
            target_info=target_info(),
            component_name="Camera",
        )


def test_restore_failure_prevents_candidate_success() -> None:
    module = load_proof_module()

    summary = module.build_success_summary(
        safe_level_info={"selected_level_path": "Levels/TestLoevel01"},
        adapters_boundary={"active_mode": "hybrid", "configured_mode": "hybrid"},
        component_results=[
            {
                "component_name": "Camera",
                "status": "candidate_selected_readback_only",
                "selected_candidate": {"property_path": "Controller|Configuration|Field of view"},
                "restore_succeeded": False,
            }
        ],
        excluded_components=[],
    )

    assert summary["succeeded"] is False
    assert summary["status"] == "candidate_selected_readback_only"
    assert summary["restore_or_cleanup_verified"] is False
    assert summary["restore_status"] == "restore_not_verified"
