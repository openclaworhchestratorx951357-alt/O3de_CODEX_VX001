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

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-frozen-lifecycle-handoff-checkpoint-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Handoff-Checkpoint.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Handoff-Checkpoint.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Handoff-Checkpoint.ps1'
  $reportPath = Join-Path $testQueue 'frozen-handoff-checkpoint.json'
  $freezePath = Join-Path $testQueue 'codex-supervisor-retention-cadence-governance-lifecycle-freeze.json'

  $readyFreeze = [ordered]@{
    freeze_state = 'ready'
    lifecycle_summary = [ordered]@{
      stage_count = 6
      present_stage_count = 6
      missing_stage_count = 0
    }
  } | ConvertTo-Json -Depth 5
  Set-Content -Path $freezePath -Value $readyFreeze -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $reportPath -FreezeReportPath $freezePath | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'ready-freeze scenario failed'
  $readyReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($readyReport.handoff_state -eq 'ready') 'ready-freeze scenario should be ready'
  Assert-True ($readyReport.lifecycle_freeze_state -eq 'ready') 'ready-freeze state should remain ready'
  Assert-True ($readyReport.canonical_maintenance_entrypoint -eq 'scripts/Invoke-Codex-Supervisor-Retention-Cadence-Governance-Lifecycle-Freeze.ps1') 'canonical entrypoint mismatch'

  Remove-Item -LiteralPath $freezePath -Force
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $reportPath -FreezeReportPath $freezePath | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'missing-freeze scenario failed'
  $missingReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($missingReport.handoff_state -eq 'attention_required') 'missing-freeze scenario should be attention_required'
  Assert-True ($missingReport.lifecycle_freeze_state -eq 'missing') 'missing-freeze scenario should mark missing lifecycle freeze state'

  Write-Host 'PASS: Flow Trigger Suite retention cadence frozen lifecycle handoff checkpoint checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
