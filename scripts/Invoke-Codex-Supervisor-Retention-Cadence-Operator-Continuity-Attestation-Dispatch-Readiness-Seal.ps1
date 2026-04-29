param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$AttestationScriptPath = '',
  [string]$AttestationReportPath = '',
  [string]$SealName = 'operator_continuity_attestation_dispatch_readiness_seal',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $AttestationScriptPath) {
  $AttestationScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Execution-Receipt-Operator-Continuity-Attestation.ps1'
}
if (-not $AttestationReportPath) {
  $AttestationReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-execution-receipt-operator-continuity-attestation.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-continuity-attestation-dispatch-readiness-seal.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-continuity-attestation-dispatch-readiness-seal.txt'
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
$archivalManifest = @()
$handoffWarrant = @()
$operatorDispatchBundle = @()
$executionReceipt = @()
$operatorContinuityAttestation = @()
$sealState = 'ready'
$sealComplete = $false
$recommendedAction = 'publish_operator_continuity_attestation_dispatch_readiness_seal'
$attestationRan = $false

if (-not (Test-Path $AttestationScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'continuity_attestation_script_missing' -Message 'Execution receipt operator continuity attestation script missing.' -Path $AttestationScriptPath
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
    Add-Finding -Severity 'warning' -Code 'continuity_attestation_execution_failed' -Message 'Execution receipt operator continuity attestation execution failed.' -Path $AttestationScriptPath
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
    if ($attestationData.archival_manifest) {
      $archivalManifest = @($attestationData.archival_manifest)
    }
    if ($attestationData.handoff_warrant) {
      $handoffWarrant = @($attestationData.handoff_warrant)
    }
    if ($attestationData.operator_dispatch_bundle) {
      $operatorDispatchBundle = @($attestationData.operator_dispatch_bundle)
    }
    if ($attestationData.execution_receipt) {
      $executionReceipt = @($attestationData.execution_receipt)
    }
    if ($attestationData.operator_continuity_attestation) {
      $operatorContinuityAttestation = @($attestationData.operator_continuity_attestation)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'continuity_attestation_report_parse_failed' -Message "Unable to parse continuity attestation report JSON: $($_.Exception.Message)" -Path $AttestationReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'continuity_attestation_report_missing' -Message 'Continuity attestation report missing after attestation execution.' -Path $AttestationReportPath
}

$dispatchReadinessSeal = @(
  "seal_basis=execution_receipt_operator_continuity_attestation",
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "archival_manifest_count=$(@($archivalManifest).Count)",
  "handoff_warrant_count=$(@($handoffWarrant).Count)",
  "operator_dispatch_bundle_count=$(@($operatorDispatchBundle).Count)",
  "execution_receipt_count=$(@($executionReceipt).Count)",
  "operator_continuity_attestation_count=$(@($operatorContinuityAttestation).Count)",
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  "readiness_seal_note=Dispatch readiness is affirmed as local governance evidence only."
)

$sealComplete = (
  $attestationState -eq 'ready' -and
  $attestationComplete -and
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
  [bool]$OperatorAcknowledged
)

if (-not $sealComplete) {
  $sealState = 'attention_required'
  $recommendedAction = 'repair_operator_continuity_attestation_and_rebuild_dispatch_readiness_seal'
  Add-Finding -Severity 'warning' -Code 'dispatch_readiness_seal_not_ready' -Message 'Operator continuity attestation dispatch readiness seal checks failed.' -Path $AttestationReportPath
}

$report = [ordered]@{
  sealed_at = $now.ToString('o')
  repo_root = $RepoRoot
  seal_name = $SealName
  operator_acknowledged = [bool]$OperatorAcknowledged
  seal_state = $sealState
  seal_complete = $sealComplete
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
  archival_manifest = $archivalManifest
  handoff_warrant = $handoffWarrant
  operator_dispatch_bundle = $operatorDispatchBundle
  execution_receipt = $executionReceipt
  operator_continuity_attestation = $operatorContinuityAttestation
  dispatch_readiness_seal = $dispatchReadinessSeal
  local_only_note = 'Operator continuity attestation dispatch readiness seal is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "sealed_at=$($report.sealed_at)"
  "seal_name=$SealName"
  "seal_state=$sealState"
  "seal_complete=$sealComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "attestation_state=$attestationState"
  "attestation_complete=$attestationComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
