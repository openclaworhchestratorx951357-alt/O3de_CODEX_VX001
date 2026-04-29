param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string[]]$HandoffFiles = @(),
  [string]$HandoffPattern = 'codex-supervisor-retention-cadence-handoff*.json',
  [string]$OutputFile = '',
  [string]$OutputTextFile = '',
  [int]$MinSamplesPerState = 1
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $OutputFile) {
  $OutputFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-adoption-checkpoint.json'
}
if (-not $OutputTextFile) {
  $OutputTextFile = Join-Path $RepoRoot 'continue-queue\codex-supervisor-retention-cadence-adoption-checkpoint.txt'
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

function Has-Property {
  param(
    $Object,
    [string]$Name
  )
  return $null -ne $Object.PSObject.Properties[$Name]
}

function Collect-HandoffFiles {
  param(
    [string]$Root,
    [string[]]$ExplicitFiles,
    [string]$Pattern
  )

  $results = @()
  if (@($ExplicitFiles).Count -gt 0) {
    foreach ($file in $ExplicitFiles) {
      if ([string]::IsNullOrWhiteSpace($file)) {
        continue
      }
      $resolved = $file
      if (-not [System.IO.Path]::IsPathRooted($resolved)) {
        $resolved = Join-Path $Root $resolved
      }
      $results += $resolved
    }
    return @($results | Select-Object -Unique)
  }

  $queueRoot = Join-Path $Root 'continue-queue'
  if (-not (Test-Path $queueRoot)) {
    return @()
  }
  return @(
    Get-ChildItem -Path $queueRoot -File -Filter $Pattern |
      Where-Object { $_.Name -notlike '*.archive*' } |
      Sort-Object LastWriteTimeUtc |
      Select-Object -ExpandProperty FullName
  )
}

$expectedStates = @('ready', 'attention_required', 'escalation_required')
$expectedTemplateFields = @(
  'lane_id',
  'lane_risk',
  'checkpoint_state',
  'handoff_action',
  'operator_ack_required',
  'next_audit_due_at',
  'top_findings',
  'owner'
)
$allowedRisk = @('low', 'medium', 'high')

$findings = @()
$samples = @()

$candidateFiles = Collect-HandoffFiles -Root $RepoRoot -ExplicitFiles $HandoffFiles -Pattern $HandoffPattern
if (@($candidateFiles).Count -eq 0) {
  Add-Finding -Severity 'critical' -Code 'handoff_samples_missing' -Message 'No retention cadence handoff samples were found.'
}

foreach ($file in $candidateFiles) {
  if (-not (Test-Path $file)) {
    Add-Finding -Severity 'critical' -Code 'handoff_file_missing' -Message "Handoff sample file missing: $file" -Path $file
    continue
  }

  $parsed = $null
  try {
    $parsed = Get-Content -Path $file -Raw | ConvertFrom-Json
  }
  catch {
    Add-Finding -Severity 'critical' -Code 'handoff_parse_failed' -Message "Failed to parse handoff sample: $file" -Path $file
    continue
  }

  $missing = @()
  foreach ($field in @('lane_id', 'lane_risk', 'checkpoint_state', 'handoff_action', 'operator_ack_required', 'cadence', 'shift_handoff_template')) {
    if (-not (Has-Property -Object $parsed -Name $field)) {
      $missing += $field
    }
  }
  if (@($missing).Count -gt 0) {
    Add-Finding -Severity 'critical' -Code 'handoff_required_fields_missing' -Message ("Handoff sample missing required fields: " + ($missing -join ', ')) -Path $file
    continue
  }

  $sampleState = [string]$parsed.checkpoint_state
  $sampleRisk = [string]$parsed.lane_risk
  if ($expectedStates -notcontains $sampleState) {
    Add-Finding -Severity 'critical' -Code 'handoff_state_invalid' -Message "Unsupported checkpoint_state '$sampleState'." -Path $file
    continue
  }
  if ($allowedRisk -notcontains $sampleRisk) {
    Add-Finding -Severity 'critical' -Code 'handoff_risk_invalid' -Message "Unsupported lane_risk '$sampleRisk'." -Path $file
    continue
  }

  $cadenceMissing = @()
  foreach ($field in @('base_hours', 'effective_hours', 'next_audit_due_at')) {
    if (-not (Has-Property -Object $parsed.cadence -Name $field)) {
      $cadenceMissing += $field
    }
  }
  if (@($cadenceMissing).Count -gt 0) {
    Add-Finding -Severity 'warning' -Code 'handoff_cadence_fields_missing' -Message ("Cadence fields missing: " + ($cadenceMissing -join ', ')) -Path $file
  }

  $template = $parsed.shift_handoff_template
  $templateMissing = @()
  foreach ($field in $expectedTemplateFields) {
    if (@($template.required_fields | Where-Object { $_ -eq $field }).Count -eq 0) {
      $templateMissing += $field
    }
  }
  if (@($templateMissing).Count -gt 0) {
    Add-Finding -Severity 'warning' -Code 'handoff_template_incomplete' -Message ("Template missing required_fields entries: " + ($templateMissing -join ', ')) -Path $file
  }

  $samples += [ordered]@{
    source_file = $file
    generated_at = [string]$parsed.generated_at
    lane_id = [string]$parsed.lane_id
    lane_risk = $sampleRisk
    checkpoint_state = $sampleState
    handoff_action = [string]$parsed.handoff_action
    operator_ack_required = [bool]$parsed.operator_ack_required
    cadence = [ordered]@{
      base_hours = [int]$parsed.cadence.base_hours
      effective_hours = [int]$parsed.cadence.effective_hours
      next_audit_due_at = [string]$parsed.cadence.next_audit_due_at
    }
    template_missing_fields = $templateMissing
  }
}

$stateCoverage = [ordered]@{}
foreach ($state in $expectedStates) {
  $stateCoverage[$state] = @($samples | Where-Object { $_.checkpoint_state -eq $state }).Count
}

$missingStates = @()
foreach ($state in $expectedStates) {
  if ([int]$stateCoverage[$state] -lt $MinSamplesPerState) {
    $missingStates += $state
  }
}
if (@($missingStates).Count -gt 0) {
  Add-Finding -Severity 'warning' -Code 'state_coverage_missing' -Message ("Missing required checkpoint_state coverage: " + ($missingStates -join ', '))
}

$criticalCount = @($findings | Where-Object { $_.severity -eq 'critical' }).Count
$warningCount = @($findings | Where-Object { $_.severity -eq 'warning' }).Count

$checkpointState = 'ready'
$recommendedAction = 'retain_standard_schedule'
if ($criticalCount -gt 0) {
  $checkpointState = 'escalation_required'
  $recommendedAction = 'run_lane_handoff_and_rebuild_adoption_evidence'
}
elseif ($warningCount -gt 0) {
  $checkpointState = 'attention_required'
  $recommendedAction = 'capture_missing_state_examples_and_fix_template_gaps'
}

$examplesByState = [ordered]@{}
foreach ($state in $expectedStates) {
  $example = $samples | Where-Object { $_.checkpoint_state -eq $state } | Select-Object -First 1
  if ($null -eq $example) {
    $examplesByState[$state] = $null
  }
  else {
    $examplesByState[$state] = [ordered]@{
      lane_id = [string]$example.lane_id
      lane_risk = [string]$example.lane_risk
      generated_at = [string]$example.generated_at
      source_file = [string]$example.source_file
    }
  }
}

$laneCoverage = @{}
foreach ($sample in $samples) {
  $key = [string]$sample.lane_id
  if (-not $laneCoverage.ContainsKey($key)) {
    $laneCoverage[$key] = [ordered]@{
      lane_risk = [string]$sample.lane_risk
      sample_count = 0
      states = @()
    }
  }
  $laneCoverage[$key].sample_count = [int]$laneCoverage[$key].sample_count + 1
  if (@($laneCoverage[$key].states | Where-Object { $_ -eq $sample.checkpoint_state }).Count -eq 0) {
    $laneCoverage[$key].states += [string]$sample.checkpoint_state
  }
}

$now = [DateTimeOffset]::Now
$report = [ordered]@{
  checkpointed_at = $now.ToString('o')
  repo_root = $RepoRoot
  handoff_pattern = $HandoffPattern
  samples_considered = @($candidateFiles).Count
  valid_samples = @($samples).Count
  min_samples_per_state = $MinSamplesPerState
  expected_states = $expectedStates
  state_coverage = $stateCoverage
  missing_states = $missingStates
  adoption_state = $checkpointState
  recommended_action = $recommendedAction
  examples_by_state = $examplesByState
  lane_coverage = $laneCoverage
  findings = $findings
}

Ensure-ParentDirectory -Path $OutputFile
Ensure-ParentDirectory -Path $OutputTextFile

$reportJson = $report | ConvertTo-Json -Depth 10
Set-Content -Path $OutputFile -Value $reportJson -Encoding UTF8

$lines = @(
  "checkpointed_at=$($report.checkpointed_at)"
  "adoption_state=$checkpointState"
  "recommended_action=$recommendedAction"
  "samples_considered=$($report.samples_considered)"
  "valid_samples=$($report.valid_samples)"
  "coverage_ready=$($stateCoverage.ready)"
  "coverage_attention_required=$($stateCoverage.attention_required)"
  "coverage_escalation_required=$($stateCoverage.escalation_required)"
  "missing_states=$(([string]::Join(',', $missingStates)))"
  "finding_count=$(@($findings).Count)"
)
Set-Content -Path $OutputTextFile -Value $lines -Encoding UTF8

Write-Host $reportJson
