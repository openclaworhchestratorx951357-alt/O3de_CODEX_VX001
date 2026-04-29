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

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-maintenance-automation-handoff-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Maintenance-Automation-Handoff.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Maintenance-Automation-Handoff.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Maintenance-Automation-Handoff.ps1'
  $maintenancePath = Join-Path $testQueue 'maintenance-cadence.json'
  $reportPath = Join-Path $testQueue 'maintenance-handoff.json'

  $readyMaintenance = [ordered]@{
    evaluated_at = [DateTimeOffset]::Now.ToString('o')
    maintenance_state = 'ready'
    next_audit_due_at = [DateTimeOffset]::Now.AddDays(6).ToString('o')
    recommended_action = 'maintain_current_governance_cadence'
    refresh_packet_required = $false
  }
  $readyMaintenance | ConvertTo-Json -Depth 8 | Set-Content -Path $maintenancePath -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -MaintenanceCadenceFile $maintenancePath -OutputFile $reportPath -LaneId lane-ready | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'ready scenario failed'
  $readyReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($readyReport.handoff_state -eq 'ready') 'ready scenario should remain ready'
  Assert-True (@($readyReport.reminders).Count -eq 3) 'ready reminder count mismatch'
  Assert-True (@($readyReport.checklist).Count -eq 4) 'ready checklist count mismatch'

  $attentionMaintenance = [ordered]@{
    evaluated_at = [DateTimeOffset]::Now.ToString('o')
    maintenance_state = 'attention_required'
    next_audit_due_at = [DateTimeOffset]::Now.AddHours(-1).ToString('o')
    recommended_action = 'open_governance_refresh_packet_for_stale_closeout'
    refresh_packet_required = $true
  }
  $attentionMaintenance | ConvertTo-Json -Depth 8 | Set-Content -Path $maintenancePath -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -MaintenanceCadenceFile $maintenancePath -OutputFile $reportPath -LaneId lane-attention | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'attention scenario failed'
  $attentionReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($attentionReport.handoff_state -eq 'attention_required') 'attention scenario should be attention_required'
  Assert-True ([bool]$attentionReport.maintenance_summary.refresh_packet_required) 'attention scenario should preserve refresh trigger'
  Assert-True (@($attentionReport.escalation_replay_steps).Count -eq 4) 'attention replay step count mismatch'

  Write-Host 'PASS: Flow Trigger Suite retention cadence maintenance automation handoff checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
