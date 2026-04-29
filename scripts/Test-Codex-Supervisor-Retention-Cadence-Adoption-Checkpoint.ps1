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

function Write-SampleHandoff {
  param(
    [string]$Path,
    [string]$LaneId,
    [string]$LaneRisk,
    [string]$State
  )

  $action = switch ($State) {
    'ready' { 'retain_standard_schedule' }
    'attention_required' { 'schedule_followup_audit_and_review_archive_growth' }
    'escalation_required' { 'run_apply_with_operator_ack_and_open_followup_packet' }
    default { 'retain_standard_schedule' }
  }

  $effectiveHours = switch ($State) {
    'ready' { 24 }
    'attention_required' { 12 }
    'escalation_required' { 1 }
    default { 24 }
  }

  $sample = [ordered]@{
    generated_at = [DateTimeOffset]::Now.ToString('o')
    lane_id = $LaneId
    lane_risk = $LaneRisk
    checkpoint_state = $State
    handoff_action = $action
    operator_ack_required = ($State -ne 'ready')
    cadence = [ordered]@{
      base_hours = 24
      effective_hours = $effectiveHours
      next_audit_due_at = [DateTimeOffset]::Now.AddHours($effectiveHours).ToString('o')
    }
    shift_handoff_template = [ordered]@{
      required_fields = @(
        'lane_id',
        'lane_risk',
        'checkpoint_state',
        'handoff_action',
        'operator_ack_required',
        'next_audit_due_at',
        'top_findings',
        'owner'
      )
      top_findings = @()
    }
  }

  $sample | ConvertTo-Json -Depth 8 | Set-Content -Path $Path -Encoding UTF8
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-cadence-adoption-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Adoption-Checkpoint.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Adoption-Checkpoint.ps1') -Force

  $invokePath = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Cadence-Adoption-Checkpoint.ps1'
  $outputPath = Join-Path $testQueue 'adoption-checkpoint.json'

  Write-SampleHandoff -Path (Join-Path $testQueue 'codex-supervisor-retention-cadence-handoff-ready.json') -LaneId 'lane-a' -LaneRisk 'low' -State 'ready'
  Write-SampleHandoff -Path (Join-Path $testQueue 'codex-supervisor-retention-cadence-handoff-attention.json') -LaneId 'lane-b' -LaneRisk 'medium' -State 'attention_required'
  Write-SampleHandoff -Path (Join-Path $testQueue 'codex-supervisor-retention-cadence-handoff-escalation.json') -LaneId 'lane-c' -LaneRisk 'high' -State 'escalation_required'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $outputPath | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'all-states scenario failed'

  $readyReport = Get-Content -Path $outputPath -Raw | ConvertFrom-Json
  Assert-True ($readyReport.adoption_state -eq 'ready') 'all-states scenario should be ready'
  Assert-True ([int]$readyReport.state_coverage.ready -eq 1) 'ready state coverage should be 1'
  Assert-True ([int]$readyReport.state_coverage.attention_required -eq 1) 'attention state coverage should be 1'
  Assert-True ([int]$readyReport.state_coverage.escalation_required -eq 1) 'escalation state coverage should be 1'

  Remove-Item -LiteralPath (Join-Path $testQueue 'codex-supervisor-retention-cadence-handoff-escalation.json') -Force
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $invokePath -RepoRoot $testRepo -OutputFile $outputPath | Out-Null
  Assert-True ($LASTEXITCODE -eq 0) 'missing-state scenario failed'

  $attentionReport = Get-Content -Path $outputPath -Raw | ConvertFrom-Json
  Assert-True ($attentionReport.adoption_state -eq 'attention_required') 'missing-state scenario should be attention_required'
  Assert-True (@($attentionReport.missing_states | Where-Object { $_ -eq 'escalation_required' }).Count -eq 1) 'missing-state scenario should report escalation_required gap'

  Write-Host 'PASS: Flow Trigger Suite retention cadence adoption checkpoint checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
