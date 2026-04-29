param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [ValidateSet('low', 'medium', 'high')]
  [string]$LaneRisk = 'medium',
  [string]$CheckpointFile = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = '',
  [string]$LaneId = 'default'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $CheckpointFile) {
  $CheckpointFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-operations-checkpoint.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff.txt'
}

if (-not (Test-Path $CheckpointFile)) {
  throw "Checkpoint file not found: $CheckpointFile"
}

function Ensure-ParentDirectory {
  param([string]$Path)
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
}

$checkpoint = Get-Content -Path $CheckpointFile -Raw | ConvertFrom-Json
$checkpointState = [string]$checkpoint.checkpoint_state
if ([string]::IsNullOrWhiteSpace($checkpointState)) {
  throw 'Checkpoint file is missing checkpoint_state.'
}

$baseCadenceHoursByRisk = @{
  low = 24
  medium = 12
  high = 6
}
$baseCadenceHours = [int]$baseCadenceHoursByRisk[$LaneRisk]
$effectiveCadenceHours = $baseCadenceHours

$handoffSeverity = 'normal'
$handoffAction = 'retain_standard_schedule'
$requiresAck = $false

switch ($checkpointState) {
  'ready' {
    $handoffSeverity = 'normal'
    $handoffAction = 'retain_standard_schedule'
    $effectiveCadenceHours = $baseCadenceHours
  }
  'attention_required' {
    $handoffSeverity = 'elevated'
    $handoffAction = 'schedule_followup_audit_and_review_archive_growth'
    $effectiveCadenceHours = [Math]::Max([int][Math]::Floor($baseCadenceHours / 2), 2)
    $requiresAck = $true
  }
  'escalation_required' {
    $handoffSeverity = 'critical'
    $handoffAction = 'run_apply_with_operator_ack_and_open_followup_packet'
    $effectiveCadenceHours = 1
    $requiresAck = $true
  }
  default {
    throw "Unsupported checkpoint_state '$checkpointState' in checkpoint file."
  }
}

$now = [DateTimeOffset]::Now
$nextAuditDueAt = $now.AddHours($effectiveCadenceHours)

$handoff = [ordered]@{
  generated_at = $now.ToString('o')
  repo_root = $RepoRoot
  lane_id = $LaneId
  lane_risk = $LaneRisk
  checkpoint_file = $CheckpointFile
  checkpoint_state = $checkpointState
  handoff_severity = $handoffSeverity
  handoff_action = $handoffAction
  operator_ack_required = $requiresAck
  cadence = [ordered]@{
    base_hours_by_risk = [ordered]@{
      low = 24
      medium = 12
      high = 6
    }
    base_hours = $baseCadenceHours
    effective_hours = $effectiveCadenceHours
    next_audit_due_at = $nextAuditDueAt.ToString('o')
  }
  summary = [ordered]@{
    findings_count = @($checkpoint.findings).Count
    recommended_action_from_checkpoint = [string]$checkpoint.recommended_action
  }
  shift_handoff_template = [ordered]@{
    required_fields = @(
      'lane_id',
      'lane_risk',
      'checkpoint_state',
      'handoff_action',
      'operator_ack_required',
      'next_audit_due_at',
      'top_findings',
      'owner'
    )
    top_findings = @($checkpoint.findings | Select-Object -First 3)
  }
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$handoffJson = $handoff | ConvertTo-Json -Depth 8
Set-Content -Path $OutputFile -Value $handoffJson -Encoding UTF8

$lines = @(
  "generated_at=$($handoff.generated_at)"
  "lane_id=$LaneId"
  "lane_risk=$LaneRisk"
  "checkpoint_state=$checkpointState"
  "handoff_severity=$handoffSeverity"
  "handoff_action=$handoffAction"
  "operator_ack_required=$requiresAck"
  "effective_cadence_hours=$effectiveCadenceHours"
  "next_audit_due_at=$($nextAuditDueAt.ToString('o'))"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $handoffJson
