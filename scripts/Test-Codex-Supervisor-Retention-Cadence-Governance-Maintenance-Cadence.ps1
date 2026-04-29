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

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-governance-maintenance-cadence-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Governance-Maintenance-Cadence.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Governance-Maintenance-Cadence.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Governance-Maintenance-Cadence.ps1'
  $closeoutFile = Join-Path $testQueue 'final-closeout.json'
  $reportFile = Join-Path $testQueue 'maintenance-cadence.json'

  # Ready and fresh scenario.
  $readyCloseout = [ordered]@{
    closed_out_at = [DateTimeOffset]::Now.AddDays(-1).ToString('o')
    closeout_state = 'ready'
    references = @(
      [ordered]@{ path='a'; exists=$true; status='Status: ok' },
      [ordered]@{ path='b'; exists=$true; status='Status: ok' },
      [ordered]@{ path='c'; exists=$true; status='Status: ok' }
    )
  }
  $readyCloseout | ConvertTo-Json -Depth 8 | Set-Content -Path $closeoutFile -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -FinalCloseoutFile $closeoutFile -OutputFile $reportFile | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'ready scenario failed'
  $readyReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ($readyReport.maintenance_state -eq 'ready') 'ready scenario should remain ready'
  Assert-True (-not [bool]$readyReport.refresh_packet_required) 'ready scenario should not require refresh packet'

  # Overdue scenario.
  $overdueCloseout = [ordered]@{
    closed_out_at = [DateTimeOffset]::Now.AddDays(-12).ToString('o')
    closeout_state = 'ready'
    references = @(
      [ordered]@{ path='a'; exists=$true; status='Status: ok' },
      [ordered]@{ path='b'; exists=$true; status='Status: ok' },
      [ordered]@{ path='c'; exists=$true; status='Status: ok' }
    )
  }
  $overdueCloseout | ConvertTo-Json -Depth 8 | Set-Content -Path $closeoutFile -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -FinalCloseoutFile $closeoutFile -OutputFile $reportFile | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'overdue scenario failed'
  $overdueReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ($overdueReport.maintenance_state -eq 'attention_required') 'overdue scenario should be attention_required'
  Assert-True ([bool]$overdueReport.refresh_packet_required) 'overdue scenario should require refresh packet'

  # Missing reference scenario.
  $driftCloseout = [ordered]@{
    closed_out_at = [DateTimeOffset]::Now.AddDays(-1).ToString('o')
    closeout_state = 'ready'
    references = @(
      [ordered]@{ path='a'; exists=$true; status='Status: ok' },
      [ordered]@{ path='b'; exists=$false; status='' },
      [ordered]@{ path='c'; exists=$true; status='Status: ok' }
    )
  }
  $driftCloseout | ConvertTo-Json -Depth 8 | Set-Content -Path $closeoutFile -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -FinalCloseoutFile $closeoutFile -OutputFile $reportFile | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'drift scenario failed'
  $driftReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ($driftReport.maintenance_state -eq 'escalation_required') 'drift scenario should escalate'
  Assert-True ([bool]$driftReport.refresh_packet_required) 'drift scenario should require refresh packet'
  Assert-True ([int]$driftReport.missing_reference_count -eq 1) 'drift scenario missing reference count mismatch'

  Write-Host 'PASS: Flow Trigger Suite retention cadence governance maintenance cadence checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
