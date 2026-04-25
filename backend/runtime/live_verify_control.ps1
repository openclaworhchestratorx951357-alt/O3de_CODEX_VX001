[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "status",
        "start",
        "stop-backend",
        "stop-editor",
        "stop-all",
        "restart",
        "proof"
    )]
    [string]$Action = "status",
    [string]$ApiHost = "127.0.0.1",
    [ValidateRange(1, 65535)]
    [int]$Port = 8000,
    [ValidateRange(10, 300)]
    [int]$StartupTimeoutSeconds = 90,
    [switch]$Json,
    [switch]$KeepEditorOpen,
    [switch]$StopBackendAfterProof,
    [switch]$SkipRestartBeforeProof
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RuntimeDir = Split-Path -Parent $PSCommandPath
$BackendDir = Split-Path -Parent $RuntimeDir
$RepoRoot = Split-Path -Parent $BackendDir

$PreferredBackendPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$LaunchHelper = Join-Path $RuntimeDir "launch_branch_backend_8000_detached.py"
$ProofHelper = Join-Path $RuntimeDir "prove_live_editor_authoring.py"

$PidPath = Join-Path $RuntimeDir "live-verify-uvicorn.pid"
$LaunchManifestPath = Join-Path $RuntimeDir "live-verify-launch.json"
$OutLogPath = Join-Path $RuntimeDir "live-verify-uvicorn.out.log"
$ErrLogPath = Join-Path $RuntimeDir "live-verify-uvicorn.err.log"

$CanonicalProjectRoot = "C:\Users\topgu\O3DE\Projects\McpSandbox"
$CanonicalEngineRoot = "C:\src\o3de"
$CanonicalEditorRunner = "C:\Users\topgu\O3DE\Projects\McpSandbox\build\windows\bin\profile\Editor.exe"

function Get-BackendPython {
    if (Test-Path $PreferredBackendPython) {
        return $PreferredBackendPython
    }

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($null -ne $pythonCommand) {
        return $pythonCommand.Source
    }

    throw "Unable to locate a backend Python interpreter. Expected $PreferredBackendPython or a python executable on PATH."
}

function Get-UtcTimestamp {
    return [DateTime]::UtcNow.ToString("o")
}

function ConvertTo-JsonOutput {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Value
    )

    return $Value | ConvertTo-Json -Depth 12
}

