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

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-test-" + [Guid]::NewGuid().ToString())
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
  "retention_policy_version": "test",
  "files": [
    {
      "path": "continue-queue/codex-supervisor-packet-queue.jsonl",
      "max_lines": 3,
      "archive_suffix": ".archive.jsonl"
    }
  ],
  "always_keep": [
    "continue-queue/codex-supervisor-packet-state.json"
  ]
}
'@ | Set-Content -Path $policyPath -Encoding UTF8

  $target = Join-Path $testQueue 'codex-supervisor-packet-queue.jsonl'
  @('l1','l2','l3','l4','l5') | Set-Content -Path $target -Encoding UTF8

  $auditScript = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Audit.ps1'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $auditScript -RepoRoot $testRepo -PolicyFile $policyPath
  Assert-True ($LASTEXITCODE -eq 0) 'audit mode command failed'

  $auditSummaryPath = Join-Path $testQueue 'codex-supervisor-retention-audit.json'
  $summary = Get-Content -Path $auditSummaryPath -Raw | ConvertFrom-Json
  $entry = $summary.files[0]
  Assert-True ($entry.would_trim -eq $true) 'audit should detect trim needed'
  Assert-True ([int]$entry.trim_count -eq 2) "expected trim_count=2 got $($entry.trim_count)"
  Assert-True ((Get-Content -Path $target).Count -eq 5) 'audit mode should not mutate file'

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $auditScript -RepoRoot $testRepo -PolicyFile $policyPath -Apply -ConfirmApply
  Assert-True ($LASTEXITCODE -eq 0) 'apply mode command failed'

  $trimmed = Get-Content -Path $target
  Assert-True ($trimmed.Count -eq 3) "expected 3 kept lines got $($trimmed.Count)"
  Assert-True ($trimmed[0] -eq 'l3' -and $trimmed[2] -eq 'l5') 'expected oldest lines trimmed'

  $archivePath = $target + '.archive.jsonl'
  $archived = Get-Content -Path $archivePath
  Assert-True ($archived.Count -eq 2) "expected 2 archived lines got $($archived.Count)"
  Assert-True ($archived[0] -eq 'l1' -and $archived[1] -eq 'l2') 'expected first two lines archived'

  Write-Host 'PASS: Flow Trigger Suite retention policy checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
