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

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-operator-handoff-closeout-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Handoff-Closeout.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Operator-Handoff-Closeout.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Operator-Handoff-Closeout.ps1'
  $rehearsalFile = Join-Path $testQueue 'escalation-rehearsal.json'
  $reportFile = Join-Path $testQueue 'closeout.json'

  $attentionRehearsal = [ordered]@{
    rehearsed_at = [DateTimeOffset]::Now.ToString('o')
    rehearsal = [ordered]@{
      rehearsal_state = 'attention_required'
      escalation_severity = 'elevated'
      action_code = 'schedule_followup_closure_review_and_acknowledge_warning'
      operator_ack_required = $true
    }
  }
  $attentionRehearsal | ConvertTo-Json -Depth 8 | Set-Content -Path $rehearsalFile -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -EscalationRehearsalFile $rehearsalFile -OutputFile $reportFile -LaneId lane-attention | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'attention scenario failed'
  $attentionReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ($attentionReport.closeout_state -eq 'ready') 'attention scenario should close out as ready'
  Assert-True ([bool]$attentionReport.escalation_summary.operator_ack_required) 'attention scenario should preserve ack requirement'
  Assert-True (@($attentionReport.operator_examples.safe).Count -eq 2) 'safe examples count mismatch'
  Assert-True (@($attentionReport.operator_examples.refused).Count -eq 2) 'refused examples count mismatch'

  $criticalRehearsal = [ordered]@{
    rehearsed_at = [DateTimeOffset]::Now.ToString('o')
    rehearsal = [ordered]@{
      rehearsal_state = 'escalation_required'
      escalation_severity = 'critical'
      action_code = 'trigger_operator_escalation_and_open_immediate_followup_packet'
      operator_ack_required = $true
    }
  }
  $criticalRehearsal | ConvertTo-Json -Depth 8 | Set-Content -Path $rehearsalFile -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -EscalationRehearsalFile $rehearsalFile -OutputFile $reportFile -LaneId lane-critical | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'critical scenario failed'
  $criticalReport = Get-Content -Path $reportFile -Raw | ConvertFrom-Json
  Assert-True ($criticalReport.closeout_state -eq 'attention_required') 'critical scenario should remain attention_required for operator handoff'
  Assert-True ($criticalReport.recommended_action -eq 'operator_ack_and_followup_packet_required') 'critical scenario recommended action mismatch'
  Assert-True ($criticalReport.local_only_note -like '*does not authorize runtime mutation*') 'local-only safeguard wording missing'

  Write-Host 'PASS: Flow Trigger Suite retention cadence operator handoff closeout checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
