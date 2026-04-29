# Validation Report Intake Endpoint-Candidate Admission Design

Status: design-only (no runtime admission change)

## Purpose

Define the exact admission model for a future
`validation.report.intake` endpoint candidate while preserving default
fail-closed behavior and keeping all execution/mutation paths blocked.

## Current baseline

Current merged baseline remains:

- `docs/VALIDATION-REPORT-INTAKE-BASELINE-AUDIT.md`
- `docs/VALIDATION-REPORT-INTAKE-CONTRACT-DESIGN.md`
- `docs/VALIDATION-REPORT-INTAKE-DRY-RUN-PARSER-MATRIX.md`

Current truth:

- internal dry-run parser scaffold exists
- parser tests exist for malformed/refused paths
- runtime endpoint admission is still blocked/unregistered
- client approval fields remain intent-only and never authorization

## Capability maturity movement

- capability: `validation.report.intake`
- old maturity: `dry-run only (internal parser scaffold; endpoint unadmitted)`
- target maturity for later packet: `read-only (server-gated endpoint candidate)`
- this packet maturity result: unchanged (`dry-run only`)

## Proposed endpoint candidate

Candidate surface for a future packet:

- `POST /tools/dispatch` with `capability_name=validation.report.intake`
- endpoint remains blocked by default until explicit server-side admission gate
  is enabled
- accepted behavior remains dry-run planning only (no execution/mutation)

This packet does not register or admit that candidate.

## Required admission gates (future implementation)

All gates must be true before the endpoint candidate can return accepted
dry-run output:

1. explicit server-owned admission flag for `validation.report.intake`
2. capability name exact match to `validation.report.intake`
3. schema exact match to `validation.report.intake.v1`
4. parser returns `accepted=true` with zero fail-closed reasons
5. provenance refs normalize to bounded relative references (no absolute paths,
   no traversal)
6. payload/integrity checks pass (digest + size consistency)
7. client authorization fields are absent or ignored as non-authorizing intent
8. server-owned authorization model remains source of truth
9. response marks dry-run-only and non-executing state

If any gate fails, the endpoint candidate must fail closed.

## Required endpoint response truths (future implementation)

For valid candidate requests, the response must include:

- `capability_name=validation.report.intake`
- `dry_run_only=true`
- `execution_admitted=false`
- `write_executed=false`
- `project_write_admitted=false`
- `accepted` (true only when all parser gates pass)
- `fail_closed_reasons` (empty only when accepted=true)
- normalized provenance/evidence fields from parser output

For refused requests, response must include machine-readable refusal reasons and
must preserve all non-executing flags.

## Fail-closed test matrix required before admission

A future endpoint-candidate packet must prove all of the following:

- default flag off => endpoint capability remains blocked/refused
- wrong capability fails closed
- wrong schema fails closed
- missing required envelope fields fail closed
- malformed timestamp fails closed
- oversized payload fails closed
- invalid integrity metadata fails closed
- traversal/outside-root artifact refs fail closed
- `approval_state`, `approval_session_id`, `approval_token` do not authorize
- valid-looking request still returns dry-run-only/no-execution flags
- no files written and no subprocess/external execution in all cases

## Evidence requirements before any admission claim

Future implementation packets must include:

- targeted backend tests for accepted/refused endpoint-candidate outcomes
- regression proof that unrelated dispatch capabilities are unaffected
- explicit evidence that parser output is pass-through only (no execution path)
- audit-agent review table with risk classification and verdict

## What remains blocked

This design keeps all of the following blocked:

- runtime execution admission through validation intake
- mutation admission through validation intake
- provider/Blender/Asset Processor/placement execution
- project file writes through intake paths
- client-side approval/session fields as authorization

## Next safe packet

Validation intake endpoint-candidate dry-run implementation packet
(server-flagged, default-off, fail-closed tests first, no execution/mutation
admission).
