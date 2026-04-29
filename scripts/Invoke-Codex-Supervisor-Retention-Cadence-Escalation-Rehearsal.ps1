param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$ClosureCheckpointFile = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = '',
  [ValidateSet('auto', 'warning', 'critical')]
  [string]$RehearsalLevel = 'auto',
  [string]$LaneId = 'lane-default'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ClosureCheckpointFile) {
  $ClosureCheckpointFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-closure-checkpoint.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-escalation-rehearsal.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-escalation-rehearsal.txt'
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

$checkpoint = Read-JsonFile -Path $ClosureCheckpointFile
if ($null -eq $checkpoint) {
  Add-Finding -Severity 'critical' -Code 'closure_checkpoint_missing' -Message "Closure checkpoint missing or unreadable: $ClosureCheckpointFile" -Path $ClosureCheckpointFile
}

$inputState = 'unknown'
$rehearsalState = 'escalation_required'
$actionCode = 'rebuild_closure_checkpoint_and_rehearse_again'
$operatorAckRequired = $true
$escalationSeverity = 'critical'

if ($null -ne $checkpoint) {
  $inputState = [string]$checkpoint.checkpoint_state
}

if ($RehearsalLevel -eq 'warning') {
  $rehearsalState = 'attention_required'
  $actionCode = 'schedule_followup_closure_review_and_acknowledge_warning'
  $operatorAckRequired = $true
  $escalationSeverity = 'elevated'
}
elseif ($RehearsalLevel -eq 'critical') {
  $rehearsalState = 'escalation_required'
  $actionCode = 'trigger_operator_escalation_and_open_immediate_followup_packet'
  $operatorAckRequired = $true
  $escalationSeverity = 'critical'
}
else {
  switch ($inputState) {
    'ready' {
      $rehearsalState = 'attention_required'
      $actionCode = 'schedule_followup_closure_review_and_acknowledge_warning'
      $operatorAckRequired = $true
      $escalationSeverity = 'elevated'
    }
    'attention_required' {
      $rehearsalState = 'attention_required'
      $actionCode = 'schedule_followup_closure_review_and_acknowledge_warning'
      $operatorAckRequired = $true
      $escalationSeverity = 'elevated'
    }
    'escalation_required' {
      $rehearsalState = 'escalation_required'
      $actionCode = 'trigger_operator_escalation_and_open_immediate_followup_packet'
      $operatorAckRequired = $true
      $escalationSeverity = 'critical'
    }
    default {
      Add-Finding -Severity 'warning' -Code 'closure_state_unknown' -Message "Unknown checkpoint_state '$inputState'; defaulting to critical rehearsal."
      $rehearsalState = 'escalation_required'
      $actionCode = 'trigger_operator_escalation_and_open_immediate_followup_packet'
      $operatorAckRequired = $true
      $escalationSeverity = 'critical'
    }
  }
}

$drillFields = [ordered]@{
  lane_id = $LaneId
  rehearsal_level = $RehearsalLevel
  input_checkpoint_state = $inputState
  rehearsal_state = $rehearsalState
  escalation_severity = $escalationSeverity
  action_code = $actionCode
  operator_ack_required = $operatorAckRequired
  acknowledgment_prompt = if ($operatorAckRequired) {
    "ACK required for ${LaneId}: confirm escalation rehearsal action '$actionCode'."
  } else {
    'No operator acknowledgment required.'
  }
  closure_summary = [ordered]@{
    closure_ratio = if ($null -ne $checkpoint) { [double]$checkpoint.closure_ratio } else { 0.0 }
    open_followup_count = if ($null -ne $checkpoint) { [int]$checkpoint.open_followup_count } else { 0 }
    oldest_open_followup_age_minutes = if ($null -ne $checkpoint) { $checkpoint.oldest_open_followup_age_minutes } else { $null }
  }
}

$report = [ordered]@{
  rehearsed_at = $now.ToString('o')
  repo_root = $RepoRoot
  closure_checkpoint_file = $ClosureCheckpointFile
  rehearsal = $drillFields
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "rehearsed_at=$($report.rehearsed_at)"
  "lane_id=$LaneId"
  "input_checkpoint_state=$inputState"
  "rehearsal_state=$rehearsalState"
  "escalation_severity=$escalationSeverity"
  "action_code=$actionCode"
  "operator_ack_required=$operatorAckRequired"
  "closure_ratio=$($drillFields.closure_summary.closure_ratio)"
  "open_followup_count=$($drillFields.closure_summary.open_followup_count)"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
