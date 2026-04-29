param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$LaneProfileScriptPath = '',
  [string]$LaneProfileReportPath = '',
  [string]$CheckpointName = 'startup_lane_profile_adoption_checkpoint',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $LaneProfileScriptPath) {
  $LaneProfileScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Manifest-Startup-Lane-Profile.ps1'
}
if (-not $LaneProfileReportPath) {
  $LaneProfileReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-manifest-startup-lane-profile.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-lane-profile-adoption-checkpoint.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-lane-profile-adoption-checkpoint.txt'
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

$laneState = 'missing'
$laneReady = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$checkpointState = 'ready'
$recommendedAction = 'startup_lane_profile_adoption_confirmed'
$laneProfileRan = $false

if (-not (Test-Path $LaneProfileScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'lane_profile_script_missing' -Message 'Startup lane profile script missing.' -Path $LaneProfileScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $LaneProfileScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $laneProfileRan = ($LASTEXITCODE -eq 0)
  if (-not $laneProfileRan) {
    Add-Finding -Severity 'warning' -Code 'lane_profile_execution_failed' -Message 'Startup lane profile execution failed.' -Path $LaneProfileScriptPath
  }
}

if (Test-Path $LaneProfileReportPath) {
  try {
    $laneData = Get-Content -Path $LaneProfileReportPath -Raw | ConvertFrom-Json
    if ($laneData.lane_state) {
      $laneState = [string]$laneData.lane_state
    }
    if ($null -ne $laneData.lane_ready) {
      $laneReady = [bool]$laneData.lane_ready
    }
    if ($laneData.lane_profile_name) {
      $laneProfileName = [string]$laneData.lane_profile_name
    }
    if ($laneData.profile_state) {
      $profileState = [string]$laneData.profile_state
    }
    if ($laneData.launch_command) {
      $launchCommand = [string]$laneData.launch_command
    }
    if ($laneData.thread_start_guidance) {
      $threadStartGuidance = @($laneData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'lane_profile_report_parse_failed' -Message "Unable to parse startup lane profile report JSON: $($_.Exception.Message)" -Path $LaneProfileReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'lane_profile_report_missing' -Message 'Startup lane profile report missing after lane profile execution.' -Path $LaneProfileReportPath
}

$adoptionReady = (
  $laneState -eq 'ready' -and
  $laneReady -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0
)

if (-not $adoptionReady) {
  $checkpointState = 'attention_required'
  $recommendedAction = 'repair_startup_lane_profile_and_re-run_adoption_checkpoint'
  Add-Finding -Severity 'warning' -Code 'adoption_not_ready' -Message 'Startup lane profile adoption readiness checks failed.' -Path $LaneProfileReportPath
}

$report = [ordered]@{
  checkpointed_at = $now.ToString('o')
  repo_root = $RepoRoot
  checkpoint_name = $CheckpointName
  operator_acknowledged = [bool]$OperatorAcknowledged
  checkpoint_state = $checkpointState
  adoption_ready = $adoptionReady
  recommended_action = $recommendedAction
  lane_profile_script_path = $LaneProfileScriptPath
  lane_profile_report_path = $LaneProfileReportPath
  lane_profile_ran = $laneProfileRan
  lane_state = $laneState
  lane_ready = $laneReady
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Startup lane profile adoption checkpoint is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "checkpointed_at=$($report.checkpointed_at)"
  "checkpoint_name=$CheckpointName"
  "checkpoint_state=$checkpointState"
  "adoption_ready=$adoptionReady"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "lane_state=$laneState"
  "lane_ready=$laneReady"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
