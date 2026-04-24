from fastapi import APIRouter, HTTPException

from app.models.api import EventDetailResponse, EventListResponse, EventSummaryResponse, EventsResponse
from app.services.events import events_service

router = APIRouter(tags=["events"])


@router.get("/events", response_model=EventsResponse)
def list_events() -> EventsResponse:
    return EventsResponse(events=events_service.list_events())


@router.get("/events/cards", response_model=EventListResponse)
def list_event_cards() -> EventListResponse:
    return events_service.list_event_cards()


@router.get("/events/summary", response_model=EventSummaryResponse)
def event_summary() -> EventSummaryResponse:
    return events_service.event_summary()


@router.get("/events/{event_id}", response_model=EventDetailResponse)
def event_detail(event_id: str) -> EventDetailResponse:
    detail = events_service.event_detail(event_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return detail
