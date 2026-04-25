from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
PROOF_HELPER_PATH = REPO_ROOT / "backend" / "runtime" / "prove_live_editor_authoring.py"


def load_proof_module():
    spec = importlib.util.spec_from_file_location(
        "prove_live_editor_authoring",
        PROOF_HELPER_PATH,
    )
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def create_level(project_root: Path, level_name: str) -> None:
    level_dir = project_root / "Levels" / level_name
    level_dir.mkdir(parents=True, exist_ok=True)
    (level_dir / f"{level_name}.prefab").write_text("{}", encoding="utf-8")


def test_select_safe_level_prefers_non_default_test_level(tmp_path):
    module = load_proof_module()
    create_level(tmp_path, "DefaultLevel")
    create_level(tmp_path, "SandboxArena")
    create_level(tmp_path, "TestArena")

    selected = module.select_safe_level(str(tmp_path))

    assert selected["selected_level_path"] == "Levels/TestArena"
    assert selected["selected_safe_name_tokens"] == ["test"]
    assert [candidate["level_path"] for candidate in selected["candidates"]] == [
        "Levels/DefaultLevel",
        "Levels/SandboxArena",
        "Levels/TestArena",
    ]


def test_select_safe_level_rejects_default_only_project(tmp_path):
    module = load_proof_module()
    create_level(tmp_path, "DefaultLevel")

    with pytest.raises(module.ProofError, match="Only DefaultLevel"):
        module.select_safe_level(str(tmp_path))


def test_build_prompt_request_allows_unseeded_workspace_and_executor_ids(tmp_path):
    module = load_proof_module()

    prompt_payload, _ = module.build_prompt_request(
        run_label="20260424-010203",
        project_root=str(tmp_path),
        engine_root="C:/engine",
        prompt_id="proof-prompt-1",
        workspace_id=None,
        executor_id=None,
        level_path="Levels/TestArena",
    )

    assert prompt_payload["workspace_id"] is None
    assert prompt_payload["executor_id"] is None


def test_require_prompt_plan_accepts_expected_composed_chain(tmp_path):
    module = load_proof_module()
    project_root = str(tmp_path)
    level_path = "Levels/TestArena"
    entity_name = "CodexProofEntity_123"
    prompt_payload, _ = module.build_prompt_request(
        run_label="20260424-010203",
        project_root=project_root,
        engine_root="C:/engine",
        prompt_id="proof-prompt-1",
        workspace_id="workspace-live-proof",
        executor_id="executor-live-proof",
        level_path=level_path,
    )

    session_record = {
        "status": "planned",
        "refused_capabilities": [],
        "plan": {
            "steps": [
                {
                    "step_id": module.EDITOR_SESSION_STEP_ID,
                    "tool": "editor.session.open",
                    "args": {
                        "session_mode": "attach",
                        "project_path": project_root,
                        "timeout_s": prompt_payload["operator_note"] and 180,
                    },
                },
                {
                    "step_id": module.EDITOR_LEVEL_STEP_ID,
                    "tool": "editor.level.open",
                    "args": {
                        "level_path": level_path,
                        "make_writable": True,
                        "focus_viewport": True,
                    },
                },
                {
                    "step_id": module.EDITOR_ENTITY_STEP_ID,
                    "tool": "editor.entity.create",
                    "args": {
                        "entity_name": entity_name,
                        "level_path": level_path,
                    },
                },
                {
                    "step_id": module.EDITOR_COMPONENT_STEP_ID,
                    "tool": "editor.component.add",
                    "args": {
                        "entity_id": module.CREATED_ENTITY_ID_REF,
                        "components": [module.PROOF_COMPONENT],
                        "level_path": level_path,
                    },
                },
                {
                    "step_id": module.EDITOR_COMPONENT_PROPERTY_STEP_ID,
                    "tool": "editor.component.property.get",
                    "args": {
                        "component_id": module.ADDED_COMPONENT_ID_REF,
                        "property_path": module.PROOF_PROPERTY_PATH,
                        "level_path": level_path,
                    },
                },
            ]
        },
    }

    module.require_prompt_plan(
        session_record,
        project_root=project_root,
        level_path=level_path,
        entity_name=entity_name,
    )


def test_require_prompt_plan_rejects_non_chained_property_read(tmp_path):
    module = load_proof_module()
    project_root = str(tmp_path)
    level_path = "Levels/TestArena"

    session_record = {
        "status": "planned",
        "refused_capabilities": [],
        "plan": {
            "steps": [
                {
                    "step_id": module.EDITOR_SESSION_STEP_ID,
                    "tool": "editor.session.open",
                    "args": {
                        "session_mode": "attach",
                        "project_path": project_root,
                        "timeout_s": 180,
                    },
                },
                {
                    "step_id": module.EDITOR_LEVEL_STEP_ID,
                    "tool": "editor.level.open",
                    "args": {
                        "level_path": level_path,
                        "make_writable": True,
                        "focus_viewport": True,
                    },
                },
                {
                    "step_id": module.EDITOR_ENTITY_STEP_ID,
                    "tool": "editor.entity.create",
                    "args": {
                        "entity_name": "CodexProofEntity_123",
                        "level_path": level_path,
                    },
                },
                {
                    "step_id": module.EDITOR_COMPONENT_STEP_ID,
                    "tool": "editor.component.add",
                    "args": {
                        "entity_id": module.CREATED_ENTITY_ID_REF,
                        "components": [module.PROOF_COMPONENT],
                        "level_path": level_path,
                    },
                },
                {
                    "step_id": module.EDITOR_COMPONENT_PROPERTY_STEP_ID,
                    "tool": "editor.component.property.get",
                    "args": {
                        "component_id": "literal-component-id",
                        "property_path": module.PROOF_PROPERTY_PATH,
                        "level_path": level_path,
                    },
                },
            ]
        },
    }

    with pytest.raises(module.ProofError, match="did not chain the added component id output"):
        module.require_prompt_plan(
            session_record,
            project_root=project_root,
            level_path=level_path,
            entity_name="CodexProofEntity_123",
        )
