from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

import prove_live_editor_authoring as authoring
import prove_live_editor_component_property_list as property_list

PROOF_NAME = "live_editor_property_target_readback_proof"
SCRIPT_VERSION = "v0.1"
PROOF_COMPONENT = "Mesh"
PROOF_PROPERTY_PATH = "Controller|Configuration|Model Asset"
COMPONENT_FIND_STEP_ID = "editor-component-find-1"
PROOF_FIND_STEP = "editor_component_find"
PROOF_PROPERTY_STEP = "editor_component_property_get"
FOUND_COMPONENT_ID_REF = "$step:editor-component-find-1.component_id"
LIVE_DISCOVERY_PROVENANCE = "admitted_runtime_component_discovery_result"
PROOF_STEP_ORDER = [
    ("editor_session_open", authoring.EDITOR_SESSION_STEP_ID, "editor.session.open"),
    ("editor_level_open", authoring.EDITOR_LEVEL_STEP_ID, "editor.level.open"),
    (PROOF_FIND_STEP, COMPONENT_FIND_STEP_ID, "editor.component.find"),
    (
        PROOF_PROPERTY_STEP,
        authoring.EDITOR_COMPONENT_PROPERTY_STEP_ID,
        "editor.component.property.get",
    ),
]
PREFERRED_ENTITY_NAMES = ("Ground",)
SUCCESS_NEXT_STEP = (
    "Read-only discovery of a non-asset scalar or text-like property before any "
    "proof-only property-write packet"
)
WRITE_TARGET_BLOCKER_CODE = "asset_reference_readback_only"
WRITE_TARGET_BLOCKER_REASON = (
    "Mesh Controller|Configuration|Model Asset is an asset-reference readback. "
    "Writing it would imply asset identity, product, material, or dependency "
    "behavior outside the admitted Phase 8 property-target boundary."
)
WRITE_TARGET_REQUIRED_NEXT_EVIDENCE = (
    "Discover a non-asset scalar, boolean, numeric, or text-like component property "
    "through read-only live evidence before starting any proof-only property-write "
    "packet."
)


class PropertyTargetReadbackProofError(authoring.ProofError):
    """Raised when the read-only target-bound property proof cannot complete."""


def _ordered_unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned and cleaned not in seen:
            result.append(cleaned)
            seen.add(cleaned)
    return result


def _target_sort_key(candidate: dict[str, Any]) -> tuple[int, str]:
    entity_name = str(candidate.get("entity_name") or "")
    preference_rank = (
        PREFERRED_ENTITY_NAMES.index(entity_name)
        if entity_name in PREFERRED_ENTITY_NAMES
        else len(PREFERRED_ENTITY_NAMES)
    )
    return preference_rank, entity_name.lower()


def select_serialized_hint_target(
    safe_level_info: dict[str, Any],
) -> dict[str, Any]:
    serialized_candidates = property_list.collect_serialized_prefab_component_records(
        safe_level_info
    )
    entity_names = [
        candidate["entity_name"]
        for candidate in serialized_candidates
        if isinstance(candidate.get("entity_name"), str)
        and candidate["entity_name"].strip()
        and not candidate["entity_name"].startswith("Codex")
    ]
    name_counts = Counter(entity_names)
    eligible = [
        candidate
        for candidate in serialized_candidates
        if isinstance(candidate.get("entity_name"), str)
        and name_counts[candidate["entity_name"]] == 1
        and not candidate["entity_name"].startswith("Codex")
    ]
    if not eligible:
        raise PropertyTargetReadbackProofError(
            "Could not select a unique serialized Mesh component hint from the "
            "safe level prefab. No live component id was guessed."
        )

    selected_hint = sorted(eligible, key=_target_sort_key)[0]
    return {
        "selection_rule": (
            "Use selected level prefab records only as serialized non-live hints, "
            "choose one unique exact entity name with an allowlisted Mesh component, "
            "then require editor.component.find to return a live runtime component id."
        ),
        "selected_level_path": selected_hint["level_path"],
        "selected_prefab_path": selected_hint["prefab_path"],
        "selected_entity_name": selected_hint["entity_name"],
        "selected_component": PROOF_COMPONENT,
        "selected_property_path": PROOF_PROPERTY_PATH,
        "serialized_hint": selected_hint,
        "candidate_entity_names": _ordered_unique(entity_names),
        "duplicate_entity_names": sorted(
            name for name, count in name_counts.items() if count > 1
        ),
        "live_component_id_source_required": LIVE_DISCOVERY_PROVENANCE,
        "write_target_selected": False,
    }


