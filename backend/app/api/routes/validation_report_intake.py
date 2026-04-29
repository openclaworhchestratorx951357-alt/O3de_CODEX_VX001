from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.services.validation_report_intake import (
    VALIDATION_REPORT_INTAKE_CAPABILITY,
    build_validation_report_intake_dry_run_plan,
    get_validation_report_intake_endpoint_gate,
)

router = APIRouter(tags=["validation"])


def _blocked_endpoint_candidate_review_payload(gate: dict[str, Any]) -> dict[str, Any]:
    gate_state = str(gate.get("admission_flag_state") or "missing_default_off")
    safest_next_step = {
        "missing_default_off": (
            "Set the server-owned admission flag to an explicit truthy value to "
            "evaluate dry-run-only validation intake behavior."
        ),
        "explicit_off": (
            "Change the server-owned admission flag from explicit off to an explicit "
            "truthy value for dry-run-only candidate review."
        ),
        "invalid_default_off": (
            "Replace the invalid admission-flag value with an explicit truthy or false "
            "value; invalid values fail closed to blocked."
        ),
    }.get(
        gate_state,
        "Use an explicit server-owned truthy admission flag to evaluate the dry-run "
        "endpoint candidate.",
    )

    return {
        "corridor_name": VALIDATION_REPORT_INTAKE_CAPABILITY,
        "capability_name": VALIDATION_REPORT_INTAKE_CAPABILITY,
        "endpoint_candidate": True,
        "endpoint_admitted": False,
        "dry_run_only": True,
        "execution_admitted": False,
        "project_write_admitted": False,
        "write_executed": False,
        "write_status": "blocked",
        "gate_verdict": "blocked",
        "review_status": "endpoint_candidate_blocked",
        "fail_closed_reasons": ["endpoint_candidate_unadmitted"],
        "safest_next_step": safest_next_step,
        **gate,
    }


@router.post("/validation/report/intake")
def create_validation_report_intake_dry_run_plan(
    envelope: dict[str, Any],
) -> dict[str, Any]:
    gate = get_validation_report_intake_endpoint_gate()
    if gate["admission_flag_enabled"] is not True:
        raise HTTPException(
            status_code=404,
            detail=_blocked_endpoint_candidate_review_payload(gate),
        )

    dry_run_plan = build_validation_report_intake_dry_run_plan(envelope)
    accepted = dry_run_plan.get("accepted") is True
    return {
        **dry_run_plan,
        "endpoint_candidate": True,
        "write_status": "blocked",
        "endpoint_admitted": False,
        "gate_verdict": "dry_run_candidate",
        "review_status": (
            "dry_run_candidate_accepted" if accepted else "dry_run_candidate_refused"
        ),
        "safest_next_step": (
            "Keep endpoint dry-run-only and preserve dispatch refusal; do not admit "
            "execution or mutation paths."
        ),
        **gate,
    }
