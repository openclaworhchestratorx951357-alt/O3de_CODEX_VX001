from fastapi import APIRouter

from app.models.api import EventListResponse, EventsResponse
from app.services.events import events_service

router = APIRouter(tags=["events"])


@router.get("/events", response_model=EventsResponse)
def list_events() -> EventsResponse:
    return EventsResponse(events=events_service.list_events())


@router.get("/events/cards", response_model=EventListResponse)
def list_event_cards() -> EventListResponse:
    return events_service.list_event_cards()
