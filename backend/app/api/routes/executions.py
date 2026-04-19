from fastapi import APIRouter, HTTPException

from app.models.api import ExecutionListResponse, ExecutionsResponse
from app.models.control_plane import ExecutionRecord
from app.services.executions import executions_service

router = APIRouter(tags=["executions"])


@router.get("/executions", response_model=ExecutionsResponse)
def list_executions() -> ExecutionsResponse:
    return ExecutionsResponse(executions=executions_service.list_executions())


@router.get("/executions/cards", response_model=ExecutionListResponse)
def list_execution_cards() -> ExecutionListResponse:
    return executions_service.list_execution_cards()


@router.get("/executions/{execution_id}", response_model=ExecutionRecord)
def get_execution(execution_id: str) -> ExecutionRecord:
    execution = executions_service.get_execution(execution_id)
    if execution is None:
        raise HTTPException(
            status_code=404,
            detail=f"Execution '{execution_id}' was not found.",
        )
    return execution
