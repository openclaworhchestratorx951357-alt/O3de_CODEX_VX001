param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$DigestScriptPath = '',
  [string]$DigestReportPath = '',
  [string]$LedgerName = 'handoff_digest_readiness_ledger',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $DigestScriptPath) {
  $DigestScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Continuity-Checkpoint-Handoff-Digest.ps1'
}
if (-not $DigestReportPath) {
  $DigestReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-continuity-checkpoint-handoff-digest.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-digest-readiness-ledger.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-digest-readiness-ledger.txt'
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
$ledgerState = 'ready'
$ledgerComplete = $false
$recommendedAction = 'publish_handoff_digest_readiness_ledger'
$digestRan = $false

if (-not (Test-Path $DigestScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'digest_script_missing' -Message 'Continuity checkpoint handoff digest script missing.' -Path $DigestScriptPath
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
    Add-Finding -Severity 'warning' -Code 'digest_execution_failed' -Message 'Continuity checkpoint handoff digest execution failed.' -Path $DigestScriptPath
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
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'digest_report_parse_failed' -Message "Unable to parse handoff digest report JSON: $($_.Exception.Message)" -Path $DigestReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'digest_report_missing' -Message 'Handoff digest report missing after digest execution.' -Path $DigestReportPath
}

$ledgerComplete = (
  $digestState -eq 'ready' -and
  $digestComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0
)

if (-not $ledgerComplete) {
  $ledgerState = 'attention_required'
  $recommendedAction = 'repair_handoff_digest_and_rebuild_readiness_ledger'
  Add-Finding -Severity 'warning' -Code 'readiness_ledger_not_ready' -Message 'Handoff digest readiness ledger checks failed.' -Path $DigestReportPath
}

$report = [ordered]@{
  ledgered_at = $now.ToString('o')
  repo_root = $RepoRoot
  ledger_name = $LedgerName
  operator_acknowledged = [bool]$OperatorAcknowledged
  ledger_state = $ledgerState
  ledger_complete = $ledgerComplete
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
  local_only_note = 'Handoff digest readiness ledger is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "ledgered_at=$($report.ledgered_at)"
  "ledger_name=$LedgerName"
  "ledger_state=$ledgerState"
  "ledger_complete=$ledgerComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "digest_state=$digestState"
  "digest_complete=$digestComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
