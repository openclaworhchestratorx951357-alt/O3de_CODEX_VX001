from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.models.api import RunAuditRecord, RunsSummaryResponse, SettingsPatchAuditSummary
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

    def list_runs_for_audit_status(
        self,
        *,
        requested_audit_status: str | None = None,
    ) -> list[RunRecord]:
        runs = self.list_runs()
        if requested_audit_status is None or requested_audit_status == "all":
            return runs

        auditable_runs_by_id = {
            audit.run_id
            for audit in self.get_runs_summary(
                requested_audit_status=requested_audit_status,
            ).run_audits
        }
        return [run for run in runs if run.id in auditable_runs_by_id]

    def get_run(self, run_id: str) -> RunRecord | None:
        return control_plane_repository.get_run(run_id)

    def get_runs_summary(
        self,
        *,
        requested_audit_status: str | None = None,
    ) -> RunsSummaryResponse:
        runs = self.list_runs()
        executions_by_run_id = {
            execution.run_id: execution
            for execution in control_plane_repository.list_executions()
        }
        run_audits: list[RunAuditRecord] = []
        summary = SettingsPatchAuditSummary(
            available_filters=[
                "all",
                "preflight",
                "blocked",
                "succeeded",
                "rolled_back",
                "other",
            ]
        )

        for run in runs:
            if run.tool != "settings.patch":
                continue
            if run.status in {
                RunStatus.PENDING,
                RunStatus.WAITING_APPROVAL,
                RunStatus.RUNNING,
            }:
                continue
            execution = executions_by_run_id.get(run.id)
            if execution is None:
                continue
            mutation_audit = self._mutation_audit_from_execution(execution.details)
            audit_status = self._audit_status_for_run(run=run, mutation_audit=mutation_audit)
            audit_phase = (
                str(mutation_audit.get("phase")).strip()
                if isinstance(mutation_audit.get("phase"), str)
                else None
            ) if mutation_audit else None
            audit_summary = (
                str(mutation_audit.get("summary")).strip()
                if isinstance(mutation_audit.get("summary"), str)
                else run.result_summary
            ) if mutation_audit else run.result_summary
            run_audits.append(
                RunAuditRecord(
                    run_id=run.id,
                    tool=run.tool,
                    audit_status=audit_status,
                    audit_phase=audit_phase,
                    audit_summary=audit_summary,
                    execution_mode=run.execution_mode,
                )
            )
            summary.total_runs += 1
            if audit_status == "preflight":
                summary.preflight += 1
            elif audit_status == "blocked":
                summary.blocked += 1
            elif audit_status == "succeeded":
                summary.succeeded += 1
            elif audit_status == "rolled_back":
                summary.rolled_back += 1
            else:
                summary.other += 1

        filtered_run_audits = [
            audit
            for audit in run_audits
            if self._matches_audit_filter(
                audit=audit,
                requested_audit_status=requested_audit_status,
            )
        ]

        return RunsSummaryResponse(
            settings_patch_audit_summary=summary,
            run_audits=filtered_run_audits,
        )

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

    def _mutation_audit_from_execution(
        self,
        details: dict[str, Any] | None,
    ) -> dict[str, Any] | None:
        if not isinstance(details, dict):
            return None
        mutation_audit = details.get("mutation_audit")
        if mutation_audit is None or not isinstance(mutation_audit, dict):
            return None
        return mutation_audit

    def _audit_status_for_run(
        self,
        *,
        run: RunRecord,
        mutation_audit: dict[str, Any] | None,
    ) -> str:
        if mutation_audit:
            raw_status = mutation_audit.get("status")
            if isinstance(raw_status, str):
                normalized = raw_status.strip()
                if normalized:
                    return normalized
        if run.execution_mode == "simulated":
            return "other"
        return "other"

    def _matches_audit_filter(
        self,
        *,
        audit: RunAuditRecord,
        requested_audit_status: str | None,
    ) -> bool:
        if requested_audit_status is None or requested_audit_status == "all":
            return True
        return audit.audit_status == requested_audit_status


runs_service = RunsService()
