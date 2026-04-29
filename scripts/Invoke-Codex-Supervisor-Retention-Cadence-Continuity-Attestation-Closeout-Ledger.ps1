param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$AttestationScriptPath = '',
  [string]$AttestationReportPath = '',
  [string]$LedgerName = 'continuity_attestation_closeout_ledger',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $AttestationScriptPath) {
  $AttestationScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Publication-Seal-Continuity-Attestation.ps1'
}
if (-not $AttestationReportPath) {
  $AttestationReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-publication-seal-continuity-attestation.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-continuity-attestation-closeout-ledger.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-continuity-attestation-closeout-ledger.txt'
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

$attestationState = 'missing'
$attestationComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$continuityAttestation = @()
$ledgerState = 'ready'
$ledgerComplete = $false
$recommendedAction = 'publish_continuity_attestation_closeout_ledger'
$attestationRan = $false

if (-not (Test-Path $AttestationScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'attestation_script_missing' -Message 'Publication seal continuity attestation script missing.' -Path $AttestationScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $AttestationScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $attestationRan = ($LASTEXITCODE -eq 0)
  if (-not $attestationRan) {
    Add-Finding -Severity 'warning' -Code 'attestation_execution_failed' -Message 'Publication seal continuity attestation execution failed.' -Path $AttestationScriptPath
  }
}

if (Test-Path $AttestationReportPath) {
  try {
    $attestationData = Get-Content -Path $AttestationReportPath -Raw | ConvertFrom-Json
    if ($attestationData.attestation_state) {
      $attestationState = [string]$attestationData.attestation_state
    }
    if ($null -ne $attestationData.attestation_complete) {
      $attestationComplete = [bool]$attestationData.attestation_complete
    }
    if ($attestationData.lane_profile_name) {
      $laneProfileName = [string]$attestationData.lane_profile_name
    }
    if ($attestationData.profile_state) {
      $profileState = [string]$attestationData.profile_state
    }
    if ($attestationData.launch_command) {
      $launchCommand = [string]$attestationData.launch_command
    }
    if ($attestationData.thread_start_guidance) {
      $threadStartGuidance = @($attestationData.thread_start_guidance)
    }
    if ($attestationData.continuity_attestation) {
      $continuityAttestation = @($attestationData.continuity_attestation)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'attestation_report_parse_failed' -Message "Unable to parse continuity attestation report JSON: $($_.Exception.Message)" -Path $AttestationReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'attestation_report_missing' -Message 'Continuity attestation report missing after attestation execution.' -Path $AttestationReportPath
}

$closeoutLedger = @(
  "ledger_basis=publication_seal_continuity_attestation",
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "continuity_attestation_count=$(@($continuityAttestation).Count)",
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
)

$ledgerComplete = (
  $attestationState -eq 'ready' -and
  $attestationComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  @($continuityAttestation).Count -gt 0 -and
  @($closeoutLedger).Count -gt 0
)

if (-not $ledgerComplete) {
  $ledgerState = 'attention_required'
  $recommendedAction = 'repair_continuity_attestation_and_rebuild_closeout_ledger'
  Add-Finding -Severity 'warning' -Code 'closeout_ledger_not_ready' -Message 'Continuity attestation closeout ledger checks failed.' -Path $AttestationReportPath
}

$report = [ordered]@{
  ledgered_at = $now.ToString('o')
  repo_root = $RepoRoot
  ledger_name = $LedgerName
  operator_acknowledged = [bool]$OperatorAcknowledged
  ledger_state = $ledgerState
  ledger_complete = $ledgerComplete
  recommended_action = $recommendedAction
  attestation_script_path = $AttestationScriptPath
  attestation_report_path = $AttestationReportPath
  attestation_ran = $attestationRan
  attestation_state = $attestationState
  attestation_complete = $attestationComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  continuity_attestation = $continuityAttestation
  closeout_ledger = $closeoutLedger
  local_only_note = 'Continuity attestation closeout ledger is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "ledgered_at=$($report.ledgered_at)"
  "ledger_name=$LedgerName"
  "ledger_state=$ledgerState"
  "ledger_complete=$ledgerComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "attestation_state=$attestationState"
  "attestation_complete=$attestationComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
