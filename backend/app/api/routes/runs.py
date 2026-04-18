from fastapi import APIRouter, HTTPException

from app.models.api import RunsResponse
from app.models.control_plane import RunRecord
from app.services.runs import runs_service

router = APIRouter(tags=["runs"])


@router.get("/runs", response_model=RunsResponse)
def list_runs() -> RunsResponse:
    return RunsResponse(runs=runs_service.list_runs())


@router.get("/runs/{run_id}", response_model=RunRecord)
def get_run(run_id: str) -> RunRecord:
    run = runs_service.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' was not found.")
    return run
