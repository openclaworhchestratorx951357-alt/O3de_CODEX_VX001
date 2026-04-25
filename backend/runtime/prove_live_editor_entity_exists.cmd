@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "BACKEND_ROOT=%SCRIPT_DIR%.."
set "PYTHON_EXE=%BACKEND_ROOT%\.venv\Scripts\python.exe"

if exist "%PYTHON_EXE%" (
  "%PYTHON_EXE%" "%SCRIPT_DIR%prove_live_editor_entity_exists.py" %*
) else (
  python "%SCRIPT_DIR%prove_live_editor_entity_exists.py" %*
)
