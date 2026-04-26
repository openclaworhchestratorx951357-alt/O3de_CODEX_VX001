from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Callable

import prove_live_editor_authoring as authoring

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.adapters import AdapterExecutionRejected  # noqa: E402
from app.services.editor_automation_runtime import (  # noqa: E402
    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT,
    editor_automation_runtime_service,
)

PROOF_NAME = "live_editor_component_property_list_proof"
SCRIPT_VERSION = "v0.1"
PROOF_COMPONENT_TYPE_FRAGMENT = "EditorMeshComponent"
PROOF_COMPONENT_FAMILY = "Mesh"
PROOF_PROPERTY_PATH_FRAGMENT = "Controller|Configuration|Model Asset"
PROOF_ENTITY_PREFIX = "CodexPropertyListProofEntity"
SERIALIZED_PREFAB_COMPONENT_EVIDENCE = "serialized_prefab_record"
SUCCESS_NEXT_STEP = (
    "Provision or discover a non-asset, non-render scalar/text-like component "
    "property before any proof-only property-write packet"
)
WRITE_TARGET_BLOCKER_CODE = "no_non_asset_non_render_scalar_target"
WRITE_TARGET_REQUIRED_NEXT_EVIDENCE = (
    "Read-only live evidence for a non-asset, non-render, non-derived scalar or "
    "text-like property on an allowlisted component outside the Mesh render surface."
)
ASSET_PATH_MARKERS = ("asset", "material")
DERIVED_OR_CONTAINER_MARKERS = ("stats",)
RENDER_ADJACENT_PATH_MARKERS = (
    "ray tracing",
    "reflection",
    "forward pass",
    "lighting channel",
    "sort key",
    "lod",
    "screen coverage",
    "quality decay",
    "always moving",
    "mesh",
)


class ComponentPropertyListProofError(authoring.ProofError):
    """Raised when the property-list live proof cannot complete."""


def _component_numeric_id(component_key: str) -> str | None:
    prefix = "Component_["
    if component_key.startswith(prefix) and component_key.endswith("]"):
        candidate = component_key[len(prefix) : -1]
        return candidate if candidate.isdigit() else None
    return None


def _entity_numeric_id(entity_id: Any) -> str | None:
    if not isinstance(entity_id, str):
        return None
    prefix = "Entity_["
    if entity_id.startswith(prefix) and entity_id.endswith("]"):
        candidate = entity_id[len(prefix) : -1]
        return candidate if candidate.isdigit() else None
    return None


def _walk_prefab_entities(payload: Any) -> list[dict[str, Any]]:
    entities: list[dict[str, Any]] = []

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            nested_entities = value.get("Entities")
            if isinstance(nested_entities, dict):
                for entity_record in nested_entities.values():
                    if isinstance(entity_record, dict):
                        entities.append(entity_record)
            for item in value.values():
                visit(item)
        elif isinstance(value, list):
            for item in value:
                visit(item)

    visit(payload)
    return entities


def _target_sort_key(candidate: dict[str, Any]) -> tuple[int, str, str]:
    entity_name = str(candidate.get("entity_name") or "")
    preferred_rank = 0 if entity_name == "Ground" else 1
    return (
        preferred_rank,
        entity_name.lower(),
        str(candidate.get("component_numeric_id") or ""),
    )


