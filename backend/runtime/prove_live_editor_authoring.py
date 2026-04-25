from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CANONICAL_BASE_URL = "http://127.0.0.1:8000"
CANONICAL_PROJECT_ROOT = r"C:\Users\topgu\O3DE\Projects\McpSandbox"
CANONICAL_ENGINE_ROOT = r"C:\src\o3de"
CANONICAL_LEVELS_DIR = "Levels"
DEFAULT_LEVEL_NAME = "DefaultLevel"
SAFE_LEVEL_TOKENS = ("test", "sandbox", "proof", "qa", "dev")
SAFE_LEVEL_TOKEN_RANK = {
    "test": 0,
    "sandbox": 1,
    "proof": 2,
    "qa": 3,
    "dev": 4,
}
PROOF_COMPONENT = "Mesh"
PROOF_PROPERTY_PATH = "Controller|Configuration|Model Asset"
PROMPT_EXECUTE_MAX_ATTEMPTS = 16
SCRIPT_VERSION = "v0.2"
SUCCESS_NEXT_STEP = "Post-live-proof checkpoint refresh and operator-facing proof alignment"

EDITOR_SESSION_STEP_ID = "editor-session-1"
EDITOR_LEVEL_STEP_ID = "editor-level-1"
EDITOR_ENTITY_STEP_ID = "editor-entity-1"
EDITOR_COMPONENT_STEP_ID = "editor-component-1"
EDITOR_COMPONENT_PROPERTY_STEP_ID = "editor-component-property-1"
CREATED_ENTITY_ID_REF = "$step:editor-entity-1.entity_id"
ADDED_COMPONENT_ID_REF = "$step:editor-component-1.added_component_refs[0].component_id"

PROOF_STEP_ORDER = [
    ("editor_session_open", EDITOR_SESSION_STEP_ID, "editor.session.open"),
    ("editor_level_open", EDITOR_LEVEL_STEP_ID, "editor.level.open"),
    ("editor_entity_create", EDITOR_ENTITY_STEP_ID, "editor.entity.create"),
    ("editor_component_add", EDITOR_COMPONENT_STEP_ID, "editor.component.add"),
    (
        "editor_component_property_get",
        EDITOR_COMPONENT_PROPERTY_STEP_ID,
        "editor.component.property.get",
    ),
]


