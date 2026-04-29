param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$RehearsalScriptPath = '',
  [string]$RehearsalReportPath = '',
  [string]$OutputFile = '',
  [string]$OutputTextFile = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $RehearsalScriptPath) {
  $RehearsalScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Startup-Evidence-Rehearsal.ps1'
}
if (-not $RehearsalReportPath) {
  $RehearsalReportPath = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-frozen-lifecycle-startup-evidence-rehearsal.json'
}
if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-evidence-automation-gate.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-startup-evidence-automation-gate.txt'
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
$startupGateCommand = 'powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Startup-Evidence-Automation-Gate.ps1 -RepoRoot "<repo-root>"'

$rehearsalState = 'missing'
$freezeState = 'unknown'
$handoffState = 'unknown'
$guidancePreserved = $false
$threadStartGuidance = @()
$startupGateReady = $false
$rehearsalRan = $false

if (-not (Test-Path $RehearsalScriptPath)) {
  Add-Finding -Severity 'warning' -Code 'rehearsal_script_missing' -Message 'Startup evidence rehearsal helper script is missing.' -Path $RehearsalScriptPath
}
else {
  & powershell.exe -NoLogo -ExecutionPolicy Bypass -File $RehearsalScriptPath -RepoRoot $RepoRoot | Out-Null
  $rehearsalRan = ($LASTEXITCODE -eq 0)
  if (-not $rehearsalRan) {
    Add-Finding -Severity 'warning' -Code 'rehearsal_execution_failed' -Message 'Startup evidence rehearsal helper execution failed.' -Path $RehearsalScriptPath
  }
}

if (Test-Path $RehearsalReportPath) {
  try {
    $rehearsalData = Get-Content -Path $RehearsalReportPath -Raw | ConvertFrom-Json
    if ($rehearsalData.rehearsal_state) {
      $rehearsalState = [string]$rehearsalData.rehearsal_state
    }
    if ($rehearsalData.freeze_state) {
      $freezeState = [string]$rehearsalData.freeze_state
    }
    if ($rehearsalData.handoff_state) {
      $handoffState = [string]$rehearsalData.handoff_state
    }
    if ($null -ne $rehearsalData.guidance_preserved_after_handoff_copy) {
      $guidancePreserved = [bool]$rehearsalData.guidance_preserved_after_handoff_copy
    }
    if ($rehearsalData.thread_start_guidance) {
      $threadStartGuidance = @($rehearsalData.thread_start_guidance)
    }
  }
  catch {
    Add-Finding -Severity 'warning' -Code 'rehearsal_report_parse_failed' -Message "Unable to parse startup evidence rehearsal report JSON: $($_.Exception.Message)" -Path $RehearsalReportPath
  }
}
else {
  Add-Finding -Severity 'warning' -Code 'rehearsal_report_missing' -Message 'Startup evidence rehearsal report is missing after rehearsal execution.' -Path $RehearsalReportPath
}

if ($rehearsalState -eq 'ready' -and $freezeState -eq 'ready' -and $handoffState -eq 'ready' -and $guidancePreserved -and @($threadStartGuidance).Count -gt 0) {
  $startupGateReady = $true
}
else {
  Add-Finding -Severity 'warning' -Code 'startup_gate_not_ready' -Message 'Startup evidence automation gate is not ready; rehearsal outputs did not satisfy required readiness fields.' -Path $RehearsalReportPath
}

$gateState = 'ready'
$recommendedAction = 'use_startup_evidence_automation_gate_as_single_startup_entrypoint'
if (-not $startupGateReady) {
  $gateState = 'attention_required'
  $recommendedAction = 'repair_rehearsal_readiness_and_re-run_startup_evidence_automation_gate'
}

$report = [ordered]@{
  gated_at = $now.ToString('o')
  repo_root = $RepoRoot
  gate_state = $gateState
  startup_gate_ready = $startupGateReady
  recommended_action = $recommendedAction
  startup_gate_command = $startupGateCommand
  rehearsal_script_path = $RehearsalScriptPath
  rehearsal_report_path = $RehearsalReportPath
  rehearsal_ran = $rehearsalRan
  rehearsal_state = $rehearsalState
  freeze_state = $freezeState
  handoff_state = $handoffState
  guidance_preserved_after_handoff_copy = $guidancePreserved
  thread_start_guidance = $threadStartGuidance
  local_only_note = 'Startup evidence automation gate is governance-only and does not authorize runtime execution, provider expansion, placement, or project mutation.'
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "gated_at=$($report.gated_at)"
  "gate_state=$gateState"
  "startup_gate_ready=$startupGateReady"
  "recommended_action=$recommendedAction"
  "rehearsal_state=$rehearsalState"
  "freeze_state=$freezeState"
  "handoff_state=$handoffState"
  "guidance_preserved_after_handoff_copy=$guidancePreserved"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