def classify_write_target_candidate(
    *,
    property_path: str,
    value_type: Any,
) -> dict[str, Any]:
    """Classify the readback as evidence without promoting it to a write target."""
    value_type_text = "" if value_type is None else str(value_type)
    return {
        "selected": False,
        "status": "blocked",
        "blocker_code": WRITE_TARGET_BLOCKER_CODE,
        "property_path": property_path,
        "value_type": value_type,
        "value_class": "asset_reference",
        "reason": WRITE_TARGET_BLOCKER_REASON,
        "required_next_evidence": WRITE_TARGET_REQUIRED_NEXT_EVIDENCE,
        "observed_value_type_mentions_asset": "asset" in value_type_text.lower(),
    }


def require_adapters_payload(adapters_payload: dict[str, Any]) -> None:
    adapter_status = adapters_payload.get("adapters")
    if not isinstance(adapter_status, dict):
        adapter_status = adapters_payload
    real_tool_paths = adapter_status.get("real_tool_paths")
    if not isinstance(real_tool_paths, list):
        raise PropertyTargetReadbackProofError(
            "GET /adapters did not expose real_tool_paths."
        )
    missing = [
        tool_name
        for _, _, tool_name in PROOF_STEP_ORDER
        if tool_name not in real_tool_paths
    ]
    if missing:
        raise PropertyTargetReadbackProofError(
            "GET /adapters did not report the required read-only paths: "
            f"{missing}."
        )
    if "editor.component.property.list" in real_tool_paths:
        raise PropertyTargetReadbackProofError(
            "GET /adapters exposes editor.component.property.list; this proof "
            "requires property listing to remain proof-only."
        )


def require_capabilities_payload(
    capabilities_payload: dict[str, Any],
) -> dict[str, Any]:
    admitted_capabilities = {
        tool_name: authoring.find_capability(capabilities_payload, tool_name=tool_name)
        for _, _, tool_name in PROOF_STEP_ORDER
    }
    authoring.require_capability_status(
        admitted_capabilities["editor.session.open"],
        tool_name="editor.session.open",
        expected_status="real-authoring",
        expected_stage="real-editor-authoring-active",
    )
    authoring.require_capability_status(
        admitted_capabilities["editor.level.open"],
        tool_name="editor.level.open",
        expected_status="real-authoring",
        expected_stage="real-editor-authoring-active",
    )
    authoring.require_capability_status(
        admitted_capabilities["editor.component.find"],
        tool_name="editor.component.find",
        expected_status="hybrid-read-only",
        expected_stage="real-read-only-active",
    )
    authoring.require_capability_status(
        admitted_capabilities["editor.component.property.get"],
        tool_name="editor.component.property.get",
        expected_status="hybrid-read-only",
        expected_stage="real-read-only-active",
    )
    capabilities = capabilities_payload.get("capabilities")
    if isinstance(capabilities, list) and any(
        isinstance(item, dict)
        and item.get("tool_name") == "editor.component.property.list"
        for item in capabilities
    ):
        raise PropertyTargetReadbackProofError(
            "GET /prompt/capabilities exposed editor.component.property.list; "
            "this proof requires it to remain unadmitted."
        )
    return admitted_capabilities


def build_prompt_request(
    *,
    project_root: str,
    engine_root: str,
    prompt_id: str,
    level_path: str,
    entity_name: str,
) -> dict[str, Any]:
    return {
        "prompt_id": prompt_id,
        "prompt_text": (
            f'Open level "{level_path}", find Mesh component on entity named '
            f'"{entity_name}", then read back the relevant component/property evidence.'
        ),
        "project_root": project_root,
        "engine_root": engine_root,
        "dry_run": False,
        "preferred_domains": ["editor-control"],
        "operator_note": (
            "Repo-owned read-only proof for target-bound component property readback."
        ),
    }


