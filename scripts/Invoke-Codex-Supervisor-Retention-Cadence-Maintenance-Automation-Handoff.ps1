param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$MaintenanceCadenceFile = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = '',
  [string]$LaneId = 'lane-default'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $MaintenanceCadenceFile) {
  $MaintenanceCadenceFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-governance-maintenance-cadence.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-maintenance-automation-handoff.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-maintenance-automation-handoff.txt'
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

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    return $null
  }
  try {
    return Get-Content -Path $Path -Raw | ConvertFrom-Json
  }
  catch {
    Add-Finding -Severity 'critical' -Code 'json_parse_failed' -Message "Failed to parse JSON: $Path" -Path $Path
    return $null
  }
}

$findings = @()
$now = [DateTimeOffset]::Now

$maintenance = Read-JsonFile -Path $MaintenanceCadenceFile
if ($null -eq $maintenance) {
  Add-Finding -Severity 'critical' -Code 'maintenance_cadence_missing' -Message "Maintenance cadence file missing or unreadable: $MaintenanceCadenceFile" -Path $MaintenanceCadenceFile
}

$maintenanceState = if ($null -ne $maintenance) { [string]$maintenance.maintenance_state } else { 'escalation_required' }
$nextAuditDueAt = if ($null -ne $maintenance) { [string]$maintenance.next_audit_due_at } else { $now.ToString('o') }
$recommendedAction = if ($null -ne $maintenance) { [string]$maintenance.recommended_action } else { 'restore_maintenance_cadence_input' }
$refreshRequired = if ($null -ne $maintenance) { [bool]$maintenance.refresh_packet_required } else { $true }

$handoffState = 'ready'
if ($maintenanceState -eq 'attention_required' -or $maintenanceState -eq 'escalation_required') {
  $handoffState = 'attention_required'
}
if (@($findings | Where-Object { $_.severity -eq 'critical' }).Count -gt 0) {
  $handoffState = 'escalation_required'
}

$reminders = @(
  "Lane ${LaneId}: review cadence governance outputs before $nextAuditDueAt.",
  "Keep maintenance outcomes local-only; do not treat checklist actions as runtime authorization.",
  "If maintenance state is not ready, open the named follow-up governance packet before broadening scope."
)

$checklist = @(
  [ordered]@{ step='verify_reference_docs'; status='required'; detail='All governance reference docs present and status lines readable.' },
  [ordered]@{ step='verify_due_window'; status='required'; detail='Current time is before next audit due time or follow-up is opened.' },
  [ordered]@{ step='verify_refresh_trigger'; status='required'; detail='Missing-reference or overdue trigger creates refresh packet recommendation.' },
  [ordered]@{ step='verify_non_authorizing_language'; status='required'; detail='Handoff copy remains local-only and non-authorizing.' }
)

$escalationReplaySteps = @(
  'Review maintenance_state and recommended_action from maintenance cadence output.',
  'Confirm whether refresh_packet_required is true.',
  'Acknowledge escalation in operator lane handoff notes.',
  'Open the governance refresh packet and record packet id in the lane journal.'
)

$report = [ordered]@{
  handed_off_at = $now.ToString('o')
  repo_root = $RepoRoot
  lane_id = $LaneId
  maintenance_cadence_file = $MaintenanceCadenceFile
  handoff_state = $handoffState
  recommended_action = $recommendedAction
  maintenance_summary = [ordered]@{
    maintenance_state = $maintenanceState
    next_audit_due_at = $nextAuditDueAt
    refresh_packet_required = $refreshRequired
  }
  reminders = $reminders
  checklist = $checklist
  escalation_replay_steps = $escalationReplaySteps
  local_only_note = 'This handoff is local governance guidance only and does not authorize runtime mutation, provider execution, placement, or asset pipeline execution.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "handed_off_at=$($report.handed_off_at)"
  "lane_id=$LaneId"
  "handoff_state=$handoffState"
  "recommended_action=$recommendedAction"
  "maintenance_state=$maintenanceState"
  "next_audit_due_at=$nextAuditDueAt"
  "refresh_packet_required=$refreshRequired"
  "reminder_count=$(@($reminders).Count)"
  "checklist_count=$(@($checklist).Count)"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
