[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "status",
        "start",
        "stop",
        "restart",
        "install-shortcut"
    )]
    [string]$Action = "start",
    [string]$ApiBaseUrl = "http://127.0.0.1:8000",
    [string]$FrontendHost = "127.0.0.1",
    [ValidateRange(1, 65535)]
    [int]$FrontendPort = 4173,
    [ValidateRange(10, 180)]
    [int]$StartupTimeoutSeconds = 60,
    [switch]$Json,
    [switch]$NoBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $RepoRoot "frontend"
$FrontendRuntimeDir = Join-Path $FrontendDir "runtime"
$FrontendPidPath = Join-Path $FrontendRuntimeDir "desktop-app-frontend.pid"
$FrontendManifestPath = Join-Path $FrontendRuntimeDir "desktop-app-frontend.json"
$FrontendOutLogPath = Join-Path $FrontendRuntimeDir "desktop-app-frontend.out.log"
$FrontendErrLogPath = Join-Path $FrontendRuntimeDir "desktop-app-frontend.err.log"
$DevScriptPath = Join-Path $PSScriptRoot "dev.ps1"
$BackendControlScriptPath = Join-Path $RepoRoot "backend\runtime\live_verify_control.ps1"
$DesktopShortcutPath = Join-Path $env:USERPROFILE "Desktop\O3DE Codex VX001 App.lnk"
$ShortcutDescription = "Launch the current O3DE Codex VX001 app from this repo checkout."

function ConvertTo-JsonOutput {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Value
    )

    return $Value | ConvertTo-Json -Depth 12
}

function Get-UtcTimestamp {
    return [DateTime]::UtcNow.ToString("o")
}

function Ensure-FrontendRuntimeDirectory {
    New-Item -ItemType Directory -Path $FrontendRuntimeDir -Force | Out-Null
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

function Get-PidFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return $null
    }

    $rawContent = Get-Content $Path -Raw -ErrorAction SilentlyContinue
    if ($null -eq $rawContent) {
        return $null
    }

    $content = $rawContent.Trim()
    if ([string]::IsNullOrWhiteSpace($content)) {
        return $null
    }

    $value = 0
    if ([int]::TryParse($content, [ref]$value)) {
        return $value
    }

    return $null
}

function Read-JsonFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return $null
    }

    try {
        return Get-Content $Path -Raw | ConvertFrom-Json
    }
    catch {
        return $null
    }
}

function Get-ProcessSnapshot {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ProcessId
    )

    $cimProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if ($null -eq $cimProcess) {
        return $null
    }

    $psProcess = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue

    return [ordered]@{
        id = [int]$cimProcess.ProcessId
        name = $cimProcess.Name
        path = $cimProcess.ExecutablePath
        command_line = $cimProcess.CommandLine
        start_time = if ($null -ne $psProcess) { $psProcess.StartTime.ToUniversalTime().ToString("o") } else { $null }
    }
}

function Get-PortListener {
    param(
        [Parameter(Mandatory = $true)]
        [int]$PortNumber
    )

    return Get-NetTCPConnection -LocalPort $PortNumber -State Listen -ErrorAction SilentlyContinue |
        Sort-Object OwningProcess |
        Select-Object -First 1
}

function Stop-ProcessIds {
    param(
        [int[]]$ProcessIds = @()
    )

    if ($null -eq $ProcessIds -or $ProcessIds.Count -eq 0) {
        return @()
    }

    $stopped = @()
    foreach ($processId in @($ProcessIds | Sort-Object -Unique)) {
        $snapshot = Get-ProcessSnapshot -ProcessId $processId
        if ($null -eq $snapshot) {
            continue
        }

        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        $deadline = (Get-Date).AddSeconds(10)
        while ((Get-Date) -lt $deadline) {
            if ($null -eq (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
                break
            }
            Start-Sleep -Milliseconds 250
        }

        $stopped += $snapshot
    }

    return @($stopped)
}

function Invoke-RepoBootstrap {
    if (-not (Test-Path $DevScriptPath)) {
        throw "Expected dev helper at $DevScriptPath"
    }

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $DevScriptPath bootstrap-worktree
    if ($LASTEXITCODE -ne 0) {
        throw "bootstrap-worktree failed with exit code $LASTEXITCODE"
    }
}

function Invoke-BackendAction {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BackendAction
    )

    if (-not (Test-Path $BackendControlScriptPath)) {
        throw "Expected backend control script at $BackendControlScriptPath"
    }

    $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BackendControlScriptPath $BackendAction
    if ($LASTEXITCODE -ne 0) {
        $outputText = ($output | Out-String).Trim()
        throw "Backend action '$BackendAction' failed with exit code ${LASTEXITCODE}: $outputText"
    }

    $outputText = ($output | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($outputText)) {
        return $null
    }

    try {
        return $outputText | ConvertFrom-Json
    }
    catch {
        return [ordered]@{
            raw_output = $outputText
        }
    }
}