def require_prompt_plan(
    session_record: dict[str, Any],
    *,
    project_root: str,
    level_path: str,
    entity_name: str,
) -> None:
    if session_record.get("status") != "planned":
        raise PropertyTargetReadbackProofError(
            "Prompt session create did not return status=planned: "
            f"{session_record.get('status')}"
        )
    plan = session_record.get("plan")
    if not isinstance(plan, dict):
        raise PropertyTargetReadbackProofError("Prompt session create lacked a plan.")
    steps = plan.get("steps")
    if not isinstance(steps, list):
        raise PropertyTargetReadbackProofError("Prompt session plan lacked steps.")

    actual_tools = [step.get("tool") for step in steps if isinstance(step, dict)]
    expected_tools = [tool_name for _, _, tool_name in PROOF_STEP_ORDER]
    if actual_tools != expected_tools:
        raise PropertyTargetReadbackProofError(
            "Prompt session plan did not resolve the expected read-only target "
            f"chain. Expected {expected_tools}, got {actual_tools}."
        )

    step_by_id: dict[str, dict[str, Any]] = {}
    for _, step_id, _ in PROOF_STEP_ORDER:
        step = next(
            (
                candidate
                for candidate in steps
                if isinstance(candidate, dict) and candidate.get("step_id") == step_id
            ),
            None,
        )
        if step is None:
            raise PropertyTargetReadbackProofError(
                f"Prompt session plan did not include expected step '{step_id}'."
            )
        step_by_id[step_id] = step

    session_args = step_by_id[authoring.EDITOR_SESSION_STEP_ID].get("args")
    if not isinstance(session_args, dict):
        raise PropertyTargetReadbackProofError("Session step lacked structured args.")
    if session_args.get("session_mode") != "attach":
        raise PropertyTargetReadbackProofError("Session step did not use attach mode.")
    if session_args.get("project_path") != project_root:
        raise PropertyTargetReadbackProofError("Session step did not preserve project root.")

    level_step = step_by_id[authoring.EDITOR_LEVEL_STEP_ID]
    level_args = level_step.get("args")
    if level_step.get("depends_on") != [authoring.EDITOR_SESSION_STEP_ID]:
        raise PropertyTargetReadbackProofError("Level step did not depend on session.")
    if level_args != {
        "level_path": level_path,
        "make_writable": False,
        "focus_viewport": False,
    }:
        raise PropertyTargetReadbackProofError(
            "Level step did not stay inside the read-only open boundary."
        )

    find_step = step_by_id[COMPONENT_FIND_STEP_ID]
    find_args = find_step.get("args")
    if find_step.get("approval_class") != "read_only":
        raise PropertyTargetReadbackProofError("Component-find step was not read-only.")
    if find_step.get("depends_on") != [
        authoring.EDITOR_SESSION_STEP_ID,
        authoring.EDITOR_LEVEL_STEP_ID,
    ]:
        raise PropertyTargetReadbackProofError(
            "Component-find step did not depend on session and level."
        )
    if find_args != {
        "component_name": PROOF_COMPONENT,
        "entity_name": entity_name,
        "level_path": level_path,
    }:
        raise PropertyTargetReadbackProofError(
            "Component-find step did not preserve exact entity/component targeting."
        )

    property_step = step_by_id[authoring.EDITOR_COMPONENT_PROPERTY_STEP_ID]
    property_args = property_step.get("args")
    if property_step.get("approval_class") != "read_only":
        raise PropertyTargetReadbackProofError("Property-get step was not read-only.")
    if property_step.get("depends_on") != [COMPONENT_FIND_STEP_ID]:
        raise PropertyTargetReadbackProofError(
            "Property-get step did not depend on component-find."
        )
    if property_args != {
        "component_id": FOUND_COMPONENT_ID_REF,
        "property_path": PROOF_PROPERTY_PATH,
        "level_path": level_path,
    }:
        raise PropertyTargetReadbackProofError(
            "Property-get step did not bind the discovered live component id."
        )

    refused_capabilities = session_record.get("refused_capabilities")
    if isinstance(refused_capabilities, list) and refused_capabilities:
        raise PropertyTargetReadbackProofError(
            "Prompt session plan reported refused capabilities."
        )


def build_child_step_records(
    *,
    base_url: str,
    session_record: dict[str, Any],
) -> dict[str, Any]:
    records: dict[str, Any] = {}
    for logical_name, step_id, _ in PROOF_STEP_ORDER:
        response_record = authoring.latest_successful_response_for_step(
            session_record,
            step_id,
        )
        if response_record is None:
            raise PropertyTargetReadbackProofError(
                "Prompt session did not produce a successful child response for "
                f"{step_id}."
            )
        records[logical_name] = authoring.collect_step_runtime_records(
            base_url=base_url,
            response_record=response_record,
        )
    return records


