from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


CANONICAL_BASE_URL = "http://127.0.0.1:8000"
CANONICAL_PROJECT_ROOT = r"C:\Users\topgu\O3DE\Projects\McpSandbox"
CANONICAL_ENGINE_ROOT = r"C:\src\o3de"
CANONICAL_LEVEL_PATH = "Levels/DefaultLevel"
CANONICAL_AGENT = "editor-control"
CANONICAL_LOCKS = ["editor_session"]
SESSION_TIMEOUT_S = 180
LEVEL_TIMEOUT_S = 120
ENTITY_TIMEOUT_S = 120
SCRIPT_VERSION = "v0.1"


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


def require_target_payload(target_payload: dict[str, Any], *, project_root: str, engine_root: str) -> None:
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
        raise ProofError("GET /o3de/bridge heartbeat project_root did not match the canonical target.")
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
) -> None:
    if capability.get("capability_maturity") != expected_status:
        raise ProofError(
            f"{tool_name} capability_maturity was '{capability.get('capability_maturity')}', expected '{expected_status}'."
        )
    if capability.get("real_admission_stage") != "real-editor-authoring-active":
        raise ProofError(
            f"{tool_name} real_admission_stage was '{capability.get('real_admission_stage')}', expected 'real-editor-authoring-active'."
        )


def dispatch_with_approval(
    *,
    base_url: str,
    request_payload: dict[str, Any],
) -> dict[str, Any]:
    request_timeout_s = int(request_payload.get("timeout_s", 30)) + 30
    initial_response = json_request(
        base_url=base_url,
        method="POST",
        path="/tools/dispatch",
        payload=request_payload,
        timeout_s=30,
    )
    if not isinstance(initial_response, dict):
        raise ProofError("POST /tools/dispatch did not return an object response.")

    approval_id = initial_response.get("approval_id")
    approval_token = None
    approval_response: dict[str, Any] | None = None
    approved_request_payload = deepcopy(request_payload)
    final_response = initial_response

    if initial_response.get("ok") is not True:
        error_payload = initial_response.get("error")
        if not isinstance(error_payload, dict):
            raise ProofError("Dispatch failed without a structured error payload.")
        if error_payload.get("code") != "APPROVAL_REQUIRED":
            raise ProofError(
                f"Dispatch failed without approval continuation support: {json.dumps(initial_response, indent=2)}"
            )
        if not isinstance(approval_id, str) or not approval_id:
            raise ProofError("Approval-required dispatch did not return an approval_id.")
        error_details = error_payload.get("details")
        if isinstance(error_details, dict):
            approval_token = error_details.get("approval_token")
        approval_response = json_request(
            base_url=base_url,
            method="POST",
            path=f"/approvals/{approval_id}/approve",
            payload={},
            timeout_s=30,
        )
        if not isinstance(approval_response, dict):
            raise ProofError("Approval endpoint did not return an object response.")
        approval_token = approval_token or approval_response.get("token")
        if not isinstance(approval_token, str) or not approval_token:
            raise ProofError("Approval flow did not provide an approval token for the second dispatch.")
        approved_request_payload["approval_token"] = approval_token
        final_response = json_request(
            base_url=base_url,
            method="POST",
            path="/tools/dispatch",
            payload=approved_request_payload,
            timeout_s=request_timeout_s,
        )
        if not isinstance(final_response, dict):
            raise ProofError("Approved dispatch did not return an object response.")

    if final_response.get("ok") is not True:
        raise ProofError(f"Approved dispatch failed: {json.dumps(final_response, indent=2)}")

    run_id = final_response.get("operation_id")
    if not isinstance(run_id, str) or not run_id:
        raise ProofError("Successful dispatch did not return an operation_id.")

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
    artifact_record = json_request(
        base_url=base_url,
        method="GET",
        path=f"/artifacts/{artifact_id}",
        timeout_s=30,
    )
    if not isinstance(artifact_record, dict):
        raise ProofError(f"GET /artifacts/{artifact_id} did not return an object response.")

    return {
        "request_payload": scrub_secrets(request_payload),
        "initial_dispatch_response": scrub_secrets(initial_response),
        "approval_id": approval_id,
        "approval_response": scrub_secrets(approval_response),
        "approved_request_payload": scrub_secrets(approved_request_payload) if approval_response else None,
        "final_dispatch_response": scrub_secrets(final_response),
        "run_id": run_id,
        "execution_id": execution_id,
        "artifact_id": artifact_id,
        "run_record": scrub_secrets(run_record),
        "execution_record": scrub_secrets(execution_record),
        "artifact_record": scrub_secrets(artifact_record),
        "bridge_command_id": execution_record.get("details", {}).get("bridge_command_id")
        if isinstance(execution_record.get("details"), dict)
        else None,
    }


