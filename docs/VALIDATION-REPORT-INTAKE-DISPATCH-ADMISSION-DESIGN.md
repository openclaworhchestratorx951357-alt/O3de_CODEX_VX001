# Validation Report Intake Dispatch Admission Design

Status: design-only (no runtime admission change)

## Purpose

Define the exact safety contract for any future dispatch registration of
`validation.report.intake` while preserving current endpoint-candidate and
fail-closed boundaries.

## Current truth

- `POST /validation/report/intake` is a server-gated endpoint candidate.
- Missing/off/invalid gate states fail closed and return blocked review payloads.
- Explicit-on gate state still returns dry-run-only, non-executing responses.
- `/tools/dispatch` keeps `validation.report.intake` unadmitted and returns
  `INVALID_TOOL`.
- Client-provided approval/session fields remain non-authorizing input.

## Proposed future dispatch corridor (not implemented here)

Candidate future surface:

- `POST /tools/dispatch` with `tool=validation.report.intake` and
  `agent=validation`
- dry-run-only dispatch registration first, with execution and mutation
  admission still false

This packet does not implement dispatch registration.

## Required preconditions before any dispatch implementation packet

1. Keep endpoint-candidate gate model unchanged (server-owned default-off).
2. Add explicit dispatch admission gate that is server-owned and default-off.
3. Keep dispatch dry-run-only and non-executing at first admission step.
4. Preserve parser fail-closed model and refusal reasons.
5. Preserve client approval/session fields as non-authorizing input.
6. Preserve no-subprocess/no-project-write guarantees.
7. Define explicit review/status payload fields for dispatch outcomes.
8. Define explicit rollback/revert boundaries for dispatch registration changes.

## Dispatch refusal matrix requirements

Any future dispatch implementation packet must fail closed for:

- missing/invalid dispatch admission gate
- wrong agent/tool pairing
- schema mismatch
- capability mismatch
- malformed envelope shape
- malformed timestamp/integrity fields
- oversized payload
- traversal/absolute artifact refs
- client auth/session field presence treated as authorization

## Required dispatch review/status fields (future)

For both accepted and refused dry-run dispatch responses:

- `review_code`
- `review_status`
- `dispatch_candidate` (bool)
- `dispatch_admitted` (bool)
- `dry_run_only` (bool)
- `execution_admitted` (bool)
- `write_executed` (bool)
- `project_write_admitted` (bool)
- `fail_closed_reasons` (list)
- `recommended_next_step`

## Non-goals

- no dispatch execution admission
- no mutation/path-write admission
- no endpoint-candidate gate broadening
- no approval-token authorization model changes
- no provider/Blender/Asset Processor/placement execution

## Recommended next packet

Validation intake dispatch-admission readiness audit packet:

- verify all required preconditions and refusal tests are mapped to exact files
- identify missing gates/tests for design compliance
- produce an implementation touchpoint list with risk classification
- keep dispatch unadmitted and default-off

Readiness audit status:

- completed in
  `docs/VALIDATION-REPORT-INTAKE-DISPATCH-ADMISSION-READINESS-AUDIT.md`
- next safe gate is the dispatch-admission implementation touchpoint packet