def _record_ids(step_records: dict[str, dict[str, Any]], key: str) -> dict[str, str | None]:
    return {
        tool_name: step_records[logical_name].get(key)
        for logical_name, _, tool_name in PROOF_STEP_ORDER
    }


def _bridge_command_ids(step_records: dict[str, dict[str, Any]]) -> dict[str, Any]:
    return {
        tool_name: step_records[logical_name].get("bridge_command_id")
        for logical_name, _, tool_name in PROOF_STEP_ORDER
    }


def require_target_bound_readback(
    step_records: dict[str, dict[str, Any]],
    *,
    target: dict[str, Any],
) -> dict[str, Any]:
    find_details = step_records[PROOF_FIND_STEP]["execution_record"].get("details", {})
    property_details = step_records[PROOF_PROPERTY_STEP]["execution_record"].get(
        "details",
        {},
    )
    if not isinstance(find_details, dict) or not isinstance(property_details, dict):
        raise PropertyTargetReadbackProofError("Readback execution details were missing.")

    component_id = find_details.get("component_id")
    if find_details.get("found") is not True:
        raise PropertyTargetReadbackProofError("editor.component.find did not find a target.")
    if find_details.get("component_name") != PROOF_COMPONENT:
        raise PropertyTargetReadbackProofError("editor.component.find returned wrong component.")
    if find_details.get("entity_name") != target["selected_entity_name"]:
        raise PropertyTargetReadbackProofError(
            "editor.component.find returned the wrong entity name."
        )
    if find_details.get("component_id_provenance") != LIVE_DISCOVERY_PROVENANCE:
        raise PropertyTargetReadbackProofError(
            "editor.component.find did not return live discovery provenance."
        )
    if not isinstance(component_id, str) or not component_id:
        raise PropertyTargetReadbackProofError(
            "editor.component.find did not return a live component id."
        )
    if property_details.get("component_id") != component_id:
        raise PropertyTargetReadbackProofError(
            "editor.component.property.get did not use the discovered live component id."
        )
    if property_details.get("property_path") != PROOF_PROPERTY_PATH:
        raise PropertyTargetReadbackProofError(
            "editor.component.property.get did not preserve the known property path."
        )
    if "property_paths" in property_details:
        raise PropertyTargetReadbackProofError(
            "editor.component.property.get returned property-list evidence."
        )
    return {
        "entity_name": find_details.get("entity_name"),
        "entity_id": find_details.get("entity_id"),
        "component_name": find_details.get("component_name"),
        "component_id": component_id,
        "component_id_provenance": find_details.get("component_id_provenance"),
        "property_path": property_details.get("property_path"),
        "value": property_details.get("value"),
        "value_type": property_details.get("value_type"),
        "level_path": property_details.get("loaded_level_path")
        or property_details.get("level_path"),
    }


def require_prompt_review_summary(
    session_record: dict[str, Any],
    *,
    verification: dict[str, Any],
) -> str:
    final_result_summary = session_record.get("final_result_summary")
    if not isinstance(final_result_summary, str) or not final_result_summary.strip():
        raise PropertyTargetReadbackProofError(
            "Prompt session did not include a final_result_summary."
        )
    required_fragments = [
        "Review result: succeeded_verified",
        f"Bound live {PROOF_COMPONENT} component {verification['component_id']}",
        f"Bound discovered component id {verification['component_id']}",
        f"Readback confirmed {PROOF_PROPERTY_PATH} = ",
    ]
    missing = [
        fragment for fragment in required_fragments if fragment not in final_result_summary
    ]
    if missing:
        raise PropertyTargetReadbackProofError(
            "Prompt final_result_summary did not preserve target-bound readback review "
            f"wording. Missing fragments: {missing}"
        )
    return final_result_summary


