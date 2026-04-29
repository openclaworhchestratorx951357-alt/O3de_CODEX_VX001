from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.services.validation_report_intake import (
    build_validation_report_intake_dry_run_plan,
    get_validation_report_intake_endpoint_gate,
)

router = APIRouter(tags=["validation"])


@router.post("/validation/report/intake")
def create_validation_report_intake_dry_run_plan(
    envelope: dict[str, Any],
) -> dict[str, Any]:
    gate = get_validation_report_intake_endpoint_gate()
    if gate["admission_flag_enabled"] is not True:
        raise HTTPException(
            status_code=404,
            detail=(
                "Validation report intake endpoint candidate remains blocked while "
                "the server-owned admission flag is disabled."
            ),
        )

    dry_run_plan = build_validation_report_intake_dry_run_plan(envelope)
    return {
        **dry_run_plan,
        "endpoint_candidate": True,
        "write_status": "blocked",
        "endpoint_admitted": False,
        **gate,
    }
