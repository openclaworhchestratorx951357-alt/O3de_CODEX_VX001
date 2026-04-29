param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$FreezeReportPath = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $FreezeReportPath) {
  $FreezeReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-governance-lifecycle-freeze.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-frozen-lifecycle-handoff-checkpoint.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-frozen-lifecycle-handoff-checkpoint.txt'
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
$canonicalEntrypoint = 'scripts/Invoke-Codex-Supervisor-Retention-Cadence-Governance-Lifecycle-Freeze.ps1'
$freezeState = 'missing'
$freezeSummary = $null

if (Test-Path $FreezeReportPath) {
  try {
    $freezeData = Get-Content -Path $FreezeReportPath -Raw | ConvertFrom-Json
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
    Add-Finding -Severity 'warning' -Code 'freeze_report_parse_failed' -Message "Unable to parse freeze report JSON: $($_.Exception.Message)" -Path $FreezeReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'freeze_report_missing' -Message 'Lifecycle freeze report is missing; run the lifecycle freeze helper before handoff checkpoint.' -Path $FreezeReportPath
}

$handoffState = 'ready'
$recommendedAction = 'use_canonical_entrypoint_for_next_supervisor_slice'
if ($freezeState -ne 'ready') {
  $handoffState = 'attention_required'
  $recommendedAction = 'run_lifecycle_freeze_then_rebuild_handoff_checkpoint'
}

$threadStartGuidance = @(
  '1) Verify repository state and active branch before selecting a packet.'
  "2) Run the canonical lifecycle entrypoint: $canonicalEntrypoint."
  '3) Confirm freeze_state=ready and missing_stage_count=0 from generated JSON.'
  '4) Select one narrow project-moving packet and execute only that slice.'
  '5) Append startup-ready and completion entries to codex-slice-log.txt.'
)

$report = [ordered]@{
  checkpointed_at = $now.ToString('o')
  repo_root = $RepoRoot
  handoff_state = $handoffState
  recommended_action = $recommendedAction
  canonical_maintenance_entrypoint = $canonicalEntrypoint
  lifecycle_freeze_report_path = $FreezeReportPath
  lifecycle_freeze_state = $freezeState
  lifecycle_freeze_summary = $freezeSummary
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Frozen lifecycle handoff checkpoint is governance-only and does not authorize runtime execution or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "checkpointed_at=$($report.checkpointed_at)"
  "handoff_state=$handoffState"
  "recommended_action=$recommendedAction"
  "canonical_maintenance_entrypoint=$canonicalEntrypoint"
  "lifecycle_freeze_state=$freezeState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
