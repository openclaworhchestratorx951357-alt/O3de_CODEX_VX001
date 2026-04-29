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

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-escalation-rehearsal-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Escalation-Rehearsal.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Escalation-Rehearsal.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Escalation-Rehearsal.ps1'
  $checkpointPath = Join-Path $testQueue 'closure-checkpoint.json'
  $reportPath = Join-Path $testQueue 'escalation-rehearsal.json'

  $readyCheckpoint = [ordered]@{
    checkpointed_at = [DateTimeOffset]::Now.ToString('o')
    checkpoint_state = 'ready'
    closure_ratio = 1.0
    open_followup_count = 0
    oldest_open_followup_age_minutes = $null
  }
  $readyCheckpoint | ConvertTo-Json -Depth 8 | Set-Content -Path $checkpointPath -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -ClosureCheckpointFile $checkpointPath -OutputFile $reportPath -LaneId lane-ready | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'ready scenario failed'
  $readyReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($readyReport.rehearsal.rehearsal_state -eq 'attention_required') 'ready scenario should map to attention_required rehearsal'
  Assert-True ([bool]$readyReport.rehearsal.operator_ack_required) 'ready scenario should require acknowledgment'

  $criticalCheckpoint = [ordered]@{
    checkpointed_at = [DateTimeOffset]::Now.ToString('o')
    checkpoint_state = 'escalation_required'
    closure_ratio = 0.5
    open_followup_count = 9
    oldest_open_followup_age_minutes = 480
  }
  $criticalCheckpoint | ConvertTo-Json -Depth 8 | Set-Content -Path $checkpointPath -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -ClosureCheckpointFile $checkpointPath -OutputFile $reportPath -LaneId lane-critical | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'critical scenario failed'
  $criticalReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($criticalReport.rehearsal.rehearsal_state -eq 'escalation_required') 'critical scenario should map to escalation_required rehearsal'
  Assert-True ($criticalReport.rehearsal.action_code -eq 'trigger_operator_escalation_and_open_immediate_followup_packet') 'critical scenario action should be deterministic'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -ClosureCheckpointFile $checkpointPath -OutputFile $reportPath -RehearsalLevel warning -LaneId lane-forced-warning | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'forced warning scenario failed'
  $forcedWarning = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($forcedWarning.rehearsal.rehearsal_state -eq 'attention_required') 'forced warning should be attention_required'
  Assert-True ($forcedWarning.rehearsal.escalation_severity -eq 'elevated') 'forced warning severity mismatch'

  Write-Host 'PASS: Flow Trigger Suite retention cadence escalation rehearsal checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
