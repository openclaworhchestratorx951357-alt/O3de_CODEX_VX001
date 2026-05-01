# Validation Report Intake Endpoint-Candidate Long-Hold Checkpoint

Status: long-hold checkpointed (dry-run only; non-executing; non-mutating)

## Purpose

Checkpoint the validation intake endpoint-candidate stream in a stable hold
state so future app-wide work can move to other capability lanes without
reopening validation-intake admission drift.

## Current held truth

- endpoint candidate exists: `POST /validation/report/intake`
- server-owned gate: `VALIDATION_REPORT_INTAKE_ENDPOINT_ENABLED`
- fail-closed gate states remain explicit:
  - `missing_default_off`
  - `explicit_off`
  - `explicit_on`
  - `invalid_default_off`
- explicit-on path is dry-run parser output only
- endpoint remains non-executing and non-mutating
- `/tools/dispatch` remains unadmitted for `validation.report.intake`
  (`INVALID_TOOL`)

## Hold decision

Validation intake endpoint-candidate remains intentionally held at the current
reviewable dry-run posture.

Not admitted:

- execution admission through validation intake
- mutation/project-write admission through validation intake
- dispatch execution for `validation.report.intake`
- client approval/session fields as authorization

## Required invariants during hold

1. Gate-state truth must remain fail-closed for missing/off/invalid values.
2. Explicit-on responses must keep:
   - `dry_run_only=true`
   - `execution_admitted=false`
   - `write_executed=false`
   - `project_write_admitted=false`
   - `write_status=blocked`
3. Refused payloads must keep machine-readable `fail_closed_reasons`.
4. Operator-facing review/status fields must remain explicit:
   - `endpoint_candidate`
   - `endpoint_admitted`
   - `admission_flag_name`
   - `admission_flag_state`
   - `admission_flag_enabled`
5. Client approval/session fields remain non-authorizing intent only.
6. Forbidden boundary widening remains blocked:
   - provider generation
   - Blender execution
   - Asset Processor admission/execute
   - placement execution
   - broad mutation admission

## Stream handoff

Active app-wide unlock focus is handed off outside validation intake.

Use `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md` as the current source of truth for
the next active stream. This long-hold checkpoint should stay stable while that
next packet advances.

## Evidence map

- `docs/VALIDATION-REPORT-INTAKE-BASELINE-AUDIT.md`
- `docs/VALIDATION-REPORT-INTAKE-CONTRACT-DESIGN.md`
- `docs/VALIDATION-REPORT-INTAKE-DRY-RUN-PARSER-MATRIX.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-DESIGN.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-DRY-RUN-IMPLEMENTATION.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-AUDIT-REVIEW.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-OPERATOR-EXAMPLES.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-REVIEW-CHECKPOINT.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-RELEASE-READINESS-DECISION.md`
- `backend/tests/test_validation_report_intake.py`
- `backend/tests/test_api_routes.py`
