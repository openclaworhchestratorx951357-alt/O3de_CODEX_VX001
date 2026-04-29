# Validation Report Intake Endpoint-Candidate Admission Decision

Status: admission decision recorded (docs/matrix packet only)

## Purpose

Decide whether `validation.report.intake` should be promoted beyond the current
audited endpoint-candidate state.

This packet is documentation/matrix only. It does not change runtime behavior,
admit execution, admit mutation, or admit dispatch execution for
`validation.report.intake`.

## Current Evidence

The current evidence stack includes:

- `docs/VALIDATION-REPORT-INTAKE-CONTRACT-DESIGN.md`
- `docs/VALIDATION-REPORT-INTAKE-DRY-RUN-PARSER-MATRIX.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-DRY-RUN-IMPLEMENTATION.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-AUDIT-REVIEW.md`
- endpoint gate-state tests and refusal tests in
  `backend/tests/test_api_routes.py`
- parser and endpoint-review tests in
  `backend/tests/test_validation_report_intake.py`

Verified gate-state truth:

- `missing_default_off` => endpoint blocked (`404`)
- `explicit_off` => endpoint blocked (`404`)
- `invalid_default_off` => endpoint blocked (`404`)
- `explicit_on` => endpoint responds `200` with dry-run-only/no-execution flags

## Decision

Do not promote `validation.report.intake` to a broader admitted runtime
execution corridor.

Keep it as a server-gated endpoint candidate with reviewable dry-run behavior:

- endpoint path remains `POST /validation/report/intake`
- server-owned gate remains default-off unless explicitly enabled
- explicit-on behavior remains dry-run-only and fail-closed
- `/tools/dispatch` for `validation.report.intake` remains unadmitted

## Why This Decision

- The endpoint candidate now has audited gate-state semantics and refusal
  coverage, but its role is still bounded review/intake planning.
- Default-off server gating remains an intentional safety boundary.
- Dispatch admission, execution admission, and mutation admission remain outside
  the approved scope for this stream.

## Allowed Truth Wording

Allowed:

```text
validation.report.intake is a reviewable, server-gated endpoint candidate that
returns dry-run-only fail-closed review output when explicit_on.
```

Not allowed:

```text
validation.report.intake is a generally admitted execution endpoint.
```

## Still Not Admitted

- execution through validation intake payloads
- project mutation through validation intake payloads
- dispatch admission for `validation.report.intake`
- client-supplied approval/session fields as authorization
- provider/Blender/Asset Processor/placement execution via intake

## Matrix Alignment Completed

This packet updates matrix truth for `validation.report.intake` in:

- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`
- `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`

## Validation

- `python -m pytest backend/tests/test_validation_report_intake.py -q`
- `python -m pytest backend/tests/test_api_routes.py -k "validation_report_intake_endpoint_candidate or validation_report_intake_dispatch" -q`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 surface-matrix-check`
- `git diff --check`
- `git diff --cached --check`

## Recommended Next Packet

Validation intake endpoint-candidate operator examples + review checkpoint
packet (docs-first): publish safe/refused prompt examples and review-checkpoint
criteria while preserving default-off, dry-run-only, and dispatch-unadmitted
boundaries.
