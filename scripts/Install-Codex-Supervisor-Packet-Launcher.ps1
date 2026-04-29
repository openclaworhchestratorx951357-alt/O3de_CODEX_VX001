param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [switch]$DesktopShortcut
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$invokeScript = Join-Path $RepoRoot 'scripts\Invoke-Codex-Supervisor-Packet.ps1'
$instructionFile = Join-Path $RepoRoot 'scripts\codex_supervisor_packet.txt'

if (-not (Test-Path $invokeScript)) {
  throw "Missing launcher script: $invokeScript"
}
if (-not (Test-Path $instructionFile)) {
  throw "Missing instruction file: $instructionFile"
}

$launcherPath = Join-Path $RepoRoot 'scripts\Run-Codex-Supervisor-Packet.cmd'
$launcherBody = @(
  '@echo off',
  'setlocal',
  'powershell.exe -NoLogo -ExecutionPolicy Bypass -File "' + $invokeScript + '" -RepoRoot "' + $RepoRoot + '"'
)
$launcherBody -join "`r`n" | Set-Content -Path $launcherPath -Encoding ASCII

Write-Host "Created launcher: $launcherPath" -ForegroundColor Green

if ($DesktopShortcut) {
  $desktop = [Environment]::GetFolderPath('Desktop')
  $shortcutPath = Join-Path $desktop 'Codex Supervisor Packet.lnk'
  $shell = New-Object -ComObject WScript.Shell
  $sc = $shell.CreateShortcut($shortcutPath)
  $sc.TargetPath = $launcherPath
  $sc.WorkingDirectory = (Split-Path $launcherPath -Parent)
  $sc.WindowStyle = 1
  $sc.Description = 'Send collision-safe supervisor packet to Codex window'
  $sc.Save()
  Write-Host "Created desktop shortcut: $shortcutPath" -ForegroundColor Green
}
