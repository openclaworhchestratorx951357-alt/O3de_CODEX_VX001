from fastapi import APIRouter, Query

from app.models.o3de_target import (
    O3DEBridgeResultsCleanupResult,
    O3DEBridgeStatus,
    O3DETargetConfig,
)
from app.services.o3de_target import o3de_target_service

router = APIRouter(prefix="/o3de", tags=["o3de"])


@router.get("/target", response_model=O3DETargetConfig)
def get_o3de_target() -> O3DETargetConfig:
    return o3de_target_service.get_local_target()


@router.get("/bridge", response_model=O3DEBridgeStatus)
def get_o3de_bridge() -> O3DEBridgeStatus:
    return o3de_target_service.get_bridge_status()


@router.post("/bridge/results/cleanup", response_model=O3DEBridgeResultsCleanupResult)
def cleanup_o3de_bridge_results(
    min_age_s: int = Query(default=300, ge=0, le=86400),
) -> O3DEBridgeResultsCleanupResult:
    return o3de_target_service.cleanup_stale_bridge_results(min_age_s=min_age_s)