def build_session_request(
    *,
    run_label: str,
    project_root: str,
    engine_root: str,
    session_id: str,
    workspace_id: str,
    executor_id: str,
) -> dict[str, Any]:
    return {
        "request_id": f"proof-editor-session-open-{run_label}",
        "tool": "editor.session.open",
        "agent": CANONICAL_AGENT,
        "project_root": project_root,
        "engine_root": engine_root,
        "session_id": session_id,
        "workspace_id": workspace_id,
        "executor_id": executor_id,
        "dry_run": False,
        "locks": CANONICAL_LOCKS,
        "timeout_s": SESSION_TIMEOUT_S,
        "args": {
            "session_mode": "attach",
            "project_path": project_root,
            "level_path": CANONICAL_LEVEL_PATH,
            "timeout_s": SESSION_TIMEOUT_S,
        },
    }


def build_level_request(
    *,
    run_label: str,
    project_root: str,
    engine_root: str,
    session_id: str,
    workspace_id: str,
    executor_id: str,
) -> dict[str, Any]:
    return {
        "request_id": f"proof-editor-level-open-{run_label}",
        "tool": "editor.level.open",
        "agent": CANONICAL_AGENT,
        "project_root": project_root,
        "engine_root": engine_root,
        "session_id": session_id,
        "workspace_id": workspace_id,
        "executor_id": executor_id,
        "dry_run": False,
        "locks": CANONICAL_LOCKS,
        "timeout_s": LEVEL_TIMEOUT_S,
        "args": {
            "level_path": CANONICAL_LEVEL_PATH,
            "make_writable": True,
            "focus_viewport": True,
        },
    }


