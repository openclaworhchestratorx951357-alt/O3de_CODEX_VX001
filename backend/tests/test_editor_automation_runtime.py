import json
import subprocess
import threading
import time
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from app.services.editor_automation_runtime import editor_automation_runtime_service
from app.services.editor_runtime_defaults import EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S


def write_editor_project_manifest(project_root: Path) -> None:
    (project_root / "project.json").write_text(
        json.dumps(
            {
                "project_name": "EditorRuntimeProject",
                "gem_names": ["PythonEditorBindings"],
            }
        ),
        encoding="utf-8",
    )


def ensure_bridge_bootstrap(project_root: Path) -> None:
    bootstrap_path = (
        project_root
        / "Gems"
        / "ControlPlaneEditorBridge"
        / "Editor"
        / "Scripts"
        / "control_plane_bridge_bootstrap.py"
    )
    bootstrap_path.parent.mkdir(parents=True, exist_ok=True)
    bootstrap_path.write_text("# bridge bootstrap stub\n", encoding="utf-8")


def write_heartbeat(project_root: Path) -> None:
    heartbeat_path = editor_automation_runtime_service._bridge_paths(str(project_root))[  # noqa: SLF001
        "heartbeat_file"
    ]
    heartbeat_path.parent.mkdir(parents=True, exist_ok=True)
    heartbeat_path.write_text(
        json.dumps(
            {
                "bridge_name": "ControlPlaneEditorBridge",
                "bridge_version": "0.1.0",
                "heartbeat_at": "2026-04-20T00:00:00Z",
                "heartbeat_epoch_s": time.time(),
                "project_root": str(project_root),
                "queue_counts": {"inbox": 0, "processing": 0, "results": 0, "deadletter": 0},
                "running": True,
            }
        ),
        encoding="utf-8",
    )


def spawn_bridge_responder(
    *,
    project_root: Path,
    expected_operation: str,
    response_details: dict[str, object],
    captured: dict[str, object],
    write_initial_heartbeat: bool = False,
) -> threading.Thread:
    def _runner() -> None:
        paths = editor_automation_runtime_service._bridge_paths(str(project_root))  # noqa: SLF001
        deadline = time.time() + 5
        if write_initial_heartbeat:
            while time.time() < deadline:
                if paths["heartbeat"].is_dir():
                    write_heartbeat(project_root)
                    break
                time.sleep(0.05)
        while time.time() < deadline:
            inbox_files = sorted(paths["inbox"].glob("*.json"))
            if inbox_files:
                command_path = inbox_files[0]
                command_payload = json.loads(command_path.read_text(encoding="utf-8"))
                captured["command"] = command_payload
                result_path = paths["results"] / f"{command_payload['bridge_command_id']}.json.resp"
                result_path.parent.mkdir(parents=True, exist_ok=True)
                result_path.write_text(
                    json.dumps(
                        {
                            "protocol_version": "v1",
                            "bridge_command_id": command_payload["bridge_command_id"],
                            "request_id": command_payload["request_id"],
                            "operation": expected_operation,
                            "success": True,
                            "status": "ok",
                            "bridge_name": "ControlPlaneEditorBridge",
                            "bridge_version": "0.1.0",
                            "started_at": "2026-04-20T00:00:00Z",
                            "finished_at": "2026-04-20T00:00:01Z",
                            "result_summary": f"{expected_operation} completed through bridge transport.",
                            "details": response_details,
                            "evidence_refs": [],
                        }
                    ),
                    encoding="utf-8",
                )
                write_heartbeat(project_root)
                return
            time.sleep(0.05)
        raise AssertionError("Bridge responder timed out waiting for a command file.")

    thread = threading.Thread(target=_runner, daemon=True)
    thread.start()
    return thread


class FakePersistentEditorProcess:
    def __init__(self) -> None:
        self.returncode = None

    def poll(self) -> int | None:
        return None

    def communicate(self, timeout: int | None = None) -> tuple[str, str]:
        self.returncode = 0
        return "", ""

    def terminate(self) -> None:
        self.returncode = 0

    def kill(self) -> None:
        self.returncode = 0


