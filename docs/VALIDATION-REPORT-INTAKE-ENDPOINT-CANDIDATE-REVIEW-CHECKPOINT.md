# Validation Report Intake Endpoint-Candidate Review Checkpoint

Status: checkpointed (dry-run endpoint candidate; reviewable, non-executing)

## Purpose

Checkpoint the current validation intake endpoint-candidate truth after
implementation, admission audit/review, and operator examples consolidation.

## Current surface

- endpoint candidate: `POST /validation/report/intake`
- server-owned gate:
  `VALIDATION_REPORT_INTAKE_ENDPOINT_ENABLED`
- gate states:
  - `missing_default_off`
  - `explicit_off`
  - `explicit_on`
  - `invalid_default_off`
- explicit-on behavior: dry-run parser response only
- no execution admission
- no mutation/project-write admission
- `/tools/dispatch` remains unadmitted for `validation.report.intake`
  (`INVALID_TOOL`)

## Review checklist

Operator review should verify all of the following before considering any
future broadening discussion:

1. Gate-state truth is preserved (`missing_default_off`, `explicit_off`,
   `explicit_on`, `invalid_default_off`).
2. Missing/off/invalid gate states return endpoint blocked `404`.
3. Explicit-on accepted responses keep:
   - `dry_run_only=true`
   - `execution_admitted=false`
   - `write_executed=false`
   - `project_write_admitted=false`
   - `write_status=blocked`
4. Explicit-on refused responses keep all non-executing flags above and include
   machine-readable `fail_closed_reasons`.
5. Operator-facing review/status fields stay present and explicit:
   - `endpoint_candidate`
   - `endpoint_admitted`
   - `admission_flag_name`
   - `admission_flag_state`
   - `admission_flag_enabled`
6. Client approval/session fields remain non-authorizing intent only.
7. Dispatch path for `validation.report.intake` remains `INVALID_TOOL`.
8. No provider generation, Blender execution, Asset Processor admission,
   placement execution, or broad mutation admission is introduced.

## Evidence map

- `docs/VALIDATION-REPORT-INTAKE-BASELINE-AUDIT.md`
- `docs/VALIDATION-REPORT-INTAKE-CONTRACT-DESIGN.md`
- `docs/VALIDATION-REPORT-INTAKE-DRY-RUN-PARSER-MATRIX.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-DESIGN.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-DRY-RUN-IMPLEMENTATION.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-AUDIT-REVIEW.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-OPERATOR-EXAMPLES.md`
- `backend/tests/test_validation_report_intake.py`
- `backend/tests/test_api_routes.py`

## Still not admitted

- execution admission through validation intake
- mutation/project write admission through validation intake
- `/tools/dispatch` execution for `validation.report.intake`
- client approval/session fields as authorization

## Recommended next packet

Validation intake endpoint-candidate release-readiness decision packet
(design/audit only):

- decide whether to keep endpoint candidate at current dry-run reviewable state
  or pursue a future narrow read-only admission candidate
- require explicit risk review and non-execution boundary reconfirmation
- no runtime broadening in this decision packet
