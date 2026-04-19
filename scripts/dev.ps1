[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "backend-lint",
        "backend-test",
        "frontend-lint",
        "frontend-build",
        "compose-up",
        "compose-build",
        "checks"
    )]
    [string]$Task = "checks"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RepoRoot "backend"
$FrontendDir = Join-Path $RepoRoot "frontend"
$VendorTools = Join-Path $BackendDir ".vendor_tools"
$BackendPythonPath = "$VendorTools;$BackendDir"
$BackendVenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

function Get-BackendPython {
    if (Test-Path $BackendVenvPython) {
        return $BackendVenvPython
    }

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($null -ne $pythonCommand) {
        return $pythonCommand.Source
    }

    throw "Unable to locate a backend Python interpreter. Expected $BackendVenvPython or a python executable on PATH."
}

function Invoke-RepoCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string]$Command
    )

    Push-Location $WorkingDirectory
    try {
        Invoke-Expression $Command
    }
    finally {
        Pop-Location
    }
}

function Invoke-BackendLint {
    Invoke-RepoCommand -WorkingDirectory $RepoRoot -Command (
        '$env:PYTHONPATH="' + $BackendPythonPath + '"; ' +
        '& "' + (Get-BackendPython) + '" -m ruff check backend/app backend/tests --no-cache'
    )
}

function Invoke-BackendTests {
    Invoke-RepoCommand -WorkingDirectory $RepoRoot -Command (
        '$env:PYTHONPATH="' + $BackendPythonPath + '"; ' +
        '& "' + (Get-BackendPython) + '" -m pytest backend/tests -q'
    )
}

function Invoke-FrontendLint {
    Invoke-RepoCommand -WorkingDirectory $FrontendDir -Command "npm run lint"
}

function Invoke-FrontendBuild {
    Invoke-RepoCommand -WorkingDirectory $FrontendDir -Command "npm run build"
}

function Invoke-ComposeBuild {
    Invoke-RepoCommand -WorkingDirectory $RepoRoot -Command "docker compose build"
}

function Invoke-ComposeUp {
    Invoke-RepoCommand -WorkingDirectory $RepoRoot -Command "docker compose up --build"
}

switch ($Task) {
    "backend-lint" { Invoke-BackendLint }
    "backend-test" { Invoke-BackendTests }
    "frontend-lint" { Invoke-FrontendLint }
    "frontend-build" { Invoke-FrontendBuild }
    "compose-build" { Invoke-ComposeBuild }
    "compose-up" { Invoke-ComposeUp }
    "checks" {
        Invoke-BackendLint
        Invoke-BackendTests
        Invoke-FrontendLint
        Invoke-FrontendBuild
    }
}
