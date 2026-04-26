from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import prove_live_editor_authoring as authoring
import prove_live_editor_component_property_list as property_list

PROOF_NAME = "live_editor_comment_scalar_target_proof"
SCRIPT_VERSION = "v0.1"
PROOF_COMPONENT_FAMILY = "Comment"
PROOF_ENTITY_PREFIX = "CodexCommentScalarTargetProofEntity"
REQUEST_PREFIX = "comment-scalar-target-proof"
TARGET_PROVENANCE = "admitted_runtime_component_add_result"
BLOCKER_CODE = "comment_scalar_target_unavailable"
PROPERTY_LIST_UNAVAILABLE_BLOCKER_CODE = "comment_property_list_unavailable"
SUCCESS_NEXT_STEP = (
    "Review the Comment scalar readback evidence before any proof-only property-write "
    "packet."
)

PREFERRED_PATH_MARKERS = ("comment", "text", "description", "note")
REJECT_PATH_MARKERS = (
    "asset",
    "material",
    "mesh",
    "render",
    "ray",
    "lod",
    "lighting",
    "stat",
    "transform",
)
SCALAR_VALUE_TYPE_MARKERS = (
    "string",
    "azstd::string",
    "bool",
    "boolean",
    "int",
    "float",
    "double",
    "number",
    "u32",
    "s32",
)


class CommentScalarTargetProofError(authoring.ProofError):
    """Raised when Comment scalar target discovery cannot complete."""


def _path_prefixes(property_paths: list[str]) -> set[str]:
    return {
        "|".join(parts[:index])
        for path in property_paths
        for parts in [path.split("|")]
        for index in range(1, len(parts))
    }


def classify_comment_property_paths(property_paths: list[str]) -> dict[str, Any]:
    normalized_paths = [path.strip() for path in property_paths if path.strip()]
    prefixes = _path_prefixes(normalized_paths)
    reviews: list[dict[str, Any]] = []

    for path in normalized_paths:
        lowered = path.lower()
        if path in prefixes:
            evidence_class = "container_or_group"
            provisional = False
            reason = "Grouping paths are not concrete scalar property targets."
        elif any(marker in lowered for marker in REJECT_PATH_MARKERS):
            evidence_class = "out_of_scope_property_path"
            provisional = False
            reason = (
                "The path is asset, material, render, transform, or derived-stat "
                "adjacent and is outside the Comment scalar discovery boundary."
            )
        else:
            preferred = any(marker in lowered for marker in PREFERRED_PATH_MARKERS)
            evidence_class = (
                "preferred_text_like_candidate"
                if preferred
                else "non_render_candidate_requires_readback"
            )
            provisional = True
            reason = (
                "The path is non-asset and non-render by name; live value readback "
                "must still prove scalar/text-like type before any write proof."
            )
        reviews.append(
            {
                "property_path": path,
                "evidence_class": evidence_class,
                "provisional_readback_candidate": provisional,
                "write_target_admitted": False,
                "reason": reason,
            }
        )

    candidates = [
        review
        for review in reviews
        if review["provisional_readback_candidate"] is True
    ]
    candidates.sort(
        key=lambda item: (
            0
            if item["evidence_class"] == "preferred_text_like_candidate"
            else 1,
            str(item["property_path"]).lower(),
        )
    )
    selected = candidates[0] if candidates else None
    return {
        "target_selected": selected is not None,
        "status": "selected_for_readback" if selected else "blocked",
        "blocker_code": None if selected else BLOCKER_CODE,
        "component_family": PROOF_COMPONENT_FAMILY,
        "selected_property_path": selected["property_path"] if selected else None,
        "reviewed_property_count": len(reviews),
        "reviewed_paths": reviews,
        "write_target_admitted": False,
        "required_next_evidence": (
            "Read the selected Comment property value and type through "
            "editor.component.property.get; do not admit writes until backup, write, "
            "after-readback, restore, and post-restore verification exist."
        ),
    }


def _value_is_scalar_or_text_like(value: Any, value_type: Any) -> bool:
    if isinstance(value, (str, bool, int, float)):
        return True
    value_type_text = "" if value_type is None else str(value_type).lower()
    return any(marker in value_type_text for marker in SCALAR_VALUE_TYPE_MARKERS)


