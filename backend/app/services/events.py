from uuid import uuid4

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


events_service = EventsService()
