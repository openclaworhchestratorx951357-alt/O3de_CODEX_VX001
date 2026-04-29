# Validation Report Intake Endpoint-Candidate Dry-Run Implementation

Status: implemented (server-flagged endpoint candidate, default-off, dry-run-only)

## Purpose

Implement the endpoint-candidate dry-run packet for
`validation.report.intake` without admitting execution or mutation behavior.

## Scope in this packet

- add a server-flagged endpoint candidate:
  - `POST /validation/report/intake`
- keep default behavior fail-closed and blocked while the flag is off
- reuse the existing dry-run parser plan from
  `app.services.validation_report_intake`
- keep `/tools/dispatch` behavior unchanged for `validation.report.intake`
  (still rejected as invalid/unregistered)

## Server-owned admission flag

- environment variable:
  `VALIDATION_REPORT_INTAKE_ENDPOINT_ENABLED`
- accepted truthy values:
  `1`, `true`, `yes`, `on`, `enabled`
- accepted false values:
  `0`, `false`, `no`, `off`, `disabled`
- missing or invalid values default to blocked/off

## Endpoint behavior

When the admission flag is off or invalid:

- endpoint returns `404`
- no dry-run plan is admitted

When the admission flag is explicitly on:

- endpoint returns a dry-run-only plan
- response preserves:
  - `dry_run_only=true`
  - `execution_admitted=false`
  - `write_executed=false`
  - `project_write_admitted=false`
  - `write_status=blocked`
- parser `accepted` and `fail_closed_reasons` are returned directly
- no execution, no subprocess, no file writes

## Fail-closed coverage added

- endpoint candidate remains blocked by default
- valid envelope returns dry-run-only plan when flag is on
- client authorization fields in payload fail closed when flag is on
- dispatch remains unadmitted for `validation.report.intake` even if endpoint
  flag is on

## Boundary confirmation

This packet does not admit:

- runtime execution through validation intake
- project mutation through validation intake
- provider/Blender/Asset Processor/placement execution
- client approval/session fields as authorization
- `validation.report.intake` in `/tools/dispatch`

## Validation

- `python -m pytest backend/tests/test_validation_report_intake.py backend/tests/test_api_routes.py -k "validation_report_intake" -q`
- `python -m pytest backend/tests -k "validation or report or inspection_surface" -q`
- `git diff --check`
- `git diff --cached --check`

## Next safe packet

Validation intake endpoint-candidate admission audit/review packet:

- verify gate semantics and refusal matrix on the integrated endpoint path
- document operator-facing review/status fields
- keep default-off and no execution/mutation admission
