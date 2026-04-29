# Flow Trigger Suite Threat-Model Design

Status: design-only (no runtime automation or mutation admission change)
Scope: local Flow Trigger Suite queue/claim/dispatch/evidence workflow
Behavior impact: none (threat model + mitigation mapping only)

## Purpose

Define an explicit misuse/abuse threat model for local Flow Trigger Suite
helpers so future implementation packets can harden queue/claim/dispatch
behavior without widening execution authority.

## Current baseline

Current merged baseline remains:

- `docs/FLOW-TRIGGER-SUITE-PRODUCTIZATION-PLAN.md`
- `docs/FLOW-TRIGGER-SUITE-AUDIT-GATE-CHECKLIST.md`

Current truth:

- productization architecture and checklist gates are documented
- deterministic checkpoint cadence, stop reasons, and evidence fields are
  defined
- implementation touchpoints are not yet admitted
- runtime execution/mutation surfaces remain unchanged

## Capability maturity movement

- `codex.flow.trigger.local`
  - old maturity: `checklist-governed local helper`
  - packet result: `threat-modeled local helper`
- `codex.flow.trigger.audit_gate`
  - old maturity: `checklist complete`
  - packet result: `threat-modeled gate`
- `codex.flow.trigger.productized`
  - old maturity: `missing`
  - packet result: unchanged (`missing`; threat model now design-complete)

## Trust boundaries and assets

Primary trust boundaries:

- operator instruction boundary (explicit packet intent only)
- local workspace lane boundary (one active claim token)
- queue integrity boundary (append-only events; no overwrite)
- evidence integrity boundary (required field contract; deterministic stop code)

Primary assets:

- packet scope integrity
- branch/claim ownership integrity
- checkpoint cadence compliance
- audit evidence completeness
- local-only execution posture

## Misuse and abuse threat matrix

| Threat ID | Surface | Abuse path | Impact | Mitigation design (mapped gate) | Residual risk |
| --- | --- | --- | --- | --- | --- |
| FTM-01 | claim protocol | parallel claim overwrite or dual-claim race | cross-slice collision, non-deterministic dispatch | enforce one active claim token per lane; block dispatch when claim active (`Gate 1`, `claim_active_blocked`) | medium until implementation lock is proven |
| FTM-02 | queue substrate | event overwrite, deletion, or reorder | loss of operator intent and audit continuity | append-only queue semantics + queue integrity check (`Gate 1`, `queue_integrity_blocked`) | medium until append-only write path is tested |
| FTM-03 | packet boundary | multi-intent or ambiguous packet request | hidden scope broadening | require one packet intent and explicit scope validation (`Gate 2`, `packet_scope_ambiguous_blocked`) | low after deterministic parser checks |
| FTM-04 | locked files | trigger event attempts operator-locked file edits | governance bypass risk | refuse locked-file scope without explicit instruction (`Gate 2`, `operator_locked_scope_blocked`) | low; remains policy-enforced |
| FTM-05 | checkpoint cadence | repeated auto-dispatch without checkpoint | audit drift and stale context execution | enforce packet/time cadence thresholds with fail-closed defaults (`Gate 3`, `checkpoint_overdue_*`) | medium until scheduler timestamps are validated |
| FTM-06 | runtime broadening | trigger event routes into execution/mutation surfaces | unauthorized runtime mutation | explicit no-runtime-broadening guard in dispatch preflight (`Gate 2`, `runtime_broadening_blocked`) | medium until implementation includes explicit allowlist |
| FTM-07 | evidence journal | missing required evidence fields | unverifiable dispatch decisions | required evidence field contract before dispatch result commit (`Gate 5`, `missing_evidence_fields_blocked`) | low once schema check is enforced |
| FTM-08 | stop reasons | free-form/non-deterministic stop output | weak operator auditability | deterministic stop-reason code taxonomy with optional detail field (`Gate 4`) | low; design-complete |

## Mitigation ownership map

- Queue/claim lock integrity: implementation touchpoint packet
- Dispatch scope and runtime-broadening refusal: implementation touchpoint packet
- Evidence schema and stop-reason determinism: implementation + validation packet
- Cadence threshold and checkpoint state transitions: validation packet

## Security and governance constraints

- local-only helper posture remains required
- no global/system installs are required for this packet
- no runtime bridge/provider/editor/build execution changes
- no project file mutation admission changes
- no client approval/session fields treated as authorization

## Required tests for future implementation packet

Future implementation must include targeted checks for:

- claim-active dispatch refusal and queue-only result
- append-only queue insertion and no-overwrite invariant
- ambiguous packet scope refusal
- locked-file scope refusal
- runtime broadening refusal
- missing evidence field refusal
- deterministic stop-reason code emission

## What remains blocked

This packet does not admit:

- automated runtime execution or mutation
- broad background automation authority
- bypass of checkpoint or slice-log gates
- productized public trigger corridor

## Recommended next packet

Flow Trigger Suite implementation touchpoint packet:

- implement local queue/claim/evidence skeleton for checklist + threat
  mitigations
- preserve fail-closed behavior and local-only boundaries
- add targeted no-runtime-impact verification

Implementation touchpoint status:

- completed in `docs/FLOW-TRIGGER-SUITE-IMPLEMENTATION-TOUCHPOINT.md`
- next safe gate is Flow Trigger Suite validation packet
