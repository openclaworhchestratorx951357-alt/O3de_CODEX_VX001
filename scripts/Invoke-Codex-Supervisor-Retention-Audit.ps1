param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$PolicyFile = '',
  [switch]$Apply,
  [switch]$ConfirmApply
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $PolicyFile) {
  $PolicyFile = Join-Path $RepoRoot 'scripts\Codex-Supervisor-Retention-Policy.json'
}

if (-not (Test-Path $PolicyFile)) {
  throw "Policy file not found: $PolicyFile"
}

if ($Apply -and -not $ConfirmApply) {
  throw 'Refusing retention apply without -ConfirmApply.'
}

$policy = Get-Content -Path $PolicyFile -Raw | ConvertFrom-Json
if (-not $policy.files) {
  throw "Retention policy has no files list: $PolicyFile"
}

function Ensure-ParentDirectory {
  param([string]$Path)
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
}

$results = @()
$timestamp = [DateTimeOffset]::Now.ToString('o')

foreach ($entry in $policy.files) {
  $relativePath = [string]$entry.path
  $maxLines = [int]$entry.max_lines
  $archiveSuffix = [string]$entry.archive_suffix
  $fullPath = Join-Path $RepoRoot $relativePath
  $archivePath = $fullPath + $archiveSuffix

  $exists = Test-Path $fullPath
  $lineCount = 0
  $trimCount = 0
  $wouldTrim = $false

  $lines = @()
  if ($exists) {
    $lines = Get-Content -Path $fullPath
    $lineCount = $lines.Count
    if ($lineCount -gt $maxLines) {
      $trimCount = $lineCount - $maxLines
      $wouldTrim = $true
    }
  }

  $applied = $false
  if ($Apply -and $exists -and $wouldTrim) {
    $toArchive = @()
    if ($trimCount -gt 0) {
      $toArchive = $lines[0..($trimCount - 1)]
    }
    $toKeep = $lines[$trimCount..($lineCount - 1)]

    Ensure-ParentDirectory -Path $archivePath
    if ($toArchive.Count -gt 0) {
      Add-Content -Path $archivePath -Value $toArchive -Encoding UTF8
    }
    Set-Content -Path $fullPath -Value $toKeep -Encoding UTF8
    $applied = $true
  }

  $results += [ordered]@{
    path = $relativePath
    exists = $exists
    line_count = $lineCount
    max_lines = $maxLines
    would_trim = $wouldTrim
    trim_count = $trimCount
    archive_path = if ($wouldTrim) { $archivePath } else { $null }
    applied = $applied
  }
}

$summary = [ordered]@{
  audited_at = $timestamp
  repo_root = $RepoRoot
  policy_file = $PolicyFile
  apply_mode = [bool]$Apply
  always_keep = @($policy.always_keep)
  files = $results
}

$summaryJson = $summary | ConvertTo-Json -Depth 6
$stateDir = Join-Path $RepoRoot 'continue-queue'
Ensure-ParentDirectory -Path (Join-Path $stateDir 'retention-audit.placeholder')
$outPath = Join-Path $stateDir 'codex-supervisor-retention-audit.json'
Set-Content -Path $outPath -Value $summaryJson -Encoding UTF8

Write-Host $summaryJson
