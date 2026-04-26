[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "bootstrap-worktree",
        "runner-diagnostics",
        "backend-lint",
        "backend-test",
        "surface-matrix-check",
        "mission-control",
        "live-status",
        "live-start",
        "live-stop",
        "live-restart",
        "live-bridge-start",
        "live-proof",
        "live-entity-exists-proof",
        "live-component-find-proof",
        "live-property-target-readback-proof",
        "live-property-list-proof",
        "live-comment-scalar-target-proof",
        "desktop-status",
        "desktop-start",
        "desktop-stop",
        "desktop-restart",
        "desktop-shortcut",
        "app-os-readiness",
        "frontend-lint",
        "frontend-build",
        "frontend-dev",
        "frontend-smoke",
        "compose-up",
        "compose-build",
        "checks"
    )]
    [string]$Task = "checks",
    [string]$FrontendHost = "127.0.0.1",
    [ValidateRange(1, 65535)]
    [int]$FrontendPort = 4173,
    [string]$ApiBaseUrl = "http://127.0.0.1:8000",
    [ValidateRange(5, 120)]
    [int]$FrontendStartupTimeoutSeconds = 20,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$TaskArgs = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RepoRoot "backend"
$FrontendDir = Join-Path $RepoRoot "frontend"
$VendorTools = Join-Path $BackendDir ".vendor_tools"
$BackendPythonPath = "$VendorTools;$BackendDir"
$BackendVenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$LiveRuntimeControlScript = Join-Path $BackendDir "runtime\live_verify_control.ps1"
$MissionControlScript = Join-Path $RepoRoot "scripts\mission_control.ps1"
$DesktopAppControlScript = Join-Path $RepoRoot "scripts\desktop_app_control.ps1"
$SurfaceMatrixCheckScript = Join-Path $RepoRoot "scripts\check_surface_matrix.py"

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

function Write-DiagnosticHeader {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title
    )

    Write-Host ""
    Write-Host "=== $Title ==="
}

function Invoke-DiagnosticCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [hashtable]$Environment = @{}
    )

    Write-Host ""
    Write-Host "-- $Label"
    Write-Host "cwd: $WorkingDirectory"
    Write-Host "command: $Command"

    Push-Location $WorkingDirectory
    try {
        $savedEnvironment = @{}
        foreach ($variableName in $Environment.Keys) {
            $savedEnvironment[$variableName] = [Environment]::GetEnvironmentVariable($variableName, "Process")
            [Environment]::SetEnvironmentVariable($variableName, $Environment[$variableName], "Process")
            Write-Host "env[$variableName]=$($Environment[$variableName])"
        }

        try {
            Invoke-Expression $Command
            Write-Host "exit_code=$LASTEXITCODE"
        }
        catch {
            Write-Host "threw=$($_.Exception.Message)"
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

function Invoke-RunnerDiagnostics {
    Write-DiagnosticHeader -Title "Runner Context"
    Write-Host "repo_root: $RepoRoot"
    Write-Host "backend_dir: $BackendDir"
    Write-Host "frontend_dir: $FrontendDir"
    Write-Host "backend_python: $(Get-BackendPython)"
    Write-Host "npm_executable: $(Get-NpmExecutable)"
    Write-Host "powershell_version: $($PSVersionTable.PSVersion)"
    Write-Host "process_pwd: $((Get-Location).Path)"
    Write-Host "PATH: $env:PATH"
    Write-Host "ComSpec: $env:ComSpec"
    Write-Host "PATHEXT: $env:PATHEXT"

    Write-DiagnosticHeader -Title "Backend Test Launch Comparison"
    Invoke-DiagnosticCommand `
        -Label "direct python pytest" `
        -WorkingDirectory $RepoRoot `
        -Command ('& "' + (Get-BackendPython) + '" -m pytest backend/tests/test_api_routes.py -q') `
        -Environment @{ PYTHONPATH = $BackendPythonPath }

    Invoke-DiagnosticCommand `
        -Label "script-style python pytest" `
        -WorkingDirectory $RepoRoot `
        -Command ('& "' + (Get-BackendPython) + '" -m pytest backend/tests -q') `
        -Environment @{ PYTHONPATH = $BackendPythonPath }

    Write-DiagnosticHeader -Title "Frontend Build Launch Comparison"
    Invoke-DiagnosticCommand `
        -Label "shell npm run build" `
        -WorkingDirectory $FrontendDir `
        -Command "npm run build"

    Invoke-DiagnosticCommand `
        -Label "explicit npm.cmd run build" `
        -WorkingDirectory $FrontendDir `
        -Command ('& "' + (Get-NpmExecutable) + '" run build')

    Invoke-DiagnosticCommand `
        -Label "shell npm run lint" `
        -WorkingDirectory $FrontendDir `
        -Command "npm run lint"
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

function Invoke-SurfaceMatrixCheck {
    Invoke-RepoProcess `
        -WorkingDirectory $RepoRoot `
        -FilePath (Get-BackendPython) `
        -ArgumentList @($SurfaceMatrixCheckScript)
}

function Invoke-LiveRuntimeControl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Action
    )

    if (-not (Test-Path $LiveRuntimeControlScript)) {
        throw "Expected live runtime control script at $LiveRuntimeControlScript"
    }

    & $LiveRuntimeControlScript $Action
    $exitCode = if (Test-Path variable:LASTEXITCODE) { $LASTEXITCODE } else { 0 }
    if ($exitCode -ne 0) {
        exit $exitCode
    }
}

