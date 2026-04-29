param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$LaunchProfileScriptPath = '',
  [string]$LaunchProfileReportPath = '',
  [string]$ManifestName = 'operator_launch_profile_handoff_manifest',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $LaunchProfileScriptPath) {
  $LaunchProfileScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Evidence-Operator-Launch-Profile.ps1'
}
if (-not $LaunchProfileReportPath) {
  $LaunchProfileReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-evidence-operator-launch-profile.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-launch-profile-handoff-manifest.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-launch-profile-handoff-manifest.txt'
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

$profileState = 'missing'
$profileName = ''
$launchCommand = ''
$threadStartGuidance = @()
$automationGateState = ''
$startupGateReady = $false
$profileRan = $false
$manifestComplete = $false
$manifestState = 'ready'
$recommendedAction = 'publish_manifest_for_operator_handoff'

if (-not (Test-Path $LaunchProfileScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'launch_profile_script_missing' -Message 'Operator launch profile script is missing.' -Path $LaunchProfileScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $LaunchProfileScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $profileRan = ($LASTEXITCODE -eq 0)
  if (-not $profileRan) {
    Add-Finding -Severity 'warning' -Code 'launch_profile_execution_failed' -Message 'Operator launch profile execution failed.' -Path $LaunchProfileScriptPath
  }
}

if (Test-Path $LaunchProfileReportPath) {
  try {
    $profileData = Get-Content -Path $LaunchProfileReportPath -Raw | ConvertFrom-Json
    if ($profileData.profile_state) {
      $profileState = [string]$profileData.profile_state
    }
    if ($profileData.profile_name) {
      $profileName = [string]$profileData.profile_name
    }
    if ($profileData.launch_command) {
      $launchCommand = [string]$profileData.launch_command
    }
    if ($profileData.thread_start_guidance) {
      $threadStartGuidance = @($profileData.thread_start_guidance)
    }
    if ($profileData.automation_gate_state) {
      $automationGateState = [string]$profileData.automation_gate_state
    }
    if ($null -ne $profileData.startup_gate_ready) {
      $startupGateReady = [bool]$profileData.startup_gate_ready
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'launch_profile_report_parse_failed' -Message "Unable to parse launch profile report JSON: $($_.Exception.Message)" -Path $LaunchProfileReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'launch_profile_report_missing' -Message 'Launch profile report missing after launch profile execution.' -Path $LaunchProfileReportPath
}

$manifestComplete = (
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($profileName) -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  $automationGateState -eq 'ready' -and
  $startupGateReady
)

if (-not $manifestComplete) {
  $manifestState = 'attention_required'
  $recommendedAction = 'repair_launch_profile_readiness_and_rebuild_handoff_manifest'
  Add-Finding -Severity 'warning' -Code 'manifest_not_complete' -Message 'Handoff manifest is incomplete or not ready for operator handoff.' -Path $LaunchProfileReportPath
}

$report = [ordered]@{
  manifested_at = $now.ToString('o')
  repo_root = $RepoRoot
  manifest_name = $ManifestName
  operator_acknowledged = [bool]$OperatorAcknowledged
  manifest_state = $manifestState
  manifest_complete = $manifestComplete
  recommended_action = $recommendedAction
  launch_profile_script_path = $LaunchProfileScriptPath
  launch_profile_report_path = $LaunchProfileReportPath
  launch_profile_ran = $profileRan
  profile_state = $profileState
  profile_name = $profileName
  automation_gate_state = $automationGateState
  startup_gate_ready = $startupGateReady
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Operator launch profile handoff manifest is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "manifested_at=$($report.manifested_at)"
  "manifest_name=$ManifestName"
  "manifest_state=$manifestState"
  "manifest_complete=$manifestComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "profile_state=$profileState"
  "automation_gate_state=$automationGateState"
  "startup_gate_ready=$startupGateReady"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
