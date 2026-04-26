from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import prove_live_editor_authoring as authoring
import prove_live_editor_component_property_list as property_list

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.adapters import AdapterExecutionRejected  # noqa: E402
from app.services.editor_automation_runtime import (  # noqa: E402
    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT,
    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT,
    editor_automation_runtime_service,
)

PROOF_NAME = "live_editor_component_find_proof"
SCRIPT_VERSION = "v0.1"
PROOF_COMPONENT_FAMILY = "Mesh"
PROOF_ENTITY_PREFIX = "CodexComponentFindProofEntity"
SUCCESS_NEXT_STEP = (
    "Post-component-find proof checkpoint refresh and target-binding proof alignment"
)


class ComponentFindProofError(authoring.ProofError):
    """Raised when the component-find live proof cannot complete."""


def _adapter_payload(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    adapter_status = adapters_payload.get("adapters")
    return adapter_status if isinstance(adapter_status, dict) else adapters_payload


def require_adapters_boundary(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    adapter_status = _adapter_payload(adapters_payload)
    real_tool_paths = adapter_status.get("real_tool_paths")
    if not isinstance(real_tool_paths, list):
        raise ComponentFindProofError("GET /adapters did not expose real_tool_paths.")

    real_tools = {str(item) for item in real_tool_paths}
    required_tools = {
        "editor.session.open",
        "editor.level.open",
        "editor.entity.create",
        "editor.component.add",
        "editor.component.find",
    }
    missing = sorted(required_tools.difference(real_tools))
    if missing:
        raise ComponentFindProofError(
            f"GET /adapters did not expose required admitted editor real paths: {missing}."
        )
    if "editor.component.property.list" in real_tools:
        raise ComponentFindProofError(
            "GET /adapters exposes editor.component.property.list; this proof expects "
            "property listing to remain proof-only and outside /adapters."
        )
    return adapter_status


def require_prompt_capability_boundary(capabilities_payload: dict[str, Any]) -> dict[str, Any]:
    capabilities = capabilities_payload.get("capabilities")
    if not isinstance(capabilities, list):
        raise ComponentFindProofError(
            "GET /prompt/capabilities did not expose a capabilities list."
        )

    by_tool = {
        item.get("tool_name"): item for item in capabilities if isinstance(item, dict)
    }
    component_find = by_tool.get("editor.component.find")
    if not isinstance(component_find, dict):
        raise ComponentFindProofError(
            "GET /prompt/capabilities did not expose editor.component.find."
        )
    if component_find.get("capability_maturity") != "hybrid-read-only":
        raise ComponentFindProofError(
            "editor.component.find did not report hybrid-read-only maturity."
        )
    safety = component_find.get("safety_envelope")
    if not isinstance(safety, dict):
        raise ComponentFindProofError(
            "editor.component.find did not include a safety envelope."
        )
    if safety.get("natural_language_status") != "prompt-ready-read-only":
        raise ComponentFindProofError(
            "editor.component.find did not report prompt-ready-read-only status."
        )
    if "editor.component.property.list" in by_tool:
        raise ComponentFindProofError(
            "GET /prompt/capabilities exposes editor.component.property.list; this "
            "proof expects property listing to remain unadmitted."
        )
    return component_find


def component_id_from_component_find_payload(component_payload: dict[str, Any]) -> str:
    runtime_result = component_payload.get("runtime_result")
    if not isinstance(runtime_result, dict):
        raise ComponentFindProofError(
            "Component-find proof step did not return a runtime_result object."
        )
    component_id = runtime_result.get("component_id")
    if not isinstance(component_id, str) or not component_id.strip():
        raise ComponentFindProofError(
            "Component-find proof step did not return a live component_id."
        )
    provenance = runtime_result.get("component_id_provenance")
    if provenance != COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT:
        raise ComponentFindProofError(
            "Component-find proof step did not return the admitted runtime discovery "
            "provenance marker."
        )
    component_refs = runtime_result.get("component_refs")
    if not isinstance(component_refs, list) or not component_refs:
        raise ComponentFindProofError(
            "Component-find proof step did not return component_refs."
        )
    first_ref = component_refs[0]
    if not isinstance(first_ref, dict):
        raise ComponentFindProofError(
            "Component-find proof step returned an invalid component ref."
        )
    if first_ref.get("component_id") != component_id:
        raise ComponentFindProofError(
            "Component-find proof step component_refs did not echo the live component_id."
        )
    if (
        first_ref.get("component_id_provenance")
        != COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT
    ):
        raise ComponentFindProofError(
            "Component-find proof step component_refs did not preserve live provenance."
        )
    return component_id.strip()


def target_info_from_runtime_steps(runtime_steps: dict[str, Any]) -> dict[str, Any]:
    entity_result = runtime_steps["entity_create"]["runtime_result"]
    component_add_result = runtime_steps["component_add"]["runtime_result"]
    component_find_result = runtime_steps["component_find"]["runtime_result"]
    added_component_id = property_list.component_id_from_component_add_payload(
        runtime_steps["component_add"]
    )
    discovered_component_id = component_id_from_component_find_payload(
        runtime_steps["component_find"]
    )
    added_component_refs = component_add_result.get("added_component_refs")
    selected_ref = (
        added_component_refs[0]
        if isinstance(added_component_refs, list)
        and added_component_refs
        and isinstance(added_component_refs[0], dict)
        else {}
    )
    selected = {
        "entity_id": entity_result.get("entity_id"),
        "entity_name": entity_result.get("entity_name"),
        "component": selected_ref.get("component", PROOF_COMPONENT_FAMILY),
        "added_component_id": added_component_id,
        "added_component_id_provenance": (
            COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
        ),
        "discovered_component_id": discovered_component_id,
        "discovered_component_id_provenance": (
            COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT
        ),
        "component_id_match": added_component_id == discovered_component_id,
        "discovery_lookup_mode": component_find_result.get("lookup_mode"),
        "selection_source": (
            COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT
        ),
    }
    return {
        "selection_rule": (
            "Create a temporary proof entity through admitted editor.entity.create, add "
            "the allowlisted Mesh component through admitted editor.component.add, and "
            "use admitted editor.component.find to rediscover the live runtime component id "
            "by exact entity name."
        ),
        "selected": selected,
        "candidates": [selected],
    }


def require_component_find_result(
    runtime_result: dict[str, Any],
    *,
    target: dict[str, Any],
) -> None:
    if runtime_result.get("ok") is not True:
        raise ComponentFindProofError("Component-find runtime result did not report ok=true.")
    if runtime_result.get("found") is not True:
        raise ComponentFindProofError("Component-find proof did not find the target.")
    if runtime_result.get("editor_transport") != "bridge":
        raise ComponentFindProofError("Component-find proof did not use bridge transport.")
    if runtime_result.get("bridge_operation") != "editor.component.find":
        raise ComponentFindProofError(
            "Component-find proof did not execute editor.component.find."
        )
    if runtime_result.get("component_name") != PROOF_COMPONENT_FAMILY:
        raise ComponentFindProofError("Component-find proof returned an unexpected component.")
    if (
        runtime_result.get("component_id_provenance")
        != COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT
    ):
        raise ComponentFindProofError(
            "Component-find proof did not report live discovery provenance."
        )
    if runtime_result.get("component_id") != target.get("added_component_id"):
        raise ComponentFindProofError(
            "Component-find proof did not return the component id produced by component.add."
        )
    if runtime_result.get("entity_name") != target.get("entity_name"):
        raise ComponentFindProofError(
            "Component-find proof did not return the expected exact entity name."
        )
    if runtime_result.get("lookup_mode") != "entity_name":
        raise ComponentFindProofError(
            "Component-find proof did not use the exact entity-name lookup mode."
        )
    for forbidden_key in ("property_path", "property_paths", "value", "value_type"):
        if forbidden_key in runtime_result:
            raise ComponentFindProofError(
                f"Component-find proof returned forbidden property evidence key: {forbidden_key}."
            )
    exact_editor_apis = runtime_result.get("exact_editor_apis")
    required_apis = {
        "EditorComponentAPIBus.HasComponentOfType",
        "EditorComponentAPIBus.GetComponentOfType",
    }
    if not isinstance(exact_editor_apis, list) or not required_apis.issubset(
        {str(item) for item in exact_editor_apis}
    ):
        raise ComponentFindProofError(
            "Component-find proof did not record the expected live component API evidence."
        )


def _execute_runtime_steps(
    *,
    run_label: str,
    project_root: str,
    engine_root: str,
    level_path: str,
) -> dict[str, Any]:
    session_id = f"component-find-proof-session-{run_label}"
    workspace_id = "workspace-live-component-find-proof"
    executor_id = "executor-editor-control-real-local"
    entity_name = f"{PROOF_ENTITY_PREFIX}_{run_label.replace('-', '_')}"
    runtime_steps: dict[str, Any] = {}
    restore_boundary: dict[str, Any] | None = None

    try:
        session_payload = editor_automation_runtime_service.execute_session_open(
            request_id=f"component-find-proof-session-open-{run_label}",
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=False,
            args={
                "session_mode": "attach",
                "project_path": project_root,
                "timeout_s": 180,
            },
            locks_acquired=["editor_session"],
        )
        runtime_steps["session"] = authoring.scrub_secrets(session_payload)

        level_payload = editor_automation_runtime_service.execute_level_open(
            request_id=f"component-find-proof-level-open-{run_label}",
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=False,
            args={
                "level_path": level_path,
                "make_writable": True,
                "focus_viewport": False,
            },
            locks_acquired=["editor_session"],
        )
        runtime_steps["level"] = authoring.scrub_secrets(level_payload)

        entity_payload = editor_automation_runtime_service.execute_entity_create(
            request_id=f"component-find-proof-entity-create-{run_label}",
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=False,
            args={
                "entity_name": entity_name,
                "level_path": level_path,
            },
            locks_acquired=["editor_session"],
        )
        runtime_steps["entity_create"] = authoring.scrub_secrets(entity_payload)
        restore_boundary = property_list.restore_boundary_from_entity_create_payload(
            entity_payload
        )
        entity_id = entity_payload["runtime_result"].get("entity_id")
        if not isinstance(entity_id, str) or not entity_id.strip():
            raise ComponentFindProofError(
                "Entity-create proof step did not return a live entity_id."
            )

        component_payload = editor_automation_runtime_service.execute_component_add(
            request_id=f"component-find-proof-component-add-{run_label}",
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=False,
            args={
                "entity_id": entity_id,
                "components": [PROOF_COMPONENT_FAMILY],
                "level_path": level_path,
            },
            locks_acquired=["editor_session"],
        )
        runtime_steps["component_add"] = authoring.scrub_secrets(component_payload)
        property_list.component_id_from_component_add_payload(component_payload)

        component_find_payload = editor_automation_runtime_service.execute_component_find(
            request_id=f"component-find-proof-read-{run_label}",
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=False,
            args={
                "entity_name": entity_name,
                "component_name": PROOF_COMPONENT_FAMILY,
                "level_path": level_path,
            },
            locks_acquired=["editor_session"],
        )
        runtime_steps["component_find"] = authoring.scrub_secrets(component_find_payload)
    except Exception as exc:  # noqa: BLE001
        if restore_boundary is not None:
            cleanup_restore = property_list.restore_after_mutation(
                restore_boundary,
                project_root=project_root,
            )
            runtime_steps["cleanup_restore"] = authoring.scrub_secrets(cleanup_restore)
            setattr(exc, "cleanup_restore", cleanup_restore)
        setattr(exc, "partial_runtime_steps", runtime_steps)
        raise

    cleanup_restore = property_list.restore_after_mutation(
        restore_boundary,
        project_root=project_root,
    )
    runtime_steps["cleanup_restore"] = authoring.scrub_secrets(cleanup_restore)
    return runtime_steps


def build_success_summary(
    *,
    safe_level_info: dict[str, Any],
    target_info: dict[str, Any],
    runtime_steps: dict[str, Any],
    adapters_boundary: dict[str, Any],
    prompt_capability: dict[str, Any],
) -> dict[str, Any]:
    selected = target_info["selected"]
    component_find_result = runtime_steps["component_find"]["runtime_result"]
    cleanup_restore = runtime_steps["cleanup_restore"]
    return {
        "succeeded": True,
        "status": "succeeded",
        "completed_at": authoring.utc_now(),
        "verified_facts": [
            f"Selected safe non-default level {safe_level_info['selected_level_path']}.",
            (
                "Provisioned temporary Mesh component target "
                f"{selected['added_component_id']} on entity {selected.get('entity_name')!r} "
                "through already-admitted editor.entity.create and editor.component.add."
            ),
            (
                "Executed editor.component.find through the typed ControlPlaneEditorBridge "
                "filesystem inbox using exact entity-name lookup."
            ),
            (
                "Confirmed discovered component id matched the component id returned by "
                "admitted editor.component.add."
            ),
            (
                "Confirmed discovery provenance "
                f"{component_find_result.get('component_id_provenance')}."
            ),
            "Confirmed /adapters exposes editor.component.find and not editor.component.property.list.",
            (
                "Confirmed Prompt Studio capabilities expose editor.component.find as "
                "hybrid read-only while property listing remains unadmitted."
            ),
            (
                "Restored the selected loaded-level prefab from the pre-mutation "
                f"backup with result {cleanup_restore.get('restore_result')}."
            ),
        ],
        "adapters_boundary": {
            "active_mode": adapters_boundary.get("active_mode"),
            "configured_mode": adapters_boundary.get("configured_mode"),
            "component_find_exposed": True,
            "property_list_exposed": False,
        },
        "prompt_capability_boundary": {
            "tool_name": prompt_capability.get("tool_name"),
            "capability_maturity": prompt_capability.get("capability_maturity"),
            "natural_language_status": (
                prompt_capability.get("safety_envelope", {}).get(
                    "natural_language_status"
                )
                if isinstance(prompt_capability.get("safety_envelope"), dict)
                else None
            ),
        },
        "mutation_occurred": True,
        "restore_or_cleanup_verified": cleanup_restore.get("restore_succeeded") is True,
        "cleanup_restore": {
            "restore_invoked": cleanup_restore.get("restore_invoked"),
            "restore_succeeded": cleanup_restore.get("restore_succeeded"),
            "restore_result": cleanup_restore.get("restore_result"),
            "restore_boundary_id": cleanup_restore.get("restore_boundary_id"),
            "restore_boundary_scope": cleanup_restore.get("restore_boundary_scope"),
            "restore_strategy": cleanup_restore.get("restore_strategy"),
            "restore_boundary_source_path": cleanup_restore.get(
                "restore_boundary_source_path"
            ),
            "restore_boundary_backup_path": cleanup_restore.get(
                "restore_boundary_backup_path"
            ),
            "restore_boundary_backup_sha256": cleanup_restore.get(
                "restore_boundary_backup_sha256"
            ),
            "restore_restored_sha256": cleanup_restore.get("restore_restored_sha256"),
        },
        "assumptions": [
            (
                "The temporary target uses only the already-admitted root entity creation "
                "and Mesh-only component-add surfaces."
            ),
            (
                "Restore proof is limited to filesystem restoration of the selected "
                "loaded-level prefab from the runtime-owned pre-entity-create backup."
            ),
        ],
        "missing_proof": [
            "No editor.component.property.list live command was executed by this proof.",
            "No property values or property writes were performed by this proof.",
            "No arbitrary Editor Python, delete, parenting, prefab, material, asset, render, build, or TIAF behavior was exercised.",
            "No live Editor undo, viewport reload, or post-restore entity-absence readback was proven.",
            "No broad component enumeration was proven.",
        ],
        "safest_next_step": SUCCESS_NEXT_STEP,
        "result_summary": (
            "Live component-find proof rediscovered a Mesh component id from runtime "
            "Editor evidence without using prefab-derived component ids or property listing."
        ),
    }


def failure_next_step(error_message: str) -> str:
    lowered = error_message.lower()
    if "heartbeat" in lowered or "bridge" in lowered:
        return "Re-establish canonical bridge readiness before rerunning the component-find proof."
    if "component.find" in lowered or "component id" in lowered:
        return (
            "Refresh the canonical ControlPlaneEditorBridge from the repo-owned setup "
            "script and rerun the bounded component-find proof."
        )
    return "Resolve the blocking component-find proof error without widening admission."


def build_failure_summary(
    *,
    error: Exception,
    preflight_facts: list[str],
) -> dict[str, Any]:
    details = getattr(error, "details", None)
    cleanup_restore = getattr(error, "cleanup_restore", None)
    cleanup_attempted = (
        isinstance(cleanup_restore, dict)
        and cleanup_restore.get("restore_attempted") is True
    )
    return {
        "succeeded": False,
        "status": "failed",
        "failed_at": authoring.utc_now(),
        "error_type": error.__class__.__name__,
        "error_message": str(error),
        "error_details": authoring.scrub_secrets(details) if isinstance(details, dict) else None,
        "verified_facts": preflight_facts,
        "mutation_occurred": cleanup_attempted,
        "restore_or_cleanup_verified": (
            isinstance(cleanup_restore, dict)
            and cleanup_restore.get("restore_succeeded") is True
        ),
        "cleanup_restore": (
            authoring.scrub_secrets(cleanup_restore)
            if isinstance(cleanup_restore, dict)
            else None
        ),
        "missing_proof": [
            "editor.component.find was not proven live in this run.",
            "Restore or rollback verification is only proven if cleanup_restore reports restore_succeeded=true.",
            "No property-list or property-write behavior was proven.",
        ],
        "safest_next_step": failure_next_step(str(error)),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a bounded live proof of admitted editor.component.find "
            "against the canonical local backend and bridge."
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
        else runtime_dir / f"live_editor_component_find_proof_{run_label}.json"
    )
    preflight_facts: list[str] = []
    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": PROOF_NAME,
        "generated_at": authoring.utc_now(),
        "base_url": args.base_url,
        "output_path": str(output_path),
        "proof_boundary": {
            "proof_driver": "direct runtime wrapper with admitted temporary target provisioning",
            "surface": "editor.component.find",
            "admission_boundary": (
                "Admitted hybrid read-only live component target binding; property "
                "listing remains proof-only and property writes remain refused."
            ),
            "excluded_surface_note": (
                "This proof does not widen into arbitrary Editor Python, property "
                "listing, property values, property writes, arbitrary component "
                "enumeration, delete, parenting, prefab, material, asset, render, "
                "build, or TIAF behavior."
            ),
            "target_provisioning_boundary": (
                "Temporary target provisioning is limited to the already-admitted "
                "editor.entity.create root entity path and Mesh-only editor.component.add path."
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
        evidence_bundle["preflight"]["safe_level_selection"] = safe_level_info
        preflight_facts.append(
            f"Selected safe non-default proof level {safe_level_info['selected_level_path']}."
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
            raise ComponentFindProofError("GET /ready did not return an object.")
        if not isinstance(target_payload, dict):
            raise ComponentFindProofError("GET /o3de/target did not return an object.")
        if not isinstance(bridge_payload, dict):
            raise ComponentFindProofError("GET /o3de/bridge did not return an object.")
        if not isinstance(adapters_payload, dict):
            raise ComponentFindProofError("GET /adapters did not return an object.")
        if not isinstance(capabilities_payload, dict):
            raise ComponentFindProofError(
                "GET /prompt/capabilities did not return an object."
            )

        authoring.require_ready_payload(ready_payload)
        authoring.require_target_payload(
            target_payload,
            project_root=args.project_root,
            engine_root=args.engine_root,
        )
        authoring.require_bridge_payload(bridge_payload, project_root=args.project_root)
        adapters_boundary = require_adapters_boundary(adapters_payload)
        prompt_capability = require_prompt_capability_boundary(capabilities_payload)
        runtime_environment = property_list.configure_runtime_environment_from_target(
            target_payload,
            project_root=args.project_root,
            engine_root=args.engine_root,
        )
        preflight_facts.extend(
            [
                "GET /ready reported ok=true and persistence_ready=true.",
                "GET /o3de/target matched the canonical McpSandbox project and engine roots.",
                "GET /o3de/bridge reported a fresh configured ControlPlaneEditorBridge heartbeat.",
                "GET /adapters confirmed editor.component.find is admitted and property.list is not.",
                "GET /prompt/capabilities confirmed component.find is prompt-ready read-only and property.list is not exposed.",
                "Seeded the proof subprocess editor runtime environment from GET /o3de/target.",
            ]
        )
        evidence_bundle["preflight"].update(
            {
                "ready": authoring.scrub_secrets(ready_payload),
                "target": authoring.scrub_secrets(target_payload),
                "bridge": authoring.scrub_secrets(bridge_payload),
                "adapters": authoring.scrub_secrets(adapters_boundary),
                "prompt_capability": authoring.scrub_secrets(prompt_capability),
                "runtime_environment": authoring.scrub_secrets(runtime_environment),
            }
        )

        runtime_steps = _execute_runtime_steps(
            run_label=run_label,
            project_root=args.project_root,
            engine_root=args.engine_root,
            level_path=safe_level_info["selected_level_path"],
        )
        target_info = target_info_from_runtime_steps(runtime_steps)
        evidence_bundle["preflight"]["component_target_selection"] = target_info
        selected_target = target_info["selected"]
        if selected_target.get("component_id_match") is not True:
            raise ComponentFindProofError(
                "Component-find live target did not match the admitted component.add target."
            )
        component_find_runtime_result = runtime_steps["component_find"]["runtime_result"]
        require_component_find_result(
            component_find_runtime_result,
            target=selected_target,
        )
        evidence_bundle["steps"] = runtime_steps
        authoring.require_cleanup_restore_succeeded(runtime_steps["cleanup_restore"])

        final_bridge_payload = authoring.json_request(
            base_url=args.base_url,
            method="GET",
            path="/o3de/bridge",
        )
        evidence_bundle["post_proof_bridge"] = authoring.scrub_secrets(final_bridge_payload)
        evidence_bundle["summary"] = build_success_summary(
            safe_level_info=safe_level_info,
            target_info=target_info,
            runtime_steps=runtime_steps,
            adapters_boundary=adapters_boundary,
            prompt_capability=prompt_capability,
        )
    except (AdapterExecutionRejected, Exception) as exc:  # noqa: BLE001
        partial_runtime_steps = getattr(exc, "partial_runtime_steps", None)
        if isinstance(partial_runtime_steps, dict):
            evidence_bundle["steps"] = authoring.scrub_secrets(partial_runtime_steps)
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
