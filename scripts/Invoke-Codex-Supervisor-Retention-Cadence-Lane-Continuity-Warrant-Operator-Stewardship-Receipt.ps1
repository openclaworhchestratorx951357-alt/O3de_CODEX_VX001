param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$WarrantScriptPath = '',
  [string]$WarrantReportPath = '',
  [string]$ReceiptName = 'lane_continuity_warrant_operator_stewardship_receipt',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $WarrantScriptPath) {
  $WarrantScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Activation-Receipt-Lane-Continuity-Warrant.ps1'
}
if (-not $WarrantReportPath) {
  $WarrantReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-activation-receipt-lane-continuity-warrant.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-lane-continuity-warrant-operator-stewardship-receipt.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-lane-continuity-warrant-operator-stewardship-receipt.txt'
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

$continuityWarrantState = 'missing'
$continuityWarrantComplete = $false
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
$stewardshipReceiptState = 'ready'
$stewardshipReceiptComplete = $false
$recommendedAction = 'publish_lane_continuity_warrant_operator_stewardship_receipt'
$warrantRan = $false

if (-not (Test-Path $WarrantScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'lane_continuity_warrant_script_missing' -Message 'Operator activation receipt lane continuity warrant script missing.' -Path $WarrantScriptPath
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
    Add-Finding -Severity 'warning' -Code 'lane_continuity_warrant_execution_failed' -Message 'Lane continuity warrant execution failed.' -Path $WarrantScriptPath
  }
}

if (Test-Path $WarrantReportPath) {
  try {
    $warrantData = Get-Content -Path $WarrantReportPath -Raw | ConvertFrom-Json
    if ($warrantData.continuity_warrant_state) {
      $continuityWarrantState = [string]$warrantData.continuity_warrant_state
    }
    if ($null -ne $warrantData.continuity_warrant_complete) {
      $continuityWarrantComplete = [bool]$warrantData.continuity_warrant_complete
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
    if ($warrantData.operator_activation_receipt) {
      $operatorActivationReceipt = @($warrantData.operator_activation_receipt)
    }
    if ($warrantData.lane_continuity_warrant) {
      $laneContinuityWarrant = @($warrantData.lane_continuity_warrant)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'lane_continuity_warrant_report_parse_failed' -Message "Unable to parse lane continuity warrant report JSON: $($_.Exception.Message)" -Path $WarrantReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'lane_continuity_warrant_report_missing' -Message 'Lane continuity warrant report missing after warrant execution.' -Path $WarrantReportPath
}

$operatorStewardshipReceipt = @(
  "stewardship_receipt_basis=operator_activation_receipt_lane_continuity_warrant",
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
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  "stewardship_receipt_note=Operator stewardship receipt is recorded as local governance evidence only."
)

$stewardshipReceiptComplete = (
  $continuityWarrantState -eq 'ready' -and
  $continuityWarrantComplete -and
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
  [bool]$OperatorAcknowledged
)

if (-not $stewardshipReceiptComplete) {
  $stewardshipReceiptState = 'attention_required'
  $recommendedAction = 'repair_lane_continuity_warrant_and_rebuild_operator_stewardship_receipt'
  Add-Finding -Severity 'warning' -Code 'operator_stewardship_receipt_not_ready' -Message 'Lane continuity warrant operator stewardship receipt checks failed.' -Path $WarrantReportPath
}

$report = [ordered]@{
  receipted_at = $now.ToString('o')
  repo_root = $RepoRoot
  receipt_name = $ReceiptName
  operator_acknowledged = [bool]$OperatorAcknowledged
  stewardship_receipt_state = $stewardshipReceiptState
  stewardship_receipt_complete = $stewardshipReceiptComplete
  recommended_action = $recommendedAction
  warrant_script_path = $WarrantScriptPath
  warrant_report_path = $WarrantReportPath
  warrant_ran = $warrantRan
  continuity_warrant_state = $continuityWarrantState
  continuity_warrant_complete = $continuityWarrantComplete
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
  local_only_note = 'Lane continuity warrant operator stewardship receipt is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "receipted_at=$($report.receipted_at)"
  "receipt_name=$ReceiptName"
  "stewardship_receipt_state=$stewardshipReceiptState"
  "stewardship_receipt_complete=$stewardshipReceiptComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "continuity_warrant_state=$continuityWarrantState"
  "continuity_warrant_complete=$continuityWarrantComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
