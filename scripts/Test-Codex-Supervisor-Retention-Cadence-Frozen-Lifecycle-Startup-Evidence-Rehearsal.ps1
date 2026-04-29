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

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-frozen-lifecycle-startup-evidence-rehearsal-test-" + [Guid]::NewGuid().ToString())
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

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Startup-Evidence-Rehearsal.ps1'
  $reportPath = Join-Path $testQueue 'startup-rehearsal.json'

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
  Assert-True ($LASTEXITCODE -eq 0) 'all-stage scenario failed'
  $readyReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($readyReport.rehearsal_state -eq 'ready') 'all-stage scenario should be ready'
  Assert-True ($readyReport.freeze_state -eq 'ready') 'all-stage scenario freeze_state should be ready'
  Assert-True ($readyReport.handoff_state -eq 'ready') 'all-stage scenario handoff_state should be ready'
  Assert-True ([bool]$readyReport.guidance_preserved_after_handoff_copy) 'all-stage guidance should be preserved'

  Remove-Item -LiteralPath (Join-Path $testDocs 'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-ESCALATION-REHEARSAL.md') -Force
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $reportPath | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'missing-stage scenario failed'
  $attentionReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($attentionReport.rehearsal_state -eq 'attention_required') 'missing-stage scenario should be attention_required'
  Assert-True ($attentionReport.freeze_state -eq 'attention_required') 'missing-stage freeze_state should be attention_required'

  Write-Host 'PASS: Flow Trigger Suite retention cadence frozen lifecycle startup evidence rehearsal checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
