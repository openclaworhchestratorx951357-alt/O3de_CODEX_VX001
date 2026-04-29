param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$IndexScriptPath = '',
  [string]$IndexReportPath = '',
  [string]$PlaybookName = 'handoff_index_launch_playbook',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $IndexScriptPath) {
  $IndexScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Continuity-Register-Handoff-Index.ps1'
}
if (-not $IndexReportPath) {
  $IndexReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-continuity-register-handoff-index.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-index-launch-playbook.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-index-launch-playbook.txt'
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

$indexState = 'missing'
$indexComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$playbookState = 'ready'
$playbookComplete = $false
$recommendedAction = 'publish_handoff_index_launch_playbook'
$indexRan = $false

if (-not (Test-Path $IndexScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'index_script_missing' -Message 'Continuity register handoff index script missing.' -Path $IndexScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $IndexScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $indexRan = ($LASTEXITCODE -eq 0)
  if (-not $indexRan) {
    Add-Finding -Severity 'warning' -Code 'index_execution_failed' -Message 'Continuity register handoff index execution failed.' -Path $IndexScriptPath
  }
}

if (Test-Path $IndexReportPath) {
  try {
    $indexData = Get-Content -Path $IndexReportPath -Raw | ConvertFrom-Json
    if ($indexData.index_state) {
      $indexState = [string]$indexData.index_state
    }
    if ($null -ne $indexData.index_complete) {
      $indexComplete = [bool]$indexData.index_complete
    }
    if ($indexData.lane_profile_name) {
      $laneProfileName = [string]$indexData.lane_profile_name
    }
    if ($indexData.profile_state) {
      $profileState = [string]$indexData.profile_state
    }
    if ($indexData.launch_command) {
      $launchCommand = [string]$indexData.launch_command
    }
    if ($indexData.thread_start_guidance) {
      $threadStartGuidance = @($indexData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'index_report_parse_failed' -Message "Unable to parse handoff index report JSON: $($_.Exception.Message)" -Path $IndexReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'index_report_missing' -Message 'Handoff index report missing after index execution.' -Path $IndexReportPath
}

$playbookSteps = @(
  "Confirm lane profile '$laneProfileName' remains in ready state before launch dispatch.",
  "Run launch command: $launchCommand",
  "Apply thread start guidance in order and do not broaden runtime scope.",
  "Capture packet evidence locally and keep launch path governance-only."
)

$playbookComplete = (
  $indexState -eq 'ready' -and
  $indexComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0
)

if (-not $playbookComplete) {
  $playbookState = 'attention_required'
  $recommendedAction = 'repair_handoff_index_and_rebuild_launch_playbook'
  Add-Finding -Severity 'warning' -Code 'launch_playbook_not_ready' -Message 'Handoff index launch playbook checks failed.' -Path $IndexReportPath
}

$report = [ordered]@{
  playbooked_at = $now.ToString('o')
  repo_root = $RepoRoot
  playbook_name = $PlaybookName
  operator_acknowledged = [bool]$OperatorAcknowledged
  playbook_state = $playbookState
  playbook_complete = $playbookComplete
  recommended_action = $recommendedAction
  index_script_path = $IndexScriptPath
  index_report_path = $IndexReportPath
  index_ran = $indexRan
  index_state = $indexState
  index_complete = $indexComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  playbook_steps = $playbookSteps
  local_only_note = 'Handoff index launch playbook is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "playbooked_at=$($report.playbooked_at)"
  "playbook_name=$PlaybookName"
  "playbook_state=$playbookState"
  "playbook_complete=$playbookComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "index_state=$indexState"
  "index_complete=$indexComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
