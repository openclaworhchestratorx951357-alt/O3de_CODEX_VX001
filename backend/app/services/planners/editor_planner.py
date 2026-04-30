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
_ADDED_COMPONENT_ID_PROVENANCE_REF = (
    "$step:editor-component-1.added_component_refs[0].component_id_provenance"
)
_ADDED_COMPONENT_RESTORE_BOUNDARY_REF = "$step:editor-component-1.restore_boundary_id"
_FOUND_COMPONENT_ID_REF = "$step:editor-component-find-1.component_id"
_CAMERA_BOOL_WRITE_CAPABILITY = (
    "editor.component.property.write.camera_bool_make_active_on_activation"
)
_CAMERA_BOOL_RESTORE_CAPABILITY = (
    "editor.component.property.restore.camera_bool_make_active_on_activation"
)
_CAMERA_BOOL_WRITE_PROPERTY_PATH = (
    "Controller|Configuration|Make active camera on activation?"
)
_CAMERA_BOOL_WRITE_BEFORE_VALUE_REF = "$step:editor-camera-bool-before-1.value"
_CAMERA_BOOL_RESTORE_CURRENT_VALUE_REF = "$step:editor-camera-bool-current-1.value"
_CAMERA_SCALAR_WRITE_TERMS = (
    "field of view",
    "near clip",
    "far clip",
    "clip distance",
    "frustum width",
)
_ADMITTED_COMPONENT_PROPERTY_READ_PATHS = {
    "Camera": _CAMERA_BOOL_WRITE_PROPERTY_PATH,
    "Mesh": "Controller|Configuration|Model Asset",
}
_ADMITTED_COMPONENT_TARGET_NAMES = ("Camera", "Comment", "Mesh")
_ENTITY_EXISTS_STEP_ID = "editor-entity-exists-1"
_COMPONENT_FIND_STEP_ID = "editor-component-find-1"
CANDIDATE_EDITOR_MUTATION_REFUSAL = "editor.candidate_mutation.unsupported"
EDITOR_PROPERTY_DISCOVERY_REFUSAL = "editor.component.property.list.unsupported"
EDITOR_GENERIC_RESTORE_REFUSAL = "editor.restore.unsupported"
_EDITOR_PLACEMENT_PROOF_ONLY_CAPABILITY = "editor.placement.proof_only"
_CANDIDATE_EDITOR_MUTATION_REQUIREMENT = (
    "Candidate editor mutation surfaces require explicit backup, restore/reload "
    "verification, post-restore absence or readback verification, and "
    "operator-visible review before prompt admission."
)
_EDITOR_PROPERTY_DISCOVERY_REQUIREMENT = (
    "Component property target discovery requires a dedicated typed read-only "
    "property-list packet with exact entity, component, level, and bridge "
    "evidence before prompt admission."
)
_CAMERA_BOOL_WRITE_REQUIREMENT = (
    "The admitted Camera bool write corridor requires the exact Camera component, "
    "the exact Controller|Configuration|Make active camera on activation? path, "
    "a bool value, live component id provenance from admitted editor.component.add, "
    "approval, before/write/after readback evidence, and a loaded-level restore "
    "boundary. It does not admit generic property writes."
)
_CAMERA_BOOL_RESTORE_REQUIREMENT = (
    "The admitted Camera bool restore corridor requires the exact Camera component, "
    "the exact Controller|Configuration|Make active camera on activation? path, "
    "a recorded bool before_value, live component id provenance from admitted "
    "editor.component.add, approval, current/restore/readback evidence, and no "
    "generic restore or generalized undo."
)
_GENERIC_RESTORE_REQUIREMENT = (
    "Restore or undo prompts require a separately admitted exact corridor with "
    "recorded before-value evidence; generic restore and generalized undo are not "
    "admitted."
)
_EDITOR_PLACEMENT_PROOF_ONLY_REQUIREMENT = (
    "editor.placement.proof_only requires an explicit bounded request with "
    "candidate id/label, staged source path, target level/entity/component, "
    "stage-write evidence/readback references, and preserves fail-closed "
    "non-admission execution posture."
)
_CANDIDATE_EDITOR_MUTATION_PATTERNS = (
    re.compile(
        r"\b(?:delete|destroy|erase|remove)\s+"
        r"(?:the\s+|an?\s+)?(?:entity|object)\b"
    ),
    re.compile(r"\b(?:parent|reparent)\s+(?:the\s+|an?\s+)?(?:entity|object)\b"),
    re.compile(r"\battach\s+(?:the\s+|an?\s+)?(?:entity|object)\s+(?:to|under)\b"),
    re.compile(
        r"\b(?:make|set)\s+(?:the\s+|an?\s+)?"
        r"(?:entity|object).*\b(?:child|parent)\b"
    ),
    re.compile(
        r"\b(?:instantiate|spawn|place|create|open)\s+"
        r"(?:the\s+|an?\s+)?prefab\b"
    ),
    re.compile(r"\bprefab\b"),
    re.compile(
        r"\b(?:move|translate|rotate|scale|place|position)\s+"
        r"(?:the\s+|an?\s+)?(?:entity|object)\b"
    ),
    re.compile(r"\b(?:set|update|change|modify)\s+transform\b"),
    re.compile(r"\b(?:hide|show|lock|unlock|activate|deactivate)\s+(?:the\s+|an?\s+)?(?:entity|object)\b"),
    re.compile(r"\b(?:enable|disable|activate|deactivate)\s+.+\bcomponent\b"),
    re.compile(
        r"\b(?:set|update|write|change|modify|toggle)\s+"
        r"(?:the\s+)?(?:component\s+)?property\b"
    ),
    re.compile(r"\b(?:set|update|write|change|modify|toggle)\s+.+\bproperty\b"),
    re.compile(r"\b(?:set|update|write|change|modify|assign)\s+.+\bmodel asset\b"),
    re.compile(
        r"\b(?:remove|detach)\s+(?:the\s+|an?\s+)?"
        r"[a-z0-9_ -]*component\b"
    ),
    re.compile(r"\b(?:set|assign|update|change|modify)\s+.*\bmaterial\b"),
    re.compile(r"\b(?:set|assign|update|change|modify)\s+.*\brender\s+setting\b"),
    re.compile(r"\b(?:set|assign|update|change|modify)\s+.*\bbuild\s+setting\b"),
    re.compile(r"\b(?:set|assign|update|change|modify)\s+.*\btiaf\s+state\b"),
    re.compile(r"\barbitrary\s+editor\s+(?:python|command|script)\b"),
    re.compile(r"\bexecute\s+(?:an?\s+)?editor\s+(?:python|command|script)\b"),
    re.compile(r"\bexecute\s+(?:an?\s+)?(?:python|command|script)\s+in\s+the\s+editor\b"),
    re.compile(r"\brun\s+(?:an?\s+)?(?:python|editor\s+script|script)\s+in\s+the\s+editor\b"),
    re.compile(r"\brun\s+(?:an?\s+)?editor\s+(?:python|command|script)\b"),
    re.compile(r"\bpress\s+.+\bin\s+the\s+editor\b"),
    re.compile(r"\b(?:use|press)\s+(?:an?\s+)?hotkey\b"),
    re.compile(r"\bclick\s+.+\b(?:toolbar|viewport|button|menu)\b"),
    re.compile(r"\b(?:select|duplicate|rename)\s+(?:the\s+|an?\s+)?(?:entity|object)\b"),
)
_EDITOR_PROPERTY_DISCOVERY_PATTERNS = (
    re.compile(
        r"\b(?:list|show|discover|enumerate)\s+(?:the\s+)?"
        r"(?:component\s+)?propert(?:y|ies|y\s+paths|ies\s+paths)\b"
    ),
    re.compile(r"\bcomponent\s+property\s+(?:list|paths|path\s+list)\b"),
    re.compile(r"\bwhat\s+(?:component\s+)?propert(?:y|ies)\b"),
)


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


