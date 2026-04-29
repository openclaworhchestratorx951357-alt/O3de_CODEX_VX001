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

function Get-LineCount {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return 0 }
  $content = Get-Content -Path $Path
  if ($null -eq $content) { return 0 }
  return @($content).Count
}

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-enforcement-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Audit.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Audit.ps1') -Force

  $policyPath = Join-Path $testScripts 'Codex-Supervisor-Retention-Policy.json'
  @'
{
  "retention_policy_version": "verification-test",
  "files": [
    {
      "path": "continue-queue/codex-supervisor-packet-queue.jsonl",
      "max_lines": 4,
      "archive_suffix": ".archive.jsonl"
    },
    {
      "path": "continue-queue/codex-supervisor-packet-events.jsonl",
      "max_lines": 3,
      "archive_suffix": ".archive.jsonl"
    },
    {
      "path": "continue-queue/codex-supervisor-packet.log",
      "max_lines": 5,
      "archive_suffix": ".archive.log"
    }
  ],
  "always_keep": [
    "continue-queue/codex-supervisor-packet-state.json",
    "continue-queue/codex-slice-log.txt"
  ]
}
'@ | Set-Content -Path $policyPath -Encoding UTF8

  $queuePath = Join-Path $testQueue 'codex-supervisor-packet-queue.jsonl'
  $eventsPath = Join-Path $testQueue 'codex-supervisor-packet-events.jsonl'
  $logPath = Join-Path $testQueue 'codex-supervisor-packet.log'
  $statePath = Join-Path $testQueue 'codex-supervisor-packet-state.json'
  $sliceLogPath = Join-Path $testQueue 'codex-slice-log.txt'

  @('q1','q2','q3','q4','q5','q6') | Set-Content -Path $queuePath -Encoding UTF8
  @('e1','e2','e3','e4','e5') | Set-Content -Path $eventsPath -Encoding UTF8
  @('l1','l2','l3','l4','l5','l6','l7') | Set-Content -Path $logPath -Encoding UTF8
  '{"send_count":9}' | Set-Content -Path $statePath -Encoding UTF8
  @('s1','s2','s3') | Set-Content -Path $sliceLogPath -Encoding UTF8

  $preCounts = @{
    queue = Get-LineCount -Path $queuePath
    events = Get-LineCount -Path $eventsPath
    log = Get-LineCount -Path $logPath
    state = Get-LineCount -Path $statePath
    slice = Get-LineCount -Path $sliceLogPath
  }

  $auditScript = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Audit.ps1'
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $auditScript -RepoRoot $testRepo -PolicyFile $policyPath
  Assert-True ($LASTEXITCODE -eq 0) 'audit mode failed'

  $summaryPath = Join-Path $testQueue 'codex-supervisor-retention-audit.json'
  $auditSummary = Get-Content -Path $summaryPath -Raw | ConvertFrom-Json
  Assert-True ($auditSummary.apply_mode -eq $false) 'audit summary expected apply_mode=false'
  Assert-True (([int]$auditSummary.files[0].trim_count) -eq 2) 'queue trim_count expected 2 in audit mode'
  Assert-True (([int]$auditSummary.files[1].trim_count) -eq 2) 'events trim_count expected 2 in audit mode'
  Assert-True (([int]$auditSummary.files[2].trim_count) -eq 2) 'log trim_count expected 2 in audit mode'

  Assert-True ((Get-LineCount -Path $queuePath) -eq $preCounts.queue) 'audit mode should not mutate queue file'
  Assert-True ((Get-LineCount -Path $eventsPath) -eq $preCounts.events) 'audit mode should not mutate events file'
  Assert-True ((Get-LineCount -Path $logPath) -eq $preCounts.log) 'audit mode should not mutate log file'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $auditScript -RepoRoot $testRepo -PolicyFile $policyPath -Apply -ConfirmApply
  Assert-True ($LASTEXITCODE -eq 0) 'apply mode failed'

  $applySummary = Get-Content -Path $summaryPath -Raw | ConvertFrom-Json
  Assert-True ($applySummary.apply_mode -eq $true) 'apply summary expected apply_mode=true'

  Assert-True ((Get-LineCount -Path $queuePath) -eq 4) 'queue should retain newest 4 lines'
  Assert-True ((Get-LineCount -Path $eventsPath) -eq 3) 'events should retain newest 3 lines'
  Assert-True ((Get-LineCount -Path $logPath) -eq 5) 'log should retain newest 5 lines'

  Assert-True ((Get-LineCount -Path ($queuePath + '.archive.jsonl')) -eq 2) 'queue archive should contain trimmed 2 lines'
  Assert-True ((Get-LineCount -Path ($eventsPath + '.archive.jsonl')) -eq 2) 'events archive should contain trimmed 2 lines'
  Assert-True ((Get-LineCount -Path ($logPath + '.archive.log')) -eq 2) 'log archive should contain trimmed 2 lines'

  Assert-True ((Get-LineCount -Path $statePath) -eq $preCounts.state) 'always_keep state file should remain unchanged'
  Assert-True ((Get-LineCount -Path $sliceLogPath) -eq $preCounts.slice) 'always_keep slice log should remain unchanged'

  Write-Host 'PASS: Flow Trigger Suite retention enforcement verification checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
