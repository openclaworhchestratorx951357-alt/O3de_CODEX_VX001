# Validation Report Intake Dry-Run Parser Matrix

Status: dry-run parser scaffold + tests only (no endpoint admission)

## Purpose

Provide an internal fail-closed parser scaffold for
`validation.report.intake` contract validation while keeping the capability
unregistered and execution-blocked.

## Scope in this packet

- adds internal parser service:
  - `backend/app/services/validation_report_intake.py`
- adds targeted parser tests:
  - `backend/tests/test_validation_report_intake.py`
- keeps `/tools/dispatch` runtime behavior unchanged for
  `validation.report.intake` (still rejected as invalid/unregistered)
- does not add or admit a new API route

## Dry-run parser output contract

`build_validation_report_intake_dry_run_plan(...)` returns:

- `corridor_name`
- `dry_run_only`
- `execution_admitted`
- `write_executed`
- `project_write_admitted`
- `accepted`
- `payload_size_bytes`
- `schema`
- `capability_name`
- `normalized_artifact_refs`
- `fail_closed_reasons`

## Fail-closed checks covered

- required field presence
- exact schema/capability match
- report id validity
- UTC timestamp validity
- required object-shape fields
- payload size cap
- artifact ref traversal/absolute-path rejection
- integrity hash/size validity
- integrity size mismatch detection
- client authorization field rejection (`approval_state`,
  `approval_session_id`, `approval_token`)

## Boundary confirmation

This packet does not admit:

- runtime intake endpoint execution
- mutation via validation intake
- client approval fields as authorization
- provider/Blender/Asset Processor/placement execution
- project file writes

## Validation

- `python -m pytest backend/tests -k "validation_report_intake or validation or report or inspection_surface" -q`
- `git diff --check`
- `git diff --cached --check`

## Next safe packet

Evidence timeline shell (frontend/static-fixture first) with explicit
capability truth labels bound to current maturity states.
