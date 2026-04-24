from __future__ import annotations

from datetime import datetime, timezone
import re
from typing import Any

from app.models.prompt_control import (
    PromptRequest,
    PromptSessionRecord,
    PromptSessionStatus,
)
from app.models.prompt_step import PromptPlanStep
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

_STEP_OUTPUT_REF_PATTERN = re.compile(
    r"^\$step:(?P<step_id>[a-z0-9_-]+)\.(?P<path>[A-Za-z0-9_.\[\]-]+)$"
)


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
            try:
                resolved_args = self._resolve_step_args(session, step)
            except ValueError as exc:
                session.status = PromptSessionStatus.FAILED
                session.current_step_id = step.step_id
                session.last_error_code = "PROMPT_STEP_OUTPUT_MISSING"
                session.last_error_retryable = False
                session.evidence_summary = self._build_evidence_summary(session)
                session.final_result_summary = str(exc)
                return prompt_sessions_service.update_session(session)
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
                    args=resolved_args,
                )
            )
            self._record_step_attempt(session, step.step_id)
            self._append_child_response(session, step.step_id, response)
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
        step_id: str,
        response: ResponseEnvelope,
    ) -> None:
        session.latest_child_responses.append(
            self._build_child_response_record(step_id, response)
        )
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

    def _build_child_response_record(
        self,
        step_id: str,
        response: ResponseEnvelope,
    ) -> dict[str, Any]:
        record = response.model_dump(mode="json")
        record["prompt_step_id"] = step_id
        if response.operation_id is None:
            return record
        execution = self._execution_for_run_id(response.operation_id)
        if execution is not None:
            record["execution_details"] = execution.details
        if response.artifacts:
            artifact = artifacts_service.get_artifact(response.artifacts[0])
            if artifact is not None:
                record["artifact_metadata"] = artifact.metadata
        return record

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
        base_summary = (
            f"Executed {len(session.plan.steps) if session.plan else 0} typed child step(s) through DispatcherService."
        )
        review_summary = self._build_operator_review_summary(session)
        session.final_result_summary = (
            f"{base_summary} {review_summary}" if review_summary else base_summary
        )
        return prompt_sessions_service.update_session(session)

    def _append_unique(self, values: list[str], value: str) -> None:
        if value not in values:
            values.append(value)

    def _resolve_step_args(
        self,
        session: PromptSessionRecord,
        step: PromptPlanStep,
    ) -> dict[str, Any]:
        return self._resolve_step_output_value(session, step.args)

    def _resolve_step_output_value(
        self,
        session: PromptSessionRecord,
        value: Any,
    ) -> Any:
        if isinstance(value, dict):
            return {
                key: self._resolve_step_output_value(session, item)
                for key, item in value.items()
            }
        if isinstance(value, list):
            return [self._resolve_step_output_value(session, item) for item in value]
        if isinstance(value, str):
            return self._resolve_step_output_reference(session, value)
        return value

    def _resolve_step_output_reference(
        self,
        session: PromptSessionRecord,
        value: str,
    ) -> Any:
        match = _STEP_OUTPUT_REF_PATTERN.match(value)
        if match is None:
            return value

        step_id = match.group("step_id")
        path = match.group("path")
        response_record = self._latest_successful_response_for_step(session, step_id)
        if response_record is None:
            raise ValueError(
                f"Prompt execution could not resolve output from prior child step {step_id} before continuing."
            )
        if "execution_details" not in response_record:
            raise ValueError(
                f"Prompt execution could not resolve persisted execution details for prior child step {step_id}."
            )
        return self._extract_path_value(response_record["execution_details"], path, step_id=step_id)

    def _latest_successful_response_for_step(
        self,
        session: PromptSessionRecord,
        step_id: str,
    ) -> dict[str, Any] | None:
        for response_record in reversed(session.latest_child_responses):
            if (
                response_record.get("prompt_step_id") == step_id
                and response_record.get("ok") is True
            ):
                return response_record
        return None

    def _extract_path_value(
        self,
        root: Any,
        path: str,
        *,
        step_id: str,
    ) -> Any:
        value = root
        for segment in path.split("."):
            segment_match = re.fullmatch(r"([A-Za-z0-9_-]+)(?:\[(\d+)\])?", segment)
            if segment_match is None:
                raise ValueError(
                    f"Prompt execution could not interpret output path '{path}' for child step {step_id}."
                )
            key = segment_match.group(1)
            index = segment_match.group(2)
            if not isinstance(value, dict) or key not in value:
                raise ValueError(
                    f"Prompt execution could not find output field '{key}' on child step {step_id}."
                )
            value = value[key]
            if index is not None:
                if not isinstance(value, list):
                    raise ValueError(
                        f"Prompt execution expected list output for '{key}' on child step {step_id}."
                    )
                item_index = int(index)
                if item_index >= len(value):
                    raise ValueError(
                        f"Prompt execution could not find output index [{item_index}] for '{key}' on child step {step_id}."
                    )
                value = value[item_index]
        return value

    def _execution_for_run_id(self, run_id: str):
        for execution in executions_service.list_executions():
            if execution.run_id == run_id:
                return execution
        return None

    def _build_operator_review_summary(self, session: PromptSessionRecord) -> str | None:
        entity_response = self._latest_successful_response_for_step(session, "editor-entity-1")
        component_response = self._latest_successful_response_for_step(session, "editor-component-1")
        property_response = self._latest_successful_response_for_step(
            session, "editor-component-property-1"
        )
        asset_processor_response = self._latest_successful_response_for_step(
            session, "asset-processor-1"
        )
        asset_response = self._latest_successful_response_for_step(session, "asset-inspect-1")
        asset_batch_response = self._latest_successful_response_for_step(
            session, "asset-batch-1"
        )
        asset_move_response = self._latest_successful_response_for_step(
            session, "asset-move-1"
        )
        render_capture_response = self._latest_successful_response_for_step(
            session, "render-capture-1"
        )
        render_material_response = self._latest_successful_response_for_step(
            session, "render-material-inspect-1"
        )
        gem_enable_response = self._latest_successful_response_for_step(session, "gem-enable-1")
        build_compile_response = self._latest_successful_response_for_step(
            session, "build-compile-1"
        )
        gtest_response = self._latest_successful_response_for_step(
            session, "validation-gtest-1"
        )
        editor_python_response = self._latest_successful_response_for_step(
            session, "validation-editor-python-1"
        )
        tiaf_response = self._latest_successful_response_for_step(
            session, "validation-tiaf-1"
        )
        visual_diff_response = self._latest_successful_response_for_step(
            session, "validation-visual-diff-1"
        )

        summary_parts: list[str] = []
        if entity_response is not None:
            details = entity_response.get("execution_details", {})
            entity_name = details.get("entity_name")
            entity_id = details.get("entity_id")
            level_path = details.get("level_path") or details.get("loaded_level_path")
            if entity_name and entity_id and level_path:
                summary_parts.append(
                    f"Readback confirmed entity '{entity_name}' ({entity_id}) in {level_path}."
                )
            elif entity_name and entity_id:
                summary_parts.append(
                    f"Readback confirmed entity '{entity_name}' ({entity_id})."
                )

        if component_response is not None:
            details = component_response.get("execution_details", {})
            added_components = details.get("added_components")
            entity_id = details.get("entity_id")
            if isinstance(added_components, list) and added_components:
                component_list = ", ".join(str(item) for item in added_components)
                if entity_id:
                    summary_parts.append(
                        f"Readback confirmed added component(s) {component_list} on entity {entity_id}."
                    )
                else:
                    summary_parts.append(
                        f"Readback confirmed added component(s) {component_list}."
                    )
            self._append_restore_boundary_summary(details, summary_parts)

        if property_response is not None:
            details = property_response.get("execution_details", {})
            property_path = details.get("property_path")
            value = details.get("value")
            if property_path is not None and value is not None:
                summary_parts.append(
                    f"Readback confirmed {property_path} = {value}."
                )

        if asset_processor_response is not None:
            details = asset_processor_response.get("execution_details", {})
            runtime_status = details.get("runtime_status")
            runtime_process_count = details.get("runtime_process_count", 0)
            if runtime_status == "running":
                summary_parts.append(
                    "Asset Processor runtime readback confirmed "
                    f"{runtime_process_count} running process(es)."
                )
            elif runtime_status == "not-running":
                summary_parts.append(
                    "Asset Processor runtime readback confirmed no running Asset Processor process."
                )
            else:
                summary_parts.append(
                    "Asset Processor runtime evidence remains unavailable on this host."
                )
            if details.get("job_evidence_requested") is True:
                if details.get("job_evidence_available") is True:
                    summary_parts.append(
                        f"Job readback confirmed {details.get('job_count', 0)} Asset Processor job entry(ies)."
                    )
                else:
                    summary_parts.append("Job evidence remains unavailable in this admitted slice.")
            if details.get("platform_evidence_requested") is True:
                if details.get("platform_evidence_available") is True:
                    summary_parts.append(
                        f"Platform readback confirmed {details.get('platform_count', 0)} platform status entry(ies)."
                    )
                else:
                    summary_parts.append(
                        "Platform evidence remains unavailable in this admitted slice."
                    )

        if asset_response is not None:
            details = asset_response.get("execution_details", {})
            source_path = details.get("source_path_relative_to_project_root") or details.get(
                "source_path_input"
            )
            if isinstance(source_path, str) and source_path:
                if details.get("source_exists") is True and details.get("source_is_file") is True:
                    summary_parts.append(f"Readback confirmed source asset {source_path}.")
                elif details.get("source_exists") is False:
                    summary_parts.append(
                        f"Readback confirmed source asset {source_path} is currently unavailable on disk."
                    )
                elif details.get("source_is_file") is False:
                    summary_parts.append(
                        f"Readback confirmed source asset path {source_path} resolved, but not as a file."
                    )
            if details.get("product_evidence_requested") is True:
                if details.get("product_evidence_available") is True:
                    summary_parts.append(
                        f"Product readback confirmed {details.get('product_count', 0)} related product entry(ies)."
                    )
                else:
                    summary_parts.append("Product evidence remains unavailable in this admitted slice.")
            if details.get("dependency_evidence_requested") is True:
                if details.get("dependency_evidence_available") is True:
                    summary_parts.append(
                        f"Dependency readback confirmed {details.get('dependency_count', 0)} related dependency entry(ies)."
                    )
                else:
                    summary_parts.append(
                        "Dependency evidence remains unavailable in this admitted slice."
                    )

        if asset_batch_response is not None:
            details = asset_batch_response.get("execution_details", {})
            match_count = details.get("source_candidate_match_count", 0)
            if match_count:
                summary_parts.append(
                    f"Asset batch preflight confirmed {match_count} project-local source candidate file(s) for the explicit source glob."
                )
            else:
                summary_parts.append(
                    "Asset batch preflight could not confirm any project-local source candidates for the explicit source glob."
                )
            if details.get("runtime_available") is True:
                summary_parts.append(
                    "Asset batch preflight confirmed a running Asset Processor runtime through the admitted host probe."
                )
            else:
                summary_parts.append(
                    "Asset batch preflight could not confirm a running Asset Processor runtime in this admitted slice."
                )
            if details.get("execution_attempted") is True:
                summary_parts.append(
                    "Real asset.batch.process execution was attempted in this slice."
                )
            else:
                summary_parts.append(
                    "No real asset.batch.process execution was attempted in this admitted slice."
                )
            unavailable_reason = details.get("batch_unavailable_reason") or details.get(
                "result_unavailable_reason"
            )
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if asset_move_response is not None:
            details = asset_move_response.get("execution_details", {})
            source_path = details.get("source_path_relative_to_project_root") or details.get(
                "source_path_input"
            )
            destination_path = details.get("destination_path_relative_to_project_root") or details.get(
                "destination_path_input"
            )
            if isinstance(source_path, str) and isinstance(destination_path, str):
                if details.get("identity_corridor_available") is True:
                    summary_parts.append(
                        f"Asset move preflight confirmed a project-local identity corridor from {source_path} to {destination_path}."
                    )
                else:
                    summary_parts.append(
                        f"Asset move preflight could not confirm a mutation-ready identity corridor from {source_path} to {destination_path}."
                    )
            if details.get("execution_attempted") is True:
                summary_parts.append(
                    "Real asset.move.safe execution was attempted in this slice."
                )
            else:
                summary_parts.append(
                    "No real asset.move.safe execution was attempted in this admitted slice."
                )
            reference_reason = details.get("reference_unavailable_reason")
            if isinstance(reference_reason, str) and reference_reason:
                summary_parts.append(reference_reason)
            unavailable_reason = details.get("identity_corridor_unavailable_reason") or details.get(
                "move_unavailable_reason"
            )
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if render_capture_response is not None:
            details = render_capture_response.get("execution_details", {})
            if details.get("runtime_available") is True:
                summary_parts.append(
                    "Viewport capture runtime probe confirmed editor runtime context is available for explicit capture requests."
                )
            else:
                summary_parts.append(
                    "Viewport capture runtime evidence remains unavailable in this admitted slice."
                )
            if details.get("capture_artifact_produced") is True:
                artifact_path = details.get("capture_artifact_path")
                if artifact_path:
                    summary_parts.append(
                        f"Viewport capture evidence confirmed an artifact at {artifact_path}."
                    )
                else:
                    summary_parts.append(
                        "Viewport capture evidence confirmed a real capture artifact was produced."
                    )
            else:
                summary_parts.append(
                    "No real capture artifact was produced in this admitted slice."
                )
            unavailable_reason = details.get("capture_unavailable_reason")
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if render_material_response is not None:
            details = render_material_response.get("execution_details", {})
            if details.get("runtime_available") is True:
                summary_parts.append(
                    "Material inspection runtime probe confirmed editor runtime context is available for explicit inspection requests."
                )
            else:
                summary_parts.append(
                    "Material inspection runtime evidence remains unavailable in this admitted slice."
                )
            if details.get("material_evidence_produced") is True:
                summary_parts.append(
                    "Material inspection evidence confirmed a real material evidence record was produced."
                )
            else:
                summary_parts.append(
                    "No real material evidence was produced in this admitted slice."
                )
            unavailable_reason = details.get("material_unavailable_reason")
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if gem_enable_response is not None:
            details = gem_enable_response.get("execution_details", {})
            requested_gem_name = details.get("requested_gem_name")
            if isinstance(requested_gem_name, str) and requested_gem_name:
                if details.get("requested_gem_already_enabled") is True:
                    summary_parts.append(
                        f"Gem enable preflight confirmed manifest-backed gem state already contains {requested_gem_name}."
                    )
                else:
                    summary_parts.append(
                        f"Gem enable preflight confirmed explicit request evidence for {requested_gem_name}, but the Gem is not yet present in project.json."
                    )
            if details.get("configured_build_tree_available") is True:
                summary_parts.append(
                    "Gem enable preflight confirmed configured build tree evidence for downstream impact review."
                )
            else:
                summary_parts.append(
                    "Gem enable preflight recorded that configured build tree evidence remains unavailable for downstream impact review."
                )
            if details.get("execution_attempted") is True:
                summary_parts.append("Real gem.enable execution was attempted in this slice.")
            else:
                summary_parts.append(
                    "No real gem.enable execution was attempted in this admitted slice."
                )
            unavailable_reason = details.get("gem_unavailable_reason") or details.get(
                "result_unavailable_reason"
            )
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if build_compile_response is not None:
            details = build_compile_response.get("execution_details", {})
            if details.get("configured_build_tree_available") is True:
                summary_parts.append(
                    "Build compile preflight confirmed configured build tree evidence for the explicit target request."
                )
            else:
                summary_parts.append(
                    "Build compile preflight recorded that configured build tree evidence remains unavailable for the explicit target request."
                )
            if details.get("target_artifact_candidates_found_for_all_requested_targets") is True:
                summary_parts.append(
                    "Build compile preflight confirmed artifact candidate resolution for all explicit build targets."
                )
            else:
                summary_parts.append(
                    "Build compile preflight could not confirm artifact candidate resolution for all explicit build targets."
                )
            if details.get("execution_attempted") is True:
                summary_parts.append(
                    "Real build.compile execution was attempted in this slice."
                )
            else:
                summary_parts.append(
                    "No real build.compile execution was attempted in this admitted slice."
                )
            unavailable_reason = details.get("compile_unavailable_reason") or details.get(
                "result_unavailable_reason"
            )
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if gtest_response is not None:
            details = gtest_response.get("execution_details", {})
            if details.get("runner_runtime_available") is True:
                summary_parts.append(
                    "GTest preflight confirmed runnable target binaries for the explicit request."
                )
            else:
                summary_parts.append(
                    "GTest runner evidence remains partially unavailable for the explicit request."
                )
            if details.get("execution_attempted") is True:
                summary_parts.append(
                    "Native gtest execution was attempted in this slice."
                )
            else:
                summary_parts.append(
                    "No native gtest execution was attempted in this admitted slice."
                )
            unavailable_reason = details.get("runner_unavailable_reason") or details.get(
                "result_unavailable_reason"
            )
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if editor_python_response is not None:
            details = editor_python_response.get("execution_details", {})
            if details.get("runner_runtime_available") is True:
                summary_parts.append(
                    "Editor Python preflight confirmed admitted runner/runtime evidence for the explicit module request."
                )
            else:
                summary_parts.append(
                    "Editor Python runner evidence remains partially unavailable for the explicit module request."
                )
            if details.get("execution_attempted") is True:
                summary_parts.append(
                    "Editor-hosted Python test execution was attempted in this slice."
                )
            else:
                summary_parts.append(
                    "No editor-hosted Python test execution was attempted in this admitted slice."
                )
            unavailable_reason = details.get("runner_unavailable_reason") or details.get(
                "result_unavailable_reason"
            )
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if tiaf_response is not None:
            details = tiaf_response.get("execution_details", {})
            if details.get("runner_runtime_available") is True:
                summary_parts.append(
                    "TIAF preflight confirmed admitted runner/runtime evidence for the explicit sequence request."
                )
            else:
                summary_parts.append(
                    "TIAF runner evidence remains partially unavailable for the explicit sequence request."
                )
            if details.get("execution_attempted") is True:
                summary_parts.append(
                    "TIAF sequence execution was attempted in this slice."
                )
            else:
                summary_parts.append(
                    "No TIAF sequence execution was attempted in this admitted slice."
                )
            unavailable_reason = details.get("runner_unavailable_reason") or details.get(
                "result_unavailable_reason"
            )
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if visual_diff_response is not None:
            details = visual_diff_response.get("execution_details", {})
            comparison_status = details.get("comparison_status")
            if comparison_status == "identical":
                summary_parts.append(
                    "Artifact comparison confirmed matching file identity for the requested inputs."
                )
            elif comparison_status == "different":
                summary_parts.append(
                    "Artifact comparison confirmed differing file identity for the requested inputs."
                )
            else:
                summary_parts.append(
                    "Artifact comparison evidence remained partially unavailable for the requested inputs."
                )
            if (
                details.get("baseline_image_decodable") is True
                and details.get("candidate_image_decodable") is True
            ):
                summary_parts.append(
                    "Image decode confirmed baseline "
                    f"{details.get('baseline_image_width')}x{details.get('baseline_image_height')} "
                    f"{details.get('baseline_image_mode')} and candidate "
                    f"{details.get('candidate_image_width')}x{details.get('candidate_image_height')} "
                    f"{details.get('candidate_image_mode')}."
                )
            else:
                summary_parts.append(
                    "Image decode evidence remained partially unavailable for one or both requested inputs."
                )
            if details.get("visual_metric_available") is True:
                summary_parts.append(
                    f"Visual metric readback confirmed {details.get('visual_metric_name')} = {details.get('visual_metric_value')}."
                )
            else:
                summary_parts.append(
                    "Stronger visual diff metrics remain unavailable in this admitted slice."
                )

        if entity_response is not None:
            self._append_restore_boundary_summary(
                entity_response.get("execution_details", {}),
                summary_parts,
            )

        if not summary_parts:
            return None
        return " ".join(summary_parts)

    def _append_restore_boundary_summary(
        self,
        details: dict[str, Any],
        summary_parts: list[str],
    ) -> None:
        restore_boundary_id = details.get("restore_boundary_id")
        if not isinstance(restore_boundary_id, str) or not restore_boundary_id:
            return

        if details.get("restore_invoked") is True:
            restore_result = details.get("restore_result")
            if isinstance(restore_result, str) and restore_result:
                summary_parts.append(
                    f"Restore boundary {restore_boundary_id} was invoked with result {restore_result}."
                )
            else:
                summary_parts.append(
                    f"Restore boundary {restore_boundary_id} was invoked."
                )
            return

        if details.get("restore_boundary_available") is True:
            summary_parts.append(
                f"Restore boundary {restore_boundary_id} was captured before admitted editor mutation and remains available for the current subset."
            )


prompt_orchestrator_service = PromptOrchestratorService()
