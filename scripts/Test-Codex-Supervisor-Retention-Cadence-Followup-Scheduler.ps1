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

function Set-HandoffFile {
  param(
    [string]$Path,
    [string]$LaneId,
    [string]$LaneRisk,
    [string]$State,
    [datetimeoffset]$DueAt
  )
  $handoff = [ordered]@{
    generated_at = [DateTimeOffset]::Now.ToString('o')
    lane_id = $LaneId
    lane_risk = $LaneRisk
    checkpoint_state = $State
    handoff_action = 'retain_standard_schedule'
    operator_ack_required = $false
    cadence = [ordered]@{
      base_hours = 24
      effective_hours = 24
      next_audit_due_at = $DueAt.ToString('o')
    }
    shift_handoff_template = [ordered]@{
      required_fields = @('lane_id','lane_risk','checkpoint_state','handoff_action','operator_ack_required','next_audit_due_at','top_findings','owner')
      top_findings = @()
    }
  }
  $handoff | ConvertTo-Json -Depth 8 | Set-Content -Path $Path -Encoding UTF8
}

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-followup-scheduler-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Followup-Scheduler.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Followup-Scheduler.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Followup-Scheduler.ps1'
  $checkpointPath = Join-Path $testQueue 'codex-supervisor-retention-cadence-adoption-checkpoint.json'
  $queueFile = Join-Path $testQueue 'codex-supervisor-packet-queue.jsonl'
  $eventsFile = Join-Path $testQueue 'codex-supervisor-packet-events.jsonl'
  $reportFile = Join-Path $testQueue 'scheduler-report.json'

  # Scenario 1: full coverage and no overdue evidence => ready, no emissions.
  $readyHandoff = Join-Path $testQueue 'handoff-ready.json'
  $attentionHandoff = Join-Path $testQueue 'handoff-attention.json'
  $escalationHandoff = Join-Path $testQueue 'handoff-escalation.json'
  $futureDue = [DateTimeOffset]::Now.AddHours(3)
  Set-HandoffFile -Path $readyHandoff -LaneId 'lane-ready' -LaneRisk 'low' -State 'ready' -DueAt $futureDue
  Set-HandoffFile -Path $attentionHandoff -LaneId 'lane-attention' -LaneRisk 'medium' -State 'attention_required' -DueAt $futureDue
  Set-HandoffFile -Path $escalationHandoff -LaneId 'lane-escalation' -LaneRisk 'high' -State 'escalation_required' -DueAt $futureDue

  $checkpointReady = [ordered]@{
    checkpointed_at = [DateTimeOffset]::Now.ToString('o')
    adoption_state = 'ready'
    missing_states = @()
    examples_by_state = [ordered]@{
      ready = [ordered]@{ lane_id='lane-ready'; lane_risk='low'; generated_at=[DateTimeOffset]::Now.ToString('o'); source_file=$readyHandoff }
      attention_required = [ordered]@{ lane_id='lane-attention'; lane_risk='medium'; generated_at=[DateTimeOffset]::Now.ToString('o'); source_file=$attentionHandoff }
      escalation_required = [ordered]@{ lane_id='lane-escalation'; lane_risk='high'; generated_at=[DateTimeOffset]::Now.ToString('o'); source_file=$escalationHandoff }
    }
  }
  $checkpointReady | ConvertTo-Json -Depth 8 | Set-Content -Path $checkpointPath -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -AdoptionCheckpointFile $checkpointPath -QueueFile $queueFile -EventsFile $eventsFile -OutputFile $reportFile | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'ready scheduler run failed'
  $readyReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ($readyReport.scheduler_state -eq 'ready') 'ready scenario scheduler_state should be ready'
  Assert-True ([int]$readyReport.emitted_count -eq 0) 'ready scenario should emit zero followups'

  # Scenario 2: missing escalation coverage + overdue ready evidence => two emissions.
  $pastDue = [DateTimeOffset]::Now.AddHours(-2)
  Set-HandoffFile -Path $readyHandoff -LaneId 'lane-ready' -LaneRisk 'low' -State 'ready' -DueAt $pastDue

  $checkpointAttention = [ordered]@{
    checkpointed_at = [DateTimeOffset]::Now.ToString('o')
    adoption_state = 'attention_required'
    missing_states = @('escalation_required')
    examples_by_state = [ordered]@{
      ready = [ordered]@{ lane_id='lane-ready'; lane_risk='low'; generated_at=[DateTimeOffset]::Now.ToString('o'); source_file=$readyHandoff }
      attention_required = [ordered]@{ lane_id='lane-attention'; lane_risk='medium'; generated_at=[DateTimeOffset]::Now.ToString('o'); source_file=$attentionHandoff }
      escalation_required = $null
    }
  }
  $checkpointAttention | ConvertTo-Json -Depth 8 | Set-Content -Path $checkpointPath -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -AdoptionCheckpointFile $checkpointPath -QueueFile $queueFile -EventsFile $eventsFile -OutputFile $reportFile | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'attention scheduler run failed'
  $attentionReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ($attentionReport.scheduler_state -eq 'attention_required') 'attention scenario scheduler_state should be attention_required'
  Assert-True ([int]$attentionReport.emitted_count -eq 2) 'attention scenario should emit two followups'

  $queueLinesAfterFirstEmit = @((Get-Content -Path $queueFile) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }).Count

  # Scenario 3: same checkpoint run again should dedupe and emit zero new queue records.
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -AdoptionCheckpointFile $checkpointPath -QueueFile $queueFile -EventsFile $eventsFile -OutputFile $reportFile | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'dedupe scheduler run failed'
  $dedupeReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ([int]$dedupeReport.emitted_count -eq 0) 'dedupe run should emit zero followups'
  Assert-True ([int]$dedupeReport.skipped_existing_count -eq 2) 'dedupe run should skip two existing followups'

  $queueLinesAfterSecondEmit = @((Get-Content -Path $queueFile) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }).Count
  Assert-True ($queueLinesAfterSecondEmit -eq $queueLinesAfterFirstEmit) 'queue line count should remain stable after dedupe run'

  Write-Host 'PASS: Flow Trigger Suite retention cadence follow-up scheduler checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