function Get-OptionalMemberValue {
    param(
        [Parameter(Mandatory = $true)]
        [object]$InputObject,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
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

function Get-FileTail {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [int]$Lines = 20
    )

    if (-not (Test-Path $Path)) {
        return @()
    }

    return @(
        Get-Content $Path -Tail $Lines -ErrorAction SilentlyContinue |
        ForEach-Object { [string]::Concat($_) }
    )
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

function Get-CanonicalEditorProcesses {
    $records = @()
    $cimProcesses = Get-CimInstance Win32_Process -Filter "Name = 'Editor.exe'" -ErrorAction SilentlyContinue
    foreach ($process in @($cimProcesses)) {
        if ($process.ExecutablePath -ne $CanonicalEditorRunner) {
            continue
        }

        $psProcess = Get-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
        $records += [ordered]@{
            id = [int]$process.ProcessId
            name = $process.Name
            path = $process.ExecutablePath
            command_line = $process.CommandLine
            start_time = if ($null -ne $psProcess) { $psProcess.StartTime.ToUniversalTime().ToString("o") } else { $null }
        }
    }

    return @($records | Sort-Object id)
}

function Invoke-EndpointProbe {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BaseUrl,
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $uri = "{0}{1}" -f $BaseUrl.TrimEnd("/"), $Path
    try {
        $payload = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 2
        return [ordered]@{
            ok = $true
            uri = $uri
            payload = $payload
        }
    }
    catch {
        return [ordered]@{
            ok = $false
            uri = $uri
            error = $_.Exception.Message
        }
    }
}

function Convert-EndpointSummary {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [hashtable]$Probe
    )

    if ($Probe.ok -ne $true -or $null -eq $Probe.payload) {
        return [ordered]@{
            ok = $false
            uri = $Probe.uri
            error = $Probe.error
        }
    }

    $payload = $Probe.payload
    switch ($Name) {
        "root" {
            return [ordered]@{
                ok = $true
                uri = $Probe.uri
                name = Get-OptionalMemberValue -InputObject $payload -Name "name"
                status = Get-OptionalMemberValue -InputObject $payload -Name "status"
                phase = Get-OptionalMemberValue -InputObject $payload -Name "phase"
                execution_mode = Get-OptionalMemberValue -InputObject $payload -Name "execution_mode"
            }
        }
        "ready" {
            return [ordered]@{
                ok = $true
                uri = $Probe.uri
                backend_ok = Get-OptionalMemberValue -InputObject $payload -Name "ok"
                persistence_ready = Get-OptionalMemberValue -InputObject $payload -Name "persistence_ready"
                execution_mode = Get-OptionalMemberValue -InputObject $payload -Name "execution_mode"
                database_strategy = Get-OptionalMemberValue -InputObject $payload -Name "database_strategy"
                database_path = Get-OptionalMemberValue -InputObject $payload -Name "database_path"
                persistence_warning = Get-OptionalMemberValue -InputObject $payload -Name "persistence_warning"
            }
        }
        "target" {
            return [ordered]@{
                ok = $true
                uri = $Probe.uri
                project_root = Get-OptionalMemberValue -InputObject $payload -Name "project_root"
                project_root_exists = Get-OptionalMemberValue -InputObject $payload -Name "project_root_exists"
                engine_root = Get-OptionalMemberValue -InputObject $payload -Name "engine_root"
                editor_runner = Get-OptionalMemberValue -InputObject $payload -Name "editor_runner"
                source_label = Get-OptionalMemberValue -InputObject $payload -Name "source_label"
            }
        }
        "bridge" {
            $heartbeat = Get-OptionalMemberValue -InputObject $payload -Name "heartbeat"
            return [ordered]@{
                ok = $true
                uri = $Probe.uri
                configured = Get-OptionalMemberValue -InputObject $payload -Name "configured"
                heartbeat_fresh = Get-OptionalMemberValue -InputObject $payload -Name "heartbeat_fresh"
                bridge_module_loaded = if ($null -ne $heartbeat) { Get-OptionalMemberValue -InputObject $heartbeat -Name "bridge_module_loaded" } else { $null }
                heartbeat_project_root = if ($null -ne $heartbeat) { Get-OptionalMemberValue -InputObject $heartbeat -Name "project_root" } else { $null }
                heartbeat_engine_root = if ($null -ne $heartbeat) { Get-OptionalMemberValue -InputObject $heartbeat -Name "engine_root" } else { $null }
                heartbeat_status_path = Get-OptionalMemberValue -InputObject $payload -Name "heartbeat_status_path"
            }
        }
        "adapters" {
            $adapterPayload = Get-OptionalMemberValue -InputObject $payload -Name "adapters"
            if ($null -eq $adapterPayload) {
                $adapterPayload = $payload
            }

            return [ordered]@{
                ok = $true
                uri = $Probe.uri
                configured_mode = Get-OptionalMemberValue -InputObject $adapterPayload -Name "configured_mode"
                active_mode = Get-OptionalMemberValue -InputObject $adapterPayload -Name "active_mode"
                contract_version = Get-OptionalMemberValue -InputObject $adapterPayload -Name "contract_version"
                real_tool_paths = @(Get-OptionalMemberValue -InputObject $adapterPayload -Name "real_tool_paths")
                plan_only_tool_paths = @(Get-OptionalMemberValue -InputObject $adapterPayload -Name "plan_only_tool_paths")
                simulated_tool_count = @(Get-OptionalMemberValue -InputObject $adapterPayload -Name "simulated_tool_paths").Count
                warning = Get-OptionalMemberValue -InputObject $adapterPayload -Name "warning"
            }
        }
        default {
            return [ordered]@{
                ok = $true
                uri = $Probe.uri
            }
        }
    }
}

function Get-LifecycleStatus {
    $baseUrl = "http://{0}:{1}" -f $ApiHost, $Port
    $listener = Get-PortListener -PortNumber $Port
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

    if ($null -eq $listenerSnapshot) {
        $rootProbe = [ordered]@{ ok = $false; uri = "$baseUrl/"; error = "No listener on port $Port." }
        $readyProbe = [ordered]@{ ok = $false; uri = "$baseUrl/ready"; error = "No listener on port $Port." }
        $targetProbe = [ordered]@{ ok = $false; uri = "$baseUrl/o3de/target"; error = "No listener on port $Port." }
        $bridgeProbe = [ordered]@{ ok = $false; uri = "$baseUrl/o3de/bridge"; error = "No listener on port $Port." }
        $adaptersProbe = [ordered]@{ ok = $false; uri = "$baseUrl/adapters"; error = "No listener on port $Port." }
    } else {
        $rootProbe = Invoke-EndpointProbe -BaseUrl $baseUrl -Path "/"
        $readyProbe = Invoke-EndpointProbe -BaseUrl $baseUrl -Path "/ready"
        $targetProbe = Invoke-EndpointProbe -BaseUrl $baseUrl -Path "/o3de/target"
        $bridgeProbe = Invoke-EndpointProbe -BaseUrl $baseUrl -Path "/o3de/bridge"
        $adaptersProbe = Invoke-EndpointProbe -BaseUrl $baseUrl -Path "/adapters"
    }

    return [ordered]@{
        generated_at = Get-UtcTimestamp
        base_url = $baseUrl
        canonical_target = [ordered]@{
            project_root = $CanonicalProjectRoot
            engine_root = $CanonicalEngineRoot
            editor_runner = $CanonicalEditorRunner
        }
        backend_listener = $listenerSnapshot
        managed_pid = Get-PidFromFile -Path $PidPath
        managed_launch_manifest = Read-JsonFile -Path $LaunchManifestPath
        canonical_editor_processes = @(Get-CanonicalEditorProcesses)
        endpoint_results = [ordered]@{
            root = Convert-EndpointSummary -Name "root" -Probe $rootProbe
            ready = Convert-EndpointSummary -Name "ready" -Probe $readyProbe
            target = Convert-EndpointSummary -Name "target" -Probe $targetProbe
            bridge = Convert-EndpointSummary -Name "bridge" -Probe $bridgeProbe
            adapters = Convert-EndpointSummary -Name "adapters" -Probe $adaptersProbe
        }
        log_tails = [ordered]@{
            stdout = Get-FileTail -Path $OutLogPath
            stderr = Get-FileTail -Path $ErrLogPath
        }
    }
}

function Test-CanonicalBackendReady {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Status
    )

    $listener = $Status.backend_listener
    $readyProbe = $Status.endpoint_results.ready
    $targetProbe = $Status.endpoint_results.target

    if ($null -eq $listener) {
        return $false
    }

    if ($readyProbe.ok -ne $true) {
        return $false
    }

    if ($readyProbe.backend_ok -ne $true -or $readyProbe.persistence_ready -ne $true) {
        return $false
    }

    if ($targetProbe.ok -ne $true) {
        return $false
    }

    if ($targetProbe.project_root -ne $CanonicalProjectRoot) {
        return $false
    }

    if ($targetProbe.engine_root -ne $CanonicalEngineRoot) {
        return $false
    }

    if ($targetProbe.project_root_exists -ne $true) {
        return $false
    }

    return $true
}

