from uuid import uuid4

from app.models.api import EventListItem, EventListResponse
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
        details: dict[str, str] | None = None,
    ) -> EventRecord:
        event = EventRecord(
            id=f"evt-{uuid4().hex[:12]}",
            run_id=run_id,
            category=category,
            severity=severity,
            message=message,
            details=details or {},
        )
        return control_plane_repository.create_event(event)

    def list_events(self) -> list[EventRecord]:
        return control_plane_repository.list_events()

    def list_event_cards(self) -> EventListResponse:
        return EventListResponse(
            events=[
                EventListItem(
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
                    event_state=self._event_state(event),
                )
                for event in self.list_events()
            ]
        )

    def _event_state(self, event: EventRecord) -> str:
        if event.severity in {EventSeverity.ERROR, EventSeverity.WARNING}:
            return "active"
        return "done"


events_service = EventsService()
