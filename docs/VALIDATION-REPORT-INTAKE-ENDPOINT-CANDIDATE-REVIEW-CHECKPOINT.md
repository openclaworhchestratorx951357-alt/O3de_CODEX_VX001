# Validation Intake Endpoint-Candidate Review Checkpoint

Status: review checkpoint only (no runtime admission change)

## Purpose

Define a repeatable operator checkpoint for auditing
`validation.report.intake` endpoint-candidate outcomes without widening runtime
admission.

## Review Scope

This checkpoint applies only to:

- endpoint candidate `POST /validation/report/intake`
- server gate states:
  - `missing_default_off`
  - `explicit_off`
  - `invalid_default_off`
  - `explicit_on`
- dry-run-only review behavior

This checkpoint does not apply to runtime dispatch admission or execution.

## Required Review Fields

Each checkpoint run must capture:

- `admission_flag_name`
- `admission_flag_state`
- `admission_flag_enabled`
- `review_status`
- `review_summary`
- `safest_next_step`
- `dry_run_only`
- `execution_admitted`
- `write_executed`
- `project_write_admitted`
- `fail_closed_reasons`
- dispatch boundary confirmation for `validation.report.intake`

## Gate-State Verdict Rules

### `missing_default_off`, `explicit_off`, `invalid_default_off`

Required verdict:

- endpoint blocked (`404`)
- `review_status=blocked_by_server_gate`
- non-executing flags preserved (`execution_admitted=false`,
  `write_executed=false`, `project_write_admitted=false`)

### `explicit_on` with accepted envelope

Required verdict:

- endpoint success (`200`)
- `review_status=dry_run_candidate_ready_for_operator_review`
- `dry_run_only=true`
- non-executing flags preserved

### `explicit_on` with refused envelope

Required verdict:

- endpoint success (`200`) with fail-closed refusal result
- `review_status=dry_run_candidate_fail_closed`
- explicit refusal reasons present in `fail_closed_reasons`
- non-executing flags preserved

## Dispatch Boundary Check

Checkpoint must verify:

- `/tools/dispatch` remains unadmitted for `validation.report.intake`
- endpoint-candidate gate changes do not broaden dispatch behavior

## Checkpoint Outcome Labels

- `checkpoint_passed`: all required fields and verdict rules satisfied
- `checkpoint_blocked`: missing evidence or gate-state mismatch
- `checkpoint_failed`: any execution/mutation truth violation, dispatch
  broadening, or missing fail-closed behavior

## Validation Evidence For This Checkpoint

- `python -m pytest backend/tests/test_validation_report_intake.py -q`
- `python -m pytest backend/tests/test_api_routes.py -k "validation_report_intake_endpoint_candidate or validation_report_intake_dispatch" -q`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 surface-matrix-check`

## Recommended Next Packet

Validation intake endpoint-candidate release-readiness decision/checkpoint
packet (docs-only): explicitly record whether this endpoint remains long-hold
default-off reviewable or is queued for a future narrow admission change.
