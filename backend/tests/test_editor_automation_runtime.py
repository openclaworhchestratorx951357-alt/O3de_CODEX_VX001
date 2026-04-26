import json
import subprocess
import threading
import time
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pytest
from app.services.adapters import AdapterExecutionRejected
from app.services.editor_automation_runtime import (
    CAMERA_BOOL_WRITE_CAPABILITY,
    CAMERA_SCALAR_WRITE_PROOF_COMPONENT,
    CAMERA_SCALAR_WRITE_PROOF_OPERATION,
    CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH,
    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT,
    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT,
    EDITOR_COMPONENT_ADD_ALLOWLIST,
    _level_paths_match,
    _normalize_engine_root_path,
    editor_automation_runtime_service,
)
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


def write_loaded_level_file(
    project_root: Path,
    *,
    level_path: str = "Levels/Main.level",
) -> Path:
    resolved_level_path = project_root / level_path.replace("\\", "/")
    resolved_level_path.parent.mkdir(parents=True, exist_ok=True)
    resolved_level_path.write_text("<LevelStub />\n", encoding="utf-8")
    return resolved_level_path


def write_loaded_editor_state(
    project_root: Path,
    *,
    level_path: str = "Levels/Main.level",
) -> None:
    state_path = editor_automation_runtime_service._state_path(str(project_root))  # noqa: SLF001
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(
        json.dumps(
            {
                "session_active": True,
                "loaded_level_path": level_path,
            }
        ),
        encoding="utf-8",
    )


def test_bridge_setup_script_contains_property_list_operation() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    setup_script = repo_root / "scripts" / "setup_control_plane_editor_bridge.ps1"
    script_text = setup_script.read_text(encoding="utf-8")

    assert "def _list_component_properties(" in script_text
    assert 'if operation == "editor.component.property.list":' in script_text
    assert '"BuildComponentPropertyList"' in script_text


def test_bridge_setup_script_contains_camera_scalar_write_proof_operation() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    setup_script = repo_root / "scripts" / "setup_control_plane_editor_bridge.ps1"
    script_text = setup_script.read_text(encoding="utf-8")

    assert "def _write_camera_scalar_bool_property_proof(" in script_text
    assert 'operation_name = "editor.camera.scalar.write.proof"' in script_text
    assert "Controller|Configuration|Make active camera on activation?" in script_text
    assert "EditorComponentAPIBus.SetComponentProperty" in script_text
    assert "editor.component.property.write" not in script_text
    assert "PropertyTreeEditor.set_value" not in script_text


def test_bridge_setup_script_contains_component_find_operation() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    setup_script = repo_root / "scripts" / "setup_control_plane_editor_bridge.ps1"
    script_text = setup_script.read_text(encoding="utf-8")

    assert "def _find_component(" in script_text
    assert 'if operation == "editor.component.find":' in script_text
    assert '"GetComponentOfType"' in script_text


def test_level_paths_match_bridge_absolute_path_to_project_relative_request(
    tmp_path: Path,
) -> None:
    project_root = tmp_path / "project"
    loaded_level_path = write_loaded_level_file(project_root, level_path="Levels/TestLevel")

    assert _level_paths_match(
        str(project_root),
        loaded_level_path=str(loaded_level_path),
        requested_level_path="Levels/TestLevel",
    )
    assert not _level_paths_match(
        str(project_root),
        loaded_level_path=str(loaded_level_path),
        requested_level_path="Levels/OtherLevel",
    )


def test_resolve_loaded_level_file_path_uses_level_prefab_for_directory(
    tmp_path: Path,
) -> None:
    project_root = tmp_path / "project"
    level_dir = project_root / "Levels" / "TestLevel"
    level_dir.mkdir(parents=True)
    prefab_path = level_dir / "TestLevel.prefab"
    prefab_path.write_text("{\"level\": \"test\"}\n", encoding="utf-8")

    assert (
        editor_automation_runtime_service._resolve_loaded_level_file_path(  # noqa: SLF001
            str(project_root),
            loaded_level_path="Levels/TestLevel",
        )
        == prefab_path
    )
    assert (
        editor_automation_runtime_service._resolve_loaded_level_file_path(  # noqa: SLF001
            str(project_root),
            loaded_level_path=str(level_dir),
        )
        == prefab_path
    )


