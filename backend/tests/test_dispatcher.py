import json
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from app.models.request_envelope import RequestEnvelope
from app.services.approvals import approvals_service
from app.services.artifacts import artifacts_service
from app.services.db import configure_database, initialize_database, reset_database
from app.services.dispatcher import dispatcher_service
from app.services.events import events_service
from app.services.executions import executions_service
from app.services.locks import locks_service
from app.services.runs import runs_service


def make_request(
    agent: str,
    tool: str,
    *,
    project_root: str = "/tmp/project",
) -> RequestEnvelope:
    return RequestEnvelope(
        request_id="req-1",
        tool=tool,
        agent=agent,
        project_root=project_root,
        engine_root="/tmp/engine",
        dry_run=True,
        locks=[],
        timeout_s=30,
        args={},
    )


@contextmanager
def isolated_database() -> Path:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
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
        assert response.result is not None
        assert response.result.simulated is True
        assert len(response.artifacts) == 1
        execution = executions_service.list_executions()[0]
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["adapter_family"] == "project-build"
        assert execution.details["adapter_contract_version"] == "v0.1"
        assert artifact is not None
        assert artifact.metadata["adapter_family"] == "project-build"
        assert artifact.metadata["adapter_contract_version"] == "v0.1"


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


def test_dispatch_rejects_args_that_fail_tool_schema_validation() -> None:
    with isolated_database():
        request = make_request("project-build", "build.compile")
        request.args = {"targets": []}
        response = dispatcher_service.dispatch(request)

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_ARGS"
        assert response.error.details is not None
        assert response.error.details["args_schema_ref"].endswith(
            "build.compile.args.schema.json"
        )


def test_dispatch_rejects_simulated_result_that_fails_result_schema_validation() -> None:
    with isolated_database():
        with patch(
            "app.services.dispatcher.schema_validation_service.validate_tool_result",
            return_value=["$.simulated: expected constant value True"],
        ):
            response = dispatcher_service.dispatch(
                make_request("project-build", "project.inspect")
            )

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "INVALID_RESULT"
        assert response.error.details is not None
        assert response.error.details["result_schema_ref"].endswith(
            "project.inspect.result.schema.json"
        )


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
        assert response.result.execution_mode == "simulated"
        assert len(executions_service.list_executions()) >= 2


def test_dispatch_blocks_when_lock_is_owned() -> None:
    with isolated_database():
        first = dispatcher_service.dispatch(make_request("project-build", "build.configure"))
        approval = approvals_service.get_approval(first.approval_id or "")
        assert approval is not None
        approvals_service.approve(approval.id)

        blocking_request = make_request("project-build", "build.configure")
        blocking_request.approval_token = approval.token
        blocking_run_response = dispatcher_service.dispatch(blocking_request)
        assert blocking_run_response.ok is True
        blocking_run_id = blocking_run_response.operation_id
        assert blocking_run_id is not None

        locks_service.acquire(["build_tree"], owner_run_id=blocking_run_id)
        blocked_request = make_request("project-build", "build.configure")
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
        artifact_id = response.artifacts[0]
        execution_id = executions_service.list_executions()[0].id

        configure_database(db_path)
        initialize_database()

        persisted_run = runs_service.get_run(run_id)
        persisted_events = events_service.list_events()
        persisted_execution = executions_service.get_execution(execution_id)
        persisted_artifact = artifacts_service.get_artifact(artifact_id)
        assert persisted_run is not None
        assert any(event.run_id == run_id for event in persisted_events)
        assert persisted_execution is not None
        assert persisted_execution.execution_mode == "simulated"
        assert persisted_execution.details["adapter_family"] == "project-build"
        assert persisted_execution.details["adapter_contract_version"] == "v0.1"
        assert persisted_artifact is not None
        assert persisted_artifact.simulated is True
        assert persisted_artifact.metadata["adapter_family"] == "project-build"
        assert persisted_artifact.metadata["adapter_contract_version"] == "v0.1"


def test_dispatch_rejects_when_adapter_mode_is_invalid() -> None:
    with isolated_database():
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "real"}, clear=False):
            response = dispatcher_service.dispatch(
                make_request("project-build", "project.inspect")
            )

        assert response.ok is False
        assert response.error is not None
        assert response.error.code == "ADAPTER_NOT_READY"


def test_project_inspect_uses_real_manifest_path_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        manifest_path = project_root / "project.json"
        manifest_path.write_text(
            json.dumps(
                {
                    "project_name": "Phase7Project",
                    "gem_names": ["ExampleGem"],
                    "compatible_engines": ["o3de"],
                }
            ),
            encoding="utf-8",
        )

        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            request = make_request(
                "project-build",
                "project.inspect",
                project_root=str(project_root),
            )
            request.args = {"include_gems": True}
            response = dispatcher_service.dispatch(request)

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is False
        assert response.result.execution_mode == "real"
        assert "Phase7Project" in response.result.message
        execution = executions_service.list_executions()[0]
        artifact = artifacts_service.get_artifact(response.artifacts[0])
        assert execution.details["inspection_surface"] == "project_manifest"
        assert execution.details["project_manifest_path"].endswith("project.json")
        assert execution.details["project_name"] == "Phase7Project"
        assert artifact is not None
        assert artifact.simulated is False
        assert artifact.metadata["execution_mode"] == "real"
        assert artifact.metadata["project_name"] == "Phase7Project"


def test_project_inspect_falls_back_to_simulated_when_manifest_is_missing_in_hybrid_mode() -> None:
    with isolated_database(), TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        with patch.dict("os.environ", {"O3DE_ADAPTER_MODE": "hybrid"}, clear=False):
            response = dispatcher_service.dispatch(
                make_request(
                    "project-build",
                    "project.inspect",
                    project_root=temp_dir,
                )
            )

        assert response.ok is True
        assert response.result is not None
        assert response.result.simulated is True
        assert response.result.execution_mode == "simulated"
        execution = executions_service.list_executions()[0]
        assert execution.details["real_path_available"] is False
        assert "fallback_reason" in execution.details
