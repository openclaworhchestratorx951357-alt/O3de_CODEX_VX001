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
    AutonomyHealingStatus,
    AutonomyJobRecord,
    AutonomyJobStatus,
    AutonomyMemoryRecord,
    AutonomyObjectiveRecord,
    AutonomyObjectiveStatus,
    AutonomyObservationRecord,
    EventSeverity,
    utc_now,
)
from app.repositories.control_plane import control_plane_repository


def _increment(counter: dict[str, int], key: str) -> None:
    counter[key] = counter.get(key, 0) + 1


class AutonomyService:
    def get_summary(self) -> AutonomySummaryResponse:
        objectives = control_plane_repository.list_autonomy_objectives()
        jobs = control_plane_repository.list_autonomy_jobs()
        observations = control_plane_repository.list_autonomy_observations()
        healing_actions = control_plane_repository.list_autonomy_healing_actions()
        memories = control_plane_repository.list_autonomy_memories()

        objectives_by_status: dict[str, int] = {}
        for objective in objectives:
            _increment(objectives_by_status, objective.status.value)

        jobs_by_status: dict[str, int] = {}
        for job in jobs:
            _increment(jobs_by_status, job.status.value)

        observations_by_severity: dict[str, int] = {}
        for observation in observations:
            _increment(observations_by_severity, observation.severity.value)

        healing_actions_by_status: dict[str, int] = {}
        for action in healing_actions:
            _increment(healing_actions_by_status, action.status.value)

        return AutonomySummaryResponse(
            objectives_total=len(objectives),
            objectives_by_status=objectives_by_status,
            jobs_total=len(jobs),
            jobs_by_status=jobs_by_status,
            observations_total=len(observations),
            observations_by_severity=observations_by_severity,
            healing_actions_total=len(healing_actions),
            healing_actions_by_status=healing_actions_by_status,
            memories_total=len(memories),
        )

    def list_objectives(self) -> AutonomyObjectivesResponse:
        return AutonomyObjectivesResponse(
            objectives=control_plane_repository.list_autonomy_objectives()
        )

    def create_objective(
        self,
        request: AutonomyObjectiveCreateRequest,
    ) -> AutonomyObjectiveRecord:
        objective = AutonomyObjectiveRecord(
            id=request.id,
            title=request.title,
            description=request.description,
            status=AutonomyObjectiveStatus(request.status),
            priority=request.priority,
            target_scopes=request.target_scopes,
            success_criteria=request.success_criteria,
            owner_kind=request.owner_kind,
            metadata=request.metadata,
        )
        return control_plane_repository.create_autonomy_objective(objective)

    def list_jobs(self) -> AutonomyJobsResponse:
        return AutonomyJobsResponse(jobs=control_plane_repository.list_autonomy_jobs())

    def create_job(self, request: AutonomyJobCreateRequest) -> AutonomyJobRecord:
        if request.objective_id and not any(
            objective.id == request.objective_id
            for objective in control_plane_repository.list_autonomy_objectives()
        ):
            raise ValueError(
                f"Autonomy objective '{request.objective_id}' was not found."
            )
        job = AutonomyJobRecord(
            id=request.id,
            objective_id=request.objective_id,
            job_kind=request.job_kind,
            title=request.title,
            summary=request.summary,
            status=AutonomyJobStatus(request.status),
            assigned_lane=request.assigned_lane,
            resource_keys=request.resource_keys,
            depends_on=request.depends_on,
            input_payload=request.input_payload,
            output_payload=request.output_payload,
            retry_count=request.retry_count,
            max_retries=request.max_retries,
            last_error=request.last_error,
        )
        return control_plane_repository.create_autonomy_job(job)

    def update_job(
        self,
        job_id: str,
        request: AutonomyJobUpdateRequest,
    ) -> AutonomyJobRecord:
        job = control_plane_repository.get_autonomy_job(job_id)
        if job is None:
            raise LookupError(f"Autonomy job '{job_id}' was not found.")

        fields_set = request.model_fields_set
        now = utc_now()

        if "status" in fields_set:
            job.status = AutonomyJobStatus(request.status) if request.status is not None else job.status

        if "assigned_lane" in fields_set:
            job.assigned_lane = request.assigned_lane

        if "output_payload" in fields_set:
            job.output_payload = request.output_payload or {}

        if "retry_count" in fields_set and request.retry_count is not None:
            job.retry_count = request.retry_count

        if "last_error" in fields_set:
            job.last_error = request.last_error

        if job.status == AutonomyJobStatus.RUNNING and job.started_at is None:
            job.started_at = now

        if job.status in {
            AutonomyJobStatus.SUCCEEDED,
            AutonomyJobStatus.FAILED,
            AutonomyJobStatus.CANCELLED,
        }:
            job.finished_at = now
        elif job.status in {AutonomyJobStatus.QUEUED, AutonomyJobStatus.RUNNING, AutonomyJobStatus.BLOCKED}:
            job.finished_at = None

        job.updated_at = now
        return control_plane_repository.update_autonomy_job(job)

    def list_observations(self) -> AutonomyObservationsResponse:
        return AutonomyObservationsResponse(
            observations=control_plane_repository.list_autonomy_observations()
        )

    def create_observation(
        self,
        request: AutonomyObservationCreateRequest,
    ) -> AutonomyObservationRecord:
        observation = AutonomyObservationRecord(
            id=request.id,
            source_kind=request.source_kind,
            source_ref=request.source_ref,
            category=request.category,
            severity=EventSeverity(request.severity),
            message=request.message,
            details=request.details,
        )
        return control_plane_repository.create_autonomy_observation(observation)

    def update_observation(
        self,
        observation_id: str,
        request: AutonomyObservationUpdateRequest,
    ) -> AutonomyObservationRecord:
        observation = control_plane_repository.get_autonomy_observation(observation_id)
        if observation is None:
            raise LookupError(f"Autonomy observation '{observation_id}' was not found.")

        fields_set = request.model_fields_set
        if "message" in fields_set and request.message is not None:
            observation.message = request.message
        if "details" in fields_set:
            observation.details = request.details or {}

        return control_plane_repository.update_autonomy_observation(observation)

    def list_healing_actions(self) -> AutonomyHealingActionsResponse:
        return AutonomyHealingActionsResponse(
            healing_actions=control_plane_repository.list_autonomy_healing_actions()
        )

    def create_healing_action(
        self,
        request: AutonomyHealingActionCreateRequest,
    ) -> AutonomyHealingActionRecord:
        if request.observation_id and not any(
            observation.id == request.observation_id
            for observation in control_plane_repository.list_autonomy_observations()
        ):
            raise ValueError(
                f"Autonomy observation '{request.observation_id}' was not found."
            )
        if request.job_id and not any(
            job.id == request.job_id
            for job in control_plane_repository.list_autonomy_jobs()
        ):
            raise ValueError(f"Autonomy job '{request.job_id}' was not found.")
        action = AutonomyHealingActionRecord(
            id=request.id,
            observation_id=request.observation_id,
            job_id=request.job_id,
            action_kind=request.action_kind,
            summary=request.summary,
            status=AutonomyHealingStatus(request.status),
            details=request.details,
        )
        return control_plane_repository.create_autonomy_healing_action(action)

    def update_healing_action(
        self,
        action_id: str,
        request: AutonomyHealingActionUpdateRequest,
    ) -> AutonomyHealingActionRecord:
        action = control_plane_repository.get_autonomy_healing_action(action_id)
        if action is None:
            raise LookupError(f"Autonomy healing action '{action_id}' was not found.")

        fields_set = request.model_fields_set
        now = utc_now()

        if "status" in fields_set and request.status is not None:
            action.status = AutonomyHealingStatus(request.status)
        if "details" in fields_set:
            action.details = request.details or {}

        action.updated_at = now
        if action.status == AutonomyHealingStatus.SUCCEEDED:
            action.resolved_at = now
        elif action.status in {AutonomyHealingStatus.PROPOSED, AutonomyHealingStatus.RUNNING}:
            action.resolved_at = None

        return control_plane_repository.update_autonomy_healing_action(action)

    def list_memories(self) -> AutonomyMemoriesResponse:
        return AutonomyMemoriesResponse(
            memories=control_plane_repository.list_autonomy_memories()
        )

    def create_memory(self, request: AutonomyMemoryCreateRequest) -> AutonomyMemoryRecord:
        memory = AutonomyMemoryRecord(
            id=request.id,
            memory_kind=request.memory_kind,
            title=request.title,
            content=request.content,
            tags=request.tags,
            confidence=request.confidence,
            source_refs=request.source_refs,
        )
        return control_plane_repository.create_autonomy_memory(memory)


autonomy_service = AutonomyService()