def build_success_summary(
    *,
    safe_level_info: dict[str, Any],
    target: dict[str, Any],
    prompt_payload: dict[str, Any],
    prompt_execution: dict[str, Any],
    step_records: dict[str, dict[str, Any]],
    verification: dict[str, Any],
    final_review_summary: str,
) -> dict[str, Any]:
    session_record = prompt_execution["final_session_record_raw"]
    approval_count = len(prompt_execution["approval_events"])
    execute_attempt_count = len(prompt_execution["execute_attempts"])
    value_rendered = "<null>" if verification["value"] is None else str(verification["value"])
    write_target_review = classify_write_target_candidate(
        property_path=str(verification["property_path"]),
        value_type=verification["value_type"],
    )

    return {
        "succeeded": True,
        "status": "completed",
        "completed_at": authoring.utc_now(),
        "selected_level_path": safe_level_info["selected_level_path"],
        "selected_prefab_path": safe_level_info["selected_prefab_path"],
        "entity_name": verification["entity_name"],
        "entity_id": verification["entity_id"],
        "component_name": verification["component_name"],
        "component_id": verification["component_id"],
        "component_id_provenance": verification["component_id_provenance"],
        "property_path": verification["property_path"],
        "value": verification["value"],
        "value_type": verification["value_type"],
        "write_target_selected": write_target_review["selected"],
        "write_target_candidate_review": write_target_review,
        "bridge_command_ids": _bridge_command_ids(step_records),
        "records": {
            "run_ids": _record_ids(step_records, "run_id"),
            "execution_ids": _record_ids(step_records, "execution_id"),
            "artifact_ids": _record_ids(step_records, "artifact_id"),
            "approval_ids": {
                tool_name: step_records[logical_name]["response_record"].get(
                    "approval_id"
                )
                for logical_name, _, tool_name in PROOF_STEP_ORDER
            },
        },
        "prompt_session": {
            "prompt_id": prompt_payload["prompt_id"],
            "status": session_record.get("status"),
            "plan_id": session_record.get("plan_id"),
            "execute_attempt_count": execute_attempt_count,
            "approval_count": approval_count,
        },
        "target_selection": target,
        "verified_facts": [
            (
                "Selected safe non-default level "
                f"{safe_level_info['selected_level_path']}."
            ),
            (
                "Used serialized prefab records only as non-live hints for exact "
                f"entity name {target['selected_entity_name']}."
            ),
            (
                "Prompt planning resolved the read-only chain "
                "editor.session.open -> editor.level.open -> "
                "editor.component.find -> editor.component.property.get."
            ),
            (
                f"Prompt execution completed after {execute_attempt_count} attempt(s) "
                f"and {approval_count} approval(s)."
            ),
            (
                "editor.component.find returned live component id "
                f"{verification['component_id']} with provenance "
                f"{verification['component_id_provenance']}."
            ),
            (
                "editor.component.property.get read "
                f"{verification['property_path']} = {value_rendered}."
            ),
            (
                "The observed property was classified as "
                f"{write_target_review['value_class']} and blocked as a write target."
            ),
            (
                "The prompt session final_result_summary preserved target-bound "
                "readback review wording."
            ),
        ],
        "assumptions": [
            (
                "The serialized prefab hint is not treated as a live component id; "
                "only the component id returned by editor.component.find is used "
                "for property readback."
            ),
            (
                "The observed property remains readback evidence only and is not "
                "selected as a write target."
            ),
        ],
        "missing_proof": [
            "No cleanup or restore was executed or needed by this read-only proof.",
            "No editor.component.property.list command was executed.",
            (
                "No property write target was selected or admitted because the only "
                "observed property was asset-reference readback evidence."
            ),
            (
                "No live Editor undo, viewport reload, delete, parenting, prefab, "
                "material, asset, render, build, or TIAF behavior was proven."
            ),
        ],
        "safest_next_step": SUCCESS_NEXT_STEP,
        "result_summary": final_review_summary,
    }


def failure_next_step(error_message: str) -> str:
    lowered = error_message.lower()
    if "unique serialized mesh component hint" in lowered:
        return (
            "Identify a unique existing Mesh-bearing entity in a safe sandbox/test "
            "level before rerunning read-only target-bound readback."
        )
    if "component.find did not find" in lowered or "live component id" in lowered:
        return (
            "Use admitted editor.component.find only after the exact entity/component "
            "target can be proven live; do not fall back to prefab component ids."
        )
    if "property.get" in lowered or "property_path" in lowered:
        return (
            "Keep property-list proof-only and inspect why the known readback path "
            "could not be read through editor.component.property.get."
        )
    if "heartbeat" in lowered or "bridge" in lowered:
        return "Re-establish canonical backend/editor bridge readiness and rerun."
    return "Resolve the blocker without widening into property listing or writes."


