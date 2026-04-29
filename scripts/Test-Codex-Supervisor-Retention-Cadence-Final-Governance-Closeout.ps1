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
    '# Doc'
    ''
    $StatusLine
  ) | Set-Content -Path $Path -Encoding UTF8
}

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-final-governance-closeout-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testDocs = Join-Path $testRepo 'docs'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testDocs -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Final-Governance-Closeout.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Final-Governance-Closeout.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Final-Governance-Closeout.ps1'
  $reportPath = Join-Path $testQueue 'final-closeout.json'

  $closureDoc = Join-Path $testDocs 'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-CLOSURE-CHECKPOINT.md'
  $escalationDoc = Join-Path $testDocs 'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-ESCALATION-REHEARSAL.md'
  $handoffDoc = Join-Path $testDocs 'FLOW-TRIGGER-SUITE-RETENTION-CADENCE-OPERATOR-HANDOFF-CLOSEOUT.md'

  Write-Doc -Path $closureDoc -StatusLine 'Status: closure checkpoint complete'
  Write-Doc -Path $escalationDoc -StatusLine 'Status: escalation rehearsal complete'
  Write-Doc -Path $handoffDoc -StatusLine 'Status: operator handoff closeout complete'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $reportPath | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'all-reference scenario failed'
  $readyReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($readyReport.closeout_state -eq 'ready') 'all-reference scenario should be ready'
  Assert-True (@($readyReport.references).Count -eq 3) 'all-reference scenario should list 3 references'
  Assert-True (@($readyReport.findings).Count -eq 0) 'all-reference scenario should have no findings'

  Remove-Item -LiteralPath $escalationDoc -Force
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $reportPath | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'missing-reference scenario failed'
  $attentionReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($attentionReport.closeout_state -eq 'attention_required') 'missing-reference scenario should be attention_required'
  Assert-True (@($attentionReport.findings).Count -ge 1) 'missing-reference scenario should emit findings'

  Write-Host 'PASS: Flow Trigger Suite retention cadence final governance closeout checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
