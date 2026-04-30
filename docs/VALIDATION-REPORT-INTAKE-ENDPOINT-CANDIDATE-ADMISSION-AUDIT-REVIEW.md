# Validation Report Intake Endpoint-Candidate Admission Audit Review

Status: reviewed (dry-run-only candidate; no execution or mutation admission)

## Purpose

Audit the endpoint-candidate admission behavior for
`validation.report.intake` and verify fail-closed posture, operator-facing
review/status fields, and unchanged non-admission boundaries.

## Audited gate states

Server-owned flag: `VALIDATION_REPORT_INTAKE_ENDPOINT_ENABLED`

| Gate state | Trigger | Expected outcome | Verified by |
| --- | --- | --- | --- |
| `missing_default_off` | env var absent | endpoint blocked (`404`) | `backend/tests/test_validation_report_intake.py`, `backend/tests/test_api_routes.py` |
| `explicit_off` | `off` / `0` / `false` forms | endpoint blocked (`404`) | `backend/tests/test_validation_report_intake.py`, `backend/tests/test_api_routes.py` |
| `explicit_on` | `on` / `1` / `true` forms | endpoint returns dry-run plan (`200`) | `backend/tests/test_validation_report_intake.py`, `backend/tests/test_api_routes.py` |
| `invalid_default_off` | unrecognized value | endpoint blocked (`404`) | `backend/tests/test_validation_report_intake.py`, `backend/tests/test_api_routes.py` |

## Fail-closed refusal matrix

Verified refused payload classes include:

- missing required fields
- schema mismatch
- capability mismatch
- timestamp invalid
- integrity hash invalid
- integrity size invalid/mismatch
- payload over max size
- artifact ref traversal/absolute-path rejection
- client authorization fields forbidden

Refusal output remains machine-readable through `fail_closed_reasons`.

## Operator-facing review/status fields verified

For explicit-on endpoint candidate responses (accepted or refused), audit
confirmed these fields remain explicit:

- `endpoint_candidate`
- `endpoint_admitted`
- `admission_flag_name`
- `admission_flag_state`
- `admission_flag_enabled`
- `dry_run_only`
- `execution_admitted`
- `write_executed`
- `project_write_admitted`
- `write_status`
- `accepted`
- `fail_closed_reasons`

## Non-admission boundaries reconfirmed

- no execution admission
- no mutation/project-write admission
- `/tools/dispatch` remains unadmitted for `validation.report.intake`
  (`INVALID_TOOL`)
- no provider/Blender/Asset Processor/placement execution widening
- no client approval/session fields treated as authorization

## Validation commands

- `python -m pytest backend/tests/test_validation_report_intake.py backend/tests/test_api_routes.py -k "validation_report_intake" -q`
- `python -m pytest backend/tests -k "validation or report or inspection_surface" -q`
- `python -m pytest backend/tests -k "asset_forge or approval" -q`
- `git diff --check`
- `git diff --cached --check`

## Recommended next packet

Validation intake endpoint-candidate operator examples + review checkpoint:

- add concise safe/refused operator prompt examples for endpoint intake
- add a review checkpoint doc for ongoing gate-state and refusal invariants
- keep execution/mutation admission unchanged
