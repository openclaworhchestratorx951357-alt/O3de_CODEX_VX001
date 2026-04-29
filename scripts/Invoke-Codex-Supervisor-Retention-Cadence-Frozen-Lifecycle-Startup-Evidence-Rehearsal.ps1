param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$FreezeScriptPath = '',
  [string]$HandoffScriptPath = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = '',
  [string]$RehearsalLogPath = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $FreezeScriptPath) {
  $FreezeScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Governance-Lifecycle-Freeze.ps1'
}
if (-not $HandoffScriptPath) {
  $HandoffScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Handoff-Checkpoint.ps1'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-frozen-lifecycle-startup-evidence-rehearsal.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-frozen-lifecycle-startup-evidence-rehearsal.txt'
}
if (-not $RehearsalLogPath) {
  $RehearsalLogPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-evidence-rehearsal.log'
}

function Ensure-ParentDirectory {
  param([string]$Path)
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
}

function Add-Finding {
  param(
    [string]$Severity,
    [string]$Code,
    [string]$Message,
    [string]$Path = ''
  )
  $script:findings += [ordered]@{
    severity = $Severity
    code = $Code
    path = $Path
    message = $Message
  }
}

$findings = @()
$now = [DateTimeOffset]::Now

$freezeReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-governance-lifecycle-freeze.json'
$handoffReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-frozen-lifecycle-handoff-checkpoint.json'
$handoffCopyPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-frozen-lifecycle-handoff-checkpoint.handoff.json'

$freezeState = 'missing'
$handoffState = 'missing'
$guidancePreserved = $false
$freezeRan = $false
$handoffRan = $false
$threadStartGuidance = @()
$handoffCopyGuidance = @()

