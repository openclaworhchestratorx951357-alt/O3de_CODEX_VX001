param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$SealScriptPath = '',
  [string]$SealReportPath = '',
  [string]$RunbookAttestationName = 'dispatch_readiness_seal_operator_runbook_attestation',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $SealScriptPath) {
  $SealScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Continuity-Attestation-Dispatch-Readiness-Seal.ps1'
}
if (-not $SealReportPath) {
  $SealReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-continuity-attestation-dispatch-readiness-seal.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-dispatch-readiness-seal-operator-runbook-attestation.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-dispatch-readiness-seal-operator-runbook-attestation.txt'
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

$sealState = 'missing'
$sealComplete = $false
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
$runbookAttestationState = 'ready'
$runbookAttestationComplete = $false
$recommendedAction = 'publish_dispatch_readiness_seal_operator_runbook_attestation'
$sealRan = $false

if (-not (Test-Path $SealScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'dispatch_readiness_seal_script_missing' -Message 'Operator continuity attestation dispatch readiness seal script missing.' -Path $SealScriptPath
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
    Add-Finding -Severity 'warning' -Code 'dispatch_readiness_seal_execution_failed' -Message 'Dispatch readiness seal execution failed.' -Path $SealScriptPath
  }
}

if (Test-Path $SealReportPath) {
  try {
    $sealData = Get-Content -Path $SealReportPath -Raw | ConvertFrom-Json
    if ($sealData.seal_state) {
      $sealState = [string]$sealData.seal_state
    }
    if ($null -ne $sealData.seal_complete) {
      $sealComplete = [bool]$sealData.seal_complete
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
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'dispatch_readiness_seal_report_parse_failed' -Message "Unable to parse dispatch readiness seal report JSON: $($_.Exception.Message)" -Path $SealReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'dispatch_readiness_seal_report_missing' -Message 'Dispatch readiness seal report missing after seal execution.' -Path $SealReportPath
}

$operatorRunbookAttestation = @(
  "runbook_attestation_basis=operator_continuity_attestation_dispatch_readiness_seal",
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
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  "runbook_attestation_note=Operator runbook attestation is recorded as local governance evidence only."
)

$runbookAttestationComplete = (
  $sealState -eq 'ready' -and
  $sealComplete -and
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
  [bool]$OperatorAcknowledged
)

if (-not $runbookAttestationComplete) {
  $runbookAttestationState = 'attention_required'
  $recommendedAction = 'repair_dispatch_readiness_seal_and_rebuild_operator_runbook_attestation'
  Add-Finding -Severity 'warning' -Code 'operator_runbook_attestation_not_ready' -Message 'Dispatch readiness seal operator runbook attestation checks failed.' -Path $SealReportPath
}

$report = [ordered]@{
  attested_at = $now.ToString('o')
  repo_root = $RepoRoot
  runbook_attestation_name = $RunbookAttestationName
  operator_acknowledged = [bool]$OperatorAcknowledged
  runbook_attestation_state = $runbookAttestationState
  runbook_attestation_complete = $runbookAttestationComplete
  recommended_action = $recommendedAction
  seal_script_path = $SealScriptPath
  seal_report_path = $SealReportPath
  seal_ran = $sealRan
  seal_state = $sealState
  seal_complete = $sealComplete
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
  local_only_note = 'Dispatch readiness seal operator runbook attestation is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "attested_at=$($report.attested_at)"
  "runbook_attestation_name=$RunbookAttestationName"
  "runbook_attestation_state=$runbookAttestationState"
  "runbook_attestation_complete=$runbookAttestationComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "seal_state=$sealState"
  "seal_complete=$sealComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
