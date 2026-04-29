param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$ReceiptScriptPath = '',
  [string]$ReceiptReportPath = '',
  [string]$AttestationName = 'execution_receipt_operator_continuity_attestation',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ReceiptScriptPath) {
  $ReceiptScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Dispatch-Bundle-Execution-Receipt.ps1'
}
if (-not $ReceiptReportPath) {
  $ReceiptReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-dispatch-bundle-execution-receipt.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-execution-receipt-operator-continuity-attestation.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-execution-receipt-operator-continuity-attestation.txt'
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
$attestationState = 'ready'
$attestationComplete = $false
$recommendedAction = 'publish_execution_receipt_operator_continuity_attestation'
$receiptRan = $false

if (-not (Test-Path $ReceiptScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'execution_receipt_script_missing' -Message 'Operator dispatch bundle execution receipt script missing.' -Path $ReceiptScriptPath
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
    Add-Finding -Severity 'warning' -Code 'execution_receipt_execution_failed' -Message 'Operator dispatch bundle execution receipt execution failed.' -Path $ReceiptScriptPath
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
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'execution_receipt_report_parse_failed' -Message "Unable to parse execution receipt report JSON: $($_.Exception.Message)" -Path $ReceiptReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'execution_receipt_report_missing' -Message 'Execution receipt report missing after receipt execution.' -Path $ReceiptReportPath
}

$operatorContinuityAttestation = @(
  "attestation_basis=operator_dispatch_bundle_execution_receipt",
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "archival_manifest_count=$(@($archivalManifest).Count)",
  "handoff_warrant_count=$(@($handoffWarrant).Count)",
  "operator_dispatch_bundle_count=$(@($operatorDispatchBundle).Count)",
  "execution_receipt_count=$(@($executionReceipt).Count)",
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  "continuity_attestation_note=Execution receipt continuity is captured as local governance evidence only."
)

$attestationComplete = (
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
  [bool]$OperatorAcknowledged
)

if (-not $attestationComplete) {
  $attestationState = 'attention_required'
  $recommendedAction = 'repair_execution_receipt_and_rebuild_operator_continuity_attestation'
  Add-Finding -Severity 'warning' -Code 'operator_continuity_attestation_not_ready' -Message 'Execution receipt operator continuity attestation checks failed.' -Path $ReceiptReportPath
}

$report = [ordered]@{
  attested_at = $now.ToString('o')
  repo_root = $RepoRoot
  attestation_name = $AttestationName
  operator_acknowledged = [bool]$OperatorAcknowledged
  attestation_state = $attestationState
  attestation_complete = $attestationComplete
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
  local_only_note = 'Execution receipt operator continuity attestation is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "attested_at=$($report.attested_at)"
  "attestation_name=$AttestationName"
  "attestation_state=$attestationState"
  "attestation_complete=$attestationComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "receipt_state=$receiptState"
  "receipt_complete=$receiptComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
