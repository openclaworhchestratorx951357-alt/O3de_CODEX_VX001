# Flow Trigger Suite Runtime-admission Contract Design

Status: completed (governance/docs only; non-admitting)

## Purpose

Define the exact fail-closed runtime-admission contract for Flow Trigger Suite
helper lanes before any proof-only implementation work.

## Scope in this packet

- define exact contract fields and ownership boundaries
- define deny-by-default state machine and refusal taxonomy
- define fail-closed transitions for approval, replay, and scope mismatch
- define bounded proof-only harness requirements for next packet
- preserve explicit no-touch runtime zones

## Contract envelope (design only)

Required top-level fields:

- `contract_version`
- `packet_id`
- `event_source`
- `event_timestamp`
- `idempotency_key`
- `requested_action`
- `approval_context`
- `decision_state`
- `fail_closed_reasons`
- `execution_admitted`
- `mutation_admitted`
- `operator_review_fields`

Ownership rules:

- helper payload fields are signals only
- authorization/admission decisions remain server-owned
- client/helper text cannot grant execution or mutation admission

## Deny-by-default state machine

Initial state:

- `received_untrusted`

Allowed transitions:

1. `received_untrusted -> blocked_missing_approval`
2. `received_untrusted -> blocked_expired_approval`
3. `received_untrusted -> blocked_revoked_approval`
4. `received_untrusted -> blocked_approval_scope_mismatch`
5. `received_untrusted -> blocked_replay_window`
6. `received_untrusted -> blocked_action_not_allowlisted`
7. `received_untrusted -> blocked_policy_mismatch`
8. `received_untrusted -> ready_for_proof_only_review`

Invariant:

- `execution_admitted=false` and `mutation_admitted=false` for every state in
  this packet.

## Fail-closed transition requirements

Approval failures:

- missing approval context -> `blocked_missing_approval`
- expired token -> `blocked_expired_approval`
- revoked token -> `blocked_revoked_approval`

Replay failures:

- duplicate `idempotency_key` inside replay window -> `blocked_replay_window`
- no implicit retry escalation path

Scope mismatch failures:

- `approved_packet_id` mismatch -> `blocked_approval_scope_mismatch`
- `requested_action` not in allowlist -> `blocked_action_not_allowlisted`

## Required review/status fields

- `approval_scope_id`
- `approved_packet_id`
- `reviewed_risk_class`
- `approval_state`
- `decision_state`
- `fail_closed_reasons`
- `execution_admitted`
- `mutation_admitted`
- `next_safe_step`

These fields are review evidence only, not authorization shortcuts.

## Proof-only harness requirements (next packet)

1. Validate every blocked transition deterministically.
2. Validate idempotency/replay suppression with bounded test vectors.
3. Validate scope mismatch behavior for packet id and action allowlist.
4. Emit operator-facing fail-closed reason taxonomy consistently across
   planner/catalog/fixture surfaces.
5. Preserve non-admitting state:
   - `execution_admitted=false`
   - `mutation_admitted=false`

## No-touch zones (unchanged)

- no backend adapter runtime admission broadening
- no execution corridor broadening
- no mutation corridor broadening
- no client-field authorization behavior
- no dependency or policy broadening

## Evidence

- `docs/FLOW-TRIGGER-SUITE-PRODUCTIZATION-PLAN.md`
- `docs/FLOW-TRIGGER-SUITE-AUDIT-GATE-CHECKLIST.md`
- `docs/FLOW-TRIGGER-SUITE-PRODUCTIZATION-DESIGN.md`
- `docs/FLOW-TRIGGER-SUITE-SECURITY-REVIEW-GATE.md`
- `docs/FLOW-TRIGGER-SUITE-OPERATOR-APPROVAL-GATE.md`
- `docs/FLOW-TRIGGER-SUITE-RUNTIME-ADMISSION-READINESS-AUDIT.md`
- `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`

## Recommended next packet

Flow Trigger Suite runtime-admission proof-only implementation
(`codex/flow-trigger-suite-runtime-admission-proof-only-implementation`).
