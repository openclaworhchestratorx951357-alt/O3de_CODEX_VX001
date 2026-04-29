param(
  [string]$RepoRoot = '',
  [switch]$KeepTemp
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if (-not $Condition) {
    throw "ASSERT FAILED: $Message"
  }
}

function Add-QueueRecord {
  param(
    [string]$Path,
    $Record
  )
  $json = $Record | ConvertTo-Json -Depth 10 -Compress
  Add-Content -Path $Path -Value $json
}

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-followup-exec-drill-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Followup-Execution-Drill.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Followup-Execution-Drill.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Followup-Execution-Drill.ps1'
  $queueFile = Join-Path $testQueue 'codex-supervisor-packet-queue.jsonl'
  $eventsFile = Join-Path $testQueue 'codex-supervisor-packet-events.jsonl'
  $reportFile = Join-Path $testQueue 'execution-drill.json'

  $now = [DateTimeOffset]::Now
  Add-QueueRecord -Path $queueFile -Record ([ordered]@{
    queue_id = 'followup-a'
    queued_at = $now.AddMinutes(-30).ToString('o')
    queue_state = 'queued'
    source = 'retention_cadence_followup_scheduler'
    followup_key = 'state_coverage_missing|escalation_required'
    reason_code = 'state_coverage_missing'
    checkpoint_state = 'escalation_required'
    lane_id = 'lane-a'
    lane_risk = 'medium'
    priority = 2
    due_at = $now.AddMinutes(-5).ToString('o')
  })
  Add-QueueRecord -Path $queueFile -Record ([ordered]@{
    queue_id = 'followup-b'
    queued_at = $now.AddMinutes(-20).ToString('o')
    queue_state = 'queued'
    source = 'retention_cadence_followup_scheduler'
    followup_key = 'state_evidence_overdue|ready|lane-b|low'
    reason_code = 'state_evidence_overdue'
    checkpoint_state = 'ready'
    lane_id = 'lane-b'
    lane_risk = 'low'
    priority = 1
    due_at = $now.AddMinutes(-2).ToString('o')
  })
  Add-QueueRecord -Path $queueFile -Record ([ordered]@{
    queue_id = 'unrelated-c'
    queued_at = $now.AddMinutes(-10).ToString('o')
    queue_state = 'queued'
    source = 'other_source'
    followup_key = 'other|key'
    reason_code = 'other'
    checkpoint_state = 'ready'
    lane_id = 'lane-c'
    lane_risk = 'low'
    priority = 3
    due_at = $now.AddMinutes(10).ToString('o')
  })

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -QueueFile $queueFile -EventsFile $eventsFile -OutputFile $reportFile -MaxItems 2 | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'execution drill run failed'

  $report = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ([int]$report.processed_count -eq 2) 'execution drill should process two followups'
  Assert-True ([int]$report.completed_count -eq 1) 'execution drill should mark one followup completed'
  Assert-True ([int]$report.cancelled_count -eq 1) 'execution drill should mark one followup cancelled'
  Assert-True ([int]$report.open_followups_before -eq 2) 'open followups before should be two'
  Assert-True ([int]$report.open_followups_after -eq 0) 'open followups after should be zero'

  $eventLines = @((Get-Content -Path $eventsFile) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }).Count
  Assert-True ($eventLines -eq 2) 'execution drill should append two events'

  # A second run with no queued followups should process zero and request scheduler refresh.
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -QueueFile $queueFile -EventsFile $eventsFile -OutputFile $reportFile -MaxItems 2 | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'second execution drill run failed'
  $secondReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ([int]$secondReport.processed_count -eq 0) 'second run should process zero followups'
  Assert-True ($secondReport.drill_state -eq 'attention_required') 'second run should request scheduler refresh'

  Write-Host 'PASS: Flow Trigger Suite retention cadence follow-up execution drill checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
