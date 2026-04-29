param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$PolicyFile = '',
  [string]$AuditSummaryFile = '',
  [int]$MaxAuditAgeHours = 24,
  [int]$WarnTrimLines = 250,
  [int]$CriticalTrimLines = 1000,
  [int]$WarnArchiveGrowthLines = 500,
  [int]$CriticalArchiveGrowthLines = 2000,
  [switch]$FailOnEscalation
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-LineCount {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return 0 }
  $content = Get-Content -Path $Path
  if ($null -eq $content) { return 0 }
  return @($content).Count
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

if (-not $PolicyFile) {
  $PolicyFile = Join-Path $RepoRoot 'scripts\Codex-Supervisor-Retention-Policy.json'
}
if (-not $AuditSummaryFile) {
  $AuditSummaryFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-audit.json'
}

if (-not (Test-Path $PolicyFile)) {
  throw "Policy file not found: $PolicyFile"
}

$policy = Get-Content -Path $PolicyFile -Raw | ConvertFrom-Json
if (-not $policy.files) {
  throw "Retention policy has no files list: $PolicyFile"
}

$findings = @()
$auditLoaded = $false
$auditAgeHours = $null
$auditedAt = $null
$auditByPath = @{}

if (Test-Path $AuditSummaryFile) {
  $audit = Get-Content -Path $AuditSummaryFile -Raw | ConvertFrom-Json
  $auditLoaded = $true

  if ($audit.files) {
    foreach ($entry in $audit.files) {
      $auditByPath[[string]$entry.path] = $entry
    }
  }

  try {
    $auditedAt = [DateTimeOffset]::Parse([string]$audit.audited_at)
    $auditAgeHours = [Math]::Round(([DateTimeOffset]::Now - $auditedAt).TotalHours, 2)
  }
  catch {
    Add-Finding -Severity 'critical' -Code 'audit_timestamp_invalid' -Message 'Retention audit timestamp could not be parsed.'
  }
}
else {
  Add-Finding -Severity 'critical' -Code 'audit_summary_missing' -Message "Retention audit summary missing: $AuditSummaryFile"
}

if ($auditLoaded -and $null -ne $auditAgeHours -and $auditAgeHours -gt $MaxAuditAgeHours) {
  Add-Finding -Severity 'critical' -Code 'audit_stale' -Message "Retention audit age is $auditAgeHours hour(s), exceeding $MaxAuditAgeHours hour(s)."
}

$statePath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-checkpoint-state.json'
$previousState = $null
if (Test-Path $statePath) {
  $previousState = Get-Content -Path $statePath -Raw | ConvertFrom-Json
}

$details = @()
foreach ($entry in $policy.files) {
  $relativePath = [string]$entry.path
  $maxLines = [int]$entry.max_lines
  $archiveSuffix = [string]$entry.archive_suffix
  $fullPath = Join-Path $RepoRoot $relativePath
  $archivePath = $fullPath + $archiveSuffix

  $activeLines = Get-LineCount -Path $fullPath
  $archiveLines = Get-LineCount -Path $archivePath

  $trimCount = 0
  if ($auditByPath.ContainsKey($relativePath)) {
    $trimCount = [int]$auditByPath[$relativePath].trim_count
  }
  else {
    Add-Finding -Severity 'warning' -Code 'audit_entry_missing' -Message "Audit summary has no entry for $relativePath" -Path $relativePath
  }

  $archiveDelta = $null
  if ($null -ne $previousState -and $previousState.archive_line_counts) {
    $prevValue = $previousState.archive_line_counts.PSObject.Properties[$relativePath]
    if ($null -ne $prevValue) {
      $archiveDelta = $archiveLines - [int]$prevValue.Value
    }
  }

  if ($trimCount -ge $CriticalTrimLines) {
    Add-Finding -Severity 'critical' -Code 'trim_count_critical' -Message "Trim recommendation $trimCount >= critical threshold $CriticalTrimLines." -Path $relativePath
  }
  elseif ($trimCount -ge $WarnTrimLines) {
    Add-Finding -Severity 'warning' -Code 'trim_count_warning' -Message "Trim recommendation $trimCount >= warning threshold $WarnTrimLines." -Path $relativePath
  }

  if ($null -ne $archiveDelta) {
    if ($archiveDelta -ge $CriticalArchiveGrowthLines) {
      Add-Finding -Severity 'critical' -Code 'archive_growth_critical' -Message "Archive growth $archiveDelta lines >= critical threshold $CriticalArchiveGrowthLines." -Path $relativePath
    }
    elseif ($archiveDelta -ge $WarnArchiveGrowthLines) {
      Add-Finding -Severity 'warning' -Code 'archive_growth_warning' -Message "Archive growth $archiveDelta lines >= warning threshold $WarnArchiveGrowthLines." -Path $relativePath
    }
  }

  $details += [ordered]@{
    path = $relativePath
    max_lines = $maxLines
    active_lines = $activeLines
    archive_lines = $archiveLines
    trim_count = $trimCount
    archive_delta_lines = $archiveDelta
    archive_path = $archivePath
  }
}

$hasCritical = @($findings | Where-Object { $_.severity -eq 'critical' }).Count -gt 0
$hasWarning = @($findings | Where-Object { $_.severity -eq 'warning' }).Count -gt 0

$checkpointState = 'ready'
$recommendedAction = 'retain_standard_schedule'
if ($hasCritical) {
  $checkpointState = 'escalation_required'
  $recommendedAction = 'run_apply_with_operator_ack_and_open_followup_packet'
}
elseif ($hasWarning) {
  $checkpointState = 'attention_required'
  $recommendedAction = 'schedule_followup_audit_and_review_archive_growth'
}

$now = [DateTimeOffset]::Now
$nextAuditDueAt = $now.AddHours($MaxAuditAgeHours).ToString('o')
$report = [ordered]@{
  checkpointed_at = $now.ToString('o')
  repo_root = $RepoRoot
  policy_file = $PolicyFile
  audit_summary_file = $AuditSummaryFile
  audit_loaded = $auditLoaded
  audit_age_hours = $auditAgeHours
  max_audit_age_hours = $MaxAuditAgeHours
  threshold = [ordered]@{
    warn_trim_lines = $WarnTrimLines
    critical_trim_lines = $CriticalTrimLines
    warn_archive_growth_lines = $WarnArchiveGrowthLines
    critical_archive_growth_lines = $CriticalArchiveGrowthLines
  }
  checkpoint_state = $checkpointState
  recommended_action = $recommendedAction
  next_audit_due_at = $nextAuditDueAt
  findings = $findings
  files = $details
}

$reportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-operations-checkpoint.json'
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $reportPath -Encoding UTF8

$state = [ordered]@{
  updated_at = $now.ToString('o')
  checkpoint_state = $checkpointState
  archive_line_counts = @{}
}
foreach ($item in $details) {
  $state.archive_line_counts[$item.path] = [int]$item.archive_lines
}
$state | ConvertTo-Json -Depth 6 | Set-Content -Path $statePath -Encoding UTF8

Write-Host ($report | ConvertTo-Json -Depth 8)

if ($FailOnEscalation -and $checkpointState -eq 'escalation_required') {
  throw 'Retention operations checkpoint requires escalation.'
}
