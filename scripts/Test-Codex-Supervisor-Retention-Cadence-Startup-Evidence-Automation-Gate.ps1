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

function Write-Doc {
  param(
    [string]$Path,
    [string]$StatusLine
  )
  @(
    '# Packet'
    ''
    $StatusLine
  ) | Set-Content -Path $Path -Encoding UTF8
}

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-startup-evidence-automation-gate-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testDocs = Join-Path $testRepo 'docs'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testDocs -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Governance-Lifecycle-Freeze.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Governance-Lifecycle-Freeze.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Handoff-Checkpoint.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Handoff-Checkpoint.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Startup-Evidence-Rehearsal.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Startup-Evidence-Rehearsal.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Evidence-Automation-Gate.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Startup-Evidence-Automation-Gate.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Startup-Evidence-Automation-Gate.ps1'
  $reportPath = Join-Path $testQueue 'startup-automation-gate.json'

  $docNames = @(
    'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-CLOSURE-CHECKPOINT.md',
    'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-ESCALATION-REHEARSAL.md',
    'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-OPERATOR-HANDOFF-CLOSEOUT.md',
    'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-FINAL-GOVERNANCE-CLOSEOUT.md',
    'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-GOVERNANCE-MAINTENANCE-CADENCE.md',
    'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-MAINTENANCE-AUTOMATION-HANDOFF.md'
  )

  foreach ($name in $docNames) {
    Write-Doc -Path (Join-Path $testDocs $name) -StatusLine 'Status: lifecycle stage present'
  }

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $reportPath | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'ready scenario failed'
  $readyReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($readyReport.gate_state -eq 'ready') 'ready scenario should be ready'
  Assert-True ([bool]$readyReport.startup_gate_ready) 'ready scenario startup_gate_ready should be true'
  Assert-True ($readyReport.rehearsal_state -eq 'ready') 'ready scenario rehearsal_state should be ready'

  Remove-Item -LiteralPath (Join-Path $testDocs 'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-ESCALATION-REHEARSAL.md') -Force
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $reportPath | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'attention scenario failed'
  $attentionReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($attentionReport.gate_state -eq 'attention_required') 'attention scenario should be attention_required'
  Assert-True (-not [bool]$attentionReport.startup_gate_ready) 'attention scenario startup_gate_ready should be false'
  Assert-True ($attentionReport.rehearsal_state -eq 'attention_required') 'attention scenario rehearsal_state should be attention_required'

  Write-Host 'PASS: Flow Trigger Suite retention cadence startup evidence automation gate checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
