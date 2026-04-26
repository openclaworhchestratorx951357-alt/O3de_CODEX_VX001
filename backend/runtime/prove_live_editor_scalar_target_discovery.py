from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import prove_live_editor_authoring as authoring
import prove_live_editor_component_property_list as property_list

from app.services.editor_automation_runtime import (  # noqa: E402
    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT,
    EDITOR_COMPONENT_ADD_ALLOWLIST,
)

PROOF_NAME = "live_editor_scalar_target_discovery_proof"
SCRIPT_VERSION = "v0.1"
REQUEST_PREFIX = "scalar-target-discovery-proof"
PROOF_ENTITY_PREFIX = "CodexScalarTargetDiscoveryProofEntity"
BLOCKER_CODE = "scalar_candidate_not_found"
WRITE_BLOCKER_CODE = "property_write_unadmitted"
TARGET_PROVENANCE = COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
CANDIDATE_ORDER = ("Camera", "Comment")
REJECT_PATH_MARKERS = (
    "asset",
    "material",
    "mesh",
    "model",
    "render",
    "ray",
    "lod",
    "lighting",
    "shader",
    "texture",
    "pipeline",
    "transform",
)
REJECT_TYPE_MARKERS = (
    "asset",
    "material",
    "mesh",
    "model",
    "vector",
    "quaternion",
    "color",
    "transform",
    "container",
)
SCALAR_VALUE_TYPE_MARKERS = (
    "string",
    "azstd::string",
    "str",
    "bool",
    "boolean",
    "int",
    "float",
    "double",
    "number",
    "u32",
    "s32",
)
SOURCE_SCAN_LIMIT = 80
SOURCE_SCAN_MARKERS = (
    "Field(",
    "DataElement",
    "m_fov",
    "m_near",
    "m_far",
    "m_orthographic",
    "m_comment",
    "AZStd::string",
)
COMPONENT_SOURCE_HINTS = {
    "Camera": (
        "Gems/Camera/Code/Source/CameraComponentController.cpp",
        "Gems/Camera/Code/Source/CameraComponentController.h",
        "Gems/Camera/Code/Source/CameraComponent.cpp",
    ),
    "Comment": (
        "Gems/LmbrCentral/Code/Source/Editor/EditorCommentComponent.cpp",
        "Gems/LmbrCentral/Code/Source/Editor/EditorCommentComponent.h",
    ),
}


class ScalarTargetDiscoveryProofError(authoring.ProofError):
    """Raised when the scalar target discovery matrix cannot complete."""


