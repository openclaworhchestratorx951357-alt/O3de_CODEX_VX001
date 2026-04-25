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
_ENTITY_EXISTS_STEP_ID = "editor-entity-exists-1"


def _is_path_like(value: str) -> bool:
    return "/" in value or "\\" in value or "." in value


def _extract_entity_exists_lookup(prompt_text: str) -> dict[str, object] | None:
    entity_id = extract_value_after_phrase(prompt_text, "entity id ")
    if entity_id:
        return {"entity_id": entity_id}

    for phrase in ("entity named ", "named ", "called "):
        entity_name = extract_value_after_phrase(prompt_text, phrase)
        if entity_name and not _is_path_like(entity_name):
            return {"entity_name": entity_name}

    for quoted_value in extract_quoted_values(prompt_text):
        if not _is_path_like(quoted_value):
            return {"entity_name": quoted_value}

    match = re.search(
        r"(?:entity|object)\s+([A-Za-z0-9_ -]+?)\s+"
        r"(?:exists|exist|is present|is loaded|is in)",
        prompt_text,
        flags=re.IGNORECASE,
    )
    if match:
        entity_name = match.group(1).strip(" :,-")
        if entity_name and not _is_path_like(entity_name):
            return {"entity_name": entity_name}

    return None


def plan_editor_prompt(
    request: PromptRequest,
) -> tuple[list[PromptPlanStep], list[str], list[str]]:
    prompt_text = request.prompt_text
    wants_entity_create = contains_any(
        prompt_text,
        ["create entity", "spawn entity", "add entity"],
    )
    wants_entity_exists = contains_any(
        prompt_text,
        [
            "check entity exists",
            "entity exists",
            "verify entity",
            "read entity existence",
            "inspect entity",
            "does entity",
        ],
    )
    capabilities = {
        tool: capability_registry_service.get_capability(tool)
        for tool in (
            "editor.session.open",
            "editor.level.open",
            "editor.entity.create",
            "editor.entity.exists",
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
                read_only_level_open = wants_entity_exists and not wants_entity_create
                steps.append(
                    make_step(
                        step_id="editor-level-1",
                        capability=level_capability,
                        request=request,
                        args={
                            "level_path": level_path,
                            "make_writable": not read_only_level_open,
                            "focus_viewport": not read_only_level_open,
                        },
                        depends_on=["editor-session-1"] if session_capability else [],
                    )
                )
                requirement = capability_requirement_note(level_capability)
                if requirement:
                    requirements.append(requirement)
        else:
            refusals.append("editor.level.open requires an explicit level path in the prompt.")

    if wants_entity_exists and not wants_entity_create:
        entity_exists_capability = capabilities["editor.entity.exists"]
        entity_exists_args = _extract_entity_exists_lookup(prompt_text)
        if entity_exists_capability is not None and entity_exists_args is not None:
            if level_path:
                entity_exists_args["level_path"] = level_path
            depends_on = ["editor-session-1"] if session_capability else []
            if level_path:
                depends_on.append("editor-level-1")
            steps.append(
                make_step(
                    step_id=_ENTITY_EXISTS_STEP_ID,
                    capability=entity_exists_capability,
                    request=request,
                    args=entity_exists_args,
                    depends_on=depends_on,
                    planner_note=(
                        "Use the admitted read-only exact entity id or exact entity-name "
                        "lookup without broad scene discovery or editor mutation."
                    ),
                )
            )
            requirement = capability_requirement_note(entity_exists_capability)
            if requirement:
                requirements.append(requirement)
        else:
            refusals.append(
                "editor.entity.exists requires exactly one explicit entity id or exact entity name in the prompt."
            )
        return steps, refusals, requirements

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
