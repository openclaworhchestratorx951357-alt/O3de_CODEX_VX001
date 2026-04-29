# Validation Report Intake Endpoint-Candidate Exact Public-Admission Contract

Status: contract-only (no runtime admission broadening)

## Purpose

Define the exact operator-facing wording and evidence gates required before
`validation.report.intake` can move from server-gated dry-run endpoint
candidate to a read-only admitted public corridor.

This packet does not change runtime behavior, dispatch admission, execution
flags, or mutation boundaries.

## Current Contracted Truth

Current allowed truth statement:

```text
validation.report.intake is a server-gated dry-run endpoint candidate. It
remains default-off, fail-closed, and non-executing, and dispatch admission for
validation.report.intake remains unadmitted.
```

Current prohibited truth statement:

```text
validation.report.intake is an admitted public read-only dispatch capability.
```

## Exact Public Corridor Statement Required For Future Admission

If future evidence gates are satisfied, allowed read-only corridor wording must
be exact and bounded:

```text
validation.report.intake is admitted only as a server-gated dry-run intake
corridor for schema-valid validation envelopes that return non-executing review
results; it does not admit dispatch execution or project mutation.
```

No broader wording is allowed without a separate admission-expansion decision.

## Explicit Non-Goals And Refusal Expectations

The public contract must continue to refuse or block all of the following:

- runtime execution through intake envelopes
- project file mutation through intake envelopes
- dispatch execution for `validation.report.intake`
- client-provided approval/session/token fields as authorization
- path traversal or absolute-path provenance refs
- malformed schema/capability/timestamp/integrity envelopes

## Minimum Evidence Gates Before Any Read-Only Admission Update

All gates below must pass in one bounded packet before admission wording can be
updated:

1. Gate-state audit remains verified for:
   - `missing_default_off`
   - `explicit_off`
   - `invalid_default_off`
   - `explicit_on`
2. Explicit-on accepted/refused dry-run outcomes keep non-executing flags true:
   - `dry_run_only=true`
   - `execution_admitted=false`
   - `project_write_admitted=false`
   - `write_executed=false`
3. Dispatch refusal remains stable for `validation.report.intake` (`INVALID_TOOL`).
4. Review/status labels remain truthful for blocked and explicit-on paths.
5. Operator-facing wording in decision/matrix/next-packet docs remains aligned
   with observed behavior and tests.

## Required Validation Evidence For That Future Gate

- `python -m pytest backend/tests/test_validation_report_intake.py backend/tests/test_api_routes.py -q`
- `git diff --check`
- optional targeted prompt/refusal probes if prompt surfaces are touched

## Still Not Admitted

- execution admission through intake
- mutation admission through intake
- dispatch admission for `validation.report.intake`
- provider/Blender/Asset Processor/placement execution through intake paths

## Recommended Next Packet

Validation intake endpoint-candidate read-only admission decision refresh:

- consume the readiness checklist as decision evidence
- record keep-withheld vs read-only wording update outcome
- keep runtime behavior unchanged unless separately approved
