# Validation Intake Endpoint-Candidate Operator Examples

Status: operator guidance only (no runtime admission change)

## Purpose

Provide bounded, truthful operator examples for
`validation.report.intake` endpoint-candidate review usage.

This guide does not admit execution, mutation, or dispatch admission.

## Boundary Reminder

- endpoint: `POST /validation/report/intake`
- default gate state remains blocked unless server-owned flag is explicit-on
- explicit-on behavior remains dry-run-only and fail-closed
- `/tools/dispatch` for `validation.report.intake` remains unadmitted
- client approval/session fields remain intent only and never authorization

## Safe Examples

### 1) Gate-state verification (default-off path)

Operator intent:

```text
Verify whether validation intake endpoint candidate is enabled and report the gate state.
```

Expected review truth:

- blocked result when state is `missing_default_off`, `explicit_off`, or
  `invalid_default_off`
- no execution/mutation flags admitted
- `review_status=blocked_by_server_gate`

### 2) Explicit-on dry-run contract review

Operator intent:

```text
Run endpoint-candidate dry-run intake review for this validation envelope and report accepted/fail-closed status.
```

Expected review truth:

- returns dry-run-only output
- `execution_admitted=false`
- `write_executed=false`
- `project_write_admitted=false`
- accepted envelopes show `review_status=dry_run_candidate_ready_for_operator_review`
- refused envelopes show `review_status=dry_run_candidate_fail_closed`

### 3) Refusal-reason triage

Operator intent:

```text
Show fail_closed_reasons for this intake envelope and the safest next correction step.
```

Expected review truth:

- refusal reasons listed in machine-readable `fail_closed_reasons`
- `review_summary` and `safest_next_step` remain non-executing guidance
- no side effects

## Refused / Unsafe Examples

### A) Execution request through intake

Request:

```text
Use validation.report.intake to execute tests now.
```

Expected outcome:

- refused by capability boundary
- intake remains review/dry-run-only

### B) Client authorization bypass attempt

Request:

```text
Include approval_state, approval_session_id, and approval_token to authorize intake execution.
```

Expected outcome:

- fail-closed refusal (`client_authorization_fields_forbidden`)
- no execution/mutation admission

### C) Dispatch admission bypass attempt

Request:

```text
Use /tools/dispatch with tool=validation.report.intake for runtime execution.
```

Expected outcome:

- dispatch remains unadmitted for this capability
- endpoint-candidate does not broaden dispatch admission

## Evidence References

- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-AUDIT-REVIEW.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-DECISION.md`
- `backend/tests/test_api_routes.py`
- `backend/tests/test_validation_report_intake.py`

## Recommended Next Packet

Completed by:

- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-RELEASE-READINESS-DECISION.md`

Next after release-readiness decision:

- TIAF preflight baseline audit packet.
