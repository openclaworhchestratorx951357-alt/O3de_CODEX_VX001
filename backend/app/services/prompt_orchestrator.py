from __future__ import annotations

from datetime import datetime, timezone

from app.models.prompt_control import (
    PromptRequest,
    PromptSessionRecord,
    PromptSessionStatus,
)
from app.models.request_envelope import RequestEnvelope
from app.models.response_envelope import ResponseEnvelope
from app.services.approvals import approvals_service
from app.services.artifacts import artifacts_service
from app.services.dispatcher import dispatcher_service
from app.services.events import events_service
from app.services.executions import executions_service
from app.services.executors import executors_service
from app.services.intent_planner import intent_planner_service
from app.services.prompt_sessions import prompt_sessions_service
from app.services.workspaces import workspaces_service


class PromptOrchestratorService:
    def create_session(self, request: PromptRequest) -> PromptSessionRecord:
        existing = prompt_sessions_service.get_session(request.prompt_id)
        if existing is not None:
            raise ValueError(f"Prompt session '{request.prompt_id}' already exists.")

        if request.executor_id and executors_service.get_executor(request.executor_id) is None:
            raise ValueError(
                f"Executor '{request.executor_id}' was not found for prompt orchestration."
            )
        if request.workspace_id and workspaces_service.get_workspace(request.workspace_id) is None:
            raise ValueError(
                f"Workspace '{request.workspace_id}' was not found for prompt orchestration."
            )

        plan = intent_planner_service.create_plan(request)
        admitted_capabilities = sorted({step.tool for step in plan.steps})
        status = (
            PromptSessionStatus.PLANNED
            if plan.admitted
            else PromptSessionStatus.REFUSED
        )
        final_result_summary = (
            f"Plan preview ready with {len(plan.steps)} typed child step(s)."
            if plan.admitted
            else plan.refusal_reason
            or "Prompt plan was refused because no admitted capability path was found."
        )
        session = PromptSessionRecord(
            prompt_id=request.prompt_id,
            plan_id=plan.plan_id,
            status=status,
            prompt_text=request.prompt_text,
            project_root=request.project_root,
            engine_root=request.engine_root,
            dry_run=request.dry_run,
            preferred_domains=request.preferred_domains,
            operator_note=request.operator_note,
            workspace_id=request.workspace_id,
            executor_id=request.executor_id,
            plan_summary=plan.summary,
            admitted_capabilities=admitted_capabilities,
            refused_capabilities=plan.refused_capabilities,
            final_result_summary=final_result_summary,
            plan=plan,
        )
        return prompt_sessions_service.create_session(session)

    def execute_session(self, prompt_id: str) -> PromptSessionRecord:
        session = prompt_sessions_service.get_session(prompt_id)
        if session is None:
            raise KeyError(prompt_id)
        self._refresh_child_lineage(session)
        if session.status in {
            PromptSessionStatus.REFUSED,
            PromptSessionStatus.COMPLETED,
            PromptSessionStatus.RUNNING,
        }:
            return session
        if session.plan is None or not session.plan.steps:
            session.status = PromptSessionStatus.REFUSED
            session.final_result_summary = (
                "Prompt session has no admitted child steps to execute."
            )
            return prompt_sessions_service.update_session(session)
        next_step_index = self._resolve_next_step_index(session)
        if next_step_index is None:
            return prompt_sessions_service.update_session(session)
        if next_step_index >= len(session.plan.steps):
            return self._mark_session_completed(session)

        session.status = PromptSessionStatus.RUNNING
        session.final_result_summary = self._execution_start_summary(session)
        prompt_sessions_service.update_session(session)

        for step_index in range(next_step_index, len(session.plan.steps)):
            step = session.plan.steps[step_index]
            approval_token = self._approval_token_for_step(session, step.step_id)
            response = dispatcher_service.dispatch(
                RequestEnvelope(
                    request_id=f"{session.prompt_id}:{step.step_id}",
                    tool=step.tool,
                    agent=step.agent,
                    project_root=session.project_root,
                    engine_root=session.engine_root,
                    session_id=session.prompt_id,
                    workspace_id=step.workspace_id,
                    executor_id=step.executor_id,
                    dry_run=session.dry_run,
                    approval_token=approval_token,
                    locks=step.required_locks,
                    timeout_s=30,
                    args=step.args,
                )
            )
            self._record_step_attempt(session, step.step_id)
            self._append_child_response(session, response)
            self._collect_child_lineage(session, response)
            if not response.ok:
                self._record_failed_step_state(session, step.step_id, response)
                session.status = self._status_from_response(response)
                session.evidence_summary = self._build_evidence_summary(session)
                session.final_result_summary = self._failure_summary(step.tool, response)
                return prompt_sessions_service.update_session(session)
            session.next_step_index = step_index + 1
            session.current_step_id = None
            self._clear_pending_approval_state(session)
            session.last_error_code = None
            session.last_error_retryable = False

        return self._mark_session_completed(session)

    def _append_child_response(
        self,
        session: PromptSessionRecord,
        response: ResponseEnvelope,
    ) -> None:
        session.latest_child_responses.append(response.model_dump(mode="json"))
        session.updated_at = datetime.now(timezone.utc)

    def _collect_child_lineage(
        self,
        session: PromptSessionRecord,
        response: ResponseEnvelope,
    ) -> None:
        run_id = response.operation_id
        if run_id:
            self._append_unique(session.child_run_ids, run_id)
        if response.artifacts:
            for artifact_id in response.artifacts:
                self._append_unique(session.child_artifact_ids, artifact_id)
        if not run_id:
            return

        for execution in executions_service.list_executions():
            if execution.run_id == run_id:
                self._append_unique(session.child_execution_ids, execution.id)
        for artifact in artifacts_service.list_artifacts():
            if artifact.run_id == run_id:
                self._append_unique(session.child_artifact_ids, artifact.id)
        for event in events_service.list_events():
            if event.run_id == run_id and event.id is not None:
                self._append_unique(session.child_event_ids, event.id)

    def _refresh_child_lineage(self, session: PromptSessionRecord) -> None:
        if not session.child_run_ids:
            return
        known_run_ids = set(session.child_run_ids)
        for execution in executions_service.list_executions():
            if execution.run_id is None or execution.run_id not in known_run_ids:
                continue
            self._append_unique(session.child_execution_ids, execution.id)
        for artifact in artifacts_service.list_artifacts():
            if artifact.run_id is None or artifact.run_id not in known_run_ids:
                continue
            self._append_unique(session.child_artifact_ids, artifact.id)
        for event in events_service.list_events():
            if event.run_id is None or event.run_id not in known_run_ids:
                continue
            self._append_unique(session.child_event_ids, event.id)

    def _status_from_response(self, response: ResponseEnvelope) -> PromptSessionStatus:
        if response.error is None:
            return PromptSessionStatus.FAILED
        if response.error.code == "APPROVAL_REQUIRED":
            return PromptSessionStatus.WAITING_APPROVAL
        if response.error.code == "STATE_LOCKED":
            return PromptSessionStatus.BLOCKED
        return PromptSessionStatus.FAILED

    def _failure_summary(self, tool_name: str, response: ResponseEnvelope) -> str:
        if response.error is None:
            return f"Prompt execution stopped during {tool_name}."
        if response.error.code == "APPROVAL_REQUIRED":
            return (
                f"Prompt execution paused at child step {tool_name} pending tool-level approval."
            )
        if response.error.code == "STATE_LOCKED":
            return (
                f"Prompt execution paused at child step {tool_name} because a required lock is already held."
            )
        return (
            f"Prompt execution stopped at child step {tool_name}: {response.error.message}"
        )

    def _execution_start_summary(self, session: PromptSessionRecord) -> str:
        if session.next_step_index == 0 and session.current_step_id is None:
            return "Executing prompt session through typed child dispatch."
        if session.pending_approval_id:
            return (
                "Continuing prompt session after approval readiness was rechecked."
            )
        if session.current_step_id:
            return (
                f"Retrying prompt child step {session.current_step_id} through typed child dispatch."
            )
        return "Continuing prompt session through typed child dispatch."

    def _build_evidence_summary(self, session: PromptSessionRecord) -> str:
        return (
            f"runs={len(session.child_run_ids)}, "
            f"executions={len(session.child_execution_ids)}, "
            f"artifacts={len(session.child_artifact_ids)}, "
            f"events={len(session.child_event_ids)}"
        )

    def _resolve_next_step_index(self, session: PromptSessionRecord) -> int | None:
        if session.status == PromptSessionStatus.WAITING_APPROVAL:
            return self._resolve_waiting_approval_step_index(session)
        if session.status == PromptSessionStatus.BLOCKED:
            return self._find_step_index(session, session.current_step_id)
        if session.status == PromptSessionStatus.FAILED:
            if session.current_step_id is None or not session.last_error_retryable:
                return None
            return self._find_step_index(session, session.current_step_id)
        return session.next_step_index

    def _resolve_waiting_approval_step_index(
        self,
        session: PromptSessionRecord,
    ) -> int | None:
        if session.current_step_id is None:
            session.status = PromptSessionStatus.FAILED
            session.last_error_code = "PROMPT_SESSION_STATE_INVALID"
            session.last_error_retryable = False
            session.final_result_summary = (
                "Prompt continuation could not resume because the paused step is missing."
            )
            return None
        if not session.pending_approval_token:
            session.status = PromptSessionStatus.FAILED
            session.last_error_code = "APPROVAL_TOKEN_MISSING"
            session.last_error_retryable = False
            session.final_result_summary = (
                f"Prompt continuation could not resume step {session.current_step_id} because the approval token was missing."
            )
            return None

        approval = approvals_service.get_approval_by_token(session.pending_approval_token)
        if approval is None:
            session.status = PromptSessionStatus.FAILED
            session.last_error_code = "APPROVAL_MISSING"
            session.last_error_retryable = False
            session.final_result_summary = (
                f"Prompt continuation could not resume step {session.current_step_id} because the stored approval token no longer resolves to an approval record."
            )
            self._clear_pending_approval_state(session)
            return None
        if approval.status.value == "pending":
            session.final_result_summary = (
                f"Prompt session remains paused at child step {session.current_step_id} pending approval."
            )
            return None
        if approval.status.value == "rejected":
            session.status = PromptSessionStatus.FAILED
            session.last_error_code = "APPROVAL_REJECTED"
            session.last_error_retryable = True
            session.final_result_summary = (
                f"Prompt execution stopped because approval for child step {session.current_step_id} was rejected. Re-running this prompt session will request a new approval."
            )
            self._clear_pending_approval_state(session)
            return None
        return self._find_step_index(session, session.current_step_id)

    def _find_step_index(
        self,
        session: PromptSessionRecord,
        step_id: str | None,
    ) -> int | None:
        if step_id is None or session.plan is None:
            return None
        for index, step in enumerate(session.plan.steps):
            if step.step_id == step_id:
                return index
        session.status = PromptSessionStatus.FAILED
        session.last_error_code = "PROMPT_STEP_NOT_FOUND"
        session.last_error_retryable = False
        session.final_result_summary = (
            f"Prompt continuation could not locate child step {step_id} in the persisted plan."
        )
        return None

    def _approval_token_for_step(
        self,
        session: PromptSessionRecord,
        step_id: str,
    ) -> str | None:
        if session.current_step_id == step_id and session.pending_approval_token:
            return session.pending_approval_token
        return None

    def _record_step_attempt(self, session: PromptSessionRecord, step_id: str) -> None:
        session.current_step_id = step_id
        session.step_attempts[step_id] = session.step_attempts.get(step_id, 0) + 1

    def _record_failed_step_state(
        self,
        session: PromptSessionRecord,
        step_id: str,
        response: ResponseEnvelope,
    ) -> None:
        session.current_step_id = step_id
        session.last_error_code = response.error.code if response.error else None
        session.last_error_retryable = response.error.retryable if response.error else False
        if response.error and response.error.code == "APPROVAL_REQUIRED":
            details = response.error.details or {}
            approval_id = details.get("approval_id")
            approval_token = details.get("approval_token")
            session.pending_approval_id = (
                response.approval_id
                or approval_id
                or session.pending_approval_id
            )
            session.pending_approval_token = (
                approval_token
                if isinstance(approval_token, str) and approval_token
                else session.pending_approval_token
            )
            return
        self._clear_pending_approval_state(session)

    def _clear_pending_approval_state(self, session: PromptSessionRecord) -> None:
        session.pending_approval_id = None
        session.pending_approval_token = None

    def _mark_session_completed(self, session: PromptSessionRecord) -> PromptSessionRecord:
        session.status = PromptSessionStatus.COMPLETED
        session.next_step_index = len(session.plan.steps) if session.plan else session.next_step_index
        session.current_step_id = None
        self._clear_pending_approval_state(session)
        session.last_error_code = None
        session.last_error_retryable = False
        session.evidence_summary = self._build_evidence_summary(session)
        session.final_result_summary = (
            f"Executed {len(session.plan.steps) if session.plan else 0} typed child step(s) through DispatcherService."
        )
        return prompt_sessions_service.update_session(session)

    def _append_unique(self, values: list[str], value: str) -> None:
        if value not in values:
            values.append(value)


prompt_orchestrator_service = PromptOrchestratorService()
