from fastapi import APIRouter, HTTPException

from app.models.api import ExecutorsResponse, ExecutorStatusResponse
from app.models.control_plane import ExecutorRecord
from app.services.executors import executors_service

router = APIRouter(tags=["executors"])


@router.get("/executors", response_model=ExecutorsResponse)
def list_executors() -> ExecutorsResponse:
    return ExecutorsResponse(executors=executors_service.list_executors())


@router.get("/executors/status", response_model=ExecutorStatusResponse)
def list_executor_statuses() -> ExecutorStatusResponse:
    return ExecutorStatusResponse(executors=executors_service.list_executor_statuses())


@router.get("/executors/{executor_id}", response_model=ExecutorRecord)
def get_executor(executor_id: str) -> ExecutorRecord:
    executor = executors_service.get_executor(executor_id)
    if executor is None:
        raise HTTPException(
            status_code=404,
            detail=f"Executor '{executor_id}' was not found.",
        )
    return executor
