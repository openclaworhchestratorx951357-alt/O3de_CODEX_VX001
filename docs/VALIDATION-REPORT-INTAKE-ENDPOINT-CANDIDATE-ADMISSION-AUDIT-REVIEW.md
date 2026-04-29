# Validation Report Intake Endpoint-Candidate Admission Audit And Review

Status: implemented (audit/review metadata added; endpoint remains default-off and dry-run-only)

## Purpose

Harden the server-gated endpoint-candidate review semantics for
`validation.report.intake` before any broader admission claim.

## Scope in this packet

- preserve `POST /validation/report/intake` as default-off and dry-run-only
- add machine-readable blocked-review payload for disabled/invalid gate states
- add machine-readable review status fields for explicit-on dry-run responses
- extend endpoint tests for gate-state review semantics and refusal stability
- keep dispatch path unadmitted (`/tools/dispatch` still rejects
  `validation.report.intake`)

## Gate-state review payload

When the endpoint remains blocked (`404`), the response detail now includes:

- `status=blocked`
- `review_status=endpoint_candidate_blocked`
- `review_code=endpoint_candidate_unadmitted`
- `corridor_name=validation.report.intake`
- dry-run/non-execution flags (`dry_run_only`, `execution_admitted`,
  `write_executed`, `project_write_admitted`, `write_status`)
- admission-gate state (`admission_flag_name`, `admission_flag_state`,
  `admission_flag_enabled`)
- `recommended_next_step` keyed by gate state

Gate-state expectations:

- `missing_default_off` => blocked with explicit enable-next-step guidance
- `explicit_off` => blocked with explicit off-to-on guidance
- `invalid_default_off` => blocked with invalid-flag correction guidance
- `explicit_on` => endpoint can return dry-run parser output, still no execution

## Explicit-on dry-run review fields

When `admission_flag_state=explicit_on`, endpoint responses include:

- `review_code=dry_run_candidate`
- `review_status=dry_run_candidate_accepted` when parser accepts
- `review_status=dry_run_candidate_refused` when parser fails closed
- `recommended_next_step` that keeps dry-run-only and dispatch refusal boundaries

## Boundaries preserved

This packet does not admit:

- execution or mutation through validation intake
- dispatch admission for `validation.report.intake`
- client approval/session fields as authorization
- provider/Blender/Asset Processor/placement execution

## Validation

- `python -m pytest backend/tests/test_api_routes.py -k "validation_report_intake_endpoint_candidate" -q`
- `python -m pytest backend/tests/test_api_routes.py -k "validation_report_intake_dispatch" -q`
- `python -m pytest backend/tests/test_validation_report_intake.py -q`
- `git diff --check`

## Recommended next packet

Validation intake endpoint-candidate admission decision surface matrix:

- decide whether current dry-run endpoint candidate review fields are sufficient
  for `read-only (audited endpoint candidate)` maturity in the app capability
  unlock matrix
- if not sufficient, list exact missing review fields/tests and preserve blocked
  state
- keep default-off/no-execution/no-mutation boundaries unchanged
