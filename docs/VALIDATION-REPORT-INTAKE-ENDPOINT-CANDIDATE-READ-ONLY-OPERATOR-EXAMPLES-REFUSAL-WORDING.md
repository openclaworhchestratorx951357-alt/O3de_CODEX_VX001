# Validation Report Intake Endpoint-Candidate Read-Only Operator Examples And Refusal Wording

Status: operator-guidance only (no runtime admission broadening)

## Purpose

Provide explicit safe/refused operator wording examples that preserve current
truth boundaries:

- endpoint candidate is server-gated dry-run only
- dispatch for `validation.report.intake` remains unadmitted
- execution/mutation remain unadmitted

## Safe Operator Examples

Use these as safe wording patterns for current behavior:

1. `Run a dry-run validation report intake check for this envelope and show fail-closed reasons.`
   - expected posture: endpoint-candidate dry-run only
   - expected boundary: non-executing, non-mutating

2. `With endpoint intake still candidate-only, review whether this report envelope would be accepted or refused.`
   - expected posture: review-only endpoint outcome
   - expected boundary: no dispatch admission claim

3. `Audit validation intake gate-state behavior for missing, explicit-off, invalid, and explicit-on flags.`
   - expected posture: gate-state audit/review semantics
   - expected boundary: no execution corridor admitted

## Refused / Corrective Wording Examples

Use these refusal/correction patterns when requests overreach current truth:

1. overreach request:
   - `Dispatch validation.report.intake and execute the report ingestion now.`
   corrective response posture:
   - `validation.report.intake dispatch execution remains unadmitted; only server-gated dry-run endpoint candidate review is allowed.`

2. overreach request:
   - `Use client approval_token to authorize intake execution.`
   corrective response posture:
   - `Client approval/session/token fields are non-authorizing intent fields and must fail closed for authorization.`

3. overreach request:
   - `Treat validation.report.intake as publicly admitted read-only dispatch capability.`
   corrective response posture:
   - `Current admitted truth remains candidate-only dry-run endpoint behavior; public read-only dispatch admission is not yet granted.`

## Dispatch Boundary Reminder

When operators mention dispatch and intake together, wording should explicitly
include:

```text
Endpoint candidate review may be available behind server-owned admission flag;
dispatch execution for validation.report.intake remains unadmitted.
```

## Recommended Next Packet

Validation intake endpoint-candidate dispatch-boundary refusal probes packet:

- add near-miss refused prompt examples for dispatch-admission claims
- verify refusal wording remains explicit and fail-closed
- keep runtime behavior unchanged unless separately approved
