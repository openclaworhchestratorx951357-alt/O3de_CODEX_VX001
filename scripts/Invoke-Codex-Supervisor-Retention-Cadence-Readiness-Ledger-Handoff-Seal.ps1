param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$LedgerScriptPath = '',
  [string]$LedgerReportPath = '',
  [string]$SealName = 'readiness_ledger_handoff_seal',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $LedgerScriptPath) {
  $LedgerScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Digest-Readiness-Ledger.ps1'
}
if (-not $LedgerReportPath) {
  $LedgerReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-digest-readiness-ledger.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-readiness-ledger-handoff-seal.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-readiness-ledger-handoff-seal.txt'
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

$ledgerState = 'missing'
$ledgerComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$sealState = 'ready'
$sealComplete = $false
$recommendedAction = 'publish_readiness_ledger_handoff_seal'
$ledgerRan = $false

if (-not (Test-Path $LedgerScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'ledger_script_missing' -Message 'Handoff digest readiness ledger script missing.' -Path $LedgerScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $LedgerScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $ledgerRan = ($LASTEXITCODE -eq 0)
  if (-not $ledgerRan) {
    Add-Finding -Severity 'warning' -Code 'ledger_execution_failed' -Message 'Handoff digest readiness ledger execution failed.' -Path $LedgerScriptPath
  }
}

if (Test-Path $LedgerReportPath) {
  try {
    $ledgerData = Get-Content -Path $LedgerReportPath -Raw | ConvertFrom-Json
    if ($ledgerData.ledger_state) {
      $ledgerState = [string]$ledgerData.ledger_state
    }
    if ($null -ne $ledgerData.ledger_complete) {
      $ledgerComplete = [bool]$ledgerData.ledger_complete
    }
    if ($ledgerData.lane_profile_name) {
      $laneProfileName = [string]$ledgerData.lane_profile_name
    }
    if ($ledgerData.profile_state) {
      $profileState = [string]$ledgerData.profile_state
    }
    if ($ledgerData.launch_command) {
      $launchCommand = [string]$ledgerData.launch_command
    }
    if ($ledgerData.thread_start_guidance) {
      $threadStartGuidance = @($ledgerData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'ledger_report_parse_failed' -Message "Unable to parse readiness ledger report JSON: $($_.Exception.Message)" -Path $LedgerReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'ledger_report_missing' -Message 'Readiness ledger report missing after ledger execution.' -Path $LedgerReportPath
}

$sealComplete = (
  $ledgerState -eq 'ready' -and
  $ledgerComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0
)

if (-not $sealComplete) {
  $sealState = 'attention_required'
  $recommendedAction = 'repair_readiness_ledger_and_rebuild_handoff_seal'
  Add-Finding -Severity 'warning' -Code 'handoff_seal_not_ready' -Message 'Readiness ledger handoff seal checks failed.' -Path $LedgerReportPath
}

$report = [ordered]@{
  sealed_at = $now.ToString('o')
  repo_root = $RepoRoot
  seal_name = $SealName
  operator_acknowledged = [bool]$OperatorAcknowledged
  seal_state = $sealState
  seal_complete = $sealComplete
  recommended_action = $recommendedAction
  ledger_script_path = $LedgerScriptPath
  ledger_report_path = $LedgerReportPath
  ledger_ran = $ledgerRan
  ledger_state = $ledgerState
  ledger_complete = $ledgerComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Readiness ledger handoff seal is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "sealed_at=$($report.sealed_at)"
  "seal_name=$SealName"
  "seal_state=$sealState"
  "seal_complete=$sealComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "ledger_state=$ledgerState"
  "ledger_complete=$ledgerComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
