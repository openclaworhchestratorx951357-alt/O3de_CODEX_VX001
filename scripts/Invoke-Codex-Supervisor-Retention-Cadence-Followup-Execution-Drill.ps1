param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$QueueFile = '',
  [string]$EventsFile = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = '',
  [int]$MaxItems = 2
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $QueueFile) {
  $QueueFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-packet-queue.jsonl'
}
if (-not $EventsFile) {
  $EventsFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-packet-events.jsonl'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-followup-execution-drill.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-followup-execution-drill.txt'
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

function Get-OpenFollowups {
  param(
    [object[]]$Records
  )
  $latestById = @{}
  foreach ($record in $Records) {
    $id = [string]$record.queue_id
    if ([string]::IsNullOrWhiteSpace($id)) {
      continue
    }
    $latestById[$id] = $record
  }
  $open = @()
  foreach ($value in $latestById.Values) {
    if ([string]$value.source -ne 'retention_cadence_followup_scheduler') {
      continue
    }
    $state = [string]$value.queue_state
    if ($state -eq 'completed' -or $state -eq 'cancelled') {
      continue
    }
    $open += $value
  }
  return $open
}

function Get-OldestAgeMinutes {
  param(
    [object[]]$Records,
    [datetimeoffset]$Now
  )
  $recordList = New-Object System.Collections.ArrayList
  foreach ($item in @($Records)) {
    [void]$recordList.Add($item)
  }
  if ($recordList.Count -eq 0) {
    return $null
  }
  $maxAge = 0.0
  foreach ($record in $recordList) {
    $queuedAtText = [string]$record.queued_at
    if ([string]::IsNullOrWhiteSpace($queuedAtText)) {
      continue
    }
    try {
      $queuedAt = [DateTimeOffset]::Parse($queuedAtText)
      $age = ($Now - $queuedAt).TotalMinutes
      if ($age -gt $maxAge) {
        $maxAge = $age
      }
    }
    catch {
      continue
    }
  }
  return [Math]::Round($maxAge, 2)
}

$findings = @()
$now = [DateTimeOffset]::Now

$allRecords = @()
if (Test-Path $QueueFile) {
  $allRecords = Read-JsonLines -Path $QueueFile
}
else {
  Add-Finding -Severity 'warning' -Code 'queue_file_missing' -Message "Queue file not found: $QueueFile" -Path $QueueFile
}

$openBefore = Get-OpenFollowups -Records $allRecords
$oldestOpenAgeMinutesBefore = Get-OldestAgeMinutes -Records $openBefore -Now $now

$candidate = @($openBefore | Sort-Object queued_at | Select-Object -First $MaxItems)

$transitions = @()
$events = @()
$index = 0
foreach ($record in $candidate) {
  $index += 1
  $newState = if (($index % 2) -eq 1) { 'completed' } else { 'cancelled' }
  $resolutionCode = if ($newState -eq 'completed') { 'drill_completed_path' } else { 'drill_cancelled_path' }
  $queueId = [string]$record.queue_id

  $transition = [ordered]@{
    queue_id = $queueId
    queued_at = [string]$record.queued_at
    queue_state = $newState
    source = [string]$record.source
    followup_key = [string]$record.followup_key
    reason_code = [string]$record.reason_code
    checkpoint_state = [string]$record.checkpoint_state
    lane_id = [string]$record.lane_id
    lane_risk = [string]$record.lane_risk
    priority = [int]$record.priority
    due_at = [string]$record.due_at
    resolved_at = $now.ToString('o')
    resolution_code = $resolutionCode
    resolution_note = 'retention_cadence_followup_execution_drill'
  }
  Append-JsonLine -Path $QueueFile -Object $transition
  $transitions += $transition

  $eventState = if ($newState -eq 'completed') { 'followup_completed' } else { 'followup_cancelled' }
  $events += [ordered]@{
    event_id = ('event-' + (Get-HashHex -InputText ("exec|" + $queueId + "|" + $newState + "|" + $now.ToUnixTimeMilliseconds())))
    event_type = 'retention_followup_execution_drill'
    event_state = $eventState
    happened_at = $now.ToString('o')
    queue_id = $queueId
    followup_key = [string]$record.followup_key
    reason_code = [string]$record.reason_code
    checkpoint_state = [string]$record.checkpoint_state
    lane_id = [string]$record.lane_id
    lane_risk = [string]$record.lane_risk
  }
}

foreach ($evt in $events) {
  Append-JsonLine -Path $EventsFile -Object $evt
}

$allAfter = Read-JsonLines -Path $QueueFile
$openAfter = Get-OpenFollowups -Records $allAfter
$oldestOpenAgeMinutesAfter = Get-OldestAgeMinutes -Records $openAfter -Now $now

$completedCount = @($transitions | Where-Object { $_.queue_state -eq 'completed' }).Count
$cancelledCount = @($transitions | Where-Object { $_.queue_state -eq 'cancelled' }).Count

$drillState = 'ready'
$recommendedAction = 'retain_standard_schedule'
if (@($transitions).Count -eq 0) {
  $drillState = 'attention_required'
  $recommendedAction = 'run_followup_scheduler_or_reduce_drill_filters'
}

$report = [ordered]@{
  drilled_at = $now.ToString('o')
  repo_root = $RepoRoot
  queue_file = $QueueFile
  events_file = $EventsFile
  max_items = $MaxItems
  drill_state = $drillState
  recommended_action = $recommendedAction
  open_followups_before = @($openBefore).Count
  open_followups_after = @($openAfter).Count
  oldest_open_age_minutes_before = $oldestOpenAgeMinutesBefore
  oldest_open_age_minutes_after = $oldestOpenAgeMinutesAfter
  processed_count = @($transitions).Count
  completed_count = $completedCount
  cancelled_count = $cancelledCount
  transitions = $transitions
  events_emitted = $events
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "drilled_at=$($report.drilled_at)"
  "drill_state=$($report.drill_state)"
  "recommended_action=$($report.recommended_action)"
  "open_followups_before=$($report.open_followups_before)"
  "open_followups_after=$($report.open_followups_after)"
  "processed_count=$($report.processed_count)"
  "completed_count=$($report.completed_count)"
  "cancelled_count=$($report.cancelled_count)"
  "oldest_open_age_minutes_before=$($report.oldest_open_age_minutes_before)"
  "oldest_open_age_minutes_after=$($report.oldest_open_age_minutes_after)"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
