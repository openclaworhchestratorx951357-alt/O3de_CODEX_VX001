# Flow Trigger Suite Retention Anomaly Drill Evidence

Status: retention anomaly drill evidence complete (local-only operational governance)
Scope: deterministic ready/attention/escalation checkpoint drills plus operator triage mapping
Behavior impact: none beyond local drill evidence and triage guidance

## Purpose

Add explicit operator drill evidence for retention checkpoint states so triage
actions are repeatable and auditable when anomalies appear.

## Current baseline

Current merged baseline remains:

- `docs/FLOW-TRIGGER-SUITE-RETENTION-OPERATIONS-CHECKPOINT.md`
- `scripts/Invoke-Codex-Supervisor-Retention-Checkpoint.ps1`
- `scripts/Test-Codex-Supervisor-Retention-Operations-Checkpoint.ps1`

## Implemented assets

Added:

- `scripts/Invoke-Codex-Supervisor-Retention-Anomaly-Drill.ps1`
- `scripts/Test-Codex-Supervisor-Retention-Anomaly-Drill.ps1`

Updated:

- `scripts/Codex-Supervisor-Packet.README.md`

## Drill scenarios

The drill helper runs in an isolated temporary sandbox and evaluates:

1. `ready-baseline`
2. `attention-trim-warning`
3. `escalation-trim-critical`

Each scenario records:

- expected and actual `checkpoint_state`
- expected and actual `recommended_action`
- exit code behavior
- findings summary

## Operator triage mapping (evidence-backed)

- `ready` -> `retain_standard_schedule`
- `attention_required` -> `schedule_followup_audit_and_review_archive_growth`
- `escalation_required` -> `run_apply_with_operator_ack_and_open_followup_packet`

## Command

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Invoke-Codex-Supervisor-Retention-Anomaly-Drill.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project"
```

Default output:

- `continue-queue/codex-supervisor-retention-anomaly-drill.json`

## Validation evidence

Executed:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Packet.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Rollout.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Stability.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Enforcement.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Operations-Checkpoint.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention-Anomaly-Drill.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
```

Observed summary includes:

- `PASS: Flow Trigger Suite retention anomaly drill checks.`

## Capability maturity movement

- `codex.flow.trigger.local`
  - old: `operations-checkpointed`
  - new: `triage-drill-evidenced`
- `codex.flow.trigger.audit_gate`
  - old: `operations-checkpointed`
  - new: `triage-drill-evidenced`
- `codex.flow.trigger.productized`
  - old: `gated real (operations-checkpointed local admitted corridor; broader expansion withheld)`
  - new: `gated real (triage-drill-evidenced local admitted corridor; broader expansion withheld)`

## Safety boundaries preserved

- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval/session fields treated as authorization

## Recommended next packet

Flow Trigger Suite retention cadence handoff packet:

- define explicit operational cadence windows by lane risk class
- publish compact on-call handoff template for anomaly triage
