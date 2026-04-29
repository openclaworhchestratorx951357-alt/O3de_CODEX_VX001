param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$BundleScriptPath = '',
  [string]$BundleReportPath = '',
  [string]$ReceiptName = 'operator_dispatch_bundle_execution_receipt',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $BundleScriptPath) {
  $BundleScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff-Warrant-Operator-Dispatch-Bundle.ps1'
}
if (-not $BundleReportPath) {
  $BundleReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-handoff-warrant-operator-dispatch-bundle.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-dispatch-bundle-execution-receipt.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-operator-dispatch-bundle-execution-receipt.txt'
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

$bundleState = 'missing'
$bundleComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$archivalManifest = @()
$handoffWarrant = @()
$operatorDispatchBundle = @()
$receiptState = 'ready'
$receiptComplete = $false
$recommendedAction = 'publish_operator_dispatch_bundle_execution_receipt'
$bundleRan = $false

if (-not (Test-Path $BundleScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'dispatch_bundle_script_missing' -Message 'Handoff warrant operator dispatch bundle script missing.' -Path $BundleScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $BundleScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $bundleRan = ($LASTEXITCODE -eq 0)
  if (-not $bundleRan) {
    Add-Finding -Severity 'warning' -Code 'dispatch_bundle_execution_failed' -Message 'Handoff warrant operator dispatch bundle execution failed.' -Path $BundleScriptPath
  }
}

if (Test-Path $BundleReportPath) {
  try {
    $bundleData = Get-Content -Path $BundleReportPath -Raw | ConvertFrom-Json
    if ($bundleData.bundle_state) {
      $bundleState = [string]$bundleData.bundle_state
    }
    if ($null -ne $bundleData.bundle_complete) {
      $bundleComplete = [bool]$bundleData.bundle_complete
    }
    if ($bundleData.lane_profile_name) {
      $laneProfileName = [string]$bundleData.lane_profile_name
    }
    if ($bundleData.profile_state) {
      $profileState = [string]$bundleData.profile_state
    }
    if ($bundleData.launch_command) {
      $launchCommand = [string]$bundleData.launch_command
    }
    if ($bundleData.thread_start_guidance) {
      $threadStartGuidance = @($bundleData.thread_start_guidance)
    }
    if ($bundleData.archival_manifest) {
      $archivalManifest = @($bundleData.archival_manifest)
    }
    if ($bundleData.handoff_warrant) {
      $handoffWarrant = @($bundleData.handoff_warrant)
    }
    if ($bundleData.operator_dispatch_bundle) {
      $operatorDispatchBundle = @($bundleData.operator_dispatch_bundle)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'dispatch_bundle_report_parse_failed' -Message "Unable to parse operator dispatch bundle report JSON: $($_.Exception.Message)" -Path $BundleReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'dispatch_bundle_report_missing' -Message 'Operator dispatch bundle report missing after bundle execution.' -Path $BundleReportPath
}

$executionReceipt = @(
  "receipt_basis=handoff_warrant_operator_dispatch_bundle",
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "archival_manifest_count=$(@($archivalManifest).Count)",
  "handoff_warrant_count=$(@($handoffWarrant).Count)",
  "operator_dispatch_bundle_count=$(@($operatorDispatchBundle).Count)",
  "operator_acknowledged=$([bool]$OperatorAcknowledged)",
  "execution_receipt_note=Dispatch is acknowledged as local governance handoff evidence only."
)

$receiptComplete = (
  $bundleState -eq 'ready' -and
  $bundleComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  @($archivalManifest).Count -gt 0 -and
  @($handoffWarrant).Count -gt 0 -and
  @($operatorDispatchBundle).Count -gt 0 -and
  @($executionReceipt).Count -gt 0 -and
  [bool]$OperatorAcknowledged
)

if (-not $receiptComplete) {
  $receiptState = 'attention_required'
  $recommendedAction = 'repair_operator_dispatch_bundle_and_rebuild_execution_receipt'
  Add-Finding -Severity 'warning' -Code 'execution_receipt_not_ready' -Message 'Operator dispatch bundle execution receipt checks failed.' -Path $BundleReportPath
}

$report = [ordered]@{
  receipted_at = $now.ToString('o')
  repo_root = $RepoRoot
  receipt_name = $ReceiptName
  operator_acknowledged = [bool]$OperatorAcknowledged
  receipt_state = $receiptState
  receipt_complete = $receiptComplete
  recommended_action = $recommendedAction
  bundle_script_path = $BundleScriptPath
  bundle_report_path = $BundleReportPath
  bundle_ran = $bundleRan
  bundle_state = $bundleState
  bundle_complete = $bundleComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  archival_manifest = $archivalManifest
  handoff_warrant = $handoffWarrant
  operator_dispatch_bundle = $operatorDispatchBundle
  execution_receipt = $executionReceipt
  local_only_note = 'Operator dispatch bundle execution receipt is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
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
  "bundle_state=$bundleState"
  "bundle_complete=$bundleComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
