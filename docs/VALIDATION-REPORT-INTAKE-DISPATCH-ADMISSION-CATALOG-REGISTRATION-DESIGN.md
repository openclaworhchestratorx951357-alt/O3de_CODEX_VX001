# Validation Report Intake Dispatch-Admission Catalog Registration Design

Status: design-only (no runtime admission change)

## Purpose

Define the exact contract for future catalog/policy/schema registration of
`validation.report.intake` in `/tools/dispatch`, while preserving default-off
and fail-closed boundaries.

## Scope

- design-only registration contract
- no dispatcher runtime behavior changes
- no catalog registration changes
- no execution or mutation admission changes

## Current truth baseline

- Dispatch for `validation.report.intake` remains unadmitted (`INVALID_TOOL`).
- Dispatch gate scaffolding exists with server-owned default-off behavior and
  machine-readable refusal review fields.
- `validation` agent catalog currently has no `validation.report.intake` tool
  definition.
- No tool schemas exist yet for `validation.report.intake` under `schemas/tools`
  (args/result/execution-details/artifact-metadata).

## Proposed future registration contract (not implemented here)

Future registration target:

- Agent: `validation`
- Tool: `validation.report.intake`
- Initial dispatch maturity: dry-run-only candidate (non-executing,
  non-mutating)

Required tool definition fields in `catalog.py` (future packet):

- `name=validation.report.intake`
- `approval_class=read_only` (initial dry-run candidate stage)
- `adapter_family=validation`
- `capability_status=simulated-only` or stricter gating label until explicit
  admission move
- `default_locks=["test_runtime"]`
- `risk=medium`

## Required schema set before registration

All of the following must exist before catalog registration implementation:

- `schemas/tools/validation.report.intake.args.schema.json`
- `schemas/tools/validation.report.intake.result.schema.json`
- `schemas/tools/validation.report.intake.execution-details.schema.json`
- `schemas/tools/validation.report.intake.artifact-metadata.schema.json`

Schema requirements:

- preserve dry-run-only and non-executing flags
- include dispatch review/status fields
- include fail-closed reasons and gate-state metadata
- prohibit client approval/session fields from becoming authorization

## Dispatcher contract after registration exists (future)

Even after tool registration is added, dispatcher must still fail closed when:

- dispatch admission gate is missing/off/invalid
- parser rejects payload
- client authorization fields are present
- schema or capability mismatch occurs

Dispatcher must continue to report:

- `dispatch_candidate=true`
- `dispatch_admitted=false` unless later admitted by explicit decision packet
- `execution_admitted=false`
- `write_executed=false`
- `project_write_admitted=false`

## Required tests for later implementation packet

`backend/tests/test_api_routes.py`:

- registered-tool + gate missing/off/invalid => fail-closed response
- gate explicit-on + valid payload => dry-run candidate only, no execution
- client authorization fields remain non-authorizing

`backend/tests/test_dispatcher.py`:

- catalog registration exists but gate missing/off/invalid => blocked refusal
- no adapter execution call on blocked paths
- review/status payload fields persist through dispatcher response

## Revert / rollback design requirement

Future registration implementation must include a revert checklist:

1. remove `validation.report.intake` from validation catalog entries
2. retain dispatch gate resolver but confirm default-off behavior
3. preserve endpoint candidate behavior and parser guarantees
4. rerun targeted dispatch + endpoint refusal tests

## Boundaries preserved

- no dispatch admission yet
- no execution or mutation admission
- no approval-token model changes
- no provider/Blender/Asset Processor/placement execution broadening

## Recommended next packet

Validation intake dispatch-admission catalog registration readiness audit:

- verify schema set completeness and naming
- verify catalog/policy field choices and risk label
- verify dispatcher fail-closed contract before registration implementation

Readiness audit status:

- completed in
  `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-CATALOG-REGISTRATION-READINESS-AUDIT.md`
- next safe gate is catalog registration implementation touchpoint
