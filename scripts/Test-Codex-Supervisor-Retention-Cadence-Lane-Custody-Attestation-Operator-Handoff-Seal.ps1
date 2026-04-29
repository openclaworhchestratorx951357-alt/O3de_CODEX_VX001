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

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-lane-custody-attestation-operator-handoff-seal-test-" + [Guid]::NewGuid().ToString())
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
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Evidence-Operator-Launch-Profile.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Startup-Evidence-Operator-Launch-Profile.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Launch-Profile-Handoff-Manifest.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Operator-Launch-Profile-Handoff-Manifest.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Manifest-Startup-Lane-Profile.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Manifest-Startup-Lane-Profile.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Lane-Profile-Adoption-Checkpoint.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Startup-Lane-Profile-Adoption-Checkpoint.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Lane-Profile-Adoption-Handoff-Bundle.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Startup-Lane-Profile-Adoption-Handoff-Bundle.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Lane-Bundle-Continuity-Checkpoint.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Startup-Lane-Bundle-Continuity-Checkpoint.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Continuity-Checkpoint-Handoff-Digest.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Continuity-Checkpoint-Handoff-Digest.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Digest-Readiness-Ledger.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Digest-Readiness-Ledger.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Readiness-Ledger-Handoff-Seal.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Readiness-Ledger-Handoff-Seal.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Seal-Continuity-Register.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Seal-Continuity-Register.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Continuity-Register-Handoff-Index.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Continuity-Register-Handoff-Index.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Index-Launch-Playbook.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Index-Launch-Playbook.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Launch-Playbook-Execution-Checklist.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Launch-Playbook-Execution-Checklist.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Execution-Checklist-Evidence-Handoff-Digest.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Execution-Checklist-Evidence-Handoff-Digest.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Digest-Publication-Seal.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Digest-Publication-Seal.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Publication-Seal-Continuity-Attestation.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Publication-Seal-Continuity-Attestation.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Continuity-Attestation-Closeout-Ledger.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Continuity-Attestation-Closeout-Ledger.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Closeout-Ledger-Archival-Manifest.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Closeout-Ledger-Archival-Manifest.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Archival-Manifest-Handoff-Warrant.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Archival-Manifest-Handoff-Warrant.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Warrant-Operator-Dispatch-Bundle.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Warrant-Operator-Dispatch-Bundle.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Dispatch-Bundle-Execution-Receipt.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Operator-Dispatch-Bundle-Execution-Receipt.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Execution-Receipt-Operator-Continuity-Attestation.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Execution-Receipt-Operator-Continuity-Attestation.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Continuity-Attestation-Dispatch-Readiness-Seal.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Operator-Continuity-Attestation-Dispatch-Readiness-Seal.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Dispatch-Readiness-Seal-Operator-Runbook-Attestation.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Dispatch-Readiness-Seal-Operator-Runbook-Attestation.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Runbook-Attestation-Lane-Launch-Readiness-Warrant.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Operator-Runbook-Attestation-Lane-Launch-Readiness-Warrant.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Lane-Launch-Readiness-Warrant-Operator-Activation-Receipt.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Lane-Launch-Readiness-Warrant-Operator-Activation-Receipt.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Activation-Receipt-Lane-Continuity-Warrant.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Operator-Activation-Receipt-Lane-Continuity-Warrant.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Lane-Continuity-Warrant-Operator-Stewardship-Receipt.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Lane-Continuity-Warrant-Operator-Stewardship-Receipt.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Stewardship-Receipt-Lane-Custody-Attestation.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Operator-Stewardship-Receipt-Lane-Custody-Attestation.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Lane-Custody-Attestation-Operator-Handoff-Seal.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Lane-Custody-Attestation-Operator-Handoff-Seal.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Lane-Custody-Attestation-Operator-Handoff-Seal.ps1'
  $reportPath = Join-Path $testQueue 'lane-custody-attestation-operator-handoff-seal.json'

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

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $reportPath -OperatorAcknowledged | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'acknowledged scenario failed'
  $readyReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($readyReport.operator_handoff_seal_state -eq 'ready') 'acknowledged scenario should be ready'
  Assert-True ([bool]$readyReport.operator_handoff_seal_complete) 'acknowledged scenario stewardship_receipt_complete should be true'
  Assert-True ([bool]$readyReport.operator_acknowledged) 'acknowledged scenario should record operator acknowledgment'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $reportPath | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'non-acknowledged scenario failed'
  $attentionReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($attentionReport.operator_handoff_seal_state -eq 'attention_required') 'non-acknowledged scenario should be attention_required'
  Assert-True (-not [bool]$attentionReport.operator_handoff_seal_complete) 'non-acknowledged scenario stewardship_receipt_complete should be false'
  Assert-True (-not [bool]$attentionReport.operator_acknowledged) 'non-acknowledged scenario should record missing acknowledgment'

  Write-Host 'PASS: Flow Trigger Suite retention cadence lane custody attestation operator handoff seal checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}



