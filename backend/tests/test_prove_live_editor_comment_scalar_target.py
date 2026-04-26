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

    assert "prove_live_editor_comment_scalar_target.py" in live_control.read_text(
        encoding="utf-8"
    )
    assert '"comment-scalar-target-proof"' in live_control.read_text(encoding="utf-8")
    assert "live-comment-scalar-target-proof" in dev_script.read_text(encoding="utf-8")
    assert "live_editor_comment_scalar_target_proof_*.json" in gitignore.read_text(
        encoding="utf-8"
    )


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
