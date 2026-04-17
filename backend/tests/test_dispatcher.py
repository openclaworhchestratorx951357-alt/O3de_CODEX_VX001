from app.models.request_envelope import RequestEnvelope
from app.services.dispatcher import dispatcher_service


def make_request(agent: str, tool: str) -> RequestEnvelope:
    return RequestEnvelope(
        request_id="req-1",
        tool=tool,
        agent=agent,
        project_root="/tmp/project",
        engine_root="/tmp/engine",
        dry_run=True,
        locks=[],
        timeout_s=30,
        args={},
    )


def test_dispatch_accepts_valid_agent_and_tool() -> None:
    response = dispatcher_service.dispatch(
        make_request("project-build", "project.inspect")
    )
    assert response.ok is True
    assert response.error is None


def test_dispatch_rejects_unknown_agent() -> None:
    response = dispatcher_service.dispatch(
        make_request("unknown-agent", "project.inspect")
    )
    assert response.ok is False
    assert response.error is not None
    assert response.error.code == "INVALID_AGENT"


def test_dispatch_rejects_invalid_tool_for_agent() -> None:
    response = dispatcher_service.dispatch(
        make_request("project-build", "render.capture.viewport")
    )
    assert response.ok is False
    assert response.error is not None
    assert response.error.code == "INVALID_TOOL"
