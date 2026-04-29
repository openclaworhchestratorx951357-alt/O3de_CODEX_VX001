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

function Add-JsonLine {
  param(
    [string]$Path,
    $Object
  )
  $json = $Object | ConvertTo-Json -Depth 10 -Compress
  Add-Content -Path $Path -Value $json
}

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-closure-checkpoint-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Closure-Checkpoint.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Closure-Checkpoint.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Closure-Checkpoint.ps1'
  $drillFile = Join-Path $testQueue 'codex-supervisor-retention-cadence-followup-execution-drill.json'
  $queueFile = Join-Path $testQueue 'codex-supervisor-packet-queue.jsonl'
  $reportFile = Join-Path $testQueue 'closure-checkpoint.json'

  $now = [DateTimeOffset]::Now
  $drillReady = [ordered]@{
    drilled_at = $now.ToString('o')
    processed_count = 2
    completed_count = 1
    cancelled_count = 1
  }
  $drillReady | ConvertTo-Json -Depth 8 | Set-Content -Path $drillFile -Encoding UTF8

  Add-JsonLine -Path $queueFile -Object ([ordered]@{
    queue_id = 'followup-a'
    queued_at = $now.AddMinutes(-10).ToString('o')
    queue_state = 'completed'
    source = 'retention_cadence_followup_scheduler'
    followup_key = 'state_coverage_missing|attention_required'
  })
  Add-JsonLine -Path $queueFile -Object ([ordered]@{
    queue_id = 'followup-b'
    queued_at = $now.AddMinutes(-9).ToString('o')
    queue_state = 'cancelled'
    source = 'retention_cadence_followup_scheduler'
    followup_key = 'state_evidence_overdue|ready|lane-a|low'
  })

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -ExecutionDrillFile $drillFile -QueueFile $queueFile -OutputFile $reportFile | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'ready closure checkpoint run failed'
  $readyReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ($readyReport.checkpoint_state -eq 'ready') 'ready scenario should be ready'
  Assert-True ([double]$readyReport.closure_ratio -eq 1.0) 'ready scenario closure_ratio should be 1.0'
  Assert-True ([int]$readyReport.open_followup_count -eq 0) 'ready scenario open followups should be 0'

  # Warning scenario: one stale open followup above warning age threshold.
  Add-JsonLine -Path $queueFile -Object ([ordered]@{
    queue_id = 'followup-c'
    queued_at = $now.AddMinutes(-130).ToString('o')
    queue_state = 'queued'
    source = 'retention_cadence_followup_scheduler'
    followup_key = 'state_coverage_missing|escalation_required'
  })

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -ExecutionDrillFile $drillFile -QueueFile $queueFile -OutputFile $reportFile -WarnOpenAgeMinutes 120 -CriticalOpenAgeMinutes 360 -WarnOpenFollowups 3 -CriticalOpenFollowups 8 | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'warning closure checkpoint run failed'
  $warnReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ($warnReport.checkpoint_state -eq 'attention_required') 'warning scenario should be attention_required'
  Assert-True ([int]$warnReport.open_followup_count -eq 1) 'warning scenario should have one open followup'

  # Critical scenario: stale age beyond critical threshold and critical open count.
  for ($i = 1; $i -le 8; $i++) {
    Add-JsonLine -Path $queueFile -Object ([ordered]@{
      queue_id = "followup-critical-$i"
      queued_at = $now.AddMinutes(-500).ToString('o')
      queue_state = 'queued'
      source = 'retention_cadence_followup_scheduler'
      followup_key = "critical|$i"
    })
  }

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -ExecutionDrillFile $drillFile -QueueFile $queueFile -OutputFile $reportFile -WarnOpenAgeMinutes 120 -CriticalOpenAgeMinutes 360 -WarnOpenFollowups 3 -CriticalOpenFollowups 8 | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'critical closure checkpoint run failed'
  $criticalReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ($criticalReport.checkpoint_state -eq 'escalation_required') 'critical scenario should be escalation_required'
  Assert-True ([int]$criticalReport.open_followup_count -ge 8) 'critical scenario should have open followups above critical threshold'

  Write-Host 'PASS: Flow Trigger Suite retention cadence closure checkpoint checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
