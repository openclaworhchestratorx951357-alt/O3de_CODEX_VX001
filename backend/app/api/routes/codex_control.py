from fastapi import APIRouter, HTTPException, Query

from app.models.api import (
    CodexControlLaneCreateRequest,
    CodexControlLaneCreateResponse,
    CodexControlNotificationCreateRequest,
    CodexControlNextTaskRequest,
    CodexControlNextTaskResponse,
    CodexControlNotificationsResponse,
    CodexControlStatusResponse,
    CodexControlTerminalLaunchRequest,
    CodexControlTerminalSessionResponse,
    CodexControlTerminalStopRequest,
    CodexControlTaskActionRequest,
    CodexControlTaskCreateRequest,
    CodexControlTaskSupersedeRequest,
    CodexControlTaskSupersedeResponse,
    CodexControlTaskResponse,
    CodexControlTaskWaitRequest,
    CodexControlWaiterResponse,
    CodexControlWorkerHeartbeatRequest,
    CodexControlWorkerResponse,
    CodexControlWorkerSyncRequest,
)
from app.services.codex_control import codex_control_service

router = APIRouter(prefix="/codex/control", tags=["codex-control"])


@router.get("", response_model=CodexControlStatusResponse)
def get_codex_control_status() -> CodexControlStatusResponse:
    return codex_control_service.get_status()


@router.post("/lanes", response_model=CodexControlLaneCreateResponse)
def create_codex_control_lane(
    request: CodexControlLaneCreateRequest,
) -> CodexControlLaneCreateResponse:
    try:
        return codex_control_service.create_lane(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/workers/sync", response_model=CodexControlWorkerResponse)
def sync_codex_control_worker(
    request: CodexControlWorkerSyncRequest,
) -> CodexControlWorkerResponse:
    try:
        return codex_control_service.sync_worker(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/workers/{worker_id}/heartbeat", response_model=CodexControlWorkerResponse)
def heartbeat_codex_control_worker(
    worker_id: str,
    request: CodexControlWorkerHeartbeatRequest,
) -> CodexControlWorkerResponse:
    try:
        return codex_control_service.heartbeat_worker(worker_id=worker_id, request=request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/tasks", response_model=CodexControlTaskResponse)
def create_codex_control_task(
    request: CodexControlTaskCreateRequest,
) -> CodexControlTaskResponse:
    try:
        return codex_control_service.create_task(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/tasks/{task_id}/claim", response_model=CodexControlTaskResponse)
def claim_codex_control_task(
    task_id: str,
    request: CodexControlTaskActionRequest,
) -> CodexControlTaskResponse:
    try:
        return codex_control_service.claim_task(task_id=task_id, request=request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/tasks/{task_id}/release", response_model=CodexControlTaskResponse)
def release_codex_control_task(
    task_id: str,
    request: CodexControlTaskActionRequest,
) -> CodexControlTaskResponse:
    try:
        return codex_control_service.release_task(task_id=task_id, request=request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/tasks/{task_id}/complete", response_model=CodexControlTaskResponse)
def complete_codex_control_task(
    task_id: str,
    request: CodexControlTaskActionRequest,
) -> CodexControlTaskResponse:
    try:
        return codex_control_service.complete_task(task_id=task_id, request=request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/tasks/{task_id}/supersede", response_model=CodexControlTaskSupersedeResponse)
def supersede_codex_control_task(
    task_id: str,
    request: CodexControlTaskSupersedeRequest,
) -> CodexControlTaskSupersedeResponse:
    try:
        return codex_control_service.supersede_task(task_id=task_id, request=request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/tasks/{task_id}/wait", response_model=CodexControlWaiterResponse)
def wait_for_codex_control_task(
    task_id: str,
    request: CodexControlTaskWaitRequest,
) -> CodexControlWaiterResponse:
    try:
        return codex_control_service.wait_for_task(task_id=task_id, request=request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/workers/next-task", response_model=CodexControlNextTaskResponse)
def get_next_codex_control_task(
    request: CodexControlNextTaskRequest,
) -> CodexControlNextTaskResponse:
    try:
        return codex_control_service.next_task(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get(
    "/workers/{worker_id}/notifications",
    response_model=CodexControlNotificationsResponse,
)
def list_codex_control_notifications(
    worker_id: str,
    include_all: bool = Query(default=False),
) -> CodexControlNotificationsResponse:
    try:
        return codex_control_service.list_notifications(
            worker_id=worker_id,
            include_all=include_all,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post(
    "/workers/{worker_id}/notifications/mark-read",
    response_model=CodexControlNotificationsResponse,
)
def mark_codex_control_notifications_read(
    worker_id: str,
) -> CodexControlNotificationsResponse:
    try:
        return codex_control_service.mark_notifications_read(worker_id=worker_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post(
    "/workers/{worker_id}/notify",
    response_model=CodexControlNotificationsResponse,
)
def notify_codex_control_worker(
    worker_id: str,
    request: CodexControlNotificationCreateRequest,
) -> CodexControlNotificationsResponse:
    try:
        return codex_control_service.notify_worker(worker_id=worker_id, request=request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post(
    "/terminals",
    response_model=CodexControlTerminalSessionResponse,
)
def launch_codex_control_terminal(
    request: CodexControlTerminalLaunchRequest,
) -> CodexControlTerminalSessionResponse:
    try:
        return codex_control_service.launch_terminal(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post(
    "/terminals/{session_id}/stop",
    response_model=CodexControlTerminalSessionResponse,
)
def stop_codex_control_terminal(
    session_id: str,
    request: CodexControlTerminalStopRequest,
) -> CodexControlTerminalSessionResponse:
    try:
        return codex_control_service.stop_terminal(session_id=session_id, request=request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