def _adapter_payload(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    adapter_status = adapters_payload.get("adapters")
    return adapter_status if isinstance(adapter_status, dict) else adapters_payload


def require_adapters_boundary(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    adapter_status = property_list.require_adapters_boundary(adapters_payload)
    real_tool_paths = _adapter_payload(adapters_payload).get("real_tool_paths")
    if isinstance(real_tool_paths, list) and "editor.component.property.write" in real_tool_paths:
        raise ScalarTargetDiscoveryProofError(
            "editor.component.property.write is exposed through /adapters."
        )
    return adapter_status


def component_probe_plan() -> dict[str, Any]:
    allowlisted = list(EDITOR_COMPONENT_ADD_ALLOWLIST)
    allowlisted_lookup = {component.casefold(): component for component in allowlisted}
    candidates: list[str] = []
    for component in CANDIDATE_ORDER:
        canonical = allowlisted_lookup.get(component.casefold())
        if canonical is not None:
            candidates.append(canonical)

    excluded: list[dict[str, Any]] = []
    for component in allowlisted:
        if component in candidates:
            continue
        if component == "Mesh":
            reason = (
                "Mesh is already known to expose asset/render-adjacent paths and is "
                "excluded from first scalar write-candidate discovery."
            )
        else:
            reason = (
                "No low-risk scalar target discovery rationale exists yet for this "
                "allowlisted component."
            )
        excluded.append(
            {
                "component_name": component,
                "probed": False,
                "reason": reason,
            }
        )

    return {
        "allowlisted_components": allowlisted,
        "candidate_components": candidates,
        "excluded_components": excluded,
    }


def collect_component_source_inspection_evidence(
    engine_root: str,
    component_name: str,
) -> dict[str, Any]:
    relative_paths = COMPONENT_SOURCE_HINTS.get(component_name, ())
    evidence: dict[str, Any] = {
        "component_name": component_name,
        "engine_root": engine_root,
        "source_paths": [],
        "matched_lines": [],
        "source_guided_only": True,
        "live_readback_required": True,
    }
    for relative_path in relative_paths:
        source_path = Path(engine_root) / relative_path
        source_entry = {
            "relative_path": relative_path,
            "path": str(source_path),
            "exists": source_path.is_file(),
        }
        evidence["source_paths"].append(source_entry)
        if not source_path.is_file():
            continue
        try:
            lines = source_path.read_text(
                encoding="utf-8",
                errors="replace",
            ).splitlines()
        except OSError as exc:
            source_entry["read_error"] = str(exc)
            continue
        for line_number, line in enumerate(lines, start=1):
            stripped = line.strip()
            if any(marker in stripped for marker in SOURCE_SCAN_MARKERS):
                evidence["matched_lines"].append(
                    {
                        "relative_path": relative_path,
                        "line": line_number,
                        "text": stripped[:240],
                    }
                )
            if len(evidence["matched_lines"]) >= SOURCE_SCAN_LIMIT:
                break
    evidence["source_hints_found"] = bool(evidence["matched_lines"])
    return evidence


def _value_shape(value: Any) -> str:
    if isinstance(value, dict):
        keys = {str(key).lower() for key in value}
        if keys and keys.issubset({"x", "y", "z", "w"}):
            return "xyzw_object"
        if keys and keys.issubset({"r", "g", "b", "a"}):
            return "rgba_object"
        return "object"
    if isinstance(value, list):
        return "list"
    if isinstance(value, tuple):
        return "tuple"
    if isinstance(value, set):
        return "set"
    return "scalar" if isinstance(value, (str, bool, int, float)) else type(value).__name__


def _value_is_scalar_or_text_like(value: Any, value_type: Any) -> bool:
    if isinstance(value, (str, bool, int, float)):
        return True
    value_type_text = "" if value_type is None else str(value_type).lower()
    return value is None and any(
        marker in value_type_text for marker in SCALAR_VALUE_TYPE_MARKERS
    )


def _path_is_out_of_scope(path: str, value_type_hint: Any = None) -> bool:
    lowered_path = path.lower()
    lowered_type = "" if value_type_hint is None else str(value_type_hint).lower()
    return any(marker in lowered_path for marker in REJECT_PATH_MARKERS) or any(
        marker in lowered_type for marker in REJECT_TYPE_MARKERS
    )


def review_component_scalar_discovery_result(
    runtime_result: dict[str, Any],
    *,
    target_info: dict[str, Any],
    component_name: str,
) -> dict[str, Any]:
    discovery = runtime_result.get("scalar_target_discovery")
    if not isinstance(discovery, dict):
        raise ScalarTargetDiscoveryProofError(
            f"{component_name} proof did not return scalar target discovery evidence."
        )
    if discovery.get("set_component_property_attempted") is True:
        raise ScalarTargetDiscoveryProofError(
            "Scalar target discovery attempted a property mutation."
        )
    if discovery.get("write_target_admitted") is True or discovery.get("write_admission") is True:
        raise ScalarTargetDiscoveryProofError(
            "Scalar target discovery admitted a property write."
        )
    if discovery.get("property_list_admission") is True:
        raise ScalarTargetDiscoveryProofError(
            "Scalar target discovery admitted property.list."
        )

    selected_target = target_info["selected"]
    selected_candidate = discovery.get("selected_candidate")
    common: dict[str, Any] = {
        "component_name": component_name,
        "component_id": selected_target["component_id"],
        "component_id_provenance": selected_target["component_id_provenance"],
        "entity_id": selected_target.get("entity_id"),
        "entity_name": selected_target.get("entity_name"),
        "discovery_ladder": discovery,
        "write_target_admitted": False,
        "write_admission": False,
        "property_list_admission": False,
    }
    if isinstance(selected_candidate, dict):
        property_path = str(selected_candidate.get("property_path") or "").strip()
        value = selected_candidate.get("value")
        value_type = selected_candidate.get("value_type")
        if not property_path:
            raise ScalarTargetDiscoveryProofError(
                "Scalar target discovery selected an empty/root property path."
            )
        if selected_candidate.get("property_path_kind") != "named_component_property":
            raise ScalarTargetDiscoveryProofError(
                "Scalar target discovery selected a non-named property path."
            )
        if _path_is_out_of_scope(property_path, selected_candidate.get("value_type_hint")):
            raise ScalarTargetDiscoveryProofError(
                "Scalar target discovery selected an out-of-scope path."
            )
        if selected_candidate.get("success") is not True:
            raise ScalarTargetDiscoveryProofError(
                "Scalar target discovery selected a candidate without readback success."
            )
        if selected_candidate.get("scalar_or_text_like") is not True:
            raise ScalarTargetDiscoveryProofError(
                "Scalar target discovery selected a non-scalar value."
            )
        if not _value_is_scalar_or_text_like(value, value_type):
            raise ScalarTargetDiscoveryProofError(
                "Scalar target discovery selected a non-scalar/text-like value."
            )
        if _value_shape(value) != "scalar":
            raise ScalarTargetDiscoveryProofError(
                "Scalar target discovery selected a shaped/container value."
            )
        source = str(selected_candidate.get("source") or "")
        if source.startswith("PropertyTreeEditor"):
            if selected_candidate.get("property_tree_get_value_attempted") is not True:
                raise ScalarTargetDiscoveryProofError(
                    "PropertyTreeEditor candidate was not read through get_value."
                )
        elif selected_candidate.get("get_component_property_attempted") is not True:
            raise ScalarTargetDiscoveryProofError(
                "BuildComponentPropertyList candidate was not read through property.get."
            )
        return {
            **common,
            "status": "candidate_selected_readback_only",
            "blocker_code": None,
            "target_selected": True,
            "future_write_candidate_selected": True,
            "selected_candidate": {
                "component_name": component_name,
                "entity_id": selected_target.get("entity_id"),
                "entity_name": selected_target.get("entity_name"),
                "component_id": selected_target["component_id"],
                "component_id_provenance": selected_target["component_id_provenance"],
                "property_path": property_path,
                "property_path_kind": "named_component_property",
                "discovery_method": selected_candidate.get("discovery_method"),
                "value_type_hint": selected_candidate.get("value_type_hint"),
                "runtime_value_type": selected_candidate.get("runtime_value_type"),
                "value_preview": selected_candidate.get("value_preview"),
                "target_status": "readback_only_candidate",
                "write_admission": False,
                "property_list_admission": False,
            },
        }

    blocker_code = discovery.get("blocker_code") or BLOCKER_CODE
    return {
        **common,
        "status": "blocked",
        "blocker_code": blocker_code,
        "target_selected": False,
        "future_write_candidate_selected": False,
        "selected_candidate": None,
    }


def cleanup_restore_summary(cleanup_restore: dict[str, Any]) -> dict[str, Any]:
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
    adapters_boundary: dict[str, Any],
    component_results: list[dict[str, Any]],
    excluded_components: list[dict[str, Any]],
) -> dict[str, Any]:
    selected_candidate = next(
        (
            result["selected_candidate"]
            for result in component_results
            if isinstance(result.get("selected_candidate"), dict)
        ),
        None,
    )
    target_selected = selected_candidate is not None
    component_blockers = {
        result["component_name"]: result.get("blocker_code")
        for result in component_results
        if result.get("blocker_code")
    }
    restore_verified = all(
        result.get("restore_succeeded") is True for result in component_results
    )
    return {
        "succeeded": restore_verified,
        "status": "candidate_selected_readback_only" if target_selected else "blocked",
        "completed_at": authoring.utc_now(),
        "selected_level_path": safe_level_info["selected_level_path"],
        "candidate_components_probed": [
            result["component_name"] for result in component_results
        ],
        "excluded_components": excluded_components,
        "component_results": component_results,
        "selected_candidate": selected_candidate,
        "target_selected": target_selected,
        "future_write_candidate_selected": target_selected,
        "blocker_code": None if target_selected else BLOCKER_CODE,
        "component_blockers": component_blockers,
        "write_target_admitted": False,
        "write_admission": False,
        "property_list_admission": False,
        "adapters_boundary": {
            "active_mode": adapters_boundary.get("active_mode"),
            "configured_mode": adapters_boundary.get("configured_mode"),
            "property_list_exposed": False,
            "property_write_exposed": False,
        },
        "mutation_occurred": bool(component_results),
        "restore_or_cleanup_verified": restore_verified,
        "restore_status": (
            "restored_and_verified" if restore_verified else "restore_not_verified"
        ),
        "verified_facts": [
            f"Selected safe non-default level {safe_level_info['selected_level_path']}.",
            (
                "Probed only already-allowlisted component-add surfaces for "
                "proof-only scalar readback evidence."
            ),
            (
                "Read candidate property values only through GetComponentProperty "
                "or PropertyTreeEditor.get_value."
            ),
            "No property write implementation or admission was used.",
            (
                "Restored every attempted loaded-level prefab boundary."
                if restore_verified
                else "At least one restore boundary was not verified."
            ),
        ],
        "missing_proof": [
            "No property writes were implemented, admitted, or executed.",
            "No public Prompt Studio, dispatcher, catalog, or /adapters property-list admission was proven.",
            "No arbitrary Editor Python, material, asset, render, build, or TIAF behavior was exercised.",
            "No live Editor undo or viewport reload was proven.",
        ],
        "safest_next_step": (
            "Review the selected readback-only scalar target before designing any "
            "separate proof-only write packet."
            if target_selected
            else "Choose another already-allowlisted low-risk component or keep property writes blocked."
        ),
    }


def build_failure_summary(
    *,
    error: Exception,
    preflight_facts: list[str],
) -> dict[str, Any]:
    partial_runtime_steps = getattr(error, "partial_runtime_steps", None)
    cleanup_restore = getattr(error, "cleanup_restore", None)
    return {
        "succeeded": False,
        "status": "failed",
        "failed_at": authoring.utc_now(),
        "error_type": error.__class__.__name__,
        "error_message": str(error),
        "verified_facts": preflight_facts,
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
        "target_selected": False,
        "future_write_candidate_selected": False,
        "write_target_admitted": False,
        "write_admission": False,
        "property_list_admission": False,
        "blocker_code": WRITE_BLOCKER_CODE,
        "missing_proof": [
            "Scalar target discovery did not complete.",
            "No property write behavior was proven.",
            "Restore is verified only when cleanup_restore reports restore_succeeded=true.",
        ],
        "safest_next_step": (
            "Resolve the exact proof failure without widening into property writes "
            "or public property-list admission."
        ),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a proof-only live scalar target discovery matrix across already "
            "allowlisted low-risk editor components."
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
        else runtime_dir / f"live_editor_scalar_target_discovery_proof_{run_label}.json"
    )
    preflight_facts: list[str] = []
    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": PROOF_NAME,
        "generated_at": authoring.utc_now(),
        "base_url": args.base_url,
        "output_path": str(output_path),
        "proof_boundary": {
            "proof_driver": "proof-only scalar target discovery matrix",
            "admission_boundary": (
                "No property write admission; property.list remains proof-only and "
                "unexposed through Prompt Studio, dispatcher/catalog, and /adapters."
            ),
            "component_id_source": TARGET_PROVENANCE,
        },
        "preflight": {},
        "steps": {},
        "summary": {"succeeded": False, "status": "starting"},
    }

    try:
        safe_level_info = authoring.select_safe_level(args.project_root)
        probe_plan = component_probe_plan()
        source_inspection = {
            component_name: collect_component_source_inspection_evidence(
                args.engine_root,
                component_name,
            )
            for component_name in probe_plan["candidate_components"]
        }
        evidence_bundle["preflight"]["safe_level_selection"] = safe_level_info
        evidence_bundle["preflight"]["component_probe_plan"] = probe_plan
        evidence_bundle["preflight"]["source_inspection_evidence"] = source_inspection
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
            raise ScalarTargetDiscoveryProofError("GET /ready did not return an object.")
        if not isinstance(target_payload, dict):
            raise ScalarTargetDiscoveryProofError(
                "GET /o3de/target did not return an object."
            )
        if not isinstance(bridge_payload, dict):
            raise ScalarTargetDiscoveryProofError(
                "GET /o3de/bridge did not return an object."
            )
        if not isinstance(adapters_payload, dict):
            raise ScalarTargetDiscoveryProofError("GET /adapters did not return an object.")

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

        component_results: list[dict[str, Any]] = []
        for component_name in probe_plan["candidate_components"]:
            component_run_label = f"{run_label}-{component_name.lower()}"
            runtime_steps = property_list._execute_runtime_steps(
                run_label=component_run_label,
                project_root=args.project_root,
                engine_root=args.engine_root,
                level_path=safe_level_info["selected_level_path"],
                component_family=component_name,
                entity_prefix=f"{PROOF_ENTITY_PREFIX}{component_name}",
                request_prefix=REQUEST_PREFIX,
                property_list_args={
                    "proof_component_family": component_name,
                    "include_property_tree_evidence": True,
                    "include_scalar_target_discovery": True,
                    "source_inspection_evidence": source_inspection.get(
                        component_name,
                        {},
                    ),
                },
            )
            target_info = property_list.target_info_from_runtime_steps(
                runtime_steps,
                component_family=component_name,
            )
            property_result = runtime_steps["property_list"]["runtime_result"]
            if property_result.get("ok") is not True:
                raise ScalarTargetDiscoveryProofError(
                    f"{component_name} scalar discovery did not report ok=true."
                )
            discovery_review = review_component_scalar_discovery_result(
                property_result,
                target_info=target_info,
                component_name=component_name,
            )
            authoring.require_cleanup_restore_succeeded(
                runtime_steps["cleanup_restore"]
            )
            cleanup_restore = runtime_steps["cleanup_restore"]
            evidence_bundle["steps"][component_name] = runtime_steps
            component_results.append(
                {
                    "component_name": component_name,
                    "status": discovery_review["status"],
                    "blocker_code": discovery_review.get("blocker_code"),
                    "target_selected": discovery_review["target_selected"],
                    "selected_candidate": discovery_review.get("selected_candidate"),
                    "component_id": target_info["selected"]["component_id"],
                    "component_id_provenance": target_info["selected"][
                        "component_id_provenance"
                    ],
                    "entity_id": target_info["selected"].get("entity_id"),
                    "entity_name": target_info["selected"].get("entity_name"),
                    "property_path_count": len(property_result.get("property_paths", [])),
                    "discovery_review": discovery_review,
                    "restore_succeeded": cleanup_restore.get("restore_succeeded"),
                    "restore_result": cleanup_restore.get("restore_result"),
                    "cleanup_restore": cleanup_restore_summary(cleanup_restore),
                }
            )

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
            adapters_boundary=adapters_boundary,
            component_results=component_results,
            excluded_components=probe_plan["excluded_components"],
        )
    except Exception as exc:  # noqa: BLE001
        partial_runtime_steps = getattr(exc, "partial_runtime_steps", None)
        if isinstance(partial_runtime_steps, dict):
            evidence_bundle["steps"]["partial"] = authoring.scrub_secrets(
                partial_runtime_steps
            )
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
