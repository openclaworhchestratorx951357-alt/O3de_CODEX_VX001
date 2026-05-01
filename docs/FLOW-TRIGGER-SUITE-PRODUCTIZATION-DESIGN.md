# Flow Trigger Suite Productization Design

Status: completed (plan-only; non-admitting)

## Purpose

Define a bounded productization design contract for Flow Trigger helper
surfaces without admitting runtime execution or mutation authority.

## Scope in this packet

- select one bounded candidate productization surface
- define trust, authorization, and fail-closed contract boundaries
- define allowed vs forbidden side effects
- define evidence and validation requirements for future gates
- roll recommendation surfaces to the next security/review packet

## Selected bounded candidate surface

Candidate: local slice-log trigger relay handoff.

Intent:
- detect a new slice-log line
- map it to a bounded continuation instruction
- enqueue the instruction for local operator-run relay handling

This remains design-only in this packet. No runtime admission is granted.

## Contract boundaries (design-only)

1. Caller identity and trust
   - caller must be local-only helper context
   - caller identity must be captured in audit metadata
   - client text/input must not be treated as authorization
2. Authorization and policy
   - helper events are non-authorizing signals
   - execution admission remains server-owned and fail-closed
   - missing/invalid policy state defaults to no-op + blocked classification
3. Input envelope
   - required fields:
     - `event_source`
     - `event_timestamp`
     - `slice_log_line`
     - `candidate_packet_id`
   - optional fields are non-authorizing hints only
4. Fail-closed behavior
   - unrecognized packet ids -> reject with explicit reason code
   - malformed log line -> reject without retry storm
   - duplicate replay window hit -> ignore + emit idempotent audit event
5. Side-effect boundaries
   - allowed:
     - local queue append for bounded relay candidate
     - local audit/status log entry
   - forbidden:
     - direct backend admission changes
     - direct mutation corridor invocation
     - broad script/shell execution
     - policy bypass through helper input

## Risk classes for future implementation

- Low: passive watcher/log surfaces
- Medium: bounded relay enqueue without admission authority
- High: any path that could be interpreted as execution authority

## Required future gates before any runtime-admission discussion

1. security/review gate checklist for threat model and abuse cases
2. explicit operator approval semantics for relay-triggered actions
3. CI policy checks for risky patterns and replay/idempotency behavior
4. refusal and fail-closed regression tests for malformed and adversarial
   inputs

## Not in scope

- no helper runtime admission
- no backend adapter/policy broadening
- no execution or mutation corridor broadening
- no dependency upgrades or global installs

## Evidence

- `scripts/Watch-Slice-Log-And-Trigger.ps1`
- `scripts/auto_continue_watcher.py`
- `scripts/local_continue_relay.py`
- `scripts/Trigger-Codex-Continue-Direct.ps1`
- `scripts/Add-Codex-Slice-Log.ps1`
- `docs/FLOW-TRIGGER-SUITE-PRODUCTIZATION-PLAN.md`
- `docs/FLOW-TRIGGER-SUITE-AUDIT-GATE-CHECKLIST.md`
- `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`

## Recommended next packet

Flow Trigger Suite security-review gate
(`codex/flow-trigger-suite-security-review-gate`).