def collect_serialized_prefab_component_records(
    safe_level_info: dict[str, Any],
) -> list[dict[str, Any]]:
    prefab_path_raw = safe_level_info.get("selected_prefab_path")
    level_path = safe_level_info.get("selected_level_path")
    if not isinstance(prefab_path_raw, str) or not prefab_path_raw:
        raise ComponentPropertyListProofError("Safe level selection did not include a prefab path.")
    if not isinstance(level_path, str) or not level_path:
        raise ComponentPropertyListProofError("Safe level selection did not include a level path.")

    prefab_path = Path(prefab_path_raw).expanduser().resolve()
    try:
        payload = json.loads(prefab_path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ComponentPropertyListProofError(
            f"Could not read selected level prefab for component target selection: {prefab_path}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise ComponentPropertyListProofError(
            f"Selected level prefab is not valid JSON: {prefab_path}"
        ) from exc

    candidates: list[dict[str, Any]] = []
    for entity_record in _walk_prefab_entities(payload):
        entity_id = _entity_numeric_id(entity_record.get("Id"))
        entity_name = entity_record.get("Name")
        components = entity_record.get("Components")
        if entity_id is None or not isinstance(components, dict):
            continue
        for component_key, component_record in components.items():
            if not isinstance(component_key, str) or not isinstance(component_record, dict):
                continue
            component_type = component_record.get("$type")
            component_numeric_id = _component_numeric_id(component_key)
            if (
                component_numeric_id is None
                or not isinstance(component_type, str)
                or PROOF_COMPONENT_TYPE_FRAGMENT not in component_type
            ):
                continue
            serialized_component_id = (
                f"EntityComponentIdPair(EntityId({entity_id}), {component_numeric_id})"
            )
            candidates.append(
                {
                    "level_path": level_path,
                    "prefab_path": str(prefab_path),
                    "entity_id": entity_id,
                    "entity_name": entity_name if isinstance(entity_name, str) else None,
                    "serialized_component_id": serialized_component_id,
                    "component_numeric_id": component_numeric_id,
                    "component_type": component_type,
                    "component_id_provenance": SERIALIZED_PREFAB_COMPONENT_EVIDENCE,
                    "evidence_class": "serialized_file_evidence",
                    "live_property_target": False,
                    "selection_source": SERIALIZED_PREFAB_COMPONENT_EVIDENCE,
                    "non_live_reason": (
                        "Prefab component records are serialized level-file evidence "
                        "only; they are not live Editor component ids."
                    ),
                }
            )
    return sorted(candidates, key=_target_sort_key)


def _adapter_payload(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    adapter_status = adapters_payload.get("adapters")
    return adapter_status if isinstance(adapter_status, dict) else adapters_payload


def require_adapters_boundary(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    adapter_status = _adapter_payload(adapters_payload)
    real_tool_paths = adapter_status.get("real_tool_paths")
    if not isinstance(real_tool_paths, list):
        raise ComponentPropertyListProofError("GET /adapters did not expose real_tool_paths.")
    if "editor.component.property.list" in real_tool_paths:
        raise ComponentPropertyListProofError(
            "GET /adapters already exposes editor.component.property.list; this proof "
            "expects the operation to remain proof-only and not dispatcher/catalog-admitted."
        )
    required_tools = {
        "editor.session.open",
        "editor.level.open",
    }
    missing = sorted(required_tools.difference(str(item) for item in real_tool_paths))
    if missing:
        raise ComponentPropertyListProofError(
            f"GET /adapters did not expose required session/level real paths: {missing}."
        )
    return adapter_status


def configure_runtime_environment_from_target(
    target_payload: dict[str, Any],
    *,
    project_root: str,
    engine_root: str,
) -> dict[str, str]:
    editor_runner = target_payload.get("editor_runner")
    runtime_runner = target_payload.get("runtime_runner") or editor_runner
    if not isinstance(editor_runner, str) or not editor_runner.strip():
        raise ComponentPropertyListProofError(
            "GET /o3de/target did not provide an editor_runner for the proof subprocess."
        )
    if target_payload.get("editor_runner_exists") is not True:
        raise ComponentPropertyListProofError(
            "GET /o3de/target reported editor_runner_exists=false."
        )
    if not isinstance(runtime_runner, str) or not runtime_runner.strip():
        raise ComponentPropertyListProofError(
            "GET /o3de/target did not provide a runtime runner for the proof subprocess."
        )

    configured = {
        "O3DE_TARGET_PROJECT_ROOT": project_root,
        "O3DE_TARGET_ENGINE_ROOT": engine_root,
        "O3DE_TARGET_EDITOR_RUNNER": editor_runner,
        "O3DE_EDITOR_SCRIPT_RUNNER": runtime_runner,
    }
    os.environ.update(configured)
    return configured


def component_id_from_component_add_payload(component_payload: dict[str, Any]) -> str:
    runtime_result = component_payload.get("runtime_result")
    if not isinstance(runtime_result, dict):
        raise ComponentPropertyListProofError(
            "Component-add proof step did not return a runtime_result object."
        )
    added_component_refs = runtime_result.get("added_component_refs")
    if not isinstance(added_component_refs, list) or not added_component_refs:
        raise ComponentPropertyListProofError(
            "Component-add proof step did not return added_component_refs."
        )
    first_ref = added_component_refs[0]
    if not isinstance(first_ref, dict):
        raise ComponentPropertyListProofError(
            "Component-add proof step returned an invalid component ref."
        )
    component_id = first_ref.get("component_id")
    if not isinstance(component_id, str) or not component_id.strip():
        raise ComponentPropertyListProofError(
            "Component-add proof step did not return a live component_id."
        )
    component_id_provenance = first_ref.get("component_id_provenance")
    if (
        component_id_provenance
        != COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
    ):
        raise ComponentPropertyListProofError(
            "Component-add proof step did not return an admitted runtime component_id "
            "provenance marker."
        )
    return component_id.strip()


def restore_boundary_from_entity_create_payload(entity_payload: dict[str, Any]) -> dict[str, Any]:
    runtime_result = entity_payload.get("runtime_result")
    if not isinstance(runtime_result, dict):
        raise ComponentPropertyListProofError(
            "Entity-create proof step did not return a runtime_result object."
        )
    required_keys = (
        "restore_boundary_id",
        "restore_boundary_scope",
        "restore_strategy",
        "restore_boundary_source_path",
        "restore_boundary_backup_path",
        "restore_boundary_backup_sha256",
    )
    missing = [
        key
        for key in required_keys
        if not isinstance(runtime_result.get(key), str) or not runtime_result.get(key)
    ]
    if missing:
        raise ComponentPropertyListProofError(
            f"Entity-create proof step did not expose restore boundary keys: {missing}."
        )
    if runtime_result.get("restore_boundary_available") is not True:
        raise ComponentPropertyListProofError(
            "Entity-create proof step did not expose an available restore boundary."
        )
    return {
        key: value
        for key, value in runtime_result.items()
        if key.startswith("restore_")
    }


def restore_after_mutation(
    restore_boundary: dict[str, Any],
    *,
    project_root: str,
) -> dict[str, Any]:
    try:
        return authoring.restore_cleanup_boundary(
            restore_boundary,
            project_root=project_root,
        )
    except Exception as exc:  # noqa: BLE001
        outcome = dict(restore_boundary)
        outcome.update(
            {
                "restore_invoked": True,
                "restore_attempted": True,
                "restore_succeeded": False,
                "restore_result": "restore_exception",
                "restore_error": str(exc),
            }
        )
        return outcome


def target_info_from_runtime_steps(
    runtime_steps: dict[str, Any],
    *,
    component_family: str = PROOF_COMPONENT_FAMILY,
) -> dict[str, Any]:
    entity_result = runtime_steps["entity_create"]["runtime_result"]
    component_result = runtime_steps["component_add"]["runtime_result"]
    component_id = component_id_from_component_add_payload(runtime_steps["component_add"])
    added_component_refs = component_result.get("added_component_refs")
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
        "component": selected_ref.get("component", component_family),
        "component_id": component_id,
        "component_id_provenance": (
            COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
        ),
        "component_numeric_id": selected_ref.get("component_numeric_id"),
        "selection_source": (
            COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
        ),
    }
    return {
        "selection_rule": (
            "Create a temporary proof entity through admitted editor.entity.create, add "
            "the allowlisted Mesh component through admitted editor.component.add, and "
            "use the returned live component_id for the proof-only property-list read."
        ),
        "selected": selected,
        "candidates": [selected],
    }


def require_property_list_result(
    runtime_result: dict[str, Any],
    *,
    target: dict[str, Any],
    expected_property_path: str | None = PROOF_PROPERTY_PATH_FRAGMENT,
) -> None:
    if runtime_result.get("ok") is not True:
        raise ComponentPropertyListProofError("Property-list runtime result did not report ok=true.")
    if runtime_result.get("editor_transport") != "bridge":
        raise ComponentPropertyListProofError("Property-list proof did not use bridge transport.")
    if runtime_result.get("bridge_operation") != "editor.component.property.list":
        raise ComponentPropertyListProofError(
            "Property-list proof did not execute editor.component.property.list."
        )
    property_paths = runtime_result.get("property_paths")
    if not isinstance(property_paths, list) or not property_paths:
        raise ComponentPropertyListProofError(
            "Property-list proof did not return a non-empty property_paths list."
        )
    if any(not isinstance(item, str) or not item.strip() for item in property_paths):
        raise ComponentPropertyListProofError(
            "Property-list proof returned a non-string or empty property path."
        )
    if "value" in runtime_result:
        raise ComponentPropertyListProofError(
            "Property-list proof returned a property value; this proof must list paths only."
        )
    exact_editor_apis = runtime_result.get("exact_editor_apis")
    if (
        not isinstance(exact_editor_apis, list)
        or "EditorComponentAPIBus.BuildComponentPropertyList" not in exact_editor_apis
    ):
        raise ComponentPropertyListProofError(
            "Property-list proof did not record BuildComponentPropertyList evidence."
        )
    if expected_property_path is not None and expected_property_path not in property_paths:
        raise ComponentPropertyListProofError(
            f"Property-list proof did not include expected Mesh path "
            f"{expected_property_path!r}."
        )
    returned_component_id = runtime_result.get("component_id")
    if not isinstance(returned_component_id, str) or not returned_component_id.strip():
        raise ComponentPropertyListProofError(
            "Property-list proof did not return a concrete component_id."
        )
    if runtime_result.get("component_type") not in {None, target.get("component_type")}:
        raise ComponentPropertyListProofError(
            "Property-list proof returned an unexpected component_type."
        )


def classify_property_paths_for_write_target(
    property_paths: list[str],
) -> dict[str, Any]:
    normalized_paths = [path.strip() for path in property_paths if path.strip()]
    path_prefixes = {
        "|".join(path.split("|")[:index])
        for path in normalized_paths
        for index in range(1, len(path.split("|")))
    }
    reviews: list[dict[str, Any]] = []

    for path in normalized_paths:
        lowered = path.lower()
        if path in path_prefixes:
            evidence_class = "container_or_group"
            reason = (
                "The path is a grouping/container path in the Mesh property tree, "
                "not a concrete scalar write target."
            )
        elif any(marker in lowered for marker in ASSET_PATH_MARKERS):
            evidence_class = "asset_or_material_reference"
            reason = (
                "The path is asset/material-adjacent and would require separate "
                "asset identity proof before any write."
            )
        elif any(marker in lowered for marker in DERIVED_OR_CONTAINER_MARKERS):
            evidence_class = "derived_or_read_only_stats"
            reason = (
                "The path is derived/statistical readback evidence, not a stable "
                "operator-selected write target."
            )
        elif any(marker in lowered for marker in RENDER_ADJACENT_PATH_MARKERS):
            evidence_class = "render_adjacent_scalar_candidate"
            reason = (
                "The path may be scalar-like, but it belongs to the Mesh render "
                "configuration surface and is outside the first property-write target "
                "boundary."
            )
        else:
            evidence_class = "unclassified_mesh_property"
            reason = (
                "The path is not enough evidence by itself; live value type and "
                "non-render safety still need proof before target selection."
            )

        reviews.append(
            {
                "property_path": path,
                "evidence_class": evidence_class,
                "write_target_allowed": False,
                "reason": reason,
            }
        )

    return {
        "target_selected": False,
        "status": "blocked",
        "blocker_code": WRITE_TARGET_BLOCKER_CODE,
        "component_family": PROOF_COMPONENT_FAMILY,
        "reviewed_property_count": len(reviews),
        "reviewed_paths": reviews,
        "required_next_evidence": WRITE_TARGET_REQUIRED_NEXT_EVIDENCE,
    }


def _execute_runtime_steps(
    *,
    run_label: str,
    project_root: str,
    engine_root: str,
    level_path: str,
    component_family: str = PROOF_COMPONENT_FAMILY,
    entity_prefix: str = PROOF_ENTITY_PREFIX,
    request_prefix: str = "property-list-proof",
    property_list_args: dict[str, Any] | None = None,
    property_read_selector: Callable[[list[str]], dict[str, Any]] | None = None,
) -> dict[str, Any]:
    session_id = f"{request_prefix}-session-{run_label}"
    workspace_id = "workspace-live-property-list-proof"
    executor_id = "executor-editor-control-real-local"
    entity_name = f"{entity_prefix}_{run_label.replace('-', '_')}"
    runtime_steps: dict[str, Any] = {}
    restore_boundary: dict[str, Any] | None = None

    try:
        session_payload = editor_automation_runtime_service.execute_session_open(
            request_id=f"{request_prefix}-session-open-{run_label}",
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
            request_id=f"{request_prefix}-level-open-{run_label}",
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
            request_id=f"{request_prefix}-entity-create-{run_label}",
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
        restore_boundary = restore_boundary_from_entity_create_payload(entity_payload)
        entity_id = entity_payload["runtime_result"].get("entity_id")
        if not isinstance(entity_id, str) or not entity_id.strip():
            raise ComponentPropertyListProofError(
                "Entity-create proof step did not return a live entity_id."
            )

        component_payload = editor_automation_runtime_service.execute_component_add(
            request_id=f"{request_prefix}-component-add-{run_label}",
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=False,
            args={
                "entity_id": entity_id,
                "components": [component_family],
                "level_path": level_path,
            },
            locks_acquired=["editor_session"],
        )
        runtime_steps["component_add"] = authoring.scrub_secrets(component_payload)
        component_id = component_id_from_component_add_payload(component_payload)

        property_list_payload = (
            editor_automation_runtime_service.execute_component_property_list(
                request_id=f"{request_prefix}-read-{run_label}",
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=False,
                args={
                    "component_id": component_id,
                    "level_path": level_path,
                    **(property_list_args or {}),
                },
                locks_acquired=["editor_session"],
            )
        )
        runtime_steps["property_list"] = authoring.scrub_secrets(property_list_payload)

        if property_read_selector is not None:
            raw_property_paths = property_list_payload["runtime_result"].get(
                "property_paths"
            )
            if not isinstance(raw_property_paths, list) or any(
                not isinstance(item, str) for item in raw_property_paths
            ):
                raise ComponentPropertyListProofError(
                    "Property-read selector requires a string property_paths list."
                )
            property_read_selection = property_read_selector(
                [item for item in raw_property_paths if item.strip()]
            )
            runtime_steps["property_target_selection"] = authoring.scrub_secrets(
                property_read_selection
            )
            selected_property_path = property_read_selection.get(
                "selected_property_path"
            )
            if isinstance(selected_property_path, str) and selected_property_path.strip():
                property_get_payload = (
                    editor_automation_runtime_service.execute_component_property_get(
                        request_id=f"{request_prefix}-property-get-{run_label}",
                        session_id=session_id,
                        workspace_id=workspace_id,
                        executor_id=executor_id,
                        project_root=project_root,
                        engine_root=engine_root,
                        dry_run=False,
                        args={
                            "component_id": component_id,
                            "property_path": selected_property_path.strip(),
                            "level_path": level_path,
                        },
                        locks_acquired=["editor_session"],
                    )
                )
                runtime_steps["property_get"] = authoring.scrub_secrets(
                    property_get_payload
                )
    except Exception as exc:  # noqa: BLE001
        if restore_boundary is not None:
            cleanup_restore = restore_after_mutation(
                restore_boundary,
                project_root=project_root,
            )
            runtime_steps["cleanup_restore"] = authoring.scrub_secrets(cleanup_restore)
            setattr(exc, "cleanup_restore", cleanup_restore)
        setattr(exc, "partial_runtime_steps", runtime_steps)
        raise

    cleanup_restore = restore_after_mutation(
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
) -> dict[str, Any]:
    selected = target_info["selected"]
    property_result = runtime_steps["property_list"]["runtime_result"]
    property_paths = property_result["property_paths"]
    write_target_discovery_review = classify_property_paths_for_write_target(
        property_paths
    )
    cleanup_restore = runtime_steps["cleanup_restore"]
    return {
        "succeeded": True,
        "status": "succeeded",
        "completed_at": authoring.utc_now(),
        "verified_facts": [
            f"Selected safe non-default level {safe_level_info['selected_level_path']}.",
            (
                "Provisioned temporary Mesh component target "
                f"{selected['component_id']} on entity {selected.get('entity_name')!r} "
                "through already-admitted editor.entity.create and editor.component.add."
            ),
            (
                "Executed editor.component.property.list through the typed "
                "ControlPlaneEditorBridge filesystem inbox."
            ),
            (
                f"Returned {len(property_paths)} property path(s), including "
                f"{PROOF_PROPERTY_PATH_FRAGMENT}."
            ),
            (
                "Classified Mesh property paths for first-write suitability and "
                f"blocked target selection with {WRITE_TARGET_BLOCKER_CODE}."
            ),
            "Confirmed /adapters still does not expose editor.component.property.list.",
            (
                "Restored the selected loaded-level prefab from the pre-mutation "
                f"backup with result {cleanup_restore.get('restore_result')}."
            ),
        ],
        "adapters_boundary": {
            "active_mode": adapters_boundary.get("active_mode"),
            "configured_mode": adapters_boundary.get("configured_mode"),
            "property_list_exposed": False,
        },
        "mutation_occurred": True,
        "restore_or_cleanup_verified": cleanup_restore.get("restore_succeeded") is True,
        "write_target_discovery_review": write_target_discovery_review,
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
            "No Prompt Studio, dispatcher, catalog, or /adapters admission was proven.",
            "No property values were read by this property-list proof.",
            (
                "No non-asset, non-render scalar/text-like property target was selected "
                "from the Mesh property path set."
            ),
            "No property writes, arbitrary Editor Python, delete, parenting, prefab, material, asset, render, build, or TIAF behavior was exercised.",
            "No live Editor undo, viewport reload, or post-restore entity-absence readback was proven.",
        ],
        "safest_next_step": SUCCESS_NEXT_STEP,
        "result_summary": (
            "Live typed bridge proof listed Mesh component property paths on a temporary "
            "admitted-chain target without admitting property-list to Prompt Studio or /adapters."
        ),
    }


def failure_next_step(error_message: str) -> str:
    lowered = error_message.lower()
    if "heartbeat" in lowered or "bridge" in lowered:
        return "Re-establish canonical bridge readiness before rerunning the property-list proof."
    if "component target" in lowered or "component_id" in lowered:
        return (
            "Provision or identify an existing safe-level Mesh component target before "
            "rerunning the read-only property-list proof."
        )
    return "Resolve the blocking property-list proof error without widening admission."


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
            "editor.component.property.list was not proven live in this run.",
            "No Prompt Studio, dispatcher, catalog, or /adapters admission was proven.",
            (
                "Restore or rollback verification is only proven if cleanup_restore reports "
                "restore_succeeded=true."
            ),
        ],
        "safest_next_step": failure_next_step(str(error)),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a bounded proof-only live read of editor.component.property.list "
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
        else runtime_dir / f"live_editor_component_property_list_proof_{run_label}.json"
    )
    preflight_facts: list[str] = []
    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": PROOF_NAME,
        "generated_at": authoring.utc_now(),
        "base_url": args.base_url,
        "output_path": str(output_path),
        "proof_boundary": {
            "proof_driver": "direct proof-only runtime wrapper with admitted temporary target provisioning",
            "surface": "editor.component.property.list",
            "admission_boundary": (
                "Proof-only typed bridge read; not dispatcher/catalog-admitted and "
                "not Prompt Studio-admitted."
            ),
            "excluded_surface_note": (
                "This proof does not widen into arbitrary Editor Python, property values, "
                "property writes, arbitrary component browsing, delete, parenting, prefab, "
                "material, asset, render, build, or TIAF behavior."
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
        if not isinstance(ready_payload, dict):
            raise ComponentPropertyListProofError("GET /ready did not return an object.")
        if not isinstance(target_payload, dict):
            raise ComponentPropertyListProofError("GET /o3de/target did not return an object.")
        if not isinstance(bridge_payload, dict):
            raise ComponentPropertyListProofError("GET /o3de/bridge did not return an object.")
        if not isinstance(adapters_payload, dict):
            raise ComponentPropertyListProofError("GET /adapters did not return an object.")

        authoring.require_ready_payload(ready_payload)
        authoring.require_target_payload(
            target_payload,
            project_root=args.project_root,
            engine_root=args.engine_root,
        )
        authoring.require_bridge_payload(bridge_payload, project_root=args.project_root)
        adapters_boundary = require_adapters_boundary(adapters_payload)
        runtime_environment = configure_runtime_environment_from_target(
            target_payload,
            project_root=args.project_root,
            engine_root=args.engine_root,
        )
        preflight_facts.extend(
            [
                "GET /ready reported ok=true and persistence_ready=true.",
                "GET /o3de/target matched the canonical McpSandbox project and engine roots.",
                "GET /o3de/bridge reported a fresh configured ControlPlaneEditorBridge heartbeat.",
                "GET /adapters confirmed editor.component.property.list remains unadmitted.",
                "Seeded the proof subprocess editor runtime environment from GET /o3de/target.",
            ]
        )
        evidence_bundle["preflight"].update(
            {
                "ready": authoring.scrub_secrets(ready_payload),
                "target": authoring.scrub_secrets(target_payload),
                "bridge": authoring.scrub_secrets(bridge_payload),
                "adapters": authoring.scrub_secrets(adapters_boundary),
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
        property_runtime_result = runtime_steps["property_list"]["runtime_result"]
        require_property_list_result(
            property_runtime_result,
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
