param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$AutomationGateScriptPath = '',
  [string]$AutomationGateReportPath = '',
  [string]$ProfileName = 'operator_safe_startup',
  [switch]$OperatorAcknowledged,
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $AutomationGateScriptPath) {
  $AutomationGateScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Evidence-Automation-Gate.ps1'
}
if (-not $AutomationGateReportPath) {
  $AutomationGateReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-evidence-automation-gate.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-evidence-operator-launch-profile.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-evidence-operator-launch-profile.txt'
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

$gateState = 'missing'
$startupGateReady = $false
$threadStartGuidance = @()
$recommendedAction = 'launch_profile_ready_for_supervisor_startup'
$profileState = 'ready'
$gateRan = $false
$launchCommand = 'powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Packet.ps1 -RepoRoot "<repo-root>"'

if (-not (Test-Path $AutomationGateScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'automation_gate_script_missing' -Message 'Startup evidence automation gate script missing.' -Path $AutomationGateScriptPath
}
else {
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $AutomationGateScriptPath -RepoRoot $RepoRoot | Out-Null
  $gateRan = ($LASTEXITCODE -eq 0)
  if (-not $gateRan) {
    Add-Finding -Severity 'warning' -Code 'automation_gate_execution_failed' -Message 'Startup evidence automation gate execution failed.' -Path $AutomationGateScriptPath
  }
}

if (Test-Path $AutomationGateReportPath) {
  try {
    $gateData = Get-Content -Path $AutomationGateReportPath -Raw | ConvertFrom-Json
    if ($gateData.gate_state) {
      $gateState = [string]$gateData.gate_state
    }
    if ($null -ne $gateData.startup_gate_ready) {
      $startupGateReady = [bool]$gateData.startup_gate_ready
    }
    if ($gateData.thread_start_guidance) {
      $threadStartGuidance = @($gateData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'automation_gate_report_parse_failed' -Message "Unable to parse automation gate report JSON: $($_.Exception.Message)" -Path $AutomationGateReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'automation_gate_report_missing' -Message 'Automation gate report missing after gate execution.' -Path $AutomationGateReportPath
}

if (-not $startupGateReady -or $gateState -ne 'ready') {
  $profileState = 'attention_required'
  $recommendedAction = 'resolve_startup_evidence_automation_gate_before_operator_launch'
  Add-Finding -Severity 'warning' -Code 'automation_gate_not_ready' -Message 'Automation gate is not ready for operator launch profile.' -Path $AutomationGateReportPath
}

if (-not $OperatorAcknowledged) {
  $profileState = 'attention_required'
  $recommendedAction = 'collect_operator_acknowledgment_and_re-run_launch_profile'
  Add-Finding -Severity 'warning' -Code 'operator_ack_required' -Message 'Operator acknowledgment is required before launch profile is considered ready.'
}

$report = [ordered]@{
  profiled_at = $now.ToString('o')
  repo_root = $RepoRoot
  profile_name = $ProfileName
  operator_acknowledged = [bool]$OperatorAcknowledged
  profile_state = $profileState
  recommended_action = $recommendedAction
  automation_gate_script_path = $AutomationGateScriptPath
  automation_gate_report_path = $AutomationGateReportPath
  automation_gate_ran = $gateRan
  automation_gate_state = $gateState
  startup_gate_ready = $startupGateReady
  launch_command = $launchCommand
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Operator launch profile is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "profiled_at=$($report.profiled_at)"
  "profile_name=$ProfileName"
  "profile_state=$profileState"
  "operator_acknowledged=$([bool]$OperatorAcknowledged)"
  "recommended_action=$recommendedAction"
  "automation_gate_state=$gateState"
  "startup_gate_ready=$startupGateReady"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
