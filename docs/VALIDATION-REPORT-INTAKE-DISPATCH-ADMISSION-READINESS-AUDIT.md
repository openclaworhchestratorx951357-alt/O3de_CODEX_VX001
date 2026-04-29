# Validation Report Intake Dispatch-Admission Readiness Audit

Status: readiness audit checkpoint (no runtime admission change)

## Purpose

Audit current code and tests against the dispatch-admission design contract for
`validation.report.intake` and identify exact missing gates before any dispatch
registration implementation is allowed.

## Scope

- design-to-implementation readiness audit only
- no runtime, endpoint, or dispatch admission changes
- no execution or mutation path changes

## Inputs audited

- `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-DESIGN.md`
- `backend/app/services/dispatcher.py`
- `backend/app/services/catalog.py`
- `backend/app/services/validation_report_intake.py`
- `backend/app/api/routes/validation_report_intake.py`
- `backend/tests/test_api_routes.py`
- `backend/tests/test_validation_report_intake.py`

## Readiness gate table

| Gate | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Endpoint gate model remains server-owned default-off | Ready | `validation_report_intake.py` route/service gate behavior + endpoint tests | Missing/off/invalid states fail closed and explicit-on remains dry-run-only. |
| Parser fail-closed behavior remains intact | Ready | `build_validation_report_intake_dry_run_plan` + parser tests | Schema, capability, integrity, size, traversal, and client-auth field checks are covered. |
| Client approval/session fields remain non-authorizing | Ready | parser rejection reason + endpoint/dispatch refusal tests | No client approval payload path authorizes intake behavior. |
| Dispatch currently unadmitted for intake | Ready | `dispatcher.py` invalid tool path + dispatch tests | `validation.report.intake` is not in validation tool catalog, so dispatch returns `INVALID_TOOL`. |
| Server-owned dispatch admission gate exists | Missing | no gate/env/service for dispatch intake admission | Required before any dispatch registration packet. |
| Dispatch review/status contract for intake candidate | Missing | no intake-specific dispatch review code/status fields | Required for truthful accepted/refused dispatch candidate outcomes. |
| Dispatch intake schema refs/policy entry | Missing | `catalog.py` validation tool list has no `validation.report.intake` tool definition | Requires exact args/result schema/policy and risk classification updates. |
| Dispatch rollback/revert boundary for intake registration | Missing | no registration-specific revert checklist | Needed before admission-change implementation packet. |

## Implementation touchpoints (for future packet)

1. `backend/app/services/catalog.py`
   - add a validation-agent tool definition for `validation.report.intake` only
     when dispatch gate is present and default-off behavior is preserved.
2. `backend/app/services/dispatcher.py`
   - add intake-specific dispatch gate evaluation and fail-closed review payload
     branches before any adapter execution path.
3. `backend/app/services/validation_report_intake.py`
   - keep parser as source of fail-closed reasons and reuse it for dispatch
     candidate evaluation.
4. `backend/tests/test_api_routes.py`
   - extend dispatch refusal/acceptance candidate matrix for intake once the
     dispatch gate exists (still dry-run-only and non-executing).
5. `backend/tests/test_dispatcher.py`
   - add narrow dispatch path tests for intake registration boundaries and
     `INVALID_TOOL` fallback when gate is not enabled.

## Risk classification

- Proposed next implementation packet risk: Medium
- Why medium:
  - changes occur in dispatch/catalog gate surfaces, but remain dry-run-only and
    non-executing when done correctly
  - no mutation-capable runtime path should be admitted

## Boundaries preserved

- dispatch for `validation.report.intake` remains unadmitted
- endpoint candidate remains server-gated and dry-run-only
- no subprocess/project-write/provider/Blender/Asset Processor/placement
  execution admission
- no client approval/session payload authorization

## Recommended next packet

Validation intake dispatch-admission implementation touchpoint packet:

- implement only the missing gate scaffolding and review/status fields required
  by this readiness audit
- keep dispatch default-off and dry-run-only
- keep execution/mutation admission false

Implementation touchpoint status:

- completed in
  `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-IMPLEMENTATION-TOUCHPOINT.md`
- decision checkpoint completed in
  `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-DECISION-CHECKPOINT.md`
- next safe gate is dispatch-admission catalog registration design