def build_failure_summary(
    *,
    error: Exception,
    preflight_facts: list[str],
) -> dict[str, Any]:
    return {
        "succeeded": False,
        "status": "failed",
        "failed_at": authoring.utc_now(),
        "error_type": error.__class__.__name__,
        "error_message": str(error),
        "verified_facts": preflight_facts,
        "assumptions": [
            "No cleanup was attempted during this read-only proof run.",
        ],
        "missing_proof": [
            "Target-bound property readback was not proven live in this run.",
            "No property-list or property-write behavior was proven.",
        ],
        "safest_next_step": failure_next_step(str(error)),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a read-only Prompt Studio proof that binds a live Mesh component "
            "with editor.component.find, then reads one known property through "
            "editor.component.property.get."
        )
    )
    parser.add_argument("--base-url", default=authoring.CANONICAL_BASE_URL)
    parser.add_argument("--project-root", default=authoring.CANONICAL_PROJECT_ROOT)
    parser.add_argument("--engine-root", default=authoring.CANONICAL_ENGINE_ROOT)
    parser.add_argument("--output", default=None)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    runtime_dir = Path(__file__).resolve().parent
    run_label = authoring.timestamp_label()
    output_path = (
        Path(args.output).expanduser().resolve()
        if args.output
        else runtime_dir / f"live_editor_property_target_readback_proof_{run_label}.json"
    )
    prompt_id = f"editor-property-target-readback-proof-{run_label}"
    preflight_facts: list[str] = []

    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": PROOF_NAME,
        "proof_kind": "editor.component.find.property_get.prompt-live-read-only",
        "generated_at": authoring.utc_now(),
        "base_url": args.base_url,
        "output_path": str(output_path),
        "launch_assumptions": {
            "canonical_project_root": args.project_root,
            "canonical_engine_root": args.engine_root,
            "launch_helper_state": authoring.load_json_if_present(
                runtime_dir / "live-verify-launch.json"
            ),
        },
        "proof_boundary": {
            "proof_driver": (
                "prompt_orchestrator component target binding plus property readback"
            ),
            "admitted_surface": [
                "editor.session.open",
                "editor.level.open",
                "editor.component.find",
                "editor.component.property.get",
            ],
            "component_id_constraints": {
                "source": FOUND_COMPONENT_ID_REF,
                "required_provenance": LIVE_DISCOVERY_PROVENANCE,
                "serialized_prefab_records": "non-live-hints-only",
            },
            "property_constraints": {
                "component": PROOF_COMPONENT,
                "property_path": PROOF_PROPERTY_PATH,
                "read_only": True,
                "write_target_selected": False,
            },
            "excluded_surface_note": (
                "This proof does not admit property listing or writes, create or "
                "delete entities, add components, run arbitrary Editor Python, "
                "mutate prefabs, or touch material, asset, render, build, or TIAF behavior."
            ),
        },
        "preflight": {},
        "steps": {},
        "summary": {
            "succeeded": False,
            "status": "starting",
        },
    }

    try:
        safe_level_info = authoring.select_safe_level(args.project_root)
        target = select_serialized_hint_target(safe_level_info)
        evidence_bundle["preflight"]["safe_level_selection"] = safe_level_info
        evidence_bundle["preflight"]["serialized_hint_target_selection"] = target
        preflight_facts.extend(
            [
                f"Discovered safe non-default proof level {safe_level_info['selected_level_path']}.",
                (
                    "Selected serialized non-live Mesh hint on exact entity name "
                    f"{target['selected_entity_name']}."
                ),
            ]
        )

        ready_payload = authoring.json_request(
            base_url=args.base_url,
            method="GET",
            path="/ready",
        )
        target_payload = authoring.json_request(
            base_url=args.base_url,
            method="GET",
            path="/o3de/target",
        )
        bridge_payload = authoring.json_request(
            base_url=args.base_url,
            method="GET",
            path="/o3de/bridge",
        )
        adapters_payload = authoring.json_request(
            base_url=args.base_url,
            method="GET",
            path="/adapters",
        )
        capabilities_payload = authoring.json_request(
            base_url=args.base_url,
            method="GET",
            path="/prompt/capabilities",
        )

        if not isinstance(ready_payload, dict):
            raise PropertyTargetReadbackProofError("GET /ready did not return an object.")
        if not isinstance(target_payload, dict):
            raise PropertyTargetReadbackProofError(
                "GET /o3de/target did not return an object."
            )
        if not isinstance(bridge_payload, dict):
            raise PropertyTargetReadbackProofError(
                "GET /o3de/bridge did not return an object."
            )
        if not isinstance(adapters_payload, dict):
            raise PropertyTargetReadbackProofError(
                "GET /adapters did not return an object."
            )
        if not isinstance(capabilities_payload, dict):
            raise PropertyTargetReadbackProofError(
                "GET /prompt/capabilities did not return an object."
            )

        authoring.require_ready_payload(ready_payload)
        authoring.require_target_payload(
            target_payload,
            project_root=args.project_root,
            engine_root=args.engine_root,
        )
        authoring.require_bridge_payload(bridge_payload, project_root=args.project_root)
        require_adapters_payload(adapters_payload)
        admitted_capabilities = require_capabilities_payload(capabilities_payload)
        preflight_facts.extend(
            [
                "GET /ready reported ok=true and persistence_ready=true.",
                "GET /o3de/target matched canonical McpSandbox paths.",
                "GET /o3de/bridge reported a fresh bridge heartbeat.",
                (
                    "GET /adapters exposed editor.component.find and "
                    "editor.component.property.get but not editor.component.property.list."
                ),
                (
                    "GET /prompt/capabilities kept property.list unadmitted while "
                    "find/property.get remained read-only admitted surfaces."
                ),
            ]
        )
        evidence_bundle["preflight"].update(
            {
                "ready": authoring.scrub_secrets(ready_payload),
                "target": authoring.scrub_secrets(target_payload),
                "bridge": authoring.scrub_secrets(bridge_payload),
                "adapters": authoring.scrub_secrets(adapters_payload),
                "capabilities": {
                    tool_name: authoring.scrub_secrets(capability)
                    for tool_name, capability in admitted_capabilities.items()
                },
            }
        )

        prompt_payload = build_prompt_request(
            project_root=args.project_root,
            engine_root=args.engine_root,
            prompt_id=prompt_id,
            level_path=target["selected_level_path"],
            entity_name=target["selected_entity_name"],
        )
        prompt_create_response = authoring.json_request(
            base_url=args.base_url,
            method="POST",
            path="/prompt/sessions",
            payload=prompt_payload,
            timeout_s=30,
        )
        if not isinstance(prompt_create_response, dict):
            raise PropertyTargetReadbackProofError(
                "POST /prompt/sessions did not return an object."
            )
        require_prompt_plan(
            prompt_create_response,
            project_root=args.project_root,
            level_path=target["selected_level_path"],
            entity_name=target["selected_entity_name"],
        )

        prompt_execution = authoring.execute_prompt_session_with_approvals(
            base_url=args.base_url,
            prompt_id=prompt_id,
        )
        final_session_record = prompt_execution["final_session_record_raw"]
        step_records = build_child_step_records(
            base_url=args.base_url,
            session_record=final_session_record,
        )
        verification = require_target_bound_readback(
            step_records,
            target=target,
        )
        final_review_summary = require_prompt_review_summary(
            final_session_record,
            verification=verification,
        )
        final_bridge_payload = authoring.json_request(
            base_url=args.base_url,
            method="GET",
            path="/o3de/bridge",
        )

        evidence_bundle["steps"] = {
            "prompt_session": {
                "create_request_payload": authoring.scrub_secrets(prompt_payload),
                "create_response": authoring.scrub_secrets(prompt_create_response),
                "execute_attempts": prompt_execution["execute_attempts"],
                "approval_events": prompt_execution["approval_events"],
                "final_session_record": authoring.scrub_secrets(final_session_record),
            },
            **step_records,
        }
        evidence_bundle["postflight_bridge"] = authoring.scrub_secrets(
            final_bridge_payload
        )
        evidence_bundle["summary"] = build_success_summary(
            safe_level_info=safe_level_info,
            target=target,
            prompt_payload=prompt_payload,
            prompt_execution=prompt_execution,
            step_records=step_records,
            verification=verification,
            final_review_summary=final_review_summary,
        )
    except Exception as exc:  # noqa: BLE001
        evidence_bundle["summary"] = build_failure_summary(
            error=exc,
            preflight_facts=preflight_facts,
        )
    finally:
        output_path.write_text(
            json.dumps(evidence_bundle, indent=2, sort_keys=True),
            encoding="utf-8",
        )

    print(str(output_path))
    return 0 if evidence_bundle["summary"]["succeeded"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
