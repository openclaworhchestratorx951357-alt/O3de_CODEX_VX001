from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory

from app.services.approvals import approvals_service
from app.services.db import configure_database, initialize_database, reset_database
from app.services.events import events_service
from app.models.request_envelope import RequestEnvelope
from app.services.dispatcher import dispatcher_service
from app.services.locks import locks_service
from app.services.runs import runs_service


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


@contextmanager
def isolated_database() -> Path:
    with TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "control-plane.sqlite3"
        configure_database(db_path)
        initialize_database()
        reset_database()
        try:
            yield db_path
        finally:
            configure_database(None)


def test_dispatch_accepts_valid_agent_and_tool() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(
            make_request("project-build", "project.inspect")
        )
        assert response.ok is True
        assert response.error is None
        assert response.operation_id is not None


def test_dispatch_rejects_unknown_agent() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(
            make_request("unknown-agent", "project.inspect")
        )
        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_AGENT"


def test_dispatch_rejects_invalid_tool_for_agent() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(
            make_request("project-build", "render.capture.viewport")
        )
        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_TOOL"


def test_dispatch_requires_approval_for_mutating_tool() -> None:
    with isolated_database():
        response = dispatcher_service.dispatch(
            make_request("project-build", "build.configure")
        )
        assert response.ok is False
        assert response.approval_id is not None
        assert response.error is not None
        assert response.error.code == "APPROVAL_REQUIRED"


def test_dispatch_accepts_after_approval() -> None:
    with isolated_database():
        first = dispatcher_service.dispatch(make_request("project-build", "build.configure"))
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        approved_request = make_request("project-build", "build.configure")
        approved_request.approval_token = approval.token
        response = dispatcher_service.dispatch(approved_request)

        assert response.ok is True
        assert response.result is not None
        assert response.result["execution_mode"] == "simulated"


def test_dispatch_blocks_when_lock_is_owned() -> None:
    with isolated_database():
        first = dispatcher_service.dispatch(make_request("project-build", "build.compile"))
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        blocking_request = make_request("project-build", "build.compile")
        blocking_request.approval_token = approval.token
        blocking_run_response = dispatcher_service.dispatch(blocking_request)
        assert blocking_run_response.ok is True
        blocking_run_id = blocking_run_response.operation_id
        assert blocking_run_id is not None

        locks_service.acquire(["build_tree"], owner_run_id=blocking_run_id)
        blocked_request = make_request("project-build", "build.compile")
        blocked_request.approval_token = approval.token
        blocked = dispatcher_service.dispatch(blocked_request)

        assert blocked.ok is False
        assert blocked.error is not None
        assert blocked.error.code == "STATE_LOCKED"
        assert any(lock.name == "build_tree" for lock in locks_service.list_locks())

        locks_service.release(blocking_run_id)


def test_every_dispatch_attempt_creates_a_run_record() -> None:
    with isolated_database():
        before = len(runs_service.list_runs())
        dispatcher_service.dispatch(make_request("not-a-real-agent", "project.inspect"))
        after = len(runs_service.list_runs())
        assert after == before + 1


def test_events_and_runs_remain_queryable_after_restart() -> None:
    with isolated_database() as db_path:
        response = dispatcher_service.dispatch(make_request("project-build", "project.inspect"))
        run_id = response.operation_id
        assert run_id is not None

        configure_database(db_path)
        initialize_database()

        persisted_run = runs_service.get_run(run_id)
        persisted_events = events_service.list_events()
        assert persisted_run is not None
        assert any(event.run_id == run_id for event in persisted_events)
