from fastapi import APIRouter

from app.models.request_envelope import RequestEnvelope
from app.models.response_envelope import ResponseEnvelope
from app.services.dispatcher import dispatcher_service

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("/dispatch", response_model=ResponseEnvelope)
def dispatch_tool(request: RequestEnvelope) -> ResponseEnvelope:
    return dispatcher_service.dispatch(request)
