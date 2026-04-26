from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
PROOF_HELPER_PATH = (
    REPO_ROOT / "backend" / "runtime" / "prove_live_editor_component_property_list.py"
)


def load_proof_module():
    runtime_dir = str(PROOF_HELPER_PATH.parent)
    if runtime_dir not in sys.path:
        sys.path.insert(0, runtime_dir)
    spec = importlib.util.spec_from_file_location(
        "prove_live_editor_component_property_list",
        PROOF_HELPER_PATH,
    )
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def write_level_prefab(tmp_path: Path, payload: dict) -> dict:
    level_dir = tmp_path / "Levels" / "TestArena"
    level_dir.mkdir(parents=True)
    prefab_path = level_dir / "TestArena.prefab"
    prefab_path.write_text(json.dumps(payload), encoding="utf-8")
    return {
        "selected_level_path": "Levels/TestArena",
        "selected_prefab_path": str(prefab_path),
    }


def test_prefab_component_records_are_serialized_non_live_evidence(tmp_path):
    module = load_proof_module()
    safe_level_info = write_level_prefab(
        tmp_path,
        {
            "ContainerEntity": {
                "Entities": {
                    "ground": {
                        "Id": "Entity_[101]",
                        "Name": "Ground",
                        "Components": {
                            "Component_[201]": {
                                "$type": "AZ::Render::EditorMeshComponent"
                            },
                            "Component_[202]": {"$type": "EditorInspectorComponent"},
                        },
                    },
                    "other": {
                        "Id": "Entity_[102]",
                        "Name": "Other",
                        "Components": {
                            "Component_[301]": {
                                "$type": "AZ::Render::EditorMeshComponent"
                            },
                        },
                    },
                }
            }
        },
    )

    records = module.collect_serialized_prefab_component_records(safe_level_info)

    selected = records[0]
    assert selected["entity_name"] == "Ground"
    assert selected["entity_id"] == "101"
    assert selected["component_numeric_id"] == "201"
    assert (
        selected["serialized_component_id"]
        == "EntityComponentIdPair(EntityId(101), 201)"
    )
    assert selected["component_id_provenance"] == "serialized_prefab_record"
    assert selected["evidence_class"] == "serialized_file_evidence"
    assert selected["live_property_target"] is False
    assert "component_id" not in selected
    assert len(records) == 2


def test_prefab_component_records_do_not_invent_live_targets(tmp_path):
    module = load_proof_module()
    safe_level_info = write_level_prefab(
        tmp_path,
        {
            "ContainerEntity": {
                "Entities": {
                    "ground": {
                        "Id": "Entity_[101]",
                        "Name": "Ground",
                        "Components": {
                            "Component_[202]": {"$type": "EditorInspectorComponent"},
                        },
                    },
                }
            }
        },
    )

    assert module.collect_serialized_prefab_component_records(safe_level_info) == []


def test_require_adapters_boundary_preserves_unadmitted_property_list():
    module = load_proof_module()

    adapter_status = module.require_adapters_boundary(
        {
            "adapters": {
                "active_mode": "hybrid",
                "real_tool_paths": [
                    "editor.session.open",
                    "editor.level.open",
                    "editor.component.property.get",
                ],
            }
        }
    )

    assert adapter_status["active_mode"] == "hybrid"


def test_require_adapters_boundary_rejects_property_list_admission():
    module = load_proof_module()

    with pytest.raises(module.ComponentPropertyListProofError, match="already exposes"):
        module.require_adapters_boundary(
            {
                "real_tool_paths": [
                    "editor.session.open",
                    "editor.level.open",
                    "editor.component.property.list",
                ]
            }
        )


def test_configure_runtime_environment_from_target_seeds_proof_process(monkeypatch):
    module = load_proof_module()
    for key in (
        "O3DE_TARGET_PROJECT_ROOT",
        "O3DE_TARGET_ENGINE_ROOT",
        "O3DE_TARGET_EDITOR_RUNNER",
        "O3DE_EDITOR_SCRIPT_RUNNER",
    ):
        monkeypatch.delenv(key, raising=False)

    configured = module.configure_runtime_environment_from_target(
        {
            "editor_runner": "C:/o3de/project/build/Editor.exe",
            "editor_runner_exists": True,
            "runtime_runner": "C:/o3de/project/build/Editor.exe",
        },
        project_root="C:/o3de/project",
        engine_root="C:/src/o3de",
    )

    assert configured == {
        "O3DE_TARGET_PROJECT_ROOT": "C:/o3de/project",
        "O3DE_TARGET_ENGINE_ROOT": "C:/src/o3de",
        "O3DE_TARGET_EDITOR_RUNNER": "C:/o3de/project/build/Editor.exe",
        "O3DE_EDITOR_SCRIPT_RUNNER": "C:/o3de/project/build/Editor.exe",
    }
    for key, value in configured.items():
        assert module.os.environ[key] == value


