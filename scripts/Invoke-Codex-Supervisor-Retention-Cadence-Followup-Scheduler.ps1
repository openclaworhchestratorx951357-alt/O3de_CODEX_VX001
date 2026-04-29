param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$AdoptionCheckpointFile = '',
  [string]$QueueFile = '',
  [string]$EventsFile = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = '',
  [int]$OverdueGraceMinutes = 0
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $AdoptionCheckpointFile) {
  $AdoptionCheckpointFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-adoption-checkpoint.json'
}
if (-not $QueueFile) {
  $QueueFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-packet-queue.jsonl'
}
if (-not $EventsFile) {
  $EventsFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-packet-events.jsonl'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-followup-scheduler.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-followup-scheduler.txt'
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

function Get-HashHex {
  param([string]$InputText)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($InputText)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $sha.ComputeHash($bytes)
    return -join ($hashBytes | ForEach-Object { $_.ToString('x2') })
  }
  finally {
    $sha.Dispose()
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

function Read-JsonLines {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    return @()
  }
  $items = @()
  $lineNumber = 0
  foreach ($line in (Get-Content -Path $Path)) {
    $lineNumber += 1
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    try {
      $items += ($line | ConvertFrom-Json)
    }
    catch {
      Add-Finding -Severity 'warning' -Code 'jsonl_line_parse_failed' -Message "Skipped non-JSON line $lineNumber in $Path" -Path $Path
    }
  }
  return $items
}

function Append-JsonLine {
  param(
    [string]$Path,
    $Object
  )
  Ensure-ParentDirectory -Path $Path
  $json = $Object | ConvertTo-Json -Depth 12 -Compress
  Add-Content -Path $Path -Value $json
}

$findings = @()
$expectedStates = @('ready', 'attention_required', 'escalation_required')
$statePriority = @{
  ready = 3
  attention_required = 2
  escalation_required = 1
}
$now = [DateTimeOffset]::Now

$checkpoint = Read-JsonFile -Path $AdoptionCheckpointFile
if ($null -eq $checkpoint) {
  Add-Finding -Severity 'critical' -Code 'adoption_checkpoint_missing' -Message "Adoption checkpoint file missing or unreadable: $AdoptionCheckpointFile" -Path $AdoptionCheckpointFile
}

$candidates = @()
if ($null -ne $checkpoint) {
  $missingStates = @()
  if ($null -ne $checkpoint.missing_states) {
    $missingStates = @($checkpoint.missing_states)
  }
  foreach ($state in $missingStates) {
    $stateName = [string]$state
    $priority = 2
    if ($statePriority.ContainsKey($stateName)) {
      $priority = [int]$statePriority[$stateName]
    }
    $key = "state_coverage_missing|$stateName"
    $candidates += [ordered]@{
      followup_key = $key
      reason_code = 'state_coverage_missing'
      checkpoint_state = $stateName
      lane_id = "lane-coverage-$stateName"
      lane_risk = 'medium'
      priority = $priority
      due_at = $now.ToString('o')
      note = "Capture lane evidence for missing '$stateName' cadence handoff coverage."
    }
  }

  foreach ($state in $expectedStates) {
    $example = $null
    if ($null -ne $checkpoint.examples_by_state) {
      $example = $checkpoint.examples_by_state.$state
    }
    if ($null -eq $example) {
      continue
    }
    $sourceFile = [string]$example.source_file
    if ([string]::IsNullOrWhiteSpace($sourceFile)) {
      Add-Finding -Severity 'warning' -Code 'example_source_missing' -Message "No source_file for state '$state' example."
      continue
    }
    $resolvedSource = $sourceFile
    if (-not [System.IO.Path]::IsPathRooted($resolvedSource)) {
      $resolvedSource = Join-Path $RepoRoot $resolvedSource
    }
    $handoff = Read-JsonFile -Path $resolvedSource
    if ($null -eq $handoff) {
      Add-Finding -Severity 'warning' -Code 'handoff_source_missing' -Message "Example source file missing for state '$state': $resolvedSource" -Path $resolvedSource
      continue
    }

    $nextDue = $null
    try {
      $nextDue = [DateTimeOffset]::Parse([string]$handoff.cadence.next_audit_due_at)
    }
    catch {
      Add-Finding -Severity 'warning' -Code 'handoff_due_parse_failed' -Message "Unable to parse cadence.next_audit_due_at for state '$state' sample." -Path $resolvedSource
      continue
    }

    $grace = [TimeSpan]::FromMinutes($OverdueGraceMinutes)
    if ($now -gt $nextDue.Add($grace)) {
      $laneId = [string]$example.lane_id
      $laneRisk = [string]$example.lane_risk
      if ([string]::IsNullOrWhiteSpace($laneRisk)) {
        $laneRisk = 'medium'
      }
      $key = "state_evidence_overdue|$state|$laneId|$laneRisk"
      $candidates += [ordered]@{
        followup_key = $key
        reason_code = 'state_evidence_overdue'
        checkpoint_state = $state
        lane_id = $laneId
        lane_risk = $laneRisk
        priority = 1
        due_at = $now.ToString('o')
        sample_due_at = $nextDue.ToString('o')
        note = "Refresh overdue cadence evidence for lane '$laneId' in state '$state'."
      }
    }
  }
}

$pendingKeys = @{}
foreach ($item in (Read-JsonLines -Path $QueueFile)) {
  if ($null -eq $item) {
    continue
  }
  $k = [string]$item.followup_key
  if ([string]::IsNullOrWhiteSpace($k)) {
    continue
  }
  $queueState = [string]$item.queue_state
  if ([string]::IsNullOrWhiteSpace($queueState)) {
    $queueState = 'queued'
  }
  if ($queueState -ne 'completed' -and $queueState -ne 'cancelled') {
    $pendingKeys[$k] = $true
  }
}

$emitted = @()
$skippedExisting = @()
$eventRecords = @()

foreach ($candidate in $candidates) {
  $key = [string]$candidate.followup_key
  if ($pendingKeys.ContainsKey($key)) {
    $skippedExisting += $candidate
    $eventRecords += [ordered]@{
      event_id = ('event-' + (Get-HashHex -InputText ("skip|" + $key + "|" + $now.ToUnixTimeMilliseconds())))
      event_type = 'retention_followup_scheduler'
      event_state = 'duplicate_skipped'
      happened_at = $now.ToString('o')
      followup_key = $key
      reason_code = [string]$candidate.reason_code
      checkpoint_state = [string]$candidate.checkpoint_state
    }
    continue
  }

  $hash = Get-HashHex -InputText ("queue|" + $key)
  $queueRecord = [ordered]@{
    queue_id = ("followup-" + $hash.Substring(0, 16))
    queued_at = $now.ToString('o')
    queue_state = 'queued'
    source = 'retention_cadence_followup_scheduler'
    followup_key = $key
    reason_code = [string]$candidate.reason_code
    checkpoint_state = [string]$candidate.checkpoint_state
    lane_id = [string]$candidate.lane_id
    lane_risk = [string]$candidate.lane_risk
    priority = [int]$candidate.priority
    due_at = [string]$candidate.due_at
    note = [string]$candidate.note
  }
  if ($candidate.Contains('sample_due_at') -and $null -ne $candidate['sample_due_at']) {
    $queueRecord.sample_due_at = [string]$candidate['sample_due_at']
  }

  Append-JsonLine -Path $QueueFile -Object $queueRecord
  $pendingKeys[$key] = $true
  $emitted += $queueRecord
  $eventRecords += [ordered]@{
    event_id = ('event-' + (Get-HashHex -InputText ("emit|" + $key + "|" + $now.ToUnixTimeMilliseconds())))
    event_type = 'retention_followup_scheduler'
    event_state = 'followup_enqueued'
    happened_at = $now.ToString('o')
    queue_id = [string]$queueRecord.queue_id
    followup_key = $key
    reason_code = [string]$candidate.reason_code
    checkpoint_state = [string]$candidate.checkpoint_state
  }
}

foreach ($evt in $eventRecords) {
  Append-JsonLine -Path $EventsFile -Object $evt
}

$criticalCount = @($findings | Where-Object { $_.severity -eq 'critical' }).Count
$schedulerState = 'ready'
$recommendedAction = 'retain_standard_schedule'
if ($criticalCount -gt 0) {
  $schedulerState = 'escalation_required'
  $recommendedAction = 'rebuild_adoption_checkpoint_and_retry_scheduler'
}
elseif (@($emitted).Count -gt 0 -or @($candidates).Count -gt 0) {
  $schedulerState = 'attention_required'
  $recommendedAction = 'work_scheduled_followups_and_refresh_cadence_evidence'
}

$report = [ordered]@{
  scheduled_at = $now.ToString('o')
  repo_root = $RepoRoot
  adoption_checkpoint_file = $AdoptionCheckpointFile
  queue_file = $QueueFile
  events_file = $EventsFile
  overdue_grace_minutes = $OverdueGraceMinutes
  scheduler_state = $schedulerState
  recommended_action = $recommendedAction
  candidate_count = @($candidates).Count
  emitted_count = @($emitted).Count
  skipped_existing_count = @($skippedExisting).Count
  emitted_followups = $emitted
  skipped_existing_followups = $skippedExisting
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "scheduled_at=$($report.scheduled_at)"
  "scheduler_state=$schedulerState"
  "recommended_action=$recommendedAction"
  "candidate_count=$($report.candidate_count)"
  "emitted_count=$($report.emitted_count)"
  "skipped_existing_count=$($report.skipped_existing_count)"
  "finding_count=$(@($findings).Count)"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
