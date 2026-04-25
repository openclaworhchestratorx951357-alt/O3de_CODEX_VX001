$env:O3DE_TARGET_PROJECT_ROOT = "C:\Users\topgu\O3DE\Projects\McpSandbox"
$env:O3DE_TARGET_ENGINE_ROOT = "C:\src\o3de"
$env:O3DE_TARGET_EDITOR_RUNNER = "C:\Users\topgu\O3DE\Projects\McpSandbox\build\windows\bin\profile\Editor.exe"
$env:O3DE_EDITOR_SCRIPT_RUNNER = $env:O3DE_TARGET_EDITOR_RUNNER
Remove-Item Env:O3DE_CONTROL_PLANE_DB_PATH -ErrorAction SilentlyContinue
$env:O3DE_CONTROL_PLANE_DB_STRATEGY = "operator"
$env:O3DE_CONTROL_PLANE_DB_FALLBACK_DIR = Join-Path $env:LOCALAPPDATA "O3DE_CODEX_VX001\live-verify-db"
$env:O3DE_ADAPTER_MODE = "hybrid"

Set-Location "C:\Users\topgu\OneDrive\Documents\GitHub\O3de_CODEX_VX001\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
