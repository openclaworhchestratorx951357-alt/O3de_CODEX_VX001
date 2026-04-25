from fastapi import APIRouter, HTTPException

from app.models.prompt_control import (
    PromptCapabilitiesResponse,
    PromptRequest,
    PromptShortcutRequest,
    PromptShortcutResponse,
    PromptSessionRecord,
    PromptSessionsResponse,
)
from app.services.capability_registry import capability_registry_service
from app.services.prompt_orchestrator import prompt_orchestrator_service
from app.services.prompt_shortcuts import prompt_shortcut_service
from app.services.prompt_sessions import prompt_sessions_service

router = APIRouter(prefix="/prompt", tags=["prompt"])


@router.get("/capabilities", response_model=PromptCapabilitiesResponse)
def list_prompt_capabilities() -> PromptCapabilitiesResponse:
    return capability_registry_service.list_capabilities_response()


@router.get("/sessions", response_model=PromptSessionsResponse)
def list_prompt_sessions() -> PromptSessionsResponse:
    return PromptSessionsResponse(sessions=prompt_sessions_service.list_sessions())


@router.post("/shortcuts", response_model=PromptShortcutResponse)
def create_prompt_shortcuts(request: PromptShortcutRequest) -> PromptShortcutResponse:
    return prompt_shortcut_service.build_shortcuts(request)


@router.get("/sessions/{prompt_id}", response_model=PromptSessionRecord)
def get_prompt_session(prompt_id: str) -> PromptSessionRecord:
    session = prompt_sessions_service.get_session(prompt_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=f"Prompt session '{prompt_id}' was not found.",
        )
    return session


@router.post("/sessions", response_model=PromptSessionRecord)
def create_prompt_session(request: PromptRequest) -> PromptSessionRecord:
    try:
        return prompt_orchestrator_service.create_session(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/sessions/{prompt_id}/execute", response_model=PromptSessionRecord)
def execute_prompt_session(prompt_id: str) -> PromptSessionRecord:
    try:
        return prompt_orchestrator_service.execute_session(prompt_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Prompt session '{prompt_id}' was not found.",
        ) from exc
