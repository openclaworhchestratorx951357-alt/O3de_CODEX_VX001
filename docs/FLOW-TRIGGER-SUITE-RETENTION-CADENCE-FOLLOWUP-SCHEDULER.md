# Flow Trigger Suite Retention Cadence Follow-up Scheduler

Status: retention cadence follow-up scheduler complete (local-only operational governance)
Scope: deterministic queue/event scheduling for missing or overdue cadence evidence
Behavior impact: none beyond local queue planning outputs for retained cadence governance

## Purpose

Consume adoption-checkpoint evidence and emit deterministic follow-up queue
records so lanes with missing state coverage or overdue evidence are scheduled
without manual triage drift.

## Current baseline

Current merged baseline remains:

- `docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-ADOPTION-CHECKPOINT.md`
- `scripts/Invoke-Codex-Supervisor-Retention-Cadence-Adoption-Checkpoint.ps1`
- `scripts/Test-Codex-Supervisor-Retention-Cadence-Adoption-Checkpoint.ps1`

## Implemented assets

Added:

- `scripts/Invoke-Codex-Supervisor-Retention-Cadence-Followup-Scheduler.ps1`
- `scripts/Test-Codex-Supervisor-Retention-Cadence-Followup-Scheduler.ps1`
- `docs/FLOW-TRIGGER-SUITE-RETENTION-CADENCE-FOLLOWUP-SCHEDULER.md`

Updated:

- `scripts/Codex-Supervisor-Packet.README.md`

## Scheduler contract

Inputs:

- adoption checkpoint:
  - `continue-queue/codex-supervisor-retention-cadence-adoption-checkpoint.json`
- optional grace:
  - `-OverdueGraceMinutes`

Outputs:

- `continue-queue/codex-supervisor-retention-cadence-followup-scheduler.json`
- `continue-queue/codex-supervisor-retention-cadence-followup-scheduler.txt`
- append-only queue records:
  - `continue-queue/codex-supervisor-packet-queue.jsonl`
- append-only event evidence records:
  - `continue-queue/codex-supervisor-packet-events.jsonl`

Scheduling rules:

- emit `state_coverage_missing` follow-ups for each missing state listed by the
  adoption checkpoint
- inspect per-state example handoff `cadence.next_audit_due_at`; emit
  `state_evidence_overdue` follow-ups when due time is stale
- dedupe by deterministic `followup_key`; existing non-completed queue records
  are preserved and not re-enqueued

## Commands

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Cadence-Followup-Scheduler.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

## Validation evidence

Executed:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Adoption-Checkpoint.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Cadence-Followup-Scheduler.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
```

Observed summary includes:

- `PASS: Flow Trigger Suite retention cadence follow-up scheduler checks.`

## Capability maturity movement

- `codex.flow.trigger.local`
  - old: `cadence-adoption-checkpointed`
  - new: `cadence-followup-scheduled`
- `codex.flow.trigger.audit_gate`
  - old: `cadence-adoption-checkpointed`
  - new: `cadence-followup-scheduled`
- `codex.flow.trigger.productized`
  - old: `gated real (cadence-adoption-checkpointed local admitted corridor; broader expansion withheld)`
  - new: `gated real (cadence-followup-scheduled local admitted corridor; broader expansion withheld)`

## Safety boundaries preserved

- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval/session fields treated as authorization

## Recommended next packet

Flow Trigger Suite retention cadence follow-up execution drill packet:

- simulate follow-up completion states (`completed`, `cancelled`) against queued
  scheduler records
- checkpoint queue aging and closure evidence for repeatable lane handoff