def test_execute_session_open_bootstraps_bridge_and_returns_bridge_metadata() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project with spaces"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        ensure_bridge_bootstrap(project_root)

        captured: dict[str, object] = {}
        responder = spawn_bridge_responder(
            project_root=project_root,
            expected_operation="editor.session.open",
            response_details={
                "active_level_path": "Levels/Main.level",
                "selected_entity_count": 0,
            },
            captured=captured,
            write_initial_heartbeat=True,
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                with patch(
                    "subprocess.Popen",
                    return_value=FakePersistentEditorProcess(),
                ) as popen:
                    payload = editor_automation_runtime_service.execute_session_open(
                        request_id="req-session-1",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        dry_run=False,
                        args={
                            "session_mode": "open",
                            "project_path": str(project_root),
                            "level_path": "Levels/Main.level",
                            "timeout_s": 5,
                        },
                        locks_acquired=["editor_session"],
                    )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        assert runtime_result["bridge_available"] is True
        assert runtime_result["bridge_command_id"]
        assert runtime_result["loaded_level_path"] == "Levels/Main.level"
        bridge_paths = editor_automation_runtime_service._bridge_paths(str(project_root))  # noqa: SLF001
        consumed_result_path = (
            bridge_paths["results"] / f"{runtime_result['bridge_command_id']}.json.resp"
        )
        assert not consumed_result_path.exists()
        assert payload["runtime_script"].endswith("control_plane_bridge_bootstrap.py")
        launch_command = popen.call_args.args[0]
        assert popen.call_args.kwargs["stdin"] == subprocess.DEVNULL
        launch_stdout = popen.call_args.kwargs["stdout"]
        launch_stderr = popen.call_args.kwargs["stderr"]
        assert launch_stdout != subprocess.PIPE
        assert launch_stderr != subprocess.PIPE
        assert Path(launch_stdout.name).name == "bridge_launch.stdout.log"
        assert Path(launch_stderr.name).name == "bridge_launch.stderr.log"
        runpythonargs = launch_command[launch_command.index("--runpythonargs") + 1]
        assert runpythonargs.endswith("bootstrap_request.json")
        bootstrap_request = json.loads(Path(runpythonargs).read_text(encoding="utf-8"))
        assert bootstrap_request["project_root"] == str(project_root.resolve())
        assert Path(bootstrap_request["engine_root"]) == Path("C:/src/o3de")
        bridge_launch_stdout = project_root / "user" / "ControlPlaneBridge" / "logs" / "bridge_launch.stdout.log"
        assert bridge_launch_stdout.is_file()
        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["workspace_id"] == "workspace-editor-project"
        assert command_payload["executor_id"] == "executor-editor-control-real-local"
        assert command_payload["request_id"] == "req-session-1"


def test_execute_session_open_relaunches_when_existing_heartbeat_has_no_live_pulse() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project with stale heartbeat"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        ensure_bridge_bootstrap(project_root)
        write_heartbeat(project_root)

        captured: dict[str, object] = {}
        responder = spawn_bridge_responder(
            project_root=project_root,
            expected_operation="editor.session.open",
            response_details={
                "active_level_path": "Levels/Main.level",
                "selected_entity_count": 0,
            },
            captured=captured,
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                with patch.object(
                    editor_automation_runtime_service,
                    "_bridge_runner_process_is_active",
                    return_value=False,
                ):
                    with patch(
                        "subprocess.Popen",
                        return_value=FakePersistentEditorProcess(),
                    ) as popen:
                        payload = editor_automation_runtime_service.execute_session_open(
                            request_id="req-session-stale-heartbeat",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={
                                "session_mode": "open",
                                "project_path": str(project_root),
                                "level_path": "Levels/Main.level",
                                "timeout_s": 5,
                            },
                            locks_acquired=["editor_session"],
                        )

        responder.join(timeout=5)
        assert not responder.is_alive()
        assert popen.called
        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        assert runtime_result["bridge_available"] is True
        assert runtime_result["bridge_command_id"]
        assert isinstance(captured.get("command"), dict)


def test_execute_session_open_uses_existing_runner_when_stale_heartbeat_recovers() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project with recovering heartbeat"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        ensure_bridge_bootstrap(project_root)
        write_heartbeat(project_root)

        heartbeat_path = editor_automation_runtime_service._bridge_paths(str(project_root))[  # noqa: SLF001
            "heartbeat_file"
        ]
        stale_payload = json.loads(heartbeat_path.read_text(encoding="utf-8"))
        stale_payload["heartbeat_epoch_s"] = time.time() - 60
        stale_payload["heartbeat_at"] = "2026-04-21T04:00:00Z"
        heartbeat_path.write_text(json.dumps(stale_payload), encoding="utf-8")

        captured: dict[str, object] = {}
        responder = spawn_bridge_responder(
            project_root=project_root,
            expected_operation="editor.session.open",
            response_details={
                "active_level_path": "Levels/Main.level",
                "selected_entity_count": 0,
            },
            captured=captured,
        )

        def refresh_heartbeat() -> None:
            time.sleep(0.5)
            write_heartbeat(project_root)

        heartbeat_refresher = threading.Thread(target=refresh_heartbeat, daemon=True)
        heartbeat_refresher.start()

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                with patch.object(
                    editor_automation_runtime_service,
                    "_bridge_runner_process_is_active",
                    return_value=True,
                ):
                    with patch(
                        "subprocess.Popen",
                        return_value=FakePersistentEditorProcess(),
                    ) as popen:
                        payload = editor_automation_runtime_service.execute_session_open(
                            request_id="req-session-recovering-heartbeat",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={
                                "session_mode": "open",
                                "project_path": str(project_root),
                                "level_path": "Levels/Main.level",
                                "timeout_s": 5,
                            },
                            locks_acquired=["editor_session"],
                        )

        responder.join(timeout=5)
        heartbeat_refresher.join(timeout=5)
        assert not responder.is_alive()
        assert not popen.called
        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        assert runtime_result["bridge_available"] is True
        assert runtime_result["bridge_command_id"]
        assert isinstance(captured.get("command"), dict)


def test_execute_session_open_uses_extended_default_timeout_when_timeout_arg_missing() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        ensure_bridge_bootstrap(project_root)

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                with patch.object(
                    editor_automation_runtime_service,
                    "_bridge_host_available",
                    return_value=False,
                ):
                    with patch.object(
                        editor_automation_runtime_service,
                        "_launch_bridge_host",
                    ) as launch_bridge_host:
                        with patch.object(
                            editor_automation_runtime_service,
                            "_invoke_bridge_command",
                            return_value={
                                "operation": "editor.session.open",
                                "bridge_command_id": "bridge-session-default-timeout",
                                "success": True,
                                "bridge_name": "ControlPlaneEditorBridge",
                                "bridge_version": "0.1.0",
                                "finished_at": "2026-04-21T00:00:01Z",
                                "result_summary": "editor.session.open completed.",
                                "details": {
                                    "active_level_path": "Levels/Main.level",
                                },
                            },
                        ) as invoke_bridge_command:
                            payload = editor_automation_runtime_service.execute_session_open(
                                request_id="req-session-default-timeout",
                                session_id="session-1",
                                workspace_id="workspace-editor-project",
                                executor_id="executor-editor-control-real-local",
                                project_root=str(project_root),
                                engine_root="C:/src/o3de",
                                dry_run=False,
                                args={
                                    "session_mode": "attach",
                                    "project_path": str(project_root),
                                    "level_path": "Levels/Main.level",
                                },
                                locks_acquired=["editor_session"],
                            )

        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        launch_bridge_host.assert_called_once()
        assert (
            launch_bridge_host.call_args.kwargs["timeout_s"]
            == EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S
        )
        invoke_bridge_command.assert_called_once()
        assert (
            invoke_bridge_command.call_args.kwargs["timeout_s"]
            == EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S
        )
        assert (
            invoke_bridge_command.call_args.kwargs["args"]["timeout_s"]
            == EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S
        )


def test_invoke_bridge_command_accepts_response_found_on_final_timeout_boundary_check() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        paths = editor_automation_runtime_service._ensure_bridge_dirs(str(project_root))  # noqa: SLF001

        response_payload = {
            "protocol_version": "v1",
            "bridge_command_id": "boundary-command",
            "request_id": "req-boundary-1",
            "operation": "editor.session.open",
            "success": True,
            "status": "ok",
            "bridge_name": "ControlPlaneEditorBridge",
            "bridge_version": "0.1.0",
            "started_at": "2026-04-21T00:00:00Z",
            "finished_at": "2026-04-21T00:00:01Z",
            "result_summary": "editor.session.open completed through bridge transport.",
            "details": {"active_level_path": "Levels/Main.level"},
            "evidence_refs": [],
        }

        with patch.object(
            editor_automation_runtime_service,
            "_consume_bridge_command_response_if_ready",
            side_effect=[None, response_payload],
        ) as consume_response:
            with patch("app.services.editor_automation_runtime.time.monotonic", side_effect=[0.0, 0.0, 1.0]):
                with patch("app.services.editor_automation_runtime.time.sleep", return_value=None):
                    payload = editor_automation_runtime_service._invoke_bridge_command(  # noqa: SLF001
                        tool="editor.session.open",
                        operation="editor.session.open",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        request_id="req-boundary-1",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        args={"session_mode": "attach", "project_path": str(project_root)},
                        timeout_s=0.5,
                    )

        assert payload == response_payload
        assert consume_response.call_count == 2
        command_files = list(paths["inbox"].glob("*.json"))
        assert len(command_files) == 1


def test_execute_level_open_queues_bridge_command_with_workspace_and_executor_lineage() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        write_heartbeat(project_root)

        state_path = editor_automation_runtime_service._state_path(str(project_root))  # noqa: SLF001
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(
            json.dumps(
                {
                    "session_active": True,
                    "loaded_level_path": "Levels/Main.level",
                }
            ),
            encoding="utf-8",
        )

        captured: dict[str, object] = {}
        responder = spawn_bridge_responder(
            project_root=project_root,
            expected_operation="editor.level.open",
            response_details={
                "ensure_result": "opened_existing",
                "level_path": "Levels/Main.level",
                "selected_entity_count": 0,
            },
            captured=captured,
            write_initial_heartbeat=True,
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                with patch.object(
                    editor_automation_runtime_service,
                    "_bridge_has_live_pulse",
                    return_value=True,
                ):
                    payload = editor_automation_runtime_service.execute_level_open(
                        request_id="req-level-1",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        dry_run=False,
                        args={
                            "level_path": "Levels/Main.level",
                            "make_writable": True,
                            "focus_viewport": True,
                        },
                        locks_acquired=["editor_session"],
                    )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        assert runtime_result["bridge_available"] is True
        assert runtime_result["bridge_queue_mode"] == "filesystem-inbox"
        assert runtime_result["loaded_level_path"] == "Levels/Main.level"
        bridge_paths = editor_automation_runtime_service._bridge_paths(str(project_root))  # noqa: SLF001
        consumed_result_path = (
            bridge_paths["results"] / f"{runtime_result['bridge_command_id']}.json.resp"
        )
        assert not consumed_result_path.exists()
        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["operation"] == "editor.level.open"
        assert command_payload["workspace_id"] == "workspace-editor-project"
        assert command_payload["executor_id"] == "executor-editor-control-real-local"
        assert command_payload["args"]["level_path"] == "Levels/Main.level"


def test_bridge_queue_counts_use_unique_command_ids_per_queue() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)

        paths = editor_automation_runtime_service._ensure_bridge_dirs(str(project_root))  # noqa: SLF001
        (paths["results"] / "success-a.json.resp").write_text("{}", encoding="utf-8")
        (paths["deadletter"] / "failed-a.json").write_text("{}", encoding="utf-8")
        (paths["deadletter"] / "failed-a.json.resp").write_text("{}", encoding="utf-8")
        (paths["processing"] / "pending-a.json").write_text("{}", encoding="utf-8")
        (paths["processing"] / "pending-a.json.tmp").write_text("{}", encoding="utf-8")
        (paths["inbox"] / "queued-a.json").write_text("{}", encoding="utf-8")

        assert editor_automation_runtime_service._bridge_queue_counts(str(project_root)) == {  # noqa: SLF001
            "inbox": 1,
            "processing": 1,
            "results": 1,
            "deadletter": 1,
        }


def test_collect_bridge_launch_diagnostics_includes_recent_deadletters() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)

        paths = editor_automation_runtime_service._ensure_bridge_dirs(str(project_root))  # noqa: SLF001
        deadletter_response_path = paths["deadletter"] / "dead-a.json.resp"
        deadletter_response_path.write_text(
            json.dumps(
                {
                    "protocol_version": "v1",
                    "bridge_command_id": "dead-a",
                    "operation": "editor.level.open",
                    "success": False,
                    "status": "error",
                    "bridge_name": "ControlPlaneEditorBridge",
                    "bridge_version": "0.1.0",
                    "error_code": "LEVEL_CONTEXT_NOT_OBSERVED",
                    "result_summary": "The editor did not report the requested level context.",
                    "finished_at": "2026-04-21T04:20:05Z",
                }
            ),
            encoding="utf-8",
        )

        diagnostics = editor_automation_runtime_service._collect_bridge_launch_diagnostics(  # noqa: SLF001
            str(project_root)
        )

        assert diagnostics["bridge_queue_counts"] == {
            "inbox": 0,
            "processing": 0,
            "results": 0,
            "deadletter": 1,
        }
        assert diagnostics["bridge_recent_deadletters"] == [
            {
                "bridge_command_id": "dead-a",
                "operation": "editor.level.open",
                "error_code": "LEVEL_CONTEXT_NOT_OBSERVED",
                "result_summary": "The editor did not report the requested level context.",
                "finished_at": "2026-04-21T04:20:05Z",
                "result_path": str(deadletter_response_path),
            }
        ]