function Invoke-MissionControl {
    if (-not (Test-Path $MissionControlScript)) {
        throw "Expected mission-control wrapper at $MissionControlScript"
    }

    if ($TaskArgs.Count -eq 0) {
        & $MissionControlScript board
    }
    else {
        & $MissionControlScript @TaskArgs
    }

    $exitCode = if (Test-Path variable:LASTEXITCODE) { $LASTEXITCODE } else { 0 }
    if ($exitCode -ne 0) {
        exit $exitCode
    }
}

function Invoke-DesktopAppControl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$DesktopAction
    )

    if (-not (Test-Path $DesktopAppControlScript)) {
        throw "Expected desktop app control script at $DesktopAppControlScript"
    }

    & powershell -ExecutionPolicy Bypass -File $DesktopAppControlScript $DesktopAction -ApiBaseUrl $ApiBaseUrl -FrontendHost $FrontendHost -FrontendPort $FrontendPort
    $exitCode = if (Test-Path variable:LASTEXITCODE) { $LASTEXITCODE } else { 0 }
    if ($exitCode -ne 0) {
        exit $exitCode
    }
}

function Invoke-FrontendLint {
    Invoke-RepoProcess -WorkingDirectory $FrontendDir -FilePath (Get-NpmExecutable) -ArgumentList @("run", "lint")
}

function Invoke-FrontendBuild {
    try {
        Invoke-RepoProcess -WorkingDirectory $FrontendDir -FilePath (Get-NpmExecutable) -ArgumentList @("run", "build")
    }
    catch {
        throw (
            "Frontend build failed through the scripted runner in this worktree shell context. " +
            "Known workaround: from the worktree frontend directory, run 'npm run build' directly in an " +
            "interactive shell and report that result alongside the scripted failure. " +
            "Original error: " + $_.Exception.Message
        )
    }
}

function Invoke-FrontendDev {
    Ensure-LocalFrontendNodeModules

    Write-Host ""
    Write-Host "=== Frontend Dev Server ==="
    Write-Host "frontend_dir: $FrontendDir"
    Write-Host "api_base_url: $ApiBaseUrl"
    Write-Host "frontend_url: http://${FrontendHost}:$FrontendPort"
    Write-Host "stop_hint: press Ctrl+C in this shell when you are done."

    Invoke-RepoProcess `
        -WorkingDirectory $FrontendDir `
        -FilePath (Get-NpmExecutable) `
        -ArgumentList @("run", "dev", "--", "--host", $FrontendHost, "--port", "$FrontendPort") `
        -Environment @{ VITE_API_BASE_URL = $ApiBaseUrl }
}

function Invoke-FrontendSmoke {
    Ensure-LocalFrontendNodeModules

    $frontendUrl = "http://${FrontendHost}:$FrontendPort"
    $scriptPath = Join-Path $RepoRoot "scripts\dev.ps1"
    $startupDeadline = (Get-Date).AddSeconds($FrontendStartupTimeoutSeconds)

    Write-Host ""
    Write-Host "=== Frontend Smoke Check ==="
    Write-Host "frontend_dir: $FrontendDir"
    Write-Host "api_base_url: $ApiBaseUrl"
    Write-Host "frontend_url: $frontendUrl"
    Write-Host "startup_timeout_seconds: $FrontendStartupTimeoutSeconds"

    $job = Start-Job -Name "frontend-smoke" -ScriptBlock {
        param(
            [string]$ScriptPath,
            [string]$HostName,
            [int]$Port,
            [string]$BackendApiBaseUrl
        )

        & $ScriptPath frontend-dev -FrontendHost $HostName -FrontendPort $Port -ApiBaseUrl $BackendApiBaseUrl
    } -ArgumentList $scriptPath, $FrontendHost, $FrontendPort, $ApiBaseUrl

    try {
        $response = $null
        while ((Get-Date) -lt $startupDeadline) {
            if ($job.State -in @("Failed", "Stopped", "Completed")) {
                break
            }

            try {
                $response = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing
                break
            }
            catch {
                Start-Sleep -Seconds 1
            }
        }

        if ($null -eq $response) {
            $jobOutput = Receive-Job -Job $job -Keep -ErrorAction SilentlyContinue | Out-String
            throw (
                "Timed out waiting for the frontend dev server at ${frontendUrl}. " +
                "Job state: $($job.State). Output:`n$jobOutput"
            )
        }

        if ($response.StatusCode -ne 200) {
            throw "Frontend smoke check expected HTTP 200 from ${frontendUrl} but received $($response.StatusCode)."
        }

        if ($response.Content -notmatch '<div id="root"></div>') {
            throw "Frontend smoke check did not find the root mount node in the served HTML."
        }

        if ($response.Content -notmatch '/src/main.tsx') {
            throw "Frontend smoke check did not find the Vite main entrypoint in the served HTML."
        }

        Write-Host "smoke_result=ok"
        Write-Host "smoke_status_code=$($response.StatusCode)"
        Write-Host "smoke_root_mount=true"
        Write-Host "smoke_vite_entrypoint=true"
        Write-Host "smoke_verified_url=$frontendUrl"
    }
    finally {
        if ($job.State -eq "Running") {
            Stop-Job -Job $job -ErrorAction SilentlyContinue | Out-Null
        }

        Receive-Job -Job $job -ErrorAction SilentlyContinue | Out-Null
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue | Out-Null
    }
}

