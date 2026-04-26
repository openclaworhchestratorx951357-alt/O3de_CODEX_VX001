from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
PROOF_HELPER_PATH = REPO_ROOT / "backend" / "runtime" / "prove_live_editor_component_find.py"


def load_proof_module():
    runtime_dir = str(PROOF_HELPER_PATH.parent)
    if runtime_dir not in sys.path:
        sys.path.insert(0, runtime_dir)
    spec = importlib.util.spec_from_file_location(
        "prove_live_editor_component_find",
        PROOF_HELPER_PATH,
    )
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_live_control_scripts_expose_component_find_proof_command() -> None:
    live_control = REPO_ROOT / "backend" / "runtime" / "live_verify_control.ps1"
    dev_script = REPO_ROOT / "scripts" / "dev.ps1"

    live_control_text = live_control.read_text(encoding="utf-8")
    dev_script_text = dev_script.read_text(encoding="utf-8")

    assert "prove_live_editor_component_find.py" in live_control_text
    assert '"component-find-proof"' in live_control_text
    assert "live-component-find-proof" in dev_script_text


def test_require_adapters_boundary_accepts_find_and_rejects_property_list() -> None:
    module = load_proof_module()

    adapter_status = module.require_adapters_boundary(
        {
            "adapters": {
                "active_mode": "hybrid",
                "real_tool_paths": [
                    "editor.session.open",
                    "editor.level.open",
                    "editor.entity.create",
                    "editor.component.add",
                    "editor.component.find",
                    "editor.component.property.get",
                ],
            }
        }
    )

    assert adapter_status["active_mode"] == "hybrid"
    with pytest.raises(module.ComponentFindProofError, match="property.list"):
        module.require_adapters_boundary(
            {
                "real_tool_paths": [
                    "editor.session.open",
                    "editor.level.open",
                    "editor.entity.create",
                    "editor.component.add",
                    "editor.component.find",
                    "editor.component.property.list",
                ]
            }
        )


def test_require_prompt_capability_boundary_accepts_find_only() -> None:
    module = load_proof_module()

    capability = module.require_prompt_capability_boundary(
        {
            "capabilities": [
                {
                    "tool_name": "editor.component.find",
                    "capability_maturity": "hybrid-read-only",
                    "safety_envelope": {
                        "natural_language_status": "prompt-ready-read-only"
                    },
                }
            ]
        }
    )

    assert capability["tool_name"] == "editor.component.find"
    with pytest.raises(module.ComponentFindProofError, match="property listing"):
        module.require_prompt_capability_boundary(
            {
                "capabilities": [
                    {
                        "tool_name": "editor.component.find",
                        "capability_maturity": "hybrid-read-only",
                        "safety_envelope": {
                            "natural_language_status": "prompt-ready-read-only"
                        },
                    },
                    {"tool_name": "editor.component.property.list"},
                ]
            }
        )


def test_component_id_from_component_find_payload_requires_live_discovery_provenance() -> None:
    module = load_proof_module()
    component_id = "EntityComponentIdPair(EntityId(101), 201)"

    assert (
        module.component_id_from_component_find_payload(
            {
                "runtime_result": {
                    "component_id": component_id,
                    "component_id_provenance": (
                        "admitted_runtime_component_discovery_result"
                    ),
                    "component_refs": [
                        {
                            "component_id": component_id,
                            "component_id_provenance": (
                                "admitted_runtime_component_discovery_result"
                            ),
                        }
                    ],
                }
            }
        )
        == component_id
    )

    with pytest.raises(module.ComponentFindProofError, match="provenance"):
        module.component_id_from_component_find_payload(
            {
                "runtime_result": {
                    "component_id": component_id,
                    "component_refs": [
                        {
                            "component_id": component_id,
                            "component_id_provenance": (
                                "admitted_runtime_component_add_result"
                            ),
                        }
                    ],
                }
            }
        )


def test_target_info_from_runtime_steps_records_add_and_discovery_sources() -> None:
    module = load_proof_module()

    target_info = module.target_info_from_runtime_steps(
        {
            "entity_create": {
                "runtime_result": {
                    "entity_id": "101",
                    "entity_name": "ProofEntity",
                }
            },
            "component_add": {
                "runtime_result": {
                    "added_component_refs": [
                        {
                            "component": "Mesh",
                            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                            "component_id_provenance": (
                                "admitted_runtime_component_add_result"
                            ),
                        }
                    ]
                }
            },
            "component_find": {
                "runtime_result": {
                    "lookup_mode": "entity_name",
                    "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                    "component_id_provenance": (
                        "admitted_runtime_component_discovery_result"
                    ),
                    "component_refs": [
                        {
                            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                            "component_id_provenance": (
                                "admitted_runtime_component_discovery_result"
                            ),
                        }
                    ],
                }
            },
        }
    )

    selected = target_info["selected"]
    assert selected["entity_name"] == "ProofEntity"
    assert selected["added_component_id_provenance"] == "admitted_runtime_component_add_result"
    assert (
        selected["discovered_component_id_provenance"]
        == "admitted_runtime_component_discovery_result"
    )
    assert selected["component_id_match"] is True
    assert selected["selection_source"] == "admitted_runtime_component_discovery_result"


def test_require_component_find_result_accepts_live_target_without_property_data() -> None:
    module = load_proof_module()

    module.require_component_find_result(
        {
            "ok": True,
            "found": True,
            "editor_transport": "bridge",
            "bridge_operation": "editor.component.find",
            "component_name": "Mesh",
            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
            "component_id_provenance": (
                "admitted_runtime_component_discovery_result"
            ),
            "entity_name": "ProofEntity",
            "lookup_mode": "entity_name",
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.component.find",
                "EditorComponentAPIBus.HasComponentOfType",
                "EditorComponentAPIBus.GetComponentOfType",
            ],
        },
        target={
            "added_component_id": "EntityComponentIdPair(EntityId(101), 201)",
            "entity_name": "ProofEntity",
        },
    )


def test_require_component_find_result_rejects_property_listing_or_value_evidence() -> None:
    module = load_proof_module()

    with pytest.raises(module.ComponentFindProofError, match="forbidden property"):
        module.require_component_find_result(
            {
                "ok": True,
                "found": True,
                "editor_transport": "bridge",
                "bridge_operation": "editor.component.find",
                "component_name": "Mesh",
                "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                "component_id_provenance": (
                    "admitted_runtime_component_discovery_result"
                ),
                "entity_name": "ProofEntity",
                "lookup_mode": "entity_name",
                "property_paths": ["Controller|Configuration|Model Asset"],
                "exact_editor_apis": [
                    "EditorComponentAPIBus.HasComponentOfType",
                    "EditorComponentAPIBus.GetComponentOfType",
                ],
            },
            target={
                "added_component_id": "EntityComponentIdPair(EntityId(101), 201)",
                "entity_name": "ProofEntity",
            },
        )
