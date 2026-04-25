from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

import prove_live_editor_authoring as authoring

PROOF_NAME = "live_editor_entity_exists_proof"
SCRIPT_VERSION = "v0.2"
PROOF_ENTITY_NAME_PREFERENCES = ("Ground",)
PROOF_SESSION_STEP = "editor_session_open"
PROOF_LEVEL_STEP = "editor_level_open"
PROOF_EXISTS_STEP = "editor_entity_exists"
EDITOR_ENTITY_EXISTS_STEP_ID = "editor-entity-exists-1"
PROOF_STEP_ORDER = [
    (PROOF_SESSION_STEP, authoring.EDITOR_SESSION_STEP_ID, "editor.session.open"),
    (PROOF_LEVEL_STEP, authoring.EDITOR_LEVEL_STEP_ID, "editor.level.open"),
    (PROOF_EXISTS_STEP, EDITOR_ENTITY_EXISTS_STEP_ID, "editor.entity.exists"),
]
SUCCESS_NEXT_STEP = (
    "Post-prompt-readback proof checkpoint refresh and repeatability alignment"
)


class EntityExistsProofError(authoring.ProofError):
    """Raised when the prompt-orchestrated entity-exists proof cannot complete."""


def _ordered_unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned and cleaned not in seen:
            result.append(cleaned)
            seen.add(cleaned)
    return result


def collect_prefab_entity_names(payload: Any) -> list[str]:
    """Collect entity names only from prefab Entities containers."""

    names: list[str] = []

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            entities = value.get("Entities")
            if isinstance(entities, dict):
                for entity_record in entities.values():
                    if not isinstance(entity_record, dict):
                        continue
                    name = entity_record.get("Name")
                    if isinstance(name, str) and name.strip():
                        names.append(name.strip())
            for item in value.values():
                visit(item)
        elif isinstance(value, list):
            for item in value:
                visit(item)

    visit(payload)
    return names


def entity_name_sort_key(name: str) -> tuple[int, str]:
    preference_rank = (
        PROOF_ENTITY_NAME_PREFERENCES.index(name)
        if name in PROOF_ENTITY_NAME_PREFERENCES
        else len(PROOF_ENTITY_NAME_PREFERENCES)
    )
    return preference_rank, name.lower()


