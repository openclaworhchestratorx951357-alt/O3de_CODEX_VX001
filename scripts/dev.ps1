[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "bootstrap-worktree",
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

function Get-PrimaryRepoRoot {
    Push-Location $RepoRoot
    try {
        $gitCommonDir = (git rev-parse --path-format=absolute --git-common-dir).Trim()
        return (Split-Path -Parent $gitCommonDir)
    }
    finally {
        Pop-Location
    }
}

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

function Get-NpmExecutable {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -ne $npmCommand) {
        return $npmCommand.Source
    }

    $fallbackNpmCommand = Get-Command npm -ErrorAction SilentlyContinue
    if ($null -ne $fallbackNpmCommand) {
        return $fallbackNpmCommand.Source
    }

    throw "Unable to locate npm or npm.cmd on PATH."
}

function Ensure-Junction {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Target
    )

    if (Test-Path $Path) {
        return
    }

    if (-not (Test-Path $Target)) {
        throw "Cannot create worktree junction because the target does not exist: $Target"
    }

    New-Item -ItemType Junction -Path $Path -Target $Target | Out-Null
}

function Ensure-LocalFrontendNodeModules {
    $nodeModulesPath = Join-Path $FrontendDir "node_modules"
    if (Test-Path $nodeModulesPath) {
        $existingNodeModules = Get-Item -Force $nodeModulesPath
        if ($existingNodeModules.LinkType -eq "Junction") {
            [System.IO.Directory]::Delete($nodeModulesPath)
        }
        else {
            return
        }
    }

    Invoke-RepoProcess -WorkingDirectory $FrontendDir -FilePath "npm" -ArgumentList @("install")
}

function Invoke-RepoProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [string[]]$ArgumentList = @(),
        [hashtable]$Environment = @{}
    )

    Push-Location $WorkingDirectory
    try {
        $savedEnvironment = @{}
        foreach ($variableName in $Environment.Keys) {
            $savedEnvironment[$variableName] = [Environment]::GetEnvironmentVariable($variableName, "Process")
            [Environment]::SetEnvironmentVariable($variableName, $Environment[$variableName], "Process")
        }

        try {
            & $FilePath @ArgumentList
            if ($LASTEXITCODE -ne 0) {
                throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($ArgumentList -join ' ')"
            }
        }
        finally {
            foreach ($variableName in $Environment.Keys) {
                [Environment]::SetEnvironmentVariable($variableName, $savedEnvironment[$variableName], "Process")
            }
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-WorktreeBootstrap {
    $primaryRepoRoot = Get-PrimaryRepoRoot
    if ($primaryRepoRoot -eq $RepoRoot) {
        Write-Host "Primary checkout detected; no worktree bootstrap needed."
        return
    }

    Ensure-Junction -Path (Join-Path $BackendDir ".venv") -Target (Join-Path $primaryRepoRoot "backend\.venv")
    Ensure-Junction -Path (Join-Path $BackendDir ".vendor_tools") -Target (Join-Path $primaryRepoRoot "backend\.vendor_tools")
    Ensure-LocalFrontendNodeModules

    Write-Host "Worktree bootstrap complete. Shared dependency directories are linked from:"
    Write-Host $primaryRepoRoot
}

function Invoke-BackendLint {
    Invoke-RepoProcess `
        -WorkingDirectory $RepoRoot `
        -FilePath (Get-BackendPython) `
        -ArgumentList @("-m", "ruff", "check", "backend/app", "backend/tests", "--no-cache") `
        -Environment @{ PYTHONPATH = $BackendPythonPath }
}

function Invoke-BackendTests {
    Invoke-RepoProcess `
        -WorkingDirectory $RepoRoot `
        -FilePath (Get-BackendPython) `
        -ArgumentList @("-m", "pytest", "backend/tests", "-q") `
        -Environment @{ PYTHONPATH = $BackendPythonPath }
}

function Invoke-FrontendLint {
    Invoke-RepoProcess -WorkingDirectory $FrontendDir -FilePath (Get-NpmExecutable) -ArgumentList @("run", "lint")
}

function Invoke-FrontendBuild {
    Invoke-RepoProcess -WorkingDirectory $FrontendDir -FilePath (Get-NpmExecutable) -ArgumentList @("run", "build")
}

function Invoke-ComposeBuild {
    Invoke-RepoProcess -WorkingDirectory $RepoRoot -FilePath "docker" -ArgumentList @("compose", "build")
}

function Invoke-ComposeUp {
    Invoke-RepoProcess -WorkingDirectory $RepoRoot -FilePath "docker" -ArgumentList @("compose", "up", "--build")
}

switch ($Task) {
    "bootstrap-worktree" { Invoke-WorktreeBootstrap }
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
