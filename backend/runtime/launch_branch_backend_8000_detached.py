from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8000

RUNTIME_DIR = Path(__file__).resolve().parent
BACKEND_DIR = RUNTIME_DIR.parent
PYTHON_EXE = (
    BACKEND_DIR / ".venv" / "Scripts" / "python.exe"
    if os.name == "nt"
    else BACKEND_DIR / ".venv" / "bin" / "python"
)

OUT_LOG_PATH = RUNTIME_DIR / "live-verify-uvicorn.out.log"
ERR_LOG_PATH = RUNTIME_DIR / "live-verify-uvicorn.err.log"
PID_PATH = RUNTIME_DIR / "live-verify-uvicorn.pid"
MANIFEST_PATH = RUNTIME_DIR / "live-verify-launch.json"

TARGET_PROJECT_ROOT = r"C:\Users\topgu\O3DE\Projects\McpSandbox"
TARGET_ENGINE_ROOT = r"C:\src\o3de"
TARGET_EDITOR_RUNNER = (
    r"C:\Users\topgu\O3DE\Projects\McpSandbox\build\windows\bin\profile\Editor.exe"
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _operator_db_fallback_dir() -> str | None:
    localappdata = os.getenv("LOCALAPPDATA", "").strip()
    if not localappdata:
        return None
    return str(Path(localappdata) / "O3DE_CODEX_VX001" / "live-verify-db")


def _operator_db_path() -> str | None:
    fallback_dir = _operator_db_fallback_dir()
    if fallback_dir is None:
        return None
    return str(Path(fallback_dir) / "control_plane.sqlite3")


def _listening_process(port: int) -> tuple[int | None, str | None]:
    result = subprocess.run(
        ["netstat", "-ano"],
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    for raw_line in result.stdout.splitlines():
        line = raw_line.strip()
        if f":{port}" not in line or "LISTENING" not in line:
            continue
        parts = line.split()
        if parts and parts[-1].isdigit():
            return int(parts[-1]), line
    return None, None


def _terminate_existing_listener(port: int) -> tuple[int | None, str | None]:
    pid, line = _listening_process(port)
    if pid is None:
        return None, None
    subprocess.run(
        ["taskkill", "/PID", str(pid), "/F"],
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        current_pid, _ = _listening_process(port)
        if current_pid != pid:
            break
        time.sleep(0.25)
    return pid, line


def _build_env() -> dict[str, str]:
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["O3DE_TARGET_PROJECT_ROOT"] = TARGET_PROJECT_ROOT
    env["O3DE_TARGET_ENGINE_ROOT"] = TARGET_ENGINE_ROOT
    env["O3DE_TARGET_EDITOR_RUNNER"] = TARGET_EDITOR_RUNNER
    env["O3DE_EDITOR_SCRIPT_RUNNER"] = TARGET_EDITOR_RUNNER
    env.pop("O3DE_CONTROL_PLANE_DB_PATH", None)
    env["O3DE_CONTROL_PLANE_DB_STRATEGY"] = "operator"
    fallback_dir = _operator_db_fallback_dir()
    if fallback_dir:
        env["O3DE_CONTROL_PLANE_DB_FALLBACK_DIR"] = fallback_dir
    env["O3DE_ADAPTER_MODE"] = "hybrid"
    return env


def _reset_log_file(path: Path) -> None:
    deadline = time.monotonic() + 15
    last_error: PermissionError | None = None
    while time.monotonic() < deadline:
        try:
            path.write_text("", encoding="utf-8")
            return
        except PermissionError as exc:
            last_error = exc
            time.sleep(0.25)
    if last_error is not None:
        raise last_error


def _launch_command() -> list[str]:
    python_exe = PYTHON_EXE if PYTHON_EXE.exists() else Path(sys.executable)
    return [
        str(python_exe),
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        str(PORT),
    ]


def main() -> int:
    previous_pid, previous_line = _terminate_existing_listener(PORT)
    _reset_log_file(OUT_LOG_PATH)
    _reset_log_file(ERR_LOG_PATH)

    env = _build_env()
    fallback_dir = env.get("O3DE_CONTROL_PLANE_DB_FALLBACK_DIR")
    if fallback_dir:
        Path(fallback_dir).mkdir(parents=True, exist_ok=True)
    command = _launch_command()
    creationflags = 0
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS

    with (
        OUT_LOG_PATH.open("w", encoding="utf-8") as stdout_handle,
        ERR_LOG_PATH.open("w", encoding="utf-8") as stderr_handle,
    ):
        process = subprocess.Popen(
            command,
            cwd=BACKEND_DIR,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=stdout_handle,
            stderr=stderr_handle,
            creationflags=creationflags,
        )

    deadline = time.monotonic() + 20
    listening_pid = None
    listening_line = None
    while time.monotonic() < deadline:
        listening_pid, listening_line = _listening_process(PORT)
        if listening_pid == process.pid:
            break
        if process.poll() is not None:
            break
        time.sleep(0.25)

    PID_PATH.write_text(f"{process.pid}\n", encoding="utf-8")
    manifest = {
        "launched_at": _utc_now(),
        "host": HOST,
        "port": PORT,
        "previous_listener_pid": previous_pid,
        "previous_listener_line": previous_line,
        "pid": process.pid,
        "command": command,
        "cwd": str(BACKEND_DIR),
        "stdout_log": str(OUT_LOG_PATH),
        "stderr_log": str(ERR_LOG_PATH),
        "pid_file": str(PID_PATH),
        "listening_pid": listening_pid,
        "listening_line": listening_line,
        "process_returncode": process.poll(),
        "db_strategy": env["O3DE_CONTROL_PLANE_DB_STRATEGY"],
        "expected_db_path": _operator_db_path(),
        "env": {
            "O3DE_TARGET_PROJECT_ROOT": env["O3DE_TARGET_PROJECT_ROOT"],
            "O3DE_TARGET_ENGINE_ROOT": env["O3DE_TARGET_ENGINE_ROOT"],
            "O3DE_TARGET_EDITOR_RUNNER": env["O3DE_TARGET_EDITOR_RUNNER"],
            "O3DE_EDITOR_SCRIPT_RUNNER": env["O3DE_EDITOR_SCRIPT_RUNNER"],
            "O3DE_CONTROL_PLANE_DB_STRATEGY": env["O3DE_CONTROL_PLANE_DB_STRATEGY"],
            "O3DE_CONTROL_PLANE_DB_FALLBACK_DIR": env.get("O3DE_CONTROL_PLANE_DB_FALLBACK_DIR"),
            "O3DE_ADAPTER_MODE": env["O3DE_ADAPTER_MODE"],
        },
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
