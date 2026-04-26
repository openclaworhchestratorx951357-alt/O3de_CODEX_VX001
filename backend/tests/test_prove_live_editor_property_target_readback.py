from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
PROOF_HELPER_PATH = (
    REPO_ROOT / "backend" / "runtime" / "prove_live_editor_property_target_readback.py"
)


def load_proof_module():
    runtime_dir = str(PROOF_HELPER_PATH.parent)
    if runtime_dir not in sys.path:
        sys.path.insert(0, runtime_dir)
    spec = importlib.util.spec_from_file_location(
        "prove_live_editor_property_target_readback",
        PROOF_HELPER_PATH,
    )
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def write_level_prefab(tmp_path: Path) -> Path:
    prefab_path = tmp_path / "TestLoevel01.prefab"
    prefab_path.write_text(
        json.dumps(
            {
                "Entities": {
                    "Entity_[101]": {
                        "Id": "Entity_[101]",
                        "Name": "Ground",
                        "Components": {
                            "Component_[201]": {
                                "$type": "EditorMeshComponent",
                            }
                        },
                    },
                    "Entity_[102]": {
                        "Id": "Entity_[102]",
                        "Name": "ReferenceOnly",
                        "Components": {
                            "Component_[202]": {
                                "$type": "EditorMeshComponent",
                            }
                        },
                    },
                }
            }
        ),
        encoding="utf-8",
    )
    return prefab_path


def safe_level_info(prefab_path: Path) -> dict[str, str]:
    return {
        "selected_level_path": "Levels/TestLoevel01",
        "selected_prefab_path": str(prefab_path),
    }


def test_live_control_scripts_expose_property_target_readback_proof_command() -> None:
    live_control = REPO_ROOT / "backend" / "runtime" / "live_verify_control.ps1"
    dev_script = REPO_ROOT / "scripts" / "dev.ps1"

    live_control_text = live_control.read_text(encoding="utf-8")
    dev_script_text = dev_script.read_text(encoding="utf-8")

    assert "prove_live_editor_property_target_readback.py" in live_control_text
    assert '"property-target-readback-proof"' in live_control_text
    assert "live-property-target-readback-proof" in dev_script_text


def test_select_serialized_hint_target_marks_prefab_record_non_live(tmp_path: Path) -> None:
    module = load_proof_module()
    prefab_path = write_level_prefab(tmp_path)

    target = module.select_serialized_hint_target(safe_level_info(prefab_path))

    assert target["selected_entity_name"] == "Ground"
    assert target["selected_component"] == "Mesh"
    assert target["selected_property_path"] == "Controller|Configuration|Model Asset"
    assert target["live_component_id_source_required"] == (
        "admitted_runtime_component_discovery_result"
    )
    assert target["write_target_selected"] is False
    serialized_hint = target["serialized_hint"]
    assert serialized_hint["component_id_provenance"] == "serialized_prefab_record"
    assert serialized_hint["evidence_class"] == "serialized_file_evidence"
    assert serialized_hint["live_property_target"] is False


def test_require_adapters_and_capabilities_keep_property_list_unadmitted() -> None:
    module = load_proof_module()

    module.require_adapters_payload(
        {
            "real_tool_paths": [
                "editor.session.open",
                "editor.level.open",
                "editor.component.find",
                "editor.component.property.get",
            ]
        }
    )
    with pytest.raises(module.PropertyTargetReadbackProofError, match="property.list"):
        module.require_adapters_payload(
            {
                "real_tool_paths": [
                    "editor.session.open",
                    "editor.level.open",
                    "editor.component.find",
                    "editor.component.property.get",
                    "editor.component.property.list",
                ]
            }
        )

    module.require_capabilities_payload(
        {
            "capabilities": [
                {
                    "tool_name": "editor.session.open",
                    "capability_maturity": "real-authoring",
                    "real_admission_stage": "real-editor-authoring-active",
                    "safety_envelope": {"stage": "real-editor-authoring-active"},
                },
                {
                    "tool_name": "editor.level.open",
                    "capability_maturity": "real-authoring",
                    "real_admission_stage": "real-editor-authoring-active",
                    "safety_envelope": {"stage": "real-editor-authoring-active"},
                },
                {
                    "tool_name": "editor.component.find",
                    "capability_maturity": "hybrid-read-only",
                    "real_admission_stage": "real-read-only-active",
                    "safety_envelope": {"stage": "real-read-only-active"},
                },
                {
                    "tool_name": "editor.component.property.get",
                    "capability_maturity": "hybrid-read-only",
                    "real_admission_stage": "real-read-only-active",
                    "safety_envelope": {"stage": "real-read-only-active"},
                },
            ]
        }
    )
    with pytest.raises(module.PropertyTargetReadbackProofError, match="property.list"):
        module.require_capabilities_payload(
            {
                "capabilities": [
                    {
                        "tool_name": "editor.session.open",
                        "capability_maturity": "real-authoring",
                        "real_admission_stage": "real-editor-authoring-active",
                        "safety_envelope": {"stage": "real-editor-authoring-active"},
                    },
                    {
                        "tool_name": "editor.level.open",
                        "capability_maturity": "real-authoring",
                        "real_admission_stage": "real-editor-authoring-active",
                        "safety_envelope": {"stage": "real-editor-authoring-active"},
                    },
                    {
                        "tool_name": "editor.component.find",
                        "capability_maturity": "hybrid-read-only",
                        "real_admission_stage": "real-read-only-active",
                        "safety_envelope": {"stage": "real-read-only-active"},
                    },
                    {
                        "tool_name": "editor.component.property.get",
                        "capability_maturity": "hybrid-read-only",
                        "real_admission_stage": "real-read-only-active",
                        "safety_envelope": {"stage": "real-read-only-active"},
                    },
                    {"tool_name": "editor.component.property.list"},
                ]
            }
        )


