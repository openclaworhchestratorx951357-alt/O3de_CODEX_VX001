param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$ManifestScriptPath = '',
  [string]$ManifestReportPath = '',
  [string]$LaneProfileName = 'startup_lane_default',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ManifestScriptPath) {
  $ManifestScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Launch-Profile-Handoff-Manifest.ps1'
}
if (-not $ManifestReportPath) {
  $ManifestReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-launch-profile-handoff-manifest.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-manifest-startup-lane-profile.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-manifest-startup-lane-profile.txt'
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

$manifestState = 'missing'
$manifestComplete = $false
$profileState = ''
$profileName = ''
$launchCommand = ''
$threadStartGuidance = @()
$laneReady = $false
$laneState = 'ready'
$recommendedAction = 'use_startup_lane_profile_for_supervisor_handoff'
$manifestRan = $false

if (-not (Test-Path $ManifestScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'manifest_script_missing' -Message 'Operator launch profile handoff manifest script missing.' -Path $ManifestScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $ManifestScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $manifestRan = ($LASTEXITCODE -eq 0)
  if (-not $manifestRan) {
    Add-Finding -Severity 'warning' -Code 'manifest_execution_failed' -Message 'Operator launch profile handoff manifest execution failed.' -Path $ManifestScriptPath
  }
}

if (Test-Path $ManifestReportPath) {
  try {
    $manifestData = Get-Content -Path $ManifestReportPath -Raw | ConvertFrom-Json
    if ($manifestData.manifest_state) {
      $manifestState = [string]$manifestData.manifest_state
    }
    if ($null -ne $manifestData.manifest_complete) {
      $manifestComplete = [bool]$manifestData.manifest_complete
    }
    if ($manifestData.profile_state) {
      $profileState = [string]$manifestData.profile_state
    }
    if ($manifestData.profile_name) {
      $profileName = [string]$manifestData.profile_name
    }
    if ($manifestData.launch_command) {
      $launchCommand = [string]$manifestData.launch_command
    }
    if ($manifestData.thread_start_guidance) {
      $threadStartGuidance = @($manifestData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'manifest_report_parse_failed' -Message "Unable to parse handoff manifest report JSON: $($_.Exception.Message)" -Path $ManifestReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'manifest_report_missing' -Message 'Handoff manifest report missing after manifest execution.' -Path $ManifestReportPath
}

$laneReady = (
  $manifestState -eq 'ready' -and
  $manifestComplete -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($profileName) -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0
)

if (-not $laneReady) {
  $laneState = 'attention_required'
  $recommendedAction = 'repair_handoff_manifest_readiness_then_rebuild_startup_lane_profile'
  Add-Finding -Severity 'warning' -Code 'lane_profile_not_ready' -Message 'Startup lane profile readiness checks failed.' -Path $ManifestReportPath
}

$report = [ordered]@{
  profiled_at = $now.ToString('o')
  repo_root = $RepoRoot
  lane_profile_name = $LaneProfileName
  operator_acknowledged = [bool]$OperatorAcknowledged
  lane_state = $laneState
  lane_ready = $laneReady
  recommended_action = $recommendedAction
  manifest_script_path = $ManifestScriptPath
  manifest_report_path = $ManifestReportPath
  manifest_ran = $manifestRan
  manifest_state = $manifestState
  manifest_complete = $manifestComplete
  profile_state = $profileState
  profile_name = $profileName
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Startup lane profile is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "profiled_at=$($report.profiled_at)"
  "lane_profile_name=$LaneProfileName"
  "lane_state=$laneState"
  "lane_ready=$laneReady"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "manifest_state=$manifestState"
  "manifest_complete=$manifestComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
