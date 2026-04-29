param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$ReceiptScriptPath = '',
  [string]$ReceiptReportPath = '',
  [string]$WarrantName = 'operator_activation_receipt_lane_continuity_warrant',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ReceiptScriptPath) {
  $ReceiptScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Lane-Launch-Readiness-Warrant-Operator-Activation-Receipt.ps1'
}
if (-not $ReceiptReportPath) {
  $ReceiptReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-lane-launch-readiness-warrant-operator-activation-receipt.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-activation-receipt-lane-continuity-warrant.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-activation-receipt-lane-continuity-warrant.txt'
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

$receiptState = 'missing'
$receiptComplete = $false
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
$continuityWarrantState = 'ready'
$continuityWarrantComplete = $false
$recommendedAction = 'publish_operator_activation_receipt_lane_continuity_warrant'
$receiptRan = $false

if (-not (Test-Path $ReceiptScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'operator_activation_receipt_script_missing' -Message 'Lane launch readiness warrant operator activation receipt script missing.' -Path $ReceiptScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $ReceiptScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $receiptRan = ($LASTEXITCODE -eq 0)
  if (-not $receiptRan) {
    Add-Finding -Severity 'warning' -Code 'operator_activation_receipt_execution_failed' -Message 'Operator activation receipt execution failed.' -Path $ReceiptScriptPath
  }
}

if (Test-Path $ReceiptReportPath) {
  try {
    $receiptData = Get-Content -Path $ReceiptReportPath -Raw | ConvertFrom-Json
    if ($receiptData.receipt_state) {
      $receiptState = [string]$receiptData.receipt_state
    }
    if ($null -ne $receiptData.receipt_complete) {
      $receiptComplete = [bool]$receiptData.receipt_complete
    }
    if ($receiptData.lane_profile_name) {
      $laneProfileName = [string]$receiptData.lane_profile_name
    }
    if ($receiptData.profile_state) {
      $profileState = [string]$receiptData.profile_state
    }
    if ($receiptData.launch_command) {
      $launchCommand = [string]$receiptData.launch_command
    }
    if ($receiptData.thread_start_guidance) {
      $threadStartGuidance = @($receiptData.thread_start_guidance)
    }
    if ($receiptData.archival_manifest) {
      $archivalManifest = @($receiptData.archival_manifest)
    }
    if ($receiptData.handoff_warrant) {
      $handoffWarrant = @($receiptData.handoff_warrant)
    }
    if ($receiptData.operator_dispatch_bundle) {
      $operatorDispatchBundle = @($receiptData.operator_dispatch_bundle)
    }
    if ($receiptData.execution_receipt) {
      $executionReceipt = @($receiptData.execution_receipt)
    }
    if ($receiptData.operator_continuity_attestation) {
      $operatorContinuityAttestation = @($receiptData.operator_continuity_attestation)
    }
    if ($receiptData.dispatch_readiness_seal) {
      $dispatchReadinessSeal = @($receiptData.dispatch_readiness_seal)
    }
    if ($receiptData.operator_runbook_attestation) {
      $operatorRunbookAttestation = @($receiptData.operator_runbook_attestation)
    }
    if ($receiptData.lane_launch_readiness_warrant) {
      $laneLaunchReadinessWarrant = @($receiptData.lane_launch_readiness_warrant)
    }
    if ($receiptData.operator_activation_receipt) {
      $operatorActivationReceipt = @($receiptData.operator_activation_receipt)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'operator_activation_receipt_report_parse_failed' -Message "Unable to parse operator activation receipt report JSON: $($_.Exception.Message)" -Path $ReceiptReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'operator_activation_receipt_report_missing' -Message 'Operator activation receipt report missing after receipt execution.' -Path $ReceiptReportPath
}

$laneContinuityWarrant = @(
  "continuity_warrant_basis=lane_launch_readiness_warrant_operator_activation_receipt",
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
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  "lane_continuity_warrant_note=Lane continuity warrant is recorded as local governance evidence only."
)

$continuityWarrantComplete = (
  $receiptState -eq 'ready' -and
  $receiptComplete -and
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
  [bool]$OperatorAcknowledged
)

if (-not $continuityWarrantComplete) {
  $continuityWarrantState = 'attention_required'
  $recommendedAction = 'repair_operator_activation_receipt_and_rebuild_lane_continuity_warrant'
  Add-Finding -Severity 'warning' -Code 'lane_continuity_warrant_not_ready' -Message 'Operator activation receipt lane continuity warrant checks failed.' -Path $ReceiptReportPath
}

$report = [ordered]@{
  warranted_at = $now.ToString('o')
  repo_root = $RepoRoot
  warrant_name = $WarrantName
  operator_acknowledged = [bool]$OperatorAcknowledged
  continuity_warrant_state = $continuityWarrantState
  continuity_warrant_complete = $continuityWarrantComplete
  recommended_action = $recommendedAction
  receipt_script_path = $ReceiptScriptPath
  receipt_report_path = $ReceiptReportPath
  receipt_ran = $receiptRan
  receipt_state = $receiptState
  receipt_complete = $receiptComplete
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
  local_only_note = 'Operator activation receipt lane continuity warrant is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "warranted_at=$($report.warranted_at)"
  "warrant_name=$WarrantName"
  "continuity_warrant_state=$continuityWarrantState"
  "continuity_warrant_complete=$continuityWarrantComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "receipt_state=$receiptState"
  "receipt_complete=$receiptComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
