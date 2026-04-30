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
_EDITOR_CHAIN_STEP_IDS = {
    "editor-session-1",
    "editor-level-1",
    "editor-entity-1",
    "editor-component-1",
    "editor-component-property-1",
    "editor-camera-bool-before-1",
    "editor-camera-bool-write-1",
    "editor-camera-bool-after-1",
    "editor-camera-bool-current-1",
    "editor-camera-bool-restore-1",
    "editor-camera-bool-restored-1",
}
_EDITOR_ENTITY_EXISTS_STEP_IDS = {
    "editor-session-1",
    "editor-level-1",
    "editor-entity-exists-1",
}
_EDITOR_PLACEMENT_PROOF_ONLY_STEP_IDS = {
    "editor-placement-proof-only-1",
}
_EDITOR_PROPERTY_REFUSAL_PREFIX = "editor.component.property.get"


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
                failure_summary = self._failure_summary(step.tool, response)
                review_summary = self._build_operator_review_summary(session)
                session.final_result_summary = (
                    f"{failure_summary}\n{review_summary}"
                    if review_summary
                    else failure_summary
                )
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

    def _latest_failed_response_for_step(
        self,
        session: PromptSessionRecord,
        step_id: str,
    ) -> dict[str, Any] | None:
        for response_record in reversed(session.latest_child_responses):
            if (
                response_record.get("prompt_step_id") == step_id
                and response_record.get("ok") is False
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
        editor_placement_proof_only_review_summary = (
            self._build_editor_placement_proof_only_review_summary(session)
        )
        if editor_placement_proof_only_review_summary is not None:
            return editor_placement_proof_only_review_summary

        entity_exists_review_summary = self._build_editor_entity_exists_review_summary(
            session
        )
        if entity_exists_review_summary is not None:
            return entity_exists_review_summary

        editor_review_summary = self._build_editor_chain_review_summary(session)
        if editor_review_summary is not None:
            return editor_review_summary

        entity_response = self._latest_successful_response_for_step(session, "editor-entity-1")
        component_response = self._latest_successful_response_for_step(session, "editor-component-1")
        component_find_response = self._latest_successful_response_for_step(
            session, "editor-component-find-1"
        )
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
        render_material_patch_response = self._latest_successful_response_for_step(
            session, "render-material-patch-1"
        )
        render_shader_response = self._latest_successful_response_for_step(
            session, "render-shader-1"
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

        if component_find_response is not None:
            details = component_find_response.get("execution_details", {})
            found = details.get("found")
            component_name = details.get("component_name")
            component_id = details.get("component_id")
            provenance = details.get("component_id_provenance")
            entity_label = details.get("entity_name") or details.get("entity_id")
            if found is True and component_name and component_id:
                summary_parts.append(
                    f"Readback bound live {component_name} component {component_id} on entity {entity_label} with provenance {provenance}."
                )
            elif found is False and component_name:
                summary_parts.append(
                    f"Readback confirmed no live {component_name} component target was found on entity {entity_label}."
                )

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
                material_path = details.get("material_path_relative_to_project_root") or details.get(
                    "material_path"
                )
                if isinstance(material_path, str) and material_path:
                    summary_parts.append(
                        f"Material inspection readback confirmed explicit local material evidence for {material_path}."
                    )
                else:
                    summary_parts.append(
                        "Material inspection evidence confirmed a real material evidence record was produced."
                    )
                property_value_count = details.get("property_value_count")
                if (
                    details.get("property_values_field_present") is True
                    and isinstance(property_value_count, int)
                ):
                    summary_parts.append(
                        f"Material readback confirmed {property_value_count} propertyValues entr{'y' if property_value_count == 1 else 'ies'}."
                    )
            else:
                summary_parts.append(
                    "No real material evidence was produced in this admitted slice."
                )
            runtime_readback_unavailable_reason = details.get(
                "material_runtime_readback_unavailable_reason"
            )
            if isinstance(runtime_readback_unavailable_reason, str) and runtime_readback_unavailable_reason:
                summary_parts.append(runtime_readback_unavailable_reason)
            shader_data_unavailable_reason = details.get("shader_data_unavailable_reason")
            if isinstance(shader_data_unavailable_reason, str) and shader_data_unavailable_reason:
                summary_parts.append(shader_data_unavailable_reason)
            references_unavailable_reason = details.get("references_unavailable_reason")
            if isinstance(references_unavailable_reason, str) and references_unavailable_reason:
                summary_parts.append(references_unavailable_reason)
            unavailable_reason = details.get("material_unavailable_reason")
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if render_material_patch_response is not None:
            details = render_material_patch_response.get("execution_details", {})
            material_path = details.get("material_path_relative_to_project_root") or details.get(
                "material_path_input"
            )
            mutation_applied = details.get("mutation_applied") is True
            mutation_blocked = details.get("mutation_blocked") is True
            if isinstance(material_path, str) and material_path:
                if mutation_applied:
                    summary_parts.append(
                        f"Material patch mutation wrote requested propertyValues overrides to {material_path} and verified the file write."
                    )
                elif mutation_blocked:
                    summary_parts.append(
                        f"Material patch preflight published a mutation-ready local propertyValues plan for {material_path}, but writes remain intentionally disabled."
                    )
                else:
                    summary_parts.append(
                        f"Material patch preflight confirmed explicit request evidence for {material_path}, but the request remained outside the first admitted write corridor."
                    )
                if details.get("post_patch_shader_preflight_review_attempted") is True:
                    shader_review = details.get("post_patch_shader_preflight_review", {})
                    shader_targets = details.get("post_patch_shader_preflight_review_requested_targets")
                    if not isinstance(shader_targets, list):
                        shader_targets = shader_review.get("requested_shader_targets", [])
                    shader_target_summary = (
                        ", ".join(str(item) for item in shader_targets)
                        if shader_targets
                        else "the explicit shader review targets"
                    )
                    if (
                        isinstance(shader_review, dict)
                        and shader_review.get("configured_build_tree_available") is True
                        and shader_review.get("shader_source_candidates_found_for_all_requested_targets")
                        is True
                    ):
                        summary_parts.append(
                            f"Post-patch shader preflight confirmed configured build-tree evidence and local shader source candidates for {shader_target_summary}; no shader rebuild command was executed."
                        )
                    else:
                        summary_parts.append(
                            f"Post-patch shader preflight could not fully confirm rebuild readiness for {shader_target_summary}."
                        )
                elif details.get("post_patch_shader_preflight_review_requested") is True:
                    summary_parts.append(
                        "Post-patch shader preflight review was requested but not attempted because no local material mutation was applied in this slice."
                    )
            if mutation_applied:
                summary_parts.append(
                    "Runtime material readback and shader rebuild remain unavailable beyond the admitted local material file mutation boundary."
                )
            elif details.get("execution_attempted") is True:
                summary_parts.append(
                    "Real render.material.patch execution was attempted in this slice."
                )
            else:
                summary_parts.append(
                    "No real render.material.patch execution was attempted in this admitted slice."
                )
            unavailable_reason = details.get("material_unavailable_reason") or details.get(
                "result_unavailable_reason"
            )
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)
            shader_review_unavailable_reason = details.get(
                "post_patch_shader_preflight_review_unavailable_reason"
            )
            if isinstance(shader_review_unavailable_reason, str) and shader_review_unavailable_reason:
                summary_parts.append(shader_review_unavailable_reason)

        if render_shader_response is not None:
            details = render_shader_response.get("execution_details", {})
            if details.get("configured_build_tree_available") is True:
                summary_parts.append(
                    "Shader rebuild preflight confirmed configured build tree evidence for the explicit shader target request."
                )
            else:
                summary_parts.append(
                    "Shader rebuild preflight recorded that configured build tree evidence remains unavailable for the explicit shader target request."
                )
            if details.get("shader_source_candidates_found_for_all_requested_targets") is True:
                summary_parts.append(
                    "Shader rebuild preflight confirmed shader source candidate resolution for all explicit shader targets."
                )
            else:
                summary_parts.append(
                    "Shader rebuild preflight could not confirm shader source candidate resolution for all explicit shader targets."
                )
            if details.get("execution_attempted") is True:
                summary_parts.append(
                    "Real render.shader.rebuild execution was attempted in this slice."
                )
            else:
                summary_parts.append(
                    "No real render.shader.rebuild execution was attempted in this admitted slice."
                )
            unavailable_reason = details.get("shader_rebuild_unavailable_reason") or details.get(
                "result_unavailable_reason"
            )
            if isinstance(unavailable_reason, str) and unavailable_reason:
                summary_parts.append(unavailable_reason)

        if gem_enable_response is not None:
            details = gem_enable_response.get("execution_details", {})
            requested_gem_name = details.get("requested_gem_name")
            mutation_applied = details.get("mutation_applied") is True
            mutation_blocked = details.get("mutation_blocked") is True
            if isinstance(requested_gem_name, str) and requested_gem_name:
                if mutation_applied:
                    summary_parts.append(
                        f"Gem enable mutation inserted {requested_gem_name} into project.json and verified the manifest write."
                    )
                elif details.get("requested_gem_already_enabled") is True:
                    summary_parts.append(
                        f"Gem enable preflight confirmed manifest-backed gem state already contains {requested_gem_name}."
                    )
                elif mutation_blocked:
                    summary_parts.append(
                        f"Gem enable preflight published a mutation-ready local gem_names insertion plan for {requested_gem_name}, but writes remain intentionally disabled."
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
            if mutation_applied:
                summary_parts.append(
                    "Real gem.enable mutation completed within the admitted backup and rollback boundary."
                )
            elif details.get("execution_attempted") is True:
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
            result_status = str(details.get("result_status", "")).strip()
            if details.get("execution_attempted") is True:
                if result_status == "succeeded":
                    summary_parts.append(
                        "Real build.compile execution was attempted in this slice, returned exit code 0, and generic post-run candidate revalidation observed build-output evidence."
                    )
                elif result_status == "attempted_but_output_unverified":
                    summary_parts.append(
                        "Real build.compile execution was attempted in this slice, returned exit code 0, but generic post-run candidate revalidation did not prove compiled output changes."
                    )
                elif result_status == "failed_exit_code" and details.get("exit_code_available") is True:
                    summary_parts.append(
                        f"Real build.compile execution was attempted in this slice and returned exit code {details.get('exit_code')}."
                    )
                elif result_status == "timed_out" or details.get("runner_timed_out") is True:
                    summary_parts.append(
                        "Real build.compile execution was attempted in this slice but timed out before an exit code was captured."
                    )
                else:
                    summary_parts.append(
                        "Real build.compile execution was attempted in this slice."
                    )
                if details.get("target_candidate_revalidation_attempted") is True:
                    changed_count = details.get("target_candidate_revalidation_changed_count")
                    if isinstance(changed_count, int):
                        summary_parts.append(
                            "Generic post-run candidate revalidation compared the pre-discovered build artifact candidates and observed "
                            f"{changed_count} provable change(s)."
                        )
                if details.get("result_artifact_produced") is True:
                    summary_parts.append(
                        "Build compile runner log evidence was retained for this explicit target request."
                    )
                else:
                    summary_parts.append(
                        "Build compile runner log evidence was not retained for this explicit target request."
                    )
            else:
                if result_status == "not_attempted_missing_runner":
                    summary_parts.append(
                        "No real build.compile execution was attempted because no admitted build runner was available for the explicit target request."
                    )
                elif result_status == "not_attempted_policy_blocked":
                    summary_parts.append(
                        "No real build.compile execution was attempted because policy did not admit runner execution for this explicit target request."
                    )
                else:
                    summary_parts.append(
                        "No real build.compile execution was attempted in this admitted slice."
                    )
            if details.get("compiled_output_verified") is True:
                verification_basis = details.get("compiled_output_verification_basis")
                if isinstance(verification_basis, str) and verification_basis:
                    summary_parts.append(verification_basis)
            output_unavailable_reason = details.get("compile_output_artifact_unavailable_reason")
            if isinstance(output_unavailable_reason, str) and output_unavailable_reason:
                summary_parts.append(output_unavailable_reason)
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

    def _build_editor_chain_review_summary(
        self,
        session: PromptSessionRecord,
    ) -> str | None:
        planned_steps = session.plan.steps if session.plan is not None else []
        if not any(step.step_id in _EDITOR_CHAIN_STEP_IDS for step in planned_steps):
            return None

        session_response = self._latest_successful_response_for_step(session, "editor-session-1")
        level_response = self._latest_successful_response_for_step(session, "editor-level-1")
        entity_response = self._latest_successful_response_for_step(session, "editor-entity-1")
        component_response = self._latest_successful_response_for_step(session, "editor-component-1")
        component_find_response = self._latest_successful_response_for_step(
            session, "editor-component-find-1"
        )
        camera_bool_before_response = self._latest_successful_response_for_step(
            session,
            "editor-camera-bool-before-1",
        )
        camera_bool_write_response = self._latest_successful_response_for_step(
            session,
            "editor-camera-bool-write-1",
        )
        camera_bool_after_response = self._latest_successful_response_for_step(
            session,
            "editor-camera-bool-after-1",
        )
        camera_bool_current_response = self._latest_successful_response_for_step(
            session,
            "editor-camera-bool-current-1",
        )
        camera_bool_restore_response = self._latest_successful_response_for_step(
            session,
            "editor-camera-bool-restore-1",
        )
        camera_bool_restored_response = self._latest_successful_response_for_step(
            session,
            "editor-camera-bool-restored-1",
        )
        property_response = self._latest_successful_response_for_step(
            session, "editor-component-property-1"
        ) or camera_bool_after_response or camera_bool_restored_response
        failed_response = None
        if session.status != PromptSessionStatus.COMPLETED:
            failed_response = next(
                (
                    response_record
                    for response_record in reversed(session.latest_child_responses)
                    if response_record.get("ok") is False
                    and response_record.get("prompt_step_id") in _EDITOR_CHAIN_STEP_IDS
                    and (
                        not isinstance(response_record.get("error"), dict)
                        or response_record["error"].get("code") != "APPROVAL_REQUIRED"
                    )
                ),
                None,
            )

        result_label = self._classify_editor_chain_review(
            session=session,
            failed_response=failed_response,
            property_response=property_response,
            camera_bool_write_response=camera_bool_write_response,
            camera_bool_restore_response=camera_bool_restore_response,
        )
        executed_actions = self._editor_executed_actions(
            session_response=session_response,
            level_response=level_response,
            entity_response=entity_response,
            component_response=component_response,
            component_find_response=component_find_response,
            property_response=property_response,
            camera_bool_before_response=camera_bool_before_response,
            camera_bool_write_response=camera_bool_write_response,
            camera_bool_after_response=camera_bool_after_response,
            camera_bool_current_response=camera_bool_current_response,
            camera_bool_restore_response=camera_bool_restore_response,
            camera_bool_restored_response=camera_bool_restored_response,
            failed_response=failed_response,
        )
        verified_facts = self._editor_verified_facts(
            entity_response=entity_response,
            component_response=component_response,
            component_find_response=component_find_response,
            property_response=property_response,
            camera_bool_before_response=camera_bool_before_response,
            camera_bool_write_response=camera_bool_write_response,
            camera_bool_after_response=camera_bool_after_response,
            camera_bool_current_response=camera_bool_current_response,
            camera_bool_restore_response=camera_bool_restore_response,
            camera_bool_restored_response=camera_bool_restored_response,
        )
        assumptions = self._editor_review_assumptions(
            session=session,
            entity_response=entity_response,
            component_response=component_response,
            component_find_response=component_find_response,
            property_response=property_response,
            camera_bool_write_response=camera_bool_write_response,
            camera_bool_restore_response=camera_bool_restore_response,
        )
        missing_proof = self._editor_missing_proof(
            session=session,
            result_label=result_label,
            failed_response=failed_response,
            property_response=property_response,
            camera_bool_write_response=camera_bool_write_response,
            camera_bool_restore_response=camera_bool_restore_response,
        )
        safest_next_step = self._editor_safest_next_step(result_label=result_label)

        sections = [
            f"Review result: {result_label}",
            f"Requested action: {session.prompt_text}",
            self._format_review_section("Executed action", executed_actions),
            self._format_review_section("Verified facts", verified_facts),
            self._format_review_section("Assumptions", assumptions),
            self._format_review_section("Missing proof", missing_proof),
            f"Safest next step: {safest_next_step}",
        ]
        return "\n".join(sections)

    def _build_editor_placement_proof_only_review_summary(
        self,
        session: PromptSessionRecord,
    ) -> str | None:
        planned_steps = session.plan.steps if session.plan is not None else []
        if not any(
            step.step_id in _EDITOR_PLACEMENT_PROOF_ONLY_STEP_IDS for step in planned_steps
        ):
            return None

        placement_response = self._latest_successful_response_for_step(
            session,
            "editor-placement-proof-only-1",
        )
        failed_response = None
        if session.status != PromptSessionStatus.COMPLETED:
            failed_response = next(
                (
                    response_record
                    for response_record in reversed(session.latest_child_responses)
                    if response_record.get("ok") is False
                    and response_record.get("prompt_step_id")
                    in _EDITOR_PLACEMENT_PROOF_ONLY_STEP_IDS
                    and (
                        not isinstance(response_record.get("error"), dict)
                        or response_record["error"].get("code") != "APPROVAL_REQUIRED"
                    )
                ),
                None,
            )

        result_label = "incomplete_proof_unavailable"
        if failed_response is not None:
            result_label = "failed_runtime_error"
        elif placement_response is not None:
            details = placement_response.get("execution_details", {})
            execution_admitted = details.get("execution_admitted")
            placement_write_admitted = details.get("placement_write_admitted")
            mutation_occurred = details.get("mutation_occurred")
            proof_status = details.get("proof_status")
            if (
                execution_admitted is False
                and placement_write_admitted is False
                and mutation_occurred is False
            ):
                if proof_status == "approval-required":
                    result_label = "blocked_approval_required"
                else:
                    result_label = "succeeded_fail_closed_blocked"
            else:
                result_label = "incomplete_non_admission_unverified"

        executed_actions: list[str] = []
        verified_facts: list[str] = []
        assumptions: list[str] = []
        missing_proof: list[str] = []
        safest_next_step = (
            "Use the recorded bounded proof-only candidate for operator review; keep runtime placement blocked."
        )

        if placement_response is not None:
            details = placement_response.get("execution_details", {})
            candidate_id = details.get("candidate_id")
            candidate_label = details.get("candidate_label")
            staged_source = details.get("staged_source_relative_path")
            target_level = details.get("target_level_relative_path")
            target_entity = details.get("target_entity_name")
            target_component = details.get("target_component")

            executed_actions.append(
                "Evaluated the bounded editor placement proof-only request through the fail-closed candidate corridor."
            )
            if candidate_id and candidate_label:
                executed_actions.append(
                    f"Recorded candidate {candidate_id} ({candidate_label}) for review-only placement evidence."
                )
            if staged_source and target_level:
                executed_actions.append(
                    f"Bound staged source {staged_source} to target level {target_level} without admitting runtime placement."
                )

            verified_facts.append(
                "Capability editor.placement.proof_only executed as simulated proof-only evidence."
            )
            if target_entity and target_component:
                verified_facts.append(
                    f"Placement target scope captured entity {target_entity} with component {target_component}."
                )
            verified_facts.append(
                "Non-admission flags recorded: "
                f"execution_admitted={details.get('execution_admitted')}, "
                f"placement_write_admitted={details.get('placement_write_admitted')}, "
                f"mutation_occurred={details.get('mutation_occurred')}, "
                f"read_only={details.get('read_only')}."
            )
            fail_closed_reasons = details.get("fail_closed_reasons")
            if isinstance(fail_closed_reasons, list) and fail_closed_reasons:
                reasons = ", ".join(str(item) for item in fail_closed_reasons[:5])
                verified_facts.append(f"Fail-closed reasons captured: {reasons}.")

            assumptions.append(
                "Client approval fields are treated as intent evidence only and are not authorization for runtime placement execution."
            )
            assumptions.append(
                "The review relies on persisted bounded candidate evidence from the admitted proof-only corridor."
            )

            missing_proof.append(
                "No editor placement runtime command was admitted or executed."
            )
            missing_proof.append(
                "No level/prefab mutation, broad scene mutation, or generalized placement corridor was admitted."
            )
            missing_proof.append(
                "This review does not claim real placement execution, readback of placed runtime state, or restore execution."
            )
            safest_next_step = (
                str(details.get("safest_next_step"))
                if isinstance(details.get("safest_next_step"), str)
                and str(details.get("safest_next_step"))
                else safest_next_step
            )
        elif failed_response is not None:
            error = failed_response.get("error", {})
            message = error.get("message") if isinstance(error, dict) else None
            executed_actions.append(
                "Prompt execution stopped before proof-only placement evidence could be finalized."
            )
            missing_proof.append(
                message
                if isinstance(message, str) and message
                else "The proof-only placement step failed before persisted evidence was available."
            )
            assumptions.append(
                "No bounded proof-only placement evidence record is available because the step failed."
            )
            safest_next_step = (
                "Review the recorded failure details, then retry the same bounded proof-only request without widening scope."
            )
        else:
            missing_proof.append(
                "No successful bounded proof-only placement evidence record was produced."
            )
            assumptions.append(
                "Prompt completion did not produce proof-only placement evidence for this step."
            )

        sections = [
            f"Review result: {result_label}",
            f"Requested action: {session.prompt_text}",
            self._format_review_section("Executed action", executed_actions),
            self._format_review_section("Verified facts", verified_facts),
            self._format_review_section("Assumptions", assumptions),
            self._format_review_section("Missing proof", missing_proof),
            f"Safest next step: {safest_next_step}",
        ]
        return "\n".join(sections)

    def _build_editor_entity_exists_review_summary(
        self,
        session: PromptSessionRecord,
    ) -> str | None:
        planned_steps = session.plan.steps if session.plan is not None else []
        if not any(step.step_id == "editor-entity-exists-1" for step in planned_steps):
            return None

        session_response = self._latest_successful_response_for_step(session, "editor-session-1")
        level_response = self._latest_successful_response_for_step(session, "editor-level-1")
        exists_response = self._latest_successful_response_for_step(
            session,
            "editor-entity-exists-1",
        )
        failed_response = None
        if session.status != PromptSessionStatus.COMPLETED:
            failed_response = next(
                (
                    response_record
                    for response_record in reversed(session.latest_child_responses)
                    if response_record.get("ok") is False
                    and response_record.get("prompt_step_id") in _EDITOR_ENTITY_EXISTS_STEP_IDS
                    and (
                        not isinstance(response_record.get("error"), dict)
                        or response_record["error"].get("code") != "APPROVAL_REQUIRED"
                    )
                ),
                None,
            )

        result_label = self._classify_editor_entity_exists_review(
            failed_response=failed_response,
            exists_response=exists_response,
        )
        sections = [
            f"Review result: {result_label}",
            f"Requested action: {session.prompt_text}",
            self._format_review_section(
                "Executed action",
                self._editor_entity_exists_executed_actions(
                    session_response=session_response,
                    level_response=level_response,
                    exists_response=exists_response,
                    failed_response=failed_response,
                ),
            ),
            self._format_review_section(
                "Verified facts",
                self._editor_entity_exists_verified_facts(
                    exists_response=exists_response,
                ),
            ),
            self._format_review_section(
                "Assumptions",
                self._editor_entity_exists_assumptions(
                    exists_response=exists_response,
                ),
            ),
            self._format_review_section(
                "Missing proof",
                self._editor_entity_exists_missing_proof(
                    result_label=result_label,
                    failed_response=failed_response,
                    exists_response=exists_response,
                ),
            ),
            (
                "Safest next step: "
                f"{self._editor_entity_exists_safest_next_step(result_label=result_label)}"
            ),
        ]
        return "\n".join(sections)

    def _classify_editor_entity_exists_review(
        self,
        *,
        failed_response: dict[str, Any] | None,
        exists_response: dict[str, Any] | None,
    ) -> str:
        if failed_response is not None:
            step_id = failed_response.get("prompt_step_id")
            error = failed_response.get("error", {})
            details = error.get("details") if isinstance(error, dict) else {}
            details = details if isinstance(details, dict) else {}
            preflight_reason = details.get("preflight_reason")
            if step_id == "editor-session-1":
                return "blocked_missing_editor_target"
            if step_id == "editor-level-1" or preflight_reason in {
                "level-not-loaded",
                "loaded-level-mismatch",
            }:
                return "blocked_missing_level"
            if preflight_reason == "ambiguous-entity-lookup":
                return "blocked_ambiguous_entity_lookup"
            return "failed_runtime_error"

        if exists_response is None:
            return "incomplete_readback_unavailable"
        details = exists_response.get("execution_details", {})
        if details.get("exists") is False:
            return "succeeded_absence_verified"
        if details.get("exists") is True:
            return "succeeded_readback_verified"
        return "incomplete_readback_unavailable"

    def _editor_entity_exists_executed_actions(
        self,
        *,
        session_response: dict[str, Any] | None,
        level_response: dict[str, Any] | None,
        exists_response: dict[str, Any] | None,
        failed_response: dict[str, Any] | None,
    ) -> list[str]:
        actions: list[str] = []
        if session_response is not None:
            actions.append(
                "Attached or validated the editor target through the admitted real editor session path."
            )
        if level_response is not None:
            details = level_response.get("execution_details", {})
            level_path = details.get("level_path") or details.get("loaded_level_path")
            if level_path:
                actions.append(f"Opened level {level_path} for read-only entity existence review.")
        if exists_response is not None:
            details = exists_response.get("execution_details", {})
            lookup_mode = details.get("lookup_mode")
            requested_entity = (
                details.get("requested_entity_name")
                or details.get("requested_entity_id")
                or details.get("entity_name")
                or details.get("entity_id")
            )
            if lookup_mode and requested_entity:
                actions.append(
                    f"Checked entity existence by {lookup_mode} lookup for {requested_entity}."
                )
            else:
                actions.append("Checked entity existence through the admitted read-only path.")
        if failed_response is not None:
            failed_step_id = failed_response.get("prompt_step_id")
            if failed_step_id == "editor-entity-exists-1":
                actions.append("Stopped before entity existence readback could be verified.")
            elif failed_step_id == "editor-level-1":
                actions.append("Stopped before the requested editor level could be confirmed.")
            elif failed_step_id == "editor-session-1":
                actions.append("Stopped before an admitted editor target could be confirmed.")
        return actions

    def _editor_entity_exists_verified_facts(
        self,
        *,
        exists_response: dict[str, Any] | None,
    ) -> list[str]:
        if exists_response is None:
            return []
        details = exists_response.get("execution_details", {})
        exists = details.get("exists")
        lookup_mode = details.get("lookup_mode")
        level_path = details.get("level_path") or details.get("loaded_level_path")
        entity_name = details.get("entity_name") or details.get("requested_entity_name")
        entity_id = details.get("entity_id") or details.get("requested_entity_id")
        matched_count = details.get("matched_count")
        if exists is True:
            entity_label = entity_name or entity_id or "the requested entity"
            id_suffix = f" ({entity_id})" if entity_id and entity_id != entity_label else ""
            level_suffix = f" in {level_path}" if level_path else ""
            matched_suffix = (
                f" with matched_count={matched_count}"
                if matched_count is not None
                else ""
            )
            return [
                (
                    f"Readback confirmed {entity_label}{id_suffix} exists"
                    f"{level_suffix} via {lookup_mode} lookup{matched_suffix}."
                )
            ]
        if exists is False:
            requested_entity = details.get("requested_entity_name") or details.get(
                "requested_entity_id"
            )
            requested_entity = requested_entity or "the requested entity"
            level_suffix = f" in {level_path}" if level_path else ""
            return [
                (
                    f"Readback confirmed {requested_entity} was not found"
                    f"{level_suffix} on the admitted exact lookup path."
                )
            ]
        return ["Entity existence readback completed, but the exists field was unavailable."]

    def _editor_entity_exists_assumptions(
        self,
        *,
        exists_response: dict[str, Any] | None,
    ) -> list[str]:
        if exists_response is None:
            return [
                "No entity existence readback result is available yet for this prompt review."
            ]
        details = exists_response.get("execution_details", {})
        lookup_mode = details.get("lookup_mode")
        if lookup_mode == "entity_name":
            return [
                "Exact-name lookup is treated as verified only for the loaded/current level reported by the runtime."
            ]
        if lookup_mode == "entity_id":
            return [
                "Explicit entity-id lookup is treated as verified only for the loaded/current level reported by the runtime."
            ]
        return [
            "The review relies on the admitted typed prompt plan and recorded editor runtime details."
        ]

    def _editor_entity_exists_missing_proof(
        self,
        *,
        result_label: str,
        failed_response: dict[str, Any] | None,
        exists_response: dict[str, Any] | None,
    ) -> list[str]:
        missing_proof: list[str] = []
        if result_label == "blocked_missing_editor_target":
            missing_proof.append(
                "No admitted editor target could be confirmed for the requested readback."
            )
        elif result_label == "blocked_missing_level":
            missing_proof.append(
                "A loaded or explicitly opened level was not proven for the requested readback."
            )
        elif result_label == "blocked_ambiguous_entity_lookup":
            missing_proof.append(
                "The exact-name lookup was ambiguous and no arbitrary entity selection was made."
            )
        elif result_label == "failed_runtime_error":
            error = failed_response.get("error", {}) if failed_response is not None else {}
            error_message = error.get("message") if isinstance(error, dict) else None
            missing_proof.append(
                error_message
                if isinstance(error_message, str) and error_message
                else "The admitted read-only entity existence path stopped on a runtime-side failure."
            )
        elif result_label == "incomplete_readback_unavailable":
            missing_proof.append(
                "Entity existence readback did not produce verified evidence on the admitted path."
            )

        if exists_response is not None:
            missing_proof.append(
                "No cleanup or restore was executed or needed by this read-only proof."
            )
        missing_proof.append(
            "This review does not claim entity creation, component changes, property "
            "writes, delete, parenting, prefab, material, asset, render, build, "
            "arbitrary Editor Python, live Editor undo, viewport reload, entity "
            "absence after restore, or reversibility."
        )
        return missing_proof

    def _editor_entity_exists_safest_next_step(self, *, result_label: str) -> str:
        if result_label == "blocked_missing_editor_target":
            return (
                "Ensure an attachable Editor target is available, then rerun the same admitted readback."
            )
        if result_label == "blocked_missing_level":
            return (
                "Open or confirm an explicit level path before retrying the admitted entity existence readback."
            )
        if result_label == "blocked_ambiguous_entity_lookup":
            return (
                "Retry with an explicit entity id or a unique exact entity name instead of broadening into scene discovery."
            )
        if result_label == "failed_runtime_error":
            return "Review the recorded bridge/runtime error details before retrying the same admitted readback."
        if result_label == "succeeded_absence_verified":
            return (
                "If presence was expected, confirm the loaded level and retry with an explicit entity id or unique exact name."
            )
        if result_label == "incomplete_readback_unavailable":
            return "Retry the same admitted read-only lookup after confirming bridge and level readiness."
        return (
            "Use the recorded readback evidence for review, or run another admitted read-only check without widening editor control."
        )

    def _classify_editor_chain_review(
        self,
        *,
        session: PromptSessionRecord,
        failed_response: dict[str, Any] | None,
        property_response: dict[str, Any] | None,
        camera_bool_write_response: dict[str, Any] | None,
        camera_bool_restore_response: dict[str, Any] | None,
    ) -> str:
        if failed_response is not None:
            step_id = failed_response.get("prompt_step_id")
            error = failed_response.get("error", {})
            details = error.get("details") if isinstance(error, dict) else {}
            details = details if isinstance(details, dict) else {}
            preflight_reason = details.get("preflight_reason")
            if preflight_reason == "unsupported-component-surface":
                return "blocked_component_not_allowlisted"
            if step_id == "editor-session-1":
                return "blocked_missing_editor_target"
            if preflight_reason in {"level-not-loaded", "loaded-level-mismatch"}:
                return "blocked_missing_level"
            if step_id == "editor-level-1":
                return "blocked_missing_level"
            return "failed_runtime_error"

        requested_property_read = any(
            refusal.startswith(_EDITOR_PROPERTY_REFUSAL_PREFIX)
            for refusal in session.refused_capabilities
        )
        if requested_property_read and property_response is None:
            return "incomplete_readback_unavailable"
        requested_camera_bool_write = any(
            step.step_id == "editor-camera-bool-write-1"
            for step in (session.plan.steps if session.plan is not None else [])
        )
        if requested_camera_bool_write and camera_bool_write_response is None:
            return "incomplete_write_unavailable"
        requested_camera_bool_restore = any(
            step.step_id == "editor-camera-bool-restore-1"
            for step in (session.plan.steps if session.plan is not None else [])
        )
        if requested_camera_bool_restore and camera_bool_restore_response is None:
            return "incomplete_restore_unavailable"
        if session.refused_capabilities:
            return "succeeded_partially_verified"
        return "succeeded_verified"

    def _editor_executed_actions(
        self,
        *,
        session_response: dict[str, Any] | None,
        level_response: dict[str, Any] | None,
        entity_response: dict[str, Any] | None,
        component_response: dict[str, Any] | None,
        component_find_response: dict[str, Any] | None,
        property_response: dict[str, Any] | None,
        camera_bool_before_response: dict[str, Any] | None,
        camera_bool_write_response: dict[str, Any] | None,
        camera_bool_after_response: dict[str, Any] | None,
        camera_bool_current_response: dict[str, Any] | None,
        camera_bool_restore_response: dict[str, Any] | None,
        camera_bool_restored_response: dict[str, Any] | None,
        failed_response: dict[str, Any] | None,
    ) -> list[str]:
        actions: list[str] = []
        if session_response is not None:
            actions.append(
                "Attached or validated the editor target through the admitted real editor session path."
            )

        if level_response is not None:
            details = level_response.get("execution_details", {})
            level_path = details.get("level_path") or details.get("loaded_level_path")
            if details.get("created_level") is True and level_path:
                actions.append(f"Created and opened level {level_path}.")
            elif level_path:
                actions.append(f"Opened level {level_path}.")

        entity_details = entity_response.get("execution_details", {}) if entity_response else {}
        component_details = (
            component_response.get("execution_details", {}) if component_response else {}
        )
        component_find_details = (
            component_find_response.get("execution_details", {})
            if component_find_response
            else {}
        )
        property_details = (
            property_response.get("execution_details", {}) if property_response else {}
        )

        entity_id = entity_details.get("entity_id")
        entity_name = entity_details.get("entity_name")
        if entity_id and entity_name:
            actions.append(f"Created entity '{entity_name}' with id {entity_id}.")

        added_components = component_details.get("added_components")
        if isinstance(added_components, list) and added_components:
            component_list = ", ".join(str(item) for item in added_components)
            if component_details.get("entity_id") == entity_id and entity_id:
                actions.append(
                    f"Bound created entity id {entity_id} into component attachment and added {component_list}."
                )
            else:
                actions.append(f"Added component(s) {component_list}.")

        added_component_refs = component_details.get("added_component_refs")
        property_component_id = property_details.get("component_id")
        if (
            isinstance(added_component_refs, list)
            and added_component_refs
            and isinstance(added_component_refs[0], dict)
            and property_component_id
            and added_component_refs[0].get("component_id") == property_component_id
        ):
            actions.append(
                f"Bound added component id {property_component_id} into the "
                "admitted property readback step automatically."
            )
        found_component_id = component_find_details.get("component_id")
        found_component_name = component_find_details.get("component_name")
        found_entity_label = (
            component_find_details.get("entity_name")
            or component_find_details.get("entity_id")
        )
        if found_component_id and found_component_name:
            if found_entity_label:
                actions.append(
                    f"Bound live {found_component_name} component {found_component_id} "
                    f"on entity {found_entity_label}."
                )
            else:
                actions.append(
                    f"Bound live {found_component_name} component {found_component_id}."
                )
        if found_component_id and property_component_id == found_component_id:
            actions.append(
                f"Bound discovered component id {property_component_id} into the "
                "admitted property readback step automatically."
            )
        if property_response is not None:
            property_path = property_details.get("property_path")
            if property_path:
                actions.append(f"Read back component property {property_path}.")
        if camera_bool_before_response is not None:
            details = camera_bool_before_response.get("execution_details", {})
            property_path = details.get("property_path")
            value = details.get("value")
            if property_path is not None:
                actions.append(
                    f"Pre-read exact Camera bool property {property_path} = {value}."
                )
        if camera_bool_write_response is not None:
            details = camera_bool_write_response.get("execution_details", {})
            property_path = details.get("property_path")
            requested_value = details.get("requested_value")
            if property_path is not None:
                actions.append(
                    "Wrote exact admitted Camera bool property "
                    f"{property_path} to {requested_value}."
                )
        if camera_bool_after_response is not None:
            details = camera_bool_after_response.get("execution_details", {})
            property_path = details.get("property_path")
            value = details.get("value")
            if property_path is not None:
                actions.append(
                    f"Post-read exact Camera bool property {property_path} = {value}."
                )
        if camera_bool_current_response is not None:
            details = camera_bool_current_response.get("execution_details", {})
            property_path = details.get("property_path")
            value = details.get("value")
            if property_path is not None:
                actions.append(
                    f"Pre-restore read exact Camera bool property {property_path} = {value}."
                )
        if camera_bool_restore_response is not None:
            details = camera_bool_restore_response.get("execution_details", {})
            property_path = details.get("property_path")
            restored_value = details.get("restored_value", details.get("requested_value"))
            if property_path is not None:
                actions.append(
                    "Restored exact admitted Camera bool property "
                    f"{property_path} to recorded before_value {restored_value}."
                )
        if camera_bool_restored_response is not None:
            details = camera_bool_restored_response.get("execution_details", {})
            property_path = details.get("property_path")
            value = details.get("value")
            if property_path is not None:
                actions.append(
                    f"Post-restore read exact Camera bool property {property_path} = {value}."
                )

        if failed_response is not None:
            failed_step_id = failed_response.get("prompt_step_id")
            if failed_step_id == "editor-component-1":
                actions.append("Stopped before component attachment could be verified.")
            elif failed_step_id == "editor-component-property-1":
                actions.append("Stopped before requested component/property readback could be verified.")
            elif failed_step_id == "editor-camera-bool-before-1":
                actions.append(
                    "Stopped before exact Camera bool pre-write readback could be verified."
                )
            elif failed_step_id == "editor-camera-bool-write-1":
                actions.append(
                    "Stopped before exact Camera bool write verification could complete."
                )
            elif failed_step_id == "editor-camera-bool-after-1":
                actions.append(
                    "Stopped before exact Camera bool post-write readback could be verified."
                )
            elif failed_step_id == "editor-camera-bool-current-1":
                actions.append(
                    "Stopped before exact Camera bool pre-restore readback could be verified."
                )
            elif failed_step_id == "editor-camera-bool-restore-1":
                actions.append(
                    "Stopped before exact Camera bool restore verification could complete."
                )
            elif failed_step_id == "editor-camera-bool-restored-1":
                actions.append(
                    "Stopped before exact Camera bool post-restore readback could be verified."
                )
            elif failed_step_id == "editor-level-1":
                actions.append("Stopped before the requested editor level could be confirmed.")
            elif failed_step_id == "editor-session-1":
                actions.append("Stopped before an admitted editor target could be confirmed.")

        return actions

    def _editor_verified_facts(
        self,
        *,
        entity_response: dict[str, Any] | None,
        component_response: dict[str, Any] | None,
        component_find_response: dict[str, Any] | None,
        property_response: dict[str, Any] | None,
        camera_bool_before_response: dict[str, Any] | None,
        camera_bool_write_response: dict[str, Any] | None,
        camera_bool_after_response: dict[str, Any] | None,
        camera_bool_current_response: dict[str, Any] | None,
        camera_bool_restore_response: dict[str, Any] | None,
        camera_bool_restored_response: dict[str, Any] | None,
    ) -> list[str]:
        facts: list[str] = []
        if entity_response is not None:
            details = entity_response.get("execution_details", {})
            entity_name = details.get("entity_name")
            entity_id = details.get("entity_id")
            level_path = details.get("level_path") or details.get("loaded_level_path")
            if entity_name and entity_id and level_path:
                facts.append(
                    f"Readback confirmed entity '{entity_name}' ({entity_id}) in {level_path}."
                )
            elif entity_name and entity_id:
                facts.append(f"Readback confirmed entity '{entity_name}' ({entity_id}).")
            facts.extend(self._restore_boundary_summary_items(details))

        if component_response is not None:
            details = component_response.get("execution_details", {})
            added_components = details.get("added_components")
            entity_id = details.get("entity_id")
            if isinstance(added_components, list) and added_components:
                component_list = ", ".join(str(item) for item in added_components)
                if entity_id:
                    facts.append(
                        f"Readback confirmed added component(s) {component_list} on entity {entity_id}."
                    )
                else:
                    facts.append(
                        f"Readback confirmed added component(s) {component_list}."
                    )
            facts.extend(self._restore_boundary_summary_items(details))

        if component_find_response is not None:
            details = component_find_response.get("execution_details", {})
            found = details.get("found")
            component_name = details.get("component_name")
            component_id = details.get("component_id")
            provenance = details.get("component_id_provenance")
            entity_label = details.get("entity_name") or details.get("entity_id")
            if found is True and component_name and component_id:
                facts.append(
                    f"Readback bound live {component_name} component {component_id} "
                    f"on entity {entity_label} with provenance {provenance}."
                )
            elif found is False and component_name:
                facts.append(
                    f"Readback confirmed no live {component_name} component target "
                    f"was found on entity {entity_label}."
                )

        if property_response is not None:
            details = property_response.get("execution_details", {})
            property_path = details.get("property_path")
            value = details.get("value")
            value_type = details.get("value_type")
            read_only = details.get("read_only", True)
            write_occurred = details.get("write_occurred", False)
            if property_path is not None and value is not None:
                component_id = details.get("component_id")
                component_find_details = (
                    component_find_response.get("execution_details", {})
                    if component_find_response
                    else {}
                )
                component_details = (
                    component_response.get("execution_details", {})
                    if component_response
                    else {}
                )
                component_name = component_find_details.get("component_name")
                entity_label = (
                    component_find_details.get("entity_name")
                    or component_find_details.get("entity_id")
                )
                if not component_name:
                    added_refs = component_details.get("added_component_refs")
                    added_components = component_details.get("added_components")
                    if (
                        isinstance(added_refs, list)
                        and added_refs
                        and isinstance(added_refs[0], dict)
                        and added_refs[0].get("component_id") == component_id
                        and isinstance(added_components, list)
                        and added_components
                    ):
                        component_name = str(added_components[0])
                    entity_label = entity_label or component_details.get("entity_id")
                if (
                    component_name == "Camera"
                    and property_path
                    == "Controller|Configuration|Make active camera on activation?"
                    and isinstance(value, bool)
                ):
                    facts.append(
                        "Camera bool readback target "
                        f"entity {entity_label or 'unknown'}, component Camera, "
                        f"property {property_path}; value_type={value_type or 'bool'}, "
                        f"current_value={value}, read_only={read_only}, "
                        f"write_occurred={write_occurred}."
                    )
                else:
                    facts.append(f"Readback confirmed {property_path} = {value}.")
        if camera_bool_before_response is not None:
            details = camera_bool_before_response.get("execution_details", {})
            property_path = details.get("property_path")
            value = details.get("value")
            if property_path is not None and isinstance(value, bool):
                facts.append(
                    f"Pre-write readback confirmed exact Camera bool {property_path} = {value}."
                )
        if camera_bool_write_response is not None:
            details = camera_bool_write_response.get("execution_details", {})
            result = camera_bool_write_response.get("result", {})
            result = result if isinstance(result, dict) else {}
            entity_details = entity_response.get("execution_details", {}) if entity_response else {}
            entity_label = (
                entity_details.get("entity_name")
                or entity_details.get("entity_id")
                or details.get("target_entity")
                or details.get("entity_name")
                or details.get("entity_id")
                or "the live Camera target"
            )
            capability_name = (
                details.get("capability_name")
                or result.get("tool")
                or "editor.component.property.write.camera_bool_make_active_on_activation"
            )
            component_name = details.get("component_name") or "Camera"
            property_path = details.get("property_path")
            previous_value = details.get("previous_value")
            requested_value = details.get("requested_value")
            write_verified = details.get("write_verified")
            value = details.get("value")
            admission_class = details.get("admission_class") or result.get(
                "approval_class",
                "content_write",
            )
            generalized_undo_available = details.get(
                "generalized_undo_available",
                False,
            )
            if property_path is not None:
                facts.append(
                    f"Capability {capability_name} targeted entity {entity_label}, "
                    f"component {component_name}, property {property_path}; "
                    f"before={previous_value}, requested={requested_value}, "
                    f"after={value}, write_verified={write_verified}, "
                    f"admission_class={admission_class}, "
                    f"generalized_undo_available={generalized_undo_available}."
                )
            restore_or_revert_guidance = details.get("restore_or_revert_guidance")
            if isinstance(restore_or_revert_guidance, str) and restore_or_revert_guidance:
                facts.append(f"Restore/revert guidance: {restore_or_revert_guidance}")
        if camera_bool_after_response is not None:
            details = camera_bool_after_response.get("execution_details", {})
            property_path = details.get("property_path")
            value = details.get("value")
            if property_path is not None and isinstance(value, bool):
                facts.append(
                    f"Post-write readback confirmed exact Camera bool {property_path} = {value}."
                )
        if camera_bool_current_response is not None:
            details = camera_bool_current_response.get("execution_details", {})
            property_path = details.get("property_path")
            value = details.get("value")
            if property_path is not None and isinstance(value, bool):
                facts.append(
                    f"Pre-restore readback confirmed exact Camera bool {property_path} = {value}."
                )
        if camera_bool_restore_response is not None:
            details = camera_bool_restore_response.get("execution_details", {})
            result = camera_bool_restore_response.get("result", {})
            result = result if isinstance(result, dict) else {}
            entity_details = entity_response.get("execution_details", {}) if entity_response else {}
            entity_label = (
                entity_details.get("entity_name")
                or entity_details.get("entity_id")
                or details.get("entity_name")
                or details.get("entity_id")
                or "the live Camera target"
            )
            capability_name = (
                details.get("capability_name")
                or result.get("tool")
                or "editor.component.property.restore.camera_bool_make_active_on_activation"
            )
            component_name = details.get("component_name") or "Camera"
            property_path = details.get("property_path")
            before_value_evidence = details.get("before_value_evidence")
            before_value = details.get("before_value")
            current_value = details.get(
                "current_value_before_restore",
                details.get("current_value"),
            )
            restored_value = details.get("restore_value", details.get("restored_value"))
            restored_readback = details.get("restored_readback")
            verification_status = details.get(
                "verification_result",
                details.get("verification_status"),
            )
            write_occurred = details.get("write_occurred")
            restore_occurred = details.get("restore_occurred")
            admission_class = details.get("admission_class") or result.get(
                "approval_class",
                "content_write",
            )
            generalized_undo_available = details.get(
                "generalized_undo_available",
                False,
            )
            if property_path is not None:
                facts.append(
                    f"Capability {capability_name} targeted entity {entity_label}, "
                    f"component {component_name}, property {property_path}; "
                    f"before_value_evidence={before_value_evidence}, "
                    f"before={before_value}, current_before_restore={current_value}, "
                    f"restore_value={restored_value}, "
                    f"restored_readback={restored_readback}, "
                    f"verification_result={verification_status}, "
                    f"admission_class={admission_class}, "
                    f"write_occurred={write_occurred}, "
                    f"restore_occurred={restore_occurred}, "
                    f"generalized_undo_available={generalized_undo_available}."
                )
            write_semantics = details.get("write_occurred_semantics")
            restore_semantics = details.get("restore_occurred_semantics")
            if (
                isinstance(write_semantics, str)
                and write_semantics
                and isinstance(restore_semantics, str)
                and restore_semantics
            ):
                facts.append(
                    "Write/restore semantics: "
                    f"write_occurred={write_occurred}; "
                    f"restore_occurred={restore_occurred}; "
                    f"{write_semantics} {restore_semantics}"
                )
            restore_or_revert_guidance = details.get("restore_or_revert_guidance")
            if isinstance(restore_or_revert_guidance, str) and restore_or_revert_guidance:
                facts.append(f"Restore/revert guidance: {restore_or_revert_guidance}")
        if camera_bool_restored_response is not None:
            details = camera_bool_restored_response.get("execution_details", {})
            property_path = details.get("property_path")
            value = details.get("value")
            if property_path is not None and isinstance(value, bool):
                facts.append(
                    f"Post-restore readback confirmed exact Camera bool {property_path} = {value}."
                )

        return facts

    def _editor_review_assumptions(
        self,
        *,
        session: PromptSessionRecord,
        entity_response: dict[str, Any] | None,
        component_response: dict[str, Any] | None,
        component_find_response: dict[str, Any] | None,
        property_response: dict[str, Any] | None,
        camera_bool_write_response: dict[str, Any] | None,
        camera_bool_restore_response: dict[str, Any] | None,
    ) -> list[str]:
        assumptions: list[str] = []
        if entity_response is not None and component_response is not None:
            assumptions.append(
                "Automatic handoff relied on the persisted entity id returned by the immediately preceding admitted editor step."
            )
        if component_response is not None and property_response is not None:
            assumptions.append(
                "Component property readback relied on the persisted component id returned by the immediately preceding admitted component attachment step."
            )
        if component_find_response is not None and property_response is not None:
            assumptions.append(
                "Component property readback relied on the persisted live component id returned by the immediately preceding admitted target-binding step."
            )
        if camera_bool_write_response is not None:
            assumptions.append(
                "The Camera bool write relied on live component id provenance and the restore boundary returned by the immediately preceding admitted component add step."
            )
        if camera_bool_restore_response is not None:
            assumptions.append(
                "The Camera bool restore relied on recorded before-value evidence, live component id provenance, and the restore boundary returned by admitted component add."
            )
        if any(
            step.planner_note
            for step in (session.plan.steps if session.plan is not None else [])
            if step.step_id in {"editor-component-1", "editor-component-property-1"}
        ) and not assumptions:
            assumptions.append(
                "The composed review followed the admitted typed prompt plan without adding any broader editor behavior."
            )
        if not assumptions:
            assumptions.append(
                "No additional assumptions were introduced beyond the admitted typed prompt plan."
            )
        return assumptions

    def _editor_missing_proof(
        self,
        *,
        session: PromptSessionRecord,
        result_label: str,
        failed_response: dict[str, Any] | None,
        property_response: dict[str, Any] | None,
        camera_bool_write_response: dict[str, Any] | None,
        camera_bool_restore_response: dict[str, Any] | None,
    ) -> list[str]:
        missing_proof: list[str] = []
        error_details: dict[str, Any] = {}
        if failed_response is not None:
            error = failed_response.get("error", {})
            if isinstance(error, dict):
                details = error.get("details")
                if isinstance(details, dict):
                    error_details = details

        if result_label == "blocked_component_not_allowlisted":
            unsupported = error_details.get("unsupported_components")
            if isinstance(unsupported, list) and unsupported:
                missing_proof.append(
                    "Requested component(s) "
                    + ", ".join(str(item) for item in unsupported)
                    + " are outside the admitted editor component allowlist."
                )
            else:
                missing_proof.append(
                    "The requested component is outside the admitted editor component allowlist."
                )

        if result_label == "blocked_missing_editor_target":
            missing_proof.append(
                "No admitted editor target could be confirmed for the requested authoring chain."
            )
        if result_label == "blocked_missing_level":
            missing_proof.append(
                "A loaded or explicitly opened level was not proven for the requested authoring chain."
            )
        if result_label == "failed_runtime_error":
            error_message = None
            error = failed_response.get("error", {}) if failed_response is not None else {}
            if isinstance(error, dict):
                error_message = error.get("message")
            if isinstance(error_message, str) and error_message:
                missing_proof.append(error_message)
            else:
                missing_proof.append(
                    "The admitted editor chain stopped on a runtime-side failure before full verification completed."
                )

        if any(
            refusal.startswith(_EDITOR_PROPERTY_REFUSAL_PREFIX)
            for refusal in session.refused_capabilities
        ):
            missing_proof.extend(session.refused_capabilities)
        elif property_response is None and any(
            step.tool == "editor.component.property.get"
            for step in (session.plan.steps if session.plan is not None else [])
        ):
            missing_proof.append(
                "Requested component/property readback did not produce verified evidence on the admitted path."
            )
        if result_label == "incomplete_write_unavailable":
            missing_proof.append(
                "Requested exact Camera bool write did not produce verified write evidence."
            )
        if result_label == "incomplete_restore_unavailable":
            missing_proof.append(
                "Requested exact Camera bool restore did not produce verified restore evidence."
            )
        if camera_bool_write_response is not None:
            missing_proof.append(
                "No generalized undo, arbitrary property write, public property listing, "
                "asset/material/render/build/TIAF behavior, or arbitrary Editor Python "
                "was admitted or proven by this exact Camera bool corridor."
            )
        if camera_bool_restore_response is not None:
            missing_proof.append(
                "No generalized undo, generic property restore, arbitrary property write, "
                "public property listing, asset/material/render/build/TIAF behavior, "
                "or arbitrary Editor Python was admitted or proven by this exact "
                "Camera bool restore corridor."
            )

        if not missing_proof:
            missing_proof.append(
                "None for the requested admitted editor chain; this review does not claim undo, reversibility, or runtime/game-mode activation."
            )
        return missing_proof

    def _editor_safest_next_step(self, *, result_label: str) -> str:
        if result_label == "blocked_missing_editor_target":
            return (
                "Ensure an attachable Editor target is available for this project, then rerun the same admitted chain."
            )
        if result_label == "blocked_missing_level":
            return "Open or confirm an explicit level path before retrying the admitted editor authoring chain."
        if result_label == "blocked_component_not_allowlisted":
            return (
                "Retry with one of the already admitted allowlisted components instead of broadening the editor component surface."
            )
        if result_label == "incomplete_readback_unavailable":
            return (
                "Retry the readback portion only when the requested component has a proven admitted property-read mapping, or inspect the attached component manually in the Editor."
            )
        if result_label == "failed_runtime_error":
            return "Review the recorded bridge/runtime error details before retrying the same admitted editor chain."
        if result_label == "incomplete_write_unavailable":
            return "Retry only the same exact Camera bool write corridor after confirming bridge readiness and approval state."
        if result_label == "incomplete_restore_unavailable":
            return "Retry only the same exact Camera bool restore corridor after confirming before-value evidence, bridge readiness, and approval state."
        if result_label == "succeeded_partially_verified":
            return "Use the existing admitted read-only editor checks to verify the next missing fact without widening into property writes or arbitrary Editor Python."
        return "Inspect the created editor objects in the loaded level or continue with another admitted read-only verification step."

    def _format_review_section(self, title: str, items: list[str]) -> str:
        return "\n".join([f"{title}:"] + [f"- {item}" for item in items])

    def _restore_boundary_summary_items(
        self,
        details: dict[str, Any],
    ) -> list[str]:
        restore_boundary_id = details.get("restore_boundary_id")
        if not isinstance(restore_boundary_id, str) or not restore_boundary_id:
            return []

        if details.get("restore_invoked") is True:
            restore_result = details.get("restore_result")
            if isinstance(restore_result, str) and restore_result:
                return [
                    f"Restore boundary {restore_boundary_id} was invoked with result {restore_result}."
                ]
            return [f"Restore boundary {restore_boundary_id} was invoked."]

        if details.get("restore_boundary_available") is True:
            return [
                (
                    f"Restore boundary {restore_boundary_id} was captured before admitted editor mutation "
                    "and remains available for the current subset."
                )
            ]
        return []

    def _append_restore_boundary_summary(
        self,
        details: dict[str, Any],
        summary_parts: list[str],
    ) -> None:
        summary_parts.extend(self._restore_boundary_summary_items(details))


prompt_orchestrator_service = PromptOrchestratorService()
