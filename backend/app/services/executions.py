from datetime import datetime, timezone
from uuid import uuid4

from app.models.api import ExecutionListItem, ExecutionListResponse
from app.models.control_plane import ExecutionRecord, ExecutionStatus
from app.repositories.control_plane import control_plane_repository
from app.services.card_utils import (
    isoformat_or_none,
    read_nested_string_value,
    read_string_value,
)


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
        executor_id: str | None = None,
        workspace_id: str | None = None,
        runner_family: str | None = None,
        execution_attempt_state: str | None = None,
        failure_category: str | None = None,
        backup_class: str | None = None,
        rollback_class: str | None = None,
        retention_class: str | None = None,
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
            executor_id=executor_id,
            workspace_id=workspace_id,
            runner_family=runner_family,
            execution_attempt_state=execution_attempt_state,
            failure_category=failure_category,
            backup_class=backup_class,
            rollback_class=rollback_class,
            retention_class=retention_class,
        )
        return control_plane_repository.create_execution(execution)

    def list_executions(self) -> list[ExecutionRecord]:
        return control_plane_repository.list_executions()

    def list_execution_cards(
        self,
        *,
        requested_inspection_surface: str | None = None,
        requested_fallback_category: str | None = None,
        requested_manifest_source_of_truth: str | None = None,
    ) -> ExecutionListResponse:
        execution_cards = [
            ExecutionListItem(
                id=execution.id,
                run_id=execution.run_id,
                request_id=execution.request_id,
                agent=execution.agent,
                tool=execution.tool,
                execution_mode=execution.execution_mode,
                status=execution.status.value,
                started_at=execution.started_at.isoformat(),
                finished_at=isoformat_or_none(execution.finished_at),
                result_summary=execution.result_summary,
                warning_count=len(execution.warnings),
                artifact_count=len(execution.artifact_ids),
                inspection_surface=read_string_value(execution.details, "inspection_surface"),
                fallback_category=read_string_value(execution.details, "fallback_category"),
                project_manifest_source_of_truth=read_string_value(
                    execution.details,
                    "project_manifest_source_of_truth",
                ),
                executor_id=execution.executor_id,
                workspace_id=execution.workspace_id,
                runner_family=execution.runner_family,
                execution_attempt_state=execution.execution_attempt_state,
                failure_category=execution.failure_category,
                backup_class=execution.backup_class,
                rollback_class=execution.rollback_class,
                retention_class=execution.retention_class,
                mutation_audit_status=read_nested_string_value(
                    execution.details,
                    "mutation_audit",
                    "status",
                ),
                mutation_audit_summary=read_nested_string_value(
                    execution.details,
                    "mutation_audit",
                    "summary",
                ),
            )
            for execution in self.list_executions()
        ]
        return ExecutionListResponse(
            executions=[
                card
                for card in execution_cards
                if self._matches_card_filters(
                    card=card,
                    requested_inspection_surface=requested_inspection_surface,
                    requested_fallback_category=requested_fallback_category,
                    requested_manifest_source_of_truth=requested_manifest_source_of_truth,
                )
            ]
        )

    def _matches_card_filters(
        self,
        *,
        card: ExecutionListItem,
        requested_inspection_surface: str | None,
        requested_fallback_category: str | None,
        requested_manifest_source_of_truth: str | None,
    ) -> bool:
        if (
            requested_inspection_surface
            and card.inspection_surface != requested_inspection_surface
        ):
            return False
        if (
            requested_fallback_category
            and card.fallback_category != requested_fallback_category
        ):
            return False
        if (
            requested_manifest_source_of_truth
            and card.project_manifest_source_of_truth != requested_manifest_source_of_truth
        ):
            return False
        return True

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
        executor_id: str | None = None,
        workspace_id: str | None = None,
        runner_family: str | None = None,
        execution_attempt_state: str | None = None,
        failure_category: str | None = None,
        backup_class: str | None = None,
        rollback_class: str | None = None,
        retention_class: str | None = None,
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
        if executor_id is not None:
            execution.executor_id = executor_id
        if workspace_id is not None:
            execution.workspace_id = workspace_id
        if runner_family is not None:
            execution.runner_family = runner_family
        if execution_attempt_state is not None:
            execution.execution_attempt_state = execution_attempt_state
        if failure_category is not None:
            execution.failure_category = failure_category
        if backup_class is not None:
            execution.backup_class = backup_class
        if rollback_class is not None:
            execution.rollback_class = rollback_class
        if retention_class is not None:
            execution.retention_class = retention_class
        if finished:
            execution.finished_at = datetime.now(timezone.utc)
        return control_plane_repository.update_execution(execution)


executions_service = ExecutionsService()
