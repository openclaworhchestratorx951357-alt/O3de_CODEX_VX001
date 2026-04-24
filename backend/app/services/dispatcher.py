from datetime import datetime, timezone
from pathlib import Path
from app.models.control_plane import (
    ApprovalStatus,
    EventSeverity,
    ExecutorRecord,
    ExecutionStatus,
    RunStatus,
    WorkspaceRecord,
)
from app.models.request_envelope import RequestEnvelope
from app.models.response_envelope import ResponseEnvelope, ResponseError
from app.services.adapters import (
    AdapterConfigurationError,
    AdapterExecutionRejected,
    adapter_service,
)
from app.services.approvals import approvals_service
from app.services.artifacts import artifacts_service
from app.services.capability_registry import capability_registry_service
from app.services.catalog import catalog_service
from app.services.events import events_service
from app.services.executions import executions_service
from app.services.executors import executors_service
from app.services.locks import locks_service
from app.services.policy import policy_service
from app.services.runs import runs_service
from app.services.schema_validation import schema_validation_service
from app.services.workspaces import workspaces_service


class DispatcherService:
    """Control-plane dispatch service with real prechecks and bookkeeping.

    This service creates run records, performs policy and approval checks,
    enforces in-memory locks, records events, and clearly labels execution as
    simulated unless a narrow real adapter path is explicitly available.
    """

    def dispatch(self, request: RequestEnvelope) -> ResponseEnvelope:
        adapter_status = adapter_service.get_runtime_status()
        requested_locks = self._merge_locks(request, agent=request.agent, tool=request.tool)
        run = runs_service.create_run(
            request,
            requested_locks=requested_locks,
            execution_mode=adapter_status.active_mode,
        )
        execution = executions_service.create_execution(
            run_id=run.id,
            request_id=request.request_id,
            agent=request.agent,
            tool=request.tool,
            execution_mode=adapter_status.active_mode,
            status=ExecutionStatus.PENDING,
            executor_id=request.executor_id,
            workspace_id=request.workspace_id,
            details=self._with_prompt_safety(
                tool_name=request.tool,
                payload={
                    "requested_locks": requested_locks,
                    "adapter_family": request.agent,
                    "adapter_contract_version": adapter_status.contract_version,
                    "execution_boundary": adapter_status.execution_boundary,
                    "requested_workspace_id": request.workspace_id,
                    "requested_executor_id": request.executor_id,
                },
            ),
            logs=["Dispatch request received."],
            result_summary="Execution record opened for this dispatch attempt.",
        )
        events_service.record(
            category="dispatch",
            severity=EventSeverity.INFO,
            message="Dispatch request received.",
            run_id=run.id,
            details={"agent": request.agent, "tool": request.tool},
        )

        if not catalog_service.is_allowed_agent(request.agent):
            runs_service.update_run(
                run.id,
                status=RunStatus.FAILED,
                result_summary="Rejected due to unknown agent.",
            )
            executions_service.update_execution(
                execution.id,
                status=ExecutionStatus.FAILED,
                logs=["Rejected request for unknown agent."],
                result_summary="Rejected due to unknown agent.",
                finished=True,
            )
            events_service.record(
                category="dispatch",
                severity=EventSeverity.ERROR,
                message=f"Unknown agent '{request.agent}'.",
                run_id=run.id,
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run.id,
                error=ResponseError(
                    code="INVALID_AGENT",
                    message=f"Unknown agent '{request.agent}'.",
                    retryable=False,
                    details={"agent": request.agent},
                ),
                warnings=["Dispatch rejected before execution."],
                logs=[f"Rejected request for unknown agent '{request.agent}'."],
            )

        if not catalog_service.is_allowed_tool_for_agent(request.agent, request.tool):
            runs_service.update_run(
                run.id,
                status=RunStatus.FAILED,
                result_summary="Rejected due to invalid tool/agent pairing.",
            )
            executions_service.update_execution(
                execution.id,
                status=ExecutionStatus.FAILED,
                logs=["Rejected due to invalid tool/agent pairing."],
                result_summary="Rejected due to invalid tool/agent pairing.",
                finished=True,
            )
            events_service.record(
                category="dispatch",
                severity=EventSeverity.ERROR,
                message=f"Tool '{request.tool}' is not registered for agent '{request.agent}'.",
                run_id=run.id,
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run.id,
                error=ResponseError(
                    code="INVALID_TOOL",
                    message=(
                        f"Tool '{request.tool}' is not registered for agent "
                        f"'{request.agent}'."
                    ),
                    retryable=False,
                    details={"agent": request.agent, "tool": request.tool},
                ),
                warnings=["Dispatch rejected before execution."],
                logs=[
                    f"Rejected tool '{request.tool}' for agent '{request.agent}'."
                ],
            )

        policy = policy_service.get_policy(request.agent, request.tool)
        if policy is None:
            runs_service.update_run(
                run.id,
                status=RunStatus.FAILED,
                result_summary="Rejected because no tool policy was found.",
            )
            executions_service.update_execution(
                execution.id,
                status=ExecutionStatus.FAILED,
                logs=["Missing tool policy definition."],
                result_summary="Rejected because no tool policy was found.",
                finished=True,
            )
            events_service.record(
                category="policy",
                severity=EventSeverity.ERROR,
                message="No tool policy found for dispatch target.",
                run_id=run.id,
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run.id,
                error=ResponseError(
                    code="UNSUPPORTED",
                    message="No tool policy is available for the requested tool.",
                    retryable=False,
                    details={"agent": request.agent, "tool": request.tool},
                ),
                warnings=["Dispatch rejected before tool execution."],
                logs=["Missing tool policy definition."],
            )
        capability_status = policy.capability_status

        if not adapter_status.ready:
            runs_service.update_run(
                run.id,
                status=RunStatus.FAILED,
                result_summary="Rejected because the configured adapter mode is not ready.",
            )
            executions_service.update_execution(
                execution.id,
                status=ExecutionStatus.FAILED,
                logs=["Configured adapter mode is not ready."],
                details=self._with_prompt_safety(
                    tool_name=request.tool,
                    payload={
                        "configured_mode": adapter_status.configured_mode,
                        "adapter_family": policy.adapter_family,
                        "adapter_contract_version": adapter_status.contract_version,
                        "execution_boundary": adapter_status.execution_boundary,
                    },
                ),
                result_summary="Rejected because the configured adapter mode is not ready.",
                finished=True,
            )
            events_service.record(
                category="adapter",
                severity=EventSeverity.ERROR,
                message=(
                    f"{self._capability_message_prefix(request)} rejected because the "
                    "configured adapter mode is not ready."
                ),
                run_id=run.id,
                details={
                    "configured_mode": adapter_status.configured_mode,
                    "capability_status": capability_status,
                },
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run.id,
                error=ResponseError(
                    code="ADAPTER_NOT_READY",
                    message=adapter_status.warning
                    or "Configured adapter mode is not currently available.",
                    retryable=False,
                    details={
                        "configured_mode": adapter_status.configured_mode,
                        "active_mode": adapter_status.active_mode,
                    },
                ),
                warnings=["Dispatch rejected before adapter execution."],
                logs=["Configured adapter mode is not ready."],
            )

        validation_errors = schema_validation_service.validate_tool_args(
            schema_ref=policy.args_schema,
            payload=request.args,
        )
        if validation_errors:
            return self._reject_invalid_args(
                request=request,
                run_id=run.id,
                execution_id=execution.id,
                schema_ref=policy.args_schema,
                validation_errors=validation_errors,
            )

        approval_problem = self._check_approval(
            request,
            run.id,
            execution.id,
            policy.approval_class,
        )
        if approval_problem is not None:
            return approval_problem

        conflicts = locks_service.get_conflicts(requested_locks, owner_run_id=run.id)
        if conflicts:
            serialized_conflicts = [lock.model_dump(mode="json") for lock in conflicts]
            runs_service.update_run(
                run.id,
                status=RunStatus.BLOCKED,
                result_summary="Blocked by an active lock.",
            )
            executions_service.update_execution(
                execution.id,
                status=ExecutionStatus.BLOCKED,
                logs=[f"Blocked by locks: {', '.join(lock.name for lock in conflicts)}."],
                details=self._with_prompt_safety(
                    tool_name=request.tool,
                    payload={"conflicts": serialized_conflicts},
                ),
                result_summary="Blocked by an active lock.",
                finished=True,
            )
            events_service.record(
                category="locks",
                severity=EventSeverity.WARNING,
                message=(
                    f"{self._capability_message_prefix(request)} blocked by an active lock."
                ),
                run_id=run.id,
                details={
                    "locks": ", ".join(lock.name for lock in conflicts),
                    "capability_status": capability_status,
                },
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run.id,
                error=ResponseError(
                    code="STATE_LOCKED",
                    message="Requested lock is already held by another run.",
                    retryable=True,
                    details={"conflicts": serialized_conflicts},
                ),
                warnings=["Dispatch blocked before tool execution."],
                logs=[
                    f"Run blocked by locks: {', '.join(lock.name for lock in conflicts)}."
                ],
            )

        acquired_locks = locks_service.acquire(requested_locks, owner_run_id=run.id)
        acquired_lock_summary = ", ".join(lock.name for lock in acquired_locks) or "none"
        runs_service.update_run(
            run.id,
            status=RunStatus.RUNNING,
            granted_locks=[lock.name for lock in acquired_locks],
            warnings=adapter_status.notes,
        )
        try:
            adapter_report = adapter_service.execute(
                request_id=request.request_id,
                session_id=request.session_id,
                workspace_id=request.workspace_id,
                executor_id=request.executor_id,
                tool=request.tool,
                agent=request.agent,
                project_root=request.project_root,
                engine_root=request.engine_root,
                dry_run=request.dry_run,
                args=request.args,
                approval_class=policy.approval_class,
                locks_acquired=[lock.name for lock in acquired_locks],
            )
        except AdapterConfigurationError as exc:
            locks_service.release(run.id)
            runs_service.update_run(
                run.id,
                status=RunStatus.FAILED,
                result_summary="Adapter execution could not start with the current configuration.",
            )
            executions_service.update_execution(
                execution.id,
                status=ExecutionStatus.FAILED,
                warnings=adapter_status.notes,
                logs=["Control-plane prechecks passed.", str(exc)],
                details=self._with_prompt_safety(
                    tool_name=request.tool,
                    payload={
                        "requested_locks": requested_locks,
                        "granted_locks": [lock.name for lock in acquired_locks],
                        "configured_mode": adapter_status.configured_mode,
                        "adapter_family": policy.adapter_family,
                        "adapter_contract_version": adapter_status.contract_version,
                        "execution_boundary": adapter_status.execution_boundary,
                    },
                ),
                result_summary="Adapter execution could not start with the current configuration.",
                finished=True,
            )
            events_service.record(
                category="adapter",
                severity=EventSeverity.ERROR,
                message=(
                    f"{self._capability_message_prefix(request)} failed because adapter execution "
                    "could not start."
                ),
                run_id=run.id,
                details={
                    "configured_mode": adapter_status.configured_mode,
                    "capability_status": capability_status,
                },
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run.id,
                error=ResponseError(
                    code="ADAPTER_NOT_READY",
                    message=str(exc),
                    retryable=False,
                    details={
                        "configured_mode": adapter_status.configured_mode,
                        "active_mode": adapter_status.active_mode,
                    },
                ),
                warnings=["Dispatch failed before adapter execution could begin."],
                logs=["Control-plane prechecks passed.", str(exc)],
            )
        except AdapterExecutionRejected as exc:
            locks_service.release(run.id)
            result_summary = "Adapter preflight rejected execution before completion."
            runs_service.update_run(
                run.id,
                status=RunStatus.FAILED,
                result_summary=result_summary,
            )
            executions_service.update_execution(
                execution.id,
                status=ExecutionStatus.FAILED,
                warnings=exc.warnings,
                logs=["Control-plane prechecks passed.", *exc.logs],
                details=self._with_prompt_safety(
                    tool_name=request.tool,
                    payload={
                        "requested_locks": requested_locks,
                        "granted_locks": [lock.name for lock in acquired_locks],
                        **exc.details,
                    },
                ),
                result_summary=result_summary,
                finished=True,
            )
            events_service.record(
                category="adapter",
                severity=EventSeverity.ERROR,
                message=(
                    f"{self._capability_message_prefix(request)} rejected execution "
                    "during real preflight."
                ),
                run_id=run.id,
                details={
                    "configured_mode": adapter_status.configured_mode,
                    "capability_status": capability_status,
                },
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run.id,
                error=ResponseError(
                    code="ADAPTER_PRECHECK_FAILED",
                    message=str(exc),
                    retryable=False,
                    details=exc.details,
                ),
                warnings=[
                    "Dispatch was rejected during adapter preflight before any "
                    "mutation-capable step ran.",
                    *exc.warnings,
                ],
                logs=["Control-plane prechecks passed.", *exc.logs],
            )

        running_execution_details = self._with_prompt_safety(
            tool_name=request.tool,
            payload={
                "requested_locks": requested_locks,
                "granted_locks": [lock.name for lock in acquired_locks],
                "requested_workspace_id": request.workspace_id,
                "requested_executor_id": request.executor_id,
                **adapter_report.execution_details,
            },
        )
        executions_service.update_execution(
            execution.id,
            status=ExecutionStatus.RUNNING,
            warnings=adapter_report.warnings,
            logs=["Control-plane prechecks passed.", f"Acquired locks: {acquired_lock_summary}."],
            details=running_execution_details,
            result_summary="Adapter execution started.",
        )
        events_service.record(
            category="locks",
            severity=EventSeverity.INFO,
            message=f"{self._capability_message_prefix(request)} acquired required locks.",
            run_id=run.id,
            details={
                "locks": acquired_lock_summary,
                "capability_status": capability_status,
            },
        )

        result = adapter_report.result
        result_validation_errors = schema_validation_service.validate_tool_result(
            schema_ref=policy.result_schema,
            payload=result.model_dump(),
        )
        if result_validation_errors:
            locks_service.release(run.id)
            return self._reject_invalid_result(
                request=request,
                run_id=run.id,
                execution_id=execution.id,
                schema_ref=policy.result_schema,
                validation_errors=result_validation_errors,
            )

        persisted_execution_validation_errors = (
            schema_validation_service.validate_execution_details(
                tool_name=request.tool,
                payload=adapter_report.execution_details,
            )
        )
        if persisted_execution_validation_errors:
            locks_service.release(run.id)
            execution_schema_ref = schema_validation_service.get_persisted_schema_ref(
                tool_name=request.tool,
                schema_kind="execution-details",
            )
            return self._reject_invalid_persisted_payload(
                request=request,
                run_id=run.id,
                execution_id=execution.id,
                schema_ref=execution_schema_ref
                or f"schemas/tools/{request.tool}.execution-details.schema.json",
                validation_errors=persisted_execution_validation_errors,
                payload_kind="execution details",
            )

        persisted_artifact_validation_errors = (
            schema_validation_service.validate_artifact_metadata(
                tool_name=request.tool,
                payload=adapter_report.artifact_metadata,
            )
        )
        if persisted_artifact_validation_errors:
            locks_service.release(run.id)
            artifact_schema_ref = schema_validation_service.get_persisted_schema_ref(
                tool_name=request.tool,
                schema_kind="artifact-metadata",
            )
            return self._reject_invalid_persisted_payload(
                request=request,
                run_id=run.id,
                execution_id=execution.id,
                schema_ref=artifact_schema_ref
                or f"schemas/tools/{request.tool}.artifact-metadata.schema.json",
                validation_errors=persisted_artifact_validation_errors,
                payload_kind="artifact metadata",
            )

        substrate_assignment = self._persist_substrate_assignment(
            request=request,
            run_id=run.id,
            execution_id=execution.id,
            adapter_report=adapter_report,
        )
        resolved_executor_id = (
            substrate_assignment["executor_id"] or request.executor_id
        )
        resolved_workspace_id = (
            substrate_assignment["workspace_id"] or request.workspace_id
        )
        artifact = artifacts_service.create_artifact(
            run_id=run.id,
            execution_id=execution.id,
            label=adapter_report.artifact_label,
            kind=adapter_report.artifact_kind,
            uri=adapter_report.artifact_uri.format(run_id=run.id, execution_id=execution.id),
            content_type="application/json",
            simulated=result.simulated,
            metadata=self._with_prompt_safety(
                tool_name=request.tool,
                payload={
                    **adapter_report.artifact_metadata,
                    "requested_workspace_id": request.workspace_id,
                    "requested_executor_id": request.executor_id,
                },
            ),
            artifact_role=substrate_assignment["artifact_role"],
            executor_id=resolved_executor_id,
            workspace_id=resolved_workspace_id,
            retention_class=substrate_assignment["retention_class"],
            evidence_completeness=substrate_assignment["evidence_completeness"],
        )

        locks_service.release(run.id)
        runs_service.update_run(
            run.id,
            status=RunStatus.SUCCEEDED,
            result_summary=adapter_report.result_summary,
        )
        succeeded_execution_details = self._with_prompt_safety(
            tool_name=request.tool,
            payload={
                "result": result.model_dump(),
                "artifact_id": artifact.id,
                "requested_workspace_id": request.workspace_id,
                "requested_executor_id": request.executor_id,
                **adapter_report.execution_details,
            },
        )
        executions_service.update_execution(
            execution.id,
            status=ExecutionStatus.SUCCEEDED,
            warnings=adapter_report.warnings,
            logs=adapter_report.logs,
            artifact_ids=[artifact.id],
            details=succeeded_execution_details,
            result_summary=adapter_report.result_summary,
            finished=True,
            executor_id=resolved_executor_id,
            workspace_id=resolved_workspace_id,
            runner_family=substrate_assignment["runner_family"],
            execution_attempt_state=substrate_assignment["execution_attempt_state"],
            backup_class=substrate_assignment["backup_class"],
            rollback_class=substrate_assignment["rollback_class"],
            retention_class=substrate_assignment["retention_class"],
        )
        events_service.record(
            category="dispatch",
            severity=EventSeverity.INFO,
            message=(
                f"{self._capability_message_prefix(request)} completed: "
                f"{adapter_report.result_summary}"
            ),
            run_id=run.id,
            details={
                "tool": request.tool,
                "adapter_mode": adapter_report.execution_mode,
                "capability_status": capability_status,
            },
        )

        result_warning = self._result_warning(request, result)
        return ResponseEnvelope(
            request_id=request.request_id,
            ok=True,
            operation_id=run.id,
            result=result,
            warnings=[
                "Control-plane bookkeeping is real for this run.",
                result_warning,
            ],
            artifacts=[artifact.id],
            logs=[
                f"Dispatch requested for tool '{request.tool}'.",
                (
                    f"Agent '{request.agent}' requested locks: "
                    f"{', '.join(requested_locks) if requested_locks else 'none'}."
                ),
            ],
        )

    def _merge_locks(
        self,
        request: RequestEnvelope,
        *,
        agent: str,
        tool: str,
    ) -> list[str]:
        policy = policy_service.get_policy(agent, tool)
        combined: list[str] = []
        seen: set[str] = set()
        for lock_name in (policy.required_locks if policy is not None else []) + request.locks:
            if lock_name and lock_name not in seen:
                combined.append(lock_name)
                seen.add(lock_name)
        return combined

    def _persist_substrate_assignment(
        self,
        *,
        request: RequestEnvelope,
        run_id: str,
        execution_id: str,
        adapter_report,
    ) -> dict[str, str | None]:
        if adapter_report.execution_mode != "real":
            return {
                "executor_id": None,
                "workspace_id": None,
                "runner_family": None,
                "execution_attempt_state": None,
                "artifact_role": None,
                "retention_class": None,
                "evidence_completeness": None,
                "backup_class": None,
                "rollback_class": None,
            }

        inspection_surface = adapter_report.execution_details.get("inspection_surface")
        resolved_project_root = Path(request.project_root).expanduser().resolve()
        resolved_engine_root = Path(request.engine_root).expanduser().resolve()
        if request.tool == "project.inspect" and inspection_surface == "project_manifest":
            executor_id = "executor-project-build-hybrid-readonly-local"
            executor_kind = "local-admitted-readonly"
            executor_label = "Admitted local read-only substrate executor"
            executor_host_label = "local-project-manifest"
            workspace_kind = "admitted-readonly-project-root"
            cleanup_policy = "operator-managed-readonly"
            artifact_role = "inspection-evidence"
            evidence_completeness = "inspection-backed"
            execution_boundary = "read-only local manifest inspection"
            workspace_id = f"workspace-project-inspect-{execution_id}"
            admitted_tools = ["project.inspect", "build.configure", "build.compile"]
            backup_class = None
            rollback_class = None
        elif (
            request.tool == "asset.processor.status"
            and inspection_surface == "asset_processor_runtime"
        ):
            executor_id = "executor-asset-pipeline-hybrid-readonly-host"
            executor_kind = "local-admitted-readonly"
            executor_label = "Admitted host runtime status executor"
            executor_host_label = "local-host-process-visibility"
            workspace_kind = "admitted-readonly-host-runtime"
            cleanup_policy = "operator-managed-readonly"
            artifact_role = "inspection-evidence"
            evidence_completeness = "inspection-backed"
            execution_boundary = "read-only host Asset Processor runtime inspection"
            workspace_id = f"workspace-asset-processor-status-{execution_id}"
            admitted_tools = ["asset.processor.status"]
            backup_class = None
            rollback_class = None
        elif request.tool == "asset.source.inspect" and inspection_surface == "asset_source_file":
            executor_id = "executor-asset-pipeline-hybrid-readonly-local"
            executor_kind = "local-admitted-readonly"
            executor_label = "Admitted local asset inspection executor"
            executor_host_label = "local-project-asset-filesystem"
            workspace_kind = "admitted-readonly-project-root"
            cleanup_policy = "operator-managed-readonly"
            artifact_role = "inspection-evidence"
            evidence_completeness = "inspection-backed"
            execution_boundary = "read-only local source asset inspection"
            workspace_id = f"workspace-asset-source-inspect-{execution_id}"
            admitted_tools = ["asset.source.inspect"]
            backup_class = None
            rollback_class = None
        elif (
            request.tool == "build.configure"
            and inspection_surface == "build_configure_preflight"
        ):
            executor_id = "executor-project-build-hybrid-readonly-local"
            executor_kind = "local-admitted-readonly"
            executor_label = "Admitted local read-only substrate executor"
            executor_host_label = "local-project-manifest"
            workspace_kind = "admitted-plan-only-project-root"
            cleanup_policy = "operator-managed-preflight"
            artifact_role = "plan-evidence"
            evidence_completeness = "plan-backed"
            execution_boundary = "plan-only local configure preflight"
            workspace_id = f"workspace-build-configure-{execution_id}"
            admitted_tools = ["project.inspect", "build.configure", "build.compile"]
            backup_class = None
            rollback_class = None
        elif (
            request.tool == "build.compile"
            and inspection_surface == "build_compile_preflight"
        ):
            executor_id = "executor-project-build-hybrid-readonly-local"
            executor_kind = "local-admitted-readonly"
            executor_label = "Admitted local read-only substrate executor"
            executor_host_label = "local-project-manifest"
            workspace_kind = "admitted-plan-only-project-root"
            cleanup_policy = "operator-managed-preflight"
            artifact_role = "plan-evidence"
            evidence_completeness = "plan-backed"
            execution_boundary = "plan-only local compile preflight"
            workspace_id = f"workspace-build-compile-{execution_id}"
            admitted_tools = ["project.inspect", "build.configure", "build.compile"]
            backup_class = None
            rollback_class = None
        elif request.tool == "settings.patch" and inspection_surface in {
            "settings_patch_preflight",
            "settings_patch_mutation",
        }:
            executor_id = "executor-project-build-hybrid-mutation-gated-local"
            executor_kind = "local-admitted-mutation-gated"
            executor_label = "Admitted local mutation-gated substrate executor"
            executor_host_label = "local-project-manifest-mutation"
            workspace_kind = "admitted-mutation-gated-project-root"
            cleanup_policy = "operator-managed-backup-rollback"
            artifact_role = (
                "mutation-evidence"
                if inspection_surface == "settings_patch_mutation"
                else "mutation-preflight-evidence"
            )
            evidence_completeness = (
                "mutation-backed"
                if inspection_surface == "settings_patch_mutation"
                else "backup-and-plan-backed"
            )
            execution_boundary = (
                "mutation-gated local manifest patch with backup and rollback boundary"
            )
            workspace_id = f"workspace-settings-patch-{execution_id}"
            admitted_tools = ["settings.patch"]
            backup_class = "project-manifest-backup"
            rollback_class = "project-manifest-restore"
        elif request.tool in {
            "editor.session.open",
            "editor.level.open",
            "editor.entity.create",
            "editor.component.add",
            "editor.component.property.get",
        } and inspection_surface in {
            "editor_session_runtime",
            "editor_level_opened",
            "editor_level_created",
            "editor_entity_created",
            "editor_component_added",
            "editor_component_property_read",
        }:
            executor_id = "executor-editor-control-real-local"
            executor_kind = "local-admitted-editor-authoring"
            executor_label = "Admitted local editor automation executor"
            executor_host_label = "local-editor-python-bindings"
            workspace_kind = "admitted-editor-session-project-root"
            cleanup_policy = "operator-managed-editor-session"
            artifact_role = "editor-automation-evidence"
            evidence_completeness = "editor-runtime-backed"
            execution_boundary = (
                "real editor automation through runtime-owned Python Editor Bindings scripts"
            )
            workspace_id = f"workspace-editor-{resolved_project_root.name.lower()}"
            admitted_tools = [
                "editor.session.open",
                "editor.level.open",
                "editor.entity.create",
                "editor.component.add",
                "editor.component.property.get",
            ]
            backup_class = (
                "loaded-level-restore-boundary"
                if request.tool in {"editor.entity.create", "editor.component.add"}
                and adapter_report.execution_details.get("restore_boundary_created") is True
                else None
            )
            rollback_class = (
                "loaded-level-restore"
                if request.tool in {"editor.entity.create", "editor.component.add"}
                and adapter_report.execution_details.get("restore_boundary_available") is True
                else None
            )
        else:
            return {
                "executor_id": None,
                "workspace_id": None,
                "runner_family": None,
                "execution_attempt_state": None,
                "artifact_role": None,
                "retention_class": None,
                "evidence_completeness": None,
                "backup_class": None,
                "rollback_class": None,
            }

        now = datetime.now(timezone.utc)
        runner_family = (
            "editor-python-bindings"
            if request.tool.startswith("editor.")
            and inspection_surface
            in {
                "editor_session_runtime",
                "editor_level_opened",
                "editor_level_created",
                "editor_entity_created",
                "editor_component_added",
                "editor_component_property_read",
            }
            else "cli"
        )

        executors_service.upsert_executor(
            ExecutorRecord(
                id=executor_id,
                executor_kind=executor_kind,
                executor_label=executor_label,
                executor_host_label=executor_host_label,
                execution_mode_class="real",
                availability_state="available",
                supported_runner_families=[runner_family],
                capability_snapshot={
                    "admitted_tools": admitted_tools,
                    "execution_boundary": execution_boundary,
                    "engine_root": str(resolved_engine_root),
                },
                last_heartbeat_at=now,
                last_failure_summary=None,
                created_at=now,
                updated_at=now,
            )
        )
        workspaces_service.upsert_workspace(
            WorkspaceRecord(
                id=workspace_id,
                workspace_kind=workspace_kind,
                workspace_root=str(resolved_project_root),
                workspace_state="ready",
                cleanup_policy=cleanup_policy,
                retention_class="operator-configured",
                engine_binding={"engine_root": str(resolved_engine_root)},
                project_binding={"project_root": str(resolved_project_root)},
                runner_family=runner_family,
                owner_run_id=run_id,
                owner_execution_id=execution_id,
                owner_executor_id=executor_id,
                created_at=now,
                activated_at=now,
                completed_at=now,
                last_failure_summary=None,
            )
        )
        return {
            "executor_id": executor_id,
            "workspace_id": workspace_id,
            "runner_family": runner_family,
            "execution_attempt_state": "completed",
            "artifact_role": artifact_role,
            "retention_class": "operator-configured",
            "evidence_completeness": evidence_completeness,
            "backup_class": backup_class,
            "rollback_class": rollback_class,
        }

    def _check_approval(
        self,
        request: RequestEnvelope,
        run_id: str,
        execution_id: str,
        approval_class: str,
    ) -> ResponseEnvelope | None:
        if approval_class == "read_only":
            return None

        if not request.approval_token:
            approval = approvals_service.create_approval(
                run_id=run_id,
                request_id=request.request_id,
                agent=request.agent,
                tool=request.tool,
                approval_class=approval_class,
                reason="Mutating or execution-oriented tool requires approval.",
            )
            runs_service.update_run(
                run_id,
                status=RunStatus.WAITING_APPROVAL,
                approval_id=approval.id,
                approval_token=approval.token,
                result_summary="Waiting for approval before tool execution.",
            )
            executions_service.update_execution(
                execution_id,
                status=ExecutionStatus.WAITING_APPROVAL,
                logs=["Waiting for explicit approval before tool execution."],
                details=self._with_prompt_safety(
                    tool_name=request.tool,
                    payload={"approval_class": approval_class},
                ),
                result_summary="Waiting for approval before tool execution.",
                finished=True,
            )
            events_service.record(
                category="approvals",
                severity=EventSeverity.WARNING,
                message=(
                    f"{approval_class} / {request.tool} remains "
                    f"{self._approval_capability_label(request.tool)} "
                    "and requires approval before dispatch can continue."
                ),
                run_id=run_id,
                details={
                    "approval_id": approval.id,
                    "tool": request.tool,
                    "capability_status": self._approval_capability_label(request.tool),
                },
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run_id,
                approval_id=approval.id,
                error=ResponseError(
                    code="APPROVAL_REQUIRED",
                    message="This tool requires explicit approval before execution.",
                    retryable=True,
                    details={"approval_id": approval.id, "approval_token": approval.token},
                ),
                warnings=["Dispatch paused pending approval."],
                logs=["Approval record created for the requested operation."],
            )

        approval = approvals_service.get_approval_by_token(request.approval_token)
        if approval is None or approval.tool != request.tool or approval.agent != request.agent:
            runs_service.update_run(
                run_id,
                status=RunStatus.REJECTED,
                result_summary="Rejected due to invalid approval token.",
            )
            executions_service.update_execution(
                execution_id,
                status=ExecutionStatus.REJECTED,
                logs=["Approval token validation failed."],
                details=self._with_prompt_safety(
                    tool_name=request.tool,
                    payload={"approval_token": request.approval_token},
                ),
                result_summary="Rejected due to invalid approval token.",
                finished=True,
            )
            events_service.record(
                category="approvals",
                severity=EventSeverity.ERROR,
                message="Dispatch rejected because the approval token was invalid.",
                run_id=run_id,
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run_id,
                error=ResponseError(
                    code="PERMISSION_DENIED",
                    message="Approval token is invalid for this tool request.",
                    retryable=False,
                    details={"approval_token": request.approval_token},
                ),
                warnings=["Dispatch rejected before tool execution."],
                logs=["Approval token validation failed."],
            )

        if approval.status != ApprovalStatus.APPROVED:
            runs_service.update_run(
                run_id,
                status=RunStatus.WAITING_APPROVAL,
                approval_id=approval.id,
                approval_token=approval.token,
                result_summary="Approval token exists but has not been approved yet.",
            )
            executions_service.update_execution(
                execution_id,
                status=ExecutionStatus.WAITING_APPROVAL,
                logs=["Approval token exists but approval has not been granted yet."],
                details=self._with_prompt_safety(
                    tool_name=request.tool,
                    payload={"approval_id": approval.id, "status": approval.status.value},
                ),
                result_summary="Approval token exists but has not been approved yet.",
                finished=True,
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run_id,
                approval_id=approval.id,
                error=ResponseError(
                    code="APPROVAL_REQUIRED",
                    message="Approval token exists, but approval has not been granted yet.",
                    retryable=True,
                    details={"approval_id": approval.id, "status": approval.status.value},
                ),
                warnings=["Dispatch remains paused pending approval decision."],
                logs=["Approval token was found but is not yet approved."],
            )

        runs_service.update_run(
            run_id,
            approval_id=approval.id,
            approval_token=approval.token,
        )
        return None

    def _reject_invalid_args(
        self,
        *,
        request: RequestEnvelope,
        run_id: str,
        execution_id: str,
        schema_ref: str,
        validation_errors: list[str],
    ) -> ResponseEnvelope:
        runs_service.update_run(
            run_id,
            status=RunStatus.FAILED,
            result_summary="Rejected due to invalid tool arguments.",
        )
        executions_service.update_execution(
            execution_id,
            status=ExecutionStatus.FAILED,
            logs=["Tool argument validation failed before tool execution."],
            details=self._with_prompt_safety(
                tool_name=request.tool,
                payload={
                    "args_schema_ref": schema_ref,
                    "arg_validation_errors": validation_errors,
                },
            ),
            result_summary="Rejected due to invalid tool arguments.",
            finished=True,
        )
        events_service.record(
            category="validation",
            severity=EventSeverity.ERROR,
            message="Tool argument validation failed for the current capability-gated dispatch.",
            run_id=run_id,
            details={
                "args_schema_ref": schema_ref,
                "capability_status": self._request_capability_status(request),
            },
        )
        return ResponseEnvelope(
            request_id=request.request_id,
            ok=False,
            operation_id=run_id,
            error=ResponseError(
                code="INVALID_ARGS",
                message="Tool arguments did not match the published schema.",
                retryable=False,
                details={
                    "args_schema_ref": schema_ref,
                    "arg_validation_errors": validation_errors,
                },
            ),
            warnings=["Dispatch rejected before tool execution."],
            logs=["Tool argument validation failed against the published schema."],
        )

    def _reject_invalid_result(
        self,
        *,
        request: RequestEnvelope,
        run_id: str,
        execution_id: str,
        schema_ref: str,
        validation_errors: list[str],
    ) -> ResponseEnvelope:
        runs_service.update_run(
            run_id,
            status=RunStatus.FAILED,
            result_summary="Rejected because the adapter result failed schema conformance.",
        )
        executions_service.update_execution(
            execution_id,
            status=ExecutionStatus.FAILED,
            logs=["Adapter result validation failed before completion was reported."],
            details=self._with_prompt_safety(
                tool_name=request.tool,
                payload={
                    "result_schema_ref": schema_ref,
                    "result_validation_errors": validation_errors,
                },
            ),
            result_summary="Rejected because the adapter result failed schema conformance.",
            finished=True,
        )
        events_service.record(
            category="validation",
            severity=EventSeverity.ERROR,
            message="Adapter result validation failed for the current capability-gated dispatch.",
            run_id=run_id,
            details={
                "result_schema_ref": schema_ref,
                "capability_status": self._request_capability_status(request),
            },
        )
        return ResponseEnvelope(
            request_id=request.request_id,
            ok=False,
            operation_id=run_id,
            error=ResponseError(
                code="INVALID_RESULT",
                message="Adapter result did not match the published result schema.",
                retryable=False,
                details={
                    "result_schema_ref": schema_ref,
                    "result_validation_errors": validation_errors,
                },
            ),
            warnings=["Dispatch failed before adapter completion could be reported."],
            logs=["Adapter result validation failed against the published result schema."],
        )

    def _reject_invalid_persisted_payload(
        self,
        *,
        request: RequestEnvelope,
        run_id: str,
        execution_id: str,
        schema_ref: str,
        validation_errors: list[str],
        payload_kind: str,
    ) -> ResponseEnvelope:
        runs_service.update_run(
            run_id,
            status=RunStatus.FAILED,
            result_summary=f"Rejected because persisted {payload_kind} failed schema conformance.",
        )
        executions_service.update_execution(
            execution_id,
            status=ExecutionStatus.FAILED,
            logs=[f"Persisted {payload_kind} validation failed before completion was reported."],
            details=self._with_prompt_safety(
                tool_name=request.tool,
                payload={
                    "persisted_schema_ref": schema_ref,
                    "persisted_payload_kind": payload_kind,
                    "persisted_validation_errors": validation_errors,
                },
            ),
            result_summary=f"Rejected because persisted {payload_kind} failed schema conformance.",
            finished=True,
        )
        events_service.record(
            category="validation",
            severity=EventSeverity.ERROR,
            message=(
                f"Persisted {payload_kind} validation failed for the current "
                "capability-gated dispatch."
            ),
            run_id=run_id,
            details={
                "persisted_schema_ref": schema_ref,
                "persisted_payload_kind": payload_kind,
                "capability_status": self._request_capability_status(request),
            },
        )
        return ResponseEnvelope(
            request_id=request.request_id,
            ok=False,
            operation_id=run_id,
            error=ResponseError(
                code="INVALID_PERSISTED_PAYLOAD",
                message=f"Persisted {payload_kind} did not match the published schema.",
                retryable=False,
                details={
                    "persisted_schema_ref": schema_ref,
                    "persisted_payload_kind": payload_kind,
                    "persisted_validation_errors": validation_errors,
                },
            ),
            warnings=["Dispatch failed before persisted records could be finalized."],
            logs=[f"Persisted {payload_kind} validation failed against the published schema."],
        )

    def _request_capability_status(self, request: RequestEnvelope) -> str:
        policy = policy_service.get_policy(request.agent, request.tool)
        return policy.capability_status if policy is not None else "unknown"

    def _with_prompt_safety(
        self,
        *,
        tool_name: str,
        payload: dict[str, object],
    ) -> dict[str, object]:
        merged_payload = dict(payload)
        capability = capability_registry_service.get_capability(tool_name)
        if capability is None:
            return merged_payload
        merged_payload.setdefault(
            "prompt_safety",
            capability.safety_envelope.model_dump(mode="json"),
        )
        return merged_payload

    def _approval_capability_label(self, tool_name: str) -> str:
        tool = catalog_service.get_tool_definition("project-build", tool_name)
        if tool is not None:
            return tool.capability_status
        for agent in catalog_service.get_catalog_model().agents:
            for candidate in agent.tools:
                if candidate.name == tool_name:
                    return candidate.capability_status
        return "unknown"

    def _capability_message_prefix(self, request: RequestEnvelope) -> str:
        capability = self._request_capability_status(request)
        if request.tool == "build.configure" and capability == "plan-only":
            return "plan-only build.configure preflight"
        if request.tool == "build.compile" and capability == "plan-only":
            return "plan-only build.compile preflight"
        if request.tool == "settings.patch" and capability == "mutation-gated":
            return (
                "mutation-gated settings.patch path"
                if not request.dry_run
                else "plan-only settings.patch preflight"
            )
        if request.tool == "project.inspect" and capability == "hybrid-read-only":
            return "hybrid-read-only project.inspect path"
        if request.tool == "asset.processor.status" and capability == "hybrid-read-only":
            return "hybrid-read-only asset.processor.status path"
        if request.tool == "asset.source.inspect" and capability == "hybrid-read-only":
            return "hybrid-read-only asset.source.inspect path"
        return f"{capability} dispatch"

    def _result_warning(self, request: RequestEnvelope, result) -> str:
        if result.simulated:
            return "Underlying O3DE execution remains simulated in this phase."
        if request.tool == "asset.processor.status":
            return "This run used the first real read-only asset.processor.status path."
        if request.tool == "asset.source.inspect":
            return "This run used the first real read-only asset.source.inspect path."
        if request.tool == "project.inspect":
            return "This run used the first real read-only project inspection path."
        if request.tool == "build.configure":
            return "This run used the real plan-only build.configure preflight path."
        if request.tool == "build.compile":
            return "This run used the real plan-only build.compile preflight path."
        if request.tool == "settings.patch":
            if isinstance(result.message, str) and result.message.startswith(
                "Real settings.patch mutation completed"
            ):
                return "This run used the first real settings.patch mutation path."
            return (
                "This run used the real plan-only settings.patch preflight path; "
                "no settings were written."
            )
        if request.tool == "editor.session.open":
            return "This run used the admitted real editor.session.open runtime path."
        if request.tool == "editor.level.open":
            return "This run used the admitted real editor.level.open runtime path."
        if request.tool == "editor.entity.create":
            return "This run used the admitted real editor.entity.create bridge-backed path."
        if request.tool == "editor.component.add":
            return "This run used the admitted real editor.component.add bridge-backed path."
        if request.tool == "editor.component.property.get":
            return (
                "This run used the admitted real editor.component.property.get "
                "bridge-backed path."
            )
        return "This run used a real non-simulated control-plane path."


dispatcher_service = DispatcherService()
