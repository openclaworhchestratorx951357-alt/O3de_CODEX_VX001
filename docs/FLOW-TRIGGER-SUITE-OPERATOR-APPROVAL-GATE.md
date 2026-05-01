# Flow Trigger Suite Operator-approval Gate

Status: completed (governance/docs only; non-admitting)

## Purpose

Define explicit operator-approval semantics for Flow Trigger helper surfaces
before any runtime-admission readiness discussion.

## Scope in this packet

- define operator roles and acknowledgement requirements
- define approval token semantics (issue, expiry, replay invalidation, revoke)
- define minimum evidence required for approval eligibility
- define fail-closed refusal behavior when approval context is missing or stale
- roll recommendations to runtime-admission readiness audit

## Approval semantics (design/governance only)

1. Approval roles
   - requester: may request helper-driven continuation behavior
   - reviewer: validates risk controls and evidence completeness
   - approver: explicit authority to grant bounded approval token
2. Required acknowledgement fields
   - `approval_scope_id`
   - `approved_packet_id`
   - `reviewed_risk_class`
   - `evidence_bundle_reference`
   - `approved_by`
   - `approved_at`
   - `expires_at`
3. Expiry and replay behavior
   - approvals expire at bounded time window
   - expired approvals are invalid and must fail closed
   - replayed approvals outside scope/time are invalid and must fail closed
4. Revocation behavior
   - explicit revocation invalidates token immediately
   - revoked token usage returns deterministic refusal reason
5. Scope boundary
   - approval tokens are non-portable across packet ids
   - helper payloads remain non-authorizing; token validation remains server-owned

## Minimum evidence before approval can be granted

- security-review threat/control checklist pass state
- idempotency/replay control verification
- provenance/source identity verification
- refusal-path coverage for malformed/forged/stale approval states

## Fail-closed refusal requirements

- missing approval context -> `blocked_missing_operator_approval`
- expired approval -> `blocked_expired_operator_approval`
- revoked approval -> `blocked_revoked_operator_approval`
- scope mismatch -> `blocked_approval_scope_mismatch`
- missing evidence bundle -> `blocked_missing_approval_evidence`

## Boundary posture (unchanged)

- no runtime capability admission broadened
- no execution or mutation corridor broadening
- no policy authorization broadening
- helper lanes remain local workflow helpers

## Evidence

- `docs/FLOW-TRIGGER-SUITE-PRODUCTIZATION-PLAN.md`
- `docs/FLOW-TRIGGER-SUITE-AUDIT-GATE-CHECKLIST.md`
- `docs/FLOW-TRIGGER-SUITE-PRODUCTIZATION-DESIGN.md`
- `docs/FLOW-TRIGGER-SUITE-SECURITY-REVIEW-GATE.md`
- `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`
- `scripts/Add-Codex-Slice-Log.ps1`

## Recommended next packet

Flow Trigger Suite runtime-admission readiness audit
(`codex/flow-trigger-suite-runtime-admission-readiness-audit`).
