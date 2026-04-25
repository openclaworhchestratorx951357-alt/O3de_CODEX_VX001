from fastapi import APIRouter, HTTPException

from app.models.api import WorkspacesResponse, WorkspaceStatusResponse
from app.models.control_plane import WorkspaceRecord
from app.services.workspaces import workspaces_service

router = APIRouter(tags=["workspaces"])


@router.get("/workspaces", response_model=WorkspacesResponse)
def list_workspaces() -> WorkspacesResponse:
    return WorkspacesResponse(workspaces=workspaces_service.list_workspaces())


@router.get("/workspaces/status", response_model=WorkspaceStatusResponse)
def list_workspace_statuses() -> WorkspaceStatusResponse:
    return WorkspaceStatusResponse(workspaces=workspaces_service.list_workspace_statuses())


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceRecord)
def get_workspace(workspace_id: str) -> WorkspaceRecord:
    workspace = workspaces_service.get_workspace(workspace_id)
    if workspace is None:
        raise HTTPException(
            status_code=404,
            detail=f"Workspace '{workspace_id}' was not found.",
        )
    return workspace
