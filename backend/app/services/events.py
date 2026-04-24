from uuid import uuid4
from typing import Any

from app.models.api import (
    AppControlEventDetail,
    AppControlEventDetailItem,
    AppControlEventSummary,
    EventDetailResponse,
    EventListItem,
    EventListResponse,
    EventSummaryResponse,
)
from app.models.control_plane import EventRecord, EventSeverity
from app.repositories.control_plane import control_plane_repository
from app.services.card_utils import read_string_value


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
                applied_events=len([
                    event for event in app_control_events if event.event_type == "app_control_applied"
                ]),
                reverted_events=len([
                    event for event in app_control_events if event.event_type == "app_control_reverted"
                ]),
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
                latest_summary=read_string_value(latest_event.details, "summary") if latest_event else None,
                latest_verified_count=latest_verified_count,
                latest_assumed_count=latest_assumed_count,
                latest_script_id=read_string_value(latest_event.details, "script_id") if latest_event else None,
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
                verification=item.get("verification") if isinstance(item.get("verification"), str) else None,
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