def _extract_component_name(prompt_text: str) -> str | None:
    normalized_prompt = prompt_text.lower()
    for component_name in _ADMITTED_COMPONENT_TARGET_NAMES:
        if re.search(
            rf"\b{re.escape(component_name.lower())}\s+component\b",
            normalized_prompt,
        ):
            return component_name

    match = re.search(
        r"\b(?:component|component type|component named)\s+([A-Za-z0-9_ -]+)",
        prompt_text,
        flags=re.IGNORECASE,
    )
    if match:
        raw_component_name = match.group(1).strip(" :,-.")
        for component_name in _ADMITTED_COMPONENT_TARGET_NAMES:
            if raw_component_name.casefold() == component_name.casefold():
                return component_name
    return None


def _extract_component_find_args(prompt_text: str) -> dict[str, object] | None:
    component_name = _extract_component_name(prompt_text)
    if component_name is None:
        return None

    args: dict[str, object] = {"component_name": component_name}
    entity_id = extract_value_after_phrase(prompt_text, "entity id ")
    if entity_id:
        args["entity_id"] = entity_id
        return args

    for phrase in ("entity named ", "entity called "):
        entity_name = extract_value_after_phrase(prompt_text, phrase)
        if entity_name and not _is_path_like(entity_name):
            args["entity_name"] = entity_name
            return args

    quoted_values = [value for value in extract_quoted_values(prompt_text) if not _is_path_like(value)]
    if quoted_values:
        args["entity_name"] = quoted_values[0]
        return args
    return None


