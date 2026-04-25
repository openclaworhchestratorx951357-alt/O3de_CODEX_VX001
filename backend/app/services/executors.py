from datetime import datetime, timezone

from app.models.api import ExecutorStatusProjection
from app.models.control_plane import ExecutorRecord
from app.repositories.control_plane import control_plane_repository

_ACTIVE_EXECUTION_STATUSES = {"pending", "waiting_approval", "running"}
_ACTIVE_EXECUTION_ATTEMPT_STATES = {
    "queued",
    "provisioning",
    "preflight_running",
    "running",
    "executing",
    "verifying",
    "cleanup_pending",
}
_ACTIVE_WORKSPACE_STATES = {
    "provisioning",
    "ready",
    "preflight_running",
    "executing",
    "verifying",
    "cleanup_pending",
}
_EXECUTOR_STATUS_TRUTH_NOTE = (
    "Executor availability is substrate truth only; it does not admit or prove "
    "any specific tool surface."
)


def _datetime_label(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


class ExecutorsService:
    def list_executors(self) -> list[ExecutorRecord]:
        return control_plane_repository.list_executors()

    def get_executor(self, executor_id: str) -> ExecutorRecord | None:
        return control_plane_repository.get_executor(executor_id)

    def upsert_executor(self, executor: ExecutorRecord) -> ExecutorRecord:
        existing = control_plane_repository.get_executor(executor.id)
        if existing is None:
            return control_plane_repository.create_executor(executor)

        existing.executor_kind = executor.executor_kind
        existing.executor_label = executor.executor_label
        existing.executor_host_label = executor.executor_host_label
        existing.execution_mode_class = executor.execution_mode_class
        existing.availability_state = executor.availability_state
        existing.supported_runner_families = executor.supported_runner_families
        existing.capability_snapshot = executor.capability_snapshot
        existing.last_heartbeat_at = executor.last_heartbeat_at or datetime.now(
            timezone.utc
        )
        existing.last_failure_summary = executor.last_failure_summary
        existing.updated_at = datetime.now(timezone.utc)
        return control_plane_repository.update_executor(existing)

    def list_executor_statuses(self) -> list[ExecutorStatusProjection]:
        workspaces = control_plane_repository.list_workspaces()
        executions = control_plane_repository.list_executions()
        projections: list[ExecutorStatusProjection] = []

        for executor in self.list_executors():
            active_workspace_count = sum(
                1
                for workspace in workspaces
                if workspace.owner_executor_id == executor.id
                and workspace.workspace_state in _ACTIVE_WORKSPACE_STATES
            )
            active_run_ids = {
                execution.run_id
                for execution in executions
                if execution.executor_id == executor.id
                and (
                    execution.status.value in _ACTIVE_EXECUTION_STATUSES
                    or (
                        execution.execution_attempt_state
                        in _ACTIVE_EXECUTION_ATTEMPT_STATES
                    )
                )
            }
            projections.append(
                ExecutorStatusProjection(
                    executor_id=executor.id,
                    executor_label=executor.executor_label,
                    executor_kind=executor.executor_kind,
                    executor_host_label=executor.executor_host_label,
                    execution_mode_class=executor.execution_mode_class,
                    supported_runner_families=executor.supported_runner_families,
                    availability_state=executor.availability_state,
                    last_heartbeat_at=_datetime_label(executor.last_heartbeat_at),
                    active_workspace_count=active_workspace_count,
                    active_run_count=len(active_run_ids),
                    last_failure_summary=executor.last_failure_summary,
                    truth_note=_EXECUTOR_STATUS_TRUTH_NOTE,
                )
            )
        return projections


executors_service = ExecutorsService()
