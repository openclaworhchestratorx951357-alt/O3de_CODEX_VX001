from datetime import datetime, timezone

from app.models.control_plane import ExecutorRecord
from app.repositories.control_plane import control_plane_repository


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


executors_service = ExecutorsService()
