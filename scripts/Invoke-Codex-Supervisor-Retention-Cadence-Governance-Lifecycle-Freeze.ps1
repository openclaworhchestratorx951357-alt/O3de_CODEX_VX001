param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-governance-lifecycle-freeze.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-governance-lifecycle-freeze.txt'
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

function Get-DocStatusLine {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    return ''
  }
  foreach ($line in (Get-Content -Path $Path)) {
    if ($line -like 'Status:*') {
      return $line.Trim()
    }
  }
  return ''
}

$findings = @()
$now = [DateTimeOffset]::Now

$lifecycleDocs = @(
  [ordered]@{ stage='closure_checkpoint'; path='docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-CLOSURE-CHECKPOINT.md' },
  [ordered]@{ stage='escalation_rehearsal'; path='docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-ESCALATION-REHEARSAL.md' },
  [ordered]@{ stage='operator_handoff_closeout'; path='docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-OPERATOR-HANDOFF-CLOSEOUT.md' },
  [ordered]@{ stage='final_governance_closeout'; path='docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-FINAL-GOVERNANCE-CLOSEOUT.md' },
  [ordered]@{ stage='governance_maintenance_cadence'; path='docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-GOVERNANCE-MAINTENANCE-CADENCE.md' },
  [ordered]@{ stage='maintenance_automation_handoff'; path='docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-MAINTENANCE-AUTOMATION-HANDOFF.md' }
)

$lifecycleMap = @()
$missingStages = @()

foreach ($entry in $lifecycleDocs) {
  $relativePath = [string]$entry.path
  $fullPath = Join-Path $RepoRoot $relativePath
  $exists = Test-Path $fullPath
  $statusLine = if ($exists) { Get-DocStatusLine -Path $fullPath } else { '' }
  if (-not $exists) {
    $missingStages += [string]$entry.stage
    Add-Finding -Severity 'warning' -Code 'lifecycle_stage_missing' -Message "Lifecycle stage doc missing: $relativePath" -Path $relativePath
  }

  $lifecycleMap += [ordered]@{
    stage = [string]$entry.stage
    path = $relativePath
    exists = $exists
    status = $statusLine
  }
}

$freezeState = 'ready'
$recommendedAction = 'retain_frozen_governance_lifecycle'
if (@($missingStages).Count -gt 0) {
  $freezeState = 'attention_required'
  $recommendedAction = 'restore_missing_lifecycle_docs_and_re-run_freeze'
}

$lifecycleSummary = [ordered]@{
  stage_count = @($lifecycleMap).Count
  present_stage_count = @($lifecycleMap | Where-Object { $_.exists }).Count
  missing_stage_count = @($missingStages).Count
  missing_stages = $missingStages
}

$report = [ordered]@{
  frozen_at = $now.ToString('o')
  repo_root = $RepoRoot
  freeze_state = $freezeState
  recommended_action = $recommendedAction
  lifecycle_summary = $lifecycleSummary
  lifecycle_map = $lifecycleMap
  local_only_note = 'Lifecycle freeze is a local governance checkpoint only and does not authorize runtime mutation, provider execution, placement, or asset pipeline execution.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "frozen_at=$($report.frozen_at)"
  "freeze_state=$freezeState"
  "recommended_action=$recommendedAction"
  "stage_count=$($lifecycleSummary.stage_count)"
  "present_stage_count=$($lifecycleSummary.present_stage_count)"
  "missing_stage_count=$($lifecycleSummary.missing_stage_count)"
  "missing_stages=$(([string]::Join(',', @($missingStages))))"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