function Get-FrontendStatus {
    $frontendUrl = "http://{0}:{1}" -f $FrontendHost, $FrontendPort
    $listener = Get-PortListener -PortNumber $FrontendPort
    $listenerSnapshot = $null
    if ($null -ne $listener) {
        $listenerSnapshot = [ordered]@{
            local_address = $listener.LocalAddress
            local_port = $listener.LocalPort
            state = $listener.State.ToString()
            owning_process = [int]$listener.OwningProcess
            process = Get-ProcessSnapshot -ProcessId ([int]$listener.OwningProcess)
        }
    }

    $probe = [ordered]@{
        ok = $false
        url = $frontendUrl
        error = "No listener on port $FrontendPort."
    }

    if ($null -ne $listenerSnapshot) {
        try {
            $response = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -TimeoutSec 2
            $probe = [ordered]@{
                ok = ($response.StatusCode -eq 200) -and ($response.Content -match '<div id="root"></div>')
                url = $frontendUrl
                status_code = $response.StatusCode
                root_mount_found = ($response.Content -match '<div id="root"></div>')
            }
        }
        catch {
            $probe = [ordered]@{
                ok = $false
                url = $frontendUrl
                error = $_.Exception.Message
            }
        }
    }

    return [ordered]@{
        generated_at = Get-UtcTimestamp
        frontend_url = $frontendUrl
        listener = $listenerSnapshot
        managed_pid = Get-PidFromFile -Path $FrontendPidPath
        managed_manifest = Read-JsonFile -Path $FrontendManifestPath
        probe = $probe
        stdout_tail = if (Test-Path $FrontendOutLogPath) { @(Get-Content $FrontendOutLogPath -Tail 20 -ErrorAction SilentlyContinue) } else { @() }
        stderr_tail = if (Test-Path $FrontendErrLogPath) { @(Get-Content $FrontendErrLogPath -Tail 20 -ErrorAction SilentlyContinue) } else { @() }
    }
}

function Test-FrontendReady {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Status
    )

    return ($null -ne $Status.listener) -and ($Status.probe.ok -eq $true)
}

function Wait-ForFrontendReady {
    $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
    $lastStatus = $null

    while ((Get-Date) -lt $deadline) {
        $lastStatus = Get-FrontendStatus
        if (Test-FrontendReady -Status $lastStatus) {
            return $lastStatus
        }
        Start-Sleep -Seconds 1
    }

    $stderrTail = if ($null -ne $lastStatus) { ($lastStatus.stderr_tail -join [Environment]::NewLine) } else { "" }
    throw "Timed out waiting for the frontend app at http://${FrontendHost}:$FrontendPort. stderr_tail=$stderrTail"
}

function Invoke-StopFrontend {
    Ensure-FrontendRuntimeDirectory

    $managedPid = Get-PidFromFile -Path $FrontendPidPath
    $listener = Get-PortListener -PortNumber $FrontendPort
    $processIds = @()
    if ($null -ne $managedPid) {
        $processIds += [int]$managedPid
    }
    if ($null -ne $listener) {
        $processIds += [int]$listener.OwningProcess
    }

    $stoppedProcesses = Stop-ProcessIds -ProcessIds @($processIds | Sort-Object -Unique)

    Remove-Item $FrontendPidPath -ErrorAction SilentlyContinue
    Remove-Item $FrontendManifestPath -ErrorAction SilentlyContinue

    return [ordered]@{
        action = "stop"
        stopped_processes = @($stoppedProcesses)
        frontend_status = Get-FrontendStatus
    }
}

