# App GUI Shell Status Taxonomy Quick Reference

Status: taxonomy parity checkpoint complete (frontend/docs alignment)

## Purpose

Keep app overview shells on one shared status-taxonomy vocabulary and one
truth-boundary model without broadening runtime authorization, execution, or
mutation admission.

## Shared taxonomy labels

- `admitted-real`: narrow admitted corridor exists and is runtime-backed
- `proof-only`: bounded evidence path exists, not publicly admitted
- `dry-run only`: planning/preview contract only, no execution admission
- `plan-only`: contract/design guidance only, no runtime behavior
- `demo`: frontend fixture/demo presentation only
- `hold-default-off`: server gate defaults off and stays fail-closed
- `blocked`: explicitly not admitted, must refuse outside bounded corridors

## Shared boundary labels

- `Static fixture only`
- `Server-owned authorization truth`
- `Client fields are intent-only`
- `Fail-closed gate-state enforcement`
- `Dispatch unadmitted for validation.report.intake`
- `No execution or mutation admission changes`

These labels are operator guidance only and never authorize runtime behavior.

## Shells using this vocabulary

- `app.capability.dashboard`
- `audit.review.dashboard`
- `approval.session.dashboard`
- `evidence.timeline`
- `workspace.status.chips`

## Drift checks

- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `git diff --check`
- `git diff --cached --check`

## Recommended next packet

GUI shell taxonomy parity checkpoint + quick-reference refresh
(`codex/gui-shell-taxonomy-parity-checkpoint-quick-reference-refresh`).
