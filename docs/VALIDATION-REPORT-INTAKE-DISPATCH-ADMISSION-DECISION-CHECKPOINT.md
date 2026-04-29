# Validation Report Intake Dispatch-Admission Decision Checkpoint

Status: decision checkpoint complete (no runtime admission change)

## Purpose

Decide whether current dispatch-admission scaffolding for
`validation.report.intake` is sufficient for any admission move, or whether
additional gates remain mandatory before dispatch registration can be
considered.

## Scope

- decision checkpoint only
- no runtime behavior changes
- no dispatch registration changes
- no execution or mutation admission changes

## Decision inputs

- `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-DESIGN.md`
- `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-READINESS-AUDIT.md`
- `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-IMPLEMENTATION-TOUCHPOINT.md`
- `backend/app/services/validation_report_intake.py`
- `backend/app/services/dispatcher.py`
- `backend/tests/test_api_routes.py`

## Decision table (complete vs missing)

| Gate | Decision | Status | Notes |
| --- | --- | --- | --- |
| Server-owned dispatch flag model exists | Keep | Complete | Missing/off/invalid/on states are represented and fail-closed by default. |
| Dispatch refusal review payload exists | Keep | Complete | Intake dispatch invalid-tool refusals now include machine-readable review fields and next-step guidance. |
| Dispatch remains unadmitted/default-off | Keep | Complete | `validation.report.intake` remains unregistered in validation catalog and still returns `INVALID_TOOL`. |
| Client approval/session payload authorization remains forbidden | Keep | Complete | No client-supplied fields authorize dispatch admission. |
| Validation tool catalog registration for intake | Required before admission | Missing | No `validation.report.intake` tool definition in `catalog.py` yet. |
| Dispatch args/result schema + policy wiring for intake | Required before admission | Missing | Registration packet must define exact schema refs and policy boundary behavior. |
| Dispatcher pre-registration gate branch for newly registered intake tool | Required before admission | Missing | Must fail closed when dispatch gate is not explicitly enabled, even after catalog registration. |
| Dispatch boundary tests in `test_dispatcher.py` for intake registration path | Required before admission | Missing | Current coverage is in API route tests; dispatch service-level admission gate tests still needed. |
| Registration rollback/revert checklist | Required before admission | Missing | Explicit revert path for catalog/policy/dispatcher registration changes not yet documented. |

## Checkpoint decision

- Decision: do **not** promote to dispatch-admitted.
- Current maturity remains:
  `dispatch-admission implementation-gated (default-off scaffolding; endpoint-candidate read-only remains admitted)`.
- Admission movement is blocked on catalog/policy/dispatcher registration gates
  and dispatch service-level tests listed above.

## Boundaries preserved

- dispatch remains unadmitted for `validation.report.intake`
- default-off server-owned gate remains required
- no execution/mutation admission
- no provider/Blender/Asset Processor/placement execution broadening
- no client-field authorization

## Recommended next packet

Validation intake dispatch-admission catalog registration design packet:

- design exact validation-agent tool definition and policy/schema wiring for
  `validation.report.intake`
- define pre-registration fail-closed dispatcher behavior contract
- define required `test_dispatcher.py` coverage and registration revert checklist
- keep runtime behavior unchanged until a later implementation packet

Catalog registration design status:

- completed in
  `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-CATALOG-REGISTRATION-DESIGN.md`
- readiness audit completed in
  `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-CATALOG-REGISTRATION-READINESS-AUDIT.md`
- next safe gate is catalog registration implementation touchpoint
