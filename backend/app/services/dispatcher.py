from app.models.control_plane import (
    ApprovalStatus,
    EventSeverity,
    ExecutionStatus,
    RunStatus,
)
from app.models.request_envelope import RequestEnvelope
from app.models.response_envelope import ResponseEnvelope, ResponseError
from app.services.adapters import AdapterConfigurationError, adapter_service
from app.services.approvals import approvals_service
from app.services.artifacts import artifacts_service
from app.services.catalog import catalog_service
from app.services.events import events_service
from app.services.executions import executions_service
from app.services.locks import locks_service
from app.services.policy import policy_service
from app.services.runs import runs_service
from app.services.schema_validation import schema_validation_service


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
            details={
                "requested_locks": requested_locks,
                "adapter_family": request.agent,
                "adapter_contract_version": adapter_status.contract_version,
                "execution_boundary": adapter_status.execution_boundary,
            },
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
                details={
                    "configured_mode": adapter_status.configured_mode,
                    "adapter_family": policy.adapter_family,
                    "adapter_contract_version": adapter_status.contract_version,
                    "execution_boundary": adapter_status.execution_boundary,
                },
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
                details={"conflicts": serialized_conflicts},
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
                details={
                    "requested_locks": requested_locks,
                    "granted_locks": [lock.name for lock in acquired_locks],
                    "configured_mode": adapter_status.configured_mode,
                    "adapter_family": policy.adapter_family,
                    "adapter_contract_version": adapter_status.contract_version,
                    "execution_boundary": adapter_status.execution_boundary,
                },
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

        running_execution_details = {
            "requested_locks": requested_locks,
            "granted_locks": [lock.name for lock in acquired_locks],
            **adapter_report.execution_details,
        }
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

        artifact = artifacts_service.create_artifact(
            run_id=run.id,
            execution_id=execution.id,
            label=adapter_report.artifact_label,
            kind=adapter_report.artifact_kind,
            uri=adapter_report.artifact_uri.format(run_id=run.id, execution_id=execution.id),
            content_type="application/json",
            simulated=result.simulated,
            metadata=adapter_report.artifact_metadata,
        )

        locks_service.release(run.id)
        runs_service.update_run(
            run.id,
            status=RunStatus.SUCCEEDED,
            result_summary=adapter_report.result_summary,
        )
        succeeded_execution_details = {
            "result": result.model_dump(),
            "artifact_id": artifact.id,
            **adapter_report.execution_details,
        }
        executions_service.update_execution(
            execution.id,
            status=ExecutionStatus.SUCCEEDED,
            warnings=adapter_report.warnings,
            logs=adapter_report.logs,
            artifact_ids=[artifact.id],
            details=succeeded_execution_details,
            result_summary=adapter_report.result_summary,
            finished=True,
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

        result_warning = (
            "Underlying O3DE execution remains simulated in this phase."
            if result.simulated
            else (
                "This run used the first real read-only project inspection path."
                if request.tool == "project.inspect"
                else "This run used the real plan-only build.configure preflight path."
            )
        )
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
                details={"approval_class": approval_class},
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
                details={"approval_token": request.approval_token},
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
                details={"approval_id": approval.id, "status": approval.status.value},
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
            details={
                "args_schema_ref": schema_ref,
                "arg_validation_errors": validation_errors,
            },
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
            details={
                "result_schema_ref": schema_ref,
                "result_validation_errors": validation_errors,
            },
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
            details={
                "persisted_schema_ref": schema_ref,
                "persisted_payload_kind": payload_kind,
                "persisted_validation_errors": validation_errors,
            },
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
        if request.tool == "project.inspect" and capability == "hybrid-read-only":
            return "hybrid-read-only project.inspect path"
        return f"{capability} dispatch"


dispatcher_service = DispatcherService()