def require_comment_readback(
    runtime_steps: dict[str, Any],
    *,
    target_info: dict[str, Any],
) -> dict[str, Any]:
    selection = runtime_steps.get("property_target_selection")
    if not isinstance(selection, dict) or selection.get("target_selected") is not True:
        raise CommentScalarTargetProofError(
            "No Comment property path was selected for scalar readback."
        )
    property_get = runtime_steps.get("property_get")
    if not isinstance(property_get, dict):
        raise CommentScalarTargetProofError(
            "Selected Comment property path was not read through property.get."
        )
    runtime_result = property_get.get("runtime_result")
    if not isinstance(runtime_result, dict) or runtime_result.get("ok") is not True:
        raise CommentScalarTargetProofError(
            "Comment property.get did not report ok=true."
        )

    selected = target_info["selected"]
    property_path = selection["selected_property_path"]
    if runtime_result.get("component_id") != selected["component_id"]:
        raise CommentScalarTargetProofError(
            "Comment property.get did not use the admitted component-add id."
        )
    if runtime_result.get("property_path") != property_path:
        raise CommentScalarTargetProofError(
            "Comment property.get did not preserve the selected property path."
        )
    if "property_paths" in runtime_result:
        raise CommentScalarTargetProofError(
            "Comment property.get returned property-list evidence."
        )

    value = runtime_result.get("value")
    value_type = runtime_result.get("value_type")
    scalar_or_text_like = _value_is_scalar_or_text_like(value, value_type)
    return {
        "component_family": PROOF_COMPONENT_FAMILY,
        "component_id": selected["component_id"],
        "component_id_provenance": selected["component_id_provenance"],
        "property_path": runtime_result.get("property_path"),
        "value": value,
        "value_type": value_type,
        "scalar_or_text_like": scalar_or_text_like,
        "future_write_candidate_selected": scalar_or_text_like,
        "write_target_admitted": False,
        "blocker_code": None if scalar_or_text_like else BLOCKER_CODE,
    }


def require_adapters_boundary(adapters_payload: dict[str, Any]) -> dict[str, Any]:
    boundary = property_list.require_adapters_boundary(adapters_payload)
    real_tool_paths = adapters_payload.get("real_tool_paths")
    if not isinstance(real_tool_paths, list):
        adapter_status = adapters_payload.get("adapters")
        real_tool_paths = (
            adapter_status.get("real_tool_paths")
            if isinstance(adapter_status, dict)
            else None
        )
    if isinstance(real_tool_paths, list) and "editor.component.property.write" in real_tool_paths:
        raise CommentScalarTargetProofError(
            "editor.component.property.write is exposed through /adapters."
        )
    return boundary


def build_success_summary(
    *,
    safe_level_info: dict[str, Any],
    target_info: dict[str, Any],
    runtime_steps: dict[str, Any],
    adapters_boundary: dict[str, Any],
    readback_review: dict[str, Any] | None,
) -> dict[str, Any]:
    selected = target_info["selected"]
    property_result = runtime_steps["property_list"]["runtime_result"]
    property_paths = property_result["property_paths"]
    cleanup_restore = runtime_steps["cleanup_restore"]
    selection = runtime_steps.get("property_target_selection", {})
    target_selected = readback_review is not None and readback_review.get(
        "future_write_candidate_selected"
    ) is True
    return {
        "succeeded": True,
        "status": "succeeded",
        "completed_at": authoring.utc_now(),
        "selected_level_path": safe_level_info["selected_level_path"],
        "entity_name": selected.get("entity_name"),
        "entity_id": selected.get("entity_id"),
        "component_family": PROOF_COMPONENT_FAMILY,
        "component_id": selected["component_id"],
        "component_id_provenance": TARGET_PROVENANCE,
        "property_path_count": len(property_paths),
        "property_target_selection": selection,
        "readback_review": readback_review,
        "future_write_candidate_selected": target_selected,
        "write_target_admitted": False,
        "adapters_boundary": {
            "active_mode": adapters_boundary.get("active_mode"),
            "configured_mode": adapters_boundary.get("configured_mode"),
            "property_list_exposed": False,
            "property_write_exposed": False,
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
        },
        "verified_facts": [
            f"Selected safe non-default level {safe_level_info['selected_level_path']}.",
            (
                "Provisioned temporary Comment component target "
                f"{selected['component_id']} through admitted entity/create and "
                "component/add."
            ),
            (
                "Listed Comment property paths through proof-only "
                "editor.component.property.list without adapter admission."
            ),
            (
                "Selected and read one non-render Comment property candidate."
                if readback_review
                else "No Comment property candidate was selected for readback."
            ),
            (
                "Restored the selected loaded-level prefab from the pre-mutation "
                f"backup with result {cleanup_restore.get('restore_result')}."
            ),
        ],
        "missing_proof": [
            "No property writes were implemented, admitted, or executed.",
            "No Prompt Studio, dispatcher, catalog, or /adapters admission was proven.",
            (
                "Future write candidacy remains review-only until a separate "
                "proof-only write harness proves before/write/after/restore/post-restore."
            ),
            (
                "No arbitrary Editor Python, delete, parenting, prefab, material, "
                "asset, render, build, or TIAF behavior was exercised."
            ),
            "No live Editor undo or viewport reload was proven.",
        ],
        "safest_next_step": SUCCESS_NEXT_STEP,
    }


