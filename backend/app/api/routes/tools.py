from fastapi import APIRouter

from app.models.request_envelope import RequestEnvelope
from app.models.response_envelope import ResponseEnvelope

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("/dispatch", response_model=ResponseEnvelope)
def dispatch_tool(request: RequestEnvelope) -> ResponseEnvelope:
    return ResponseEnvelope(
        request_id=request.request_id,
        ok=True,
        result={
            "status": "accepted",
            "tool": request.tool,
            "agent": request.agent,
            "message": "Tool dispatch stub created. Real routing not implemented yet.",
        },
        warnings=["This is a stub route. No real tool execution occurred."],
        logs=[f"Received request for tool '{request.tool}' from agent '{request.agent}'."],
    )
