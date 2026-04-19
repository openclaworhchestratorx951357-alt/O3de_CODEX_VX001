from app.models.api import ControlPlaneSummaryResponse
from app.repositories.control_plane import control_plane_repository


def _increment(counter: dict[str, int], key: str) -> None:
    counter[key] = counter.get(key, 0) + 1


class ControlPlaneSummaryService:
    def get_summary(self) -> ControlPlaneSummaryResponse:
        runs = control_plane_repository.list_runs()
        approvals = control_plane_repository.list_approvals()
        executions = control_plane_repository.list_executions()
        artifacts = control_plane_repository.list_artifacts()
        events = control_plane_repository.list_events()
        locks = control_plane_repository.list_locks()

        runs_by_status: dict[str, int] = {}
        for run in runs:
            _increment(runs_by_status, run.status.value)

        executions_by_status: dict[str, int] = {}
        executions_by_mode: dict[str, int] = {}
        for execution in executions:
            _increment(executions_by_status, execution.status.value)
            _increment(executions_by_mode, execution.execution_mode)

        artifacts_by_mode: dict[str, int] = {}
        for artifact in artifacts:
            execution_mode = str(artifact.metadata.get("execution_mode", "")).strip()
            if not execution_mode:
                execution_mode = "simulated" if artifact.simulated else "unknown"
            _increment(artifacts_by_mode, execution_mode)

        events_by_severity: dict[str, int] = {}
        active_events = 0
        for event in events:
            _increment(events_by_severity, event.severity.value)
            if event.severity.value in {"warning", "error"}:
                active_events += 1

        approvals_pending = sum(1 for approval in approvals if approval.status.value == "pending")

        return ControlPlaneSummaryResponse(
            runs_total=len(runs),
            runs_by_status=runs_by_status,
            approvals_total=len(approvals),
            approvals_pending=approvals_pending,
            approvals_decided=len(approvals) - approvals_pending,
            executions_total=len(executions),
            executions_by_status=executions_by_status,
            executions_by_mode=executions_by_mode,
            artifacts_total=len(artifacts),
            artifacts_by_mode=artifacts_by_mode,
            events_total=len(events),
            active_events=active_events,
            events_by_severity=events_by_severity,
            locks_total=len(locks),
        )


control_plane_summary_service = ControlPlaneSummaryService()
