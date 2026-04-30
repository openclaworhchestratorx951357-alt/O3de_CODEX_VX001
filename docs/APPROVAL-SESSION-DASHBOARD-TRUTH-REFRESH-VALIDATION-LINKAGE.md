# Approval Session Dashboard Truth Refresh + Validation Linkage

Status: implemented (frontend fixture + shell truth linkage only)

## Purpose

Tighten approval/session dashboard wording so operator-facing shell truth aligns
with validated backend review semantics for the validation intake endpoint
candidate without widening runtime admission.

## Scope

- refresh approval/session shell fixture truth rows and boundary labels
- add explicit server gate-state matrix labels:
  - `missing_default_off`
  - `explicit_off`
  - `explicit_on`
  - `invalid_default_off`
- add explicit fail-closed refusal matrix language for:
  - endpoint blocked states
  - client authorization-field rejection posture
  - `/tools/dispatch` unadmitted `validation.report.intake` behavior
- surface operator-facing review/status field names in the shell
- refresh targeted frontend test coverage for the new labels

## Boundaries preserved

- static fixture only
- no backend route changes
- no execution admission
- no mutation admission
- no `/tools/dispatch` admission for `validation.report.intake`
- client approval/session fields remain intent-only and non-authorizing

## Validation

- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `git diff --check`
- `git diff --cached --check`

## Recommended next packet

Editor narrow-corridor verification refresh
(`codex/editor-narrow-corridor-verification-refresh`).