def test_configure_runtime_environment_from_target_rejects_missing_runner():
    module = load_proof_module()

    with pytest.raises(module.ComponentPropertyListProofError, match="editor_runner"):
        module.configure_runtime_environment_from_target(
            {"editor_runner_exists": True},
            project_root="C:/o3de/project",
            engine_root="C:/src/o3de",
        )


def test_component_id_from_component_add_payload_uses_live_component_ref():
    module = load_proof_module()

    component_id = module.component_id_from_component_add_payload(
        {
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
        }
    )

    assert component_id == "EntityComponentIdPair(EntityId(101), 201)"


def test_component_id_from_component_add_payload_requires_live_provenance():
    module = load_proof_module()

    with pytest.raises(
        module.ComponentPropertyListProofError,
        match="admitted runtime component_id provenance",
    ):
        module.component_id_from_component_add_payload(
            {
                "runtime_result": {
                    "added_component_refs": [
                        {
                            "component": "Mesh",
                            "component_id": (
                                "EntityComponentIdPair(EntityId(101), 201)"
                            ),
                        }
                    ]
                }
            }
        )


def test_restore_boundary_from_entity_create_payload_requires_available_boundary():
    module = load_proof_module()

    with pytest.raises(module.ComponentPropertyListProofError, match="restore boundary"):
        module.restore_boundary_from_entity_create_payload(
            {"runtime_result": {"restore_boundary_available": False}}
        )


def test_target_info_from_runtime_steps_records_admitted_target_source():
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
                            "component_numeric_id": 201,
                        }
                    ]
                }
            },
        }
    )

    selected = target_info["selected"]
    assert selected["entity_name"] == "ProofEntity"
    assert selected["component"] == "Mesh"
    assert selected["selection_source"] == "admitted_runtime_component_add_result"
    assert (
        selected["component_id_provenance"]
        == "admitted_runtime_component_add_result"
    )


def test_require_property_list_result_accepts_path_only_bridge_result():
    module = load_proof_module()

    module.require_property_list_result(
        {
            "ok": True,
            "editor_transport": "bridge",
            "bridge_operation": "editor.component.property.list",
            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
            "component_type": "AZ::Render::EditorMeshComponent",
            "property_paths": [
                "Controller|Configuration|Model Asset",
                "Controller|Configuration|Sort Key",
            ],
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.component.property.list",
                "EditorComponentAPIBus.BuildComponentPropertyList",
            ],
        },
        target={
            "component_type": "AZ::Render::EditorMeshComponent",
        },
    )


def test_property_path_review_blocks_mesh_asset_render_and_group_paths():
    module = load_proof_module()

    review = module.classify_property_paths_for_write_target(
        [
            "Controller",
            "Controller|Configuration|Model Asset",
            "Controller|Configuration|Sort Key",
            "Controller|Configuration|Lod Configuration|Minimum Screen Coverage",
            "Model Stats|Mesh Stats",
        ]
    )

    assert review["target_selected"] is False
    assert review["status"] == "blocked"
    assert review["blocker_code"] == "no_non_asset_non_render_scalar_target"
    assert "non-asset, non-render" in review["required_next_evidence"]
    path_classes = {
        item["property_path"]: item["evidence_class"]
        for item in review["reviewed_paths"]
    }
    assert path_classes["Controller"] == "container_or_group"
    assert path_classes["Controller|Configuration|Model Asset"] == (
        "asset_or_material_reference"
    )
    assert path_classes["Controller|Configuration|Sort Key"] == (
        "render_adjacent_scalar_candidate"
    )
    assert path_classes["Model Stats|Mesh Stats"] == "derived_or_read_only_stats"
    assert all(item["write_target_allowed"] is False for item in review["reviewed_paths"])


def test_require_property_list_result_rejects_value_readback():
    module = load_proof_module()

    with pytest.raises(module.ComponentPropertyListProofError, match="property value"):
        module.require_property_list_result(
            {
                "ok": True,
                "editor_transport": "bridge",
                "bridge_operation": "editor.component.property.list",
                "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                "property_paths": ["Controller|Configuration|Model Asset"],
                "value": "not allowed",
                "exact_editor_apis": [
                    "EditorComponentAPIBus.BuildComponentPropertyList",
                ],
            },
            target={},
        )