def _requires_candidate_editor_mutation_admission(prompt_text: str) -> bool:
    normalized = prompt_text.lower()
    return any(
        pattern.search(normalized) is not None
        for pattern in _CANDIDATE_EDITOR_MUTATION_PATTERNS
    )


def _extract_editor_placement_proof_only_args(
    prompt_text: str,
) -> dict[str, object] | None:
    normalized = prompt_text.lower()
    has_proof_only_marker = "proof-only" in normalized or "proof only" in normalized
    has_editor_or_asset_forge_context = (
        "editor" in normalized
        or "asset forge" in normalized
        or "asset_forge" in normalized
    )
    if (
        not has_editor_or_asset_forge_context
        or "placement" not in normalized
        or not has_proof_only_marker
    ):
        return None

    def _extract(*phrases: str) -> str | None:
        for phrase in phrases:
            value = extract_value_after_phrase(prompt_text, phrase)
            if value:
                return value
        return None

    candidate_id = _extract("candidate_id ", "candidate id ")
    candidate_label = _extract(
        "candidate_label ",
        "candidate label ",
        "labeled ",
    )
    staged_source_relative_path = _extract(
        "staged_source_relative_path ",
        "staged source relative path ",
        "staged generated asset path ",
        "staged generated asset ",
        "staged asset path ",
        "staged asset ",
        "staged source path ",
        "staged source ",
    )
    target_level_relative_path = _extract(
        "target_level_relative_path ",
        "target level relative path ",
        "target level path ",
        "target level ",
    )
    target_entity_name = _extract(
        "target_entity_name ",
        "target entity name ",
        "target entity ",
        "entity named ",
    )
    stage_write_evidence_reference = _extract(
        "stage_write_evidence_reference ",
        "stage-write evidence reference ",
        "stage-write evidence ",
        "stage write evidence reference ",
        "stage write evidence ",
    )
    stage_write_readback_reference = _extract(
        "stage_write_readback_reference ",
        "stage-write readback reference ",
        "stage-write readback ",
        "stage write readback reference ",
        "stage write readback ",
    )

    required_values = (
        candidate_id,
        candidate_label,
        staged_source_relative_path,
        target_level_relative_path,
        target_entity_name,
        stage_write_evidence_reference,
        stage_write_readback_reference,
    )
    if any(value is None for value in required_values):
        return None

    target_component = _extract("target_component ", "target component ") or "Mesh"
    approval_state_raw = _extract("approval_state ", "approval state ")
    if approval_state_raw is None:
        approval_state_match = re.search(
            r"\bapproval\s+(approved|not[- ]approved)\b",
            normalized,
        )
        if approval_state_match:
            approval_state_raw = approval_state_match.group(1)
    if approval_state_raw is None:
        approval_state_raw = "not-approved"
    approval_state_normalized = approval_state_raw.strip().lower()
    if approval_state_normalized not in {"approved", "not-approved"}:
        if approval_state_normalized == "not approved":
            approval_state_normalized = "not-approved"
        else:
            approval_state_normalized = "not-approved"
    if approval_state_normalized not in {"approved", "not-approved"}:
        approval_state_normalized = "not-approved"
    approval_note = _extract("approval_note ", "approval note ") or ""
    approval_session_id = _extract("approval_session_id ", "approval session id ")
    readback_status_raw = (
        _extract(
            "stage_write_readback_status ",
            "stage-write readback status ",
            "stage write readback status ",
            "readback status ",
        )
        or "succeeded"
    )
    readback_status_normalized = (
        readback_status_raw.strip().lower().replace("-", "_").replace(" ", "_")
    )
    if readback_status_normalized == "notrun":
        readback_status_normalized = "not_run"
    if readback_status_normalized not in {"not_run", "blocked", "failed", "succeeded"}:
        readback_status_normalized = "not_run"

    args: dict[str, object] = {
        "candidate_id": candidate_id,
        "candidate_label": candidate_label,
        "staged_source_relative_path": staged_source_relative_path,
        "target_level_relative_path": target_level_relative_path,
        "target_entity_name": target_entity_name,
        "target_component": target_component,
        "approval_state": approval_state_normalized,
        "approval_note": approval_note,
        "stage_write_corridor_name": "asset_forge.o3de.stage_write.v1",
        "stage_write_evidence_reference": stage_write_evidence_reference,
        "stage_write_readback_reference": stage_write_readback_reference,
        "stage_write_readback_status": readback_status_normalized,
    }
    if approval_session_id:
        args["approval_session_id"] = approval_session_id
    return args


