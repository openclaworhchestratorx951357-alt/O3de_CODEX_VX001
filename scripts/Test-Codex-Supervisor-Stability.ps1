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

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}

$sourceScripts = @(
  'Invoke-Codex-Supervisor-Packet.ps1',
  'codex_supervisor_packet.txt'
)

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-stability-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  foreach ($name in $sourceScripts) {
    Copy-Item -LiteralPath (Join-Path $RepoRoot ("scripts\" + $name)) -Destination (Join-Path $testScripts $name) -Force
  }

  $instructionPath = Join-Path $testScripts 'instruction-safe.txt'
  Set-Content -Path $instructionPath -Encoding UTF8 -Value 'Use supervisor mode, proceed with stability audit packet and move to next slice.'

  $now = [DateTimeOffset]::Now
  @(
    "$($now.AddMinutes(-4).ToString('o')) | COMPLETE packet=stability-seed",
    "$($now.AddMinutes(-2).ToString('o')) | STARTUP-READY packet=stability-seed-next"
  ) | Set-Content -Path (Join-Path $testQueue 'codex-slice-log.txt') -Encoding UTF8

  $invokeScript = Join-Path $testScripts 'Invoke-Codex-Supervisor-Packet.ps1'
  $baseArgs = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $invokeScript,
    '-RepoRoot', $testRepo,
    '-InstructionFile', $instructionPath,
    '-PacketRisk', 'medium',
    '-NoDispatch',
    '-Force'
  )

  & powershell.exe @($baseArgs + @('-LaneId','lane-alpha','-SourcePacketId','s1-alpha-ack','-OperatorAcknowledged'))
  Assert-True ($LASTEXITCODE -eq 0) 's1 failed'

  & powershell.exe @($baseArgs + @('-LaneId','lane-beta','-SourcePacketId','s2-beta-ack','-OperatorAcknowledged'))
  Assert-True ($LASTEXITCODE -eq 0) 's2 failed'

  & powershell.exe @($baseArgs + @('-LaneId','lane-alpha','-SourcePacketId','s3-alpha-ack','-OperatorAcknowledged'))
  Assert-True ($LASTEXITCODE -eq 0) 's3 failed'

  $claimPath = Join-Path $testQueue 'codex-supervisor-packet-claim-lane-beta.json'
  $claim = [ordered]@{
    claim_id = [Guid]::NewGuid().ToString()
    lane_id = 'lane-beta'
    pid = $PID
    started_at = [DateTimeOffset]::Now.ToString('o')
    source_packet_id = 'seed-claim'
    queue_entry_id = 'seed-claim'
  }
  $claim | ConvertTo-Json | Set-Content -Path $claimPath -Encoding UTF8

  & powershell.exe @($baseArgs + @('-LaneId','lane-beta','-SourcePacketId','s4-beta-claim-block','-OperatorAcknowledged'))
  Assert-True ($LASTEXITCODE -eq 0) 's4 failed'

  Remove-Item -LiteralPath $claimPath -Force -ErrorAction SilentlyContinue

  & powershell.exe @($baseArgs + @('-LaneId','lane-beta','-SourcePacketId','s5-beta-ack','-OperatorAcknowledged'))
  Assert-True ($LASTEXITCODE -eq 0) 's5 failed'

  $events = Read-JsonLines -Path (Join-Path $testQueue 'codex-supervisor-packet-events.jsonl')
  $queue = Read-JsonLines -Path (Join-Path $testQueue 'codex-supervisor-packet-queue.jsonl')
  $state = Get-Content -Path (Join-Path $testQueue 'codex-supervisor-packet-state.json') -Raw | ConvertFrom-Json

  Assert-True ($events.Count -eq 5) "Expected 5 events, got $($events.Count)"
  Assert-True ($queue.Count -eq 5) "Expected 5 queue entries, got $($queue.Count)"

  $bySource = @{}
  foreach ($e in $events) {
    $bySource[[string]$e.source_packet_id] = $e
  }

  Assert-True ($bySource['s1-alpha-ack'].dispatch_result -eq 'dispatched') 's1 expected dispatched'
  Assert-True ($bySource['s2-beta-ack'].dispatch_result -eq 'dispatched') 's2 expected dispatched'
  Assert-True ($bySource['s3-alpha-ack'].dispatch_result -eq 'dispatched') 's3 expected dispatched'
  Assert-True ($bySource['s4-beta-claim-block'].dispatch_result -eq 'queued') 's4 expected queued'
  Assert-True ($bySource['s4-beta-claim-block'].stop_reason_code -eq 'claim_active_blocked') 's4 expected claim_active_blocked'
  Assert-True ($bySource['s5-beta-ack'].dispatch_result -eq 'dispatched') 's5 expected dispatched'

  $alphaEvents = @($events | Where-Object { $_.lane_id -eq 'lane-alpha' })
  $betaEvents = @($events | Where-Object { $_.lane_id -eq 'lane-beta' })
  Assert-True ($alphaEvents.Count -eq 2) "Expected 2 alpha events, got $($alphaEvents.Count)"
  Assert-True ($betaEvents.Count -eq 3) "Expected 3 beta events, got $($betaEvents.Count)"

  $dispatchedCount = @($events | Where-Object { $_.dispatch_result -eq 'dispatched' }).Count
  Assert-True ($dispatchedCount -eq 4) "Expected 4 dispatched events, got $dispatchedCount"
  Assert-True ([int]$state.send_count -eq 4) "Expected send_count=4, got $($state.send_count)"
  Assert-True ([int]$state.sends_since_checkpoint -eq 1) "Expected sends_since_checkpoint=1, got $($state.sends_since_checkpoint)"

  Write-Host 'PASS: Flow Trigger Suite stability audit checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
