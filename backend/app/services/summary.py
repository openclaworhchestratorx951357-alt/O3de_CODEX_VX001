from app.models.api import ControlPlaneSummaryResponse
from app.models.control_plane import ExecutionRecord
from app.repositories.control_plane import control_plane_repository
from app.services.prompt_sessions import prompt_sessions_service


def _increment(counter: dict[str, int], key: str) -> None:
    counter[key] = counter.get(key, 0) + 1


def _read_string_value(mapping: dict[str, object], key: str) -> str | None:
    raw_value = mapping.get(key)
    if not isinstance(raw_value, str):
        return None
    normalized = raw_value.strip()
    return normalized or None


def _is_preferred_execution_candidate(
    *,
    candidate: ExecutionRecord,
    current: ExecutionRecord,
) -> bool:
    candidate_finished = candidate.finished_at or candidate.started_at
    current_finished = current.finished_at or current.started_at
    if candidate_finished != current_finished:
        return candidate_finished > current_finished
    if candidate.started_at != current.started_at:
        return candidate.started_at > current.started_at
    return candidate.id > current.id


def _preferred_executions_by_run_id(
    executions: list[ExecutionRecord],
) -> dict[str, ExecutionRecord]:
    preferred_by_run_id: dict[str, ExecutionRecord] = {}
    for execution in executions:
        preferred = preferred_by_run_id.get(execution.run_id)
        if preferred is None or _is_preferred_execution_candidate(
            candidate=execution,
            current=preferred,
        ):
            preferred_by_run_id[execution.run_id] = execution
    return preferred_by_run_id


