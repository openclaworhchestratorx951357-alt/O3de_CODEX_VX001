@echo off
set "O3DE_TARGET_PROJECT_ROOT=C:\Users\topgu\O3DE\Projects\McpSandbox"
set "O3DE_TARGET_ENGINE_ROOT=C:\src\o3de"
set "O3DE_TARGET_EDITOR_RUNNER=C:\Users\topgu\O3DE\Projects\McpSandbox\build\windows\bin\profile\Editor.exe"
set "O3DE_EDITOR_SCRIPT_RUNNER=%O3DE_TARGET_EDITOR_RUNNER%"
set "O3DE_CONTROL_PLANE_DB_PATH="
set "O3DE_CONTROL_PLANE_DB_STRATEGY=operator"
set "O3DE_CONTROL_PLANE_DB_FALLBACK_DIR=%LOCALAPPDATA%\O3DE_CODEX_VX001\live-verify-db"
set "O3DE_ADAPTER_MODE=hybrid"

cd /d C:\Users\topgu\OneDrive\Documents\GitHub\O3de_CODEX_VX001\backend
call .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
