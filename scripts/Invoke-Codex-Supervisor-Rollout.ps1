param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$Profile = 'standard',
  [string]$LaneId = 'default',
  [string]$SourcePacketId = 'rollout.manual',
  [string]$InstructionFile = '',
  [switch]$AllowInstructionOverride,
  [switch]$OperatorAcknowledged,
  [switch]$ExplicitLockedScopeApproval,
  [switch]$NoDispatch,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-RepoRelativePath {
  param(
    [string]$Root,
    [string]$RelativePath
  )
  $combined = Join-Path $Root $RelativePath
  return [System.IO.Path]::GetFullPath($combined)
}

$profilesPath = Join-Path $RepoRoot 'scripts\Codex-Supervisor-Rollout-Profiles.json'
$invokeScriptPath = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Packet.ps1'

if (-not (Test-Path $profilesPath)) {
  throw "Missing rollout profile file: $profilesPath"
}
if (-not (Test-Path $invokeScriptPath)) {
  throw "Missing launcher script: $invokeScriptPath"
}

$profilesDoc = Get-Content -Path $profilesPath -Raw | ConvertFrom-Json
if (-not $profilesDoc.profiles) {
  throw "Rollout profile file has no 'profiles' array: $profilesPath"
}

$selectedProfile = $profilesDoc.profiles | Where-Object { $_.name -eq $Profile } | Select-Object -First 1
if (-not $selectedProfile) {
  $names = ($profilesDoc.profiles | ForEach-Object { $_.name }) -join ', '
  throw "Unknown profile '$Profile'. Available: $names"
}

$profileInstructionPath = Resolve-RepoRelativePath -Root $RepoRoot -RelativePath ([string]$selectedProfile.instruction_file)
if (-not (Test-Path $profileInstructionPath)) {
  throw "Profile instruction file not found: $profileInstructionPath"
}

$resolvedInstructionPath = $profileInstructionPath
if ($InstructionFile) {
  if (-not $AllowInstructionOverride) {
    throw 'Instruction override requires -AllowInstructionOverride.'
  }
  $resolvedInstructionPath = [System.IO.Path]::GetFullPath($InstructionFile)
}

if (-not (Test-Path $resolvedInstructionPath)) {
  throw "Instruction file not found: $resolvedInstructionPath"
}

if ($selectedProfile.require_operator_ack -and -not $OperatorAcknowledged) {
  throw "Profile '$Profile' requires -OperatorAcknowledged."
}

if ($ExplicitLockedScopeApproval -and -not $selectedProfile.allow_locked_scope_approval) {
  throw "Profile '$Profile' does not allow explicit locked-scope approval."
}

$invokeArgs = @(
  '-NoLogo',
  '-ExecutionPolicy', 'Bypass',
  '-File', $invokeScriptPath,
  '-RepoRoot', $RepoRoot,
  '-InstructionFile', $resolvedInstructionPath,
  '-SourcePacketId', $SourcePacketId,
  '-LaneId', $LaneId,
  '-PacketRisk', [string]$selectedProfile.packet_risk,
  '-CooldownSeconds', [string]$selectedProfile.cooldown_seconds
)

if ($OperatorAcknowledged) { $invokeArgs += '-OperatorAcknowledged' }
if ($ExplicitLockedScopeApproval) { $invokeArgs += '-ExplicitLockedScopeApproval' }
if ($NoDispatch) { $invokeArgs += '-NoDispatch' }
if ($Force) { $invokeArgs += '-Force' }

& powershell.exe @invokeArgs
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
  throw "Invoke-Codex-Supervisor-Packet.ps1 failed with exit code $exitCode"
}

Write-Host ("Rollout profile '{0}' completed for lane '{1}' (source_packet_id={2})." -f $Profile, $LaneId, $SourcePacketId) -ForegroundColor Green
