param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$ManifestScriptPath = '',
  [string]$ManifestReportPath = '',
  [string]$WarrantName = 'archival_manifest_handoff_warrant',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ManifestScriptPath) {
  $ManifestScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Closeout-Ledger-Archival-Manifest.ps1'
}
if (-not $ManifestReportPath) {
  $ManifestReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-closeout-ledger-archival-manifest.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-archival-manifest-handoff-warrant.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-archival-manifest-handoff-warrant.txt'
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

$manifestState = 'missing'
$manifestComplete = $false
$laneProfileName = ''
$profileState = ''
$launchCommand = ''
$threadStartGuidance = @()
$archivalManifest = @()
$warrantState = 'ready'
$warrantComplete = $false
$recommendedAction = 'publish_archival_manifest_handoff_warrant'
$manifestRan = $false

if (-not (Test-Path $ManifestScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'manifest_script_missing' -Message 'Closeout ledger archival manifest script missing.' -Path $ManifestScriptPath
}
else {
  $cmd = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', $ManifestScriptPath,
    '-RepoRoot', $RepoRoot
  )
  if ($OperatorAcknowledged) {
    $cmd += '-OperatorAcknowledged'
  }
  & powershell.exe @cmd | Out-Null
  $manifestRan = ($LASTEXITCODE -eq 0)
  if (-not $manifestRan) {
    Add-Finding -Severity 'warning' -Code 'manifest_execution_failed' -Message 'Closeout ledger archival manifest execution failed.' -Path $ManifestScriptPath
  }
}

if (Test-Path $ManifestReportPath) {
  try {
    $manifestData = Get-Content -Path $ManifestReportPath -Raw | ConvertFrom-Json
    if ($manifestData.manifest_state) {
      $manifestState = [string]$manifestData.manifest_state
    }
    if ($null -ne $manifestData.manifest_complete) {
      $manifestComplete = [bool]$manifestData.manifest_complete
    }
    if ($manifestData.lane_profile_name) {
      $laneProfileName = [string]$manifestData.lane_profile_name
    }
    if ($manifestData.profile_state) {
      $profileState = [string]$manifestData.profile_state
    }
    if ($manifestData.launch_command) {
      $launchCommand = [string]$manifestData.launch_command
    }
    if ($manifestData.thread_start_guidance) {
      $threadStartGuidance = @($manifestData.thread_start_guidance)
    }
    if ($manifestData.archival_manifest) {
      $archivalManifest = @($manifestData.archival_manifest)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'manifest_report_parse_failed' -Message "Unable to parse archival manifest report JSON: $($_.Exception.Message)" -Path $ManifestReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'manifest_report_missing' -Message 'Archival manifest report missing after manifest execution.' -Path $ManifestReportPath
}

$handoffWarrant = @(
  "warrant_basis=closeout_ledger_archival_manifest",
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "archival_manifest_count=$(@($archivalManifest).Count)",
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
)

$warrantComplete = (
  $manifestState -eq 'ready' -and
  $manifestComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  @($archivalManifest).Count -gt 0 -and
  @($handoffWarrant).Count -gt 0
)

if (-not $warrantComplete) {
  $warrantState = 'attention_required'
  $recommendedAction = 'repair_archival_manifest_and_rebuild_handoff_warrant'
  Add-Finding -Severity 'warning' -Code 'handoff_warrant_not_ready' -Message 'Archival manifest handoff warrant checks failed.' -Path $ManifestReportPath
}

$report = [ordered]@{
  warranted_at = $now.ToString('o')
  repo_root = $RepoRoot
  warrant_name = $WarrantName
  operator_acknowledged = [bool]$OperatorAcknowledged
  warrant_state = $warrantState
  warrant_complete = $warrantComplete
  recommended_action = $recommendedAction
  manifest_script_path = $ManifestScriptPath
  manifest_report_path = $ManifestReportPath
  manifest_ran = $manifestRan
  manifest_state = $manifestState
  manifest_complete = $manifestComplete
  lane_profile_name = $laneProfileName
  profile_state = $profileState
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  archival_manifest = $archivalManifest
  handoff_warrant = $handoffWarrant
  local_only_note = 'Archival manifest handoff warrant is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
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
  "manifest_state=$manifestState"
  "manifest_complete=$manifestComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
