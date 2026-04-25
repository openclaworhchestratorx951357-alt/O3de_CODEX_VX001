from fastapi import APIRouter

from app.models.api import AdaptersEnvelope
from app.services.adapters import adapter_service

router = APIRouter(tags=["adapters"])


@router.get("/adapters", response_model=AdaptersEnvelope)
def list_adapters() -> AdaptersEnvelope:
    return AdaptersEnvelope(adapters=adapter_service.list_adapters())
