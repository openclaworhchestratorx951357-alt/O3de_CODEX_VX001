param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$ChecklistScriptPath = '',
  [string]$ChecklistReportPath = '',
  [string]$DigestName = 'execution_checklist_evidence_handoff_digest',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ChecklistScriptPath) {
  $ChecklistScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Launch-Playbook-Execution-Checklist.ps1'
}
if (-not $ChecklistReportPath) {
  $ChecklistReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-launch-playbook-execution-checklist.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-execution-checklist-evidence-handoff-digest.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-execution-checklist-evidence-handoff-digest.txt'
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

$checklistState = 'missing'
$checklistComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$executionChecklist = @()
$digestState = 'ready'
$digestComplete = $false
$recommendedAction = 'publish_execution_checklist_evidence_handoff_digest'
$checklistRan = $false

if (-not (Test-Path $ChecklistScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'checklist_script_missing' -Message 'Launch playbook execution checklist script missing.' -Path $ChecklistScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $ChecklistScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $checklistRan = ($LASTEXITCODE -eq 0)
  if (-not $checklistRan) {
    Add-Finding -Severity 'warning' -Code 'checklist_execution_failed' -Message 'Launch playbook execution checklist execution failed.' -Path $ChecklistScriptPath
  }
}

if (Test-Path $ChecklistReportPath) {
  try {
    $checklistData = Get-Content -Path $ChecklistReportPath -Raw | ConvertFrom-Json
    if ($checklistData.checklist_state) {
      $checklistState = [string]$checklistData.checklist_state
    }
    if ($null -ne $checklistData.checklist_complete) {
      $checklistComplete = [bool]$checklistData.checklist_complete
    }
    if ($checklistData.lane_profile_name) {
      $laneProfileName = [string]$checklistData.lane_profile_name
    }
    if ($checklistData.profile_state) {
      $profileState = [string]$checklistData.profile_state
    }
    if ($checklistData.launch_command) {
      $launchCommand = [string]$checklistData.launch_command
    }
    if ($checklistData.thread_start_guidance) {
      $threadStartGuidance = @($checklistData.thread_start_guidance)
    }
    if ($checklistData.execution_checklist) {
      $executionChecklist = @($checklistData.execution_checklist)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'checklist_report_parse_failed' -Message "Unable to parse execution checklist report JSON: $($_.Exception.Message)" -Path $ChecklistReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'checklist_report_missing' -Message 'Execution checklist report missing after checklist execution.' -Path $ChecklistReportPath
}

$evidenceDigest = @(
  "digest_basis=launch_playbook_execution_checklist",
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "execution_checklist_count=$(@($executionChecklist).Count)"
)

$digestComplete = (
  $checklistState -eq 'ready' -and
  $checklistComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  @($executionChecklist).Count -gt 0 -and
  @($evidenceDigest).Count -gt 0
)

if (-not $digestComplete) {
  $digestState = 'attention_required'
  $recommendedAction = 'repair_execution_checklist_and_rebuild_evidence_handoff_digest'
  Add-Finding -Severity 'warning' -Code 'evidence_handoff_digest_not_ready' -Message 'Execution checklist evidence handoff digest checks failed.' -Path $ChecklistReportPath
}

$report = [ordered]@{
  digested_at = $now.ToString('o')
  repo_root = $RepoRoot
  digest_name = $DigestName
  operator_acknowledged = [bool]$OperatorAcknowledged
  digest_state = $digestState
  digest_complete = $digestComplete
  recommended_action = $recommendedAction
  checklist_script_path = $ChecklistScriptPath
  checklist_report_path = $ChecklistReportPath
  checklist_ran = $checklistRan
  checklist_state = $checklistState
  checklist_complete = $checklistComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  execution_checklist = $executionChecklist
  evidence_handoff_digest = $evidenceDigest
  local_only_note = 'Execution checklist evidence handoff digest is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "digested_at=$($report.digested_at)"
  "digest_name=$DigestName"
  "digest_state=$digestState"
  "digest_complete=$digestComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "checklist_state=$checklistState"
  "checklist_complete=$checklistComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