class ProofError(RuntimeError):
    """Raised when the live proof cannot complete successfully."""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def timestamp_label() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def json_request(
    *,
    base_url: str,
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    timeout_s: int = 30,
) -> Any:
    url = f"{base_url.rstrip('/')}{path}"
    data: bytes | None = None
    headers = {
        "Accept": "application/json",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
    try:
        with urllib.request.urlopen(request, timeout=timeout_s) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise ProofError(
            f"{method.upper()} {path} returned HTTP {exc.code}: {body}"
        ) from exc
    except urllib.error.URLError as exc:
        raise ProofError(f"{method.upper()} {path} failed: {exc}") from exc

    if not body.strip():
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise ProofError(f"{method.upper()} {path} returned invalid JSON: {body}") from exc


def scrub_secrets(value: Any) -> Any:
    if isinstance(value, dict):
        scrubbed: dict[str, Any] = {}
        for key, item in value.items():
            if key == "approval_token" and item:
                scrubbed[key] = "<redacted>"
            else:
                scrubbed[key] = scrub_secrets(item)
        return scrubbed
    if isinstance(value, list):
        return [scrub_secrets(item) for item in value]
    return value


def load_json_if_present(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def extract_execution_for_run(executions_payload: dict[str, Any], *, run_id: str) -> dict[str, Any]:
    executions = executions_payload.get("executions")
    if not isinstance(executions, list):
        raise ProofError("GET /executions did not return an executions list.")
    for execution in executions:
        if isinstance(execution, dict) and execution.get("run_id") == run_id:
            execution_id = execution.get("id")
            if isinstance(execution_id, str) and execution_id:
                return execution
    raise ProofError(f"Could not find an execution for run '{run_id}'.")


def extract_artifact_for_execution(
    artifacts_payload: dict[str, Any],
    *,
    execution_id: str,
) -> dict[str, Any]:
    artifacts = artifacts_payload.get("artifacts")
    if not isinstance(artifacts, list):
        raise ProofError("GET /artifacts did not return an artifacts list.")
    for artifact in artifacts:
        if isinstance(artifact, dict) and artifact.get("execution_id") == execution_id:
            artifact_id = artifact.get("id")
            if isinstance(artifact_id, str) and artifact_id:
                return artifact
    raise ProofError(f"Could not find an artifact for execution '{execution_id}'.")


def require_ready_payload(ready_payload: dict[str, Any]) -> None:
    if ready_payload.get("ok") is not True:
        raise ProofError("GET /ready did not report ok=true.")
    if ready_payload.get("persistence_ready") is not True:
        raise ProofError("GET /ready did not report persistence_ready=true.")


def require_target_payload(
    target_payload: dict[str, Any],
    *,
    project_root: str,
    engine_root: str,
) -> None:
    if target_payload.get("project_root") != project_root:
        raise ProofError(
            "GET /o3de/target project_root did not match the canonical McpSandbox target."
        )
    if target_payload.get("engine_root") != engine_root:
        raise ProofError(
            "GET /o3de/target engine_root did not match the canonical engine root."
        )
    if target_payload.get("project_root_exists") is not True:
        raise ProofError("GET /o3de/target reported project_root_exists=false.")


def require_bridge_payload(bridge_payload: dict[str, Any], *, project_root: str) -> None:
    if bridge_payload.get("configured") is not True:
        raise ProofError("GET /o3de/bridge reported configured=false.")
    if bridge_payload.get("heartbeat_fresh") is not True:
        raise ProofError("GET /o3de/bridge reported heartbeat_fresh=false.")
    heartbeat = bridge_payload.get("heartbeat")
    if not isinstance(heartbeat, dict):
        raise ProofError("GET /o3de/bridge did not include a heartbeat payload.")
    if heartbeat.get("project_root") != project_root:
        raise ProofError(
            "GET /o3de/bridge heartbeat project_root did not match the canonical target."
        )
    if heartbeat.get("bridge_module_loaded") is not True:
        raise ProofError("GET /o3de/bridge heartbeat did not report bridge_module_loaded=true.")


def find_capability(
    capabilities_payload: dict[str, Any],
    *,
    tool_name: str,
) -> dict[str, Any]:
    capabilities = capabilities_payload.get("capabilities")
    if not isinstance(capabilities, list):
        raise ProofError("GET /prompt/capabilities did not return a capabilities list.")
    for capability in capabilities:
        if isinstance(capability, dict) and capability.get("tool_name") == tool_name:
            return capability
    raise ProofError(f"Capability '{tool_name}' was not returned by GET /prompt/capabilities.")


def require_capability_status(
    capability: dict[str, Any],
    *,
    tool_name: str,
    expected_status: str,
    expected_stage: str,
) -> None:
    if capability.get("capability_maturity") != expected_status:
        raise ProofError(
            f"{tool_name} capability_maturity was "
            f"'{capability.get('capability_maturity')}', expected '{expected_status}'."
        )
    if capability.get("real_admission_stage") != expected_stage:
        raise ProofError(
            f"{tool_name} real_admission_stage was "
            f"'{capability.get('real_admission_stage')}', expected '{expected_stage}'."
        )


def level_sort_key(candidate: dict[str, Any]) -> tuple[int, str]:
    tokens = candidate.get("safe_name_tokens") or []
    primary_token = tokens[0] if tokens else "zz"
    return SAFE_LEVEL_TOKEN_RANK.get(primary_token, 99), str(candidate["name"]).lower()


def collect_level_candidates(project_root: str) -> list[dict[str, Any]]:
    levels_root = Path(project_root).expanduser().resolve() / CANONICAL_LEVELS_DIR
    if not levels_root.is_dir():
        return []

    candidates: list[dict[str, Any]] = []
    for child in sorted(levels_root.iterdir(), key=lambda path: path.name.lower()):
        if not child.is_dir():
            continue
        if child.name.startswith("_"):
            continue
        prefab_path = child / f"{child.name}.prefab"
        if not prefab_path.is_file():
            continue
        lowered_name = child.name.lower()
        safe_tokens = [token for token in SAFE_LEVEL_TOKENS if token in lowered_name]
        candidates.append(
            {
                "name": child.name,
                "level_path": f"{CANONICAL_LEVELS_DIR}/{child.name}",
                "prefab_path": str(prefab_path),
                "safe_name_tokens": safe_tokens,
                "is_default_level": lowered_name == DEFAULT_LEVEL_NAME.lower(),
            }
        )

    return candidates


def select_safe_level(project_root: str) -> dict[str, Any]:
    candidates = collect_level_candidates(project_root)
    levels_root = str((Path(project_root).expanduser().resolve() / CANONICAL_LEVELS_DIR))
    if not candidates:
        raise ProofError(
            "Could not prove a safe sandbox/test level because no repo-visible "
            f"level prefabs were found under {levels_root}."
        )

    safe_candidates = [
        candidate
        for candidate in candidates
        if candidate["is_default_level"] is not True and candidate["safe_name_tokens"]
    ]
    if not safe_candidates:
        discovered_paths = ", ".join(candidate["level_path"] for candidate in candidates)
        if len(candidates) == 1 and candidates[0]["is_default_level"] is True:
            raise ProofError(
                "Only DefaultLevel was discovered under the canonical project Levels directory; "
                "a safe sandbox/test level could not be proven for live mutation."
            )
        raise ProofError(
            "A safe sandbox/test level could not be proven from the discovered level set: "
            f"{discovered_paths}."
        )

    selected = sorted(safe_candidates, key=level_sort_key)[0]
    return {
        "levels_root": levels_root,
        "selection_rule": (
            "Select the first non-default level prefab whose directory name "
            "contains an explicit sandbox/test token, ranked by test -> sandbox "
            "-> proof -> qa -> dev, then alphabetically."
        ),
        "selected_level_path": selected["level_path"],
        "selected_level_name": selected["name"],
        "selected_prefab_path": selected["prefab_path"],
        "selected_safe_name_tokens": selected["safe_name_tokens"],
        "candidates": candidates,
    }


def build_prompt_request(
    *,
    run_label: str,
    project_root: str,
    engine_root: str,
    prompt_id: str,
    workspace_id: str | None,
    executor_id: str | None,
    level_path: str,
) -> tuple[dict[str, Any], str]:
    entity_name = f"CodexProofEntity_{run_label.replace('-', '_')}"
    prompt_text = (
        f'Open level "{level_path}", create entity named "{entity_name}", add a {PROOF_COMPONENT} '
        "component, then read back the relevant component/property evidence."
    )
    return (
        {
            "prompt_id": prompt_id,
            "prompt_text": prompt_text,
            "project_root": project_root,
            "engine_root": engine_root,
            "workspace_id": workspace_id,
            "executor_id": executor_id,
            "dry_run": False,
            "preferred_domains": ["editor-control"],
            "operator_note": (
                "Repo-owned bounded live proof for the admitted composed editor authoring chain."
            ),
        },
        entity_name,
    )


def require_prompt_plan(
    session_record: dict[str, Any],
    *,
    project_root: str,
    level_path: str,
    entity_name: str,
) -> None:
    if session_record.get("status") != "planned":
        raise ProofError(
            f"Prompt session create did not return status=planned: {session_record.get('status')}"
        )

    plan = session_record.get("plan")
    if not isinstance(plan, dict):
        raise ProofError("Prompt session create did not include a structured plan.")
    steps = plan.get("steps")
    if not isinstance(steps, list):
        raise ProofError("Prompt session plan did not include a steps list.")

    actual_tools = [step.get("tool") for step in steps if isinstance(step, dict)]
    expected_tools = [tool_name for _, _, tool_name in PROOF_STEP_ORDER]
    if actual_tools != expected_tools:
        raise ProofError(
            "Prompt session plan did not resolve the expected composed editor chain. "
            f"Expected {expected_tools}, got {actual_tools}."
        )

    step_by_id = {}
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
            raise ProofError(f"Prompt session plan did not include expected step '{step_id}'.")
        step_by_id[step_id] = step

    session_args = step_by_id[EDITOR_SESSION_STEP_ID].get("args")
    if not isinstance(session_args, dict):
        raise ProofError("Prompt session step did not include structured session args.")
    if session_args.get("project_path") != project_root:
        raise ProofError("Prompt session plan did not preserve the canonical project root.")
    timeout_s = session_args.get("timeout_s")
    if not isinstance(timeout_s, int) or timeout_s <= 0:
        raise ProofError("Prompt session plan did not preserve a positive session timeout.")

    level_args = step_by_id[EDITOR_LEVEL_STEP_ID].get("args")
    if not isinstance(level_args, dict) or level_args.get("level_path") != level_path:
        raise ProofError("Prompt plan did not preserve the selected safe level path.")

    entity_args = step_by_id[EDITOR_ENTITY_STEP_ID].get("args")
    if not isinstance(entity_args, dict):
        raise ProofError("Prompt entity-create step did not include structured args.")
    if entity_args.get("entity_name") != entity_name:
        raise ProofError("Prompt entity-create step did not preserve the proof entity name.")
    if entity_args.get("level_path") != level_path:
        raise ProofError("Prompt entity-create step did not preserve the safe level path.")

    component_args = step_by_id[EDITOR_COMPONENT_STEP_ID].get("args")
    if not isinstance(component_args, dict):
        raise ProofError("Prompt component-add step did not include structured args.")
    if component_args.get("entity_id") != CREATED_ENTITY_ID_REF:
        raise ProofError("Prompt component-add step did not chain the created entity id output.")
    if component_args.get("components") != [PROOF_COMPONENT]:
        raise ProofError(
            "Prompt component-add step did not stay within the admitted "
            "Mesh-only proof case."
        )
    if component_args.get("level_path") != level_path:
        raise ProofError("Prompt component-add step did not preserve the safe level path.")

    property_args = step_by_id[EDITOR_COMPONENT_PROPERTY_STEP_ID].get("args")
    if not isinstance(property_args, dict):
        raise ProofError("Prompt component-property step did not include structured args.")
    if property_args.get("component_id") != ADDED_COMPONENT_ID_REF:
        raise ProofError("Prompt property-read step did not chain the added component id output.")
    if property_args.get("property_path") != PROOF_PROPERTY_PATH:
        raise ProofError(
            "Prompt property-read step did not preserve the admitted "
            "property-path mapping."
        )
    if property_args.get("level_path") != level_path:
        raise ProofError("Prompt property-read step did not preserve the safe level path.")

    refused_capabilities = session_record.get("refused_capabilities")
    if isinstance(refused_capabilities, list) and refused_capabilities:
        raise ProofError(
            "Prompt session plan reported refused capabilities for the bounded proof chain."
        )


def execute_prompt_session_with_approvals(
    *,
    base_url: str,
    prompt_id: str,
) -> dict[str, Any]:
    execute_attempts: list[dict[str, Any]] = []
    approval_events: list[dict[str, Any]] = []
    seen_approval_ids: set[str] = set()
    final_session_record: dict[str, Any] | None = None

    for attempt_index in range(1, PROMPT_EXECUTE_MAX_ATTEMPTS + 1):
        session_record = json_request(
            base_url=base_url,
            method="POST",
            path=f"/prompt/sessions/{prompt_id}/execute",
            payload=None,
            timeout_s=180,
        )
        if not isinstance(session_record, dict):
            raise ProofError("Prompt session execute did not return an object response.")
        execute_attempts.append(
            {
                "attempt_index": attempt_index,
                "session_record": scrub_secrets(session_record),
            }
        )

        status = session_record.get("status")
        if status == "completed":
            final_session_record = session_record
            break
        if status == "waiting_approval":
            approval_id = session_record.get("pending_approval_id")
            if not isinstance(approval_id, str) or not approval_id:
                raise ProofError(
                    "Prompt session entered waiting_approval without a pending_approval_id."
                )
            if approval_id in seen_approval_ids:
                raise ProofError(
                    f"Prompt session repeated approval id '{approval_id}' without progressing."
                )
            approval_response = json_request(
                base_url=base_url,
                method="POST",
                path=f"/approvals/{approval_id}/approve",
                payload={},
                timeout_s=30,
            )
            if not isinstance(approval_response, dict):
                raise ProofError("Approval endpoint did not return an object response.")
            approval_events.append(
                {
                    "approval_id": approval_id,
                    "approval_response": scrub_secrets(approval_response),
                }
            )
            seen_approval_ids.add(approval_id)
            continue
        if status in {"failed", "refused", "blocked"}:
            failure_summary = session_record.get("final_result_summary")
            if not failure_summary:
                failure_summary = session_record.get("last_error_code")
            raise ProofError(
                f"Prompt session stopped with status '{status}': "
                f"{failure_summary}"
            )
        if status not in {"planned", "running"}:
            raise ProofError(f"Prompt session returned unexpected status '{status}'.")

    if final_session_record is None:
        raise ProofError(
            "Prompt session did not reach completed status within the bounded execution window."
        )

    return {
        "execute_attempts": execute_attempts,
        "approval_events": approval_events,
        "final_session_record": scrub_secrets(final_session_record),
        "final_session_record_raw": final_session_record,
    }


def latest_successful_response_for_step(
    session_record: dict[str, Any],
    step_id: str,
) -> dict[str, Any] | None:
    responses = session_record.get("latest_child_responses")
    if not isinstance(responses, list):
        return None
    for response in reversed(responses):
        if (
            isinstance(response, dict)
            and response.get("prompt_step_id") == step_id
            and response.get("ok") is True
        ):
            return response
    return None


def collect_step_runtime_records(
    *,
    base_url: str,
    response_record: dict[str, Any],
) -> dict[str, Any]:
    run_id = response_record.get("operation_id")
    if not isinstance(run_id, str) or not run_id:
        raise ProofError("Prompt child response did not include an operation_id run id.")

    run_record = json_request(
        base_url=base_url,
        method="GET",
        path=f"/runs/{run_id}",
        timeout_s=30,
    )
    if not isinstance(run_record, dict):
        raise ProofError(f"GET /runs/{run_id} did not return an object response.")

    executions_payload = json_request(
        base_url=base_url,
        method="GET",
        path="/executions",
        timeout_s=30,
    )
    if not isinstance(executions_payload, dict):
        raise ProofError("GET /executions did not return an object response.")
    execution_summary = extract_execution_for_run(executions_payload, run_id=run_id)
    execution_id = execution_summary.get("id")
    if not isinstance(execution_id, str) or not execution_id:
        raise ProofError(f"Execution summary for run '{run_id}' did not include an id.")
    execution_record = json_request(
        base_url=base_url,
        method="GET",
        path=f"/executions/{execution_id}",
        timeout_s=30,
    )
    if not isinstance(execution_record, dict):
        raise ProofError(f"GET /executions/{execution_id} did not return an object response.")

    artifact_id: str | None = None
    artifact_record: dict[str, Any] | None = None
    artifacts_payload = json_request(
        base_url=base_url,
        method="GET",
        path="/artifacts",
        timeout_s=30,
    )
    if not isinstance(artifacts_payload, dict):
        raise ProofError("GET /artifacts did not return an object response.")
    artifact_summary = extract_artifact_for_execution(artifacts_payload, execution_id=execution_id)
    artifact_id = artifact_summary.get("id")
    if not isinstance(artifact_id, str) or not artifact_id:
        raise ProofError(f"Artifact summary for execution '{execution_id}' did not include an id.")
    artifact_response = json_request(
        base_url=base_url,
        method="GET",
        path=f"/artifacts/{artifact_id}",
        timeout_s=30,
    )
    if isinstance(artifact_response, dict):
        artifact_record = artifact_response

    execution_details = execution_record.get("details")
    bridge_command_id = None
    if isinstance(execution_details, dict):
        bridge_command_id = execution_details.get("bridge_command_id")

    return {
        "response_record": scrub_secrets(response_record),
        "run_id": run_id,
        "execution_id": execution_id,
        "artifact_id": artifact_id,
        "run_record": scrub_secrets(run_record),
        "execution_record": scrub_secrets(execution_record),
        "artifact_record": scrub_secrets(artifact_record),
        "bridge_command_id": bridge_command_id,
    }


def build_child_step_records(
    *,
    base_url: str,
    session_record: dict[str, Any],
) -> dict[str, Any]:
    records: dict[str, Any] = {}
    for logical_name, step_id, _ in PROOF_STEP_ORDER:
        response_record = latest_successful_response_for_step(session_record, step_id)
        if response_record is None:
            raise ProofError(
                "Prompt session did not produce a successful child response for "
                f"{step_id}."
            )
        records[logical_name] = collect_step_runtime_records(
            base_url=base_url,
            response_record=response_record,
        )
    return records


def require_review_summary(session_record: dict[str, Any], *, entity_name: str) -> str:
    final_result_summary = session_record.get("final_result_summary")
    if not isinstance(final_result_summary, str) or not final_result_summary.strip():
        raise ProofError("Prompt session did not include a final_result_summary.")

    required_fragments = [
        f"Readback confirmed entity '{entity_name}'",
        f"Readback confirmed added component(s) {PROOF_COMPONENT}",
        f"Readback confirmed {PROOF_PROPERTY_PATH} = ",
    ]
    missing_fragments = [
        fragment for fragment in required_fragments if fragment not in final_result_summary
    ]
    if missing_fragments:
        raise ProofError(
            "Prompt session final_result_summary did not preserve the admitted "
            "post-action review flow. "
            f"Missing fragments: {missing_fragments}"
        )
    return final_result_summary


def bridge_command_ids(step_records: dict[str, Any]) -> dict[str, Any]:
    return {
        tool_name: step_records[logical_name].get("bridge_command_id")
        for logical_name, _, tool_name in PROOF_STEP_ORDER
    }


def record_ids(step_records: dict[str, Any], key: str) -> dict[str, Any]:
    return {
        tool_name: step_records[logical_name].get(key)
        for logical_name, _, tool_name in PROOF_STEP_ORDER
    }


def build_success_summary(
    *,
    safe_level_info: dict[str, Any],
    prompt_payload: dict[str, Any],
    prompt_execution: dict[str, Any],
    step_records: dict[str, Any],
    final_review_summary: str,
) -> dict[str, Any]:
    session_record = prompt_execution["final_session_record_raw"]
    entity_details = step_records["editor_entity_create"]["execution_record"].get("details", {})
    component_details = step_records["editor_component_add"]["execution_record"].get("details", {})
    property_details = step_records["editor_component_property_get"][
        "execution_record"
    ].get("details", {})

    entity_name = entity_details.get("entity_name")
    entity_id = entity_details.get("entity_id")
    level_path = (
        property_details.get("loaded_level_path")
        or component_details.get("loaded_level_path")
        or entity_details.get("loaded_level_path")
        or safe_level_info["selected_level_path"]
    )
    added_component_refs = component_details.get("added_component_refs", [])
    component_id = None
    if isinstance(added_component_refs, list) and added_component_refs:
        first_component = added_component_refs[0]
        if isinstance(first_component, dict):
            component_id = first_component.get("component_id")
    property_value = property_details.get("value")
    property_value_rendered = "<null>" if property_value is None else str(property_value)
    approval_count = len(prompt_execution["approval_events"])
    execute_attempt_count = len(prompt_execution["execute_attempts"])
    selected_tokens = ", ".join(safe_level_info["selected_safe_name_tokens"])

    return {
        "succeeded": True,
        "status": "completed",
        "completed_at": utc_now(),
        "selected_level_path": safe_level_info["selected_level_path"],
        "entity_name": entity_name,
        "entity_id": entity_id,
        "component_name": PROOF_COMPONENT,
        "component_id": component_id,
        "property_path": property_details.get("property_path"),
        "property_value": property_value,
        "bridge_command_ids": bridge_command_ids(step_records),
        "records": {
            "run_ids": record_ids(step_records, "run_id"),
            "execution_ids": record_ids(step_records, "execution_id"),
            "artifact_ids": record_ids(step_records, "artifact_id"),
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
        "verified_facts": [
            (
                "The repo-owned live proof selected non-default level "
                f"{safe_level_info['selected_level_path']} from the canonical project."
            ),
            (
                "Prompt planning resolved the exact admitted composed chain "
                "editor.session.open -> editor.level.open -> editor.entity.create -> "
                "editor.component.add -> editor.component.property.get."
            ),
            (
                f"Prompt execution completed after {execute_attempt_count} execute attempt(s) "
                f"and {approval_count} approval(s)."
            ),
            (
                f"editor.entity.create produced entity '{entity_name}' "
                f"({entity_id}) in {level_path}."
            ),
            (
                f"editor.component.add attached {PROOF_COMPONENT} and returned "
                f"component_id {component_id}."
            ),
            (
                "editor.component.property.get read "
                f"{property_details.get('property_path')} = {property_value_rendered}."
            ),
            (
                "The prompt session final_result_summary preserved the admitted "
                "post-action review wording."
            ),
        ],
        "assumptions": [
            (
                "The selected level is treated as a safe sandbox/test target because its level "
                f"name carries the explicit token(s): {selected_tokens}."
            ),
            (
                "No cleanup was attempted; this proof assumes the selected sandbox/test level "
                "can safely retain the created entity and added component after verification."
            ),
        ],
        "missing_proof": [
            "No cleanup or restore invocation was executed or verified by this harness run.",
            (
                "No broader component/property mapping was exercised beyond the admitted "
                f"{PROOF_COMPONENT} -> {PROOF_PROPERTY_PATH} readback case."
            ),
            (
                "This proof does not exercise property writes, delete, parenting, prefab, "
                "material, asset, render, or build behavior."
            ),
        ],
        "safest_next_step": SUCCESS_NEXT_STEP,
        "result_summary": final_review_summary,
    }


def failure_next_step(error_message: str) -> str:
    lowered = error_message.lower()
    if "only defaultlevel" in lowered or "safe sandbox/test level" in lowered:
        return (
            "Create or identify a dedicated sandbox/test level on the canonical McpSandbox target "
            "before rerunning the bounded live proof."
        )
    if "/ready failed" in lowered or "127.0.0.1:8000" in lowered or "connection refused" in lowered:
        return (
            "Start the canonical backend on http://127.0.0.1:8000 and rerun "
            "the bounded live proof."
        )
    if "/o3de/bridge" in lowered or "heartbeat" in lowered or "bridge" in lowered:
        return (
            "Re-establish a fresh ControlPlaneEditorBridge heartbeat on the canonical McpSandbox "
            "target before rerunning the bounded live proof."
        )
    return (
        "Resolve the blocking proof error and rerun the bounded live proof "
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
        "failed_at": utc_now(),
        "error_type": error.__class__.__name__,
        "error_message": str(error),
        "verified_facts": preflight_facts,
        "assumptions": [
            "No cleanup was attempted during this failed proof run.",
        ],
        "missing_proof": [
            "The admitted composed editor chain was not fully proven live in this run.",
        ],
        "safest_next_step": failure_next_step(str(error)),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run the canonical live admitted-real composed editor proof flow against the "
            "local backend and write one evidence bundle under backend/runtime."
        )
    )
    parser.add_argument("--base-url", default=CANONICAL_BASE_URL)
    parser.add_argument("--project-root", default=CANONICAL_PROJECT_ROOT)
    parser.add_argument("--engine-root", default=CANONICAL_ENGINE_ROOT)
    parser.add_argument("--output", default=None)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    runtime_dir = Path(__file__).resolve().parent
    run_label = timestamp_label()
    output_path = (
        Path(args.output).expanduser().resolve()
        if args.output
        else runtime_dir / f"live_editor_authoring_proof_{run_label}.json"
    )
    prompt_id = f"editor-live-proof-{run_label}"
    workspace_id: str | None = None
    executor_id: str | None = None
    preflight_facts: list[str] = []

    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": "live_editor_authoring_proof",
        "generated_at": utc_now(),
        "base_url": args.base_url,
        "output_path": str(output_path),
        "launch_assumptions": {
            "canonical_project_root": args.project_root,
            "canonical_engine_root": args.engine_root,
            "launch_helper_state": load_json_if_present(runtime_dir / "live-verify-launch.json"),
        },
        "proof_boundary": {
            "proof_driver": "prompt_orchestrator composed editor chain",
            "admitted_surface": [
                "editor.session.open",
                "editor.level.open",
                "editor.entity.create",
                "editor.component.add",
                "editor.component.property.get",
            ],
            "component_add_constraints": {
                "allowlisted_component": PROOF_COMPONENT,
                "entity_id_source": CREATED_ENTITY_ID_REF,
            },
            "component_property_read_constraints": {
                "component_id_source": ADDED_COMPONENT_ID_REF,
                "property_path": PROOF_PROPERTY_PATH,
            },
            "excluded_surface_note": (
                "This proof does not widen into arbitrary Editor Python, arbitrary components, "
                "arbitrary property writes, delete, parenting, prefab, material, asset, render, "
                "or build behavior."
            ),
            "bridge_dependency_note": (
                "Live bridge success still depends on the project-local ControlPlaneEditorBridge "
                "handler path on the active McpSandbox target."
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
        safe_level_info = select_safe_level(args.project_root)
        evidence_bundle["preflight"]["safe_level_selection"] = safe_level_info
        preflight_facts.append(
            f"Discovered safe non-default proof level {safe_level_info['selected_level_path']}."
        )

        ready_payload = json_request(base_url=args.base_url, method="GET", path="/ready")
        target_payload = json_request(base_url=args.base_url, method="GET", path="/o3de/target")
        bridge_payload = json_request(base_url=args.base_url, method="GET", path="/o3de/bridge")
        capabilities_payload = json_request(
            base_url=args.base_url,
            method="GET",
            path="/prompt/capabilities",
        )

        if not isinstance(ready_payload, dict):
            raise ProofError("GET /ready did not return an object response.")
        if not isinstance(target_payload, dict):
            raise ProofError("GET /o3de/target did not return an object response.")
        if not isinstance(bridge_payload, dict):
            raise ProofError("GET /o3de/bridge did not return an object response.")
        if not isinstance(capabilities_payload, dict):
            raise ProofError("GET /prompt/capabilities did not return an object response.")

        require_ready_payload(ready_payload)
        require_target_payload(
            target_payload,
            project_root=args.project_root,
            engine_root=args.engine_root,
        )
        require_bridge_payload(bridge_payload, project_root=args.project_root)

        admitted_capabilities = {
            tool_name: find_capability(capabilities_payload, tool_name=tool_name)
            for tool_name in (
                "editor.session.open",
                "editor.level.open",
                "editor.entity.create",
                "editor.component.add",
                "editor.component.property.get",
            )
        }
        require_capability_status(
            admitted_capabilities["editor.session.open"],
            tool_name="editor.session.open",
            expected_status="real-authoring",
            expected_stage="real-editor-authoring-active",
        )
        require_capability_status(
            admitted_capabilities["editor.level.open"],
            tool_name="editor.level.open",
            expected_status="real-authoring",
            expected_stage="real-editor-authoring-active",
        )
        require_capability_status(
            admitted_capabilities["editor.entity.create"],
            tool_name="editor.entity.create",
            expected_status="real-authoring",
            expected_stage="real-editor-authoring-active",
        )
        require_capability_status(
            admitted_capabilities["editor.component.add"],
            tool_name="editor.component.add",
            expected_status="real-authoring",
            expected_stage="real-editor-authoring-active",
        )
        require_capability_status(
            admitted_capabilities["editor.component.property.get"],
            tool_name="editor.component.property.get",
            expected_status="hybrid-read-only",
            expected_stage="real-read-only-active",
        )
        preflight_facts.extend(
            [
                "GET /ready reported ok=true and persistence_ready=true.",
                "GET /o3de/target matched the canonical McpSandbox project and engine roots.",
                "GET /o3de/bridge reported a fresh configured ControlPlaneEditorBridge heartbeat.",
                (
                    "GET /prompt/capabilities confirmed real-authoring admission for "
                    "editor.session.open, editor.level.open, editor.entity.create, and "
                    "editor.component.add, plus admitted read-only status for "
                    "editor.component.property.get."
                ),
            ]
        )

        evidence_bundle["preflight"].update(
            {
                "ready": scrub_secrets(ready_payload),
                "target": scrub_secrets(target_payload),
                "bridge": scrub_secrets(bridge_payload),
                "capabilities": {
                    tool_name: scrub_secrets(capability)
                    for tool_name, capability in admitted_capabilities.items()
                },
            }
        )

        prompt_payload, entity_name = build_prompt_request(
            run_label=run_label,
            project_root=args.project_root,
            engine_root=args.engine_root,
            prompt_id=prompt_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            level_path=safe_level_info["selected_level_path"],
        )
        prompt_create_response = json_request(
            base_url=args.base_url,
            method="POST",
            path="/prompt/sessions",
            payload=prompt_payload,
            timeout_s=30,
        )
        if not isinstance(prompt_create_response, dict):
            raise ProofError("POST /prompt/sessions did not return an object response.")
        require_prompt_plan(
            prompt_create_response,
            project_root=args.project_root,
            level_path=safe_level_info["selected_level_path"],
            entity_name=entity_name,
        )

        prompt_execution = execute_prompt_session_with_approvals(
            base_url=args.base_url,
            prompt_id=prompt_id,
        )
        final_session_record = prompt_execution["final_session_record_raw"]
        final_review_summary = require_review_summary(
            final_session_record,
            entity_name=entity_name,
        )
        step_records = build_child_step_records(
            base_url=args.base_url,
            session_record=final_session_record,
        )

        evidence_bundle["steps"] = {
            "prompt_session": {
                "create_request_payload": scrub_secrets(prompt_payload),
                "create_response": scrub_secrets(prompt_create_response),
                "execute_attempts": prompt_execution["execute_attempts"],
                "approval_events": prompt_execution["approval_events"],
                "final_session_record": scrub_secrets(final_session_record),
            },
            **step_records,
        }

        final_bridge_payload = json_request(
            base_url=args.base_url,
            method="GET",
            path="/o3de/bridge",
        )
        evidence_bundle["post_proof_bridge"] = scrub_secrets(final_bridge_payload)
        evidence_bundle["summary"] = build_success_summary(
            safe_level_info=safe_level_info,
            prompt_payload=prompt_payload,
            prompt_execution=prompt_execution,
            step_records=step_records,
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
