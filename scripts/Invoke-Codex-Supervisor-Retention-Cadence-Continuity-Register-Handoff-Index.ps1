param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$RegisterScriptPath = '',
  [string]$RegisterReportPath = '',
  [string]$IndexName = 'continuity_register_handoff_index',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $RegisterScriptPath) {
  $RegisterScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Seal-Continuity-Register.ps1'
}
if (-not $RegisterReportPath) {
  $RegisterReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-seal-continuity-register.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-continuity-register-handoff-index.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-continuity-register-handoff-index.txt'
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

$registerState = 'missing'
$registerComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$indexState = 'ready'
$indexComplete = $false
$recommendedAction = 'publish_continuity_register_handoff_index'
$registerRan = $false

if (-not (Test-Path $RegisterScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'register_script_missing' -Message 'Handoff seal continuity register script missing.' -Path $RegisterScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $RegisterScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $registerRan = ($LASTEXITCODE -eq 0)
  if (-not $registerRan) {
    Add-Finding -Severity 'warning' -Code 'register_execution_failed' -Message 'Handoff seal continuity register execution failed.' -Path $RegisterScriptPath
  }
}

if (Test-Path $RegisterReportPath) {
  try {
    $registerData = Get-Content -Path $RegisterReportPath -Raw | ConvertFrom-Json
    if ($registerData.register_state) {
      $registerState = [string]$registerData.register_state
    }
    if ($null -ne $registerData.register_complete) {
      $registerComplete = [bool]$registerData.register_complete
    }
    if ($registerData.lane_profile_name) {
      $laneProfileName = [string]$registerData.lane_profile_name
    }
    if ($registerData.profile_state) {
      $profileState = [string]$registerData.profile_state
    }
    if ($registerData.launch_command) {
      $launchCommand = [string]$registerData.launch_command
    }
    if ($registerData.thread_start_guidance) {
      $threadStartGuidance = @($registerData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'register_report_parse_failed' -Message "Unable to parse continuity register report JSON: $($_.Exception.Message)" -Path $RegisterReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'register_report_missing' -Message 'Continuity register report missing after register execution.' -Path $RegisterReportPath
}

$indexComplete = (
  $registerState -eq 'ready' -and
  $registerComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0
)

if (-not $indexComplete) {
  $indexState = 'attention_required'
  $recommendedAction = 'repair_continuity_register_and_rebuild_handoff_index'
  Add-Finding -Severity 'warning' -Code 'handoff_index_not_ready' -Message 'Continuity register handoff index checks failed.' -Path $RegisterReportPath
}

$report = [ordered]@{
  indexed_at = $now.ToString('o')
  repo_root = $RepoRoot
  index_name = $IndexName
  operator_acknowledged = [bool]$OperatorAcknowledged
  index_state = $indexState
  index_complete = $indexComplete
  recommended_action = $recommendedAction
  register_script_path = $RegisterScriptPath
  register_report_path = $RegisterReportPath
  register_ran = $registerRan
  register_state = $registerState
  register_complete = $registerComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Continuity register handoff index is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "indexed_at=$($report.indexed_at)"
  "index_name=$IndexName"
  "index_state=$indexState"
  "index_complete=$indexComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "register_state=$registerState"
  "register_complete=$registerComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
