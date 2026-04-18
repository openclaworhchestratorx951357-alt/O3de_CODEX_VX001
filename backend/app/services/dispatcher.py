from app.models.control_plane import ApprovalStatus, EventSeverity, RunStatus
from app.models.request_envelope import RequestEnvelope
from app.models.response_envelope import ResponseEnvelope, ResponseError
from app.services.approvals import approvals_service
from app.services.catalog import catalog_service
from app.services.events import events_service
from app.services.locks import locks_service
from app.services.policy import policy_service
from app.services.runs import runs_service


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

        approval_problem = self._check_approval(request, run.id, policy.approval_class)
        if approval_problem is not None:
            return approval_problem

        conflicts = locks_service.get_conflicts(requested_locks, owner_run_id=run.id)
        if conflicts:
            runs_service.update_run(
                run.id,
                status=RunStatus.BLOCKED,
                result_summary="Blocked by an active lock.",
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
        events_service.record(
            category="locks",
            severity=EventSeverity.INFO,
            message="Required locks acquired for run.",
            run_id=run.id,
            details={"locks": ", ".join(lock.name for lock in acquired_locks) or "none"},
        )

        result = {
            "status": "simulated_success",
            "tool": request.tool,
            "agent": request.agent,
            "project_root": request.project_root,
            "engine_root": request.engine_root,
            "dry_run": request.dry_run,
            "execution_mode": "simulated",
            "approval_class": policy.approval_class,
            "locks_acquired": [lock.name for lock in acquired_locks],
            "message": (
                "Control-plane prechecks passed and the run was recorded, "
                "but no real O3DE adapter was executed."
            ),
        }

        locks_service.release(run.id)
        runs_service.update_run(
            run.id,
            status=RunStatus.SUCCEEDED,
            result_summary="Simulated dispatch completed successfully.",
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


dispatcher_service = DispatcherService()
