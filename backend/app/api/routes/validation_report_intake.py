from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.services.validation_report_intake import (
    build_validation_report_intake_dry_run_plan,
    build_validation_report_intake_endpoint_review,
    get_validation_report_intake_endpoint_gate,
)

router = APIRouter(tags=["validation"])


@router.post("/validation/report/intake")
def create_validation_report_intake_dry_run_plan(
    envelope: dict[str, Any],
) -> dict[str, Any]:
    gate = get_validation_report_intake_endpoint_gate()
    endpoint_review = build_validation_report_intake_endpoint_review(gate=gate)
    if gate["admission_flag_enabled"] is not True:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "VALIDATION_REPORT_INTAKE_ENDPOINT_BLOCKED",
                "message": (
                    "Validation report intake endpoint candidate remains blocked while "
                    "the server-owned admission flag is not explicit_on."
                ),
                "endpoint_candidate": True,
                "endpoint_admitted": False,
                "dry_run_only": True,
                "execution_admitted": False,
                "write_executed": False,
                "project_write_admitted": False,
                "write_status": "blocked",
                **gate,
                **endpoint_review,
            },
        )

    dry_run_plan = build_validation_report_intake_dry_run_plan(envelope)
    endpoint_review = build_validation_report_intake_endpoint_review(
        gate=gate,
        accepted=bool(dry_run_plan.get("accepted") is True),
        fail_closed_reasons=list(dry_run_plan.get("fail_closed_reasons") or []),
    )
    return {
        **dry_run_plan,
        "endpoint_candidate": True,
        "write_status": "blocked",
        "endpoint_admitted": False,
        **gate,
        **endpoint_review,
    }
