from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import prove_live_editor_authoring as authoring
import prove_live_editor_component_property_list as property_list

from app.services.editor_automation_runtime import (  # noqa: E402
    CAMERA_SCALAR_WRITE_PROOF_COMPONENT,
    CAMERA_SCALAR_WRITE_PROOF_OPERATION,
    CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH,
    CAMERA_SCALAR_WRITE_PROOF_VALUE_TYPE,
    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT,
    editor_automation_runtime_service,
)

PROOF_NAME = "live_editor_camera_scalar_write_proof"
SCRIPT_VERSION = "v0.1"
PROOF_ENTITY_PREFIX = "CodexCameraScalarWriteProofEntity"
REQUEST_PREFIX = "camera-scalar-write-proof"
TARGET_COMPONENT = CAMERA_SCALAR_WRITE_PROOF_COMPONENT
TARGET_PROPERTY_PATH = CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH
TARGET_VALUE_TYPE = CAMERA_SCALAR_WRITE_PROOF_VALUE_TYPE
TARGET_PROVENANCE = COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT


class CameraScalarWriteProofError(authoring.ProofError):
    """Raised when the proof-only Camera scalar write harness cannot complete."""


def _adapter_payload(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    adapter_status = adapters_payload.get("adapters")
    return adapter_status if isinstance(adapter_status, dict) else adapters_payload


def require_adapters_boundary(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    adapter_status = property_list.require_adapters_boundary(adapters_payload)
    real_tool_paths = _adapter_payload(adapters_payload).get("real_tool_paths")
    if not isinstance(real_tool_paths, list):
        raise CameraScalarWriteProofError("GET /adapters did not expose real_tool_paths.")
    forbidden_paths = {
        "editor.component.property.list",
        "editor.component.property.write",
        "editor.component.property.set",
        CAMERA_SCALAR_WRITE_PROOF_OPERATION,
    }
    exposed = sorted(forbidden_paths.intersection(str(item) for item in real_tool_paths))
    if exposed:
        raise CameraScalarWriteProofError(
            f"GET /adapters exposes proof-only or write paths: {exposed}."
        )
    return adapter_status


def require_allowed_camera_write_target(
    *,
    component_name: Any,
    property_path: Any,
    value: Any,
    component_id_provenance: Any = TARGET_PROVENANCE,
    restore_boundary_id: Any = "restore-boundary",
) -> dict[str, Any]:
    if component_name != TARGET_COMPONENT:
        raise CameraScalarWriteProofError(
            "Camera scalar write proof only allows the Camera component."
        )
    if property_path != TARGET_PROPERTY_PATH:
        raise CameraScalarWriteProofError(
            "Camera scalar write proof only allows the selected Camera bool path."
        )
    if not isinstance(value, bool):
        raise CameraScalarWriteProofError(
            "Camera scalar write proof only allows bool values."
        )
    if component_id_provenance != TARGET_PROVENANCE:
        raise CameraScalarWriteProofError(
            "Camera scalar write proof requires admitted component-add provenance."
        )
    if not isinstance(restore_boundary_id, str) or not restore_boundary_id.strip():
        raise CameraScalarWriteProofError(
            "Camera scalar write proof requires a restore boundary before mutation."
        )
    return {
        "component_name": TARGET_COMPONENT,
        "property_path": TARGET_PROPERTY_PATH,
        "value": value,
        "value_type": TARGET_VALUE_TYPE,
        "component_id_provenance": TARGET_PROVENANCE,
        "restore_boundary_id": restore_boundary_id,
    }


def _runtime_result(payload: dict[str, Any], *, label: str) -> dict[str, Any]:
    runtime_result = payload.get("runtime_result")
    if not isinstance(runtime_result, dict):
        raise CameraScalarWriteProofError(f"{label} did not return runtime_result.")
    if runtime_result.get("ok") is not True:
        raise CameraScalarWriteProofError(f"{label} did not report ok=true.")
    return runtime_result


def require_bool_property_readback(
    payload: dict[str, Any],
    *,
    component_id: str,
    expected_value: bool | None = None,
    label: str,
) -> dict[str, Any]:
    runtime_result = _runtime_result(payload, label=label)
    if runtime_result.get("component_id") != component_id:
        raise CameraScalarWriteProofError(
            f"{label} did not read the selected live Camera component_id."
        )
    if runtime_result.get("property_path") != TARGET_PROPERTY_PATH:
        raise CameraScalarWriteProofError(
            f"{label} did not preserve the selected Camera property path."
        )
    value = runtime_result.get("value")
    if not isinstance(value, bool):
        raise CameraScalarWriteProofError(f"{label} did not return a bool value.")
    if expected_value is not None and value != expected_value:
        raise CameraScalarWriteProofError(
            f"{label} did not return the expected bool value."
        )
    return {
        "label": label,
        "component_id": component_id,
        "property_path": TARGET_PROPERTY_PATH,
        "value": value,
        "value_type": runtime_result.get("value_type", TARGET_VALUE_TYPE),
        "bridge_command_id": runtime_result.get("bridge_command_id"),
    }


def require_camera_write_result(
    payload: dict[str, Any],
    *,
    component_id: str,
    expected_previous_value: bool,
    expected_value: bool,
    label: str,
) -> dict[str, Any]:
    runtime_result = _runtime_result(payload, label=label)
    if runtime_result.get("proof_only") is not True:
        raise CameraScalarWriteProofError(f"{label} was not marked proof-only.")
    if runtime_result.get("public_admission") is not False:
        raise CameraScalarWriteProofError(f"{label} reported public admission.")
    if runtime_result.get("write_admission") is not False:
        raise CameraScalarWriteProofError(f"{label} admitted property writes.")
    if runtime_result.get("property_list_admission") is not False:
        raise CameraScalarWriteProofError(f"{label} admitted property.list.")
    if runtime_result.get("bridge_operation") != CAMERA_SCALAR_WRITE_PROOF_OPERATION:
        raise CameraScalarWriteProofError(
            f"{label} did not execute the proof-only Camera bridge operation."
        )
    if runtime_result.get("component_name") != TARGET_COMPONENT:
        raise CameraScalarWriteProofError(f"{label} did not preserve Camera component.")
    if runtime_result.get("component_id") != component_id:
        raise CameraScalarWriteProofError(f"{label} used an unexpected component_id.")
    if runtime_result.get("component_id_provenance") != TARGET_PROVENANCE:
        raise CameraScalarWriteProofError(
            f"{label} did not preserve admitted component-add provenance."
        )
    if runtime_result.get("property_path") != TARGET_PROPERTY_PATH:
        raise CameraScalarWriteProofError(f"{label} used an unexpected property path.")
    if runtime_result.get("previous_value") != expected_previous_value:
        raise CameraScalarWriteProofError(
            f"{label} previous value did not match the expected value."
        )
    if runtime_result.get("requested_value") != expected_value:
        raise CameraScalarWriteProofError(
            f"{label} requested value did not match the expected value."
        )
    if runtime_result.get("value") != expected_value:
        raise CameraScalarWriteProofError(
            f"{label} did not verify the requested value."
        )
    if runtime_result.get("write_verified") is not True:
        raise CameraScalarWriteProofError(f"{label} did not verify the write.")
    return {
        "label": label,
        "component_id": component_id,
        "property_path": TARGET_PROPERTY_PATH,
        "previous_value": expected_previous_value,
        "requested_value": expected_value,
        "value": expected_value,
        "value_type": TARGET_VALUE_TYPE,
        "bridge_command_id": runtime_result.get("bridge_command_id"),
        "proof_only": True,
        "write_admission": False,
        "property_list_admission": False,
    }


def _write_proof_step(
    *,
    request_id: str,
    session_id: str,
    workspace_id: str,
    executor_id: str,
    project_root: str,
    engine_root: str,
    component_id: str,
    level_path: str,
    restore_boundary_id: str,
    value: bool,
    expected_current_value: bool,
) -> dict[str, Any]:
    require_allowed_camera_write_target(
        component_name=TARGET_COMPONENT,
        property_path=TARGET_PROPERTY_PATH,
        value=value,
        component_id_provenance=TARGET_PROVENANCE,
        restore_boundary_id=restore_boundary_id,
    )
    return editor_automation_runtime_service.execute_camera_scalar_write_proof(
        request_id=request_id,
        session_id=session_id,
        workspace_id=workspace_id,
        executor_id=executor_id,
        project_root=project_root,
        engine_root=engine_root,
        dry_run=False,
        args={
            "component_name": TARGET_COMPONENT,
            "component_id": component_id,
            "component_id_provenance": TARGET_PROVENANCE,
            "property_path": TARGET_PROPERTY_PATH,
            "value": value,
            "expected_current_value": expected_current_value,
            "level_path": level_path,
            "restore_boundary_id": restore_boundary_id,
        },
        locks_acquired=["editor_session"],
    )


def execute_runtime_steps(
    *,
    run_label: str,
    project_root: str,
    engine_root: str,
    level_path: str,
    request_prefix: str = REQUEST_PREFIX,
    proof_entity_prefix: str = PROOF_ENTITY_PREFIX,
    workspace_id: str = "workspace-live-camera-scalar-write-proof",
) -> dict[str, Any]:
    session_id = f"{request_prefix}-session-{run_label}"
    executor_id = "executor-editor-control-real-local"
    entity_name = f"{proof_entity_prefix}_{run_label.replace('-', '_')}"
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
        restore_boundary = property_list.restore_boundary_from_entity_create_payload(
            entity_payload
        )
        restore_boundary_id = restore_boundary["restore_boundary_id"]
        entity_id = entity_payload["runtime_result"].get("entity_id")
        if not isinstance(entity_id, str) or not entity_id.strip():
            raise CameraScalarWriteProofError(
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
                "components": [TARGET_COMPONENT],
                "level_path": level_path,
            },
            locks_acquired=["editor_session"],
        )
        runtime_steps["component_add"] = authoring.scrub_secrets(component_payload)
        component_id = property_list.component_id_from_component_add_payload(
            component_payload
        )
        target_info = property_list.target_info_from_runtime_steps(
            {
                "entity_create": entity_payload,
                "component_add": component_payload,
            },
            component_family=TARGET_COMPONENT,
        )
        runtime_steps["target_info"] = authoring.scrub_secrets(target_info)

        before_get_payload = (
            editor_automation_runtime_service.execute_component_property_get(
                request_id=f"{request_prefix}-before-get-{run_label}",
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=False,
                args={
                    "component_id": component_id,
                    "property_path": TARGET_PROPERTY_PATH,
                    "level_path": level_path,
                },
                locks_acquired=["editor_session"],
            )
        )
        runtime_steps["before_get"] = authoring.scrub_secrets(before_get_payload)
        before_readback = require_bool_property_readback(
            before_get_payload,
            component_id=component_id,
            label="before_get",
        )
        original_value = before_readback["value"]
        requested_value = not original_value

        write_inverse_payload = _write_proof_step(
            request_id=f"{request_prefix}-write-inverse-{run_label}",
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            component_id=component_id,
            level_path=level_path,
            restore_boundary_id=restore_boundary_id,
            value=requested_value,
            expected_current_value=original_value,
        )
        runtime_steps["write_inverse"] = authoring.scrub_secrets(write_inverse_payload)
        require_camera_write_result(
            write_inverse_payload,
            component_id=component_id,
            expected_previous_value=original_value,
            expected_value=requested_value,
            label="write_inverse",
        )

        after_get_payload = editor_automation_runtime_service.execute_component_property_get(
            request_id=f"{request_prefix}-after-get-{run_label}",
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=False,
            args={
                "component_id": component_id,
                "property_path": TARGET_PROPERTY_PATH,
                "level_path": level_path,
            },
            locks_acquired=["editor_session"],
        )
        runtime_steps["after_get"] = authoring.scrub_secrets(after_get_payload)
        require_bool_property_readback(
            after_get_payload,
            component_id=component_id,
            expected_value=requested_value,
            label="after_get",
        )

        restore_value_payload = _write_proof_step(
            request_id=f"{request_prefix}-restore-value-{run_label}",
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            component_id=component_id,
            level_path=level_path,
            restore_boundary_id=restore_boundary_id,
            value=original_value,
            expected_current_value=requested_value,
        )
        runtime_steps["restore_value"] = authoring.scrub_secrets(restore_value_payload)
        require_camera_write_result(
            restore_value_payload,
            component_id=component_id,
            expected_previous_value=requested_value,
            expected_value=original_value,
            label="restore_value",
        )

        restored_get_payload = (
            editor_automation_runtime_service.execute_component_property_get(
                request_id=f"{request_prefix}-restored-get-{run_label}",
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=False,
                args={
                    "component_id": component_id,
                    "property_path": TARGET_PROPERTY_PATH,
                    "level_path": level_path,
                },
                locks_acquired=["editor_session"],
            )
        )
        runtime_steps["restored_get"] = authoring.scrub_secrets(restored_get_payload)
        require_bool_property_readback(
            restored_get_payload,
            component_id=component_id,
            expected_value=original_value,
            label="restored_get",
        )
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


def _cleanup_restore_summary(cleanup_restore: dict[str, Any]) -> dict[str, Any]:
    return {
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
    }


def build_success_summary(
    *,
    safe_level_info: dict[str, Any],
    runtime_steps: dict[str, Any],
    adapters_boundary: dict[str, Any],
) -> dict[str, Any]:
    target_info = runtime_steps["target_info"]
    selected = target_info["selected"]
    before_readback = require_bool_property_readback(
        runtime_steps["before_get"],
        component_id=selected["component_id"],
        label="before_get",
    )
    original_value = before_readback["value"]
    requested_value = not original_value
    write_review = require_camera_write_result(
        runtime_steps["write_inverse"],
        component_id=selected["component_id"],
        expected_previous_value=original_value,
        expected_value=requested_value,
        label="write_inverse",
    )
    after_readback = require_bool_property_readback(
        runtime_steps["after_get"],
        component_id=selected["component_id"],
        expected_value=requested_value,
        label="after_get",
    )
    restore_review = require_camera_write_result(
        runtime_steps["restore_value"],
        component_id=selected["component_id"],
        expected_previous_value=requested_value,
        expected_value=original_value,
        label="restore_value",
    )
    restored_readback = require_bool_property_readback(
        runtime_steps["restored_get"],
        component_id=selected["component_id"],
        expected_value=original_value,
        label="restored_get",
    )
    cleanup_restore = runtime_steps["cleanup_restore"]
    cleanup_succeeded = cleanup_restore.get("restore_succeeded") is True
    return {
        "succeeded": cleanup_succeeded,
        "status": (
            "succeeded_verified"
            if cleanup_succeeded
            else "loaded_level_cleanup_restore_failed"
        ),
        "completed_at": authoring.utc_now(),
        "selected_level_path": safe_level_info["selected_level_path"],
        "entity_id": selected.get("entity_id"),
        "entity_name": selected.get("entity_name"),
        "component_name": TARGET_COMPONENT,
        "component_id": selected["component_id"],
        "component_id_provenance": selected["component_id_provenance"],
        "property_path": TARGET_PROPERTY_PATH,
        "property_type": TARGET_VALUE_TYPE,
        "original_value": original_value,
        "attempted_value": requested_value,
        "changed_value": after_readback["value"],
        "restored_value": restored_readback["value"],
        "write_changed_review": write_review,
        "write_restore_review": restore_review,
        "value_restore_succeeded": restored_readback["value"] == original_value,
        "loaded_level_cleanup_restore": _cleanup_restore_summary(cleanup_restore),
        "loaded_level_cleanup_restore_succeeded": cleanup_succeeded,
        "write_admission": False,
        "property_list_admission": False,
        "public_admission": False,
        "adapters_boundary": {
            "active_mode": adapters_boundary.get("active_mode"),
            "configured_mode": adapters_boundary.get("configured_mode"),
            "property_list_exposed": False,
            "property_write_exposed": False,
            "camera_write_proof_exposed": False,
        },
        "mutation_occurred": True,
        "verified_facts": [
            f"Selected safe non-default level {safe_level_info['selected_level_path']}.",
            (
                "Provisioned a temporary Camera proof target through admitted "
                "editor.entity.create and editor.component.add."
            ),
            f"Read original bool value {original_value!r}.",
            f"Wrote inverse bool value {requested_value!r} through the proof-only bridge operation.",
            f"Read back changed value {after_readback['value']!r}.",
            f"Restored original bool value {original_value!r} through the proof-only bridge operation.",
            f"Read back restored value {restored_readback['value']!r}.",
            (
                "Verified loaded-level file cleanup restore."
                if cleanup_succeeded
                else "Loaded-level file cleanup restore was not verified."
            ),
        ],
        "missing_proof": [
            "No public Prompt Studio, dispatcher, catalog, or /adapters property-write admission occurred.",
            "No public editor.component.property.list admission occurred.",
            "No arbitrary component/property write was attempted.",
            "No arbitrary Editor Python, asset, material, render, build, or TIAF behavior was exercised.",
            "No live Editor undo or viewport reload was proven.",
            (
                "Post-cleanup component readback is not claimed because loaded-level "
                "file restore may invalidate the temporary proof entity/component id."
            ),
        ],
        "safest_next_step": (
            "Review the proof artifact and checkpoint summary before considering any "
            "separate admission packet."
        ),
    }


def build_failure_summary(
    *,
    error: Exception,
    preflight_facts: list[str],
) -> dict[str, Any]:
    partial_runtime_steps = getattr(error, "partial_runtime_steps", None)
    cleanup_restore = getattr(error, "cleanup_restore", None)
    target_info = (
        partial_runtime_steps.get("target_info")
        if isinstance(partial_runtime_steps, dict)
        else None
    )
    selected = (
        target_info.get("selected")
        if isinstance(target_info, dict) and isinstance(target_info.get("selected"), dict)
        else {}
    )
    before_result = (
        partial_runtime_steps.get("before_get", {}).get("runtime_result")
        if isinstance(partial_runtime_steps, dict)
        else None
    )
    after_result = (
        partial_runtime_steps.get("after_get", {}).get("runtime_result")
        if isinstance(partial_runtime_steps, dict)
        else None
    )
    restored_result = (
        partial_runtime_steps.get("restored_get", {}).get("runtime_result")
        if isinstance(partial_runtime_steps, dict)
        else None
    )
    return {
        "succeeded": False,
        "status": "failed",
        "failed_at": authoring.utc_now(),
        "error_type": error.__class__.__name__,
        "error_message": str(error),
        "verified_facts": preflight_facts,
        "target_entity_id": selected.get("entity_id"),
        "target_entity_name": selected.get("entity_name"),
        "component_name": TARGET_COMPONENT,
        "component_id": selected.get("component_id"),
        "component_id_provenance": selected.get("component_id_provenance"),
        "property_path": TARGET_PROPERTY_PATH,
        "original_value": (
            before_result.get("value") if isinstance(before_result, dict) else None
        ),
        "attempted_value": (
            partial_runtime_steps.get("write_inverse", {})
            .get("runtime_result", {})
            .get("requested_value")
            if isinstance(partial_runtime_steps, dict)
            else None
        ),
        "current_value": (
            restored_result.get("value")
            if isinstance(restored_result, dict)
            else after_result.get("value")
            if isinstance(after_result, dict)
            else None
        ),
        "partial_runtime_steps": (
            authoring.scrub_secrets(partial_runtime_steps)
            if isinstance(partial_runtime_steps, dict)
            else None
        ),
        "cleanup_restore": (
            authoring.scrub_secrets(cleanup_restore)
            if isinstance(cleanup_restore, dict)
            else None
        ),
        "write_admission": False,
        "property_list_admission": False,
        "public_admission": False,
        "missing_proof": [
            "Camera scalar write proof did not complete every postcondition.",
            "Do not merge or admit property writes from this run.",
        ],
        "safest_recovery_step": (
            "Inspect cleanup_restore. If restore_succeeded is not true, restore the "
            "recorded loaded-level prefab backup manually before rerunning proof."
        ),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a proof-only live Camera bool scalar property write and restore proof."
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
        else runtime_dir / f"live_editor_camera_scalar_write_proof_{run_label}.json"
    )
    preflight_facts: list[str] = []
    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": PROOF_NAME,
        "generated_at": authoring.utc_now(),
        "base_url": args.base_url,
        "output_path": str(output_path),
        "proof_boundary": {
            "proof_driver": "proof-only Camera bool scalar property write harness",
            "component_name": TARGET_COMPONENT,
            "property_path": TARGET_PROPERTY_PATH,
            "value_type": TARGET_VALUE_TYPE,
            "admission_boundary": (
                "No Prompt Studio, dispatcher, catalog, or /adapters property-write "
                "admission; property.list remains proof-only and unadmitted."
            ),
        },
        "preflight": {},
        "steps": {},
        "summary": {"succeeded": False, "status": "starting"},
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
            raise CameraScalarWriteProofError("GET /ready did not return an object.")
        if not isinstance(target_payload, dict):
            raise CameraScalarWriteProofError(
                "GET /o3de/target did not return an object."
            )
        if not isinstance(bridge_payload, dict):
            raise CameraScalarWriteProofError(
                "GET /o3de/bridge did not return an object."
            )
        if not isinstance(adapters_payload, dict):
            raise CameraScalarWriteProofError("GET /adapters did not return an object.")

        authoring.require_ready_payload(ready_payload)
        authoring.require_target_payload(
            target_payload,
            project_root=args.project_root,
            engine_root=args.engine_root,
        )
        authoring.require_bridge_payload(bridge_payload, project_root=args.project_root)
        adapters_boundary = require_adapters_boundary(adapters_payload)
        runtime_environment = property_list.configure_runtime_environment_from_target(
            target_payload,
            project_root=args.project_root,
            engine_root=args.engine_root,
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

        runtime_steps = execute_runtime_steps(
            run_label=run_label,
            project_root=args.project_root,
            engine_root=args.engine_root,
            level_path=safe_level_info["selected_level_path"],
        )
        evidence_bundle["steps"] = runtime_steps
        cleanup_restore = runtime_steps["cleanup_restore"]
        authoring.require_cleanup_restore_succeeded(cleanup_restore)
        final_bridge_payload = authoring.json_request(
            base_url=args.base_url,
            method="GET",
            path="/o3de/bridge",
        )
        evidence_bundle["post_proof_bridge"] = authoring.scrub_secrets(
            final_bridge_payload
        )
        evidence_bundle["summary"] = build_success_summary(
            safe_level_info=safe_level_info,
            runtime_steps=runtime_steps,
            adapters_boundary=adapters_boundary,
        )
    except Exception as exc:  # noqa: BLE001
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
