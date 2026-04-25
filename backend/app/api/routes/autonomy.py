from fastapi import APIRouter, HTTPException

from app.models.api import (
    AutonomyHealingActionCreateRequest,
    AutonomyHealingActionUpdateRequest,
    AutonomyHealingActionsResponse,
    AutonomyJobCreateRequest,
    AutonomyJobUpdateRequest,
    AutonomyJobsResponse,
    AutonomyMemoriesResponse,
    AutonomyMemoryCreateRequest,
    AutonomyObjectiveCreateRequest,
    AutonomyObjectivesResponse,
    AutonomyObservationCreateRequest,
    AutonomyObservationUpdateRequest,
    AutonomyObservationsResponse,
    AutonomySummaryResponse,
)
from app.models.control_plane import (
    AutonomyHealingActionRecord,
    AutonomyJobRecord,
    AutonomyMemoryRecord,
    AutonomyObjectiveRecord,
    AutonomyObservationRecord,
)
from app.services.autonomy import autonomy_service

router = APIRouter(prefix="/autonomy", tags=["autonomy"])


@router.get("", response_model=AutonomySummaryResponse)
def get_autonomy_summary() -> AutonomySummaryResponse:
    return autonomy_service.get_summary()


@router.get("/objectives", response_model=AutonomyObjectivesResponse)
def list_autonomy_objectives() -> AutonomyObjectivesResponse:
    return autonomy_service.list_objectives()


@router.post("/objectives", response_model=AutonomyObjectiveRecord)
def create_autonomy_objective(
    request: AutonomyObjectiveCreateRequest,
) -> AutonomyObjectiveRecord:
    try:
        return autonomy_service.create_objective(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/jobs", response_model=AutonomyJobsResponse)
def list_autonomy_jobs() -> AutonomyJobsResponse:
    return autonomy_service.list_jobs()


@router.post("/jobs", response_model=AutonomyJobRecord)
def create_autonomy_job(request: AutonomyJobCreateRequest) -> AutonomyJobRecord:
    try:
        return autonomy_service.create_job(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.patch("/jobs/{job_id}", response_model=AutonomyJobRecord)
def update_autonomy_job(
    job_id: str,
    request: AutonomyJobUpdateRequest,
) -> AutonomyJobRecord:
    try:
        return autonomy_service.update_job(job_id, request)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/observations", response_model=AutonomyObservationsResponse)
def list_autonomy_observations() -> AutonomyObservationsResponse:
    return autonomy_service.list_observations()


@router.post("/observations", response_model=AutonomyObservationRecord)
def create_autonomy_observation(
    request: AutonomyObservationCreateRequest,
) -> AutonomyObservationRecord:
    try:
        return autonomy_service.create_observation(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.patch("/observations/{observation_id}", response_model=AutonomyObservationRecord)
def update_autonomy_observation(
    observation_id: str,
    request: AutonomyObservationUpdateRequest,
) -> AutonomyObservationRecord:
    try:
        return autonomy_service.update_observation(observation_id, request)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/healing-actions", response_model=AutonomyHealingActionsResponse)
def list_autonomy_healing_actions() -> AutonomyHealingActionsResponse:
    return autonomy_service.list_healing_actions()


@router.post("/healing-actions", response_model=AutonomyHealingActionRecord)
def create_autonomy_healing_action(
    request: AutonomyHealingActionCreateRequest,
) -> AutonomyHealingActionRecord:
    try:
        return autonomy_service.create_healing_action(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.patch("/healing-actions/{action_id}", response_model=AutonomyHealingActionRecord)
def update_autonomy_healing_action(
    action_id: str,
    request: AutonomyHealingActionUpdateRequest,
) -> AutonomyHealingActionRecord:
    try:
        return autonomy_service.update_healing_action(action_id, request)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/memories", response_model=AutonomyMemoriesResponse)
def list_autonomy_memories() -> AutonomyMemoriesResponse:
    return autonomy_service.list_memories()


@router.post("/memories", response_model=AutonomyMemoryRecord)
def create_autonomy_memory(request: AutonomyMemoryCreateRequest) -> AutonomyMemoryRecord:
    try:
        return autonomy_service.create_memory(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
