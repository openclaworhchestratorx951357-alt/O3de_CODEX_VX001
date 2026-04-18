from datetime import datetime, timezone
from uuid import uuid4

from app.models.control_plane import RunRecord, RunStatus
from app.models.request_envelope import RequestEnvelope
from app.repositories.control_plane import control_plane_repository


class RunsService:
    def create_run(
        self,
        request: RequestEnvelope,
        *,
        requested_locks: list[str],
        execution_mode: str,
    ) -> RunRecord:
        run = RunRecord(
            id=f"run-{uuid4().hex[:12]}",
            request_id=request.request_id,
            agent=request.agent,
            tool=request.tool,
            status=RunStatus.PENDING,
            dry_run=request.dry_run,
            requested_locks=requested_locks,
            execution_mode=execution_mode,
        )
        return control_plane_repository.create_run(run)

    def list_runs(self) -> list[RunRecord]:
        return control_plane_repository.list_runs()

    def get_run(self, run_id: str) -> RunRecord | None:
        return control_plane_repository.get_run(run_id)

    def update_run(
        self,
        run_id: str,
        *,
        status: RunStatus | None = None,
        approval_id: str | None = None,
        approval_token: str | None = None,
        granted_locks: list[str] | None = None,
        warnings: list[str] | None = None,
        result_summary: str | None = None,
    ) -> RunRecord:
        run = self.get_run(run_id)
        if run is None:
            raise KeyError(run_id)
        if status is not None:
            run.status = status
        if approval_id is not None:
            run.approval_id = approval_id
        if approval_token is not None:
            run.approval_token = approval_token
        if granted_locks is not None:
            run.granted_locks = granted_locks
        if warnings is not None:
            run.warnings = warnings
        if result_summary is not None:
            run.result_summary = result_summary
        run.updated_at = datetime.now(timezone.utc)
        return control_plane_repository.update_run(run)


runs_service = RunsService()