def spawn_bridge_responder(
    *,
    project_root: Path,
    expected_operation: str,
    response_details: dict[str, object],
    captured: dict[str, object],
    write_initial_heartbeat: bool = False,
    response_success: bool = True,
    response_error_code: str | None = None,
    response_result_summary: str | None = None,
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
                            "success": response_success,
                            "status": "ok" if response_success else "failed",
                            "bridge_name": "ControlPlaneEditorBridge",
                            "bridge_version": "0.1.0",
                            "started_at": "2026-04-20T00:00:00Z",
                            "finished_at": "2026-04-20T00:00:01Z",
                            "result_summary": response_result_summary
                            or f"{expected_operation} completed through bridge transport.",
                            "details": response_details,
                            "evidence_refs": [],
                            "error_code": response_error_code,
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


def test_engine_root_normalization_preserves_windows_absolute_paths_on_posix() -> None:
    with patch("app.services.editor_automation_runtime.RUNTIME_HOST_IS_WINDOWS", False):
        assert _normalize_engine_root_path("C:/src/o3de") == "C:/src/o3de"
        assert _normalize_engine_root_path(r"C:\src\o3de") == "C:/src/o3de"


def test_execute_session_open_preserves_windows_engine_root_in_payloads_on_posix() -> None:
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

        with patch("app.services.editor_automation_runtime.RUNTIME_HOST_IS_WINDOWS", False):
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
                            request_id="req-session-posix-engine-root",
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
        launch_command = popen.call_args.args[0]
        assert "--engine-path=C:/src/o3de" in launch_command
        runpythonargs = launch_command[launch_command.index("--runpythonargs") + 1]
        bootstrap_request = json.loads(Path(runpythonargs).read_text(encoding="utf-8"))
        assert bootstrap_request["engine_root"] == "C:/src/o3de"
        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["engine_root"] == "C:/src/o3de"


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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_runner_process_is_active",
                        return_value=False,
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


def test_execute_entity_create_queues_bridge_command_and_persists_created_entity_state() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        write_heartbeat(project_root)
        write_loaded_level_file(project_root)

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
            expected_operation="editor.entity.create",
            response_details={
                "entity_id": "101",
                "resolved_entity_id": "202",
                "entity_name": "Hero",
                "entity_id_source": "editor_entity_context_create",
                "direct_return_entity_id": "101",
                "notification_entity_ids": [],
                "selected_entity_count": 0,
                "selected_entity_count_before_create": 0,
                "level_path": "Levels/Main.level",
                "active_level_path": "Levels/Main.level",
                "name_mutation_ran": False,
                "name_mutation_succeeded": True,
                "prefab_context_notes": (
                    "Selection was cleared before create to avoid selected-entity or prefab ownership ambiguity."
                ),
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        with patch(
                            "subprocess.Popen",
                            side_effect=AssertionError(
                                "editor.entity.create should not launch a one-shot editor process when the bridge is healthy."
                            ),
                        ):
                            payload = editor_automation_runtime_service.execute_entity_create(
                                request_id="req-entity-1",
                                session_id="session-1",
                                workspace_id="workspace-editor-project",
                                executor_id="executor-editor-control-real-local",
                                project_root=str(project_root),
                                engine_root="C:/src/o3de",
                                dry_run=False,
                                args={
                                    "entity_name": "Hero",
                                    "level_path": "Levels/Main.level",
                                },
                                locks_acquired=["editor_session"],
                            )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        assert runtime_result["bridge_available"] is True
        assert runtime_result["bridge_operation"] == "editor.entity.create"
        assert runtime_result["bridge_queue_mode"] == "filesystem-inbox"
        assert runtime_result["bridge_command_id"]
        assert runtime_result["entity_id"] == "202"
        assert runtime_result["entity_name"] == "Hero"
        assert runtime_result["modified_entities"] == ["202"]
        assert runtime_result["level_path"] == "Levels/Main.level"
        assert runtime_result["loaded_level_path"] == "Levels/Main.level"
        assert runtime_result["entity_id_source"] == "editor_entity_context_create"
        assert runtime_result["direct_return_entity_id"] == "101"
        assert runtime_result["selected_entity_count_before_create"] == 0
        assert runtime_result["name_mutation_ran"] is False
        assert runtime_result["name_mutation_succeeded"] is True
        assert "editor.entity.create" in runtime_result["exact_editor_apis"]
        assert payload["runtime_script"].endswith("control_plane_bridge_poller.py")

        bridge_paths = editor_automation_runtime_service._bridge_paths(str(project_root))  # noqa: SLF001
        consumed_result_path = (
            bridge_paths["results"] / f"{runtime_result['bridge_command_id']}.json.resp"
        )
        assert not consumed_result_path.exists()

        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["operation"] == "editor.entity.create"
        assert command_payload["request_id"] == "req-entity-1"
        assert command_payload["session_id"] == "session-1"
        assert command_payload["workspace_id"] == "workspace-editor-project"
        assert command_payload["executor_id"] == "executor-editor-control-real-local"
        assert command_payload["args"]["entity_name"] == "Hero"
        assert command_payload["args"]["level_path"] == "Levels/Main.level"

        saved_state = json.loads(state_path.read_text(encoding="utf-8"))
        assert saved_state["last_created_entity_id"] == "202"
        assert saved_state["last_created_entity_name"] == "Hero"
        assert saved_state["editor_transport"] == "bridge"
        assert saved_state["bridge_heartbeat_seen_at"] == runtime_result["bridge_heartbeat_seen_at"]


@pytest.mark.parametrize(
    ("field_name", "field_value"),
    [
        ("parent_entity_id", "entity-parent-1"),
        ("prefab_asset", "Prefabs/Hero.prefab"),
        ("position", {"x": 1.0, "y": 2.0, "z": 3.0}),
    ],
)
def test_execute_entity_create_rejects_unsupported_mutation_fields(
    field_name: str,
    field_value: object,
) -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

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

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                try:
                    editor_automation_runtime_service.execute_entity_create(
                        request_id="req-entity-unsupported",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        dry_run=False,
                        args={
                            "entity_name": "Hero",
                            "level_path": "Levels/Main.level",
                            field_name: field_value,
                        },
                        locks_acquired=["editor_session"],
                    )
                except AdapterExecutionRejected as exc:
                    assert exc.details["preflight_reason"] == "unsupported-entity-mutation-surface"
                    assert exc.details["unsupported_fields"] == [field_name]
                else:
                    raise AssertionError(
                        "editor.entity.create should reject unsupported mutation fields."
                    )


def test_execute_entity_create_rejects_without_admitted_editor_session() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                try:
                    editor_automation_runtime_service.execute_entity_create(
                        request_id="req-entity-no-session",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        dry_run=False,
                        args={
                            "entity_name": "Hero",
                            "level_path": "Levels/Main.level",
                        },
                        locks_acquired=["editor_session"],
                    )
                except AdapterExecutionRejected as exc:
                    assert exc.details["preflight_reason"] == "editor-session-not-ensured"
                else:
                    raise AssertionError(
                        "editor.entity.create should require an admitted editor session."
                    )


def test_execute_entity_create_rejects_when_requested_level_does_not_match_loaded_level() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

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

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                try:
                    editor_automation_runtime_service.execute_entity_create(
                        request_id="req-entity-level-mismatch",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        dry_run=False,
                        args={
                            "entity_name": "Hero",
                            "level_path": "Levels/Other.level",
                        },
                        locks_acquired=["editor_session"],
                    )
                except AdapterExecutionRejected as exc:
                    assert exc.details["preflight_reason"] == "loaded-level-mismatch"
                    assert exc.details["loaded_level_path"] == "Levels/Main.level"
                    assert exc.details["requested_level_path"] == "Levels/Other.level"
                else:
                    raise AssertionError(
                        "editor.entity.create should reject level paths that do not match the loaded level."
                    )


def test_execute_component_add_queues_bridge_command_and_returns_bridge_metadata() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        write_heartbeat(project_root)
        write_loaded_level_file(project_root)

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
            expected_operation="editor.component.add",
            response_details={
                "entity_id": "101",
                "entity_name": "Hero",
                "added_components": ["Mesh"],
                "added_component_refs": [
                    {
                        "component": "Mesh",
                        "component_pair_text": "[ [101] - 201 ]",
                        "entity_id": "101",
                    }
                ],
                "rejected_components": [],
                "modified_entities": ["101"],
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        with patch(
                            "subprocess.Popen",
                            side_effect=AssertionError(
                                "editor.component.add should not launch a one-shot editor process when the bridge is healthy."
                            ),
                        ):
                            payload = editor_automation_runtime_service.execute_component_add(
                                request_id="req-component-1",
                                session_id="session-1",
                                workspace_id="workspace-editor-project",
                                executor_id="executor-editor-control-real-local",
                                project_root=str(project_root),
                                engine_root="C:/src/o3de",
                                dry_run=False,
                                args={
                                    "entity_id": "101",
                                    "components": ["mesh"],
                                    "level_path": "Levels/Main.level",
                                },
                                locks_acquired=["editor_session"],
                            )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        assert runtime_result["bridge_available"] is True
        assert runtime_result["bridge_operation"] == "editor.component.add"
        assert runtime_result["bridge_queue_mode"] == "filesystem-inbox"
        assert runtime_result["bridge_command_id"]
        assert runtime_result["entity_id"] == "101"
        assert runtime_result["entity_name"] == "Hero"
        assert runtime_result["added_components"] == ["Mesh"]
        assert runtime_result["added_component_refs"] == [
            {
                "component": "Mesh",
                "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                "component_id_provenance": (
                    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
                ),
                "component_pair_text": "[ [101] - 201 ]",
                "entity_id": "101",
            }
        ]
        assert runtime_result["rejected_components"] == []
        assert runtime_result["modified_entities"] == ["101"]
        assert runtime_result["level_path"] == "Levels/Main.level"
        assert runtime_result["loaded_level_path"] == "Levels/Main.level"
        assert "editor.component.add" in runtime_result["exact_editor_apis"]
        assert payload["runtime_script"].endswith("control_plane_bridge_poller.py")

        bridge_paths = editor_automation_runtime_service._bridge_paths(str(project_root))  # noqa: SLF001
        consumed_result_path = (
            bridge_paths["results"] / f"{runtime_result['bridge_command_id']}.json.resp"
        )
        assert not consumed_result_path.exists()

        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["operation"] == "editor.component.add"
        assert command_payload["request_id"] == "req-component-1"
        assert command_payload["session_id"] == "session-1"
        assert command_payload["workspace_id"] == "workspace-editor-project"
        assert command_payload["executor_id"] == "executor-editor-control-real-local"
        assert command_payload["requires_loaded_level"] is True
        assert command_payload["args"]["entity_id"] == "101"
        assert command_payload["args"]["components"] == ["Mesh"]
        assert command_payload["args"]["level_path"] == "Levels/Main.level"

        saved_state = json.loads(state_path.read_text(encoding="utf-8"))
        assert saved_state["editor_transport"] == "bridge"
        assert saved_state["bridge_heartbeat_seen_at"] == runtime_result["bridge_heartbeat_seen_at"]


def test_execute_component_add_normalizes_bracketed_entity_ids() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        write_heartbeat(project_root)
        write_loaded_level_file(project_root)

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
            expected_operation="editor.component.add",
            response_details={
                "entity_id": "101",
                "entity_name": "Hero",
                "added_components": ["Comment"],
                "rejected_components": [],
                "modified_entities": ["101"],
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        payload = editor_automation_runtime_service.execute_component_add(
                            request_id="req-component-bracketed-entity-id",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={
                                "entity_id": "[101]",
                                "components": ["comment"],
                                "level_path": "Levels/Main.level",
                            },
                            locks_acquired=["editor_session"],
                        )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["entity_id"] == "101"

        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["args"]["entity_id"] == "101"
        assert command_payload["args"]["components"] == ["Comment"]


def test_execute_component_add_passes_last_created_entity_name_hint_for_matching_entity_id() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        write_heartbeat(project_root)
        write_loaded_level_file(project_root)

        state_path = editor_automation_runtime_service._state_path(str(project_root))  # noqa: SLF001
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(
            json.dumps(
                {
                    "session_active": True,
                    "loaded_level_path": "Levels/Main.level",
                    "last_created_entity_id": "[101]",
                    "last_created_entity_name": "CodexHintEntity",
                }
            ),
            encoding="utf-8",
        )

        captured: dict[str, object] = {}
        responder = spawn_bridge_responder(
            project_root=project_root,
            expected_operation="editor.component.add",
            response_details={
                "entity_id": "101",
                "entity_name": "CodexHintEntity",
                "added_components": ["Comment"],
                "rejected_components": [],
                "modified_entities": ["101"],
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        payload = editor_automation_runtime_service.execute_component_add(
                            request_id="req-component-name-hint",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={
                                "entity_id": "101",
                                "components": ["comment"],
                                "level_path": "Levels/Main.level",
                            },
                            locks_acquired=["editor_session"],
                        )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["entity_id"] == "101"
        assert runtime_result["entity_name"] == "CodexHintEntity"

        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["args"]["entity_id"] == "101"
        assert command_payload["args"]["entity_name_hint"] == "CodexHintEntity"


def test_execute_component_add_rejects_without_admitted_editor_session() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                try:
                    editor_automation_runtime_service.execute_component_add(
                        request_id="req-component-no-session",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        dry_run=False,
                        args={
                            "entity_id": "101",
                            "components": ["Mesh"],
                            "level_path": "Levels/Main.level",
                        },
                        locks_acquired=["editor_session"],
                    )
                except AdapterExecutionRejected as exc:
                    assert exc.details["preflight_reason"] == "editor-session-not-ensured"
                else:
                    raise AssertionError(
                        "editor.component.add should require an admitted editor session."
                    )


def test_execute_component_add_rejects_without_loaded_level() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

        state_path = editor_automation_runtime_service._state_path(str(project_root))  # noqa: SLF001
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(
            json.dumps({"session_active": True}),
            encoding="utf-8",
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                try:
                    editor_automation_runtime_service.execute_component_add(
                        request_id="req-component-no-level",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        dry_run=False,
                        args={
                            "entity_id": "101",
                            "components": ["Mesh"],
                            "level_path": "Levels/Main.level",
                        },
                        locks_acquired=["editor_session"],
                    )
                except AdapterExecutionRejected as exc:
                    assert exc.details["preflight_reason"] == "level-not-loaded"
                else:
                    raise AssertionError(
                        "editor.component.add should require a loaded level."
                    )


def test_execute_component_add_rejects_when_requested_level_does_not_match_loaded_level() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

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

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                try:
                    editor_automation_runtime_service.execute_component_add(
                        request_id="req-component-level-mismatch",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        dry_run=False,
                        args={
                            "entity_id": "101",
                            "components": ["Mesh"],
                            "level_path": "Levels/Other.level",
                        },
                        locks_acquired=["editor_session"],
                    )
                except AdapterExecutionRejected as exc:
                    assert exc.details["preflight_reason"] == "loaded-level-mismatch"
                    assert exc.details["loaded_level_path"] == "Levels/Main.level"
                    assert exc.details["requested_level_path"] == "Levels/Other.level"
                else:
                    raise AssertionError(
                        "editor.component.add should reject level paths that do not match the loaded level."
                    )


def test_execute_component_add_rejects_without_entity_id() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

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
                    return_value=True,
                ):
                    try:
                        editor_automation_runtime_service.execute_component_add(
                            request_id="req-component-no-entity-id",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={
                                "components": ["Mesh"],
                                "level_path": "Levels/Main.level",
                            },
                            locks_acquired=["editor_session"],
                        )
                    except AdapterExecutionRejected as exc:
                        assert exc.details["preflight_reason"] == "entity-id-invalid"
                    else:
                        raise AssertionError(
                            "editor.component.add should require an explicit entity id."
                        )


def test_execute_component_add_rejects_unsupported_components() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

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
                    return_value=True,
                ):
                    try:
                        editor_automation_runtime_service.execute_component_add(
                            request_id="req-component-unsupported",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={
                                "entity_id": "101",
                                "components": ["Transform"],
                                "level_path": "Levels/Main.level",
                            },
                            locks_acquired=["editor_session"],
                        )
                    except AdapterExecutionRejected as exc:
                        assert exc.details["preflight_reason"] == "unsupported-component-surface"
                        assert exc.details["unsupported_components"] == ["Transform"]
                        assert exc.details["allowlisted_components"] == list(
                            EDITOR_COMPONENT_ADD_ALLOWLIST
                        )
                    else:
                        raise AssertionError(
                            "editor.component.add should reject unsupported component names."
                        )


def test_execute_component_add_rejects_when_bridge_reports_entity_not_found() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        write_heartbeat(project_root)
        write_loaded_level_file(project_root)

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
            expected_operation="editor.component.add",
            response_details={
                "entity_id": "404",
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
            },
            captured=captured,
            response_success=False,
            response_error_code="ENTITY_NOT_FOUND",
            response_result_summary="editor.component.add could not resolve the requested entity in the loaded level.",
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        try:
                            editor_automation_runtime_service.execute_component_add(
                                request_id="req-component-missing-entity",
                                session_id="session-1",
                                workspace_id="workspace-editor-project",
                                executor_id="executor-editor-control-real-local",
                                project_root=str(project_root),
                                engine_root="C:/src/o3de",
                                dry_run=False,
                                args={
                                    "entity_id": "404",
                                    "components": ["Mesh"],
                                    "level_path": "Levels/Main.level",
                                },
                                locks_acquired=["editor_session"],
                            )
                        except AdapterExecutionRejected as exc:
                            assert exc.details["preflight_reason"] == "ENTITY_NOT_FOUND"
                            assert exc.details["bridge_operation"] == "editor.component.add"
                        else:
                            raise AssertionError(
                                "editor.component.add should surface bridge-side entity lookup failures."
                            )

        responder.join(timeout=5)
        assert not responder.is_alive()
        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["operation"] == "editor.component.add"


def test_execute_component_property_get_queues_bridge_command_and_returns_bridge_metadata() -> None:
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
        component_id = "EntityComponentIdPair(EntityId(101), 201)"
        responder = spawn_bridge_responder(
            project_root=project_root,
            expected_operation="editor.component.property.get",
            response_details={
                "component_id": component_id,
                "property_path": "Controller|Configuration|Model Asset",
                "value": "objects/example.azmodel",
                "value_type": "AZ::Data::Asset<AZ::Data::AssetData>",
                "entity_id": "101",
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
                "active_level_path": "Levels/Main.level",
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        with patch(
                            "subprocess.Popen",
                            side_effect=AssertionError(
                                "editor.component.property.get should not launch a one-shot editor process when the bridge is healthy."
                            ),
                        ):
                            payload = (
                                editor_automation_runtime_service.execute_component_property_get(
                                    request_id="req-component-property-1",
                                    session_id="session-1",
                                    workspace_id="workspace-editor-project",
                                    executor_id="executor-editor-control-real-local",
                                    project_root=str(project_root),
                                    engine_root="C:/src/o3de",
                                    dry_run=False,
                                    args={
                                        "component_id": component_id,
                                        "property_path": "Controller|Configuration|Model Asset",
                                        "level_path": "Levels/Main.level",
                                    },
                                    locks_acquired=["editor_session"],
                                )
                            )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        assert runtime_result["bridge_available"] is True
        assert runtime_result["bridge_operation"] == "editor.component.property.get"
        assert runtime_result["bridge_queue_mode"] == "filesystem-inbox"
        assert runtime_result["bridge_command_id"]
        assert runtime_result["component_id"] == component_id
        assert runtime_result["property_path"] == "Controller|Configuration|Model Asset"
        assert runtime_result["value"] == "objects/example.azmodel"
        assert runtime_result["value_type"] == "AZ::Data::Asset<AZ::Data::AssetData>"
        assert runtime_result["entity_id"] == "101"
        assert runtime_result["level_path"] == "Levels/Main.level"
        assert runtime_result["loaded_level_path"] == "Levels/Main.level"
        assert "editor.component.property.get" in runtime_result["exact_editor_apis"]
        assert payload["runtime_script"].endswith("control_plane_bridge_poller.py")

        bridge_paths = editor_automation_runtime_service._bridge_paths(str(project_root))  # noqa: SLF001
        consumed_result_path = (
            bridge_paths["results"] / f"{runtime_result['bridge_command_id']}.json.resp"
        )
        assert not consumed_result_path.exists()

        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["operation"] == "editor.component.property.get"
        assert command_payload["request_id"] == "req-component-property-1"
        assert command_payload["session_id"] == "session-1"
        assert command_payload["workspace_id"] == "workspace-editor-project"
        assert command_payload["executor_id"] == "executor-editor-control-real-local"
        assert command_payload["requires_loaded_level"] is True
        assert command_payload["args"]["component_id"] == component_id
        assert (
            command_payload["args"]["property_path"]
            == "Controller|Configuration|Model Asset"
        )
        assert command_payload["args"]["level_path"] == "Levels/Main.level"

        saved_state = json.loads(state_path.read_text(encoding="utf-8"))
        assert saved_state["editor_transport"] == "bridge"
        assert saved_state["bridge_heartbeat_seen_at"] == runtime_result["bridge_heartbeat_seen_at"]


def test_execute_component_find_returns_live_discovery_provenance() -> None:
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
        component_id = "EntityComponentIdPair(EntityId(101), 201)"
        responder = spawn_bridge_responder(
            project_root=project_root,
            expected_operation="editor.component.find",
            response_details={
                "found": True,
                "lookup_mode": "entity_id",
                "entity_id": "101",
                "entity_name": "Hero",
                "requested_entity_id": "101",
                "component_name": "Mesh",
                "requested_component_name": "Mesh",
                "component_id": component_id,
                "component_refs": [
                    {
                        "component": "Mesh",
                        "component_pair_text": "[ [101] - 201 ]",
                        "entity_id": "101",
                        "entity_name": "Hero",
                    }
                ],
                "matched_count": 1,
                "ambiguous": False,
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
                "active_level_path": "Levels/Main.level",
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        with patch(
                            "subprocess.Popen",
                            side_effect=AssertionError(
                                "editor.component.find should not launch a one-shot editor process when the bridge is healthy."
                            ),
                        ):
                            payload = (
                                editor_automation_runtime_service.execute_component_find(
                                    request_id="req-component-find-1",
                                    session_id="session-1",
                                    workspace_id="workspace-editor-project",
                                    executor_id="executor-editor-control-real-local",
                                    project_root=str(project_root),
                                    engine_root="C:/src/o3de",
                                    dry_run=False,
                                    args={
                                        "entity_id": "101",
                                        "component_name": "mesh",
                                        "level_path": "Levels/Main.level",
                                    },
                                    locks_acquired=["editor_session"],
                                )
                            )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        assert runtime_result["bridge_available"] is True
        assert runtime_result["bridge_operation"] == "editor.component.find"
        assert runtime_result["found"] is True
        assert runtime_result["component_name"] == "Mesh"
        assert runtime_result["component_id"] == component_id
        assert (
            runtime_result["component_id_provenance"]
            == COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT
        )
        assert runtime_result["component_refs"] == [
            {
                "component": "Mesh",
                "component_id": component_id,
                "component_id_provenance": (
                    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT
                ),
                "component_pair_text": "[ [101] - 201 ]",
                "entity_id": "101",
                "entity_name": "Hero",
            }
        ]
        assert "EditorComponentAPIBus.GetComponentOfType" in runtime_result[
            "exact_editor_apis"
        ]

        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["operation"] == "editor.component.find"
        assert command_payload["requires_loaded_level"] is True
        assert command_payload["args"]["entity_id"] == "101"
        assert command_payload["args"]["component_name"] == "Mesh"
        assert command_payload["args"]["level_path"] == "Levels/Main.level"
        assert "property_path" not in command_payload["args"]


def test_execute_component_find_rejects_unsupported_component() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

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
                    return_value=True,
                ):
                    try:
                        editor_automation_runtime_service.execute_component_find(
                            request_id="req-component-find-unsupported",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={
                                "entity_id": "101",
                                "component_name": "Physics",
                                "level_path": "Levels/Main.level",
                            },
                            locks_acquired=["editor_session"],
                        )
                    except AdapterExecutionRejected as exc:
                        assert exc.details["preflight_reason"] == "unsupported-component"
                    else:
                        raise AssertionError(
                            "editor.component.find should reject unsupported components."
                        )


def test_execute_component_property_list_queues_bridge_command_without_reading_values() -> None:
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
        component_id = "EntityComponentIdPair(EntityId(101), 201)"
        property_paths = [
            "Controller|Configuration|Model Asset",
            "Controller|Configuration|Sort Key",
        ]
        responder = spawn_bridge_responder(
            project_root=project_root,
            expected_operation="editor.component.property.list",
            response_details={
                "component_id": component_id,
                "entity_id": "101",
                "component_type": "Mesh",
                "property_paths": property_paths,
                "component_property_count": len(property_paths),
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
                "active_level_path": "Levels/Main.level",
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        with patch(
                            "subprocess.Popen",
                            side_effect=AssertionError(
                                "editor.component.property.list should not launch a one-shot editor process when the bridge is healthy."
                            ),
                        ):
                            payload = (
                                editor_automation_runtime_service.execute_component_property_list(
                                    request_id="req-component-property-list-1",
                                    session_id="session-1",
                                    workspace_id="workspace-editor-project",
                                    executor_id="executor-editor-control-real-local",
                                    project_root=str(project_root),
                                    engine_root="C:/src/o3de",
                                    dry_run=False,
                                    args={
                                        "component_id": component_id,
                                        "level_path": "Levels/Main.level",
                                    },
                                    locks_acquired=["editor_session"],
                                )
                            )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        assert runtime_result["bridge_available"] is True
        assert runtime_result["bridge_operation"] == "editor.component.property.list"
        assert runtime_result["bridge_queue_mode"] == "filesystem-inbox"
        assert runtime_result["bridge_command_id"]
        assert runtime_result["component_id"] == component_id
        assert runtime_result["entity_id"] == "101"
        assert runtime_result["component_type"] == "Mesh"
        assert runtime_result["property_paths"] == property_paths
        assert runtime_result["component_property_count"] == len(property_paths)
        assert "value" not in runtime_result
        assert "EditorComponentAPIBus.BuildComponentPropertyList" in runtime_result[
            "exact_editor_apis"
        ]
        assert payload["runtime_script"].endswith("control_plane_bridge_poller.py")

        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["operation"] == "editor.component.property.list"
        assert command_payload["request_id"] == "req-component-property-list-1"
        assert command_payload["session_id"] == "session-1"
        assert command_payload["workspace_id"] == "workspace-editor-project"
        assert command_payload["executor_id"] == "executor-editor-control-real-local"
        assert command_payload["requires_loaded_level"] is True
        assert command_payload["args"]["component_id"] == component_id
        assert command_payload["args"]["level_path"] == "Levels/Main.level"
        assert "property_path" not in command_payload["args"]

        saved_state = json.loads(state_path.read_text(encoding="utf-8"))
        assert saved_state["editor_transport"] == "bridge"
        assert saved_state["bridge_heartbeat_seen_at"] == runtime_result[
            "bridge_heartbeat_seen_at"
        ]


def test_execute_component_property_list_passes_comment_tree_discovery_options() -> None:
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
        component_id = "EntityComponentIdPair(EntityId(101), 201)"
        discovery = {
            "component_family": "Comment",
            "status": "candidate_selected_readback_only",
            "selected_candidate": {
                "property_path": "Configuration",
                "success": True,
                "value": "",
                "value_type": "AZStd::string",
                "scalar_or_text_like": True,
            },
            "write_target_admitted": False,
            "property_list_admission": False,
            "set_component_property_attempted": False,
        }
        responder = spawn_bridge_responder(
            project_root=project_root,
            expected_operation="editor.component.property.list",
            response_details={
                "component_id": component_id,
                "property_paths": [],
                "raw_property_paths": [""],
                "component_property_count": 0,
                "comment_scalar_discovery": discovery,
                "source_inspection_evidence": {
                    "reflected_serialize_field": "Configuration"
                },
                "exact_editor_apis": [
                    "ControlPlaneEditorBridge filesystem inbox",
                    "editor.component.property.list",
                    "EditorComponentAPIBus.BuildComponentPropertyList",
                    "EditorComponentAPIBus.BuildComponentPropertyTreeEditor",
                    "EditorComponentAPIBus.GetComponentProperty",
                ],
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        payload = (
                            editor_automation_runtime_service.execute_component_property_list(
                                request_id="req-comment-property-tree-discovery-1",
                                session_id="session-1",
                                workspace_id="workspace-editor-project",
                                executor_id="executor-editor-control-real-local",
                                project_root=str(project_root),
                                engine_root="C:/src/o3de",
                                dry_run=False,
                                args={
                                    "component_id": component_id,
                                    "level_path": "Levels/Main.level",
                                    "proof_component_family": "Comment",
                                    "include_property_tree_evidence": True,
                                    "source_guided_readback_paths": ["Configuration"],
                                    "source_inspection_evidence": {
                                        "reflected_serialize_field": "Configuration"
                                    },
                                },
                                locks_acquired=["editor_session"],
                            )
                        )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["property_paths"] == []
        assert runtime_result["raw_property_paths"] == [""]
        assert runtime_result["comment_scalar_discovery"] == discovery
        assert runtime_result["source_inspection_evidence"][
            "reflected_serialize_field"
        ] == "Configuration"
        assert "EditorComponentAPIBus.GetComponentProperty" in runtime_result[
            "exact_editor_apis"
        ]

        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["args"]["proof_component_family"] == "Comment"
        assert command_payload["args"]["include_property_tree_evidence"] is True
        assert command_payload["args"]["source_guided_readback_paths"] == [
            "Configuration"
        ]
        assert "property_path" not in command_payload["args"]


def test_execute_component_property_list_rejects_without_component_id() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

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
                    return_value=True,
                ):
                    try:
                        editor_automation_runtime_service.execute_component_property_list(
                            request_id="req-component-property-list-no-component-id",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={"level_path": "Levels/Main.level"},
                            locks_acquired=["editor_session"],
                        )
                    except AdapterExecutionRejected as exc:
                        assert exc.details["preflight_reason"] == "component-id-missing"
                    else:
                        raise AssertionError(
                            "editor.component.property.list should require an explicit component_id."
                        )


def test_execute_component_property_list_rejects_untyped_bridge_property_paths() -> None:
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

        component_id = "EntityComponentIdPair(EntityId(101), 201)"
        captured: dict[str, object] = {}
        responder = spawn_bridge_responder(
            project_root=project_root,
            expected_operation="editor.component.property.list",
            response_details={
                "component_id": component_id,
                "property_paths": ["Controller|Configuration|Model Asset", 123],
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        try:
                            editor_automation_runtime_service.execute_component_property_list(
                                request_id="req-component-property-list-invalid",
                                session_id="session-1",
                                workspace_id="workspace-editor-project",
                                executor_id="executor-editor-control-real-local",
                                project_root=str(project_root),
                                engine_root="C:/src/o3de",
                                dry_run=False,
                                args={
                                    "component_id": component_id,
                                    "level_path": "Levels/Main.level",
                                },
                                locks_acquired=["editor_session"],
                            )
                        except AdapterExecutionRejected as exc:
                            assert (
                                exc.details["preflight_reason"]
                                == "bridge-property-list-invalid"
                            )
                            assert exc.details["bridge_operation"] == (
                                "editor.component.property.list"
                            )
                        else:
                            raise AssertionError(
                                "editor.component.property.list should reject non-string property paths."
                            )

        responder.join(timeout=5)
        assert not responder.is_alive()
        assert isinstance(captured.get("command"), dict)


def test_execute_entity_exists_queues_bridge_command_and_returns_bridge_metadata() -> None:
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
            expected_operation="editor.entity.exists",
            response_details={
                "exists": True,
                "lookup_mode": "entity_id",
                "entity_id": "101",
                "entity_name": "ExampleEntity",
                "requested_entity_id": "101",
                "matched_count": 1,
                "matched_entity_ids": ["101"],
                "ambiguous": False,
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
                "active_level_path": "Levels/Main.level",
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        with patch(
                            "subprocess.Popen",
                            side_effect=AssertionError(
                                "editor.entity.exists should not launch a one-shot editor process when the bridge is healthy."
                            ),
                        ):
                            payload = editor_automation_runtime_service.execute_entity_exists(
                                request_id="req-entity-exists-1",
                                session_id="session-1",
                                workspace_id="workspace-editor-project",
                                executor_id="executor-editor-control-real-local",
                                project_root=str(project_root),
                                engine_root="C:/src/o3de",
                                dry_run=False,
                                args={
                                    "entity_id": "101",
                                    "level_path": "Levels/Main.level",
                                },
                                locks_acquired=["editor_session"],
                            )

        responder.join(timeout=5)
        assert not responder.is_alive()
        runtime_result = payload["runtime_result"]
        assert runtime_result["editor_transport"] == "bridge"
        assert runtime_result["bridge_available"] is True
        assert runtime_result["bridge_operation"] == "editor.entity.exists"
        assert runtime_result["bridge_queue_mode"] == "filesystem-inbox"
        assert runtime_result["bridge_command_id"]
        assert runtime_result["exists"] is True
        assert runtime_result["lookup_mode"] == "entity_id"
        assert runtime_result["entity_id"] == "101"
        assert runtime_result["entity_name"] == "ExampleEntity"
        assert runtime_result["matched_count"] == 1
        assert runtime_result["matched_entity_ids"] == ["101"]
        assert runtime_result["ambiguous"] is False
        assert runtime_result["level_path"] == "Levels/Main.level"
        assert runtime_result["loaded_level_path"] == "Levels/Main.level"
        assert "editor.entity.exists" in runtime_result["exact_editor_apis"]
        assert payload["runtime_script"].endswith("control_plane_bridge_poller.py")

        bridge_paths = editor_automation_runtime_service._bridge_paths(str(project_root))  # noqa: SLF001
        consumed_result_path = (
            bridge_paths["results"] / f"{runtime_result['bridge_command_id']}.json.resp"
        )
        assert not consumed_result_path.exists()

        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["operation"] == "editor.entity.exists"
        assert command_payload["request_id"] == "req-entity-exists-1"
        assert command_payload["session_id"] == "session-1"
        assert command_payload["workspace_id"] == "workspace-editor-project"
        assert command_payload["executor_id"] == "executor-editor-control-real-local"
        assert command_payload["requires_loaded_level"] is True
        assert command_payload["args"]["entity_id"] == "101"
        assert command_payload["args"]["level_path"] == "Levels/Main.level"
        assert "entity_name" not in command_payload["args"]

        saved_state = json.loads(state_path.read_text(encoding="utf-8"))
        assert saved_state["editor_transport"] == "bridge"
        assert saved_state["bridge_heartbeat_seen_at"] == runtime_result["bridge_heartbeat_seen_at"]


def test_execute_entity_exists_rejects_ambiguous_lookup_target() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

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
                    return_value=True,
                ):
                    try:
                        editor_automation_runtime_service.execute_entity_exists(
                            request_id="req-entity-exists-ambiguous-target",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={
                                "entity_id": "101",
                                "entity_name": "ExampleEntity",
                            },
                            locks_acquired=["editor_session"],
                        )
                    except AdapterExecutionRejected as exc:
                        assert exc.details["preflight_reason"] == (
                            "entity-lookup-target-invalid"
                        )
                    else:
                        raise AssertionError(
                            "editor.entity.exists should require exactly one lookup target."
                        )


def test_execute_component_property_get_rejects_without_admitted_editor_session() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                try:
                    editor_automation_runtime_service.execute_component_property_get(
                        request_id="req-component-property-no-session",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        dry_run=False,
                        args={
                            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                            "property_path": "Controller|Configuration|Model Asset",
                        },
                        locks_acquired=["editor_session"],
                    )
                except AdapterExecutionRejected as exc:
                    assert exc.details["preflight_reason"] == "editor-session-not-ensured"
                else:
                    raise AssertionError(
                        "editor.component.property.get should require an admitted editor session."
                    )


def test_execute_component_property_get_rejects_without_loaded_level() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

        state_path = editor_automation_runtime_service._state_path(str(project_root))  # noqa: SLF001
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(
            json.dumps({"session_active": True}),
            encoding="utf-8",
        )

        with patch.dict(
            "os.environ",
            {
                "O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner",
            },
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                try:
                    editor_automation_runtime_service.execute_component_property_get(
                        request_id="req-component-property-no-level",
                        session_id="session-1",
                        workspace_id="workspace-editor-project",
                        executor_id="executor-editor-control-real-local",
                        project_root=str(project_root),
                        engine_root="C:/src/o3de",
                        dry_run=False,
                        args={
                            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                            "property_path": "Controller|Configuration|Model Asset",
                        },
                        locks_acquired=["editor_session"],
                    )
                except AdapterExecutionRejected as exc:
                    assert exc.details["preflight_reason"] == "level-not-loaded"
                else:
                    raise AssertionError(
                        "editor.component.property.get should require a loaded level."
                    )


def test_execute_component_property_get_rejects_without_component_id() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

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
                    return_value=True,
                ):
                    try:
                        editor_automation_runtime_service.execute_component_property_get(
                            request_id="req-component-property-no-component-id",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={
                                "property_path": "Controller|Configuration|Model Asset",
                            },
                            locks_acquired=["editor_session"],
                        )
                    except AdapterExecutionRejected as exc:
                        assert exc.details["preflight_reason"] == "component-id-missing"
                    else:
                        raise AssertionError(
                            "editor.component.property.get should require an explicit component_id."
                        )


def test_execute_component_property_get_rejects_without_property_path() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)

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
                    return_value=True,
                ):
                    try:
                        editor_automation_runtime_service.execute_component_property_get(
                            request_id="req-component-property-no-property-path",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args={
                                "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                            },
                            locks_acquired=["editor_session"],
                        )
                    except AdapterExecutionRejected as exc:
                        assert exc.details["preflight_reason"] == "property-path-missing"
                        assert (
                            exc.details["component_id"]
                            == "EntityComponentIdPair(EntityId(101), 201)"
                        )
                    else:
                        raise AssertionError(
                            "editor.component.property.get should require an explicit property_path."
                        )


def test_execute_component_property_get_rejects_when_bridge_reports_component_not_found() -> None:
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
            expected_operation="editor.component.property.get",
            response_details={
                "component_id": "EntityComponentIdPair(EntityId(404), 999)",
                "property_path": "Controller|Configuration|Model Asset",
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
            },
            captured=captured,
            response_success=False,
            response_error_code="COMPONENT_NOT_FOUND",
            response_result_summary=(
                "editor.component.property.get could not resolve the requested explicit "
                "component in the loaded level."
            ),
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
                    with patch.object(
                        editor_automation_runtime_service,
                        "_bridge_has_live_pulse",
                        return_value=True,
                    ):
                        try:
                            editor_automation_runtime_service.execute_component_property_get(
                                request_id="req-component-property-missing-component",
                                session_id="session-1",
                                workspace_id="workspace-editor-project",
                                executor_id="executor-editor-control-real-local",
                                project_root=str(project_root),
                                engine_root="C:/src/o3de",
                                dry_run=False,
                                args={
                                    "component_id": "EntityComponentIdPair(EntityId(404), 999)",
                                    "property_path": "Controller|Configuration|Model Asset",
                                    "level_path": "Levels/Main.level",
                                },
                                locks_acquired=["editor_session"],
                            )
                        except AdapterExecutionRejected as exc:
                            assert exc.details["preflight_reason"] == "COMPONENT_NOT_FOUND"
                            assert exc.details["bridge_operation"] == "editor.component.property.get"
                        else:
                            raise AssertionError(
                                "editor.component.property.get should surface bridge-side component lookup failures."
                            )

        responder.join(timeout=5)
        assert not responder.is_alive()
        command_payload = captured["command"]
        assert isinstance(command_payload, dict)
        assert command_payload["operation"] == "editor.component.property.get"


def camera_scalar_write_args(**overrides: object) -> dict[str, object]:
    args: dict[str, object] = {
        "component_name": CAMERA_SCALAR_WRITE_PROOF_COMPONENT,
        "component_id": "EntityComponentIdPair(EntityId(101), 201)",
        "component_id_provenance": (
            COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
        ),
        "property_path": CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH,
        "value": True,
        "expected_current_value": False,
        "level_path": "Levels/Main.level",
        "restore_boundary_id": "restore-boundary-1",
    }
    args.update(overrides)
    return args


def test_execute_camera_scalar_write_proof_queues_exact_proof_bridge_operation() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        write_loaded_editor_state(project_root)

        bridge_response = {
            "operation": CAMERA_SCALAR_WRITE_PROOF_OPERATION,
            "bridge_command_id": "bridge-camera-write-1",
            "success": True,
            "bridge_name": "ControlPlaneEditorBridge",
            "bridge_version": "0.1.0",
            "finished_at": "2026-04-26T00:00:01Z",
            "result_summary": "Camera scalar bool property write was verified.",
            "details": {
                "component_name": CAMERA_SCALAR_WRITE_PROOF_COMPONENT,
                "component_id": "EntityComponentIdPair(EntityId(101), 201)",
                "component_id_provenance": (
                    COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
                ),
                "property_path": CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH,
                "previous_value": False,
                "requested_value": True,
                "value": True,
                "value_type": "bool",
                "changed": True,
                "write_verified": True,
                "restore_boundary_id": "restore-boundary-1",
                "level_path": "Levels/Main.level",
                "loaded_level_path": "Levels/Main.level",
                "exact_editor_apis": [
                    "ControlPlaneEditorBridge filesystem inbox",
                    CAMERA_SCALAR_WRITE_PROOF_OPERATION,
                    "EditorComponentAPIBus.GetComponentProperty",
                    "EditorComponentAPIBus.SetComponentProperty",
                ],
            },
        }

        with patch.dict(
            "os.environ",
            {"O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner"},
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                with patch.object(
                    editor_automation_runtime_service,
                    "_bridge_host_available",
                    return_value=True,
                ):
                    with patch.object(
                        editor_automation_runtime_service,
                        "_invoke_bridge_command",
                        return_value=bridge_response,
                    ) as invoke_bridge_command:
                        payload = (
                            editor_automation_runtime_service.execute_camera_scalar_write_proof(
                                request_id="req-camera-scalar-write-proof-1",
                                session_id="session-1",
                                workspace_id="workspace-editor-project",
                                executor_id="executor-editor-control-real-local",
                                project_root=str(project_root),
                                engine_root="C:/src/o3de",
                                dry_run=False,
                                args=camera_scalar_write_args(),
                                locks_acquired=["editor_session"],
                            )
                        )

        runtime_result = payload["runtime_result"]
        assert runtime_result["ok"] is True
        assert runtime_result["proof_only"] is True
        assert runtime_result["public_admission"] is False
        assert runtime_result["write_admission"] is False
        assert runtime_result["property_list_admission"] is False
        assert runtime_result["bridge_operation"] == CAMERA_SCALAR_WRITE_PROOF_OPERATION
        assert runtime_result["component_name"] == CAMERA_SCALAR_WRITE_PROOF_COMPONENT
        assert runtime_result["property_path"] == CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH
        assert runtime_result["previous_value"] is False
        assert runtime_result["requested_value"] is True
        assert runtime_result["value"] is True
        assert runtime_result["write_verified"] is True

        command_kwargs = invoke_bridge_command.call_args.kwargs
        assert command_kwargs["tool"] == CAMERA_SCALAR_WRITE_PROOF_OPERATION
        assert command_kwargs["operation"] == CAMERA_SCALAR_WRITE_PROOF_OPERATION
        assert command_kwargs["args"] == {
            "component_name": CAMERA_SCALAR_WRITE_PROOF_COMPONENT,
            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
            "component_id_provenance": (
                COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
            ),
            "property_path": CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH,
            "value": True,
            "expected_current_value": False,
            "level_path": "Levels/Main.level",
            "restore_boundary_id": "restore-boundary-1",
            "proof_only": True,
        }


@pytest.mark.parametrize(
    ("overrides", "preflight_reason"),
    [
        (
            {"component_name": "Mesh"},
            "camera-scalar-write-proof-component-unsupported",
        ),
        (
            {"property_path": "Controller|Configuration|Field of view"},
            "camera-scalar-write-proof-property-unsupported",
        ),
        (
            {"value": "true"},
            "camera-scalar-write-proof-value-not-bool",
        ),
        (
            {"component_id_provenance": "serialized_prefab_record"},
            "component-id-provenance-not-admitted-runtime-add",
        ),
    ],
)
def test_execute_camera_scalar_write_proof_rejects_arbitrary_targets(
    overrides: dict[str, object],
    preflight_reason: str,
) -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "project"
        project_root.mkdir(parents=True, exist_ok=True)
        write_editor_project_manifest(project_root)
        write_loaded_editor_state(project_root)

        with patch.dict(
            "os.environ",
            {"O3DE_TARGET_EDITOR_RUNNER": "fake-editor-runner"},
            clear=False,
        ):
            with patch("shutil.which", return_value="C:/fake/fake-editor-runner.exe"):
                with patch.object(
                    editor_automation_runtime_service,
                    "_bridge_host_available",
                    return_value=True,
                ):
                    try:
                        editor_automation_runtime_service.execute_camera_scalar_write_proof(
                            request_id="req-camera-scalar-write-proof-reject",
                            session_id="session-1",
                            workspace_id="workspace-editor-project",
                            executor_id="executor-editor-control-real-local",
                            project_root=str(project_root),
                            engine_root="C:/src/o3de",
                            dry_run=False,
                            args=camera_scalar_write_args(**overrides),
                            locks_acquired=["editor_session"],
                        )
                    except AdapterExecutionRejected as exc:
                        assert exc.details["preflight_reason"] == preflight_reason
                    else:
                        raise AssertionError(
                            "Camera scalar write proof should reject arbitrary targets."
                        )


def test_execute_exact_camera_bool_write_wrapper_marks_public_admission() -> None:
    proof_payload = {
        "runtime_result": {
            "ok": True,
            "message": "Camera scalar bool property was written through a proof-only persistent bridge path.",
            "proof_only": True,
            "public_admission": False,
            "write_admission": False,
            "property_list_admission": False,
            "component_name": CAMERA_SCALAR_WRITE_PROOF_COMPONENT,
            "component_id": "EntityComponentIdPair(EntityId(101), 201)",
            "component_id_provenance": (
                COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
            ),
            "property_path": CAMERA_SCALAR_WRITE_PROOF_PROPERTY_PATH,
            "value_type": "bool",
            "previous_value": False,
            "requested_value": True,
            "value": True,
            "changed": True,
            "write_verified": True,
            "bridge_operation": CAMERA_SCALAR_WRITE_PROOF_OPERATION,
            "restore_boundary_id": "restore-boundary-1",
        },
        "runner_command": ["fake-editor-runner"],
        "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
    }
    with patch.object(
        editor_automation_runtime_service,
        "execute_camera_scalar_write_proof",
        return_value=proof_payload,
    ) as proof_method:
        payload = (
            editor_automation_runtime_service.execute_camera_bool_make_active_on_activation_write(
                request_id="req-camera-bool-write",
                session_id="session-1",
                workspace_id="workspace-editor-project",
                executor_id="executor-editor-control-real-local",
                project_root="C:/project",
                engine_root="C:/src/o3de",
                dry_run=False,
                args=camera_scalar_write_args(),
                locks_acquired=["editor_session"],
            )
        )

    proof_method.assert_called_once()
    runtime_result = payload["runtime_result"]
    assert runtime_result["tool"] == CAMERA_BOOL_WRITE_CAPABILITY
    assert runtime_result["proof_bridge_operation"] == CAMERA_SCALAR_WRITE_PROOF_OPERATION
    assert runtime_result["proof_only"] is False
    assert runtime_result["public_admission"] is True
    assert runtime_result["write_admission"] is True
    assert runtime_result["property_list_admission"] is False
    assert runtime_result["target_status"] == "admitted_exact_camera_bool_write"
    assert "not generalized undo" in runtime_result["restore_or_revert_guidance"]


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