def _requires_property_discovery_admission(prompt_text: str) -> bool:
    normalized = prompt_text.lower()
    return any(
        pattern.search(normalized) is not None
        for pattern in _EDITOR_PROPERTY_DISCOVERY_PATTERNS
    )


def _requires_camera_scalar_write_admission(prompt_text: str) -> bool:
    normalized = prompt_text.lower()
    return (
        "camera" in normalized
        and any(term in normalized for term in _CAMERA_SCALAR_WRITE_TERMS)
        and contains_any(
            prompt_text,
            ["set", "write", "change", "update", "modify", "toggle"],
        )
    )


def _requires_generic_restore_admission(prompt_text: str) -> bool:
    normalized = prompt_text.lower()
    return re.search(r"\b(?:undo|restore|revert|rollback)\b", normalized) is not None


def _extract_requested_bool_value(prompt_text: str) -> bool | None:
    normalized = prompt_text.lower()
    match = re.search(r"\b(?:to|as|value)\s+(true|false)\b", normalized)
    if match is None:
        match = re.search(r"\b(true|false)\b", normalized)
    if match is None:
        return None
    return match.group(1) == "true"


def _extract_camera_bool_write_request(prompt_text: str) -> dict[str, object] | None:
    normalized = prompt_text.lower()
    if "camera" not in normalized:
        return None
    if (
        _CAMERA_BOOL_WRITE_PROPERTY_PATH.lower() not in normalized
        and "make active camera on activation" not in normalized
        and "make-active-on-activation" not in normalized
        and "active camera on activation" not in normalized
    ):
        return None
    if not contains_any(prompt_text, ["set", "write", "change", "update", "modify"]):
        return None
    requested_value = _extract_requested_bool_value(prompt_text)
    if requested_value is None:
        return None
    return {"value": requested_value}


