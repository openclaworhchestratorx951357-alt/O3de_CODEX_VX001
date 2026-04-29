param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$LedgerScriptPath = '',
  [string]$LedgerReportPath = '',
  [string]$ManifestName = 'closeout_ledger_archival_manifest',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $LedgerScriptPath) {
  $LedgerScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Continuity-Attestation-Closeout-Ledger.ps1'
}
if (-not $LedgerReportPath) {
  $LedgerReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-continuity-attestation-closeout-ledger.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-closeout-ledger-archival-manifest.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-closeout-ledger-archival-manifest.txt'
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
$closeoutLedger = @()
$manifestState = 'ready'
$manifestComplete = $false
$recommendedAction = 'publish_closeout_ledger_archival_manifest'
$ledgerRan = $false

if (-not (Test-Path $LedgerScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'ledger_script_missing' -Message 'Continuity attestation closeout ledger script missing.' -Path $LedgerScriptPath
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
    Add-Finding -Severity 'warning' -Code 'ledger_execution_failed' -Message 'Continuity attestation closeout ledger execution failed.' -Path $LedgerScriptPath
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
    if ($ledgerData.closeout_ledger) {
      $closeoutLedger = @($ledgerData.closeout_ledger)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'ledger_report_parse_failed' -Message "Unable to parse closeout ledger report JSON: $($_.Exception.Message)" -Path $LedgerReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'ledger_report_missing' -Message 'Closeout ledger report missing after ledger execution.' -Path $LedgerReportPath
}

$archivalManifest = @(
  "manifest_basis=continuity_attestation_closeout_ledger",
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "closeout_ledger_count=$(@($closeoutLedger).Count)",
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
)

$manifestComplete = (
  $ledgerState -eq 'ready' -and
  $ledgerComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  @($closeoutLedger).Count -gt 0 -and
  @($archivalManifest).Count -gt 0
)

if (-not $manifestComplete) {
  $manifestState = 'attention_required'
  $recommendedAction = 'repair_closeout_ledger_and_rebuild_archival_manifest'
  Add-Finding -Severity 'warning' -Code 'archival_manifest_not_ready' -Message 'Closeout ledger archival manifest checks failed.' -Path $LedgerReportPath
}

$report = [ordered]@{
  manifested_at = $now.ToString('o')
  repo_root = $RepoRoot
  manifest_name = $ManifestName
  operator_acknowledged = [bool]$OperatorAcknowledged
  manifest_state = $manifestState
  manifest_complete = $manifestComplete
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
  closeout_ledger = $closeoutLedger
  archival_manifest = $archivalManifest
  local_only_note = 'Closeout ledger archival manifest is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "manifested_at=$($report.manifested_at)"
  "manifest_name=$ManifestName"
  "manifest_state=$manifestState"
  "manifest_complete=$manifestComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "ledger_state=$ledgerState"
  "ledger_complete=$ledgerComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
