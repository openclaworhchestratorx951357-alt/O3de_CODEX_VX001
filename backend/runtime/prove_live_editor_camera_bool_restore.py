from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import prove_live_editor_authoring as authoring
import prove_live_editor_camera_scalar_write as camera_write
import prove_live_editor_component_property_list as property_list

PROOF_NAME = "live_editor_camera_bool_restore_proof"
SCRIPT_VERSION = "v0.1"
PROOF_ENTITY_PREFIX = "CodexCameraBoolRestoreProofEntity"
REQUEST_PREFIX = "camera-bool-restore-proof"
RESTORE_PROOF_OPERATION = "editor.camera.bool.restore.proof"
PROPOSED_PUBLIC_RESTORE_CAPABILITY = (
    "editor.component.property.restore.camera_bool_make_active_on_activation"
)
TARGET_COMPONENT = camera_write.TARGET_COMPONENT
TARGET_PROPERTY_PATH = camera_write.TARGET_PROPERTY_PATH
TARGET_VALUE_TYPE = camera_write.TARGET_VALUE_TYPE
TARGET_PROVENANCE = camera_write.TARGET_PROVENANCE


class CameraBoolRestoreProofError(camera_write.CameraScalarWriteProofError):
    """Raised when the proof-only Camera bool restore harness cannot complete."""


