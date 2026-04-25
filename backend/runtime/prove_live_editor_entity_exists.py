from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

import prove_live_editor_authoring as authoring

PROOF_NAME = "live_editor_entity_exists_proof"
SCRIPT_VERSION = "v0.1"
PROOF_ENTITY_NAME_PREFERENCES = ("Ground",)
PROOF_SESSION_STEP = "editor_session_open"
PROOF_LEVEL_STEP = "editor_level_open"
PROOF_EXISTS_STEP = "editor_entity_exists"
PROOF_STEP_ORDER = [
    (PROOF_SESSION_STEP, "editor.session.open"),
    (PROOF_LEVEL_STEP, "editor.level.open"),
    (PROOF_EXISTS_STEP, "editor.entity.exists"),
]
SUCCESS_NEXT_STEP = (
    "Post-direct-readback proof checkpoint refresh and repeatability alignment"
)


class EntityExistsProofError(authoring.ProofError):
    """Raised when the direct entity-exists proof cannot complete successfully."""


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
        for _, tool_name in PROOF_STEP_ORDER
        if tool_name not in real_tool_paths
    ]
    if missing:
        raise EntityExistsProofError(
            "GET /adapters did not report the required real direct proof paths: "
            f"{missing}."
        )


def require_entity_exists_capabilities(capabilities_payload: dict[str, Any]) -> dict[str, Any]:
    admitted_capabilities = {
        tool_name: authoring.find_capability(capabilities_payload, tool_name=tool_name)
        for _, tool_name in PROOF_STEP_ORDER
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


def make_request_payload(
    *,
    request_id: str,
    tool_name: str,
    project_root: str,
    engine_root: str,
    session_id: str,
    args: dict[str, Any],
    timeout_s: int,
) -> dict[str, Any]:
    return {
        "request_id": request_id,
        "tool": tool_name,
        "agent": "editor-control",
        "project_root": project_root,
        "engine_root": engine_root,
        "session_id": session_id,
        "workspace_id": None,
        "executor_id": None,
        "dry_run": False,
        "locks": ["editor_session"],
        "timeout_s": timeout_s,
        "args": args,
    }


def build_dispatch_requests(
    *,
    run_label: str,
    project_root: str,
    engine_root: str,
    level_path: str,
    entity_name: str,
) -> dict[str, dict[str, Any]]:
    session_id = f"editor-entity-exists-proof-{run_label}"
    return {
        PROOF_SESSION_STEP: make_request_payload(
            request_id=f"{session_id}-session-open",
            tool_name="editor.session.open",
            project_root=project_root,
            engine_root=engine_root,
            session_id=session_id,
            timeout_s=180,
            args={
                "session_mode": "attach",
                "project_path": project_root,
                "timeout_s": 180,
            },
        ),
        PROOF_LEVEL_STEP: make_request_payload(
            request_id=f"{session_id}-level-open",
            tool_name="editor.level.open",
            project_root=project_root,
            engine_root=engine_root,
            session_id=session_id,
            timeout_s=180,
            args={
                "level_path": level_path,
                "make_writable": False,
                "focus_viewport": False,
            },
        ),
        PROOF_EXISTS_STEP: make_request_payload(
            request_id=f"{session_id}-entity-exists",
            tool_name="editor.entity.exists",
            project_root=project_root,
            engine_root=engine_root,
            session_id=session_id,
            timeout_s=60,
            args={
                "entity_name": entity_name,
                "level_path": level_path,
            },
        ),
    }


def require_dispatch_success(response: dict[str, Any], *, tool_name: str) -> None:
    if response.get("ok") is not True:
        raise EntityExistsProofError(f"{tool_name} dispatch did not return ok=true.")
    result = response.get("result")
    if not isinstance(result, dict):
        raise EntityExistsProofError(f"{tool_name} dispatch did not include a result.")
    if result.get("tool") != tool_name:
        raise EntityExistsProofError(f"{tool_name} dispatch returned a mismatched tool.")
    if result.get("simulated") is not False:
        raise EntityExistsProofError(f"{tool_name} dispatch did not use the real path.")
    if result.get("status") != "real_success":
        raise EntityExistsProofError(
            f"{tool_name} dispatch returned status {result.get('status')!r}."
        )


def dispatch_with_auto_approval(
    *,
    base_url: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    tool_name = str(payload["tool"])
    first_response = authoring.json_request(
        base_url=base_url,
        method="POST",
        path="/tools/dispatch",
        payload=payload,
        timeout_s=payload["timeout_s"],
    )
    if not isinstance(first_response, dict):
        raise EntityExistsProofError(f"{tool_name} dispatch did not return an object.")

    if first_response.get("ok") is True:
        require_dispatch_success(first_response, tool_name=tool_name)
        return {
            "initial_request_payload": authoring.scrub_secrets(payload),
            "initial_response": authoring.scrub_secrets(first_response),
            "approval_response": None,
            "approved_request_payload": None,
            "final_response": authoring.scrub_secrets(first_response),
            "final_response_raw": first_response,
        }

    error = first_response.get("error")
    if not isinstance(error, dict) or error.get("code") != "APPROVAL_REQUIRED":
        raise EntityExistsProofError(
            f"{tool_name} dispatch failed before approval: {first_response}"
        )
    approval_id = first_response.get("approval_id")
    if not isinstance(approval_id, str) or not approval_id:
        raise EntityExistsProofError(f"{tool_name} dispatch required approval without an id.")

    approval_response = authoring.json_request(
        base_url=base_url,
        method="POST",
        path=f"/approvals/{approval_id}/approve",
        payload={
            "reason": (
                "Repo-owned bounded direct entity-exists proof auto-approval."
            )
        },
        timeout_s=30,
    )
    if not isinstance(approval_response, dict):
        raise EntityExistsProofError(f"{tool_name} approval did not return an object.")
    approval_token = approval_response.get("token")
    if not isinstance(approval_token, str) or not approval_token:
        details = error.get("details")
        if isinstance(details, dict):
            approval_token = details.get("approval_token")
    if not isinstance(approval_token, str) or not approval_token:
        raise EntityExistsProofError(f"{tool_name} approval did not expose a token.")

    approved_payload = {
        **payload,
        "request_id": f"{payload['request_id']}-approved",
        "approval_token": approval_token,
    }
    final_response = authoring.json_request(
        base_url=base_url,
        method="POST",
        path="/tools/dispatch",
        payload=approved_payload,
        timeout_s=payload["timeout_s"],
    )
    if not isinstance(final_response, dict):
        raise EntityExistsProofError(f"{tool_name} approved dispatch returned no object.")
    require_dispatch_success(final_response, tool_name=tool_name)
    return {
        "initial_request_payload": authoring.scrub_secrets(payload),
        "initial_response": authoring.scrub_secrets(first_response),
        "approval_response": authoring.scrub_secrets(approval_response),
        "approved_request_payload": authoring.scrub_secrets(approved_payload),
        "final_response": authoring.scrub_secrets(final_response),
        "final_response_raw": final_response,
    }


def collect_dispatch_records(
    *,
    base_url: str,
    dispatch_results: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    executions_payload = authoring.json_request(
        base_url=base_url,
        method="GET",
        path="/executions",
    )
    artifacts_payload = authoring.json_request(
        base_url=base_url,
        method="GET",
        path="/artifacts",
    )
    if not isinstance(executions_payload, dict):
        raise EntityExistsProofError("GET /executions did not return an object.")
    if not isinstance(artifacts_payload, dict):
        raise EntityExistsProofError("GET /artifacts did not return an object.")

    records: dict[str, dict[str, Any]] = {}
    for logical_name, dispatch_result in dispatch_results.items():
        final_response = dispatch_result["final_response_raw"]
        run_id = final_response.get("operation_id")
        if not isinstance(run_id, str) or not run_id:
            raise EntityExistsProofError(
                f"{logical_name} final dispatch response did not include operation_id."
            )
        run_record = authoring.json_request(
            base_url=base_url,
            method="GET",
            path=f"/runs/{run_id}",
        )
        if not isinstance(run_record, dict):
            raise EntityExistsProofError(f"GET /runs/{run_id} did not return an object.")
        execution_record = authoring.extract_execution_for_run(
            executions_payload,
            run_id=run_id,
        )
        artifact_record = authoring.extract_artifact_for_execution(
            artifacts_payload,
            execution_id=execution_record["id"],
        )
        artifact_payload = authoring.json_request(
            base_url=base_url,
            method="GET",
            path=f"/artifacts/{artifact_record['id']}",
        )
        records[logical_name] = {
            **dispatch_result,
            "run_id": run_id,
            "run_record": authoring.scrub_secrets(run_record),
            "execution_id": execution_record["id"],
            "execution_record": authoring.scrub_secrets(execution_record),
            "artifact_id": artifact_record["id"],
            "artifact_record": authoring.scrub_secrets(artifact_record),
            "artifact_payload": authoring.scrub_secrets(artifact_payload),
        }

    return records


def _record_ids(
    dispatch_records: dict[str, dict[str, Any]],
    key: str,
) -> dict[str, str | None]:
    return {
        tool_name: dispatch_records[logical_name].get(key)
        for logical_name, tool_name in PROOF_STEP_ORDER
    }


def require_entity_exists_verified(
    dispatch_records: dict[str, dict[str, Any]],
    *,
    target: dict[str, Any],
) -> dict[str, Any]:
    exists_record = dispatch_records[PROOF_EXISTS_STEP]
    execution_details = exists_record["execution_record"].get("details")
    if not isinstance(execution_details, dict):
        raise EntityExistsProofError("editor.entity.exists execution lacked details.")

    artifact_metadata = exists_record["artifact_record"].get("metadata")
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


def build_success_summary(
    *,
    safe_level_info: dict[str, Any],
    target: dict[str, Any],
    dispatch_records: dict[str, dict[str, Any]],
    exists_verification: dict[str, Any],
) -> dict[str, Any]:
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
        "bridge_command_ids": {
            "editor.entity.exists": exists_verification["bridge_command_id"],
        },
        "records": {
            "run_ids": _record_ids(dispatch_records, "run_id"),
            "execution_ids": _record_ids(dispatch_records, "execution_id"),
            "artifact_ids": _record_ids(dispatch_records, "artifact_id"),
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
                "The proof executed only editor.session.open, editor.level.open, "
                "and editor.entity.exists."
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
        ],
        "assumptions": [
            (
                "The selected entity name is treated as a stable readback target because "
                "it appears exactly once in the selected level prefab before dispatch."
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
        "result_summary": (
            "Direct editor.entity.exists live readback completed through the admitted "
            "bridge-backed read-only path."
        ),
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
            "Run the canonical live admitted direct editor.entity.exists proof flow "
            "against the local backend and write one evidence bundle under backend/runtime."
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
    preflight_facts: list[str] = []

    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": PROOF_NAME,
        "proof_kind": "editor.entity.exists.direct-live-read-only",
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
            "proof_driver": "direct dispatch through admitted tool envelopes",
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

        dispatch_requests = build_dispatch_requests(
            run_label=run_label,
            project_root=args.project_root,
            engine_root=args.engine_root,
            level_path=target["selected_level_path"],
            entity_name=target["selected_entity_name"],
        )
        dispatch_results = {
            logical_name: dispatch_with_auto_approval(
                base_url=args.base_url,
                payload=payload,
            )
            for logical_name, payload in dispatch_requests.items()
        }
        dispatch_records = collect_dispatch_records(
            base_url=args.base_url,
            dispatch_results=dispatch_results,
        )
        exists_verification = require_entity_exists_verified(
            dispatch_records,
            target=target,
        )
        final_bridge_payload = authoring.json_request(
            base_url=args.base_url,
            method="GET",
            path="/o3de/bridge",
        )

        evidence_bundle["steps"] = dispatch_records
        evidence_bundle["postflight_bridge"] = authoring.scrub_secrets(
            final_bridge_payload
        )
        evidence_bundle["summary"] = build_success_summary(
            safe_level_info=safe_level_info,
            target=target,
            dispatch_records=dispatch_records,
            exists_verification=exists_verification,
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
