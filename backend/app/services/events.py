from typing import Any
from uuid import uuid4

from app.models.api import (
    AppControlEventDetail,
    AppControlEventDetailItem,
    AppControlEventSummary,
    EventDetailResponse,
    EventListItem,
    EventListResponse,
    EventSummaryResponse,
    LifecycleArtifactRef,
    LifecycleEventPayload,
    LifecycleEventResponse,
)
from app.models.control_plane import (
    ArtifactRecord,
    EventRecord,
    EventSeverity,
    ExecutionRecord,
    RunRecord,
)
from app.repositories.control_plane import control_plane_repository
from app.services.card_utils import read_string_value

_LIFECYCLE_EVENT_TRUTH_NOTE = (
    "Lifecycle events are read-only projections over persisted event records; "
    "they do not provision, execute, mutate, or admit any tool surface."
)
_ARTIFACT_REF_EVENT_TOKENS = {
    "completed",
    "failed",
    "verification",
    "rollback",
    "cleanup",
}


class EventsService:
    def record(
        self,
        *,
        category: str,
        severity: EventSeverity,
        message: str,
        run_id: str | None = None,
        execution_id: str | None = None,
        executor_id: str | None = None,
        workspace_id: str | None = None,
        event_type: str | None = None,
        previous_state: str | None = None,
        current_state: str | None = None,
        failure_category: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> EventRecord:
        event = EventRecord(
            id=f"evt-{uuid4().hex[:12]}",
            run_id=run_id,
            execution_id=execution_id,
            executor_id=executor_id,
            workspace_id=workspace_id,
            category=category,
            event_type=event_type,
            severity=severity,
            message=message,
            previous_state=previous_state,
            current_state=current_state,
            failure_category=failure_category,
            details=details or {},
        )
        return control_plane_repository.create_event(event)

    def list_events(self) -> list[EventRecord]:
        return control_plane_repository.list_events()

    def list_event_cards(self) -> EventListResponse:
        return EventListResponse(
            events=[
                self._event_card(event)
                for event in self.list_events()
            ]
        )

    def list_lifecycle_events(self) -> LifecycleEventResponse:
        runs_by_id = {
            run.id: run for run in control_plane_repository.list_runs()
        }
        executions_by_id = {
            execution.id: execution
            for execution in control_plane_repository.list_executions()
        }
        artifacts_by_execution_id: dict[str, list[ArtifactRecord]] = {}
        for artifact in control_plane_repository.list_artifacts():
            artifacts_by_execution_id.setdefault(artifact.execution_id, []).append(artifact)

        return LifecycleEventResponse(
            events=[
                LifecycleEventPayload(
                    event_id=event.id,
                    event_type=event.event_type,
                    event_timestamp=event.created_at.isoformat(),
                    run_id=event.run_id,
                    execution_id=event.execution_id,
                    executor_id=event.executor_id,
                    workspace_id=event.workspace_id,
                    tool_name=self._lifecycle_tool_name(
                        event=event,
                        runs_by_id=runs_by_id,
                        executions_by_id=executions_by_id,
                    ),
                    runner_family=self._lifecycle_runner_family(
                        event=event,
                        executions_by_id=executions_by_id,
                    ),
                    execution_mode_class=self._lifecycle_execution_mode_class(
                        event=event,
                        runs_by_id=runs_by_id,
                        executions_by_id=executions_by_id,
                    ),
                    previous_state=event.previous_state,
                    current_state=event.current_state,
                    failure_category=event.failure_category,
                    summary=read_string_value(event.details, "summary") or event.message,
                    artifact_refs=self._lifecycle_artifact_refs(
                        event=event,
                        artifacts_by_execution_id=artifacts_by_execution_id,
                    ),
                    truth_note=_LIFECYCLE_EVENT_TRUTH_NOTE,
                )
                for event in self.list_events()
            ]
        )

    def _event_card(self, event: EventRecord) -> EventListItem:
        app_control_detail = self._app_control_detail(event)
        return EventListItem(
            id=event.id,
            run_id=event.run_id,
            execution_id=event.execution_id,
            executor_id=event.executor_id,
            workspace_id=event.workspace_id,
            category=event.category,
            event_type=event.event_type,
            severity=event.severity.value,
            message=event.message,
            created_at=event.created_at.isoformat(),
            previous_state=event.previous_state,
            current_state=event.current_state,
            failure_category=event.failure_category,
            capability_status=read_string_value(event.details, "capability_status"),
            adapter_mode=read_string_value(event.details, "adapter_mode"),
            verification_state=self._verification_state(app_control_detail),
            verified_count=app_control_detail.verified_count if app_control_detail else None,
            assumed_count=app_control_detail.assumed_count if app_control_detail else None,
            event_state=self._event_state(event),
        )

    def event_summary(self) -> EventSummaryResponse:
        app_control_events = [
            event
            for event in self.list_events()
            if event.category == "app_control"
        ]
        app_control_details = [
            self._app_control_detail(event)
            for event in app_control_events
        ]
        latest_event = app_control_events[0] if app_control_events else None
        latest_verified_count = self._read_int_detail(latest_event, "verified_count")
        latest_assumed_count = self._read_int_detail(latest_event, "assumed_count")

        return EventSummaryResponse(
            app_control=AppControlEventSummary(
                total_events=len(app_control_events),
                applied_events=len(
                    [
                        event
                        for event in app_control_events
                        if event.event_type == "app_control_applied"
                    ]
                ),
                reverted_events=len(
                    [
                        event
                        for event in app_control_events
                        if event.event_type == "app_control_reverted"
                    ]
                ),
                verified_only_events=len([
                    detail for detail in app_control_details
                    if self._verification_state(detail) == "verified_only"
                ]),
                assumed_present_events=len([
                    detail for detail in app_control_details
                    if self._verification_state(detail) == "assumed_present"
                ]),
                verification_not_recorded_events=len([
                    detail for detail in app_control_details
                    if self._verification_state(detail) == "not_recorded"
                ]),
                latest_event_id=latest_event.id if latest_event else None,
                latest_event_type=latest_event.event_type if latest_event else None,
                latest_created_at=latest_event.created_at.isoformat() if latest_event else None,
                latest_summary=read_string_value(latest_event.details, "summary")
                if latest_event
                else None,
                latest_verified_count=latest_verified_count,
                latest_assumed_count=latest_assumed_count,
                latest_script_id=read_string_value(latest_event.details, "script_id")
                if latest_event
                else None,
            )
        )

    def event_detail(self, event_id: str) -> EventDetailResponse | None:
        event = next((item for item in self.list_events() if item.id == event_id), None)
        if event is None:
            return None

        return EventDetailResponse(
            event=event,
            app_control=self._app_control_detail(event),
        )

    def _event_state(self, event: EventRecord) -> str:
        if event.severity in {EventSeverity.ERROR, EventSeverity.WARNING}:
            return "active"
        return "done"

    def _lifecycle_tool_name(
        self,
        *,
        event: EventRecord,
        runs_by_id: dict[str, RunRecord],
        executions_by_id: dict[str, ExecutionRecord],
    ) -> str | None:
        tool = read_string_value(event.details, "tool")
        if tool:
            return tool
        execution = executions_by_id.get(event.execution_id or "")
        if execution is not None:
            return execution.tool
        run = runs_by_id.get(event.run_id or "")
        if run is not None:
            return run.tool
        return None

    def _lifecycle_runner_family(
        self,
        *,
        event: EventRecord,
        executions_by_id: dict[str, ExecutionRecord],
    ) -> str | None:
        runner_family = read_string_value(event.details, "runner_family")
        if runner_family:
            return runner_family
        execution = executions_by_id.get(event.execution_id or "")
        if execution is not None:
            return execution.runner_family
        return None

    def _lifecycle_execution_mode_class(
        self,
        *,
        event: EventRecord,
        runs_by_id: dict[str, RunRecord],
        executions_by_id: dict[str, ExecutionRecord],
    ) -> str | None:
        execution_mode = read_string_value(event.details, "execution_mode_class")
        if execution_mode:
            return execution_mode
        adapter_mode = read_string_value(event.details, "adapter_mode")
        if adapter_mode:
            return adapter_mode
        execution = executions_by_id.get(event.execution_id or "")
        if execution is not None:
            return execution.execution_mode
        run = runs_by_id.get(event.run_id or "")
        if run is not None:
            return run.execution_mode
        return None

    def _lifecycle_artifact_refs(
        self,
        *,
        event: EventRecord,
        artifacts_by_execution_id: dict[str, list[ArtifactRecord]],
    ) -> list[LifecycleArtifactRef]:
        if not self._event_can_reference_artifacts(event):
            return []
        artifacts = artifacts_by_execution_id.get(event.execution_id or "", [])
        return [
            LifecycleArtifactRef(
                artifact_id=artifact.id,
                artifact_role=artifact.artifact_role,
                kind=artifact.kind,
                uri=artifact.uri,
                evidence_completeness=artifact.evidence_completeness,
            )
            for artifact in artifacts
        ]

    def _event_can_reference_artifacts(self, event: EventRecord) -> bool:
        event_type = (event.event_type or "").lower()
        if any(token in event_type for token in _ARTIFACT_REF_EVENT_TOKENS):
            return True
        return isinstance(event.details.get("artifact_refs"), list)

    def _verification_state(
        self,
        app_control_detail: AppControlEventDetail | None,
    ) -> str | None:
        if app_control_detail is None:
            return None

        if (app_control_detail.assumed_count or 0) > 0:
            return "assumed_present"
        if (app_control_detail.verified_count or 0) > 0:
            return "verified_only"
        return "not_recorded"

    def _app_control_detail(self, event: EventRecord) -> AppControlEventDetail | None:
        if event.category != "app_control":
            return None

        receipt_items = event.details.get("receipt_items")
        typed_items = [
            AppControlEventDetailItem(
                id=str(item.get("id", "")),
                label=str(item.get("label", "")),
                detail=str(item.get("detail", "")),
                delta=item.get("delta") if isinstance(item.get("delta"), str) else None,
                verification=item.get("verification")
                if isinstance(item.get("verification"), str)
                else None,
            )
            for item in receipt_items
            if isinstance(item, dict)
            and isinstance(item.get("id"), str)
            and isinstance(item.get("label"), str)
            and isinstance(item.get("detail"), str)
        ] if isinstance(receipt_items, list) else []

        return AppControlEventDetail(
            script_id=read_string_value(event.details, "script_id"),
            mode=read_string_value(event.details, "mode"),
            summary=read_string_value(event.details, "summary"),
            verified_count=self._read_int_detail(event, "verified_count"),
            assumed_count=self._read_int_detail(event, "assumed_count"),
            items=typed_items,
        )

    def _read_int_detail(self, event: EventRecord | None, key: str) -> int | None:
        if event is None:
            return None
        value = event.details.get(key)
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.isdigit():
            return int(value)
        return None


events_service = EventsService()