class ControlPlaneSummaryService:
    def get_summary(self) -> ControlPlaneSummaryResponse:
        prompt_sessions = prompt_sessions_service.list_sessions()
        runs = control_plane_repository.list_runs()
        approvals = control_plane_repository.list_approvals()
        executions = control_plane_repository.list_executions()
        executors = control_plane_repository.list_executors()
        workspaces = control_plane_repository.list_workspaces()
        artifacts = control_plane_repository.list_artifacts()
        events = control_plane_repository.list_events()
        locks = control_plane_repository.list_locks()

        prompt_sessions_by_status: dict[str, int] = {}
        prompt_sessions_waiting_approval = 0
        prompt_sessions_with_real_editor_children = 0
        for session in prompt_sessions:
            _increment(prompt_sessions_by_status, session.status.value)
            if session.status.value == "waiting_approval":
                prompt_sessions_waiting_approval += 1
            if any(
                capability in {
                    "editor.session.open",
                    "editor.level.open",
                    "editor.entity.create",
                }
                for capability in session.admitted_capabilities
            ):
                prompt_sessions_with_real_editor_children += 1

        runs_by_status: dict[str, int] = {}
        runs_by_related_execution_mode: dict[str, int] = {}
        runs_by_inspection_surface: dict[str, int] = {}
        runs_by_fallback_category: dict[str, int] = {}
        runs_by_manifest_source_of_truth: dict[str, int] = {}
        preferred_executions_by_run_id = _preferred_executions_by_run_id(executions)
        for run in runs:
            _increment(runs_by_status, run.status.value)
            preferred_execution = preferred_executions_by_run_id.get(run.id)
            if preferred_execution is None:
                continue
            _increment(runs_by_related_execution_mode, preferred_execution.execution_mode)
            inspection_surface = _read_string_value(
                preferred_execution.details,
                "inspection_surface",
            )
            if inspection_surface:
                _increment(runs_by_inspection_surface, inspection_surface)
            fallback_category = _read_string_value(
                preferred_execution.details,
                "fallback_category",
            )
            if fallback_category:
                _increment(runs_by_fallback_category, fallback_category)
            manifest_source_of_truth = _read_string_value(
                preferred_execution.details,
                "project_manifest_source_of_truth",
            )
            if manifest_source_of_truth:
                _increment(
                    runs_by_manifest_source_of_truth,
                    manifest_source_of_truth,
                )

        executions_by_status: dict[str, int] = {}
        executions_by_mode: dict[str, int] = {}
        executions_by_attempt_state: dict[str, int] = {}
        executions_by_failure_category: dict[str, int] = {}
        executions_by_backup_class: dict[str, int] = {}
        executions_by_rollback_class: dict[str, int] = {}
        executions_by_retention_class: dict[str, int] = {}
        executions_by_inspection_surface: dict[str, int] = {}
        executions_by_fallback_category: dict[str, int] = {}
        executions_by_manifest_source_of_truth: dict[str, int] = {}
        for execution in executions:
            _increment(executions_by_status, execution.status.value)
            _increment(executions_by_mode, execution.execution_mode)
            if execution.execution_attempt_state:
                _increment(
                    executions_by_attempt_state,
                    execution.execution_attempt_state,
                )
            if execution.failure_category:
                _increment(
                    executions_by_failure_category,
                    execution.failure_category,
                )
            if execution.backup_class:
                _increment(executions_by_backup_class, execution.backup_class)
            if execution.rollback_class:
                _increment(executions_by_rollback_class, execution.rollback_class)
            if execution.retention_class:
                _increment(executions_by_retention_class, execution.retention_class)
            inspection_surface = _read_string_value(execution.details, "inspection_surface")
            if inspection_surface:
                _increment(executions_by_inspection_surface, inspection_surface)
            fallback_category = _read_string_value(execution.details, "fallback_category")
            if fallback_category:
                _increment(executions_by_fallback_category, fallback_category)
            manifest_source_of_truth = _read_string_value(
                execution.details,
                "project_manifest_source_of_truth",
            )
            if manifest_source_of_truth:
                _increment(
                    executions_by_manifest_source_of_truth,
                    manifest_source_of_truth,
                )

        executors_by_availability_state: dict[str, int] = {}
        for executor in executors:
            _increment(executors_by_availability_state, executor.availability_state)

        workspaces_by_state: dict[str, int] = {}
        for workspace in workspaces:
            _increment(workspaces_by_state, workspace.workspace_state)

        artifacts_by_mode: dict[str, int] = {}
        artifacts_by_inspection_surface: dict[str, int] = {}
        artifacts_by_fallback_category: dict[str, int] = {}
        artifacts_by_manifest_source_of_truth: dict[str, int] = {}
        for artifact in artifacts:
            execution_mode = str(artifact.metadata.get("execution_mode", "")).strip()
            if not execution_mode:
                execution_mode = "simulated" if artifact.simulated else "unknown"
            _increment(artifacts_by_mode, execution_mode)
            inspection_surface = _read_string_value(artifact.metadata, "inspection_surface")
            if inspection_surface:
                _increment(artifacts_by_inspection_surface, inspection_surface)
            fallback_category = _read_string_value(artifact.metadata, "fallback_category")
            if fallback_category:
                _increment(artifacts_by_fallback_category, fallback_category)
            manifest_source_of_truth = _read_string_value(
                artifact.metadata,
                "project_manifest_source_of_truth",
            )
            if manifest_source_of_truth:
                _increment(
                    artifacts_by_manifest_source_of_truth,
                    manifest_source_of_truth,
                )

        events_by_severity: dict[str, int] = {}
        active_events = 0
        for event in events:
            _increment(events_by_severity, event.severity.value)
            if event.severity.value in {"warning", "error"}:
                active_events += 1

        approvals_pending = sum(1 for approval in approvals if approval.status.value == "pending")

        return ControlPlaneSummaryResponse(
            prompt_sessions_total=len(prompt_sessions),
            prompt_sessions_by_status=prompt_sessions_by_status,
            prompt_sessions_waiting_approval=prompt_sessions_waiting_approval,
            prompt_sessions_with_real_editor_children=prompt_sessions_with_real_editor_children,
            runs_total=len(runs),
            runs_by_status=runs_by_status,
            runs_by_related_execution_mode=runs_by_related_execution_mode,
            runs_by_inspection_surface=runs_by_inspection_surface,
            runs_by_fallback_category=runs_by_fallback_category,
            runs_by_manifest_source_of_truth=runs_by_manifest_source_of_truth,
            approvals_total=len(approvals),
            approvals_pending=approvals_pending,
            approvals_decided=len(approvals) - approvals_pending,
            executions_total=len(executions),
            executions_by_status=executions_by_status,
            executions_by_mode=executions_by_mode,
            executions_by_attempt_state=executions_by_attempt_state,
            executions_by_failure_category=executions_by_failure_category,
            executions_by_backup_class=executions_by_backup_class,
            executions_by_rollback_class=executions_by_rollback_class,
            executions_by_retention_class=executions_by_retention_class,
            executions_by_inspection_surface=executions_by_inspection_surface,
            executions_by_fallback_category=executions_by_fallback_category,
            executions_by_manifest_source_of_truth=executions_by_manifest_source_of_truth,
            executors_total=len(executors),
            executors_by_availability_state=executors_by_availability_state,
            workspaces_total=len(workspaces),
            workspaces_by_state=workspaces_by_state,
            artifacts_total=len(artifacts),
            artifacts_by_mode=artifacts_by_mode,
            artifacts_by_inspection_surface=artifacts_by_inspection_surface,
            artifacts_by_fallback_category=artifacts_by_fallback_category,
            artifacts_by_manifest_source_of_truth=artifacts_by_manifest_source_of_truth,
            events_total=len(events),
            active_events=active_events,
            events_by_severity=events_by_severity,
            locks_total=len(locks),
        )


control_plane_summary_service = ControlPlaneSummaryService()
