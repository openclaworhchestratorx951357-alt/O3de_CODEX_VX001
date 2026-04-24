from __future__ import annotations

import re

from app.models.prompt_control import PromptRequest
from app.models.prompt_step import PromptPlanStep
from app.services.capability_registry import capability_registry_service
from app.services.editor_runtime_defaults import EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S
from app.services.planners._common import (
    capability_requirement_note,
    contains_any,
    extract_first_path_like_value,
    extract_named_entity,
    extract_quoted_values,
    extract_value_after_phrase,
    make_step,
)

_CREATED_ENTITY_ID_REF = "$step:editor-entity-1.entity_id"


def plan_editor_prompt(
    request: PromptRequest,
) -> tuple[list[PromptPlanStep], list[str], list[str]]:
    prompt_text = request.prompt_text
    wants_entity_create = contains_any(
        prompt_text,
        ["create entity", "spawn entity", "add entity"],
    )
    capabilities = {
        tool: capability_registry_service.get_capability(tool)
        for tool in (
            "editor.session.open",
            "editor.level.open",
            "editor.entity.create",
            "editor.component.add",
        )
    }
    steps: list[PromptPlanStep] = []
    refusals: list[str] = []
    requirements: list[str] = []

    wants_editor = contains_any(
        prompt_text,
        ["editor", "level", "entity", "component"],
    )
    if not wants_editor:
        return steps, refusals, requirements

    session_capability = capabilities["editor.session.open"]
    if session_capability is not None:
        steps.append(
            make_step(
                step_id="editor-session-1",
                capability=session_capability,
                request=request,
                args={
                    "session_mode": "attach",
                    "project_path": request.project_root,
                    "timeout_s": EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S,
                },
                planner_note="Prompt-driven editor flows always begin from an attached editor session request.",
            )
        )
        requirement = capability_requirement_note(session_capability)
        if requirement:
            requirements.append(requirement)

    level_path = None
    if contains_any(prompt_text, ["open level", "load level", "level "]):
        level_path = extract_first_path_like_value(prompt_text) or extract_value_after_phrase(
            prompt_text,
            "level ",
        )
        if level_path:
            level_capability = capabilities["editor.level.open"]
            if level_capability is not None:
                steps.append(
                    make_step(
                        step_id="editor-level-1",
                        capability=level_capability,
                        request=request,
                        args={
                            "level_path": level_path,
                            "make_writable": True,
                            "focus_viewport": True,
                        },
                        depends_on=["editor-session-1"] if session_capability else [],
                    )
                )
                requirement = capability_requirement_note(level_capability)
                if requirement:
                    requirements.append(requirement)
        else:
            refusals.append("editor.level.open requires an explicit level path in the prompt.")

    if wants_entity_create:
        entity_capability = capabilities["editor.entity.create"]
        if entity_capability is not None:
            entity_name = extract_named_entity(prompt_text, "PromptEntity")
            entity_args: dict[str, object] = {"entity_name": entity_name}
            if level_path:
                entity_args["level_path"] = level_path
            depends_on = ["editor-session-1"] if session_capability else []
            if level_path:
                depends_on.append("editor-level-1")
            steps.append(
                make_step(
                    step_id="editor-entity-1",
                    capability=entity_capability,
                    request=request,
                    args=entity_args,
                    depends_on=depends_on,
                )
            )
            requirement = capability_requirement_note(entity_capability)
            if requirement:
                requirements.append(requirement)

    component_matches = re.findall(
        r"(?:add|attach) ([a-z0-9_ -]+?) component",
        prompt_text.lower(),
    )
    if contains_any(prompt_text, ["add component", "attach component"]) or component_matches:
        component_capability = capabilities["editor.component.add"]
        if component_capability is not None:
            entity_id = extract_value_after_phrase(prompt_text, "entity id ")
            if entity_id is None and wants_entity_create:
                entity_id = _CREATED_ENTITY_ID_REF
            elif entity_id is None:
                quoted_values = extract_quoted_values(prompt_text)
                entity_id = quoted_values[0] if quoted_values else None
            component_name = None
            if component_matches:
                normalized_component_name = re.sub(
                    r"^(?:a|an|the)\s+",
                    "",
                    component_matches[0].strip(),
                )
                component_name = normalized_component_name.title() if normalized_component_name else None
            if not entity_id or not component_name:
                refusals.append(
                    "editor.component.add requires either an explicit entity id or a prior create entity step plus a component name in the prompt."
                )
            else:
                component_args: dict[str, object] = {
                    "entity_id": entity_id,
                    "components": [component_name],
                }
                if level_path:
                    component_args["level_path"] = level_path
                depends_on = ["editor-session-1"] if session_capability else []
                if level_path:
                    depends_on.append("editor-level-1")
                planner_note = None
                if entity_id == _CREATED_ENTITY_ID_REF:
                    depends_on.append("editor-entity-1")
                    planner_note = (
                        "Use the entity created by the immediately preceding prompt-authored "
                        "entity creation step."
                    )
                steps.append(
                    make_step(
                        step_id="editor-component-1",
                        capability=component_capability,
                        request=request,
                        args=component_args,
                        depends_on=depends_on,
                        planner_note=planner_note,
                    )
                )
                requirement = capability_requirement_note(component_capability)
                if requirement:
                    requirements.append(requirement)

    return steps, refusals, requirements
