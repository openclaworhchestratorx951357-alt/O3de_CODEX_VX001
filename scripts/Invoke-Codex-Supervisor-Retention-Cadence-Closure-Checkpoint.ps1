param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$ExecutionDrillFile = '',
  [string]$QueueFile = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = '',
  [double]$WarnOpenAgeMinutes = 120,
  [double]$CriticalOpenAgeMinutes = 360,
  [int]$WarnOpenFollowups = 3,
  [int]$CriticalOpenFollowups = 8
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ExecutionDrillFile) {
  $ExecutionDrillFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-followup-execution-drill.json'
}
if (-not $QueueFile) {
  $QueueFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-packet-queue.jsonl'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-closure-checkpoint.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-closure-checkpoint.txt'
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

function Get-LatestQueueState {
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
  return $latestById
}

function Get-OpenFollowups {
  param(
    [hashtable]$LatestById
  )
  $open = @()
  foreach ($record in $LatestById.Values) {
    if ([string]$record.source -ne 'retention_cadence_followup_scheduler') {
      continue
    }
    $state = [string]$record.queue_state
    if ($state -eq 'completed' -or $state -eq 'cancelled') {
      continue
    }
    $open += $record
  }
  return $open
}

function Get-OldestOpenAgeMinutes {
  param(
    [object[]]$Records,
    [datetimeoffset]$Now
  )
  $list = @($Records)
  if (@($list).Count -eq 0) {
    return $null
  }
  $maxAge = 0.0
  foreach ($record in $list) {
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

$drill = Read-JsonFile -Path $ExecutionDrillFile
if ($null -eq $drill) {
  Add-Finding -Severity 'critical' -Code 'execution_drill_missing' -Message "Execution drill report missing or unreadable: $ExecutionDrillFile" -Path $ExecutionDrillFile
}

$queueRecords = Read-JsonLines -Path $QueueFile
if (-not (Test-Path $QueueFile)) {
  Add-Finding -Severity 'critical' -Code 'queue_file_missing' -Message "Queue file missing: $QueueFile" -Path $QueueFile
}

$latestById = Get-LatestQueueState -Records $queueRecords
$openFollowups = Get-OpenFollowups -LatestById $latestById
$openCount = @($openFollowups).Count
$oldestOpenAgeMinutes = Get-OldestOpenAgeMinutes -Records $openFollowups -Now $now

$processedCount = 0
$completedCount = 0
$cancelledCount = 0
if ($null -ne $drill) {
  $processedCount = [int]$drill.processed_count
  $completedCount = [int]$drill.completed_count
  $cancelledCount = [int]$drill.cancelled_count
}

$closureRatio = 0.0
if ($processedCount -gt 0) {
  $closureRatio = [Math]::Round((($completedCount + $cancelledCount) / $processedCount), 4)
}

if ($openCount -ge $CriticalOpenFollowups) {
  Add-Finding -Severity 'critical' -Code 'open_followup_count_critical' -Message "Open followups $openCount >= critical threshold $CriticalOpenFollowups."
}
elseif ($openCount -ge $WarnOpenFollowups) {
  Add-Finding -Severity 'warning' -Code 'open_followup_count_warning' -Message "Open followups $openCount >= warning threshold $WarnOpenFollowups."
}

if ($null -ne $oldestOpenAgeMinutes) {
  if ($oldestOpenAgeMinutes -ge $CriticalOpenAgeMinutes) {
    Add-Finding -Severity 'critical' -Code 'open_followup_age_critical' -Message "Oldest open followup age $oldestOpenAgeMinutes minute(s) >= critical threshold $CriticalOpenAgeMinutes."
  }
  elseif ($oldestOpenAgeMinutes -ge $WarnOpenAgeMinutes) {
    Add-Finding -Severity 'warning' -Code 'open_followup_age_warning' -Message "Oldest open followup age $oldestOpenAgeMinutes minute(s) >= warning threshold $WarnOpenAgeMinutes."
  }
}

$criticalCount = @($findings | Where-Object { $_.severity -eq 'critical' }).Count
$warningCount = @($findings | Where-Object { $_.severity -eq 'warning' }).Count

$checkpointState = 'ready'
$recommendedAction = 'retain_standard_schedule'
if ($criticalCount -gt 0) {
  $checkpointState = 'escalation_required'
  $recommendedAction = 'run_followup_scheduler_and_immediate_lane_escalation'
}
elseif ($warningCount -gt 0 -or $openCount -gt 0) {
  $checkpointState = 'attention_required'
  $recommendedAction = 'close_pending_followups_and_recheck_closure_checkpoint'
}

$report = [ordered]@{
  checkpointed_at = $now.ToString('o')
  repo_root = $RepoRoot
  execution_drill_file = $ExecutionDrillFile
  queue_file = $QueueFile
  threshold = [ordered]@{
    warn_open_age_minutes = $WarnOpenAgeMinutes
    critical_open_age_minutes = $CriticalOpenAgeMinutes
    warn_open_followups = $WarnOpenFollowups
    critical_open_followups = $CriticalOpenFollowups
  }
  checkpoint_state = $checkpointState
  recommended_action = $recommendedAction
  processed_count = $processedCount
  completed_count = $completedCount
  cancelled_count = $cancelledCount
  closure_ratio = $closureRatio
  open_followup_count = $openCount
  oldest_open_followup_age_minutes = $oldestOpenAgeMinutes
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "checkpointed_at=$($report.checkpointed_at)"
  "checkpoint_state=$checkpointState"
  "recommended_action=$recommendedAction"
  "processed_count=$processedCount"
  "closure_ratio=$closureRatio"
  "open_followup_count=$openCount"
  "oldest_open_followup_age_minutes=$oldestOpenAgeMinutes"
  "finding_count=$(@($findings).Count)"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
