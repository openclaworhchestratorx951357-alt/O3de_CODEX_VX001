# Validation Report Intake Endpoint-Candidate Admission Decision Surface Matrix

Status: decision checkpoint (no runtime admission change)

## Purpose

Convert the completed endpoint-candidate audit/review evidence into an explicit
admission decision matrix so future packets do not widen capability claims by
accident.

## Scope

- classify current endpoint-candidate maturity
- classify what remains blocked, forbidden, or unadmitted
- decide the next safe packet
- preserve default-off, dry-run-only, and dispatch-refusal boundaries

## Current truth inputs

- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-DRY-RUN-IMPLEMENTATION.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-AUDIT-REVIEW.md`
- `backend/app/api/routes/validation_report_intake.py`
- `backend/app/services/validation_report_intake.py`
- `backend/tests/test_validation_report_intake.py`
- `backend/tests/test_api_routes.py` (`validation_report_intake` endpoint and
  dispatch refusal coverage)

## Decision matrix

| Surface | Current state | Decision | Why |
| --- | --- | --- | --- |
| `POST /validation/report/intake` (flag missing/off/invalid) | `404` blocked with machine-readable review payload and gate-state guidance | Keep blocked (admitted behavior) | Default-off and invalid fail closed are proven and tested. |
| `POST /validation/report/intake` (flag explicit on) | returns dry-run parser output with non-execution flags and review status | Keep admitted as read-only audited endpoint candidate | This is the narrow evaluated corridor; execution/mutation remain false and tested. |
| parser envelope contract (`validation.report.intake.v1`) | fail-closed reasons for malformed/auth-tainted payloads | Keep admitted for dry-run-only validation | Contract/parser matrix and endpoint tests prove refusal behavior. |
| client approval/session fields in intake payload | forbidden as authorization; parser refuses | Keep forbidden | Prevents client-side authorization spoofing. |
| `/tools/dispatch` + `validation.report.intake` | remains invalid/unregistered (`INVALID_TOOL`) | Keep unadmitted | Dispatch admission is a separate, higher-risk gate. |
| runtime execution/mutation via intake | not admitted | Keep blocked | No execution path, subprocess path, or project write path admitted. |

## Capability maturity decision

- `validation.report.intake` is promoted to:
  `read-only (audited endpoint candidate, server-gated default-off, dry-run-only)`.
- No admission is granted for dispatch execution or mutation behavior.

## Boundaries preserved

- no execution admission
- no mutation admission
- no dispatch admission for `validation.report.intake`
- no client authorization via intake payload fields
- no provider/Blender/Asset Processor/placement execution

## Recommended next packet

Validation intake dispatch-admission design packet (docs+tests planning only):

- define exact conditions for any future `validation.report.intake` dispatch
  registration consideration
- keep dispatch unadmitted by default
- define required refusal matrix, review fields, and rollback boundaries before
  any dispatch implementation packet is allowed
