from app.models.request_envelope import RequestEnvelope
from app.models.response_envelope import ResponseEnvelope, ResponseError
from app.services.catalog import catalog_service


class DispatcherService:
    """Initial dispatch layer for structured tool requests.

    This service performs basic acceptance and validates that the requested
    agent exists and that the tool belongs to that agent before returning a
    normalized response envelope.
    """

    def dispatch(self, request: RequestEnvelope) -> ResponseEnvelope:
        if not catalog_service.is_allowed_agent(request.agent):
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                error=ResponseError(
                    code="INVALID_AGENT",
                    message=f"Unknown agent '{request.agent}'.",
                    retryable=False,
                    details={"agent": request.agent},
                ),
                warnings=["Dispatch rejected before execution."],
                logs=[f"Rejected request for unknown agent '{request.agent}'."],
            )

        if not catalog_service.is_allowed_tool_for_agent(request.agent, request.tool):
            return ResponseEnvelope(
                request_id=request.request_id,
                ok=False,
                error=ResponseError(
                    code="INVALID_TOOL",
                    message=(
                        f"Tool '{request.tool}' is not registered for agent "
                        f"'{request.agent}'."
                    ),
                    retryable=False,
                    details={"agent": request.agent, "tool": request.tool},
                ),
                warnings=["Dispatch rejected before execution."],
                logs=[
                    f"Rejected tool '{request.tool}' for agent '{request.agent}'."
                ],
            )

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
