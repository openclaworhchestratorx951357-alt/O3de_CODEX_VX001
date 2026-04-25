[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$MissionArgs = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendVenvPython = Join-Path $RepoRoot "backend\.venv\Scripts\python.exe"
$MissionControlScript = Join-Path $PSScriptRoot "mission_control.py"

function Get-PythonExecutable {
    if (Test-Path $BackendVenvPython) {
        return $BackendVenvPython
    }

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($null -ne $pythonCommand) {
        return $pythonCommand.Source
    }

    throw "Unable to locate Python. Expected $BackendVenvPython or a python executable on PATH."
}

if (-not (Test-Path $MissionControlScript)) {
    throw "Expected mission-control script at $MissionControlScript"
}

$python = Get-PythonExecutable
if ($MissionArgs.Count -eq 0) {
    $MissionArgs = @("board")
}

& $python $MissionControlScript @MissionArgs
exit $LASTEXITCODE
