from app.models.request_envelope import RequestEnvelope
from app.models.response_envelope import ResponseEnvelope


class DispatcherService:
    """Initial dispatch layer for structured tool requests.

    This service currently performs only lightweight acceptance logic and
    returns a normalized response envelope. Real policy enforcement,
    lock checks, approvals, and tool routing will be added here.
    """

    def dispatch(self, request: RequestEnvelope) -> ResponseEnvelope:
        return ResponseEnvelope(
            request_id=request.request_id,
            ok=True,
            result={
                "status": "accepted",
                "tool": request.tool,
                "agent": request.agent,
                "project_root": request.project_root,
                "engine_root": request.engine_root,
                "dry_run": request.dry_run,
                "message": "Dispatcher accepted request. Real execution not implemented yet.",
            },
            warnings=[
                "Dispatcher is running in scaffold mode.",
                "No policy enforcement or real tool execution occurred.",
            ],
            logs=[
                f"Dispatch requested for tool '{request.tool}'.",
                f"Agent '{request.agent}' requested locks: {', '.join(request.locks) if request.locks else 'none'}.",
            ],
        )


dispatcher_service = DispatcherService()