def build_failure_summary(
    *,
    error: Exception,
    preflight_facts: list[str],
) -> dict[str, Any]:
    cleanup_restore = getattr(error, "cleanup_restore", None)
    cleanup_verified = (
        isinstance(cleanup_restore, dict)
        and cleanup_restore.get("restore_succeeded") is True
    )
    property_list_unavailable = (
        "typed string-only property_paths list" in str(error)
        or "property_paths list" in str(error)
    )
    blocker_verified = cleanup_verified and property_list_unavailable
    return {
        "succeeded": blocker_verified,
        "status": "blocked" if blocker_verified else "failed",
        "completed_at": authoring.utc_now() if blocker_verified else None,
        "failed_at": None if blocker_verified else authoring.utc_now(),
        "error_type": error.__class__.__name__,
        "error_message": str(error),
        "target_selected": False,
        "future_write_candidate_selected": False,
        "write_target_admitted": False,
        "blocker_code": (
            PROPERTY_LIST_UNAVAILABLE_BLOCKER_CODE
            if property_list_unavailable
            else BLOCKER_CODE
        ),
        "component_family": PROOF_COMPONENT_FAMILY,
        "mutation_occurred": cleanup_verified,
        "restore_or_cleanup_verified": cleanup_verified,
        "verified_facts": preflight_facts,
        "cleanup_restore": (
            authoring.scrub_secrets(cleanup_restore)
            if isinstance(cleanup_restore, dict)
            else None
        ),
        "missing_proof": [
            (
                "No Comment scalar/text-like target was selected because the bridge "
                "did not return typed property paths for the Comment component."
                if property_list_unavailable
                else "Comment scalar/text-like target discovery did not complete in this run."
            ),
            "No property write behavior was proven.",
        ],
        "safest_next_step": (
            "Choose another already-allowlisted non-render component or add a typed "
            "Comment property discovery fix without widening into writes or public "
            "property-list admission."
            if property_list_unavailable
            else (
                "Resolve Comment component discovery without widening into property "
                "writes or public property-list admission."
            )
        ),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a proof-only live discovery of a Comment scalar/text-like property "
            "target candidate."
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
        else runtime_dir / f"live_editor_comment_scalar_target_proof_{run_label}.json"
    )
    preflight_facts: list[str] = []
    evidence_bundle: dict[str, Any] = {
        "schema_version": SCRIPT_VERSION,
        "proof_name": PROOF_NAME,
        "generated_at": authoring.utc_now(),
        "base_url": args.base_url,
        "output_path": str(output_path),
        "proof_boundary": {
            "proof_driver": "proof-only Comment scalar target discovery",
            "admission_boundary": (
                "No property write admission; property.list remains proof-only and "
                "unexposed through Prompt Studio, dispatcher/catalog, and /adapters."
            ),
            "component_family": PROOF_COMPONENT_FAMILY,
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
            raise CommentScalarTargetProofError("GET /ready did not return an object.")
        if not isinstance(target_payload, dict):
            raise CommentScalarTargetProofError(
                "GET /o3de/target did not return an object."
            )
        if not isinstance(bridge_payload, dict):
            raise CommentScalarTargetProofError(
                "GET /o3de/bridge did not return an object."
            )
        if not isinstance(adapters_payload, dict):
            raise CommentScalarTargetProofError("GET /adapters did not return an object.")

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

        runtime_steps = property_list._execute_runtime_steps(
            run_label=run_label,
            project_root=args.project_root,
            engine_root=args.engine_root,
            level_path=safe_level_info["selected_level_path"],
            component_family=PROOF_COMPONENT_FAMILY,
            entity_prefix=PROOF_ENTITY_PREFIX,
            request_prefix=REQUEST_PREFIX,
            property_read_selector=classify_comment_property_paths,
        )
        target_info = property_list.target_info_from_runtime_steps(
            runtime_steps,
            component_family=PROOF_COMPONENT_FAMILY,
        )
        evidence_bundle["preflight"]["component_target_selection"] = target_info
        property_result = runtime_steps["property_list"]["runtime_result"]
        property_list.require_property_list_result(
            property_result,
            target=target_info["selected"],
            expected_property_path=None,
        )
        readback_review = None
        if runtime_steps.get("property_get") is not None:
            readback_review = require_comment_readback(
                runtime_steps,
                target_info=target_info,
            )

        evidence_bundle["steps"] = runtime_steps
        authoring.require_cleanup_restore_succeeded(runtime_steps["cleanup_restore"])
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
            target_info=target_info,
            runtime_steps=runtime_steps,
            adapters_boundary=adapters_boundary,
            readback_review=readback_review,
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
