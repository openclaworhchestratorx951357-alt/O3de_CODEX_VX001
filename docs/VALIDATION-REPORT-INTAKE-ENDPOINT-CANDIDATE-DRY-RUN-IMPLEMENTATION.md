# Validation Report Intake Endpoint-Candidate Dry-Run Implementation

Status: implemented (dry-run only; no execution or mutation admission)

## Purpose

Implement a server-gated endpoint candidate for `validation.report.intake`
while preserving fail-closed default-off behavior and keeping all execution and
write paths blocked.

## Capability movement

- capability: `validation.report.intake`
- old maturity: `dry-run only (internal parser scaffold; endpoint unadmitted)`
- new maturity: `dry-run only (server-gated endpoint candidate, default-off)`
- execution admitted: `no`
- mutation admitted: `no`

## Implemented scope

- added endpoint candidate:
  - `POST /validation/report/intake`
- added server-owned default-off admission flag gate:
  - `VALIDATION_REPORT_INTAKE_ENDPOINT_ENABLED`
- explicit gate states returned by service helper:
  - `missing_default_off`
  - `explicit_off`
  - `explicit_on`
  - `invalid_default_off`
- explicit-on path returns parser-backed dry-run output only
- endpoint response preserves non-executing/non-mutating fields:
  - `dry_run_only=true`
  - `execution_admitted=false`
  - `write_executed=false`
  - `project_write_admitted=false`
  - `write_status=blocked`
  - `endpoint_candidate=true`
  - `endpoint_admitted=false`
- fail-closed behavior preserved for malformed or auth-tainted payloads
- `/tools/dispatch` remains unadmitted for `validation.report.intake`

## Files

- `backend/app/api/routes/validation_report_intake.py`
- `backend/app/services/validation_report_intake.py`
- `backend/app/main.py`
- `backend/tests/test_validation_report_intake.py`
- `backend/tests/test_api_routes.py`

## Safety boundaries preserved

- no provider generation
- no Blender execution
- no Asset Processor admission/execute
- no placement execution
- no broad mutation admission
- no client approval/session fields accepted as authorization

## Validation commands

- `python -m pytest backend/tests/test_validation_report_intake.py backend/tests/test_api_routes.py -k "validation_report_intake" -q`
- `python -m pytest backend/tests -k "validation or report or inspection_surface" -q`
- `python -m pytest backend/tests -k "asset_forge or approval" -q`
- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `git diff --check`
- `git diff --cached --check`

## Recommended next packet

Validation intake endpoint-candidate admission audit/review packet:

- audit gate states and fail-closed refusal matrix end-to-end
- verify operator-facing review/status fields
- reconfirm no execution/mutation admission
- reconfirm `/tools/dispatch` remains unadmitted for
  `validation.report.intake`
