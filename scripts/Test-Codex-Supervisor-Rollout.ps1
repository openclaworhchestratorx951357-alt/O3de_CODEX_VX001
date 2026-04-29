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

$sourceScripts = @(
  'Invoke-Codex-Supervisor-Packet.ps1',
  'Invoke-Codex-Supervisor-Rollout.ps1',
  'Codex-Supervisor-Rollout-Profiles.json',
  'codex_supervisor_packet.txt'
)

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-rollout-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  foreach ($name in $sourceScripts) {
    Copy-Item -LiteralPath (Join-Path $RepoRoot ("scripts\" + $name)) -Destination (Join-Path $testScripts $name) -Force
  }

  $now = [DateTimeOffset]::Now
  @(
    "$($now.AddMinutes(-3).ToString('o')) | COMPLETE packet=rollout-seed",
    "$($now.AddMinutes(-1).ToString('o')) | STARTUP-READY packet=rollout-seed-next"
  ) | Set-Content -Path (Join-Path $testQueue 'codex-slice-log.txt') -Encoding UTF8

  $rolloutScript = Join-Path $testScripts 'Invoke-Codex-Supervisor-Rollout.ps1'
  $lane = 'rollout-test'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $rolloutScript -RepoRoot $testRepo -Profile standard -LaneId $lane -SourcePacketId 'rollout-no-ack' -NoDispatch -Force
  $noAckExit = $LASTEXITCODE
  Assert-True ($noAckExit -ne 0) 'standard profile without -OperatorAcknowledged should fail'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $rolloutScript -RepoRoot $testRepo -Profile standard -LaneId $lane -SourcePacketId 'rollout-ack' -OperatorAcknowledged -NoDispatch -Force
  Assert-True ($LASTEXITCODE -eq 0) 'standard profile with -OperatorAcknowledged should pass'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $rolloutScript -RepoRoot $testRepo -Profile docs_low_risk -LaneId $lane -SourcePacketId 'rollout-docs' -NoDispatch -Force
  Assert-True ($LASTEXITCODE -eq 0) 'docs_low_risk profile should pass without acknowledgment'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $rolloutScript -RepoRoot $testRepo -Profile docs_low_risk -LaneId $lane -SourcePacketId 'rollout-locked' -ExplicitLockedScopeApproval -NoDispatch -Force
  $lockedExit = $LASTEXITCODE
  Assert-True ($lockedExit -ne 0) 'docs_low_risk profile should reject explicit locked-scope approval'

  Write-Host 'PASS: Flow Trigger Suite rollout profile checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