if (-not (Test-Path $FreezeScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'freeze_script_missing' -Message 'Lifecycle freeze helper script missing.' -Path $FreezeScriptPath
}
if (-not (Test-Path $HandoffScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'handoff_script_missing' -Message 'Frozen lifecycle handoff checkpoint helper script missing.' -Path $HandoffScriptPath
}

if ((Test-Path $FreezeScriptPath) -and (Test-Path $HandoffScriptPath)) {
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $FreezeScriptPath -RepoRoot $RepoRoot | Out-Null
  $freezeRan = ($LASTEXITCODE -eq 0)
  if (-not $freezeRan) {
    Add-Finding -Severity 'warning' -Code 'freeze_helper_failed' -Message 'Lifecycle freeze helper execution failed.' -Path $FreezeScriptPath
  }

  if ($freezeRan) {
    & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $HandoffScriptPath -RepoRoot $RepoRoot -FreezeReportPath $freezeReportPath | Out-Null
    $handoffRan = ($LASTEXITCODE -eq 0)
    if (-not $handoffRan) {
      Add-Finding -Severity 'warning' -Code 'handoff_helper_failed' -Message 'Frozen lifecycle handoff checkpoint helper execution failed.' -Path $HandoffScriptPath
    }
  }
}

$freezeSummary = $null
$handoffSummary = $null

if (Test-Path $freezeReportPath) {
  try {
    $freezeData = Get-Content -Path $freezeReportPath -Raw | ConvertFrom-Json
    if ($freezeData.freeze_state) {
      $freezeState = [string]$freezeData.freeze_state
    }
    if ($freezeData.lifecycle_summary) {
      $freezeSummary = [ordered]@{
        stage_count = [int]$freezeData.lifecycle_summary.stage_count
        present_stage_count = [int]$freezeData.lifecycle_summary.present_stage_count
        missing_stage_count = [int]$freezeData.lifecycle_summary.missing_stage_count
      }
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'freeze_report_parse_failed' -Message "Unable to parse freeze report JSON: $($_.Exception.Message)" -Path $freezeReportPath
  }
}

if (Test-Path $handoffReportPath) {
  try {
    $handoffData = Get-Content -Path $handoffReportPath -Raw | ConvertFrom-Json
    if ($handoffData.handoff_state) {
      $handoffState = [string]$handoffData.handoff_state
    }
    if ($handoffData.thread_start_guidance) {
      $threadStartGuidance = @($handoffData.thread_start_guidance)
    }
    if ($handoffData.lifecycle_freeze_summary) {
      $handoffSummary = [ordered]@{
        stage_count = [int]$handoffData.lifecycle_freeze_summary.stage_count
        present_stage_count = [int]$handoffData.lifecycle_freeze_summary.present_stage_count
        missing_stage_count = [int]$handoffData.lifecycle_freeze_summary.missing_stage_count
      }
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'handoff_report_parse_failed' -Message "Unable to parse handoff report JSON: $($_.Exception.Message)" -Path $handoffReportPath
  }
}

Ensure-ParentDirectory -Path $RehearsalLogPath
$logEntry = "$($now.ToString('o')) | startup-evidence-rehearsal | freeze_state=$freezeState; handoff_state=$handoffState"
Add-Content -Path $RehearsalLogPath -Value $logEntry -Encoding UTF8

if (Test-Path $handoffReportPath) {
  Ensure-ParentDirectory -Path $handoffCopyPath
  Copy-Item -LiteralPath $handoffReportPath -Destination $handoffCopyPath -Force
  try {
    $handoffCopyData = Get-Content -Path $handoffCopyPath -Raw | ConvertFrom-Json
    if ($handoffCopyData.thread_start_guidance) {
      $handoffCopyGuidance = @($handoffCopyData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'handoff_copy_parse_failed' -Message "Unable to parse copied handoff report JSON: $($_.Exception.Message)" -Path $handoffCopyPath
  }
}

if (@($threadStartGuidance).Count -gt 0 -and @($threadStartGuidance).Count -eq @($handoffCopyGuidance).Count) {
  $guidancePreserved = $true
  for ($i = 0; $i -lt @($threadStartGuidance).Count; $i++) {
    if ([string]$threadStartGuidance[$i] -ne [string]$handoffCopyGuidance[$i]) {
      $guidancePreserved = $false
      break
    }
  }
}

if (-not $guidancePreserved) {
  Add-Finding -Severity 'warning' -Code 'guidance_not_preserved' -Message 'Thread-start guidance did not survive handoff-copy verification.' -Path $handoffCopyPath
}

$rehearsalState = 'ready'
$recommendedAction = 'retain_startup_evidence_rehearsal_for_future_supervisor_threads'
if ($freezeState -ne 'ready' -or $handoffState -ne 'ready' -or -not $guidancePreserved) {
  $rehearsalState = 'attention_required'
  $recommendedAction = 'restore_freeze_and_handoff_readiness_then_re-run_startup_evidence_rehearsal'
}

$report = [ordered]@{
  rehearsed_at = $now.ToString('o')
  repo_root = $RepoRoot
  rehearsal_state = $rehearsalState
  recommended_action = $recommendedAction
  freeze_helper_script = $FreezeScriptPath
  handoff_helper_script = $HandoffScriptPath
  freeze_report_path = $freezeReportPath
  handoff_report_path = $handoffReportPath
  handoff_copy_path = $handoffCopyPath
  rehearsal_log_path = $RehearsalLogPath
  freeze_state = $freezeState
  handoff_state = $handoffState
  guidance_preserved_after_handoff_copy = $guidancePreserved
  freeze_ran = $freezeRan
  handoff_ran = $handoffRan
  thread_start_guidance = $threadStartGuidance
  handoff_copy_guidance = $handoffCopyGuidance
  freeze_summary = $freezeSummary
  handoff_freeze_summary = $handoffSummary
  local_only_note = 'Startup evidence rehearsal is governance-only and does not authorize runtime execution, provider expansion, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "rehearsed_at=$($report.rehearsed_at)"
  "rehearsal_state=$rehearsalState"
  "recommended_action=$recommendedAction"
  "freeze_state=$freezeState"
  "handoff_state=$handoffState"
  "guidance_preserved_after_handoff_copy=$guidancePreserved"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
