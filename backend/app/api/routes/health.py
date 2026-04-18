from fastapi import APIRouter

from app.models.api import HealthStatus, ReadinessStatus, VersionStatus
from app.services.db import (
    get_database_path,
    get_database_runtime_status,
    get_database_runtime_warning,
    get_database_strategy_summary,
    is_database_ready,
)
from app.services.schema_validation import schema_validation_service

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthStatus)
def health() -> HealthStatus:
    return HealthStatus(ok=True, service="backend", version="0.3.1")


@router.get("/ready", response_model=ReadinessStatus)
def ready() -> ReadinessStatus:
    runtime_status = get_database_runtime_status()
    persistence_ready = is_database_ready()
    return ReadinessStatus(
        ok=persistence_ready,
        service="backend",
        execution_mode="simulated",
        persistence_ready=persistence_ready,
        requested_database_strategy=runtime_status.requested_strategy,
        database_strategy=get_database_strategy_summary(),
        database_path=str(get_database_path()),
        persistence_warning=get_database_runtime_warning(),
        attempted_database_paths=runtime_status.attempted_paths,
        schema_validation=schema_validation_service.get_capability_status(),
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
        version="0.3.1",
        api_version="v0.3.1",
    )
