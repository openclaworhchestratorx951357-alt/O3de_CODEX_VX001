param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$StewardshipScriptPath = '',
  [string]$StewardshipReportPath = '',
  [string]$AttestationName = 'operator_stewardship_receipt_lane_custody_attestation',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $StewardshipScriptPath) {
  $StewardshipScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Lane-Continuity-Warrant-Operator-Stewardship-Receipt.ps1'
}
if (-not $StewardshipReportPath) {
  $StewardshipReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-lane-continuity-warrant-operator-stewardship-receipt.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-stewardship-receipt-lane-custody-attestation.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-stewardship-receipt-lane-custody-attestation.txt'
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

$stewardshipReceiptState = 'missing'
$stewardshipReceiptComplete = $false
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
$laneCustodyAttestationState = 'ready'
$laneCustodyAttestationComplete = $false
$recommendedAction = 'publish_operator_stewardship_receipt_lane_custody_attestation'
$stewardshipRan = $false

if (-not (Test-Path $StewardshipScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'operator_stewardship_receipt_script_missing' -Message 'Lane continuity warrant operator stewardship receipt script missing.' -Path $StewardshipScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $StewardshipScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $stewardshipRan = ($LASTEXITCODE -eq 0)
  if (-not $stewardshipRan) {
    Add-Finding -Severity 'warning' -Code 'operator_stewardship_receipt_execution_failed' -Message 'Operator stewardship receipt execution failed.' -Path $StewardshipScriptPath
  }
}

if (Test-Path $StewardshipReportPath) {
  try {
    $stewardshipData = Get-Content -Path $StewardshipReportPath -Raw | ConvertFrom-Json
    if ($stewardshipData.stewardship_receipt_state) {
      $stewardshipReceiptState = [string]$stewardshipData.stewardship_receipt_state
    }
    if ($null -ne $stewardshipData.stewardship_receipt_complete) {
      $stewardshipReceiptComplete = [bool]$stewardshipData.stewardship_receipt_complete
    }
    if ($stewardshipData.lane_profile_name) {
      $laneProfileName = [string]$stewardshipData.lane_profile_name
    }
    if ($stewardshipData.profile_state) {
      $profileState = [string]$stewardshipData.profile_state
    }
    if ($stewardshipData.launch_command) {
      $launchCommand = [string]$stewardshipData.launch_command
    }
    if ($stewardshipData.thread_start_guidance) {
      $threadStartGuidance = @($stewardshipData.thread_start_guidance)
    }
    if ($stewardshipData.archival_manifest) {
      $archivalManifest = @($stewardshipData.archival_manifest)
    }
    if ($stewardshipData.handoff_warrant) {
      $handoffWarrant = @($stewardshipData.handoff_warrant)
    }
    if ($stewardshipData.operator_dispatch_bundle) {
      $operatorDispatchBundle = @($stewardshipData.operator_dispatch_bundle)
    }
    if ($stewardshipData.execution_receipt) {
      $executionReceipt = @($stewardshipData.execution_receipt)
    }
    if ($stewardshipData.operator_continuity_attestation) {
      $operatorContinuityAttestation = @($stewardshipData.operator_continuity_attestation)
    }
    if ($stewardshipData.dispatch_readiness_seal) {
      $dispatchReadinessSeal = @($stewardshipData.dispatch_readiness_seal)
    }
    if ($stewardshipData.operator_runbook_attestation) {
      $operatorRunbookAttestation = @($stewardshipData.operator_runbook_attestation)
    }
    if ($stewardshipData.lane_launch_readiness_warrant) {
      $laneLaunchReadinessWarrant = @($stewardshipData.lane_launch_readiness_warrant)
    }
    if ($stewardshipData.operator_activation_receipt) {
      $operatorActivationReceipt = @($stewardshipData.operator_activation_receipt)
    }
    if ($stewardshipData.lane_continuity_warrant) {
      $laneContinuityWarrant = @($stewardshipData.lane_continuity_warrant)
    }
    if ($stewardshipData.operator_stewardship_receipt) {
      $operatorStewardshipReceipt = @($stewardshipData.operator_stewardship_receipt)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'operator_stewardship_receipt_report_parse_failed' -Message "Unable to parse operator stewardship receipt report JSON: $($_.Exception.Message)" -Path $StewardshipReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'operator_stewardship_receipt_report_missing' -Message 'Operator stewardship receipt report missing after stewardship execution.' -Path $StewardshipReportPath
}

$laneCustodyAttestation = @(
  'lane_custody_attestation_basis=operator_stewardship_receipt',
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
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  'lane_custody_attestation_note=Lane custody attestation is recorded as local governance evidence only.'
)

$laneCustodyAttestationComplete = (
  $stewardshipReceiptState -eq 'ready' -and
  $stewardshipReceiptComplete -and
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
  [bool]$OperatorAcknowledged
)

if (-not $laneCustodyAttestationComplete) {
  $laneCustodyAttestationState = 'attention_required'
  $recommendedAction = 'repair_operator_stewardship_receipt_and_rebuild_lane_custody_attestation'
  Add-Finding -Severity 'warning' -Code 'lane_custody_attestation_not_ready' -Message 'Operator stewardship receipt lane custody attestation checks failed.' -Path $StewardshipReportPath
}

$report = [ordered]@{
  attested_at = $now.ToString('o')
  repo_root = $RepoRoot
  attestation_name = $AttestationName
  operator_acknowledged = [bool]$OperatorAcknowledged
  lane_custody_attestation_state = $laneCustodyAttestationState
  lane_custody_attestation_complete = $laneCustodyAttestationComplete
  recommended_action = $recommendedAction
  stewardship_script_path = $StewardshipScriptPath
  stewardship_report_path = $StewardshipReportPath
  stewardship_ran = $stewardshipRan
  stewardship_receipt_state = $stewardshipReceiptState
  stewardship_receipt_complete = $stewardshipReceiptComplete
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
  local_only_note = 'Operator stewardship receipt lane custody attestation is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "attested_at=$($report.attested_at)"
  "attestation_name=$AttestationName"
  "lane_custody_attestation_state=$laneCustodyAttestationState"
  "lane_custody_attestation_complete=$laneCustodyAttestationComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "stewardship_receipt_state=$stewardshipReceiptState"
  "stewardship_receipt_complete=$stewardshipReceiptComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
