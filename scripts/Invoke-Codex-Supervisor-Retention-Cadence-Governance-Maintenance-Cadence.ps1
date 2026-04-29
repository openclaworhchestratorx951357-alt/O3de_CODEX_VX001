param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$FinalCloseoutFile = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = '',
  [int]$ReadyCadenceDays = 7,
  [int]$AttentionCadenceDays = 3,
  [int]$EscalationCadenceDays = 1
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $FinalCloseoutFile) {
  $FinalCloseoutFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-final-governance-closeout.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-governance-maintenance-cadence.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-governance-maintenance-cadence.txt'
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

$closeout = Read-JsonFile -Path $FinalCloseoutFile
if ($null -eq $closeout) {
  Add-Finding -Severity 'critical' -Code 'final_closeout_missing' -Message "Final governance closeout file missing or unreadable: $FinalCloseoutFile" -Path $FinalCloseoutFile
}

$baseState = if ($null -ne $closeout) { [string]$closeout.closeout_state } else { 'escalation_required' }
$closedOutAt = $null
if ($null -ne $closeout) {
  try {
    $closedOutAt = [DateTimeOffset]::Parse([string]$closeout.closed_out_at)
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'closeout_timestamp_invalid' -Message 'final closeout timestamp could not be parsed.'
  }
}

$cadenceDays = $ReadyCadenceDays
switch ($baseState) {
  'ready' { $cadenceDays = $ReadyCadenceDays }
  'attention_required' { $cadenceDays = $AttentionCadenceDays }
  'escalation_required' { $cadenceDays = $EscalationCadenceDays }
  default {
    $cadenceDays = $EscalationCadenceDays
    Add-Finding -Severity 'warning' -Code 'closeout_state_unknown' -Message "Unknown closeout_state '$baseState'; using escalation cadence."
  }
}

$nextAuditDueAt = if ($null -ne $closedOutAt) { $closedOutAt.AddDays($cadenceDays) } else { $now.AddDays($cadenceDays) }
$isOverdue = $now -gt $nextAuditDueAt

$missingReferenceCount = 0
if ($null -ne $closeout -and $null -ne $closeout.references) {
  foreach ($reference in $closeout.references) {
    if (-not [bool]$reference.exists) {
      $missingReferenceCount += 1
    }
  }
}

$maintenanceState = 'ready'
$recommendedAction = 'maintain_current_governance_cadence'
$refreshPacketRequired = $false

if ($missingReferenceCount -gt 0) {
  Add-Finding -Severity 'critical' -Code 'reference_drift_detected' -Message "Missing governance reference count: $missingReferenceCount."
  $maintenanceState = 'escalation_required'
  $recommendedAction = 'open_governance_refresh_packet_immediately'
  $refreshPacketRequired = $true
}
elseif ($isOverdue) {
  Add-Finding -Severity 'warning' -Code 'governance_audit_overdue' -Message "Governance closeout audit is overdue (due at $($nextAuditDueAt.ToString('o')))."
  $maintenanceState = 'attention_required'
  $recommendedAction = 'open_governance_refresh_packet_for_stale_closeout'
  $refreshPacketRequired = $true
}
elseif ($baseState -eq 'attention_required') {
  $maintenanceState = 'attention_required'
  $recommendedAction = 'maintain_attention_cadence_and_recheck'
}
elseif ($baseState -eq 'escalation_required') {
  $maintenanceState = 'escalation_required'
  $recommendedAction = 'stabilize_escalation_signals_then_reclose'
  $refreshPacketRequired = $true
}

$thresholds = [ordered]@{
  ready_cadence_days = $ReadyCadenceDays
  attention_cadence_days = $AttentionCadenceDays
  escalation_cadence_days = $EscalationCadenceDays
  refresh_trigger_missing_reference_count = 1
  refresh_trigger_overdue = $true
}

$report = [ordered]@{
  evaluated_at = $now.ToString('o')
  repo_root = $RepoRoot
  final_closeout_file = $FinalCloseoutFile
  base_closeout_state = $baseState
  cadence_days = $cadenceDays
  next_audit_due_at = $nextAuditDueAt.ToString('o')
  overdue = $isOverdue
  maintenance_state = $maintenanceState
  recommended_action = $recommendedAction
  refresh_packet_required = $refreshPacketRequired
  missing_reference_count = $missingReferenceCount
  thresholds = $thresholds
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "evaluated_at=$($report.evaluated_at)"
  "base_closeout_state=$baseState"
  "maintenance_state=$maintenanceState"
  "recommended_action=$recommendedAction"
  "cadence_days=$cadenceDays"
  "next_audit_due_at=$($nextAuditDueAt.ToString('o'))"
  "overdue=$isOverdue"
  "refresh_packet_required=$refreshPacketRequired"
  "missing_reference_count=$missingReferenceCount"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
