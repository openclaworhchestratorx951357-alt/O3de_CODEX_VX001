param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-final-governance-closeout.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-final-governance-closeout.txt'
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
  $line = ''
  foreach ($item in (Get-Content -Path $Path)) {
    if ($item -like 'Status:*') {
      $line = $item.Trim()
      break
    }
  }
  return $line
}

$findings = @()
$now = [DateTimeOffset]::Now

$referenceDocs = @(
  'docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-CLOSURE-CHECKPOINT.md',
  'docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-ESCALATION-REHEARSAL.md',
  'docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-OPERATOR-HANDOFF-CLOSEOUT.md'
)

$references = @()
$missingCount = 0
foreach ($relativePath in $referenceDocs) {
  $fullPath = Join-Path $RepoRoot $relativePath
  $exists = Test-Path $fullPath
  $statusLine = ''
  if ($exists) {
    $statusLine = Get-DocStatusLine -Path $fullPath
  }
  else {
    $missingCount += 1
    Add-Finding -Severity 'warning' -Code 'reference_doc_missing' -Message "Reference doc missing: $relativePath" -Path $relativePath
  }

  $references += [ordered]@{
    path = $relativePath
    exists = $exists
    status = $statusLine
  }
}

$closeoutState = 'ready'
$recommendedAction = 'retain_final_governance_closeout'
if ($missingCount -gt 0) {
  $closeoutState = 'attention_required'
  $recommendedAction = 'restore_missing_reference_docs_and_re-run_closeout'
}

$finalBoundaries = @(
  'local-only governance outputs remain non-authorizing',
  'no runtime bridge/provider/Asset Processor/placement mutation admitted',
  'session and approval metadata are not execution authorization',
  'operator acknowledgment is required where escalation rehearsal declares it'
)

$maintenanceGuidance = @(
  'Run retention cadence governance tests before changing handoff wording.',
  'Keep safe/refused examples compact and lane-specific; avoid broad mutation phrasing.',
  'Treat missing reference docs as handoff drift and repair before promotion.',
  'Preserve append-only evidence logs for queue and event records.',
  'Do not broaden capability claims beyond validated local governance surfaces.'
)

$report = [ordered]@{
  closed_out_at = $now.ToString('o')
  repo_root = $RepoRoot
  closeout_state = $closeoutState
  recommended_action = $recommendedAction
  references = $references
  final_local_only_boundaries = $finalBoundaries
  maintenance_guidance = $maintenanceGuidance
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "closed_out_at=$($report.closed_out_at)"
  "closeout_state=$closeoutState"
  "recommended_action=$recommendedAction"
  "reference_count=$(@($references).Count)"
  "missing_reference_count=$missingCount"
  "boundary_count=$(@($finalBoundaries).Count)"
  "maintenance_guidance_count=$(@($maintenanceGuidance).Count)"
  "finding_count=$(@($findings).Count)"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
