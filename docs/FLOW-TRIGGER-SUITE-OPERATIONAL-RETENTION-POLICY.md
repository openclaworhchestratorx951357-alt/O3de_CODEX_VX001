# Flow Trigger Suite Operational Retention Policy

Status: retention policy complete (local-only operational guardrail)
Scope: queue/event/log artifact retention and bounded rotation policy
Behavior impact: local artifact management only; no runtime capability broadening

## Purpose

Define deterministic, operator-auditable retention boundaries for Flow Trigger
Suite local artifacts so evidence remains useful without unbounded growth.

## Current baseline

Current merged baseline remains:

- `docs/FLOW-TRIGGER-SUITE-STABILITY-AUDIT.md`
- admitted local-only rollout/launcher corridor docs

## Implemented policy assets

Added:

- `scripts/Codex-Supervisor-Retention-Policy.json`
- `scripts/Invoke-Codex-Supervisor-Retention-Audit.ps1`
- `scripts/Test-Codex-Supervisor-Retention.ps1`

Updated:

- `scripts/Codex-Supervisor-Packet.README.md`

## Policy boundaries

Managed files:

- `continue-queue/codex-supervisor-packet-queue.jsonl`
  - max lines: `5000`
  - overflow archive suffix: `.archive.jsonl`
- `continue-queue/codex-supervisor-packet-events.jsonl`
  - max lines: `5000`
  - overflow archive suffix: `.archive.jsonl`
- `continue-queue/codex-supervisor-packet.log`
  - max lines: `20000`
  - overflow archive suffix: `.archive.log`

Always retained (no rotation by this policy):

- `continue-queue/codex-supervisor-packet-state.json`
- `continue-queue/codex-slice-log.txt`

## Enforcement model

Default mode is non-destructive audit:

- reports current counts and trim recommendations
- writes summary JSON:
  - `continue-queue/codex-supervisor-retention-audit.json`
- does not mutate target files

Apply mode (explicit) requires:

- `-Apply -ConfirmApply`

Apply behavior:

- trims oldest lines beyond policy max
- appends trimmed lines to archive file
- preserves newest retained lines in active file

## Validation evidence

Executed:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Packet.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Rollout.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Stability.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Test-Codex-Supervisor-Retention.ps1 -RepoRoot "C:\Users\topgu\OneDrive\Documents\New project-clean-main-sync"
```

Observed summary:

- `PASS: Flow Trigger Suite validation checks (5 scenarios).`
- `PASS: Flow Trigger Suite rollout profile checks.`
- `PASS: Flow Trigger Suite stability audit checks.`
- `PASS: Flow Trigger Suite retention policy checks.`

## Capability maturity movement

- `codex.flow.trigger.local`
  - old: `stability-audited`
  - new: `retention-governed`
- `codex.flow.trigger.audit_gate`
  - old: `stability-audited`
  - new: `retention-governed`
- `codex.flow.trigger.productized`
  - old: `gated real (local-only admitted corridor; stability audited)`
  - new: `gated real (retention-governed local admitted corridor)`

## Safety boundaries preserved

- no runtime/provider/editor/build execution broadening
- no mutation admission broadening
- no operator-locked policy file edits
- no global/system installs required

## Recommended next packet

Flow Trigger Suite retention enforcement verification packet:

- run retention audit helper against representative local artifact snapshots
- publish compact before/after evidence guidance for operators

Retention enforcement verification status:

- completed in `docs/FLOW-TRIGGER-SUITE-RETENTION-ENFORCEMENT-VERIFICATION.md`
- next safe gate is Flow Trigger Suite retention operations checkpoint packet
