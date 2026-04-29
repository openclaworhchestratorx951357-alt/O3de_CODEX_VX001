param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$OutputFile = '',
  [switch]$KeepTemp
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-anomaly-drill.json'
}

function Ensure-Directory {
  param([string]$Path)
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
}

function Set-AuditSummary {
  param(
    [string]$Path,
    [string]$PolicyFile,
    [string]$RepoPath,
    [int]$QueueTrim,
    [int]$EventTrim
  )

  $audit = [ordered]@{
    audited_at = [DateTimeOffset]::Now.ToString('o')
    repo_root = $RepoPath
    policy_file = $PolicyFile
    apply_mode = $false
    always_keep = @('continue-queue/codex-supervisor-packet-state.json')
    files = @(
      [ordered]@{
        path = 'continue-queue/codex-supervisor-packet-queue.jsonl'
        exists = $true
        line_count = 20
        max_lines = 4
        would_trim = ($QueueTrim -gt 0)
        trim_count = $QueueTrim
        archive_path = (Join-Path $RepoPath 'continue-queue\codex-supervisor-packet-queue.jsonl.archive.jsonl')
        applied = $false
      },
      [ordered]@{
        path = 'continue-queue/codex-supervisor-packet-events.jsonl'
        exists = $true
        line_count = 12
        max_lines = 3
        would_trim = ($EventTrim -gt 0)
        trim_count = $EventTrim
        archive_path = (Join-Path $RepoPath 'continue-queue\codex-supervisor-packet-events.jsonl.archive.jsonl')
        applied = $false
      }
    )
  }
  $audit | ConvertTo-Json -Depth 6 | Set-Content -Path $Path -Encoding UTF8
}

