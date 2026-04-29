# Codex Supervisor Packet Launcher

This launcher sends a predefined supervisor instruction into a Codex Desktop window,
with guardrails to prevent collisions with other running triggers.

## Files
- `scripts\Invoke-Codex-Supervisor-Packet.ps1`
- `scripts\Invoke-Codex-Supervisor-Rollout.ps1`
- `scripts\Codex-Supervisor-Rollout-Profiles.json`
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
- `scripts\Run-Codex-Supervisor-Rollout.cmd`
- optional desktop shortcut `Codex Supervisor Packet.lnk`
- optional desktop shortcut `Codex Supervisor Rollout.lnk`

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

## Validation harness
Run deterministic local no-dispatch validation:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Packet.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Rollout.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Stability.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Enforcement.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Operations-Checkpoint.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Anomaly-Drill.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Handoff.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Adoption-Checkpoint.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Followup-Scheduler.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Followup-Execution-Drill.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Closure-Checkpoint.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Escalation-Rehearsal.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Operator-Handoff-Closeout.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Final-Governance-Closeout.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Governance-Maintenance-Cadence.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Maintenance-Automation-Handoff.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Governance-Lifecycle-Freeze.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Handoff-Checkpoint.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Startup-Evidence-Rehearsal.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
```

## Retention policy helper
Audit-only (no file mutation):

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Audit.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Apply policy with explicit confirmation:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Audit.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project" -Apply -ConfirmApply
```

Operations checkpoint:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Checkpoint.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Anomaly drill evidence helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Anomaly-Drill.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence handoff helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Handoff.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project" -LaneRisk medium -LaneId lane-default
```

Cadence adoption checkpoint helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Adoption-Checkpoint.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence follow-up scheduler helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Followup-Scheduler.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence follow-up execution drill helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Followup-Execution-Drill.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence closure checkpoint helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Closure-Checkpoint.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence escalation rehearsal helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Escalation-Rehearsal.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence operator handoff closeout helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Operator-Handoff-Closeout.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence final governance closeout helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Final-Governance-Closeout.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence governance maintenance helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Governance-Maintenance-Cadence.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence maintenance automation handoff helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Maintenance-Automation-Handoff.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence governance lifecycle freeze helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Governance-Lifecycle-Freeze.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence frozen lifecycle handoff checkpoint helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Handoff-Checkpoint.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Cadence frozen lifecycle startup evidence rehearsal helper:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Frozen-Lifecycle-Startup-Evidence-Rehearsal.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

## Productized rollout controls
Use the rollout wrapper for bounded profiles:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Rollout.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project" -Profile standard -OperatorAcknowledged
```

Profiles are defined in `scripts\Codex-Supervisor-Rollout-Profiles.json`:
- `standard`: medium-risk, requires operator acknowledgment
- `docs_low_risk`: low-risk docs profile
- `operator_decision`: high-risk operator-driven profile with explicit locked-scope approval support
