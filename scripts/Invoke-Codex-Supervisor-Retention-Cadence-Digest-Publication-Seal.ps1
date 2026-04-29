param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$DigestScriptPath = '',
  [string]$DigestReportPath = '',
  [string]$SealName = 'digest_publication_seal',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $DigestScriptPath) {
  $DigestScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Execution-Checklist-Evidence-Handoff-Digest.ps1'
}
if (-not $DigestReportPath) {
  $DigestReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-execution-checklist-evidence-handoff-digest.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-digest-publication-seal.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-digest-publication-seal.txt'
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

$digestState = 'missing'
$digestComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$executionChecklist = @()
$evidenceHandoffDigest = @()
$sealState = 'ready'
$sealComplete = $false
$recommendedAction = 'publish_digest_publication_seal'
$digestRan = $false

if (-not (Test-Path $DigestScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'digest_script_missing' -Message 'Execution checklist evidence handoff digest script missing.' -Path $DigestScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $DigestScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $digestRan = ($LASTEXITCODE -eq 0)
  if (-not $digestRan) {
    Add-Finding -Severity 'warning' -Code 'digest_execution_failed' -Message 'Execution checklist evidence handoff digest execution failed.' -Path $DigestScriptPath
  }
}

if (Test-Path $DigestReportPath) {
  try {
    $digestData = Get-Content -Path $DigestReportPath -Raw | ConvertFrom-Json
    if ($digestData.digest_state) {
      $digestState = [string]$digestData.digest_state
    }
    if ($null -ne $digestData.digest_complete) {
      $digestComplete = [bool]$digestData.digest_complete
    }
    if ($digestData.lane_profile_name) {
      $laneProfileName = [string]$digestData.lane_profile_name
    }
    if ($digestData.profile_state) {
      $profileState = [string]$digestData.profile_state
    }
    if ($digestData.launch_command) {
      $launchCommand = [string]$digestData.launch_command
    }
    if ($digestData.thread_start_guidance) {
      $threadStartGuidance = @($digestData.thread_start_guidance)
    }
    if ($digestData.execution_checklist) {
      $executionChecklist = @($digestData.execution_checklist)
    }
    if ($digestData.evidence_handoff_digest) {
      $evidenceHandoffDigest = @($digestData.evidence_handoff_digest)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'digest_report_parse_failed' -Message "Unable to parse evidence handoff digest report JSON: $($_.Exception.Message)" -Path $DigestReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'digest_report_missing' -Message 'Evidence handoff digest report missing after digest execution.' -Path $DigestReportPath
}

$publicationSeal = @(
  "publication_basis=execution_checklist_evidence_handoff_digest",
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "execution_checklist_count=$(@($executionChecklist).Count)",
  "digest_entry_count=$(@($evidenceHandoffDigest).Count)",
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
)

$sealComplete = (
  $digestState -eq 'ready' -and
  $digestComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  @($executionChecklist).Count -gt 0 -and
  @($evidenceHandoffDigest).Count -gt 0 -and
  @($publicationSeal).Count -gt 0
)

if (-not $sealComplete) {
  $sealState = 'attention_required'
  $recommendedAction = 'repair_evidence_handoff_digest_and_rebuild_publication_seal'
  Add-Finding -Severity 'warning' -Code 'digest_publication_seal_not_ready' -Message 'Digest publication seal checks failed.' -Path $DigestReportPath
}

$report = [ordered]@{
  sealed_at = $now.ToString('o')
  repo_root = $RepoRoot
  seal_name = $SealName
  operator_acknowledged = [bool]$OperatorAcknowledged
  seal_state = $sealState
  seal_complete = $sealComplete
  recommended_action = $recommendedAction
  digest_script_path = $DigestScriptPath
  digest_report_path = $DigestReportPath
  digest_ran = $digestRan
  digest_state = $digestState
  digest_complete = $digestComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  execution_checklist = $executionChecklist
  evidence_handoff_digest = $evidenceHandoffDigest
  publication_seal = $publicationSeal
  local_only_note = 'Digest publication seal is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "sealed_at=$($report.sealed_at)"
  "seal_name=$SealName"
  "seal_state=$sealState"
  "seal_complete=$sealComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "digest_state=$digestState"
  "digest_complete=$digestComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
