param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$CustodyScriptPath = '',
  [string]$CustodyReportPath = '',
  [string]$SealName = 'lane_custody_attestation_operator_handoff_seal',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $CustodyScriptPath) {
  $CustodyScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Stewardship-Receipt-Lane-Custody-Attestation.ps1'
}
if (-not $CustodyReportPath) {
  $CustodyReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-stewardship-receipt-lane-custody-attestation.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-lane-custody-attestation-operator-handoff-seal.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-lane-custody-attestation-operator-handoff-seal.txt'
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

$laneCustodyAttestationState = 'missing'
$laneCustodyAttestationComplete = $false
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
$operatorHandoffSealState = 'ready'
$operatorHandoffSealComplete = $false
$recommendedAction = 'publish_lane_custody_attestation_operator_handoff_seal'
$custodyRan = $false

if (-not (Test-Path $CustodyScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'lane_custody_attestation_script_missing' -Message 'Operator stewardship receipt lane custody attestation script missing.' -Path $CustodyScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $CustodyScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $custodyRan = ($LASTEXITCODE -eq 0)
  if (-not $custodyRan) {
    Add-Finding -Severity 'warning' -Code 'lane_custody_attestation_execution_failed' -Message 'Lane custody attestation execution failed.' -Path $CustodyScriptPath
  }
}

if (Test-Path $CustodyReportPath) {
  try {
    $custodyData = Get-Content -Path $CustodyReportPath -Raw | ConvertFrom-Json
    if ($custodyData.lane_custody_attestation_state) {
      $laneCustodyAttestationState = [string]$custodyData.lane_custody_attestation_state
    }
    if ($null -ne $custodyData.lane_custody_attestation_complete) {
      $laneCustodyAttestationComplete = [bool]$custodyData.lane_custody_attestation_complete
    }
    if ($custodyData.lane_profile_name) {
      $laneProfileName = [string]$custodyData.lane_profile_name
    }
    if ($custodyData.profile_state) {
      $profileState = [string]$custodyData.profile_state
    }
    if ($custodyData.launch_command) {
      $launchCommand = [string]$custodyData.launch_command
    }
    if ($custodyData.thread_start_guidance) {
      $threadStartGuidance = @($custodyData.thread_start_guidance)
    }
    if ($custodyData.archival_manifest) {
      $archivalManifest = @($custodyData.archival_manifest)
    }
    if ($custodyData.handoff_warrant) {
      $handoffWarrant = @($custodyData.handoff_warrant)
    }
    if ($custodyData.operator_dispatch_bundle) {
      $operatorDispatchBundle = @($custodyData.operator_dispatch_bundle)
    }
    if ($custodyData.execution_receipt) {
      $executionReceipt = @($custodyData.execution_receipt)
    }
    if ($custodyData.operator_continuity_attestation) {
      $operatorContinuityAttestation = @($custodyData.operator_continuity_attestation)
    }
    if ($custodyData.dispatch_readiness_seal) {
      $dispatchReadinessSeal = @($custodyData.dispatch_readiness_seal)
    }
    if ($custodyData.operator_runbook_attestation) {
      $operatorRunbookAttestation = @($custodyData.operator_runbook_attestation)
    }
    if ($custodyData.lane_launch_readiness_warrant) {
      $laneLaunchReadinessWarrant = @($custodyData.lane_launch_readiness_warrant)
    }
    if ($custodyData.operator_activation_receipt) {
      $operatorActivationReceipt = @($custodyData.operator_activation_receipt)
    }
    if ($custodyData.lane_continuity_warrant) {
      $laneContinuityWarrant = @($custodyData.lane_continuity_warrant)
    }
    if ($custodyData.operator_stewardship_receipt) {
      $operatorStewardshipReceipt = @($custodyData.operator_stewardship_receipt)
    }
    if ($custodyData.lane_custody_attestation) {
      $laneCustodyAttestation = @($custodyData.lane_custody_attestation)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'lane_custody_attestation_report_parse_failed' -Message "Unable to parse lane custody attestation report JSON: $($_.Exception.Message)" -Path $CustodyReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'lane_custody_attestation_report_missing' -Message 'Lane custody attestation report missing after custody execution.' -Path $CustodyReportPath
}

$operatorHandoffSeal = @(
  'operator_handoff_seal_basis=lane_custody_attestation',
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
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  'operator_handoff_seal_note=Operator handoff seal is recorded as local governance evidence only.'
)

$operatorHandoffSealComplete = (
  $laneCustodyAttestationState -eq 'ready' -and
  $laneCustodyAttestationComplete -and
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
  [bool]$OperatorAcknowledged
)

if (-not $operatorHandoffSealComplete) {
  $operatorHandoffSealState = 'attention_required'
  $recommendedAction = 'repair_lane_custody_attestation_and_rebuild_operator_handoff_seal'
  Add-Finding -Severity 'warning' -Code 'operator_handoff_seal_not_ready' -Message 'Lane custody attestation operator handoff seal checks failed.' -Path $CustodyReportPath
}

$report = [ordered]@{
  sealed_at = $now.ToString('o')
  repo_root = $RepoRoot
  seal_name = $SealName
  operator_acknowledged = [bool]$OperatorAcknowledged
  operator_handoff_seal_state = $operatorHandoffSealState
  operator_handoff_seal_complete = $operatorHandoffSealComplete
  recommended_action = $recommendedAction
  custody_script_path = $CustodyScriptPath
  custody_report_path = $CustodyReportPath
  custody_ran = $custodyRan
  lane_custody_attestation_state = $laneCustodyAttestationState
  lane_custody_attestation_complete = $laneCustodyAttestationComplete
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
  local_only_note = 'Lane custody attestation operator handoff seal is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "sealed_at=$($report.sealed_at)"
  "seal_name=$SealName"
  "operator_handoff_seal_state=$operatorHandoffSealState"
  "operator_handoff_seal_complete=$operatorHandoffSealComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "lane_custody_attestation_state=$laneCustodyAttestationState"
  "lane_custody_attestation_complete=$laneCustodyAttestationComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
