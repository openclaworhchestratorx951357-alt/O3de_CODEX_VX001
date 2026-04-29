param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$WarrantScriptPath = '',
  [string]$WarrantReportPath = '',
  [string]$ReceiptName = 'lane_launch_readiness_warrant_operator_activation_receipt',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $WarrantScriptPath) {
  $WarrantScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Runbook-Attestation-Lane-Launch-Readiness-Warrant.ps1'
}
if (-not $WarrantReportPath) {
  $WarrantReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-runbook-attestation-lane-launch-readiness-warrant.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-lane-launch-readiness-warrant-operator-activation-receipt.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-lane-launch-readiness-warrant-operator-activation-receipt.txt'
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

$warrantState = 'missing'
$warrantComplete = $false
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
$receiptState = 'ready'
$receiptComplete = $false
$recommendedAction = 'publish_lane_launch_readiness_warrant_operator_activation_receipt'
$warrantRan = $false

if (-not (Test-Path $WarrantScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'lane_launch_readiness_warrant_script_missing' -Message 'Operator runbook attestation lane launch readiness warrant script missing.' -Path $WarrantScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $WarrantScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $warrantRan = ($LASTEXITCODE -eq 0)
  if (-not $warrantRan) {
    Add-Finding -Severity 'warning' -Code 'lane_launch_readiness_warrant_execution_failed' -Message 'Lane launch readiness warrant execution failed.' -Path $WarrantScriptPath
  }
}

if (Test-Path $WarrantReportPath) {
  try {
    $warrantData = Get-Content -Path $WarrantReportPath -Raw | ConvertFrom-Json
    if ($warrantData.warrant_state) {
      $warrantState = [string]$warrantData.warrant_state
    }
    if ($null -ne $warrantData.warrant_complete) {
      $warrantComplete = [bool]$warrantData.warrant_complete
    }
    if ($warrantData.lane_profile_name) {
      $laneProfileName = [string]$warrantData.lane_profile_name
    }
    if ($warrantData.profile_state) {
      $profileState = [string]$warrantData.profile_state
    }
    if ($warrantData.launch_command) {
      $launchCommand = [string]$warrantData.launch_command
    }
    if ($warrantData.thread_start_guidance) {
      $threadStartGuidance = @($warrantData.thread_start_guidance)
    }
    if ($warrantData.archival_manifest) {
      $archivalManifest = @($warrantData.archival_manifest)
    }
    if ($warrantData.handoff_warrant) {
      $handoffWarrant = @($warrantData.handoff_warrant)
    }
    if ($warrantData.operator_dispatch_bundle) {
      $operatorDispatchBundle = @($warrantData.operator_dispatch_bundle)
    }
    if ($warrantData.execution_receipt) {
      $executionReceipt = @($warrantData.execution_receipt)
    }
    if ($warrantData.operator_continuity_attestation) {
      $operatorContinuityAttestation = @($warrantData.operator_continuity_attestation)
    }
    if ($warrantData.dispatch_readiness_seal) {
      $dispatchReadinessSeal = @($warrantData.dispatch_readiness_seal)
    }
    if ($warrantData.operator_runbook_attestation) {
      $operatorRunbookAttestation = @($warrantData.operator_runbook_attestation)
    }
    if ($warrantData.lane_launch_readiness_warrant) {
      $laneLaunchReadinessWarrant = @($warrantData.lane_launch_readiness_warrant)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'lane_launch_readiness_warrant_report_parse_failed' -Message "Unable to parse lane launch readiness warrant report JSON: $($_.Exception.Message)" -Path $WarrantReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'lane_launch_readiness_warrant_report_missing' -Message 'Lane launch readiness warrant report missing after warrant execution.' -Path $WarrantReportPath
}

$operatorActivationReceipt = @(
  "receipt_basis=operator_runbook_attestation_lane_launch_readiness_warrant",
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
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  "activation_receipt_note=Operator activation receipt is recorded as local governance evidence only."
)

$receiptComplete = (
  $warrantState -eq 'ready' -and
  $warrantComplete -and
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
  [bool]$OperatorAcknowledged
)

if (-not $receiptComplete) {
  $receiptState = 'attention_required'
  $recommendedAction = 'repair_lane_launch_readiness_warrant_and_rebuild_operator_activation_receipt'
  Add-Finding -Severity 'warning' -Code 'operator_activation_receipt_not_ready' -Message 'Lane launch readiness warrant operator activation receipt checks failed.' -Path $WarrantReportPath
}

$report = [ordered]@{
  receipted_at = $now.ToString('o')
  repo_root = $RepoRoot
  receipt_name = $ReceiptName
  operator_acknowledged = [bool]$OperatorAcknowledged
  receipt_state = $receiptState
  receipt_complete = $receiptComplete
  recommended_action = $recommendedAction
  warrant_script_path = $WarrantScriptPath
  warrant_report_path = $WarrantReportPath
  warrant_ran = $warrantRan
  warrant_state = $warrantState
  warrant_complete = $warrantComplete
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
  local_only_note = 'Lane launch readiness warrant operator activation receipt is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "receipted_at=$($report.receipted_at)"
  "receipt_name=$ReceiptName"
  "receipt_state=$receiptState"
  "receipt_complete=$receiptComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "warrant_state=$warrantState"
  "warrant_complete=$warrantComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
