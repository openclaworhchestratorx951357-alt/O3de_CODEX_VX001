param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$EscalationRehearsalFile = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = '',
  [string]$LaneId = 'lane-default'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $EscalationRehearsalFile) {
  $EscalationRehearsalFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-escalation-rehearsal.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-handoff-closeout.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-handoff-closeout.txt'
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

$rehearsal = Read-JsonFile -Path $EscalationRehearsalFile
if ($null -eq $rehearsal) {
  Add-Finding -Severity 'critical' -Code 'escalation_rehearsal_missing' -Message "Escalation rehearsal file missing or unreadable: $EscalationRehearsalFile" -Path $EscalationRehearsalFile
}

$rehearsalState = if ($null -ne $rehearsal) { [string]$rehearsal.rehearsal.rehearsal_state } else { 'unknown' }
$actionCode = if ($null -ne $rehearsal) { [string]$rehearsal.rehearsal.action_code } else { 'rebuild_escalation_rehearsal' }
$operatorAckRequired = if ($null -ne $rehearsal) { [bool]$rehearsal.rehearsal.operator_ack_required } else { $true }
$severity = if ($null -ne $rehearsal) { [string]$rehearsal.rehearsal.escalation_severity } else { 'critical' }

$closeoutState = 'ready'
$recommendedAction = 'handoff_examples_ready_for_operator_use'
if ($rehearsalState -eq 'escalation_required') {
  $closeoutState = 'attention_required'
  $recommendedAction = 'operator_ack_and_followup_packet_required'
}
elseif ($rehearsalState -eq 'unknown') {
  $closeoutState = 'escalation_required'
  $recommendedAction = 'rebuild_escalation_rehearsal_before_handoff'
}

$localOnlyNote = 'This handoff output is local-only governance guidance and does not authorize runtime mutation, provider execution, placement, or Asset Processor changes.'

$safeExamples = @(
  [ordered]@{
    prompt = "Prepare lane $LaneId retention follow-up summary and list pending closure checkpoints."
    expected_outcome = 'allowed_local_handoff_summary'
    rationale = 'Read-only operator handoff summary is inside admitted local governance scope.'
  },
  [ordered]@{
    prompt = "Acknowledge escalation rehearsal for lane $LaneId and open the named follow-up packet."
    expected_outcome = 'allowed_acknowledgment_workflow'
    rationale = 'Acknowledgment and packet handoff are governance actions, not runtime mutation.'
  }
)

$refusedExamples = @(
  [ordered]@{
    prompt = "Bypass acknowledgment and directly execute provider/runtime changes for lane $LaneId."
    refusal_code = 'runtime_broadening_blocked'
    rationale = 'Escalation rehearsal output cannot authorize runtime execution surfaces.'
  },
  [ordered]@{
    prompt = "Treat session approval fields as direct authorization to mutate project assets."
    refusal_code = 'operator_authorization_misuse_blocked'
    rationale = 'Session/approval metadata are not mutation authorization.'
  }
)

$report = [ordered]@{
  closed_out_at = $now.ToString('o')
  repo_root = $RepoRoot
  lane_id = $LaneId
  escalation_rehearsal_file = $EscalationRehearsalFile
  closeout_state = $closeoutState
  recommended_action = $recommendedAction
  escalation_summary = [ordered]@{
    rehearsal_state = $rehearsalState
    escalation_severity = $severity
    action_code = $actionCode
    operator_ack_required = $operatorAckRequired
  }
  local_only_note = $localOnlyNote
  operator_examples = [ordered]@{
    safe = $safeExamples
    refused = $refusedExamples
  }
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "closed_out_at=$($report.closed_out_at)"
  "lane_id=$LaneId"
  "closeout_state=$closeoutState"
  "recommended_action=$recommendedAction"
  "rehearsal_state=$rehearsalState"
  "action_code=$actionCode"
  "operator_ack_required=$operatorAckRequired"
  "safe_examples=$(@($safeExamples).Count)"
  "refused_examples=$(@($refusedExamples).Count)"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
