from app.models.control_plane import (
    ApprovalStatus,
    EventSeverity,
    ExecutionStatus,
    RunStatus,
)
from app.models.request_envelope import RequestEnvelope
from app.models.response_envelope import DispatchResult, ResponseEnvelope, ResponseError
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
    simulated until real O3DE adapters arrive in later phases.
    """

    def dispatch(self, request: RequestEnvelope) -> ResponseEnvelope:
        requested_locks = self._merge_locks(request, agent=request.agent, tool=request.tool)
        run = runs_service.create_run(
            request,
            requested_locks=requested_locks,
            execution_mode="simulated",
        )
        execution = executions_service.create_execution(
            run_id=run.id,
            request_id=request.request_id,
            agent=request.agent,
            tool=request.tool,
            execution_mode="simulated",
            status=ExecutionStatus.PENDING,
            details={"requested_locks": requested_locks},
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
                warnings=["Dispatch rejected before simulated execution."],
                logs=["Missing tool policy definition."],
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
            runs_service.update_run(
                run.id,
                status=RunStatus.BLOCKED,
                result_summary="Blocked by an active lock.",
            )
            executions_service.update_execution(
                execution.id,
                status=ExecutionStatus.BLOCKED,
                logs=[f"Blocked by locks: {', '.join(lock.name for lock in conflicts)}."],
                details={"conflicts": [lock.model_dump() for lock in conflicts]},
                result_summary="Blocked by an active lock.",
                finished=True,
            )
            events_service.record(
                category="locks",
                severity=EventSeverity.WARNING,
                message="Dispatch blocked by an active lock.",
                run_id=run.id,
                details={"locks": ", ".join(lock.name for lock in conflicts)},
            )
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                operation_id=run.id,
                error=ResponseError(
                    code="STATE_LOCKED",
                    message="Requested lock is already held by another run.",
                    retryable=True,
                    details={"conflicts": [lock.model_dump() for lock in conflicts]},
                ),
                warnings=["Dispatch blocked before simulated execution."],
                logs=[
                    f"Run blocked by locks: {', '.join(lock.name for lock in conflicts)}."
                ],
            )

        acquired_locks = locks_service.acquire(requested_locks, owner_run_id=run.id)
        runs_service.update_run(
            run.id,
            status=RunStatus.RUNNING,
            granted_locks=[lock.name for lock in acquired_locks],
            warnings=[
                "Execution mode is simulated until real O3DE adapters are implemented.",
            ],
        )
        executions_service.update_execution(
            execution.id,
            status=ExecutionStatus.RUNNING,
            warnings=[
                "Execution mode is simulated until real O3DE adapters are implemented.",
            ],
            logs=[
                "Control-plane prechecks passed.",
                f"Acquired locks: {', '.join(lock.name for lock in acquired_locks) if acquired_locks else 'none'}.",
            ],
            details={
                "requested_locks": requested_locks,
                "granted_locks": [lock.name for lock in acquired_locks],
                "simulated": True,
            },
            result_summary="Simulated execution started.",
        )
        events_service.record(
            category="locks",
            severity=EventSeverity.INFO,
            message="Required locks acquired for run.",
            run_id=run.id,
            details={"locks": ", ".join(lock.name for lock in acquired_locks) or "none"},
        )

        result = DispatchResult(
            status="simulated_success",
            tool=request.tool,
            agent=request.agent,
            project_root=request.project_root,
            engine_root=request.engine_root,
            dry_run=request.dry_run,
            simulated=True,
            execution_mode="simulated",
            approval_class=policy.approval_class,
            locks_acquired=[lock.name for lock in acquired_locks],
            message=(
                "Control-plane prechecks passed and the run was recorded, "
                "but no real O3DE adapter was executed."
            ),
        )
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

        artifact = artifacts_service.create_artifact(
            run_id=run.id,
            execution_id=execution.id,
            label="Simulated dispatch summary",
            kind="simulated_result",
            uri=f"simulated://runs/{run.id}/executions/{execution.id}/summary",
            content_type="application/json",
            simulated=True,
            metadata={
                "tool": request.tool,
                "agent": request.agent,
                "execution_mode": "simulated",
            },
        )

        locks_service.release(run.id)
        runs_service.update_run(
            run.id,
            status=RunStatus.SUCCEEDED,
            result_summary="Simulated dispatch completed successfully.",
        )
        executions_service.update_execution(
            execution.id,
            status=ExecutionStatus.SUCCEEDED,
            logs=[
                "Simulated execution completed successfully.",
                "No real O3DE adapter was invoked.",
            ],
            artifact_ids=[artifact.id],
            details={
                "result": result.model_dump(),
                "artifact_id": artifact.id,
                "simulated": True,
            },
            result_summary="Simulated dispatch completed successfully.",
            finished=True,
        )
        events_service.record(
            category="dispatch",
            severity=EventSeverity.INFO,
            message="Simulated dispatch completed.",
            run_id=run.id,
            details={"tool": request.tool},
        )

        return ResponseEnvelope(
            request_id=request.request_id,
            ok=True,
            operation_id=run.id,
            result=result,
            warnings=[
                "Control-plane bookkeeping is real for this run.",
                "Underlying O3DE execution remains simulated in this phase.",
            ],
            artifacts=[artifact.id],
            logs=[
                f"Dispatch requested for tool '{request.tool}'.",
                f"Agent '{request.agent}' requested locks: {', '.join(requested_locks) if requested_locks else 'none'}.",
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
                result_summary="Waiting for approval before simulated execution.",
            )
            executions_service.update_execution(
                execution_id,
                status=ExecutionStatus.WAITING_APPROVAL,
                logs=["Waiting for explicit approval before simulated execution."],
                details={"approval_class": approval_class},
                result_summary="Waiting for approval before simulated execution.",
                finished=True,
            )
            events_service.record(
                category="approvals",
                severity=EventSeverity.WARNING,
                message="Approval required before dispatch can continue.",
                run_id=run_id,
                details={"approval_id": approval.id, "tool": request.tool},
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
                warnings=["Dispatch rejected before simulated execution."],
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
            logs=["Tool argument validation failed before simulated execution."],
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
            message="Tool argument validation failed.",
            run_id=run_id,
            details={"args_schema_ref": schema_ref},
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
            warnings=["Dispatch rejected before simulated execution."],
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
            result_summary="Rejected because the simulated result failed schema conformance.",
        )
        executions_service.update_execution(
            execution_id,
            status=ExecutionStatus.FAILED,
            logs=["Simulated result validation failed before completion was reported."],
            details={
                "result_schema_ref": schema_ref,
                "result_validation_errors": validation_errors,
                "simulated": True,
            },
            result_summary="Rejected because the simulated result failed schema conformance.",
            finished=True,
        )
        events_service.record(
            category="validation",
            severity=EventSeverity.ERROR,
            message="Simulated result validation failed.",
            run_id=run_id,
            details={"result_schema_ref": schema_ref},
        )
        return ResponseEnvelope(
            request_id=request.request_id,
            ok=False,
            operation_id=run_id,
            error=ResponseError(
                code="INVALID_RESULT",
                message="Simulated result did not match the published result schema.",
                retryable=False,
                details={
                    "result_schema_ref": schema_ref,
                    "result_validation_errors": validation_errors,
                },
            ),
            warnings=["Dispatch failed before simulated completion could be reported."],
            logs=["Simulated result validation failed against the published result schema."],
        )


dispatcher_service = DispatcherService()