def build_entity_request(
    *,
    run_label: str,
    project_root: str,
    engine_root: str,
    session_id: str,
    workspace_id: str,
    executor_id: str,
    level_path: str,
) -> dict[str, Any]:
    entity_name = f"CodexProofEntity_{run_label.replace('-', '_')}"
    return {
        "request_id": f"proof-editor-entity-create-{run_label}",
        "tool": "editor.entity.create",
        "agent": CANONICAL_AGENT,
        "project_root": project_root,
        "engine_root": engine_root,
        "session_id": session_id,
        "workspace_id": workspace_id,
        "executor_id": executor_id,
        "dry_run": False,
        "locks": CANONICAL_LOCKS,
        "timeout_s": ENTITY_TIMEOUT_S,
        "args": {
            "entity_name": entity_name,
            "level_path": level_path,
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run the canonical live admitted-real editor proof flow against the "
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
    session_id = f"editor-session-proof-{run_label}"
    workspace_id = "workspace-live-proof"
    executor_id = "executor-live-proof"

    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": "live_editor_authoring_proof",
        "generated_at": utc_now(),
        "base_url": args.base_url,
        "output_path": str(output_path),
        "launch_assumptions": {
            "canonical_project_root": args.project_root,
            "canonical_engine_root": args.engine_root,
            "canonical_level_path": CANONICAL_LEVEL_PATH,
            "session_timeout_s": SESSION_TIMEOUT_S,
            "level_timeout_s": LEVEL_TIMEOUT_S,
            "entity_timeout_s": ENTITY_TIMEOUT_S,
            "launch_helper_state": load_json_if_present(runtime_dir / "live-verify-launch.json"),
        },
        "proof_boundary": {
            "admitted_surface": [
                "editor.session.open",
                "editor.level.open",
                "editor.entity.create",
            ],
            "entity_create_constraints": {
                "root_level_named_entity_only": True,
                "rejects_parent_entity_id": True,
                "rejects_prefab_asset": True,
                "rejects_position": True,
            },
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
            )
        }
        require_capability_status(
            admitted_capabilities["editor.session.open"],
            tool_name="editor.session.open",
            expected_status="real-authoring",
        )
        require_capability_status(
            admitted_capabilities["editor.level.open"],
            tool_name="editor.level.open",
            expected_status="real-authoring",
        )
        require_capability_status(
            admitted_capabilities["editor.entity.create"],
            tool_name="editor.entity.create",
            expected_status="real-authoring",
        )

        evidence_bundle["preflight"] = {
            "ready": scrub_secrets(ready_payload),
            "target": scrub_secrets(target_payload),
            "bridge": scrub_secrets(bridge_payload),
            "capabilities": {
                tool_name: scrub_secrets(capability)
                for tool_name, capability in admitted_capabilities.items()
            },
        }

        session_step = dispatch_with_approval(
            base_url=args.base_url,
            request_payload=build_session_request(
                run_label=run_label,
                project_root=args.project_root,
                engine_root=args.engine_root,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
            ),
        )
        evidence_bundle["steps"]["editor_session_open"] = session_step

        level_step = dispatch_with_approval(
            base_url=args.base_url,
            request_payload=build_level_request(
                run_label=run_label,
                project_root=args.project_root,
                engine_root=args.engine_root,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
            ),
        )
        evidence_bundle["steps"]["editor_level_open"] = level_step

        level_details = level_step["execution_record"].get("details", {})
        if not isinstance(level_details, dict):
            raise ProofError("Level-open execution record did not include structured details.")
        loaded_level_path = level_details.get("loaded_level_path") or level_details.get("level_path")
        if not isinstance(loaded_level_path, str) or not loaded_level_path:
            raise ProofError("Level-open proof did not return a loaded_level_path to feed entity creation.")

        entity_step = dispatch_with_approval(
            base_url=args.base_url,
            request_payload=build_entity_request(
                run_label=run_label,
                project_root=args.project_root,
                engine_root=args.engine_root,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                level_path=loaded_level_path,
            ),
        )
        evidence_bundle["steps"]["editor_entity_create"] = entity_step

        final_bridge_payload = json_request(
            base_url=args.base_url,
            method="GET",
            path="/o3de/bridge",
        )
        evidence_bundle["post_proof_bridge"] = scrub_secrets(final_bridge_payload)

        entity_details = entity_step["execution_record"].get("details", {})
        if not isinstance(entity_details, dict):
            raise ProofError("Entity-create execution record did not include structured details.")

        evidence_bundle["summary"] = {
            "succeeded": True,
            "status": "completed",
            "completed_at": utc_now(),
            "entity_name": entity_details.get("entity_name"),
            "entity_id": entity_details.get("entity_id"),
            "level_path": entity_details.get("level_path"),
            "loaded_level_path": entity_details.get("loaded_level_path"),
            "bridge_transport_confirmed": entity_details.get("editor_transport") == "bridge",
            "bridge_command_ids": {
                "editor.session.open": session_step.get("bridge_command_id"),
                "editor.level.open": level_step.get("bridge_command_id"),
                "editor.entity.create": entity_step.get("bridge_command_id"),
            },
            "records": {
                "run_ids": {
                    "editor.session.open": session_step.get("run_id"),
                    "editor.level.open": level_step.get("run_id"),
                    "editor.entity.create": entity_step.get("run_id"),
                },
                "execution_ids": {
                    "editor.session.open": session_step.get("execution_id"),
                    "editor.level.open": level_step.get("execution_id"),
                    "editor.entity.create": entity_step.get("execution_id"),
                },
                "artifact_ids": {
                    "editor.session.open": session_step.get("artifact_id"),
                    "editor.level.open": level_step.get("artifact_id"),
                    "editor.entity.create": entity_step.get("artifact_id"),
                },
                "approval_ids": {
                    "editor.session.open": session_step.get("approval_id"),
                    "editor.level.open": level_step.get("approval_id"),
                    "editor.entity.create": entity_step.get("approval_id"),
                },
            },
            "result_summary": (
                "Canonical live proof completed successfully through the persistent bridge-backed "
                "editor authoring path for session open, level open, and root-level named entity creation."
            ),
        }
    except Exception as exc:  # noqa: BLE001
        evidence_bundle["summary"] = {
            "succeeded": False,
            "status": "failed",
            "failed_at": utc_now(),
            "error_type": exc.__class__.__name__,
            "error_message": str(exc),
        }
    finally:
        output_path.write_text(json.dumps(evidence_bundle, indent=2, sort_keys=True), encoding="utf-8")

    print(str(output_path))
    return 0 if evidence_bundle["summary"]["succeeded"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
