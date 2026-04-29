param(
  [string]$RepoRoot = 'C:\Users\topgu\OneDrive\Documents\New project',
  [string]$InstructionFile = '',
  [string]$SourcePacketId = 'manual',
  [string]$LaneId = 'default',
  [ValidateSet('low', 'medium', 'high')]
  [string]$PacketRisk = 'medium',
  [int]$CooldownSeconds = 120,
  [int]$LockTimeoutSeconds = 900,
  [switch]$Force,
  [switch]$OperatorAcknowledged,
  [switch]$ExplicitLockedScopeApproval,
  [switch]$NoDispatch
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $InstructionFile) {
  $InstructionFile = Join-Path $RepoRoot 'scripts\codex_supervisor_packet.txt'
}

$stateDir = Join-Path $RepoRoot 'continue-queue'
$statePath = Join-Path $stateDir 'codex-supervisor-packet-state.json'
$lockPath = Join-Path $stateDir 'codex-supervisor-packet.lock'
$laneSafe = ($LaneId -replace '[^A-Za-z0-9._-]', '_')
$claimPath = Join-Path $stateDir ("codex-supervisor-packet-claim-{0}.json" -f $laneSafe)
$queuePath = Join-Path $stateDir 'codex-supervisor-packet-queue.jsonl'
$eventPath = Join-Path $stateDir 'codex-supervisor-packet-events.jsonl'
$sliceLogPath = Join-Path $stateDir 'codex-slice-log.txt'
$logPath = Join-Path $stateDir 'codex-supervisor-packet.log'
$ahkScriptPath = Join-Path $RepoRoot 'scripts\Send-Codex-Instruction.ahk'

New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

if (-not (Test-Path $InstructionFile)) {
  throw "Instruction file not found: $InstructionFile"
}
if (-not $NoDispatch -and -not (Test-Path $ahkScriptPath)) {
  throw "AHK sender script not found: $ahkScriptPath"
}

