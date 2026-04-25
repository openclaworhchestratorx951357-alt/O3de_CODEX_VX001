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


def test_build_prompt_request_targets_direct_read_only_review(tmp_path):
    module = load_proof_module()

    prompt_payload = module.build_prompt_request(
        project_root=str(tmp_path),
        engine_root="C:/engine",
        prompt_id="entity-exists-proof-1",
        workspace_id=None,
        executor_id=None,
        level_path="Levels/TestArena",
        entity_name="Ground",
    )

    assert prompt_payload["prompt_id"] == "entity-exists-proof-1"
    assert prompt_payload["workspace_id"] is None
    assert prompt_payload["executor_id"] is None
    assert prompt_payload["dry_run"] is False
    assert prompt_payload["preferred_domains"] == ["editor-control"]
    assert prompt_payload["prompt_text"] == (
        'Open level "Levels/TestArena" and verify entity "Ground" exists.'
    )


def test_require_prompt_plan_accepts_expected_direct_read_only_chain(tmp_path):
    module = load_proof_module()
    project_root = str(tmp_path)
    level_path = "Levels/TestArena"
    entity_name = "Ground"

    session_record = {
        "status": "planned",
        "refused_capabilities": [],
        "plan": {
            "steps": [
                {
                    "step_id": "editor-session-1",
                    "tool": "editor.session.open",
                    "args": {
                        "session_mode": "attach",
                        "project_path": project_root,
                        "timeout_s": 180,
                    },
                },
                {
                    "step_id": "editor-level-1",
                    "tool": "editor.level.open",
                    "args": {
                        "level_path": level_path,
                        "make_writable": False,
                        "focus_viewport": False,
                    },
                    "depends_on": ["editor-session-1"],
                },
                {
                    "step_id": "editor-entity-exists-1",
                    "tool": "editor.entity.exists",
                    "approval_class": "read_only",
                    "args": {
                        "entity_name": entity_name,
                        "level_path": level_path,
                    },
                    "depends_on": ["editor-session-1", "editor-level-1"],
                },
            ],
        },
    }

    module.require_prompt_plan(
        session_record,
        project_root=project_root,
        level_path=level_path,
        entity_name=entity_name,
    )


def test_require_prompt_plan_rejects_writable_level_open(tmp_path):
    module = load_proof_module()
    project_root = str(tmp_path)

    session_record = {
        "status": "planned",
        "refused_capabilities": [],
        "plan": {
            "steps": [
                {
                    "step_id": "editor-session-1",
                    "tool": "editor.session.open",
                    "args": {
                        "session_mode": "attach",
                        "project_path": project_root,
                        "timeout_s": 180,
                    },
                },
                {
                    "step_id": "editor-level-1",
                    "tool": "editor.level.open",
                    "args": {
                        "level_path": "Levels/TestArena",
                        "make_writable": True,
                        "focus_viewport": True,
                    },
                    "depends_on": ["editor-session-1"],
                },
                {
                    "step_id": "editor-entity-exists-1",
                    "tool": "editor.entity.exists",
                    "approval_class": "read_only",
                    "args": {
                        "entity_name": "Ground",
                        "level_path": "Levels/TestArena",
                    },
                    "depends_on": ["editor-session-1", "editor-level-1"],
                },
            ],
        },
    }

    with pytest.raises(module.EntityExistsProofError, match="read-only level-open"):
        module.require_prompt_plan(
            session_record,
            project_root=project_root,
            level_path="Levels/TestArena",
            entity_name="Ground",
        )


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


def test_require_prompt_review_summary_accepts_direct_readback_review():
    module = load_proof_module()

    review_summary = "\n".join(
        [
            "Review result: succeeded_readback_verified",
            'Requested action: Open level "Levels/TestArena" and verify entity "Ground" exists.',
            "Executed action:",
            "- Checked entity existence by entity_name lookup for Ground.",
            "Verified facts:",
            "- Readback confirmed Ground ([123]) exists in Levels/TestArena via entity_name lookup with matched_count=1.",
            "Missing proof:",
            "- No cleanup or restore was executed or needed by this read-only proof.",
            "- This review does not claim entity creation, component changes, property writes, delete, parenting, prefab, material, asset, render, build, arbitrary Editor Python, live Editor undo, viewport reload, or reversibility.",
        ]
    )

    assert module.require_prompt_review_summary(
        {"final_result_summary": review_summary},
        target={"selected_entity_name": "Ground"},
    ) == review_summary


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
