param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$RunbookScriptPath = '',
  [string]$RunbookReportPath = '',
  [string]$WarrantName = 'operator_runbook_attestation_lane_launch_readiness_warrant',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $RunbookScriptPath) {
  $RunbookScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Dispatch-Readiness-Seal-Operator-Runbook-Attestation.ps1'
}
if (-not $RunbookReportPath) {
  $RunbookReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-dispatch-readiness-seal-operator-runbook-attestation.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-runbook-attestation-lane-launch-readiness-warrant.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-runbook-attestation-lane-launch-readiness-warrant.txt'
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

$runbookAttestationState = 'missing'
$runbookAttestationComplete = $false
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
$warrantState = 'ready'
$warrantComplete = $false
$recommendedAction = 'publish_operator_runbook_attestation_lane_launch_readiness_warrant'
$runbookRan = $false

if (-not (Test-Path $RunbookScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'operator_runbook_attestation_script_missing' -Message 'Dispatch readiness seal operator runbook attestation script missing.' -Path $RunbookScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $RunbookScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $runbookRan = ($LASTEXITCODE -eq 0)
  if (-not $runbookRan) {
    Add-Finding -Severity 'warning' -Code 'operator_runbook_attestation_execution_failed' -Message 'Dispatch readiness seal operator runbook attestation execution failed.' -Path $RunbookScriptPath
  }
}

if (Test-Path $RunbookReportPath) {
  try {
    $runbookData = Get-Content -Path $RunbookReportPath -Raw | ConvertFrom-Json
    if ($runbookData.runbook_attestation_state) {
      $runbookAttestationState = [string]$runbookData.runbook_attestation_state
    }
    if ($null -ne $runbookData.runbook_attestation_complete) {
      $runbookAttestationComplete = [bool]$runbookData.runbook_attestation_complete
    }
    if ($runbookData.lane_profile_name) {
      $laneProfileName = [string]$runbookData.lane_profile_name
    }
    if ($runbookData.profile_state) {
      $profileState = [string]$runbookData.profile_state
    }
    if ($runbookData.launch_command) {
      $launchCommand = [string]$runbookData.launch_command
    }
    if ($runbookData.thread_start_guidance) {
      $threadStartGuidance = @($runbookData.thread_start_guidance)
    }
    if ($runbookData.archival_manifest) {
      $archivalManifest = @($runbookData.archival_manifest)
    }
    if ($runbookData.handoff_warrant) {
      $handoffWarrant = @($runbookData.handoff_warrant)
    }
    if ($runbookData.operator_dispatch_bundle) {
      $operatorDispatchBundle = @($runbookData.operator_dispatch_bundle)
    }
    if ($runbookData.execution_receipt) {
      $executionReceipt = @($runbookData.execution_receipt)
    }
    if ($runbookData.operator_continuity_attestation) {
      $operatorContinuityAttestation = @($runbookData.operator_continuity_attestation)
    }
    if ($runbookData.dispatch_readiness_seal) {
      $dispatchReadinessSeal = @($runbookData.dispatch_readiness_seal)
    }
    if ($runbookData.operator_runbook_attestation) {
      $operatorRunbookAttestation = @($runbookData.operator_runbook_attestation)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'operator_runbook_attestation_report_parse_failed' -Message "Unable to parse operator runbook attestation report JSON: $($_.Exception.Message)" -Path $RunbookReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'operator_runbook_attestation_report_missing' -Message 'Operator runbook attestation report missing after runbook execution.' -Path $RunbookReportPath
}

$laneLaunchReadinessWarrant = @(
  "warrant_basis=dispatch_readiness_seal_operator_runbook_attestation",
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
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  "launch_readiness_warrant_note=Lane launch readiness warrant is recorded as local governance evidence only."
)

$warrantComplete = (
  $runbookAttestationState -eq 'ready' -and
  $runbookAttestationComplete -and
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
  [bool]$OperatorAcknowledged
)

if (-not $warrantComplete) {
  $warrantState = 'attention_required'
  $recommendedAction = 'repair_operator_runbook_attestation_and_rebuild_lane_launch_readiness_warrant'
  Add-Finding -Severity 'warning' -Code 'lane_launch_readiness_warrant_not_ready' -Message 'Operator runbook attestation lane launch readiness warrant checks failed.' -Path $RunbookReportPath
}

$report = [ordered]@{
  warranted_at = $now.ToString('o')
  repo_root = $RepoRoot
  warrant_name = $WarrantName
  operator_acknowledged = [bool]$OperatorAcknowledged
  warrant_state = $warrantState
  warrant_complete = $warrantComplete
  recommended_action = $recommendedAction
  runbook_script_path = $RunbookScriptPath
  runbook_report_path = $RunbookReportPath
  runbook_ran = $runbookRan
  runbook_attestation_state = $runbookAttestationState
  runbook_attestation_complete = $runbookAttestationComplete
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
  local_only_note = 'Operator runbook attestation lane launch readiness warrant is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 12
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "warranted_at=$($report.warranted_at)"
  "warrant_name=$WarrantName"
  "warrant_state=$warrantState"
  "warrant_complete=$warrantComplete"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "runbook_attestation_state=$runbookAttestationState"
  "runbook_attestation_complete=$runbookAttestationComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
