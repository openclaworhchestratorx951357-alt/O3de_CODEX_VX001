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

function Read-JsonLines {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return @() }
  $rows = @()
  foreach ($line in Get-Content -Path $Path) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $rows += ($line | ConvertFrom-Json)
  }
  return $rows
}

function Invoke-Launcher {
  param(
    [string]$InvokeScriptPath,
    [string]$TestRepoRoot,
    [string]$InstructionFile,
    [string]$SourcePacketId,
    [string]$LaneId,
    [string]$PacketRisk = 'medium',
    [switch]$OperatorAcknowledged,
    [switch]$ExplicitLockedScopeApproval
  )

  $args = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $InvokeScriptPath,
    '-RepoRoot', $TestRepoRoot,
    '-InstructionFile', $InstructionFile,
    '-SourcePacketId', $SourcePacketId,
    '-LaneId', $LaneId,
    '-PacketRisk', $PacketRisk,
    '-NoDispatch',
    '-Force'
  )
  if ($OperatorAcknowledged) { $args += '-OperatorAcknowledged' }
  if ($ExplicitLockedScopeApproval) { $args += '-ExplicitLockedScopeApproval' }

  & powershell.exe @args
  $exitCode = $LASTEXITCODE
  Assert-True ($exitCode -eq 0) "Launcher exited with code $exitCode"
}

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}

$invokeScript = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Packet.ps1'
Assert-True (Test-Path $invokeScript) "Missing invoke script at $invokeScript"

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-packet-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  $instructionSafe = Join-Path $testScripts 'instruction-safe.txt'
  $instructionRuntime = Join-Path $testScripts 'instruction-runtime.txt'
  $instructionLocked = Join-Path $testScripts 'instruction-locked.txt'

  Set-Content -Path $instructionSafe -Encoding UTF8 -Value 'Use supervisor mode, proceed with the validation packet and move to next slice.'
  Set-Content -Path $instructionRuntime -Encoding UTF8 -Value 'Use supervisor mode, proceed with packet and run provider execution now.'
  Set-Content -Path $instructionLocked -Encoding UTF8 -Value 'Use supervisor mode, include AGENTS.md edit in this packet.'

  $now = [DateTimeOffset]::Now
  $sliceLog = @(
    "$($now.AddMinutes(-4).ToString('o')) | COMPLETE packet=test-seed",
    "$($now.AddMinutes(-2).ToString('o')) | STARTUP-READY packet=test-seed-next"
  )
  $sliceLog | Set-Content -Path (Join-Path $testQueue 'codex-slice-log.txt') -Encoding UTF8

  $lane = 'test-lane'
  Invoke-Launcher -InvokeScriptPath $invokeScript -TestRepoRoot $testRepo -InstructionFile $instructionSafe -SourcePacketId 't1-ack-allow' -LaneId $lane -OperatorAcknowledged
  Invoke-Launcher -InvokeScriptPath $invokeScript -TestRepoRoot $testRepo -InstructionFile $instructionSafe -SourcePacketId 't2-overdue' -LaneId $lane
  Invoke-Launcher -InvokeScriptPath $invokeScript -TestRepoRoot $testRepo -InstructionFile $instructionRuntime -SourcePacketId 't3-runtime-block' -LaneId $lane
  Invoke-Launcher -InvokeScriptPath $invokeScript -TestRepoRoot $testRepo -InstructionFile $instructionLocked -SourcePacketId 't4-locked-block' -LaneId $lane

  $claimPath = Join-Path $testQueue 'codex-supervisor-packet-claim-test-lane.json'
  $claim = [ordered]@{
    claim_id = [Guid]::NewGuid().ToString()
    lane_id = $lane
    pid = $PID
    started_at = [DateTimeOffset]::Now.ToString('o')
    source_packet_id = 'claim-seed'
    queue_entry_id = 'claim-seed'
  }
  $claim | ConvertTo-Json | Set-Content -Path $claimPath -Encoding UTF8
  Invoke-Launcher -InvokeScriptPath $invokeScript -TestRepoRoot $testRepo -InstructionFile $instructionSafe -SourcePacketId 't5-claim-active' -LaneId $lane

  $eventsPath = Join-Path $testQueue 'codex-supervisor-packet-events.jsonl'
  $queuePath = Join-Path $testQueue 'codex-supervisor-packet-queue.jsonl'
  $statePath = Join-Path $testQueue 'codex-supervisor-packet-state.json'

  $events = Read-JsonLines -Path $eventsPath
  $queue = Read-JsonLines -Path $queuePath
  $state = Get-Content -Path $statePath -Raw | ConvertFrom-Json

  Assert-True ($events.Count -eq 5) "Expected 5 events, got $($events.Count)"
  Assert-True ($queue.Count -eq 5) "Expected 5 queue entries, got $($queue.Count)"

  $eventByPacket = @{}
  foreach ($e in $events) {
    $eventByPacket[[string]$e.source_packet_id] = $e
    foreach ($field in @('event_id','event_timestamp_iso','source_packet_id','branch_hint','queue_entry_id','claim_id','dispatch_attempted','dispatch_result','checkpoint_state','stop_reason_code','stop_reason_detail','operator_acknowledged')) {
      Assert-True (($e.PSObject.Properties.Name -contains $field)) "Missing field '$field' in event $($e.source_packet_id)"
    }
  }

  Assert-True ($eventByPacket['t1-ack-allow'].final_recommendation_state -eq 'allow_dispatch') 't1 expected allow_dispatch'
  Assert-True ($eventByPacket['t1-ack-allow'].dispatch_result -eq 'dispatched') 't1 expected dispatched'
  Assert-True ($eventByPacket['t2-overdue'].stop_reason_code -eq 'checkpoint_overdue_packet_count') 't2 expected checkpoint_overdue_packet_count'
  Assert-True ($eventByPacket['t2-overdue'].final_recommendation_state -eq 'checkpoint_required') 't2 expected checkpoint_required'
  Assert-True ($eventByPacket['t3-runtime-block'].stop_reason_code -eq 'runtime_broadening_blocked') 't3 expected runtime_broadening_blocked'
  Assert-True ($eventByPacket['t3-runtime-block'].final_recommendation_state -eq 'operator_decision_required') 't3 expected operator_decision_required'
  Assert-True ($eventByPacket['t4-locked-block'].stop_reason_code -eq 'operator_locked_scope_blocked') 't4 expected operator_locked_scope_blocked'
  Assert-True ($eventByPacket['t5-claim-active'].stop_reason_code -eq 'claim_active_blocked') 't5 expected claim_active_blocked'
  Assert-True ($eventByPacket['t5-claim-active'].final_recommendation_state -eq 'queue_only') 't5 expected queue_only'
  Assert-True ($eventByPacket['t5-claim-active'].dispatch_result -eq 'queued') 't5 expected queued dispatch result'

  Assert-True ([int]$state.send_count -eq 1) "Expected send_count=1, got $($state.send_count)"
  Assert-True ([int]$state.sends_since_checkpoint -eq 1) "Expected sends_since_checkpoint=1, got $($state.sends_since_checkpoint)"

  Write-Host "PASS: Flow Trigger Suite validation checks (5 scenarios)." -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