function Invoke-AppOsReadiness {
    $frontendFocusedTests = @(
        "run",
        "test",
        "--",
        "--run",
        "src/components/TaskTimeline.test.tsx",
        "src/components/workspaces/RecordsWorkspaceDesktop.test.tsx",
        "src/components/workspaces/RecordsWorkspaceView.test.tsx",
        "src/App.test.tsx",
        "src/App.desktop-hydration.test.tsx"
    )

    Invoke-RepoProcess `
        -WorkingDirectory $FrontendDir `
        -FilePath (Get-NpmExecutable) `
        -ArgumentList $frontendFocusedTests

    Invoke-FrontendBuild

    Invoke-RepoProcess `
        -WorkingDirectory $RepoRoot `
        -FilePath (Get-BackendPython) `
        -ArgumentList @("-m", "pytest", "backend/tests/test_api_routes.py", "backend/tests/test_app_control.py") `
        -Environment @{ PYTHONPATH = $BackendPythonPath }
}

function Invoke-ComposeBuild {
    Invoke-RepoProcess -WorkingDirectory $RepoRoot -FilePath "docker" -ArgumentList @("compose", "build")
}

function Invoke-ComposeUp {
    Invoke-RepoProcess -WorkingDirectory $RepoRoot -FilePath "docker" -ArgumentList @("compose", "up", "--build")
}

switch ($Task) {
    "bootstrap-worktree" { Invoke-WorktreeBootstrap }
    "runner-diagnostics" { Invoke-RunnerDiagnostics }
    "backend-lint" { Invoke-BackendLint }
    "backend-test" { Invoke-BackendTests }
    "surface-matrix-check" { Invoke-SurfaceMatrixCheck }
    "mission-control" { Invoke-MissionControl }
    "live-status" { Invoke-LiveRuntimeControl -Action "status" }
    "live-start" { Invoke-LiveRuntimeControl -Action "start" }
    "live-stop" { Invoke-LiveRuntimeControl -Action "stop-all" }
    "live-restart" { Invoke-LiveRuntimeControl -Action "restart" }
    "live-bridge-start" { Invoke-LiveRuntimeControl -Action "start-bridge" }
    "live-proof" { Invoke-LiveRuntimeControl -Action "proof" }
    "live-entity-exists-proof" { Invoke-LiveRuntimeControl -Action "entity-exists-proof" }
    "live-component-find-proof" { Invoke-LiveRuntimeControl -Action "component-find-proof" }
    "live-property-target-readback-proof" { Invoke-LiveRuntimeControl -Action "property-target-readback-proof" }
    "live-property-list-proof" { Invoke-LiveRuntimeControl -Action "property-list-proof" }
    "live-comment-scalar-target-proof" { Invoke-LiveRuntimeControl -Action "comment-scalar-target-proof" }
    "desktop-status" { Invoke-DesktopAppControl -DesktopAction "status" }
    "desktop-start" { Invoke-DesktopAppControl -DesktopAction "start" }
    "desktop-stop" { Invoke-DesktopAppControl -DesktopAction "stop" }
    "desktop-restart" { Invoke-DesktopAppControl -DesktopAction "restart" }
    "desktop-shortcut" { Invoke-DesktopAppControl -DesktopAction "install-shortcut" }
    "app-os-readiness" { Invoke-AppOsReadiness }
    "frontend-lint" { Invoke-FrontendLint }
    "frontend-build" { Invoke-FrontendBuild }
    "frontend-dev" { Invoke-FrontendDev }
    "frontend-smoke" { Invoke-FrontendSmoke }
    "compose-build" { Invoke-ComposeBuild }
    "compose-up" { Invoke-ComposeUp }
    "checks" {
        Invoke-BackendLint
        Invoke-BackendTests
        Invoke-FrontendLint
        Invoke-FrontendBuild
    }
}
