# Codex Supervisor Packet Launcher

This launcher sends a predefined supervisor instruction into a Codex Desktop window,
with guardrails to prevent collisions with other running triggers.

## Files
- `scripts\Invoke-Codex-Supervisor-Packet.ps1`
- `scripts\Send-Codex-Instruction.ahk`
- `scripts\codex_supervisor_packet.txt`
- `scripts\Install-Codex-Supervisor-Packet-Launcher.ps1`

## Collision Guards
- Single-run lock file: `continue-queue\codex-supervisor-packet.lock`
- Lane claim token: `continue-queue\codex-supervisor-packet-claim-<lane>.json`
- Cooldown gate (default 120s) via state file:
  `continue-queue\codex-supervisor-packet-state.json`
- Append-only queue journal: `continue-queue\codex-supervisor-packet-queue.jsonl`
- Append-only event evidence journal:
  `continue-queue\codex-supervisor-packet-events.jsonl`
- No unsafe fallback to active window; it sends only to matched Codex windows.

## Checklist/Threat-model gates now enforced
- Queue/claim collision guard (`claim_active_blocked`)
- Packet scope guard (`packet_scope_ambiguous_blocked`)
- Locked-scope guard (`operator_locked_scope_blocked`)
- Runtime-broadening guard (`runtime_broadening_blocked`)
- Checkpoint cadence/metadata guard
  (`checkpoint_required`, `checkpoint_overdue_packet_count`,
  `checkpoint_overdue_time`)
- Required evidence output contract per trigger event

## Install (other laptop)
From repo root:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Install-Codex-Supervisor-Packet-Launcher.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project" -DesktopShortcut
```

This creates:
- `scripts\Run-Codex-Supervisor-Packet.cmd`
- optional desktop shortcut `Codex Supervisor Packet.lnk`

## Run
```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Packet.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

## Options
- `-CooldownSeconds 180` to increase no-collision wait between sends
- `-Force` to bypass cooldown once
- `-InstructionFile <path>` to send a different packet text
- `-SourcePacketId <id>` to stamp the evidence record
- `-LaneId <name>` to isolate claim tokens per lane
- `-PacketRisk low|medium|high` to apply checkpoint cadence policy
- `-OperatorAcknowledged` to record manual checkpoint acknowledgment
- `-ExplicitLockedScopeApproval` to allow locked-file mentions in instruction text
- `-NoDispatch` to run queue/gate/evidence flow without sending to Codex

## Logs/State
- Send log: `continue-queue\codex-supervisor-packet.log`
- State: `continue-queue\codex-supervisor-packet-state.json`
- Queue: `continue-queue\codex-supervisor-packet-queue.jsonl`
- Evidence events: `continue-queue\codex-supervisor-packet-events.jsonl`
