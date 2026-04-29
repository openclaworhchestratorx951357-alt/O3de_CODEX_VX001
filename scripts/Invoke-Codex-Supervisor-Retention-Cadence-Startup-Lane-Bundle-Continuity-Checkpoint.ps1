param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$HandoffBundleScriptPath = '',
  [string]$HandoffBundleReportPath = '',
  [string]$CheckpointName = 'startup_lane_bundle_continuity_checkpoint',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $HandoffBundleScriptPath) {
  $HandoffBundleScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Lane-Profile-Adoption-Handoff-Bundle.ps1'
}
if (-not $HandoffBundleReportPath) {
  $HandoffBundleReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-lane-profile-adoption-handoff-bundle.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-lane-bundle-continuity-checkpoint.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-lane-bundle-continuity-checkpoint.txt'
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

$bundleState = 'missing'
$bundleComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$continuityState = 'ready'
$continuityReady = $false
$recommendedAction = 'startup_lane_bundle_continuity_confirmed'
$bundleRan = $false

if (-not (Test-Path $HandoffBundleScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'handoff_bundle_script_missing' -Message 'Startup lane adoption handoff bundle script missing.' -Path $HandoffBundleScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $HandoffBundleScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $bundleRan = ($LASTEXITCODE -eq 0)
  if (-not $bundleRan) {
    Add-Finding -Severity 'warning' -Code 'handoff_bundle_execution_failed' -Message 'Startup lane adoption handoff bundle execution failed.' -Path $HandoffBundleScriptPath
  }
}

if (Test-Path $HandoffBundleReportPath) {
  try {
    $bundleData = Get-Content -Path $HandoffBundleReportPath -Raw | ConvertFrom-Json
    if ($bundleData.bundle_state) {
      $bundleState = [string]$bundleData.bundle_state
    }
    if ($null -ne $bundleData.bundle_complete) {
      $bundleComplete = [bool]$bundleData.bundle_complete
    }
    if ($bundleData.lane_profile_name) {
      $laneProfileName = [string]$bundleData.lane_profile_name
    }
    if ($bundleData.profile_state) {
      $profileState = [string]$bundleData.profile_state
    }
    if ($bundleData.launch_command) {
      $launchCommand = [string]$bundleData.launch_command
    }
    if ($bundleData.thread_start_guidance) {
      $threadStartGuidance = @($bundleData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'handoff_bundle_report_parse_failed' -Message "Unable to parse handoff bundle report JSON: $($_.Exception.Message)" -Path $HandoffBundleReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'handoff_bundle_report_missing' -Message 'Handoff bundle report missing after bundle execution.' -Path $HandoffBundleReportPath
}

$continuityReady = (
  $bundleState -eq 'ready' -and
  $bundleComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0
)

if (-not $continuityReady) {
  $continuityState = 'attention_required'
  $recommendedAction = 'repair_handoff_bundle_and_re-run_continuity_checkpoint'
  Add-Finding -Severity 'warning' -Code 'continuity_not_ready' -Message 'Startup lane bundle continuity checks failed.' -Path $HandoffBundleReportPath
}

$report = [ordered]@{
  checkpointed_at = $now.ToString('o')
  repo_root = $RepoRoot
  checkpoint_name = $CheckpointName
  operator_acknowledged = [bool]$OperatorAcknowledged
  continuity_state = $continuityState
  continuity_ready = $continuityReady
  recommended_action = $recommendedAction
  handoff_bundle_script_path = $HandoffBundleScriptPath
  handoff_bundle_report_path = $HandoffBundleReportPath
  handoff_bundle_ran = $bundleRan
  bundle_state = $bundleState
  bundle_complete = $bundleComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Startup lane bundle continuity checkpoint is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "checkpointed_at=$($report.checkpointed_at)"
  "checkpoint_name=$CheckpointName"
  "continuity_state=$continuityState"
  "continuity_ready=$continuityReady"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "bundle_state=$bundleState"
  "bundle_complete=$bundleComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
