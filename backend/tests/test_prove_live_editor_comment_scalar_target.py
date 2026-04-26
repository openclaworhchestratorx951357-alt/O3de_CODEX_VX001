from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
PROOF_HELPER_PATH = (
    REPO_ROOT / "backend" / "runtime" / "prove_live_editor_comment_scalar_target.py"
)


def load_proof_module():
    runtime_dir = str(PROOF_HELPER_PATH.parent)
    if runtime_dir not in sys.path:
        sys.path.insert(0, runtime_dir)
    spec = importlib.util.spec_from_file_location(
        "prove_live_editor_comment_scalar_target",
        PROOF_HELPER_PATH,
    )
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_live_control_scripts_expose_comment_scalar_target_proof_command() -> None:
    live_control = REPO_ROOT / "backend" / "runtime" / "live_verify_control.ps1"
    dev_script = REPO_ROOT / "scripts" / "dev.ps1"
    gitignore = REPO_ROOT / ".gitignore"
    bridge_setup = REPO_ROOT / "scripts" / "setup_control_plane_editor_bridge.ps1"

    assert "prove_live_editor_comment_scalar_target.py" in live_control.read_text(
        encoding="utf-8"
    )
    assert '"comment-scalar-target-proof"' in live_control.read_text(encoding="utf-8")
    assert "live-comment-scalar-target-proof" in dev_script.read_text(encoding="utf-8")
    assert "live_editor_comment_scalar_target_proof_*.json" in gitignore.read_text(
        encoding="utf-8"
    )
    bridge_text = bridge_setup.read_text(encoding="utf-8")
    assert "BuildComponentPropertyTreeEditor" in bridge_text
    assert "PropertyTreeEditor.build_paths_list_with_types" in bridge_text
    assert 'property_tree.get_value("")' in bridge_text
    assert "editor.component.property.write" not in bridge_text
    assert "editor.camera.scalar.write.proof" in bridge_text
    assert "set_value" not in bridge_text


def test_classify_comment_property_paths_selects_text_like_readback_candidate() -> None:
    module = load_proof_module()

    review = module.classify_comment_property_paths(
        [
            "Controller",
            "Controller|Configuration|Comment",
            "Controller|Configuration|Mesh Asset",
            "Controller|Configuration|Render Flag",
        ]
    )

    assert review["target_selected"] is True
    assert review["selected_property_path"] == "Controller|Configuration|Comment"
    assert review["write_target_admitted"] is False
    path_classes = {
        item["property_path"]: item["evidence_class"]
        for item in review["reviewed_paths"]
    }
    assert path_classes["Controller"] == "container_or_group"
    assert path_classes["Controller|Configuration|Comment"] == (
        "preferred_text_like_candidate"
    )
    assert path_classes["Controller|Configuration|Mesh Asset"] == (
        "out_of_scope_property_path"
    )


def test_classify_comment_property_paths_blocks_when_no_scalar_candidate() -> None:
    module = load_proof_module()

    review = module.classify_comment_property_paths(
        [
            "Controller",
            "Controller|Configuration",
            "Controller|Configuration|Render Flag",
            "Controller|Configuration|Mesh Asset",
        ]
    )

    assert review["target_selected"] is False
    assert review["blocker_code"] == "comment_scalar_target_unavailable"
    assert review["write_target_admitted"] is False


def test_typed_path_parsing_extracts_clean_path_and_type_hint() -> None:
    module = load_proof_module()

    parsed = module.split_typed_property_path_entry(
        "Configuration|Comment (AZStd::string)"
    )

    assert parsed["path"] == "Configuration|Comment"
    assert parsed["value_type_hint"] == "AZStd::string"


def test_typed_root_path_parsing_extracts_visibility_hint() -> None:
    module = load_proof_module()

    parsed = module.split_typed_property_path_entry(" (AZStd::string,Visible)")

    assert parsed["path"] == ""
    assert parsed["value_type_hint"] == "AZStd::string"
    assert parsed["visibility_hint"] == "Visible"


def test_empty_comment_property_path_is_evidence_not_target() -> None:
    module = load_proof_module()

    review = module.classify_comment_property_paths(["", "   "])

    assert review["target_selected"] is False
    assert review["write_target_admitted"] is False


