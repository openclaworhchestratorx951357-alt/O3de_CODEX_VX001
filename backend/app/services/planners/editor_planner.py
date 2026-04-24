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
_ADDED_COMPONENT_ID_REF = "$step:editor-component-1.added_component_refs[0].component_id"
_ADMITTED_COMPONENT_PROPERTY_READ_PATHS = {
    "Mesh": "Controller|Configuration|Model Asset",
}


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
            "editor.component.property.get",
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
    planned_component_name: str | None = None
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
                planned_component_name = component_name
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

    wants_property_read = contains_any(
        prompt_text,
        [
            "read back",
            "readback",
            "component/property evidence",
            "property evidence",
            "component property",
            "read component property",
            "inspect component property",
        ],
    )
    if wants_property_read:
        property_capability = capabilities["editor.component.property.get"]
        if property_capability is not None:
            property_path = (
                _ADMITTED_COMPONENT_PROPERTY_READ_PATHS.get(planned_component_name)
                if planned_component_name is not None
                else None
            )
            if property_path is not None:
                property_args: dict[str, object] = {
                    "component_id": _ADDED_COMPONENT_ID_REF,
                    "property_path": property_path,
                }
                if level_path:
                    property_args["level_path"] = level_path
                depends_on = ["editor-component-1"]
                steps.append(
                    make_step(
                        step_id="editor-component-property-1",
                        capability=property_capability,
                        request=request,
                        args=property_args,
                        depends_on=depends_on,
                        planner_note=(
                            "Read back the admitted default verification property from the "
                            "newly added component using the component id returned by the "
                            "preceding component attachment step."
                        ),
                    )
                )
                requirement = capability_requirement_note(property_capability)
                if requirement:
                    requirements.append(requirement)
            elif planned_component_name is not None:
                refusals.append(
                    "editor.component.property.get currently admits chained default property readback only for allowlisted component cases with a proven property-path mapping."
                )

    return steps, refusals, requirements
