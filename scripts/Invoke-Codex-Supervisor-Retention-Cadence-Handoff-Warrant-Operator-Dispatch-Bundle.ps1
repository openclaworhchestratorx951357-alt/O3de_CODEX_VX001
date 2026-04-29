param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$WarrantScriptPath = '',
  [string]$WarrantReportPath = '',
  [string]$BundleName = 'handoff_warrant_operator_dispatch_bundle',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $WarrantScriptPath) {
  $WarrantScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Archival-Manifest-Handoff-Warrant.ps1'
}
if (-not $WarrantReportPath) {
  $WarrantReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-archival-manifest-handoff-warrant.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-warrant-operator-dispatch-bundle.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-warrant-operator-dispatch-bundle.txt'
}

function Ensure-ParentDirectory {
  param([string]$Path)
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
}

function Add-Finding {
  param(
    [string]$Severity,
    [string]$Code,
    [string]$Message,
    [string]$Path = ''
  )
  $script:findings += [ordered]@{
    severity = $Severity
    code = $Code
    path = $Path
    message = $Message
  }
}

$findings = @()
$now = [DateTimeOffset]::Now

$warrantState = 'missing'
$warrantComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$archivalManifest = @()
$handoffWarrant = @()
$bundleState = 'ready'
$bundleComplete = $false
$recommendedAction = 'publish_handoff_warrant_operator_dispatch_bundle'
$warrantRan = $false

if (-not (Test-Path $WarrantScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'warrant_script_missing' -Message 'Archival manifest handoff warrant script missing.' -Path $WarrantScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $WarrantScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $warrantRan = ($LASTEXITCODE -eq 0)
  if (-not $warrantRan) {
    Add-Finding -Severity 'warning' -Code 'warrant_execution_failed' -Message 'Archival manifest handoff warrant execution failed.' -Path $WarrantScriptPath
  }
}

if (Test-Path $WarrantReportPath) {
  try {
    $warrantData = Get-Content -Path $WarrantReportPath -Raw | ConvertFrom-Json
    if ($warrantData.warrant_state) {
      $warrantState = [string]$warrantData.warrant_state
    }
    if ($null -ne $warrantData.warrant_complete) {
      $warrantComplete = [bool]$warrantData.warrant_complete
    }
    if ($warrantData.lane_profile_name) {
      $laneProfileName = [string]$warrantData.lane_profile_name
    }
    if ($warrantData.profile_state) {
      $profileState = [string]$warrantData.profile_state
    }
    if ($warrantData.launch_command) {
      $launchCommand = [string]$warrantData.launch_command
    }
    if ($warrantData.thread_start_guidance) {
      $threadStartGuidance = @($warrantData.thread_start_guidance)
    }
    if ($warrantData.archival_manifest) {
      $archivalManifest = @($warrantData.archival_manifest)
    }
    if ($warrantData.handoff_warrant) {
      $handoffWarrant = @($warrantData.handoff_warrant)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'warrant_report_parse_failed' -Message "Unable to parse handoff warrant report JSON: $($_.Exception.Message)" -Path $WarrantReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'warrant_report_missing' -Message 'Handoff warrant report missing after warrant execution.' -Path $WarrantReportPath
}

$operatorDispatchBundle = @(
  "bundle_basis=archival_manifest_handoff_warrant",
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "archival_manifest_count=$(@($archivalManifest).Count)",
  "handoff_warrant_count=$(@($handoffWarrant).Count)",
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  "dispatch_instruction=Run launch_command in designated Codex lane only after branch isolation and claim-token checks pass.",
  "no_runtime_expansion=true"
)

$bundleComplete = (
  $warrantState -eq 'ready' -and
  $warrantComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  @($archivalManifest).Count -gt 0 -and
  @($handoffWarrant).Count -gt 0 -and
  @($operatorDispatchBundle).Count -gt 0 -and
  [bool]$OperatorAcknowledged
)

if (-not $bundleComplete) {
  $bundleState = 'attention_required'
  $recommendedAction = 'repair_handoff_warrant_and_rebuild_operator_dispatch_bundle'
  Add-Finding -Severity 'warning' -Code 'operator_dispatch_bundle_not_ready' -Message 'Handoff warrant operator dispatch bundle checks failed.' -Path $WarrantReportPath
}

$report = [ordered]@{
  bundled_at = $now.ToString('o')
  repo_root = $RepoRoot
  bundle_name = $BundleName
  operator_acknowledged = [bool]$OperatorAcknowledged
  bundle_state = $bundleState
  bundle_complete = $bundleComplete
  recommended_action = $recommendedAction
  warrant_script_path = $WarrantScriptPath
  warrant_report_path = $WarrantReportPath
  warrant_ran = $warrantRan
  warrant_state = $warrantState
  warrant_complete = $warrantComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  archival_manifest = $archivalManifest
  handoff_warrant = $handoffWarrant
  operator_dispatch_bundle = $operatorDispatchBundle
  local_only_note = 'Handoff warrant operator dispatch bundle is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "bundled_at=$($report.bundled_at)"
  "bundle_name=$BundleName"
  "bundle_state=$bundleState"
  "bundle_complete=$bundleComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "warrant_state=$warrantState"
  "warrant_complete=$warrantComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