function Invoke-StartFrontend {
    Ensure-FrontendRuntimeDirectory

    $preStatus = Get-FrontendStatus
    if (Test-FrontendReady -Status $preStatus) {
        return [ordered]@{
            action = "start-frontend"
            reused_existing_frontend = $true
            frontend_status = $preStatus
        }
    }

    Invoke-StopFrontend | Out-Null

    $npmExecutable = Get-NpmExecutable
    Remove-Item $FrontendOutLogPath -ErrorAction SilentlyContinue
    Remove-Item $FrontendErrLogPath -ErrorAction SilentlyContinue

    $savedApiBaseUrl = [Environment]::GetEnvironmentVariable("VITE_API_BASE_URL", "Process")
    [Environment]::SetEnvironmentVariable("VITE_API_BASE_URL", $ApiBaseUrl, "Process")

    try {
        $process = Start-Process `
            -FilePath $npmExecutable `
            -ArgumentList @("run", "dev", "--", "--host", $FrontendHost, "--port", "$FrontendPort") `
            -WorkingDirectory $FrontendDir `
            -RedirectStandardOutput $FrontendOutLogPath `
            -RedirectStandardError $FrontendErrLogPath `
            -PassThru `
            -WindowStyle Hidden
    }
    finally {
        [Environment]::SetEnvironmentVariable("VITE_API_BASE_URL", $savedApiBaseUrl, "Process")
    }

    Set-Content -Path $FrontendPidPath -Value ([string]$process.Id) -Encoding ASCII

    $manifest = [ordered]@{
        created_at = Get-UtcTimestamp
        repo_root = $RepoRoot
        frontend_dir = $FrontendDir
        frontend_url = "http://{0}:{1}" -f $FrontendHost, $FrontendPort
        api_base_url = $ApiBaseUrl
        pid = [int]$process.Id
        command = @("npm", "run", "dev", "--", "--host", $FrontendHost, "--port", "$FrontendPort")
        stdout_log = $FrontendOutLogPath
        stderr_log = $FrontendErrLogPath
    }
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $FrontendManifestPath -Encoding UTF8

    $readyStatus = Wait-ForFrontendReady
    return [ordered]@{
        action = "start-frontend"
        reused_existing_frontend = $false
        launch_manifest = $manifest
        frontend_status = $readyStatus
    }
}

function Install-DesktopShortcut {
    $shortcutDirectory = Split-Path -Parent $DesktopShortcutPath
    New-Item -ItemType Directory -Path $shortcutDirectory -Force | Out-Null

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($DesktopShortcutPath)
    $shortcut.TargetPath = (Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe")
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\desktop_app_control.ps1`" start"
    $shortcut.WorkingDirectory = $RepoRoot
    $shortcut.Description = $ShortcutDescription
    $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
    $shortcut.WindowStyle = 7
    $shortcut.Save()

    return [ordered]@{
        shortcut_path = $DesktopShortcutPath
        target_path = $shortcut.TargetPath
        arguments = $shortcut.Arguments
        working_directory = $shortcut.WorkingDirectory
    }
}

function Invoke-DesktopStart {
    Invoke-RepoBootstrap
    $backendStart = Invoke-BackendAction -BackendAction "start"
    $frontendStart = Invoke-StartFrontend
    $shortcut = Install-DesktopShortcut

    if (-not $NoBrowser.IsPresent) {
        Start-Process ("http://{0}:{1}" -f $FrontendHost, $FrontendPort) | Out-Null
    }

    return [ordered]@{
        action = "start"
        backend = $backendStart
        frontend = $frontendStart
        shortcut = $shortcut
        browser_opened = (-not $NoBrowser.IsPresent)
    }
}

function Invoke-DesktopStatus {
    return [ordered]@{
        action = "status"
        backend = Invoke-BackendAction -BackendAction "status"
        frontend = Get-FrontendStatus
        shortcut = [ordered]@{
            path = $DesktopShortcutPath
            exists = (Test-Path $DesktopShortcutPath)
        }
    }
}

function Invoke-DesktopStop {
    return [ordered]@{
        action = "stop"
        frontend = Invoke-StopFrontend
        backend = Invoke-BackendAction -BackendAction "stop-all"
        shortcut = [ordered]@{
            path = $DesktopShortcutPath
            exists = (Test-Path $DesktopShortcutPath)
        }
    }
}

function Invoke-DesktopRestart {
    Invoke-DesktopStop | Out-Null
    return Invoke-DesktopStart
}

$result = switch ($Action) {
    "status" { Invoke-DesktopStatus }
    "start" { Invoke-DesktopStart }
    "stop" { Invoke-DesktopStop }
    "restart" { Invoke-DesktopRestart }
    "install-shortcut" {
        [ordered]@{
            action = "install-shortcut"
            shortcut = Install-DesktopShortcut
        }
    }
}

if ($Json.IsPresent) {
    Write-Output (ConvertTo-JsonOutput -Value $result)
}
else {
    switch ($Action) {
        "install-shortcut" {
            Write-Host "Desktop shortcut updated at $DesktopShortcutPath"
        }
        "status" {
            Write-Host "Desktop app status:"
            Write-Host "  frontend_url: $($result.frontend.frontend_url)"
            Write-Host "  frontend_ready: $($result.frontend.probe.ok)"
            Write-Host "  shortcut_exists: $($result.shortcut.exists)"
            $backendReady = $null
            if ($null -ne $result.backend) {
                $backendReady = $result.backend.endpoint_results.ready.backend_ok
            }
            Write-Host "  backend_ready: $backendReady"
        }
        default {
            Write-Host "Desktop app action '$Action' completed."
        }
    }
}
