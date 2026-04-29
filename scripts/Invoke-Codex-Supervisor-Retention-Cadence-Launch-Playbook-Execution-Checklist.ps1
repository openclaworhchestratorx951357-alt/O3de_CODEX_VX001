param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$PlaybookScriptPath = '',
  [string]$PlaybookReportPath = '',
  [string]$ChecklistName = 'launch_playbook_execution_checklist',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $PlaybookScriptPath) {
  $PlaybookScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Index-Launch-Playbook.ps1'
}
if (-not $PlaybookReportPath) {
  $PlaybookReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-index-launch-playbook.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-launch-playbook-execution-checklist.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-launch-playbook-execution-checklist.txt'
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

$playbookState = 'missing'
$playbookComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$playbookSteps = @()
$checklistState = 'ready'
$checklistComplete = $false
$recommendedAction = 'publish_launch_playbook_execution_checklist'
$playbookRan = $false

if (-not (Test-Path $PlaybookScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'playbook_script_missing' -Message 'Handoff index launch playbook script missing.' -Path $PlaybookScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $PlaybookScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $playbookRan = ($LASTEXITCODE -eq 0)
  if (-not $playbookRan) {
    Add-Finding -Severity 'warning' -Code 'playbook_execution_failed' -Message 'Handoff index launch playbook execution failed.' -Path $PlaybookScriptPath
  }
}

if (Test-Path $PlaybookReportPath) {
  try {
    $playbookData = Get-Content -Path $PlaybookReportPath -Raw | ConvertFrom-Json
    if ($playbookData.playbook_state) {
      $playbookState = [string]$playbookData.playbook_state
    }
    if ($null -ne $playbookData.playbook_complete) {
      $playbookComplete = [bool]$playbookData.playbook_complete
    }
    if ($playbookData.lane_profile_name) {
      $laneProfileName = [string]$playbookData.lane_profile_name
    }
    if ($playbookData.profile_state) {
      $profileState = [string]$playbookData.profile_state
    }
    if ($playbookData.launch_command) {
      $launchCommand = [string]$playbookData.launch_command
    }
    if ($playbookData.thread_start_guidance) {
      $threadStartGuidance = @($playbookData.thread_start_guidance)
    }
    if ($playbookData.playbook_steps) {
      $playbookSteps = @($playbookData.playbook_steps)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'playbook_report_parse_failed' -Message "Unable to parse launch playbook report JSON: $($_.Exception.Message)" -Path $PlaybookReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'playbook_report_missing' -Message 'Launch playbook report missing after playbook execution.' -Path $PlaybookReportPath
}

$executionChecklist = @(
  "Validate lane profile '$laneProfileName' is ready immediately before operator launch.",
  "Verify profile_state remains '$profileState' and launch command is unchanged.",
  "Confirm launch command slated for use: $launchCommand",
  "Replay thread_start_guidance in-order without broadening admitted runtime scope.",
  "Capture local evidence artifact for checklist completion and slice handoff."
)
if (@($playbookSteps).Count -gt 0) {
  $executionChecklist += @($playbookSteps)
}

$checklistComplete = (
  $playbookState -eq 'ready' -and
  $playbookComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  @($executionChecklist).Count -gt 0
)

if (-not $checklistComplete) {
  $checklistState = 'attention_required'
  $recommendedAction = 'repair_launch_playbook_and_rebuild_execution_checklist'
  Add-Finding -Severity 'warning' -Code 'execution_checklist_not_ready' -Message 'Launch playbook execution checklist checks failed.' -Path $PlaybookReportPath
}

$report = [ordered]@{
  checklisted_at = $now.ToString('o')
  repo_root = $RepoRoot
  checklist_name = $ChecklistName
  operator_acknowledged = [bool]$OperatorAcknowledged
  checklist_state = $checklistState
  checklist_complete = $checklistComplete
  recommended_action = $recommendedAction
  playbook_script_path = $PlaybookScriptPath
  playbook_report_path = $PlaybookReportPath
  playbook_ran = $playbookRan
  playbook_state = $playbookState
  playbook_complete = $playbookComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  playbook_steps = $playbookSteps
  execution_checklist = $executionChecklist
  local_only_note = 'Launch playbook execution checklist is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "checklisted_at=$($report.checklisted_at)"
  "checklist_name=$ChecklistName"
  "checklist_state=$checklistState"
  "checklist_complete=$checklistComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "playbook_state=$playbookState"
  "playbook_complete=$playbookComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
