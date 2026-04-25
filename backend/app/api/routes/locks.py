from fastapi import APIRouter

from app.models.api import LocksListResponse, LocksResponse
from app.services.locks import locks_service

router = APIRouter(tags=["locks"])


@router.get("/locks", response_model=LocksResponse)
def list_locks() -> LocksResponse:
    return LocksResponse(locks=locks_service.list_locks())


@router.get("/locks/cards", response_model=LocksListResponse)
def list_lock_cards() -> LocksListResponse:
    return locks_service.list_lock_cards()
