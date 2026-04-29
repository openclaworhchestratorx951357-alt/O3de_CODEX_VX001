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

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-handoff-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Handoff.ps1') -Force

  $scriptPath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Handoff.ps1'
  $checkpointPath = Join-Path $testQueue 'codex-supervisor-retention-operations-checkpoint.json'
  $outputJsonPath = Join-Path $testQueue 'cadence-handoff.json'
  $outputTextPath = Join-Path $testQueue 'cadence-handoff.txt'

  function Run-Scenario {
    param(
      [string]$Name,
      [string]$State,
      [string]$Risk
    )

    $checkpoint = [ordered]@{
      checkpointed_at = [DateTimeOffset]::Now.ToString('o')
      checkpoint_state = $State
      recommended_action = if ($State -eq 'ready') { 'retain_standard_schedule' } elseif ($State -eq 'attention_required') { 'schedule_followup_audit_and_review_archive_growth' } else { 'run_apply_with_operator_ack_and_open_followup_packet' }
      findings = if ($State -eq 'ready') { @() } elseif ($State -eq 'attention_required') { @([ordered]@{ severity='warning'; code='trim_count_warning'; message='warning sample' }) } else { @([ordered]@{ severity='critical'; code='trim_count_critical'; message='critical sample' }) }
    }
    $checkpoint | ConvertTo-Json -Depth 6 | Set-Content -Path $checkpointPath -Encoding UTF8

    & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $scriptPath -RepoRoot $testRepo -LaneRisk $Risk -CheckpointFile $checkpointPath -OutputFile $outputJsonPath -OutputTextFile $outputTextPath -LaneId $Name | Out-Null
    Assert-True ($LASTEXITCODE -eq 0) "$Name scenario failed"

    $handoff = Get-Content -Path $outputJsonPath -Raw | ConvertFrom-Json
    return $handoff
  }

  $ready = Run-Scenario -Name 'lane-ready' -State 'ready' -Risk 'low'
  Assert-True ($ready.checkpoint_state -eq 'ready') 'ready scenario checkpoint mismatch'
  Assert-True ($ready.handoff_action -eq 'retain_standard_schedule') 'ready scenario action mismatch'
  Assert-True ([int]$ready.cadence.effective_hours -eq 24) 'ready low-risk cadence should be 24h'
  Assert-True (-not [bool]$ready.operator_ack_required) 'ready scenario should not require ack'

  $attention = Run-Scenario -Name 'lane-attention' -State 'attention_required' -Risk 'medium'
  Assert-True ($attention.checkpoint_state -eq 'attention_required') 'attention scenario checkpoint mismatch'
  Assert-True ($attention.handoff_action -eq 'schedule_followup_audit_and_review_archive_growth') 'attention scenario action mismatch'
  Assert-True ([int]$attention.cadence.effective_hours -eq 6) 'attention medium-risk cadence should be halved to 6h'
  Assert-True ([bool]$attention.operator_ack_required) 'attention scenario should require ack'

  $escalation = Run-Scenario -Name 'lane-escalation' -State 'escalation_required' -Risk 'high'
  Assert-True ($escalation.checkpoint_state -eq 'escalation_required') 'escalation scenario checkpoint mismatch'
  Assert-True ($escalation.handoff_action -eq 'run_apply_with_operator_ack_and_open_followup_packet') 'escalation scenario action mismatch'
  Assert-True ([int]$escalation.cadence.effective_hours -eq 1) 'escalation cadence should be 1h'
  Assert-True ([bool]$escalation.operator_ack_required) 'escalation scenario should require ack'

  $textLines = Get-Content -Path $outputTextPath
  Assert-True (@($textLines | Where-Object { $_ -like 'lane_risk=high' }).Count -eq 1) 'text handoff should include lane risk line'
  Assert-True (@($textLines | Where-Object { $_ -like 'checkpoint_state=escalation_required' }).Count -eq 1) 'text handoff should include checkpoint state line'

  Write-Host 'PASS: Flow Trigger Suite retention cadence handoff checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