def select_entity_exists_target(safe_level_info: dict[str, Any]) -> dict[str, Any]:
    prefab_path_raw = safe_level_info.get("selected_prefab_path")
    level_path = safe_level_info.get("selected_level_path")
    if not isinstance(prefab_path_raw, str) or not prefab_path_raw:
        raise EntityExistsProofError("Safe level selection did not include a prefab path.")
    if not isinstance(level_path, str) or not level_path:
        raise EntityExistsProofError("Safe level selection did not include a level path.")

    prefab_path = Path(prefab_path_raw).expanduser().resolve()
    try:
        payload = json.loads(prefab_path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise EntityExistsProofError(
            f"Could not read selected level prefab for entity target selection: {prefab_path}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise EntityExistsProofError(
            f"Selected level prefab is not valid JSON: {prefab_path}"
        ) from exc

    discovered_names = collect_prefab_entity_names(payload)
    name_counts = Counter(discovered_names)
    unique_names = [
        name
        for name in _ordered_unique(discovered_names)
        if name_counts[name] == 1 and not name.startswith("CodexProofEntity_")
    ]
    if not unique_names:
        raise EntityExistsProofError(
            "Could not prove a unique exact entity-name readback target from "
            f"selected level prefab {prefab_path}."
        )

    selected_name = sorted(unique_names, key=entity_name_sort_key)[0]
    return {
        "selection_rule": (
            "Read the selected safe level prefab and choose a unique exact entity "
            "name, preferring stable Ground when present. Duplicate names are not "
            "eligible because editor.entity.exists rejects ambiguous exact-name lookup."
        ),
        "selected_level_path": level_path,
        "selected_prefab_path": str(prefab_path),
        "selected_entity_name": selected_name,
        "candidate_entity_names": unique_names,
        "duplicate_entity_names": sorted(
            name for name, count in name_counts.items() if count > 1
        ),
    }


def require_adapters_payload(adapters_payload: dict[str, Any]) -> None:
    adapter_status = adapters_payload.get("adapters")
    if not isinstance(adapter_status, dict):
        adapter_status = adapters_payload
    real_tool_paths = adapter_status.get("real_tool_paths")
    if not isinstance(real_tool_paths, list):
        raise EntityExistsProofError("GET /adapters did not expose real_tool_paths.")
    missing = [
        tool_name
        for _, _, tool_name in PROOF_STEP_ORDER
        if tool_name not in real_tool_paths
    ]
    if missing:
        raise EntityExistsProofError(
            "GET /adapters did not report the required real prompt proof paths: "
            f"{missing}."
        )


def require_entity_exists_capabilities(
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
        admitted_capabilities["editor.entity.exists"],
        tool_name="editor.entity.exists",
        expected_status="hybrid-read-only",
        expected_stage="real-read-only-active",
    )
    return admitted_capabilities


def build_prompt_request(
    *,
    project_root: str,
    engine_root: str,
    prompt_id: str,
    workspace_id: str | None,
    executor_id: str | None,
    level_path: str,
    entity_name: str,
) -> dict[str, Any]:
    return {
        "prompt_id": prompt_id,
        "prompt_text": f'Open level "{level_path}" and verify entity "{entity_name}" exists.',
        "project_root": project_root,
        "engine_root": engine_root,
        "workspace_id": workspace_id,
        "executor_id": executor_id,
        "dry_run": False,
        "preferred_domains": ["editor-control"],
        "operator_note": (
            "Repo-owned bounded live proof for the admitted Prompt Studio direct "
            "editor.entity.exists read-only chain."
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
        raise EntityExistsProofError(
            "Prompt session create did not return status=planned: "
            f"{session_record.get('status')}"
        )

    plan = session_record.get("plan")
    if not isinstance(plan, dict):
        raise EntityExistsProofError("Prompt session create did not include a plan.")
    steps = plan.get("steps")
    if not isinstance(steps, list):
        raise EntityExistsProofError("Prompt session plan did not include steps.")

    actual_tools = [step.get("tool") for step in steps if isinstance(step, dict)]
    expected_tools = [tool_name for _, _, tool_name in PROOF_STEP_ORDER]
    if actual_tools != expected_tools:
        raise EntityExistsProofError(
            "Prompt session plan did not resolve the expected direct readback chain. "
            f"Expected {expected_tools}, got {actual_tools}."
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
            raise EntityExistsProofError(
                f"Prompt session plan did not include expected step '{step_id}'."
            )
        step_by_id[step_id] = step

    session_args = step_by_id[authoring.EDITOR_SESSION_STEP_ID].get("args")
    if not isinstance(session_args, dict):
        raise EntityExistsProofError("Prompt session step lacked structured args.")
    if session_args.get("session_mode") != "attach":
        raise EntityExistsProofError("Prompt session step did not stay in attach mode.")
    if session_args.get("project_path") != project_root:
        raise EntityExistsProofError("Prompt session step did not preserve project root.")
    timeout_s = session_args.get("timeout_s")
    if not isinstance(timeout_s, int) or timeout_s <= 0:
        raise EntityExistsProofError("Prompt session step did not preserve a timeout.")

    level_step = step_by_id[authoring.EDITOR_LEVEL_STEP_ID]
    level_args = level_step.get("args")
    if level_step.get("depends_on") != [authoring.EDITOR_SESSION_STEP_ID]:
        raise EntityExistsProofError("Prompt level step did not depend on the session step.")
    if not isinstance(level_args, dict):
        raise EntityExistsProofError("Prompt level step lacked structured args.")
    if level_args != {
        "level_path": level_path,
        "make_writable": False,
        "focus_viewport": False,
    }:
        raise EntityExistsProofError(
            "Prompt level step did not stay within the read-only level-open boundary."
        )

    exists_step = step_by_id[EDITOR_ENTITY_EXISTS_STEP_ID]
    exists_args = exists_step.get("args")
    if exists_step.get("approval_class") != "read_only":
        raise EntityExistsProofError("Prompt entity-exists step was not read-only.")
    if exists_step.get("depends_on") != [
        authoring.EDITOR_SESSION_STEP_ID,
        authoring.EDITOR_LEVEL_STEP_ID,
    ]:
        raise EntityExistsProofError(
            "Prompt entity-exists step did not depend on session and level steps."
        )
    if exists_args != {"entity_name": entity_name, "level_path": level_path}:
        raise EntityExistsProofError(
            "Prompt entity-exists step did not preserve the exact entity-name lookup."
        )

    refused_capabilities = session_record.get("refused_capabilities")
    if isinstance(refused_capabilities, list) and refused_capabilities:
        raise EntityExistsProofError(
            "Prompt session plan reported refused capabilities for the direct readback proof."
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
            raise EntityExistsProofError(
                "Prompt session did not produce a successful child response for "
                f"{step_id}."
            )
        records[logical_name] = authoring.collect_step_runtime_records(
            base_url=base_url,
            response_record=response_record,
        )
    return records


def _record_ids(
    step_records: dict[str, dict[str, Any]],
    key: str,
) -> dict[str, str | None]:
    return {
        tool_name: step_records[logical_name].get(key)
        for logical_name, _, tool_name in PROOF_STEP_ORDER
    }


def _bridge_command_ids(step_records: dict[str, dict[str, Any]]) -> dict[str, Any]:
    return {
        tool_name: step_records[logical_name].get("bridge_command_id")
        for logical_name, _, tool_name in PROOF_STEP_ORDER
    }


def require_entity_exists_verified(
    step_records: dict[str, dict[str, Any]],
    *,
    target: dict[str, Any],
) -> dict[str, Any]:
    exists_record = step_records[PROOF_EXISTS_STEP]
    execution_record = exists_record.get("execution_record")
    if not isinstance(execution_record, dict):
        raise EntityExistsProofError("editor.entity.exists execution record was missing.")
    execution_details = execution_record.get("details")
    if not isinstance(execution_details, dict):
        raise EntityExistsProofError("editor.entity.exists execution lacked details.")

    artifact_record = exists_record.get("artifact_record")
    artifact_metadata = (
        artifact_record.get("metadata")
        if isinstance(artifact_record, dict)
        else {}
    )
    if not isinstance(artifact_metadata, dict):
        artifact_metadata = {}

    exists_value = execution_details.get("exists", artifact_metadata.get("exists"))
    lookup_mode = execution_details.get("lookup_mode", artifact_metadata.get("lookup_mode"))
    entity_name = execution_details.get(
        "entity_name",
        artifact_metadata.get("entity_name"),
    )
    requested_entity_name = execution_details.get(
        "requested_entity_name",
        artifact_metadata.get("requested_entity_name"),
    )
    matched_count = execution_details.get(
        "matched_count",
        artifact_metadata.get("matched_count"),
    )
    entity_id = execution_details.get("entity_id", artifact_metadata.get("entity_id"))
    bridge_command_id = execution_details.get(
        "bridge_command_id",
        artifact_metadata.get("bridge_command_id"),
    )

    if exists_value is not True:
        raise EntityExistsProofError("editor.entity.exists did not return exists=true.")
    if lookup_mode != "entity_name":
        raise EntityExistsProofError("editor.entity.exists did not use entity_name lookup.")
    if requested_entity_name != target["selected_entity_name"]:
        raise EntityExistsProofError(
            "editor.entity.exists did not preserve the requested exact entity name."
        )
    if entity_name != target["selected_entity_name"]:
        raise EntityExistsProofError(
            "editor.entity.exists did not return the selected exact entity name."
        )
    if matched_count != 1:
        raise EntityExistsProofError("editor.entity.exists did not return matched_count=1.")
    if not isinstance(entity_id, str) or not entity_id:
        raise EntityExistsProofError("editor.entity.exists did not return an entity_id.")

    return {
        "exists": exists_value,
        "lookup_mode": lookup_mode,
        "entity_name": entity_name,
        "entity_id": entity_id,
        "matched_count": matched_count,
        "bridge_command_id": bridge_command_id,
    }


def require_prompt_review_summary(
    session_record: dict[str, Any],
    *,
    target: dict[str, Any],
) -> str:
    final_result_summary = session_record.get("final_result_summary")
    if not isinstance(final_result_summary, str) or not final_result_summary.strip():
        raise EntityExistsProofError("Prompt session did not include a final_result_summary.")

    entity_name = target["selected_entity_name"]
    required_fragments = [
        "Review result: succeeded_readback_verified",
        f"Checked entity existence by entity_name lookup for {entity_name}.",
        f"Readback confirmed {entity_name}",
        "via entity_name lookup with matched_count=1.",
        "No cleanup or restore was executed or needed by this read-only proof.",
        "This review does not claim entity creation",
    ]
    missing_fragments = [
        fragment for fragment in required_fragments if fragment not in final_result_summary
    ]
    if missing_fragments:
        raise EntityExistsProofError(
            "Prompt session final_result_summary did not preserve the admitted "
            "direct entity-exists review flow. "
            f"Missing fragments: {missing_fragments}"
        )
    return final_result_summary


def build_success_summary(
    *,
    safe_level_info: dict[str, Any],
    target: dict[str, Any],
    prompt_payload: dict[str, Any],
    prompt_execution: dict[str, Any],
    step_records: dict[str, dict[str, Any]],
    exists_verification: dict[str, Any],
    final_review_summary: str,
) -> dict[str, Any]:
    session_record = prompt_execution["final_session_record_raw"]
    approval_count = len(prompt_execution["approval_events"])
    execute_attempt_count = len(prompt_execution["execute_attempts"])

    return {
        "succeeded": True,
        "status": "completed",
        "completed_at": authoring.utc_now(),
        "selected_level_path": safe_level_info["selected_level_path"],
        "selected_prefab_path": safe_level_info["selected_prefab_path"],
        "entity_name": exists_verification["entity_name"],
        "entity_id": exists_verification["entity_id"],
        "exists": exists_verification["exists"],
        "lookup_mode": exists_verification["lookup_mode"],
        "matched_count": exists_verification["matched_count"],
        "bridge_command_ids": _bridge_command_ids(step_records),
        "records": {
            "run_ids": _record_ids(step_records, "run_id"),
            "execution_ids": _record_ids(step_records, "execution_id"),
            "artifact_ids": _record_ids(step_records, "artifact_id"),
            "approval_ids": {
                tool_name: step_records[logical_name]["response_record"].get("approval_id")
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
        "target_selection": {
            "selection_rule": target["selection_rule"],
            "candidate_entity_names": target["candidate_entity_names"],
            "duplicate_entity_names": target["duplicate_entity_names"],
        },
        "verified_facts": [
            (
                "The repo-owned direct readback proof selected non-default level "
                f"{safe_level_info['selected_level_path']} from the canonical project."
            ),
            (
                "Prompt planning resolved the exact admitted direct read-only chain "
                "editor.session.open -> editor.level.open -> editor.entity.exists."
            ),
            (
                f"Prompt execution completed after {execute_attempt_count} execute attempt(s) "
                f"and {approval_count} approval(s)."
            ),
            (
                "editor.level.open used make_writable=false and focus_viewport=false "
                "for the direct read-only proof path."
            ),
            (
                "editor.entity.exists verified exact-name readback for "
                f"{exists_verification['entity_name']} with entity id "
                f"{exists_verification['entity_id']}."
            ),
            (
                "The prompt session final_result_summary preserved the admitted "
                "direct entity-exists review wording."
            ),
        ],
        "assumptions": [
            (
                "The selected entity name is treated as a stable readback target because "
                "it appears exactly once in the selected level prefab before prompt execution."
            ),
        ],
        "missing_proof": [
            "No cleanup or restore was executed or needed by this read-only proof.",
            (
                "No entity absence after restore, live Editor undo, viewport reload, "
                "broad entity discovery, component discovery, property mutation, "
                "or broader editor behavior was proven."
            ),
        ],
        "safest_next_step": SUCCESS_NEXT_STEP,
        "result_summary": final_review_summary,
    }


def failure_next_step(error_message: str) -> str:
    lowered = error_message.lower()
    if "exact entity-name readback target" in lowered:
        return (
            "Provision or identify a unique stable entity name in a safe sandbox/test "
            "level before rerunning the direct read-only proof."
        )
    if "safe sandbox/test level" in lowered or "only defaultlevel" in lowered:
        return (
            "Create or identify a dedicated sandbox/test level on the canonical "
            "McpSandbox target before rerunning the direct read-only proof."
        )
    if "/ready failed" in lowered or "127.0.0.1:8000" in lowered or "connection refused" in lowered:
        return (
            "Start the canonical backend on http://127.0.0.1:8000 before rerunning "
            "the direct read-only proof."
        )
    if "/o3de/bridge" in lowered or "heartbeat" in lowered or "bridge" in lowered:
        return (
            "Re-establish a fresh ControlPlaneEditorBridge heartbeat on the canonical "
            "McpSandbox target before rerunning the direct read-only proof."
        )
    return (
        "Resolve the blocking proof error and rerun the direct read-only proof "
        "without widening admission."
    )


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
            "No cleanup was attempted during this direct read-only proof run.",
        ],
        "missing_proof": [
            "The standalone editor.entity.exists readback was not proven live in this run.",
        ],
        "safest_next_step": failure_next_step(str(error)),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run the canonical live admitted Prompt Studio direct editor.entity.exists "
            "proof flow against the local backend and write one evidence bundle under "
            "backend/runtime."
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
        else runtime_dir / f"live_editor_entity_exists_proof_{run_label}.json"
    )
    prompt_id = f"editor-entity-exists-proof-{run_label}"
    preflight_facts: list[str] = []

    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": PROOF_NAME,
        "proof_kind": "editor.entity.exists.prompt-live-read-only",
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
            "proof_driver": "prompt_orchestrator direct editor.entity.exists review chain",
            "admitted_surface": [
                "editor.session.open",
                "editor.level.open",
                "editor.entity.exists",
            ],
            "entity_lookup_constraints": {
                "lookup_mode": "entity_name",
                "entity_name_source": (
                    "unique exact Name entry in selected safe level prefab"
                ),
            },
            "level_open_constraints": {
                "make_writable": False,
                "focus_viewport": False,
            },
            "excluded_surface_note": (
                "This proof does not create entities, add components, write properties, "
                "delete, reload, parent, mutate prefabs, touch material, asset, render, "
                "or build behavior, or run arbitrary Editor Python."
            ),
            "bridge_dependency_note": (
                "Live bridge success still depends on the project-local "
                "ControlPlaneEditorBridge handler path on the active McpSandbox target."
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
        target = select_entity_exists_target(safe_level_info)
        evidence_bundle["preflight"]["safe_level_selection"] = safe_level_info
        evidence_bundle["preflight"]["entity_target_selection"] = target
        preflight_facts.extend(
            [
                (
                    "Discovered safe non-default proof level "
                    f"{safe_level_info['selected_level_path']}."
                ),
                (
                    "Selected unique exact entity-name readback target "
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
            raise EntityExistsProofError("GET /ready did not return an object response.")
        if not isinstance(target_payload, dict):
            raise EntityExistsProofError("GET /o3de/target did not return an object response.")
        if not isinstance(bridge_payload, dict):
            raise EntityExistsProofError("GET /o3de/bridge did not return an object response.")
        if not isinstance(adapters_payload, dict):
            raise EntityExistsProofError("GET /adapters did not return an object response.")
        if not isinstance(capabilities_payload, dict):
            raise EntityExistsProofError(
                "GET /prompt/capabilities did not return an object response."
            )

        authoring.require_ready_payload(ready_payload)
        authoring.require_target_payload(
            target_payload,
            project_root=args.project_root,
            engine_root=args.engine_root,
        )
        authoring.require_bridge_payload(bridge_payload, project_root=args.project_root)
        require_adapters_payload(adapters_payload)
        admitted_capabilities = require_entity_exists_capabilities(capabilities_payload)
        preflight_facts.extend(
            [
                "GET /ready reported ok=true and persistence_ready=true.",
                "GET /o3de/target matched the canonical McpSandbox project and engine roots.",
                "GET /o3de/bridge reported a fresh configured ControlPlaneEditorBridge heartbeat.",
                (
                    "GET /adapters confirmed real paths for editor.session.open, "
                    "editor.level.open, and editor.entity.exists."
                ),
                (
                    "GET /prompt/capabilities confirmed real-authoring admission for "
                    "editor.session.open and editor.level.open plus admitted read-only "
                    "status for editor.entity.exists."
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
            workspace_id=None,
            executor_id=None,
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
            raise EntityExistsProofError(
                "POST /prompt/sessions did not return an object response."
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
        final_review_summary = require_prompt_review_summary(
            final_session_record,
            target=target,
        )
        step_records = build_child_step_records(
            base_url=args.base_url,
            session_record=final_session_record,
        )
        exists_verification = require_entity_exists_verified(
            step_records,
            target=target,
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
            exists_verification=exists_verification,
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