function Invoke-Scenario {
  param(
    [string]$ScenarioName,
    [string]$ExpectedState,
    [string]$CheckpointScript,
    [string]$SandboxRepo,
    [string]$PolicyFile,
    [string]$AuditFile,
    [int]$WarnTrimLines,
    [int]$CriticalTrimLines,
    [int]$WarnArchiveGrowthLines,
    [int]$CriticalArchiveGrowthLines,
    [int]$QueueTrim,
    [int]$EventTrim,
    [switch]$FailOnEscalation
  )

  Set-AuditSummary -Path $AuditFile -PolicyFile $PolicyFile -RepoPath $SandboxRepo -QueueTrim $QueueTrim -EventTrim $EventTrim

  $args = @(
    '-NoLogo'
    '-ExecutionPolicy'; 'Bypass'
    '-File'; $CheckpointScript
    '-RepoRoot'; $SandboxRepo
    '-PolicyFile'; $PolicyFile
    '-AuditSummaryFile'; $AuditFile
    '-WarnTrimLines'; $WarnTrimLines
    '-CriticalTrimLines'; $CriticalTrimLines
    '-WarnArchiveGrowthLines'; $WarnArchiveGrowthLines
    '-CriticalArchiveGrowthLines'; $CriticalArchiveGrowthLines
  )
  if ($FailOnEscalation) {
    $args += '-FailOnEscalation'
  }

  & powershell.exe @args | Out-Null
  $exitCode = $LASTEXITCODE

  $reportPath = Join-Path $SandboxRepo 'continue-queue\codex-supervisor-retention-operations-checkpoint.json'
  $report = Get-Content -Path $reportPath -Raw | ConvertFrom-Json
  $actualState = [string]$report.checkpoint_state
  $expectedAction = switch ($ExpectedState) {
    'ready' { 'retain_standard_schedule' }
    'attention_required' { 'schedule_followup_audit_and_review_archive_growth' }
    'escalation_required' { 'run_apply_with_operator_ack_and_open_followup_packet' }
    default { '' }
  }

  [pscustomobject][ordered]@{
    scenario = $ScenarioName
    expected_state = $ExpectedState
    actual_state = $actualState
    expected_recommended_action = $expectedAction
    actual_recommended_action = [string]$report.recommended_action
    passed = ($actualState -eq $ExpectedState -and [string]$report.recommended_action -eq $expectedAction)
    exit_code = $exitCode
    findings = @($report.findings)
  }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-supervisor-retention-anomaly-drill-" + [Guid]::NewGuid().ToString())
$sandboxRepo = Join-Path $tempRoot 'repo'
$sandboxScripts = Join-Path $sandboxRepo 'scripts'
$sandboxQueue = Join-Path $sandboxRepo 'continue-queue'
New-Item -ItemType Directory -Path $sandboxScripts -Force | Out-Null
New-Item -ItemType Directory -Path $sandboxQueue -Force | Out-Null

try {
  $checkpointSource = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Checkpoint.ps1'
  $checkpointScript = Join-Path $sandboxScripts 'Invoke-Codex-Supervisor-Retention-Checkpoint.ps1'
  Copy-Item -LiteralPath $checkpointSource -Destination $checkpointScript -Force

  $policyFile = Join-Path $sandboxScripts 'Codex-Supervisor-Retention-Policy.json'
  @'
{
  "retention_policy_version": "anomaly-drill",
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
    "continue-queue/codex-supervisor-packet-state.json",
    "continue-queue/codex-slice-log.txt"
  ]
}
'@ | Set-Content -Path $policyFile -Encoding UTF8

  @('q1','q2','q3','q4') | Set-Content -Path (Join-Path $sandboxQueue 'codex-supervisor-packet-queue.jsonl') -Encoding UTF8
  @('e1','e2','e3') | Set-Content -Path (Join-Path $sandboxQueue 'codex-supervisor-packet-events.jsonl') -Encoding UTF8
  @('qa1') | Set-Content -Path (Join-Path $sandboxQueue 'codex-supervisor-packet-queue.jsonl.archive.jsonl') -Encoding UTF8
  @('ea1') | Set-Content -Path (Join-Path $sandboxQueue 'codex-supervisor-packet-events.jsonl.archive.jsonl') -Encoding UTF8

  $auditFile = Join-Path $sandboxQueue 'codex-supervisor-retention-audit.json'

  $scenarios = @()
  $scenarios += Invoke-Scenario -ScenarioName 'ready-baseline' -ExpectedState 'ready' -CheckpointScript $checkpointScript -SandboxRepo $sandboxRepo -PolicyFile $policyFile -AuditFile $auditFile -WarnTrimLines 3 -CriticalTrimLines 6 -WarnArchiveGrowthLines 5 -CriticalArchiveGrowthLines 8 -QueueTrim 0 -EventTrim 0
  $scenarios += Invoke-Scenario -ScenarioName 'attention-trim-warning' -ExpectedState 'attention_required' -CheckpointScript $checkpointScript -SandboxRepo $sandboxRepo -PolicyFile $policyFile -AuditFile $auditFile -WarnTrimLines 2 -CriticalTrimLines 6 -WarnArchiveGrowthLines 5 -CriticalArchiveGrowthLines 8 -QueueTrim 3 -EventTrim 1
  $scenarios += Invoke-Scenario -ScenarioName 'escalation-trim-critical' -ExpectedState 'escalation_required' -CheckpointScript $checkpointScript -SandboxRepo $sandboxRepo -PolicyFile $policyFile -AuditFile $auditFile -WarnTrimLines 2 -CriticalTrimLines 6 -WarnArchiveGrowthLines 5 -CriticalArchiveGrowthLines 8 -QueueTrim 7 -EventTrim 6 -FailOnEscalation

  $allPassed = @($scenarios | Where-Object { -not $_.passed }).Count -eq 0
  $drill = [ordered]@{
    drilled_at = [DateTimeOffset]::Now.ToString('o')
    repo_root = $RepoRoot
    sandbox_repo = $sandboxRepo
    scenarios = $scenarios
    operator_triage = [ordered]@{
      ready = 'retain_standard_schedule'
      attention_required = 'schedule_followup_audit_and_review_archive_growth'
      escalation_required = 'run_apply_with_operator_ack_and_open_followup_packet'
    }
    pass = $allPassed
  }

  Ensure-Directory -Path $OutputFile
  $drill | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputFile -Encoding UTF8
  Write-Host ($drill | ConvertTo-Json -Depth 8)

  if (-not $allPassed) {
    throw 'Retention anomaly drill validation failed.'
  }
}
finally {
  if (-not $KeepTemp -and (Test-Path $tempRoot)) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
