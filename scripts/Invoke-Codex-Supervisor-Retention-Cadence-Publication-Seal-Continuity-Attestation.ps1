param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$SealScriptPath = '',
  [string]$SealReportPath = '',
  [string]$AttestationName = 'publication_seal_continuity_attestation',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $SealScriptPath) {
  $SealScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Digest-Publication-Seal.ps1'
}
if (-not $SealReportPath) {
  $SealReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-digest-publication-seal.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-publication-seal-continuity-attestation.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-publication-seal-continuity-attestation.txt'
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
$publicationSeal = @()
$attestationState = 'ready'
$attestationComplete = $false
$recommendedAction = 'publish_publication_seal_continuity_attestation'
$sealRan = $false

if (-not (Test-Path $SealScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'seal_script_missing' -Message 'Digest publication seal script missing.' -Path $SealScriptPath
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
    Add-Finding -Severity 'warning' -Code 'seal_execution_failed' -Message 'Digest publication seal execution failed.' -Path $SealScriptPath
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
    if ($sealData.publication_seal) {
      $publicationSeal = @($sealData.publication_seal)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'seal_report_parse_failed' -Message "Unable to parse digest publication seal report JSON: $($_.Exception.Message)" -Path $SealReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'seal_report_missing' -Message 'Digest publication seal report missing after seal execution.' -Path $SealReportPath
}

$continuityAttestation = @(
  "attestation_basis=digest_publication_seal",
  "lane_profile_name=$laneProfileName",
  "profile_state=$profileState",
  "launch_command=$launchCommand",
  "thread_start_guidance_count=$(@($threadStartGuidance).Count)",
  "publication_seal_count=$(@($publicationSeal).Count)",
  "continuity_verified=$([bool]$OperatorAcknowledged)"
)

$attestationComplete = (
  $sealState -eq 'ready' -and
  $sealComplete -and
  -not [string]::IsNullOrWhiteSpace($laneProfileName) -and
  $profileState -eq 'ready' -and
  -not [string]::IsNullOrWhiteSpace($launchCommand) -and
  @($threadStartGuidance).Count -gt 0 -and
  @($publicationSeal).Count -gt 0 -and
  @($continuityAttestation).Count -gt 0
)

if (-not $attestationComplete) {
  $attestationState = 'attention_required'
  $recommendedAction = 'repair_digest_publication_seal_and_rebuild_continuity_attestation'
  Add-Finding -Severity 'warning' -Code 'continuity_attestation_not_ready' -Message 'Publication seal continuity attestation checks failed.' -Path $SealReportPath
}

$report = [ordered]@{
  attested_at = $now.ToString('o')
  repo_root = $RepoRoot
  attestation_name = $AttestationName
  operator_acknowledged = [bool]$OperatorAcknowledged
  attestation_state = $attestationState
  attestation_complete = $attestationComplete
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
  publication_seal = $publicationSeal
  continuity_attestation = $continuityAttestation
  local_only_note = 'Publication seal continuity attestation is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
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
  "seal_state=$sealState"
  "seal_complete=$sealComplete"
  "profile_state=$profileState"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