def _extract_camera_bool_restore_request(prompt_text: str) -> dict[str, object] | None:
    normalized = prompt_text.lower()
    if "camera" not in normalized:
        return None
    if (
        _CAMERA_BOOL_WRITE_PROPERTY_PATH.lower() not in normalized
        and "make active camera on activation" not in normalized
        and "make-active-on-activation" not in normalized
        and "active camera on activation" not in normalized
    ):
        return None
    if not contains_any(prompt_text, ["restore", "revert"]):
        return None
    before_value = _extract_requested_bool_value(prompt_text)
    if before_value is None:
        return {"missing_before_value": True}
    return {"before_value": before_value}


def _extract_camera_bool_read_request(prompt_text: str) -> dict[str, object] | None:
    normalized = prompt_text.lower()
    if "camera" not in normalized:
        return None
    if (
        _CAMERA_BOOL_WRITE_PROPERTY_PATH.lower() not in normalized
        and "make active camera on activation" not in normalized
        and "make-active-on-activation" not in normalized
        and "active camera on activation" not in normalized
    ):
        return None
    if contains_any(prompt_text, ["set", "write", "change", "update", "modify", "toggle"]):
        return None
    if not contains_any(
        prompt_text,
        ["read", "read back", "readback", "inspect", "show", "current value", "what is", "get"],
    ):
        return None
    return {"property_path": _CAMERA_BOOL_WRITE_PROPERTY_PATH}


def _extract_camera_bool_read_find_args(prompt_text: str) -> dict[str, object] | None:
    args: dict[str, object] = {"component_name": "Camera"}
    entity_id = extract_value_after_phrase(prompt_text, "entity id ")
    if entity_id:
        args["entity_id"] = entity_id
        return args

    for phrase in ("entity named ", "entity called "):
        entity_name = extract_value_after_phrase(prompt_text, phrase)
        if entity_name and not _is_path_like(entity_name):
            args["entity_name"] = entity_name
            return args

    quoted_values = [
        value for value in extract_quoted_values(prompt_text) if not _is_path_like(value)
    ]
    if quoted_values:
        args["entity_name"] = quoted_values[0]
        return args
    return None


def _admitted_component_property_read_path(
    component_name: str | None,
    *,
    camera_bool_read_request: dict[str, object] | None,
) -> str | None:
    if component_name is None:
        return None
    if component_name == "Camera" and camera_bool_read_request is None:
        return None
    return _ADMITTED_COMPONENT_PROPERTY_READ_PATHS.get(component_name)


def _requests_same_chain_camera_component(prompt_text: str) -> bool:
    return re.search(
        r"\b(?:add|attach)\s+(?:a|an|the)?\s*camera\s+component\b",
        prompt_text,
        flags=re.IGNORECASE,
    ) is not None