def _adapter_payload(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    adapter_status = adapters_payload.get("adapters")
    return adapter_status if isinstance(adapter_status, dict) else adapters_payload


def require_adapters_boundary(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    try:
        adapter_status = camera_write.require_adapters_boundary(adapters_payload)
    except authoring.ProofError as exc:
        raise CameraBoolRestoreProofError(str(exc)) from exc
    real_tool_paths = _adapter_payload(adapters_payload).get("real_tool_paths")
    if not isinstance(real_tool_paths, list):
        raise CameraBoolRestoreProofError("GET /adapters did not expose real_tool_paths.")
    gated_tool_paths = _adapter_payload(adapters_payload).get("gated_tool_paths")
    if not isinstance(gated_tool_paths, list):
        gated_tool_paths = []
    forbidden_paths = {
        "editor.component.property.list",
        "editor.component.property.write",
        "editor.component.property.restore",
        "editor.component.property.set",
        camera_write.CAMERA_SCALAR_WRITE_PROOF_OPERATION,
        RESTORE_PROOF_OPERATION,
    }
    exposed = sorted(
        forbidden_paths.intersection(
            str(item) for item in [*real_tool_paths, *gated_tool_paths]
        )
    )
    if exposed:
        raise CameraBoolRestoreProofError(
            f"GET /adapters exposes proof-only, write, or restore paths: {exposed}."
        )
    public_restore_admitted = (
        PROPOSED_PUBLIC_RESTORE_CAPABILITY in {str(item) for item in gated_tool_paths}
    )
    adapter_status = dict(adapter_status)
    adapter_status["public_restore_capability_admitted"] = public_restore_admitted
    return adapter_status


def require_allowed_camera_restore_target(
    *,
    component_name: Any,
    property_path: Any,
    before_value: Any,
    restore_value: Any,
    component_id_provenance: Any = TARGET_PROVENANCE,
    restore_boundary_id: Any = "restore-boundary",
) -> dict[str, Any]:
    if component_name != TARGET_COMPONENT:
        raise CameraBoolRestoreProofError(
            "Camera bool restore proof only allows the Camera component."
        )
    if property_path != TARGET_PROPERTY_PATH:
        raise CameraBoolRestoreProofError(
            "Camera bool restore proof only allows the selected Camera bool path."
        )
    if not isinstance(before_value, bool):
        raise CameraBoolRestoreProofError(
            "Camera bool restore proof requires before-value evidence."
        )
    if not isinstance(restore_value, bool):
        raise CameraBoolRestoreProofError(
            "Camera bool restore proof only allows bool restore values."
        )
    if restore_value != before_value:
        raise CameraBoolRestoreProofError(
            "Camera bool restore proof can only restore the previously observed value."
        )
    if component_id_provenance != TARGET_PROVENANCE:
        raise CameraBoolRestoreProofError(
            "Camera bool restore proof requires admitted component-add provenance."
        )
    if not isinstance(restore_boundary_id, str) or not restore_boundary_id.strip():
        raise CameraBoolRestoreProofError(
            "Camera bool restore proof requires a restore boundary before mutation."
        )
    return {
        "component_name": TARGET_COMPONENT,
        "property_path": TARGET_PROPERTY_PATH,
        "before_value": before_value,
        "restore_value": restore_value,
        "value_type": TARGET_VALUE_TYPE,
        "component_id_provenance": TARGET_PROVENANCE,
        "restore_boundary_id": restore_boundary_id,
    }


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


def execute_runtime_steps(
    *,
    run_label: str,
    project_root: str,
    engine_root: str,
    level_path: str,
) -> dict[str, Any]:
    return camera_write.execute_runtime_steps(
        run_label=run_label,
        project_root=project_root,
        engine_root=engine_root,
        level_path=level_path,
        request_prefix=REQUEST_PREFIX,
        proof_entity_prefix=PROOF_ENTITY_PREFIX,
        workspace_id="workspace-live-camera-bool-restore-proof",
    )


def build_success_summary(
    *,
    safe_level_info: dict[str, Any],
    runtime_steps: dict[str, Any],
    adapters_boundary: dict[str, Any],
) -> dict[str, Any]:
    target_info = runtime_steps["target_info"]
    selected = target_info["selected"]
    component_id = selected["component_id"]
    before_readback = camera_write.require_bool_property_readback(
        runtime_steps["before_get"],
        component_id=component_id,
        label="before_get",
    )
    before_value = before_readback["value"]
    changed_value = not before_value
    restore_target = require_allowed_camera_restore_target(
        component_name=TARGET_COMPONENT,
        property_path=TARGET_PROPERTY_PATH,
        before_value=before_value,
        restore_value=before_value,
        component_id_provenance=selected["component_id_provenance"],
        restore_boundary_id=runtime_steps["cleanup_restore"].get("restore_boundary_id"),
    )
    write_review = camera_write.require_camera_write_result(
        runtime_steps["write_inverse"],
        component_id=component_id,
        expected_previous_value=before_value,
        expected_value=changed_value,
        label="write_inverse",
    )
    after_readback = camera_write.require_bool_property_readback(
        runtime_steps["after_get"],
        component_id=component_id,
        expected_value=changed_value,
        label="after_get",
    )
    restore_review = camera_write.require_camera_write_result(
        runtime_steps["restore_value"],
        component_id=component_id,
        expected_previous_value=changed_value,
        expected_value=before_value,
        label="restore_value",
    )
    restored_readback = camera_write.require_bool_property_readback(
        runtime_steps["restored_get"],
        component_id=component_id,
        expected_value=before_value,
        label="restored_get",
    )
    cleanup_restore = runtime_steps["cleanup_restore"]
    cleanup_succeeded = cleanup_restore.get("restore_succeeded") is True
    value_restore_succeeded = restored_readback["value"] == before_value
    succeeded = cleanup_succeeded and value_restore_succeeded
    return {
        "succeeded": succeeded,
        "status": (
            "restore_succeeded_verified"
            if succeeded
            else "restore_postcondition_failed"
        ),
        "completed_at": authoring.utc_now(),
        "proof_only": True,
        "selected_level_path": safe_level_info["selected_level_path"],
        "entity_id": selected.get("entity_id"),
        "entity_name": selected.get("entity_name"),
        "component_name": TARGET_COMPONENT,
        "component_id": component_id,
        "component_id_provenance": selected["component_id_provenance"],
        "property_path": TARGET_PROPERTY_PATH,
        "property_type": TARGET_VALUE_TYPE,
        "before_value": before_value,
        "changed_value": after_readback["value"],
        "restore_value": restore_target["restore_value"],
        "restored_readback": restored_readback["value"],
        "verification_status": (
            "restored_readback_verified"
            if value_restore_succeeded
            else "restored_readback_mismatch"
        ),
        "write_occurred": True,
        "restore_occurred": True,
        "restore_path": "proof_only_reverse_write",
        "write_changed_review": write_review,
        "write_restore_review": restore_review,
        "loaded_level_cleanup_restore": _cleanup_restore_summary(cleanup_restore),
        "loaded_level_cleanup_restore_succeeded": cleanup_succeeded,
        "generalized_undo_available": False,
        "write_admission": False,
        "restore_admission": False,
        "property_list_admission": False,
        "public_admission": False,
        "public_restore_capability": PROPOSED_PUBLIC_RESTORE_CAPABILITY,
        "public_restore_capability_admitted": adapters_boundary.get(
            "public_restore_capability_admitted",
            False,
        ),
        "private_write_bridge_operation": camera_write.CAMERA_SCALAR_WRITE_PROOF_OPERATION,
        "private_restore_proof_operation": RESTORE_PROOF_OPERATION,
        "adapters_boundary": {
            "active_mode": adapters_boundary.get("active_mode"),
            "configured_mode": adapters_boundary.get("configured_mode"),
            "property_list_exposed": False,
            "property_write_exposed": False,
            "property_restore_exposed": False,
            "camera_restore_proof_exposed": False,
            "public_restore_capability_admitted": adapters_boundary.get(
                "public_restore_capability_admitted",
                False,
            ),
        },
        "mutation_occurred": True,
        "verified_facts": [
            f"Selected safe non-default level {safe_level_info['selected_level_path']}.",
            (
                "Provisioned a temporary Camera proof target through admitted "
                "editor.entity.create and editor.component.add."
            ),
            f"Read before bool value {before_value!r}.",
            (
                f"Wrote inverse bool value {changed_value!r} through the "
                "private proof-only Camera write path."
            ),
            f"Verified changed readback {after_readback['value']!r}.",
            (
                f"Restored previous bool value {before_value!r} through the "
                "proof-only reverse-write path."
            ),
            f"Verified restored readback {restored_readback['value']!r}.",
            (
                "Verified loaded-level file cleanup restore."
                if cleanup_succeeded
                else "Loaded-level file cleanup restore was not verified."
            ),
        ],
        "missing_proof": [
            (
                "The proof driver did not execute the public restore corridor; "
                "it reran the private proof-only restore path for admission evidence."
            ),
            "No generalized undo, arbitrary scene rollback, or viewport reload was proven.",
            "No generic property write or generic property restore was admitted.",
            "No public editor.component.property.list admission occurred.",
            "No arbitrary Editor Python, asset, material, render, build, or TIAF behavior was exercised.",
        ],
        "safest_next_step": (
            "Review the proof artifact and checkpoint summary before considering "
            "any separate public restore admission packet."
        ),
    }


def build_failure_summary(
    *,
    error: Exception,
    preflight_facts: list[str],
) -> dict[str, Any]:
    base_summary = camera_write.build_failure_summary(
        error=error,
        preflight_facts=preflight_facts,
    )
    base_summary.update(
        {
            "status": "restore_failed",
            "proof_only": True,
            "restore_occurred": False,
            "restore_admission": False,
            "public_restore_capability": PROPOSED_PUBLIC_RESTORE_CAPABILITY,
            "public_restore_capability_admitted": False,
            "generalized_undo_available": False,
            "missing_proof": [
                "Camera bool restore proof did not complete every postcondition.",
                "Do not merge or admit restore/revert behavior from this run.",
            ],
            "safest_recovery_step": (
                "Inspect partial_runtime_steps and cleanup_restore. If the Camera "
                "bool value was not restored and verified, use the recorded target, "
                "before value, and loaded-level restore boundary for manual recovery."
            ),
        }
    )
    partial_runtime_steps = getattr(error, "partial_runtime_steps", None)
    if isinstance(partial_runtime_steps, dict):
        base_summary["restore_occurred"] = "restore_value" in partial_runtime_steps
    return base_summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a proof-only live Camera bool reverse-write restore proof."
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
        else runtime_dir / f"live_editor_camera_bool_restore_proof_{run_label}.json"
    )
    preflight_facts: list[str] = []
    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": PROOF_NAME,
        "generated_at": authoring.utc_now(),
        "base_url": args.base_url,
        "output_path": str(output_path),
        "proof_boundary": {
            "proof_driver": "proof-only Camera bool reverse-write restore harness",
            "component_name": TARGET_COMPONENT,
            "property_path": TARGET_PROPERTY_PATH,
            "value_type": TARGET_VALUE_TYPE,
            "restore_path": "proof_only_reverse_write",
            "admission_boundary": (
                "No public restore/revert, generic property-write, property-list, "
                "dispatcher/catalog, Prompt Studio, or /adapters admission."
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
            raise CameraBoolRestoreProofError("GET /ready did not return an object.")
        if not isinstance(target_payload, dict):
            raise CameraBoolRestoreProofError(
                "GET /o3de/target did not return an object."
            )
        if not isinstance(bridge_payload, dict):
            raise CameraBoolRestoreProofError(
                "GET /o3de/bridge did not return an object."
            )
        if not isinstance(adapters_payload, dict):
            raise CameraBoolRestoreProofError(
                "GET /adapters did not return an object."
            )

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
