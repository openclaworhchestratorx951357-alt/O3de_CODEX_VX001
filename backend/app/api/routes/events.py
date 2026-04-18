from fastapi import APIRouter

from app.models.api import EventsResponse
from app.services.events import events_service

router = APIRouter(tags=["events"])


@router.get("/events", response_model=EventsResponse)
def list_events() -> EventsResponse:
    return EventsResponse(events=events_service.list_events())
