# Validation Report Intake Endpoint-Candidate Admission Decision

Status: decision-only (no runtime admission broadening)

## Purpose

Decide whether the server-gated `validation.report.intake` endpoint candidate
should be described as a read-only admitted public corridor now, or remain
dry-run-only with explicit review semantics.

This packet is documentation/status only. It does not admit runtime execution,
project mutation, or `validation.report.intake` dispatch execution.

## Evidence Reviewed

Current evidence includes:

- dry-run parser contract and fail-closed matrix in
  `docs/VALIDATION-REPORT-INTAKE-DRY-RUN-PARSER-MATRIX.md`
- endpoint-candidate implementation in
  `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-DRY-RUN-IMPLEMENTATION.md`
- gate-state and review/status hardening in
  `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-AUDIT-REVIEW.md`
- targeted backend tests covering:
  - blocked gate states (`missing_default_off`, `explicit_off`,
    `invalid_default_off`)
  - explicit-on dry-run accepted/refused outcomes
  - dispatch refusal persistence for `validation.report.intake`

## Decision

Do not promote `validation.report.intake` to read-only admitted public
capability yet.

Keep the current truth:

- maturity: `dry-run only`
- endpoint candidate: server-gated, default-off, fail-closed
- explicit-on behavior: dry-run-only/non-executing
- dispatch path: remains unadmitted (`INVALID_TOOL`)

## Why Admission Is Withheld

The endpoint candidate is now audited for gate-state semantics and review/status
truth labels, but read-only admission is still withheld because this capability
does not yet have an exact public-admission contract that locks:

- the allowed endpoint corridor statement for operators
- non-goals and refusal expectations for near-miss prompts
- exact proof requirements for moving from candidate to admitted read-only
- explicit boundaries between endpoint candidate and dispatch admission

## Allowed Public Wording

Allowed:

```text
validation.report.intake remains a server-gated dry-run endpoint candidate with
audited fail-closed and review/status semantics.
```

Not allowed:

```text
validation.report.intake is a read-only admitted public dispatch capability.
```

## Still Not Admitted

- runtime execution through validation intake
- project mutation through validation intake
- dispatch execution for `validation.report.intake`
- client approval/session fields as authorization
- provider/Blender/Asset Processor/placement execution through intake paths

## Recommended Next Packet

Validation intake endpoint-candidate read-only admission decision refresh:

- consume readiness-checklist evidence as decision input
- record keep-withheld vs read-only wording update outcome
- preserve dispatch-unadmitted and non-executing boundaries
