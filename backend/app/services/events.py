from uuid import uuid4

from app.models.api import EventListItem, EventListResponse
from app.models.control_plane import EventRecord, EventSeverity
from app.repositories.control_plane import control_plane_repository


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
                    category=event.category,
                    severity=event.severity.value,
                    message=event.message,
                    created_at=event.created_at.isoformat(),
                    capability_status=self._read_detail(event, "capability_status"),
                    adapter_mode=self._read_detail(event, "adapter_mode"),
                    event_state=self._event_state(event),
                )
                for event in self.list_events()
            ]
        )

    def _read_detail(self, event: EventRecord, key: str) -> str | None:
        value = event.details.get(key)
        return value.strip() if isinstance(value, str) and value.strip() else None

    def _event_state(self, event: EventRecord) -> str:
        if event.severity in {EventSeverity.ERROR, EventSeverity.WARNING}:
            return "active"
        return "done"


events_service = EventsService()