def comment_target_info(component_id: str = "EntityComponentIdPair(EntityId(101), 201)"):
    return {
        "selected": {
            "component_id": component_id,
            "component_id_provenance": "admitted_runtime_component_add_result",
        }
    }


def test_property_discovery_prefers_build_component_property_list_candidate() -> None:
    module = load_proof_module()

    review = module.review_comment_scalar_discovery_result(
        {
            "ok": True,
            "comment_scalar_discovery": {
                "set_component_property_attempted": False,
                "write_target_admitted": False,
                "property_list_admission": False,
                "selected_candidate": {
                    "property_path": "Configuration|Comment",
                    "source": "BuildComponentPropertyList",
                    "success": True,
                    "value": "operator note",
                    "value_type": "AZStd::string",
                    "scalar_or_text_like": True,
                },
            },
        },
        target_info=comment_target_info(),
    )

    assert review["status"] == "candidate_selected_readback_only"
    assert review["target_selected"] is True
    assert review["selected_candidate"]["property_path"] == "Configuration|Comment"
    assert review["selected_candidate"]["source"] == "BuildComponentPropertyList"
    assert review["write_target_admitted"] is False


def test_property_discovery_accepts_property_tree_typed_candidate() -> None:
    module = load_proof_module()

    review = module.review_comment_scalar_discovery_result(
        {
            "ok": True,
            "comment_scalar_discovery": {
                "set_component_property_attempted": False,
                "write_target_admitted": False,
                "property_list_admission": False,
                "build_component_property_tree_editor": {
                    "tree_success": True,
                    "paths_with_types_count": 1,
                    "raw_typed_path_preview": [
                        "Configuration|Comment (AZStd::string)"
                    ],
                },
                "selected_candidate": {
                    "property_path": "Configuration|Comment",
                    "source": "PropertyTreeEditor.build_paths_list_with_types",
                    "success": True,
                    "value": "",
                    "value_type": "AZStd::string",
                    "scalar_or_text_like": True,
                },
            },
        },
        target_info=comment_target_info(),
    )

    assert review["target_selected"] is True
    assert review["selected_candidate"]["value_type"] == "AZStd::string"
    assert review["property_list_admission"] is False


def test_property_tree_root_string_readback_candidate_is_allowed() -> None:
    module = load_proof_module()

    review = module.review_comment_scalar_discovery_result(
        {
            "ok": True,
            "comment_scalar_discovery": {
                "set_component_property_attempted": False,
                "write_target_admitted": False,
                "write_admission": False,
                "property_list_admission": False,
                "root_candidate_detected": True,
                "root_candidate_type_hint": "AZStd::string",
                "root_candidate_visibility": "Visible",
                "root_property_tree_get_value_attempted": True,
                "root_property_tree_get_value_success": True,
                "selected_candidate": {
                    "property_path": "",
                    "property_path_kind": "property_tree_root",
                    "display_label": "Comment root text",
                    "discovery_method": "BuildComponentPropertyTreeEditor.get_value",
                    "source": "PropertyTreeEditor.get_value",
                    "property_tree_get_value_attempted": True,
                    "get_component_property_attempted": False,
                    "set_component_property_attempted": False,
                    "success": True,
                    "value": "operator note",
                    "value_type": "AZStd::string",
                    "scalar_or_text_like": True,
                    "target_status": "readback_only_candidate",
                    "write_admission": False,
                    "property_list_admission": False,
                },
            },
        },
        target_info=comment_target_info(),
    )

    assert review["status"] == "candidate_selected_readback_only"
    assert review["target_selected"] is True
    assert review["selected_candidate"]["property_path"] == ""
    assert review["selected_candidate"]["property_path_kind"] == "property_tree_root"
    assert review["selected_candidate"]["display_label"] == "Comment root text"
    assert review["selected_candidate"]["discovery_method"] == (
        "BuildComponentPropertyTreeEditor.get_value"
    )
    assert review["selected_candidate"]["target_status"] == "readback_only_candidate"
    assert review["write_admission"] is False
    assert review["property_list_admission"] is False