def test_require_prompt_plan_chains_find_result_into_property_get() -> None:
    module = load_proof_module()

    module.require_prompt_plan(
        {
            "status": "planned",
            "refused_capabilities": [],
            "plan": {
                "steps": [
                    {
                        "step_id": "editor-session-1",
                        "tool": "editor.session.open",
                        "args": {
                            "session_mode": "attach",
                            "project_path": "C:/project",
                            "timeout_s": 180,
                        },
                    },
                    {
                        "step_id": "editor-level-1",
                        "tool": "editor.level.open",
                        "depends_on": ["editor-session-1"],
                        "args": {
                            "level_path": "Levels/TestLoevel01",
                            "make_writable": False,
                            "focus_viewport": False,
                        },
                    },
                    {
                        "step_id": "editor-component-find-1",
                        "tool": "editor.component.find",
                        "approval_class": "read_only",
                        "depends_on": ["editor-session-1", "editor-level-1"],
                        "args": {
                            "component_name": "Mesh",
                            "entity_name": "Ground",
                            "level_path": "Levels/TestLoevel01",
                        },
                    },
                    {
                        "step_id": "editor-component-property-1",
                        "tool": "editor.component.property.get",
                        "approval_class": "read_only",
                        "depends_on": ["editor-component-find-1"],
                        "args": {
                            "component_id": "$step:editor-component-find-1.component_id",
                            "property_path": "Controller|Configuration|Model Asset",
                            "level_path": "Levels/TestLoevel01",
                        },
                    },
                ]
            },
        },
        project_root="C:/project",
        level_path="Levels/TestLoevel01",
        entity_name="Ground",
    )


def test_require_target_bound_readback_requires_live_discovered_component_id() -> None:
    module = load_proof_module()
    component_id = "EntityComponentIdPair(EntityId(101), 201)"
    step_records = {
        "editor_component_find": {
            "execution_record": {
                "details": {
                    "found": True,
                    "component_name": "Mesh",
                    "entity_name": "Ground",
                    "entity_id": "101",
                    "component_id": component_id,
                    "component_id_provenance": (
                        "admitted_runtime_component_discovery_result"
                    ),
                }
            }
        },
        "editor_component_property_get": {
            "execution_record": {
                "details": {
                    "component_id": component_id,
                    "property_path": "Controller|Configuration|Model Asset",
                    "value": "objects/example.azmodel",
                    "value_type": "AZ::Data::Asset<AZ::Data::AssetData>",
                    "level_path": "Levels/TestLoevel01",
                }
            }
        },
    }

    verification = module.require_target_bound_readback(
        step_records,
        target={"selected_entity_name": "Ground"},
    )

    assert verification["component_id"] == component_id
    assert verification["component_id_provenance"] == (
        "admitted_runtime_component_discovery_result"
    )
    assert verification["property_path"] == "Controller|Configuration|Model Asset"

    bad_records = dict(step_records)
    bad_records["editor_component_property_get"] = {
        "execution_record": {
            "details": {
                "component_id": "EntityComponentIdPair(EntityId(999), 888)",
                "property_path": "Controller|Configuration|Model Asset",
            }
        }
    }
    with pytest.raises(module.PropertyTargetReadbackProofError, match="discovered"):
        module.require_target_bound_readback(
            bad_records,
            target={"selected_entity_name": "Ground"},
        )
