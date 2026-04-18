from datetime import datetime, timezone
from uuid import uuid4

from app.models.control_plane import ExecutionRecord, ExecutionStatus
from app.repositories.control_plane import control_plane_repository


class ExecutionsService:
    def create_execution(
        self,
        *,
        run_id: str,
        request_id: str,
        agent: str,
        tool: str,
        execution_mode: str,
        status: ExecutionStatus,
        details: dict[str, object] | None = None,
        warnings: list[str] | None = None,
        logs: list[str] | None = None,
        result_summary: str | None = None,
    ) -> ExecutionRecord:
        execution = ExecutionRecord(
            id=f"exe-{uuid4().hex[:12]}",
            run_id=run_id,
            request_id=request_id,
            agent=agent,
            tool=tool,
            execution_mode=execution_mode,
            status=status,
            details=details or {},
            warnings=warnings or [],
            logs=logs or [],
            result_summary=result_summary,
        )
        return control_plane_repository.create_execution(execution)

    def list_executions(self) -> list[ExecutionRecord]:
        return control_plane_repository.list_executions()

    def get_execution(self, execution_id: str) -> ExecutionRecord | None:
        return control_plane_repository.get_execution(execution_id)

    def update_execution(
        self,
        execution_id: str,
        *,
        status: ExecutionStatus | None = None,
        warnings: list[str] | None = None,
        logs: list[str] | None = None,
        artifact_ids: list[str] | None = None,
        details: dict[str, object] | None = None,
        result_summary: str | None = None,
        finished: bool = False,
    ) -> ExecutionRecord:
        execution = self.get_execution(execution_id)
        if execution is None:
            raise KeyError(execution_id)
        if status is not None:
            execution.status = status
        if warnings is not None:
            execution.warnings = warnings
        if logs is not None:
            execution.logs = logs
        if artifact_ids is not None:
            execution.artifact_ids = artifact_ids
        if details is not None:
            execution.details = details
        if result_summary is not None:
            execution.result_summary = result_summary
        if finished:
            execution.finished_at = datetime.now(timezone.utc)
        return control_plane_repository.update_execution(execution)


executions_service = ExecutionsService()