function Wait-ForCanonicalBackendReady {
    param(
        [Parameter(Mandatory = $true)]
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $lastStatus = $null

    while ((Get-Date) -lt $deadline) {
        $lastStatus = Get-LifecycleStatus
        if (Test-CanonicalBackendReady -Status $lastStatus) {
            return $lastStatus
        }

        Start-Sleep -Seconds 1
    }

    $stderrTail = if ($null -ne $lastStatus) {
        ($lastStatus.log_tails.stderr -join [Environment]::NewLine)
    } else {
        ""
    }

    throw (
        "Timed out waiting for a canonical backend on http://{0}:{1}. stderr_tail={2}" -f
        $ApiHost, $Port, $stderrTail
    )
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

function Invoke-StartCanonicalBackend {
    $backendPython = Get-BackendPython

    $preStatus = Get-LifecycleStatus
    if (Test-CanonicalBackendReady -Status $preStatus) {
        return [ordered]@{
            action = "start"
            reused_existing_backend = $true
            status = $preStatus
        }
    }

    $launchOutput = & $backendPython $LaunchHelper 2>&1
    if ($LASTEXITCODE -ne 0) {
        $launchText = ($launchOutput | Out-String).Trim()
        throw "Launch helper failed with exit code ${LASTEXITCODE}: $launchText"
    }

    $launchText = ($launchOutput | Out-String).Trim()
    $launchManifest = $null
    if (-not [string]::IsNullOrWhiteSpace($launchText)) {
        try {
            $launchManifest = $launchText | ConvertFrom-Json
        }
        catch {
            $launchManifest = [ordered]@{
                raw_output = $launchText
            }
        }
    }

    $status = Wait-ForCanonicalBackendReady -TimeoutSeconds $StartupTimeoutSeconds
    return [ordered]@{
        action = "start"
        reused_existing_backend = $false
        launch_manifest = $launchManifest
        status = $status
    }
}

function Invoke-StopCanonicalBackend {
    $ids = @()
    $listener = Get-PortListener -PortNumber $Port
    if ($null -ne $listener) {
        $ids += [int]$listener.OwningProcess
    }

    $managedPid = Get-PidFromFile -Path $PidPath
    if ($null -ne $managedPid) {
        $ids += [int]$managedPid
    }

    $stopped = Stop-ProcessIds -ProcessIds @($ids | Sort-Object -Unique)
    Remove-Item $PidPath -ErrorAction SilentlyContinue

    return [ordered]@{
        action = "stop-backend"
        stopped_processes = @($stopped)
        status = Get-LifecycleStatus
    }
}

function Invoke-StopCanonicalEditor {
    $editorProcesses = @(Get-CanonicalEditorProcesses)
    $editorIds = @($editorProcesses | ForEach-Object { [int]$_.id })
    $stopped = Stop-ProcessIds -ProcessIds $editorIds

    return [ordered]@{
        action = "stop-editor"
        stopped_processes = @($stopped)
        status = Get-LifecycleStatus
    }
}

function Invoke-ProofRun {
    $backendPython = Get-BackendPython

    $existingEditorIds = @((Get-CanonicalEditorProcesses) | ForEach-Object { [int]$_.id })
    $startResult = $null

    if (-not $SkipRestartBeforeProof.IsPresent) {
        Invoke-StopCanonicalBackend | Out-Null
        $startResult = Invoke-StartCanonicalBackend
    } else {
        $startResult = Invoke-StartCanonicalBackend
    }

    $proofOutput = & $backendPython $ProofHelper 2>&1
    $proofExitCode = $LASTEXITCODE
    $proofText = ($proofOutput | Out-String).Trim()
    $proofOutputPath = $null
    if (-not [string]::IsNullOrWhiteSpace($proofText)) {
        $proofOutputPath = ($proofText -split "`r?`n")[-1].Trim()
    }

    $stoppedEditorProcesses = @()
    if (-not $KeepEditorOpen.IsPresent) {
        $currentEditorProcesses = @(Get-CanonicalEditorProcesses)
        $newEditorIds = @(
            $currentEditorProcesses |
            Where-Object { $existingEditorIds -notcontains [int]$_.id } |
            ForEach-Object { [int]$_.id }
        )
        $stoppedEditorProcesses = Stop-ProcessIds -ProcessIds $newEditorIds
    }

    $stopBackendResult = $null
    if ($StopBackendAfterProof.IsPresent) {
        $stopBackendResult = Invoke-StopCanonicalBackend
    }

    return [ordered]@{
        action = "proof"
        start_result = $startResult
        proof_exit_code = $proofExitCode
        proof_output = $proofText
        proof_output_path = $proofOutputPath
        stopped_new_editor_processes = @($stoppedEditorProcesses)
        stop_backend_result = $stopBackendResult
        status = Get-LifecycleStatus
    }
}

$result = switch ($Action) {
    "status" { Get-LifecycleStatus }
    "start" { Invoke-StartCanonicalBackend }
    "stop-backend" { Invoke-StopCanonicalBackend }
    "stop-editor" { Invoke-StopCanonicalEditor }
    "stop-all" {
        [ordered]@{
            action = "stop-all"
            backend = Invoke-StopCanonicalBackend
            editor = Invoke-StopCanonicalEditor
            status = Get-LifecycleStatus
        }
    }
    "restart" {
        [ordered]@{
            action = "restart"
            stop = Invoke-StopCanonicalBackend
            start = Invoke-StartCanonicalBackend
            status = Get-LifecycleStatus
        }
    }
    "proof" { Invoke-ProofRun }
}

Write-Output (ConvertTo-JsonOutput -Value $result)

if ($Action -eq "proof") {
    $proofExitCode = 0
    $proofExitCodeRaw = Get-OptionalMemberValue -InputObject $result -Name "proof_exit_code"
    if ($null -ne $proofExitCodeRaw) {
        $proofExitCode = [int]$proofExitCodeRaw
    }

    if ($proofExitCode -ne 0) {
        exit $proofExitCode
    }
}
