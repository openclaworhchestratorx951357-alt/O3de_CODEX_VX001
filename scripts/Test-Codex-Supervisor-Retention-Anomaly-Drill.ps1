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

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-anomaly-drill-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Checkpoint.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Checkpoint.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Anomaly-Drill.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Anomaly-Drill.ps1') -Force

  $drillScript = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Anomaly-Drill.ps1'
  $outFile = Join-Path $testQueue 'codex-supervisor-retention-anomaly-drill.json'
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $drillScript -RepoRoot $testRepo -OutputFile $outFile
  Assert-True ($LASTEXITCODE -eq 0) 'anomaly drill script failed'
  Assert-True (Test-Path $outFile) 'anomaly drill output missing'

  $report = Get-Content -Path $outFile -Raw | ConvertFrom-Json
  Assert-True ([bool]$report.pass) 'anomaly drill reported failure'
  Assert-True ((@($report.scenarios).Count) -eq 3) 'expected 3 anomaly drill scenarios'

  $ready = @($report.scenarios | Where-Object { $_.scenario -eq 'ready-baseline' })[0]
  $attention = @($report.scenarios | Where-Object { $_.scenario -eq 'attention-trim-warning' })[0]
  $escalation = @($report.scenarios | Where-Object { $_.scenario -eq 'escalation-trim-critical' })[0]

  Assert-True ($ready.actual_state -eq 'ready') 'ready scenario should resolve to ready'
  Assert-True ($attention.actual_state -eq 'attention_required') 'attention scenario should resolve to attention_required'
  Assert-True ($escalation.actual_state -eq 'escalation_required') 'escalation scenario should resolve to escalation_required'
  Assert-True (($escalation.exit_code -ne 0)) 'escalation scenario should exit non-zero when FailOnEscalation is used'

  Assert-True ($report.operator_triage.ready -eq 'retain_standard_schedule') 'ready triage guidance mismatch'
  Assert-True ($report.operator_triage.attention_required -eq 'schedule_followup_audit_and_review_archive_growth') 'attention triage guidance mismatch'
  Assert-True ($report.operator_triage.escalation_required -eq 'run_apply_with_operator_ack_and_open_followup_packet') 'escalation triage guidance mismatch'

  Write-Host 'PASS: Flow Trigger Suite retention anomaly drill checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
