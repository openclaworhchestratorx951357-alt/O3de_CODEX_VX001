from fastapi import APIRouter, HTTPException, Query

from app.models.api import RunsResponse, RunsSummaryResponse
from app.models.control_plane import RunRecord
from app.services.runs import runs_service

router = APIRouter(tags=["runs"])


@router.get("/runs", response_model=RunsResponse)
def list_runs(
    tool: str | None = Query(default=None),
    audit_status: str | None = Query(default=None),
) -> RunsResponse:
    return RunsResponse(
        runs=runs_service.list_runs_for_audit_status(
            requested_tool=tool,
            requested_audit_status=audit_status,
        )
    )


@router.get("/runs/summary", response_model=RunsSummaryResponse)
def get_runs_summary(
    tool: str | None = Query(default=None),
    audit_status: str | None = Query(default=None),
) -> RunsSummaryResponse:
    return runs_service.get_runs_summary(
        requested_tool=tool,
        requested_audit_status=audit_status,
    )


@router.get("/runs/{run_id}", response_model=RunRecord)
def get_run(run_id: str) -> RunRecord:
    run = runs_service.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' was not found.")
    return run
