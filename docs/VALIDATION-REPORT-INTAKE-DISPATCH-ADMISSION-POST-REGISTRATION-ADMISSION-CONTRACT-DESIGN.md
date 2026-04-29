# Validation Report Intake Dispatch-Admission Post-Registration Admission Contract Design

Status: design-only (no runtime admission change)

## Purpose

Define the exact contract that must be satisfied before any future admission
move for the already registered `validation.report.intake` dispatch surface.

## Scope

- design-only admission contract
- no catalog/service/runtime code changes
- no execution or mutation admission changes
- no approval-token authorization model changes

## Current truth baseline

- `validation.report.intake` is catalog-registered for the `validation` agent.
- Intake args/result/execution-details/artifact-metadata schemas exist.
- Dispatcher now has explicit post-registration fail-closed behavior:
  `DISPATCH_NOT_ADMITTED`.
- Gate missing/off/invalid/on states remain fail-closed in the current phase.
- Endpoint-candidate intake behavior remains read-only dry-run candidate and
  client authorization/session fields remain non-authorizing input.

## Proposed future admission corridor (not implemented here)

Candidate future surface (if explicitly admitted in a later packet):

- `POST /tools/dispatch` with:
  - `agent=validation`
  - `tool=validation.report.intake`
  - server-owned dispatch gate explicit-on
  - exact validated intake envelope only
- initial admitted scope remains dry-run-only and non-mutating unless a
  separate later packet explicitly widens execution behavior.

This packet does not admit dispatch execution.

## Admission preconditions (mandatory before any admission implementation)

1. Server-owned dispatch gate model must remain default-off and fail closed.
2. Explicit-on gate behavior must still enforce exact intake envelope
   conformance and parser fail-closed protections.
3. Client approval/session fields must remain non-authorizing input.
4. No adapter subprocess, project write, or mutation path may execute outside
   explicitly admitted behavior.
5. Persisted execution-details and artifact-metadata fields for admitted intake
   dispatch must be explicitly defined and schema-validated.
6. Refusal envelope must remain stable for all out-of-scope/malformed requests.
7. Revert plan must be explicit for admission logic changes.

## Required refusal envelope (future admitted state)

For non-admitted or malformed requests, keep a machine-readable blocked payload
containing at minimum:

- `dispatch_candidate`
- `dispatch_registered`
- `dispatch_admitted`
- `dry_run_only`
- `execution_admitted`
- `write_executed`
- `project_write_admitted`
- `write_status`
- `review_code`
- `review_status`
- `recommended_next_step`
- admission-flag name/state/enabled fields
- parser acceptance + fail-closed reasons

## Required admitted evidence model (future)

Before admission implementation, define exact persisted evidence fields for:

- execution details
  - dispatch-gate state at decision time
  - parser acceptance/refusal reasons
  - envelope identity fields used for bounded validation
  - explicit no-execution/no-mutation status when still dry-run-only
- artifact metadata
  - agent/tool/capability identity
  - dispatch boundary and execution boundary labels
  - retained review/refusal metadata needed for audits

## Non-goals

- no dispatch execution admission in this packet
- no mutation/path-write admission
- no endpoint broadening beyond existing candidate/read-only behavior
- no provider/Blender/Asset Processor/placement execution broadening

## Recommended next packet

Validation intake dispatch-admission post-registration admission readiness audit
packet:

- map this contract to exact code/test touchpoints
- identify missing gates and test coverage required before admission
- classify risk for any future admission implementation packet
- keep runtime behavior unchanged and fail-closed

Readiness audit status:

- completed in
  `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-POST-REGISTRATION-ADMISSION-READINESS-AUDIT.md`
- next safe gate is post-registration admission implementation touchpoint
