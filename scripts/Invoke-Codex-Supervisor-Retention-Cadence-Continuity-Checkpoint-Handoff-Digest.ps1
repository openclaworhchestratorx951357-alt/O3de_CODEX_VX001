param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$ContinuityScriptPath = '',
  [string]$ContinuityReportPath = '',
  [string]$DigestName = 'continuity_checkpoint_handoff_digest',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ContinuityScriptPath) {
  $ContinuityScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Lane-Bundle-Continuity-Checkpoint.ps1'
}
if (-not $ContinuityReportPath) {
  $ContinuityReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-lane-bundle-continuity-checkpoint.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-continuity-checkpoint-handoff-digest.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-continuity-checkpoint-handoff-digest.txt'
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

$continuityState = 'missing'
$continuityReady = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$digestState = 'ready'
$digestComplete = $false
$recommendedAction = 'publish_continuity_handoff_digest'
$continuityRan = $false

if (-not (Test-Path $ContinuityScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'continuity_script_missing' -Message 'Continuity checkpoint script missing.' -Path $ContinuityScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $ContinuityScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $continuityRan = ($LASTEXITCODE -eq 0)
  if (-not $continuityRan) {
    Add-Finding -Severity 'warning' -Code 'continuity_execution_failed' -Message 'Continuity checkpoint execution failed.' -Path $ContinuityScriptPath
  }
}

if (Test-Path $ContinuityReportPath) {
  try {
    $continuityData = Get-Content -Path $ContinuityReportPath -Raw | ConvertFrom-Json
    if ($continuityData.continuity_state) {
      $continuityState = [string]$continuityData.continuity_state
    }
    if ($null -ne $continuityData.continuity_ready) {
      $continuityReady = [bool]$continuityData.continuity_ready
    }
    if ($continuityData.lane_profile_name) {
      $laneProfileName = [string]$continuityData.lane_profile_name
    }
    if ($continuityData.profile_state) {
      $profileState = [string]$continuityData.profile_state
    }
    if ($continuityData.launch_command) {
      $launchCommand = [string]$continuityData.launch_command
    }
    if ($continuityData.thread_start_guidance) {
      $threadStartGuidance = @($continuityData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'continuity_report_parse_failed' -Message "Unable to parse continuity checkpoint report JSON: $($_.Exception.Message)" -Path $ContinuityReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'continuity_report_missing' -Message 'Continuity checkpoint report missing after continuity execution.' -Path $ContinuityReportPath
}

$digestComplete = (
  $continuityState -eq 'ready' -and
  $continuityReady -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0
)

if (-not $digestComplete) {
  $digestState = 'attention_required'
  $recommendedAction = 'repair_continuity_checkpoint_and_rebuild_handoff_digest'
  Add-Finding -Severity 'warning' -Code 'handoff_digest_not_ready' -Message 'Continuity checkpoint handoff digest readiness checks failed.' -Path $ContinuityReportPath
}

$report = [ordered]@{
  digested_at = $now.ToString('o')
  repo_root = $RepoRoot
  digest_name = $DigestName
  operator_acknowledged = [bool]$OperatorAcknowledged
  digest_state = $digestState
  digest_complete = $digestComplete
  recommended_action = $recommendedAction
  continuity_script_path = $ContinuityScriptPath
  continuity_report_path = $ContinuityReportPath
  continuity_ran = $continuityRan
  continuity_state = $continuityState
  continuity_ready = $continuityReady
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Continuity checkpoint handoff digest is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "digested_at=$($report.digested_at)"
  "digest_name=$DigestName"
  "digest_state=$digestState"
  "digest_complete=$digestComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "continuity_state=$continuityState"
  "continuity_ready=$continuityReady"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
