from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.models.api import (
    RunAuditRecord,
    RunListItem,
    RunListResponse,
    RunsSummaryResponse,
    SettingsPatchAuditSummary,
)
from app.models.control_plane import ExecutionRecord, RunRecord, RunStatus
from app.models.request_envelope import RequestEnvelope
from app.repositories.control_plane import control_plane_repository
from app.services.card_utils import read_string_value


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

    def list_run_cards(
        self,
        *,
        requested_tool: str | None = None,
        requested_audit_status: str | None = None,
        requested_inspection_surface: str | None = None,
        requested_fallback_category: str | None = None,
        requested_manifest_source_of_truth: str | None = None,
    ) -> RunListResponse:
        run_audits = self._list_settings_patch_run_audits(
            requested_tool=requested_tool,
            requested_audit_status=requested_audit_status,
        )
        runs = self.list_runs_for_audit_status(
            requested_tool=requested_tool,
            requested_audit_status=requested_audit_status,
        )
        preferred_executions_by_run_id = self._preferred_executions_by_run_id()
        workspaces_by_id = {
            workspace.id: workspace for workspace in control_plane_repository.list_workspaces()
        }
        run_audits_by_id = {audit.run_id: audit for audit in run_audits}
        return RunListResponse(
            runs=[
                RunListItem(
                    id=run.id,
                    request_id=run.request_id,
                    agent=run.agent,
                    tool=run.tool,
                    status=run.status.value,
                    dry_run=run.dry_run,
                    execution_mode=run.execution_mode,
                    result_summary=run.result_summary,
                    audit_status=run_audits_by_id.get(run.id).audit_status
                    if run.id in run_audits_by_id
                    else None,
                    audit_summary=run_audits_by_id.get(run.id).audit_summary
                    if run.id in run_audits_by_id
                    else None,
                    inspection_surface=read_string_value(
                        preferred_executions_by_run_id.get(run.id).details
                        if run.id in preferred_executions_by_run_id
                        else None,
                        "inspection_surface",
                    ),
                    fallback_category=read_string_value(
                        preferred_executions_by_run_id.get(run.id).details
                        if run.id in preferred_executions_by_run_id
                        else None,
                        "fallback_category",
                    ),
                    project_manifest_source_of_truth=read_string_value(
                        preferred_executions_by_run_id.get(run.id).details
                        if run.id in preferred_executions_by_run_id
                        else None,
                        "project_manifest_source_of_truth",
                    ),
                    executor_id=preferred_executions_by_run_id.get(run.id).executor_id
                    if run.id in preferred_executions_by_run_id
                    else None,
                    workspace_id=preferred_executions_by_run_id.get(run.id).workspace_id
                    if run.id in preferred_executions_by_run_id
                    else None,
                    workspace_state=workspaces_by_id.get(
                        preferred_executions_by_run_id.get(run.id).workspace_id
                        if run.id in preferred_executions_by_run_id
                        else None
                    ).workspace_state
                    if (
                        run.id in preferred_executions_by_run_id
                        and preferred_executions_by_run_id.get(run.id).workspace_id
                        in workspaces_by_id
                    )
                    else None,
                    runner_family=preferred_executions_by_run_id.get(run.id).runner_family
                    if run.id in preferred_executions_by_run_id
                    else None,
                    execution_attempt_state=preferred_executions_by_run_id.get(
                        run.id
                    ).execution_attempt_state
                    if run.id in preferred_executions_by_run_id
                    else None,
                    backup_class=preferred_executions_by_run_id.get(run.id).backup_class
                    if run.id in preferred_executions_by_run_id
                    else None,
                    rollback_class=preferred_executions_by_run_id.get(run.id).rollback_class
                    if run.id in preferred_executions_by_run_id
                    else None,
                    retention_class=preferred_executions_by_run_id.get(run.id).retention_class
                    if run.id in preferred_executions_by_run_id
                    else None,
                )
                for run in runs
                if self._matches_execution_truth_filters(
                    run_id=run.id,
                    preferred_execution=preferred_executions_by_run_id.get(run.id),
                    requested_inspection_surface=requested_inspection_surface,
                    requested_fallback_category=requested_fallback_category,
                    requested_manifest_source_of_truth=requested_manifest_source_of_truth,
                )
            ]
        )

    def list_runs_for_audit_status(
        self,
        *,
        requested_tool: str | None = None,
        requested_audit_status: str | None = None,
    ) -> list[RunRecord]:
        runs = self.list_runs()
        if requested_tool not in (None, "all"):
            runs = [run for run in runs if run.tool == requested_tool]
        if requested_tool == "settings.patch":
            auditable_runs_by_id = {
                audit.run_id
                for audit in self._list_settings_patch_run_audits(
                    requested_tool=requested_tool,
                    requested_audit_status=requested_audit_status,
                )
            }
            return [run for run in runs if run.id in auditable_runs_by_id]
        if requested_audit_status is None or requested_audit_status == "all":
            return runs

        auditable_runs_by_id = {
            audit.run_id
            for audit in self._list_settings_patch_run_audits(
                requested_tool=requested_tool,
                requested_audit_status=requested_audit_status,
            )
        }
        return [run for run in runs if run.id in auditable_runs_by_id]

    def get_run(self, run_id: str) -> RunRecord | None:
        return control_plane_repository.get_run(run_id)

    def get_runs_summary(
        self,
        *,
        requested_tool: str | None = None,
        requested_audit_status: str | None = None,
    ) -> RunsSummaryResponse:
        if requested_tool not in (None, "all", "settings.patch"):
            return RunsSummaryResponse(
                settings_patch_audit_summary=self._empty_settings_patch_audit_summary(),
                run_audits=[],
            )
        run_audits = self._list_settings_patch_run_audits(
            requested_tool=requested_tool,
            requested_audit_status="all",
        )
        summary = self._summarize_settings_patch_audits(run_audits)
        filtered_run_audits = self._filter_run_audits(
            run_audits=run_audits,
            requested_audit_status=requested_audit_status,
        )

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

    def _empty_settings_patch_audit_summary(self) -> SettingsPatchAuditSummary:
        return SettingsPatchAuditSummary(
            available_filters=[
                "all",
                "preflight",
                "blocked",
                "succeeded",
                "rolled_back",
                "other",
            ]
        )

    def _filter_run_audits(
        self,
        *,
        run_audits: list[RunAuditRecord],
        requested_audit_status: str | None,
    ) -> list[RunAuditRecord]:
        return [
            audit
            for audit in run_audits
            if self._matches_audit_filter(
                audit=audit,
                requested_audit_status=requested_audit_status,
            )
        ]

    def _summarize_settings_patch_audits(
        self,
        run_audits: list[RunAuditRecord],
    ) -> SettingsPatchAuditSummary:
        summary = self._empty_settings_patch_audit_summary()
        for audit in run_audits:
            summary.total_runs += 1
            if audit.audit_status == "preflight":
                summary.preflight += 1
            elif audit.audit_status == "blocked":
                summary.blocked += 1
            elif audit.audit_status == "succeeded":
                summary.succeeded += 1
            elif audit.audit_status == "rolled_back":
                summary.rolled_back += 1
            else:
                summary.other += 1
        return summary

    def _list_settings_patch_run_audits(
        self,
        *,
        requested_tool: str | None,
        requested_audit_status: str | None,
    ) -> list[RunAuditRecord]:
        if requested_tool not in (None, "all", "settings.patch"):
            return []
        runs = self.list_runs()
        executions_by_run_id = {
            execution.run_id: execution
            for execution in control_plane_repository.list_executions()
        }
        run_audits: list[RunAuditRecord] = []
        for run in runs:
            if run.tool != "settings.patch":
                continue
            if requested_tool == "settings.patch" and run.tool != requested_tool:
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
        return self._filter_run_audits(
            run_audits=run_audits,
            requested_audit_status=requested_audit_status,
        )

    def _preferred_executions_by_run_id(self) -> dict[str, ExecutionRecord]:
        preferred_by_run_id: dict[str, ExecutionRecord] = {}
        for execution in control_plane_repository.list_executions():
            preferred = preferred_by_run_id.get(execution.run_id)
            if preferred is None or self._is_preferred_execution_candidate(
                candidate=execution,
                current=preferred,
            ):
                preferred_by_run_id[execution.run_id] = execution
        return preferred_by_run_id

    def _is_preferred_execution_candidate(
        self,
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

    def _matches_execution_truth_filters(
        self,
        *,
        run_id: str,
        preferred_execution: ExecutionRecord | None,
        requested_inspection_surface: str | None,
        requested_fallback_category: str | None,
        requested_manifest_source_of_truth: str | None,
    ) -> bool:
        if not any(
            [
                requested_inspection_surface,
                requested_fallback_category,
                requested_manifest_source_of_truth,
            ]
        ):
            return True

        matching_executions = [
            execution
            for execution in control_plane_repository.list_executions()
            if execution.run_id == run_id
        ]
        if preferred_execution and all(
            execution.id != preferred_execution.id for execution in matching_executions
        ):
            matching_executions.append(preferred_execution)

        for execution in matching_executions:
            if (
                requested_inspection_surface
                and read_string_value(execution.details, "inspection_surface")
                != requested_inspection_surface
            ):
                continue
            if (
                requested_fallback_category
                and read_string_value(execution.details, "fallback_category")
                != requested_fallback_category
            ):
                continue
            if (
                requested_manifest_source_of_truth
                and read_string_value(
                    execution.details,
                    "project_manifest_source_of_truth",
                )
                != requested_manifest_source_of_truth
            ):
                continue
            return True
        return False


runs_service = RunsService()
