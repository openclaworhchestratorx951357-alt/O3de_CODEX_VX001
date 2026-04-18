from fastapi import APIRouter

from app.models.api import HealthStatus, ReadinessStatus, VersionStatus
from app.services.db import get_database_strategy_summary

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthStatus)
def health() -> HealthStatus:
    return HealthStatus(ok=True, service="backend", version="0.3.0")


@router.get("/ready", response_model=ReadinessStatus)
def ready() -> ReadinessStatus:
    return ReadinessStatus(
        ok=True,
        service="backend",
        execution_mode="simulated",
        dependencies=[
            get_database_strategy_summary(),
            "sqlite approvals store",
            "sqlite locks store",
            "sqlite events store",
            "sqlite execution records store",
            "sqlite artifact metadata store",
        ],
    )


@router.get("/version", response_model=VersionStatus)
def version() -> VersionStatus:
    return VersionStatus(
        service="backend",
        version="0.3.0",
        api_version="v0.3",
    )