function Read-JsonFileOrNull {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  try {
    return (Get-Content -Path $Path -Raw | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Append-JsonLine {
  param(
    [string]$Path,
    [hashtable]$Object
  )
  $line = ($Object | ConvertTo-Json -Compress)
  Add-Content -Path $Path -Value $line -Encoding UTF8
}

function Get-StopReasonFromInstruction {
  param(
    [string]$Text,
    [bool]$LockedScopeApproved
  )

  if ([string]::IsNullOrWhiteSpace($Text) -or $Text.Length -lt 20) {
    return @{ code = 'packet_scope_ambiguous_blocked'; detail = 'Instruction text is too short or blank.' }
  }
  if ($Text -notmatch '(?i)\bpacket\b' -and $Text -notmatch '(?i)\buse supervisor mode\b') {
    return @{ code = 'packet_scope_ambiguous_blocked'; detail = 'Instruction must contain one explicit packet intent.' }
  }
  if ($Text -match '(?i)\barbitrary shell\b|\bglobal install\b|\basset processor execution\b|\bprovider execution\b|\bblender execution\b|\bplacement execution\b|\bruntime mutation\b|\bforce-?push\b|\breset --hard\b') {
    return @{ code = 'runtime_broadening_blocked'; detail = 'Instruction text includes runtime-broadening or unsafe execution intent.' }
  }
  if (-not $LockedScopeApproved -and $Text -match '(?i)AGENTS\.md|FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL\.md') {
    return @{ code = 'operator_locked_scope_blocked'; detail = 'Instruction references operator-locked file scope without explicit locked-scope approval.' }
  }
  return $null
}

function Get-LatestSliceTimestamp {
  param(
    [string]$LogPath,
    [string]$Marker
  )
  if (-not (Test-Path $LogPath)) { return $null }
  $lines = Get-Content -Path $LogPath
  for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    $line = $lines[$i]
    if ($line -like "*| $Marker*") {
      $parts = $line -split '\|', 2
      if ($parts.Count -ge 1) {
        try { return [DateTimeOffset]::Parse($parts[0].Trim()) } catch {}
      }
    }
  }
  return $null
}

function Find-AhkExecutable {
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\AutoHotkey\v2\AutoHotkey64.exe",
    "$env:LOCALAPPDATA\Programs\AutoHotkey\v2\AutoHotkey32.exe",
    "$env:LOCALAPPDATA\Programs\AutoHotkey\AutoHotkey.exe",
    'C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe',
    'C:\Program Files\AutoHotkey\v2\AutoHotkey.exe',
    'C:\Program Files\AutoHotkey\AutoHotkey64.exe',
    'C:\Program Files\AutoHotkey\AutoHotkey.exe',
    'C:\Program Files (x86)\AutoHotkey\AutoHotkey.exe'
  )
  foreach ($c in $candidates) {
    if ($c -and (Test-Path $c)) { return $c }
  }
  try {
    return (Get-Command AutoHotkey.exe -ErrorAction Stop).Source
  } catch {
    return $null
  }
}

$lockAcquired = $false
$claimAcquired = $false
$claimId = $null
$eventId = [Guid]::NewGuid().ToString()
$eventTimestamp = [DateTimeOffset]::Now.ToString('o')
$dispatchAttempted = $false
$dispatchResult = 'queued'
$checkpointState = 'required'
$stopReasonCode = $null
$stopReasonDetail = $null
$finalRecommendation = 'queue_only'
$instructionSha = $null
$state = $null

$requiredEventFields = @(
  'event_id',
  'event_timestamp_iso',
  'source_packet_id',
  'branch_hint',
  'queue_entry_id',
  'claim_id',
  'dispatch_attempted',
  'dispatch_result',
  'checkpoint_state',
  'stop_reason_code',
  'stop_reason_detail',
  'operator_acknowledged'
)

$lockAcquired = $false
try {
  if (Test-Path $lockPath) {
    $stale = $false
    try {
      $lockObj = Get-Content $lockPath -Raw | ConvertFrom-Json
      $startedAt = [DateTimeOffset]::Parse($lockObj.started_at)
      $age = ([DateTimeOffset]::Now - $startedAt).TotalSeconds
      $pid = [int]$lockObj.pid

      $running = $false
      try { Get-Process -Id $pid -ErrorAction Stop | Out-Null; $running = $true } catch {}

      if ($running -and $age -lt $LockTimeoutSeconds) {
        $stopReasonCode = 'claim_active_blocked'
        $stopReasonDetail = "Active launch lock pid=$pid age=$([int]$age)s."
        $finalRecommendation = 'queue_only'
      } else {
        $stale = $true
      }
    } catch {
      $stale = $true
    }

    if ($stale) {
      Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
    }
  }

  if (-not $stopReasonCode) {
    $lockObj = [ordered]@{
      pid = $PID
      started_at = [DateTimeOffset]::Now.ToString('o')
      instruction_file = $InstructionFile
      lane_id = $LaneId
    }
    $lockObj | ConvertTo-Json | Set-Content -Path $lockPath -Encoding UTF8
    $lockAcquired = $true
  }

  $instructionText = (Get-Content -Path $InstructionFile -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($instructionText)) {
    throw "Instruction file is empty: $InstructionFile"
  }
  $instructionSha = (Get-FileHash -Path $InstructionFile -Algorithm SHA256).Hash

  $branchHint = ''
  try {
    $branchHint = (git -C $RepoRoot branch --show-current 2>$null).Trim()
  } catch {
    $branchHint = ''
  }
  if ([string]::IsNullOrWhiteSpace($branchHint)) {
    $branchHint = 'unknown'
  }

  $event = [ordered]@{
    event_id = $eventId
    event_timestamp_iso = $eventTimestamp
    source_packet_id = $SourcePacketId
    branch_hint = $branchHint
    queue_entry_id = $eventId
    claim_id = $null
    dispatch_attempted = $false
    dispatch_result = 'queued'
    checkpoint_state = 'required'
    stop_reason_code = $null
    stop_reason_detail = $null
    operator_acknowledged = [bool]$OperatorAcknowledged
    lane_id = $LaneId
    instruction_file = $InstructionFile
    instruction_sha256 = $instructionSha
    final_recommendation_state = 'queue_only'
  }

  Append-JsonLine -Path $queuePath -Object $event

  $state = Read-JsonFileOrNull -Path $statePath

  if (-not $stopReasonCode) {
    if (-not $Force -and $state -and $state.last_sent_at) {
      try {
        $last = [DateTimeOffset]::Parse([string]$state.last_sent_at)
        $elapsed = ([DateTimeOffset]::Now - $last).TotalSeconds
        if ($elapsed -lt $CooldownSeconds) {
          $stopReasonCode = 'checkpoint_required'
          $stopReasonDetail = "Cooldown active ($([int]$elapsed)s < $CooldownSeconds s)."
          $finalRecommendation = 'checkpoint_required'
          $checkpointState = 'required'
        }
      } catch {}
    }
  }

  if (-not $stopReasonCode) {
    $scopeIssue = Get-StopReasonFromInstruction -Text $instructionText -LockedScopeApproved ([bool]$ExplicitLockedScopeApproval
    )
    if ($scopeIssue) {
      $stopReasonCode = [string]$scopeIssue.code
      $stopReasonDetail = [string]$scopeIssue.detail
      if ($stopReasonCode -in @('operator_locked_scope_blocked', 'runtime_broadening_blocked')) {
        $finalRecommendation = 'operator_decision_required'
      } else {
        $finalRecommendation = 'blocked_require_fix_packet'
      }
    }
  }

  if (-not $stopReasonCode -and (Test-Path $claimPath)) {
    $activeClaim = Read-JsonFileOrNull -Path $claimPath
    if ($activeClaim -and $activeClaim.pid -and $activeClaim.started_at) {
      $claimPid = [int]$activeClaim.pid
      $claimStarted = [DateTimeOffset]::Parse([string]$activeClaim.started_at)
      $claimAge = ([DateTimeOffset]::Now - $claimStarted).TotalSeconds
      $claimRunning = $false
      try { Get-Process -Id $claimPid -ErrorAction Stop | Out-Null; $claimRunning = $true } catch {}
      if ($claimRunning -and $claimAge -lt $LockTimeoutSeconds) {
        $claimId = [string]$activeClaim.claim_id
        $stopReasonCode = 'claim_active_blocked'
        $stopReasonDetail = "Active lane claim id=$claimId pid=$claimPid age=$([int]$claimAge)s."
        $finalRecommendation = 'queue_only'
      } else {
        Remove-Item -LiteralPath $claimPath -Force -ErrorAction SilentlyContinue
      }
    } else {
      Remove-Item -LiteralPath $claimPath -Force -ErrorAction SilentlyContinue
    }
  }

  $lastCompleteAt = Get-LatestSliceTimestamp -LogPath $sliceLogPath -Marker 'COMPLETE'
  $lastStartupReadyAt = Get-LatestSliceTimestamp -LogPath $sliceLogPath -Marker 'STARTUP-READY'

  if (-not $stopReasonCode) {
    if (-not $lastCompleteAt -or -not $lastStartupReadyAt) {
      $stopReasonCode = 'checkpoint_required'
      $stopReasonDetail = 'Missing required startup/completion slice-log metadata.'
      $finalRecommendation = 'checkpoint_required'
      $checkpointState = 'required'
    }
  }

  if (-not $stopReasonCode) {
    $sendsSinceCheckpoint = $null
    $lastCheckpointAckAt = $null
    if ($state -and $null -ne $state.sends_since_checkpoint) {
      try { $sendsSinceCheckpoint = [int]$state.sends_since_checkpoint } catch {}
    }
    if ($state -and $state.last_checkpoint_ack_at) {
      try { $lastCheckpointAckAt = [DateTimeOffset]::Parse([string]$state.last_checkpoint_ack_at) } catch {}
    }

    if (-not $OperatorAcknowledged) {
      if ($null -eq $sendsSinceCheckpoint -or $null -eq $lastCheckpointAckAt) {
        $stopReasonCode = 'checkpoint_required'
        $stopReasonDetail = 'Checkpoint metadata missing; manual operator checkpoint acknowledgment required.'
        $finalRecommendation = 'checkpoint_required'
        $checkpointState = 'required'
      } else {
        if ($PacketRisk -in @('medium', 'high') -and $sendsSinceCheckpoint -ge 1) {
          $stopReasonCode = 'checkpoint_overdue_packet_count'
          $stopReasonDetail = "sends_since_checkpoint=$sendsSinceCheckpoint for risk=$PacketRisk."
          $finalRecommendation = 'checkpoint_required'
          $checkpointState = 'overdue'
        } elseif ($PacketRisk -eq 'low') {
          $elapsedMin = ([DateTimeOffset]::Now - $lastCheckpointAckAt).TotalMinutes
          if ($elapsedMin -ge 30) {
            $stopReasonCode = 'checkpoint_overdue_time'
            $stopReasonDetail = "elapsed_minutes_since_checkpoint=$([int][Math]::Floor($elapsedMin))."
            $finalRecommendation = 'checkpoint_required'
            $checkpointState = 'overdue'
          } else {
            $checkpointState = 'ready'
          }
        } else {
          $checkpointState = 'ready'
        }
      }
    } else {
      $checkpointState = 'ready'
    }
  }

  if (-not $stopReasonCode) {
    $claimId = [Guid]::NewGuid().ToString()
    $claim = [ordered]@{
      claim_id = $claimId
      lane_id = $LaneId
      pid = $PID
      started_at = [DateTimeOffset]::Now.ToString('o')
      source_packet_id = $SourcePacketId
      queue_entry_id = $eventId
    }
    $claim | ConvertTo-Json | Set-Content -Path $claimPath -Encoding UTF8
    $claimAcquired = $true

    $dispatchAttempted = $true
    if ($NoDispatch) {
      $dispatchResult = 'dispatched'
      $finalRecommendation = 'allow_dispatch'
    } else {
      $ahkExe = Find-AhkExecutable
      if (-not $ahkExe) {
        $stopReasonCode = 'queue_integrity_blocked'
        $stopReasonDetail = 'AutoHotkey v2 executable not found.'
        $dispatchResult = 'blocked'
        $finalRecommendation = 'blocked_require_fix_packet'
      } else {
        $proc = Start-Process -FilePath $ahkExe -ArgumentList @(
          "`"$ahkScriptPath`"",
          "`"$InstructionFile`"",
          "`"$logPath`""
        ) -WindowStyle Hidden -PassThru

        $null = $proc.WaitForExit(30000)
        if (-not $proc.HasExited) {
          try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
          $stopReasonCode = 'queue_integrity_blocked'
          $stopReasonDetail = 'Timed out waiting for sender process.'
          $dispatchResult = 'blocked'
          $finalRecommendation = 'blocked_require_fix_packet'
        } elseif ($proc.ExitCode -ne 0) {
          $stopReasonCode = 'queue_integrity_blocked'
          $stopReasonDetail = "Sender exit code $($proc.ExitCode)."
          $dispatchResult = 'blocked'
          $finalRecommendation = 'blocked_require_fix_packet'
        } else {
          $dispatchResult = 'dispatched'
          $finalRecommendation = 'allow_dispatch'
        }
      }
    }
  }

  if (-not $dispatchAttempted) {
    if ($stopReasonCode) {
      if ($stopReasonCode -eq 'claim_active_blocked') {
        $dispatchResult = 'queued'
      } else {
        $dispatchResult = 'blocked'
      }
    }
  }

  $event['claim_id'] = $claimId
  $event['dispatch_attempted'] = [bool]$dispatchAttempted
  $event['dispatch_result'] = $dispatchResult
  $event['checkpoint_state'] = $checkpointState
  $event['stop_reason_code'] = $stopReasonCode
  $event['stop_reason_detail'] = $stopReasonDetail
  $event['final_recommendation_state'] = $finalRecommendation

  foreach ($f in $requiredEventFields) {
    if (-not $event.Contains($f)) {
      $event['dispatch_attempted'] = $false
      $event['dispatch_result'] = 'blocked'
      $event['checkpoint_state'] = 'required'
      $event['stop_reason_code'] = 'missing_evidence_fields_blocked'
      $event['stop_reason_detail'] = "Missing required evidence field: $f"
      $event['final_recommendation_state'] = 'blocked_require_fix_packet'
      break
    }
  }

  Append-JsonLine -Path $eventPath -Object $event

  $oldSendCount = 0
  $oldSendsSinceCheckpoint = 0
  $oldCheckpointAck = $null
  if ($state) {
    try { if ($state.send_count) { $oldSendCount = [int]$state.send_count } } catch {}
    try { if ($null -ne $state.sends_since_checkpoint) { $oldSendsSinceCheckpoint = [int]$state.sends_since_checkpoint } } catch {}
    try { if ($state.last_checkpoint_ack_at) { $oldCheckpointAck = [DateTimeOffset]::Parse([string]$state.last_checkpoint_ack_at) } } catch {}
  }

  $newCheckpointAck = $oldCheckpointAck
  if ($OperatorAcknowledged) {
    $newCheckpointAck = [DateTimeOffset]::Now
    $oldSendsSinceCheckpoint = 0
  }

  $newSendCount = $oldSendCount
  $newSendsSinceCheckpoint = $oldSendsSinceCheckpoint
  if ($event['dispatch_result'] -eq 'dispatched') {
    $newSendCount = $oldSendCount + 1
    $newSendsSinceCheckpoint = $oldSendsSinceCheckpoint + 1
  }

  $newState = [ordered]@{
    last_sent_at = [DateTimeOffset]::Now.ToString('o')
    send_count = $newSendCount
    sends_since_checkpoint = $newSendsSinceCheckpoint
    last_checkpoint_ack_at = if ($newCheckpointAck) { $newCheckpointAck.ToString('o') } else { $null }
    instruction_file = $InstructionFile
    instruction_sha256 = $instructionSha
    sender_pid = $PID
    lane_id = $LaneId
    cooldown_seconds = $CooldownSeconds
    last_event_id = $eventId
    last_dispatch_result = $event['dispatch_result']
    last_checkpoint_state = $event['checkpoint_state']
    last_stop_reason_code = $event['stop_reason_code']
    last_recommendation_state = $event['final_recommendation_state']
  }
  $newState | ConvertTo-Json | Set-Content -Path $statePath -Encoding UTF8

  $summary = [ordered]@{
    event_id = $eventId
    dispatch_result = $event['dispatch_result']
    checkpoint_state = $event['checkpoint_state']
    stop_reason_code = $event['stop_reason_code']
    final_recommendation_state = $event['final_recommendation_state']
    send_count = $newState.send_count
    sends_since_checkpoint = $newState.sends_since_checkpoint
  }
  $summaryJson = $summary | ConvertTo-Json -Compress
  if ($event['dispatch_result'] -eq 'dispatched') {
    Write-Host "Supervisor packet handled: $summaryJson" -ForegroundColor Green
  } else {
    Write-Host "Supervisor packet not dispatched: $summaryJson" -ForegroundColor Yellow
  }
} finally {
  if ($claimAcquired -and (Test-Path $claimPath)) {
    Remove-Item -LiteralPath $claimPath -Force -ErrorAction SilentlyContinue
  }
  if ($lockAcquired -and (Test-Path $lockPath)) {
    Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
  }
}
