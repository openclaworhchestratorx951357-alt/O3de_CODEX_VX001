param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$AdoptionCheckpointScriptPath = '',
  [string]$AdoptionCheckpointReportPath = '',
  [string]$BundleName = 'startup_lane_profile_adoption_handoff_bundle',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $AdoptionCheckpointScriptPath) {
  $AdoptionCheckpointScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Lane-Profile-Adoption-Checkpoint.ps1'
}
if (-not $AdoptionCheckpointReportPath) {
  $AdoptionCheckpointReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-lane-profile-adoption-checkpoint.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-lane-profile-adoption-handoff-bundle.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-lane-profile-adoption-handoff-bundle.txt'
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

$checkpointState = 'missing'
$adoptionReady = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$bundleState = 'ready'
$bundleComplete = $false
$recommendedAction = 'startup_lane_profile_adoption_handoff_bundle_ready'
$checkpointRan = $false

if (-not (Test-Path $AdoptionCheckpointScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'adoption_checkpoint_script_missing' -Message 'Adoption checkpoint script missing.' -Path $AdoptionCheckpointScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $AdoptionCheckpointScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $checkpointRan = ($LASTEXITCODE -eq 0)
  if (-not $checkpointRan) {
    Add-Finding -Severity 'warning' -Code 'adoption_checkpoint_execution_failed' -Message 'Adoption checkpoint execution failed.' -Path $AdoptionCheckpointScriptPath
  }
}

if (Test-Path $AdoptionCheckpointReportPath) {
  try {
    $checkpointData = Get-Content -Path $AdoptionCheckpointReportPath -Raw | ConvertFrom-Json
    if ($checkpointData.checkpoint_state) {
      $checkpointState = [string]$checkpointData.checkpoint_state
    }
    if ($null -ne $checkpointData.adoption_ready) {
      $adoptionReady = [bool]$checkpointData.adoption_ready
    }
    if ($checkpointData.lane_profile_name) {
      $laneProfileName = [string]$checkpointData.lane_profile_name
    }
    if ($checkpointData.profile_state) {
      $profileState = [string]$checkpointData.profile_state
    }
    if ($checkpointData.launch_command) {
      $launchCommand = [string]$checkpointData.launch_command
    }
    if ($checkpointData.thread_start_guidance) {
      $threadStartGuidance = @($checkpointData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'adoption_checkpoint_report_parse_failed' -Message "Unable to parse adoption checkpoint report JSON: $($_.Exception.Message)" -Path $AdoptionCheckpointReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'adoption_checkpoint_report_missing' -Message 'Adoption checkpoint report missing after checkpoint execution.' -Path $AdoptionCheckpointReportPath
}

$bundleComplete = (
  $checkpointState -eq 'ready' -and
  $adoptionReady -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0
)

if (-not $bundleComplete) {
  $bundleState = 'attention_required'
  $recommendedAction = 'repair_adoption_checkpoint_then_rebuild_handoff_bundle'
  Add-Finding -Severity 'warning' -Code 'handoff_bundle_not_ready' -Message 'Startup lane profile adoption handoff bundle readiness checks failed.' -Path $AdoptionCheckpointReportPath
}

$report = [ordered]@{
  bundled_at = $now.ToString('o')
  repo_root = $RepoRoot
  bundle_name = $BundleName
  operator_acknowledged = [bool]$OperatorAcknowledged
  bundle_state = $bundleState
  bundle_complete = $bundleComplete
  recommended_action = $recommendedAction
  adoption_checkpoint_script_path = $AdoptionCheckpointScriptPath
  adoption_checkpoint_report_path = $AdoptionCheckpointReportPath
  adoption_checkpoint_ran = $checkpointRan
  checkpoint_state = $checkpointState
  adoption_ready = $adoptionReady
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Startup lane profile adoption handoff bundle is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "bundled_at=$($report.bundled_at)"
  "bundle_name=$BundleName"
  "bundle_state=$bundleState"
  "bundle_complete=$bundleComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "checkpoint_state=$checkpointState"
  "adoption_ready=$adoptionReady"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
