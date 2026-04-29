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

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-ops-checkpoint-test-" + [Guid]::NewGuid().ToString())
$testRepo = Join-Path $tempRoot 'repo'
$testScripts = Join-Path $testRepo 'scripts'
$testQueue = Join-Path $testRepo 'continue-queue'
New-Item -ItemType Directory -Path $testScripts -Force | Out-Null
New-Item -ItemType Directory -Path $testQueue -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Checkpoint.ps1') -Destination (Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Checkpoint.ps1') -Force

  $policyPath = Join-Path $testScripts 'Codex-Supervisor-Retention-Policy.json'
  @'
{
  "retention_policy_version": "ops-checkpoint-test",
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
    }
  ],
  "always_keep": [
    "continue-queue/codex-supervisor-packet-state.json"
  ]
}
'@ | Set-Content -Path $policyPath -Encoding UTF8

  $queuePath = Join-Path $testQueue 'codex-supervisor-packet-queue.jsonl'
  $eventsPath = Join-Path $testQueue 'codex-supervisor-packet-events.jsonl'
  $queueArchive = $queuePath + '.archive.jsonl'
  $eventsArchive = $eventsPath + '.archive.jsonl'
  @('q1','q2','q3','q4') | Set-Content -Path $queuePath -Encoding UTF8
  @('e1','e2','e3') | Set-Content -Path $eventsPath -Encoding UTF8
  @('qa1','qa2') | Set-Content -Path $queueArchive -Encoding UTF8
  @('ea1') | Set-Content -Path $eventsArchive -Encoding UTF8

  $auditPath = Join-Path $testQueue 'codex-supervisor-retention-audit.json'
  $freshAudit = [ordered]@{
    audited_at = [DateTimeOffset]::Now.ToString('o')
    repo_root = $testRepo
    policy_file = $policyPath
    apply_mode = $false
    always_keep = @('continue-queue/codex-supervisor-packet-state.json')
    files = @(
      [ordered]@{
        path = 'continue-queue/codex-supervisor-packet-queue.jsonl'
        exists = $true
        line_count = 4
        max_lines = 4
        would_trim = $false
        trim_count = 0
        archive_path = $queueArchive
        applied = $false
      },
      [ordered]@{
        path = 'continue-queue/codex-supervisor-packet-events.jsonl'
        exists = $true
        line_count = 3
        max_lines = 3
        would_trim = $false
        trim_count = 0
        archive_path = $eventsArchive
        applied = $false
      }
    )
  }
  $freshAudit | ConvertTo-Json -Depth 6 | Set-Content -Path $auditPath -Encoding UTF8

  $checkpointScript = Join-Path $testScripts 'Invoke-Codex-Supervisor-Retention-Checkpoint.ps1'
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $checkpointScript -RepoRoot $testRepo -PolicyFile $policyPath -AuditSummaryFile $auditPath
  Assert-True ($LASTEXITCODE -eq 0) 'initial checkpoint run failed'

  $reportPath = Join-Path $testQueue 'codex-supervisor-retention-operations-checkpoint.json'
  $statePath = Join-Path $testQueue 'codex-supervisor-retention-checkpoint-state.json'
  $report = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($report.checkpoint_state -eq 'ready') 'fresh audit should be ready'
  Assert-True ((@($report.findings).Count) -eq 0) 'fresh audit should have no findings'
  Assert-True (Test-Path $statePath) 'state snapshot should be written'

  # Simulate archive growth and aggressive trim recommendations for escalation.
  @('qa3','qa4','qa5','qa6','qa7','qa8','qa9') | Add-Content -Path $queueArchive -Encoding UTF8
  @('ea2','ea3','ea4','ea5') | Add-Content -Path $eventsArchive -Encoding UTF8

  $escalateAudit = [ordered]@{
    audited_at = [DateTimeOffset]::Now.ToString('o')
    repo_root = $testRepo
    policy_file = $policyPath
    apply_mode = $false
    always_keep = @('continue-queue/codex-supervisor-packet-state.json')
    files = @(
      [ordered]@{
        path = 'continue-queue/codex-supervisor-packet-queue.jsonl'
        exists = $true
        line_count = 10
        max_lines = 4
        would_trim = $true
        trim_count = 6
        archive_path = $queueArchive
        applied = $false
      },
      [ordered]@{
        path = 'continue-queue/codex-supervisor-packet-events.jsonl'
        exists = $true
        line_count = 8
        max_lines = 3
        would_trim = $true
        trim_count = 5
        archive_path = $eventsArchive
        applied = $false
      }
    )
  }
  $escalateAudit | ConvertTo-Json -Depth 6 | Set-Content -Path $auditPath -Encoding UTF8

  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $checkpointScript -RepoRoot $testRepo -PolicyFile $policyPath -AuditSummaryFile $auditPath -WarnTrimLines 3 -CriticalTrimLines 5 -WarnArchiveGrowthLines 3 -CriticalArchiveGrowthLines 6 -FailOnEscalation
  Assert-True ($LASTEXITCODE -ne 0) 'escalation run with FailOnEscalation should return non-zero exit'

  $escalatedReport = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  Assert-True ($escalatedReport.checkpoint_state -eq 'escalation_required') 'escalation scenario should require escalation'
  Assert-True ((@($escalatedReport.findings).Count) -ge 2) 'escalation scenario should emit findings'

  Write-Host 'PASS: Flow Trigger Suite retention operations checkpoint checks.' -ForegroundColor Green
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