def plan_editor_prompt(
    request: PromptRequest,
) -> tuple[list[PromptPlanStep], list[str], list[str]]:
    prompt_text = request.prompt_text
    camera_bool_write_request = _extract_camera_bool_write_request(prompt_text)
    camera_bool_restore_request = _extract_camera_bool_restore_request(prompt_text)
    camera_bool_read_request = _extract_camera_bool_read_request(prompt_text)
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
    wants_component_find = contains_any(
        prompt_text,
        [
            "find component",
            "locate component",
            "discover component target",
            "bind component target",
            "find mesh component",
            "locate mesh component",
            "find camera component",
            "find comment component",
        ],
    ) or camera_bool_read_request is not None
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
    ) or camera_bool_read_request is not None
    capabilities = {
        tool: capability_registry_service.get_capability(tool)
        for tool in (
            "editor.session.open",
            "editor.level.open",
            "editor.entity.create",
            "editor.entity.exists",
            "editor.component.add",
            "editor.component.find",
            "editor.component.property.get",
            _EDITOR_PLACEMENT_PROOF_ONLY_CAPABILITY,
            _CAMERA_BOOL_WRITE_CAPABILITY,
            _CAMERA_BOOL_RESTORE_CAPABILITY,
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

    proof_only_candidate_args = _extract_editor_placement_proof_only_args(prompt_text)
    if proof_only_candidate_args is not None:
        proof_only_capability = capabilities[_EDITOR_PLACEMENT_PROOF_ONLY_CAPABILITY]
        if proof_only_capability is None:
            refusals.append(
                "editor.placement.proof_only capability metadata is unavailable in this packet."
            )
            requirements.append(_EDITOR_PLACEMENT_PROOF_ONLY_REQUIREMENT)
            return steps, refusals, requirements
        steps.append(
            make_step(
                step_id="editor-placement-proof-only-1",
                capability=proof_only_capability,
                request=request,
                args=proof_only_candidate_args,
                planner_note=(
                    "Create only a bounded proof-only placement candidate record; "
                    "do not admit placement runtime execution or broad mutation."
                ),
            )
        )
        requirement = capability_requirement_note(proof_only_capability)
        if requirement:
            requirements.append(requirement)
        requirements.append(_EDITOR_PLACEMENT_PROOF_ONLY_REQUIREMENT)
        return steps, refusals, requirements

    if camera_bool_write_request is not None and not (
        wants_entity_create and _requests_same_chain_camera_component(prompt_text)
    ):
        refusals.append(
            f"{_CAMERA_BOOL_WRITE_CAPABILITY} requires a same-chain temporary "
            "entity plus admitted Camera component add before the exact bool write."
        )
        requirements.append(_CAMERA_BOOL_WRITE_REQUIREMENT)
        return steps, refusals, requirements

    if camera_bool_restore_request is not None and camera_bool_restore_request.get(
        "missing_before_value"
    ):
        refusals.append(
            f"{_CAMERA_BOOL_RESTORE_CAPABILITY} requires recorded bool "
            "before_value evidence in the prompt."
        )
        requirements.append(_CAMERA_BOOL_RESTORE_REQUIREMENT)
        return steps, refusals, requirements

    if camera_bool_restore_request is not None and not (
        wants_entity_create and _requests_same_chain_camera_component(prompt_text)
    ):
        refusals.append(
            f"{_CAMERA_BOOL_RESTORE_CAPABILITY} requires a same-chain temporary "
            "entity plus admitted Camera component add and recorded before_value "
            "evidence before the exact bool restore."
        )
        requirements.append(_CAMERA_BOOL_RESTORE_REQUIREMENT)
        return steps, refusals, requirements

    if (
        _requires_generic_restore_admission(prompt_text)
        and camera_bool_restore_request is None
    ):
        refusals.append(EDITOR_GENERIC_RESTORE_REFUSAL)
        requirements.append(_GENERIC_RESTORE_REQUIREMENT)
        return steps, refusals, requirements

    if (
        (
            _requires_candidate_editor_mutation_admission(prompt_text)
            or _requires_camera_scalar_write_admission(prompt_text)
        )
        and camera_bool_write_request is None
        and camera_bool_restore_request is None
    ):
        refusals.append(CANDIDATE_EDITOR_MUTATION_REFUSAL)
        requirements.append(_CANDIDATE_EDITOR_MUTATION_REQUIREMENT)
        return steps, refusals, requirements

    if _requires_property_discovery_admission(prompt_text):
        refusals.append(EDITOR_PROPERTY_DISCOVERY_REFUSAL)
        requirements.append(_EDITOR_PROPERTY_DISCOVERY_REQUIREMENT)
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
                read_only_level_open = (
                    wants_entity_exists or wants_component_find
                ) and not wants_entity_create
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

    if wants_component_find and not wants_entity_create:
        component_find_capability = capabilities["editor.component.find"]
        property_capability = capabilities["editor.component.property.get"]
        component_find_args = _extract_component_find_args(prompt_text)
        if component_find_args is None and camera_bool_read_request is not None:
            component_find_args = _extract_camera_bool_read_find_args(prompt_text)
        if component_find_capability is not None and component_find_args is not None:
            if level_path:
                component_find_args["level_path"] = level_path
            planned_component_name = component_find_args.get("component_name")
            planned_component_name = (
                planned_component_name if isinstance(planned_component_name, str) else None
            )
            depends_on = ["editor-session-1"] if session_capability else []
            if level_path:
                depends_on.append("editor-level-1")
            steps.append(
                make_step(
                    step_id=_COMPONENT_FIND_STEP_ID,
                    capability=component_find_capability,
                    request=request,
                    args=component_find_args,
                    depends_on=depends_on,
                    planner_note=(
                        "Use the admitted read-only live component target-binding "
                        "path for one exact entity and one allowlisted component; "
                        "do not rely on prefab-derived component ids."
                    ),
                )
            )
            requirement = capability_requirement_note(component_find_capability)
            if requirement:
                requirements.append(requirement)
            property_path = _admitted_component_property_read_path(
                planned_component_name,
                camera_bool_read_request=camera_bool_read_request,
            )
            if wants_property_read and property_capability is not None and property_path:
                property_args: dict[str, object] = {
                    "component_id": _FOUND_COMPONENT_ID_REF,
                    "property_path": property_path,
                }
                if level_path:
                    property_args["level_path"] = level_path
                steps.append(
                    make_step(
                        step_id="editor-component-property-1",
                        capability=property_capability,
                        request=request,
                        args=property_args,
                        depends_on=[_COMPONENT_FIND_STEP_ID],
                        planner_note=(
                            "Read back the admitted default verification property using "
                            "the live component id returned by the preceding target-binding "
                            "step; do not list properties or rely on prefab-derived ids."
                        ),
                    )
                )
                requirement = capability_requirement_note(property_capability)
                if requirement:
                    requirements.append(requirement)
            elif wants_property_read and planned_component_name is not None:
                refusals.append(
                    "editor.component.property.get currently admits target-bound readback only for allowlisted component cases with a proven property-path mapping."
                )
        else:
            refusals.append(
                "editor.component.find requires one allowlisted component name plus exactly one explicit entity id or exact entity name."
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
            component_name = _extract_component_name(prompt_text)
            if component_name is None and component_matches:
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

    if camera_bool_write_request is not None:
        property_capability = capabilities["editor.component.property.get"]
        write_capability = capabilities[_CAMERA_BOOL_WRITE_CAPABILITY]
        if (
            planned_component_name == "Camera"
            and property_capability is not None
            and write_capability is not None
        ):
            read_args: dict[str, object] = {
                "component_id": _ADDED_COMPONENT_ID_REF,
                "property_path": _CAMERA_BOOL_WRITE_PROPERTY_PATH,
            }
            if level_path:
                read_args["level_path"] = level_path
            steps.append(
                make_step(
                    step_id="editor-camera-bool-before-1",
                    capability=property_capability,
                    request=request,
                    args=read_args,
                    depends_on=["editor-component-1"],
                    planner_note=(
                        "Pre-read the exact admitted Camera bool property before "
                        "the approval-gated write."
                    ),
                )
            )
            write_args: dict[str, object] = {
                "component_name": "Camera",
                "component_id": _ADDED_COMPONENT_ID_REF,
                "component_id_provenance": _ADDED_COMPONENT_ID_PROVENANCE_REF,
                "property_path": _CAMERA_BOOL_WRITE_PROPERTY_PATH,
                "value": camera_bool_write_request["value"],
                "expected_current_value": _CAMERA_BOOL_WRITE_BEFORE_VALUE_REF,
                "restore_boundary_id": _ADDED_COMPONENT_RESTORE_BOUNDARY_REF,
            }
            if level_path:
                write_args["level_path"] = level_path
            steps.append(
                make_step(
                    step_id="editor-camera-bool-write-1",
                    capability=write_capability,
                    request=request,
                    args=write_args,
                    depends_on=["editor-camera-bool-before-1"],
                    planner_note=(
                        "Write only the exact admitted Camera bool property using "
                        "the live component id and restore boundary returned by "
                        "the preceding admitted Camera component add step."
                    ),
                )
            )
            after_args = dict(read_args)
            steps.append(
                make_step(
                    step_id="editor-camera-bool-after-1",
                    capability=property_capability,
                    request=request,
                    args=after_args,
                    depends_on=["editor-camera-bool-write-1"],
                    planner_note=(
                        "Post-read the exact admitted Camera bool property to "
                        "verify the requested value."
                    ),
                )
            )
            for capability in (property_capability, write_capability):
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
        else:
            refusals.append(
                f"{_CAMERA_BOOL_WRITE_CAPABILITY} requires an admitted Camera "
                "component add step in the same prompt chain."
            )
            requirements.append(_CAMERA_BOOL_WRITE_REQUIREMENT)

    if camera_bool_restore_request is not None:
        property_capability = capabilities["editor.component.property.get"]
        restore_capability = capabilities[_CAMERA_BOOL_RESTORE_CAPABILITY]
        if (
            planned_component_name == "Camera"
            and property_capability is not None
            and restore_capability is not None
        ):
            read_args: dict[str, object] = {
                "component_id": _ADDED_COMPONENT_ID_REF,
                "property_path": _CAMERA_BOOL_WRITE_PROPERTY_PATH,
            }
            if level_path:
                read_args["level_path"] = level_path
            steps.append(
                make_step(
                    step_id="editor-camera-bool-current-1",
                    capability=property_capability,
                    request=request,
                    args=read_args,
                    depends_on=["editor-component-1"],
                    planner_note=(
                        "Read the exact Camera bool property immediately before "
                        "the approval-gated restore."
                    ),
                )
            )
            restore_args: dict[str, object] = {
                "component_name": "Camera",
                "component_id": _ADDED_COMPONENT_ID_REF,
                "component_id_provenance": _ADDED_COMPONENT_ID_PROVENANCE_REF,
                "property_path": _CAMERA_BOOL_WRITE_PROPERTY_PATH,
                "before_value": camera_bool_restore_request["before_value"],
                "expected_current_value": _CAMERA_BOOL_RESTORE_CURRENT_VALUE_REF,
                "restore_boundary_id": _ADDED_COMPONENT_RESTORE_BOUNDARY_REF,
            }
            if level_path:
                restore_args["level_path"] = level_path
            steps.append(
                make_step(
                    step_id="editor-camera-bool-restore-1",
                    capability=restore_capability,
                    request=request,
                    args=restore_args,
                    depends_on=["editor-camera-bool-current-1"],
                    planner_note=(
                        "Restore only the exact admitted Camera bool property to "
                        "the recorded before_value using the live component id and "
                        "restore boundary returned by admitted Camera component add."
                    ),
                )
            )
            restored_args = dict(read_args)
            steps.append(
                make_step(
                    step_id="editor-camera-bool-restored-1",
                    capability=property_capability,
                    request=request,
                    args=restored_args,
                    depends_on=["editor-camera-bool-restore-1"],
                    planner_note=(
                        "Post-read the exact admitted Camera bool property to "
                        "verify the restored value."
                    ),
                )
            )
            for capability in (property_capability, restore_capability):
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
        else:
            refusals.append(
                f"{_CAMERA_BOOL_RESTORE_CAPABILITY} requires an admitted Camera "
                "component add step in the same prompt chain."
            )
            requirements.append(_CAMERA_BOOL_RESTORE_REQUIREMENT)

    if wants_property_read:
        property_capability = capabilities["editor.component.property.get"]
        if property_capability is not None:
            property_path = _admitted_component_property_read_path(
                planned_component_name,
                camera_bool_read_request=camera_bool_read_request,
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
