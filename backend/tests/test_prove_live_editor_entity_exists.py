from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
RUNTIME_DIR = REPO_ROOT / "backend" / "runtime"
PROOF_HELPER_PATH = RUNTIME_DIR / "prove_live_editor_entity_exists.py"


def load_proof_module():
    if str(RUNTIME_DIR) not in sys.path:
        sys.path.insert(0, str(RUNTIME_DIR))
    spec = importlib.util.spec_from_file_location(
        "prove_live_editor_entity_exists",
        PROOF_HELPER_PATH,
    )
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def write_prefab(path: Path, entity_names: list[str]) -> None:
    payload = {
        "Entities": {
            f"entity-{index}": {
                "Name": name,
            }
            for index, name in enumerate(entity_names)
        }
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_select_entity_exists_target_prefers_unique_ground(tmp_path):
    module = load_proof_module()
    prefab_path = tmp_path / "Levels" / "TestArena" / "TestArena.prefab"
    write_prefab(prefab_path, ["Tree", "Ground", "Tree", "CodexProofEntity_old"])

    selected = module.select_entity_exists_target(
        {
            "selected_level_path": "Levels/TestArena",
            "selected_prefab_path": str(prefab_path),
        }
    )

    assert selected["selected_entity_name"] == "Ground"
    assert selected["candidate_entity_names"] == ["Ground"]
    assert selected["duplicate_entity_names"] == ["Tree"]


def test_select_entity_exists_target_rejects_ambiguous_prefab_only(tmp_path):
    module = load_proof_module()
    prefab_path = tmp_path / "Levels" / "TestArena" / "TestArena.prefab"
    write_prefab(prefab_path, ["Ground", "Ground"])

    with pytest.raises(module.EntityExistsProofError, match="unique exact entity-name"):
        module.select_entity_exists_target(
            {
                "selected_level_path": "Levels/TestArena",
                "selected_prefab_path": str(prefab_path),
            }
        )


def test_build_dispatch_requests_stays_inside_read_only_boundary(tmp_path):
    module = load_proof_module()

    requests = module.build_dispatch_requests(
        run_label="20260425-010203",
        project_root=str(tmp_path),
        engine_root="C:/engine",
        level_path="Levels/TestArena",
        entity_name="Ground",
    )

    assert [payload["tool"] for payload in requests.values()] == [
        "editor.session.open",
        "editor.level.open",
        "editor.entity.exists",
    ]
    assert requests[module.PROOF_LEVEL_STEP]["args"] == {
        "level_path": "Levels/TestArena",
        "make_writable": False,
        "focus_viewport": False,
    }
    assert requests[module.PROOF_EXISTS_STEP]["args"] == {
        "entity_name": "Ground",
        "level_path": "Levels/TestArena",
    }
    assert all(payload["dry_run"] is False for payload in requests.values())


def test_require_entity_exists_verified_accepts_exact_name_readback():
    module = load_proof_module()

    verified = module.require_entity_exists_verified(
        {
            module.PROOF_EXISTS_STEP: {
                "execution_record": {
                    "details": {
                        "exists": True,
                        "lookup_mode": "entity_name",
                        "requested_entity_name": "Ground",
                        "entity_name": "Ground",
                        "matched_count": 1,
                        "entity_id": "[123]",
                        "bridge_command_id": "bridge-1",
                    }
                },
                "artifact_record": {
                    "metadata": {},
                },
            }
        },
        target={"selected_entity_name": "Ground"},
    )

    assert verified["exists"] is True
    assert verified["entity_id"] == "[123]"
    assert verified["bridge_command_id"] == "bridge-1"


def test_require_entity_exists_verified_rejects_absent_entity():
    module = load_proof_module()

    with pytest.raises(module.EntityExistsProofError, match="exists=true"):
        module.require_entity_exists_verified(
            {
                module.PROOF_EXISTS_STEP: {
                    "execution_record": {
                        "details": {
                            "exists": False,
                            "lookup_mode": "entity_name",
                            "requested_entity_name": "Ground",
                            "entity_name": "Ground",
                            "matched_count": 0,
                            "entity_id": "",
                        }
                    },
                    "artifact_record": {
                        "metadata": {},
                    },
                }
            },
            target={"selected_entity_name": "Ground"},
        )
