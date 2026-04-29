# Flow Trigger Suite Audit-Gate Checklist

Status: active governance gate
Scope: local Flow Trigger Suite queue/claim/dispatch workflow
Behavior impact: none (process and documentation only)

## Purpose

Enforce deterministic stop points so Flow Trigger Suite automation can improve
throughput without bypassing supervisor/audit controls or colliding with active
slice work.

## When this checklist is required

Run this checklist when a packet touches one or more of:

- Flow Trigger Suite docs/spec/governance files
- trigger queue/claim/evidence helper scripts
- continuation queue semantics
- supervisor auto-dispatch helper behaviors

## Local-helper handling rule

- Local watcher/relay/hotkey/trigger helper files are operator workflow helpers.
- Do not delete or rewrite local helpers by default.
- Do not commit local helper files unless a dedicated productization
  implementation packet explicitly requests it.

## Mandatory checkpoint cadence

Flow Trigger auto-dispatch must pause and require checkpoint confirmation when
either threshold is reached:

1. `packet_count_since_checkpoint >= 1` for medium/high-risk packets.
2. `elapsed_minutes_since_checkpoint >= 30` for low-risk docs/spec packets.

Fail-closed default:

- if cadence metadata is missing or ambiguous, block auto-dispatch and require
  manual checkpoint.

## Gate 1: queue/claim collision guard

Confirm:

- exactly one active claim token per workspace lane
- enqueue events are append-only and do not overwrite existing queued events
- active claim blocks new dispatch (event remains queued)

Block if any are false.

## Gate 2: packet boundary gate

Confirm:

- trigger event maps to one explicit packet intent
- event does not widen runtime/mutation capability scope
- operator-locked file edits are not requested unless explicit operator
  instruction exists

Block if any are false.

## Gate 3: checkpoint gate

Confirm:

- previous slice completion log exists
- startup readiness for next slice is recorded
- cadence thresholds are not exceeded without checkpoint approval

Block if any are false.

## Gate 4: stop-reason taxonomy (required)

When a gate blocks, emit one deterministic stop reason code:

- `claim_active_blocked`
- `checkpoint_required`
- `checkpoint_overdue_packet_count`
- `checkpoint_overdue_time`
- `operator_locked_scope_blocked`
- `packet_scope_ambiguous_blocked`
- `runtime_broadening_blocked`
- `missing_evidence_fields_blocked`
- `queue_integrity_blocked`

Free-form text is allowed only in `stop_reason_detail` alongside one code.

## Gate 5: evidence field contract (required output)

Each trigger event must record:

- `event_id`
- `event_timestamp_iso`
- `source_packet_id`
- `branch_hint`
- `queue_entry_id`
- `claim_id` (or null when not claimed)
- `dispatch_attempted` (bool)
- `dispatch_result` (`queued` / `dispatched` / `blocked`)
- `checkpoint_state` (`ready` / `required` / `overdue`)
- `stop_reason_code` (or null if dispatched)
- `stop_reason_detail` (or null if dispatched)
- `operator_acknowledged` (bool)

## Gate 6: hard blockers (auto stop)

Do not auto-dispatch when any are true:

- queue/claim integrity mismatch
- cadence checkpoint overdue without explicit operator acknowledgment
- packet scope requests runtime/mutation broadening
- operator-locked file change requested without explicit instruction
- evidence field contract cannot be fully populated

## Gate 7: final recommendation states

Checklist output must end with one state:

- `allow_dispatch`
- `queue_only`
- `checkpoint_required`
- `operator_decision_required`
- `blocked_require_fix_packet`

## Recommended next packet

Flow Trigger Suite threat-model design packet:

- define misuse/abuse matrix for queue/claim/dispatch/evidence surfaces
- map threat mitigations to the checklist gates
- keep automation local-only and fail-closed until mitigation coverage is
  design-complete
