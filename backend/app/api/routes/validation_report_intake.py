from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.services.validation_report_intake import (
    VALIDATION_REPORT_INTAKE_CAPABILITY,
    build_validation_report_intake_dry_run_plan,
    get_validation_report_intake_endpoint_gate,
)

router = APIRouter(tags=["validation"])


def _blocked_endpoint_candidate_review_payload(gate_state: str) -> dict[str, Any]:
    recommended_next_step = (
        "Use an explicit server-owned truthy admission flag to evaluate the dry-run "
        "endpoint candidate."
    )
    if gate_state == "missing_default_off":
        recommended_next_step = (
            "Set the server-owned admission flag to an explicit truthy value to "
            "evaluate dry-run-only validation intake behavior."
        )
    elif gate_state == "explicit_off":
        recommended_next_step = (
            "Change the server-owned admission flag from explicit off to an explicit "
            "truthy value for dry-run-only candidate review."
        )
    elif gate_state == "invalid_default_off":
        recommended_next_step = (
            "Replace the invalid admission-flag value with an explicit truthy or false "
            "value; invalid values fail closed to blocked."
        )

    return {
        "status": "blocked",
        "review_status": "endpoint_candidate_blocked",
        "review_code": "endpoint_candidate_unadmitted",
        "corridor_name": VALIDATION_REPORT_INTAKE_CAPABILITY,
        "endpoint_candidate": True,
        "endpoint_admitted": False,
        "dry_run_only": True,
        "execution_admitted": False,
        "write_executed": False,
        "project_write_admitted": False,
        "write_status": "blocked",
        "admission_flag_state": gate_state,
        "recommended_next_step": recommended_next_step,
    }


@router.post("/validation/report/intake")
def create_validation_report_intake_dry_run_plan(
    envelope: dict[str, Any],
) -> dict[str, Any]:
    gate = get_validation_report_intake_endpoint_gate()
    if gate["admission_flag_enabled"] is not True:
        raise HTTPException(
            status_code=404,
            detail={
                "message": (
                    "Validation report intake endpoint candidate remains blocked while "
                    "the server-owned admission flag is disabled."
                ),
                **_blocked_endpoint_candidate_review_payload(
                    str(gate["admission_flag_state"])
                ),
                **gate,
            },
        )

    dry_run_plan = build_validation_report_intake_dry_run_plan(envelope)
    review_status = (
        "dry_run_candidate_accepted"
        if dry_run_plan.get("accepted") is True
        else "dry_run_candidate_refused"
    )
    return {
        **dry_run_plan,
        "endpoint_candidate": True,
        "write_status": "blocked",
        "endpoint_admitted": False,
        "review_code": "dry_run_candidate",
        "review_status": review_status,
        "recommended_next_step": (
            "Keep endpoint dry-run-only and preserve dispatch refusal; do not admit "
            "execution or mutation paths."
        ),
        **gate,
    }