def test_property_tree_root_candidate_rejects_public_get_component_property() -> None:
    module = load_proof_module()

    with pytest.raises(module.CommentScalarTargetProofError, match="public GetComponentProperty"):
        module.review_comment_scalar_discovery_result(
            {
                "ok": True,
                "comment_scalar_discovery": {
                    "set_component_property_attempted": False,
                    "write_target_admitted": False,
                    "property_list_admission": False,
                    "selected_candidate": {
                        "property_path": "",
                        "property_path_kind": "property_tree_root",
                        "property_tree_get_value_attempted": True,
                        "get_component_property_attempted": True,
                        "success": True,
                        "value": "operator note",
                        "value_type": "AZStd::string",
                        "scalar_or_text_like": True,
                    },
                },
            },
            target_info=comment_target_info(),
        )


def test_source_guided_fallback_is_comment_only_and_get_only() -> None:
    module = load_proof_module()

    review = module.review_comment_scalar_discovery_result(
        {
            "ok": True,
            "comment_scalar_discovery": {
                "component_family": "Comment",
                "source_guided_fallback_attempted": True,
                "source_guided_readback_attempts": [
                    {
                        "property_path": "Configuration",
                        "source": "source_guided_comment_readback_candidate",
                        "get_component_property_attempted": True,
                        "set_component_property_attempted": False,
                        "success": True,
                        "value": "comment text",
                        "value_type": "AZStd::string",
                        "scalar_or_text_like": True,
                    }
                ],
                "set_component_property_attempted": False,
                "write_target_admitted": False,
                "property_list_admission": False,
                "selected_candidate": {
                    "property_path": "Configuration",
                    "source": "source_guided_comment_readback_candidate",
                    "get_component_property_attempted": True,
                    "set_component_property_attempted": False,
                    "success": True,
                    "value": "comment text",
                    "value_type": "AZStd::string",
                    "scalar_or_text_like": True,
                },
            },
        },
        target_info=comment_target_info(),
    )

    assert review["target_selected"] is True
    assert review["selected_candidate"]["source"] == (
        "source_guided_comment_readback_candidate"
    )
    assert review["write_admission"] is False


def test_source_guided_fallback_does_not_select_render_or_asset_paths() -> None:
    module = load_proof_module()

    with pytest.raises(module.CommentScalarTargetProofError, match="out-of-scope"):
        module.review_comment_scalar_discovery_result(
            {
                "ok": True,
                "comment_scalar_discovery": {
                    "set_component_property_attempted": False,
                    "write_target_admitted": False,
                    "property_list_admission": False,
                    "selected_candidate": {
                        "property_path": "Configuration|Render Asset",
                        "source": "source_guided_comment_readback_candidate",
                        "success": True,
                        "value": "unsafe",
                        "value_type": "AZStd::string",
                        "scalar_or_text_like": True,
                    },
                },
            },
            target_info=comment_target_info(),
        )


def test_unavailable_list_tree_and_fallback_records_exact_blocker() -> None:
    module = load_proof_module()

    review = module.review_comment_scalar_discovery_result(
        {
            "ok": True,
            "comment_scalar_discovery": {
                "set_component_property_attempted": False,
                "write_target_admitted": False,
                "property_list_admission": False,
                "selected_candidate": None,
                "status": "blocked",
                "blocker_code": "comment_property_tree_unavailable",
            },
        },
        target_info=comment_target_info(),
    )

    assert review["status"] == "blocked"
    assert review["blocker_code"] == "comment_property_tree_unavailable"
    assert review["target_selected"] is False


def test_root_string_readback_failure_records_exact_blocker() -> None:
    module = load_proof_module()

    review = module.review_comment_scalar_discovery_result(
        {
            "ok": True,
            "comment_scalar_discovery": {
                "set_component_property_attempted": False,
                "write_target_admitted": False,
                "property_list_admission": False,
                "root_candidate_detected": True,
                "root_candidate_type_hint": "AZStd::string",
                "root_candidate_visibility": "Visible",
                "root_property_tree_get_value_attempted": True,
                "root_property_tree_get_value_success": False,
                "source_guided_fallback_attempted": True,
                "source_guided_readback_attempts": [
                    {
                        "property_path": "Comment",
                        "source": "source_guided_comment_readback_candidate",
                        "get_component_property_attempted": True,
                        "set_component_property_attempted": False,
                        "success": False,
                        "error": "GetProperty - path provided was not found in tree.",
                    }
                ],
                "selected_candidate": None,
                "status": "blocked",
                "blocker_code": "comment_root_string_readback_failed",
            },
        },
        target_info=comment_target_info(),
    )

    assert review["status"] == "blocked"
    assert review["blocker_code"] == "comment_root_string_readback_failed"
    assert review["target_selected"] is False


