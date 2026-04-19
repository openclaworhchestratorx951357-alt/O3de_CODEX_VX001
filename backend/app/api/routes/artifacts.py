from fastapi import APIRouter, HTTPException

from app.models.api import ArtifactListResponse, ArtifactsResponse
from app.models.control_plane import ArtifactRecord
from app.services.artifacts import artifacts_service

router = APIRouter(tags=["artifacts"])


@router.get("/artifacts", response_model=ArtifactsResponse)
def list_artifacts() -> ArtifactsResponse:
    return ArtifactsResponse(artifacts=artifacts_service.list_artifacts())


@router.get("/artifacts/cards", response_model=ArtifactListResponse)
def list_artifact_cards() -> ArtifactListResponse:
    return artifacts_service.list_artifact_cards()


@router.get("/artifacts/{artifact_id}", response_model=ArtifactRecord)
def get_artifact(artifact_id: str) -> ArtifactRecord:
    artifact = artifacts_service.get_artifact(artifact_id)
    if artifact is None:
        raise HTTPException(
            status_code=404,
            detail=f"Artifact '{artifact_id}' was not found.",
        )
    return artifact
