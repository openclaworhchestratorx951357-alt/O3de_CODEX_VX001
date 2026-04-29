param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$SealScriptPath = '',
  [string]$SealReportPath = '',
  [string]$LedgerName = 'operator_handoff_seal_lane_custody_ledger',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $SealScriptPath) {
  $SealScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Lane-Custody-Attestation-Operator-Handoff-Seal.ps1'
}
if (-not $SealReportPath) {
  $SealReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-lane-custody-attestation-operator-handoff-seal.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-handoff-seal-lane-custody-ledger.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-handoff-seal-lane-custody-ledger.txt'
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

$operatorHandoffSealState = 'missing'
$operatorHandoffSealComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$archivalManifest = @()
$handoffWarrant = @()
$operatorDispatchBundle = @()
$executionReceipt = @()
$operatorContinuityAttestation = @()
$dispatchReadinessSeal = @()
$operatorRunbookAttestation = @()
$laneLaunchReadinessWarrant = @()
$operatorActivationReceipt = @()
$laneContinuityWarrant = @()
$operatorStewardshipReceipt = @()
$laneCustodyAttestation = @()
$operatorHandoffSeal = @()
$laneCustodyLedgerState = 'ready'
$laneCustodyLedgerComplete = $false
$recommendedAction = 'publish_operator_handoff_seal_lane_custody_ledger'
$sealRan = $false

if (-not (Test-Path $SealScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'operator_handoff_seal_script_missing' -Message 'Lane custody attestation operator handoff seal script missing.' -Path $SealScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $SealScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $sealRan = ($LASTEXITCODE -eq 0)
  if (-not $sealRan) {
    Add-Finding -Severity 'warning' -Code 'operator_handoff_seal_execution_failed' -Message 'Operator handoff seal execution failed.' -Path $SealScriptPath
  }
}

if (Test-Path $SealReportPath) {
  try {
    $sealData = Get-Content -Path $SealReportPath -Raw | ConvertFrom-Json
    if ($sealData.operator_handoff_seal_state) {
      $operatorHandoffSealState = [string]$sealData.operator_handoff_seal_state
    }
    if ($null -ne $sealData.operator_handoff_seal_complete) {
      $operatorHandoffSealComplete = [bool]$sealData.operator_handoff_seal_complete
    }
    if ($sealData.lane_profile_name) {
      $laneProfileName = [string]$sealData.lane_profile_name
    }
    if ($sealData.profile_state) {
      $profileState = [string]$sealData.profile_state
    }
    if ($sealData.launch_command) {
      $launchCommand = [string]$sealData.launch_command
    }
    if ($sealData.thread_start_guidance) {
      $threadStartGuidance = @($sealData.thread_start_guidance)
    }
    if ($sealData.archival_manifest) {
      $archivalManifest = @($sealData.archival_manifest)
    }
    if ($sealData.handoff_warrant) {
      $handoffWarrant = @($sealData.handoff_warrant)
    }
    if ($sealData.operator_dispatch_bundle) {
      $operatorDispatchBundle = @($sealData.operator_dispatch_bundle)
    }
    if ($sealData.execution_receipt) {
      $executionReceipt = @($sealData.execution_receipt)
    }
    if ($sealData.operator_continuity_attestation) {
      $operatorContinuityAttestation = @($sealData.operator_continuity_attestation)
    }
    if ($sealData.dispatch_readiness_seal) {
      $dispatchReadinessSeal = @($sealData.dispatch_readiness_seal)
    }
    if ($sealData.operator_runbook_attestation) {
      $operatorRunbookAttestation = @($sealData.operator_runbook_attestation)
    }
    if ($sealData.lane_launch_readiness_warrant) {
      $laneLaunchReadinessWarrant = @($sealData.lane_launch_readiness_warrant)
    }
    if ($sealData.operator_activation_receipt) {
      $operatorActivationReceipt = @($sealData.operator_activation_receipt)
    }
    if ($sealData.lane_continuity_warrant) {
      $laneContinuityWarrant = @($sealData.lane_continuity_warrant)
    }
    if ($sealData.operator_stewardship_receipt) {
      $operatorStewardshipReceipt = @($sealData.operator_stewardship_receipt)
    }
    if ($sealData.lane_custody_attestation) {
      $laneCustodyAttestation = @($sealData.lane_custody_attestation)
    }
    if ($sealData.operator_handoff_seal) {
      $operatorHandoffSeal = @($sealData.operator_handoff_seal)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'operator_handoff_seal_report_parse_failed' -Message "Unable to parse operator handoff seal report JSON: $($_.Exception.Message)" -Path $SealReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'operator_handoff_seal_report_missing' -Message 'Operator handoff seal report missing after seal execution.' -Path $SealReportPath
}

$laneCustodyLedger = @(
  'lane_custody_ledger_basis=operator_handoff_seal',
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "archival_manifest_count=$(@($archivalManifest).Count)",
  "handoff_warrant_count=$(@($handoffWarrant).Count)",
  "operator_dispatch_bundle_count=$(@($operatorDispatchBundle).Count)",
  "execution_receipt_count=$(@($executionReceipt).Count)",
  "operator_continuity_attestation_count=$(@($operatorContinuityAttestation).Count)",
  "dispatch_readiness_seal_count=$(@($dispatchReadinessSeal).Count)",
  "operator_runbook_attestation_count=$(@($operatorRunbookAttestation).Count)",
  "lane_launch_readiness_warrant_count=$(@($laneLaunchReadinessWarrant).Count)",
  "operator_activation_receipt_count=$(@($operatorActivationReceipt).Count)",
  "lane_continuity_warrant_count=$(@($laneContinuityWarrant).Count)",
  "operator_stewardship_receipt_count=$(@($operatorStewardshipReceipt).Count)",
  "lane_custody_attestation_count=$(@($laneCustodyAttestation).Count)",
  "operator_handoff_seal_count=$(@($operatorHandoffSeal).Count)",
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  'lane_custody_ledger_note=Lane custody ledger is recorded as local governance evidence only.'
)

$laneCustodyLedgerComplete = (
  $operatorHandoffSealState -eq 'ready' -and
  $operatorHandoffSealComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  @($archivalManifest).Count -gt 0 -and
  @($handoffWarrant).Count -gt 0 -and
  @($operatorDispatchBundle).Count -gt 0 -and
  @($executionReceipt).Count -gt 0 -and
  @($operatorContinuityAttestation).Count -gt 0 -and
  @($dispatchReadinessSeal).Count -gt 0 -and
  @($operatorRunbookAttestation).Count -gt 0 -and
  @($laneLaunchReadinessWarrant).Count -gt 0 -and
  @($operatorActivationReceipt).Count -gt 0 -and
  @($laneContinuityWarrant).Count -gt 0 -and
  @($operatorStewardshipReceipt).Count -gt 0 -and
  @($laneCustodyAttestation).Count -gt 0 -and
  @($operatorHandoffSeal).Count -gt 0 -and
  @($laneCustodyLedger).Count -gt 0 -and
  [bool]$OperatorAcknowledged
)

if (-not $laneCustodyLedgerComplete) {
  $laneCustodyLedgerState = 'attention_required'
  $recommendedAction = 'repair_operator_handoff_seal_and_rebuild_lane_custody_ledger'
  Add-Finding -Severity 'warning' -Code 'lane_custody_ledger_not_ready' -Message 'Operator handoff seal lane custody ledger checks failed.' -Path $SealReportPath
}

$report = [ordered]@{
  ledgered_at = $now.ToString('o')
  repo_root = $RepoRoot
  ledger_name = $LedgerName
  operator_acknowledged = [bool]$OperatorAcknowledged
  lane_custody_ledger_state = $laneCustodyLedgerState
  lane_custody_ledger_complete = $laneCustodyLedgerComplete
  recommended_action = $recommendedAction
  seal_script_path = $SealScriptPath
  seal_report_path = $SealReportPath
  seal_ran = $sealRan
  operator_handoff_seal_state = $operatorHandoffSealState
  operator_handoff_seal_complete = $operatorHandoffSealComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  archival_manifest = $archivalManifest
  handoff_warrant = $handoffWarrant
  operator_dispatch_bundle = $operatorDispatchBundle
  execution_receipt = $executionReceipt
  operator_continuity_attestation = $operatorContinuityAttestation
  dispatch_readiness_seal = $dispatchReadinessSeal
  operator_runbook_attestation = $operatorRunbookAttestation
  lane_launch_readiness_warrant = $laneLaunchReadinessWarrant
  operator_activation_receipt = $operatorActivationReceipt
  lane_continuity_warrant = $laneContinuityWarrant
  operator_stewardship_receipt = $operatorStewardshipReceipt
  lane_custody_attestation = $laneCustodyAttestation
  operator_handoff_seal = $operatorHandoffSeal
  lane_custody_ledger = $laneCustodyLedger
  local_only_note = 'Operator handoff seal lane custody ledger is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "ledgered_at=$($report.ledgered_at)"
  "ledger_name=$LedgerName"
  "lane_custody_ledger_state=$laneCustodyLedgerState"
  "lane_custody_ledger_complete=$laneCustodyLedgerComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "operator_handoff_seal_state=$operatorHandoffSealState"
  "operator_handoff_seal_complete=$operatorHandoffSealComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