def test_root_string_non_scalar_value_is_not_selected() -> None:
    module = load_proof_module()

    review = module.review_comment_scalar_discovery_result(
        {
            "ok": True,
            "comment_scalar_discovery": {
                "set_component_property_attempted": False,
                "write_target_admitted": False,
                "property_list_admission": False,
                "root_candidate_detected": True,
                "root_candidate_type_hint": "AZStd::string",
                "root_candidate_visibility": "Visible",
                "root_property_tree_get_value_attempted": True,
                "root_property_tree_get_value_success": True,
                "root_property_tree_scalar_or_text_like": False,
                "selected_candidate": None,
                "status": "blocked",
                "blocker_code": "comment_root_string_readback_failed",
            },
        },
        target_info=comment_target_info(),
    )

    assert review["status"] == "blocked"
    assert review["blocker_code"] == "comment_root_string_readback_failed"
    assert review["target_selected"] is False


def test_no_write_admission_fields_are_accepted_as_true() -> None:
    module = load_proof_module()

    with pytest.raises(module.CommentScalarTargetProofError, match="SetComponentProperty"):
        module.review_comment_scalar_discovery_result(
            {
                "ok": True,
                "comment_scalar_discovery": {
                    "set_component_property_attempted": True,
                    "write_target_admitted": False,
                    "property_list_admission": False,
                },
            },
            target_info=comment_target_info(),
        )


def test_require_comment_readback_preserves_read_only_future_candidate_boundary() -> None:
    module = load_proof_module()
    component_id = "EntityComponentIdPair(EntityId(101), 201)"
    runtime_steps = {
        "property_target_selection": {
            "target_selected": True,
            "selected_property_path": "Controller|Configuration|Comment",
        },
        "property_get": {
            "runtime_result": {
                "ok": True,
                "component_id": component_id,
                "property_path": "Controller|Configuration|Comment",
                "value": "operator note",
                "value_type": "AZStd::string",
            }
        },
    }
    target_info = {
        "selected": {
            "component_id": component_id,
            "component_id_provenance": "admitted_runtime_component_add_result",
        }
    }

    review = module.require_comment_readback(runtime_steps, target_info=target_info)

    assert review["scalar_or_text_like"] is True
    assert review["future_write_candidate_selected"] is True
    assert review["write_target_admitted"] is False
    assert review["component_id_provenance"] == "admitted_runtime_component_add_result"

    runtime_steps["property_get"]["runtime_result"]["component_id"] = (
        "EntityComponentIdPair(EntityId(999), 888)"
    )
    with pytest.raises(module.CommentScalarTargetProofError, match="component-add id"):
        module.require_comment_readback(runtime_steps, target_info=target_info)


def test_property_list_unavailable_blocker_is_successful_discovery_outcome() -> None:
    module = load_proof_module()
    error = RuntimeError(
        "editor.component.property.list requires the bridge to return a typed "
        "string-only property_paths list."
    )
    error.cleanup_restore = {"restore_succeeded": True}  # type: ignore[attr-defined]

    summary = module.build_failure_summary(
        error=error,
        preflight_facts=["Selected safe level."],
    )

    assert summary["succeeded"] is True
    assert summary["status"] == "blocked"
    assert summary["target_selected"] is False
    assert summary["future_write_candidate_selected"] is False
    assert summary["write_target_admitted"] is False
    assert summary["blocker_code"] == "comment_property_list_unavailable"
    assert summary["restore_or_cleanup_verified"] is True


def test_restore_failure_prevents_candidate_success() -> None:
    module = load_proof_module()
    error = RuntimeError("restore failed after candidate discovery")
    error.cleanup_restore = {"restore_succeeded": False}  # type: ignore[attr-defined]

    summary = module.build_failure_summary(
        error=error,
        preflight_facts=["Candidate discovery ran before restore failure."],
    )

    assert summary["succeeded"] is False
    assert summary["future_write_candidate_selected"] is False
    assert summary["restore_or_cleanup_verified"] is False
