from uuid import uuid4

from app.models.control_plane import EventRecord, EventSeverity
from app.services.db import connection, decode_json, encode_json


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
        with connection() as conn:
            conn.execute(
                """
                INSERT INTO events (
                    id, run_id, category, severity, message, created_at, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.id,
                    event.run_id,
                    event.category,
                    event.severity.value,
                    event.message,
                    event.created_at.isoformat(),
                    encode_json(event.details),
                ),
            )
        return event

    def list_events(self) -> list[EventRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM events ORDER BY created_at DESC, id DESC"
            ).fetchall()
        return [
            EventRecord.model_validate(
                {
                    **dict(row),
                    "details": decode_json(row["details"], {}),
                }
            )
            for row in rows
        ]


events_service = EventsService()
