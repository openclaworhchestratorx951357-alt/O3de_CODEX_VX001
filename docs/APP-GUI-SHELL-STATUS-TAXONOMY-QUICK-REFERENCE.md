# App GUI Shell Status Taxonomy Quick Reference

Status: taxonomy parity checkpoint complete (shared shell-boundary helper + quick-reference refresh)

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
- `No backend execution admission changes`
- `No mutation corridor broadening`
- `Status chips must preserve shared taxonomy cues`

These labels are operator guidance only and never authorize runtime behavior.

## Shared helper evidence

- `frontend/src/components/appShellTaxonomyParity.ts`
  - `sharedShellBoundaryLabels`
  - `getStatusChipLinkageCue`

## Shells using this vocabulary

- `app.capability.dashboard`
- `audit.review.dashboard`
- `approval.session.dashboard`
- `evidence.timeline`
- `workspace.status.chips`

## Drift checks

- `npm --prefix frontend test -- src/components/AppCapabilityDashboardShell.test.tsx src/components/AppAuditReviewDashboardShell.test.tsx src/components/AppApprovalSessionDashboardShell.test.tsx src/components/AppEvidenceTimelineShell.test.tsx src/components/AppWorkspaceStatusChipsShell.test.tsx src/fixtures/settingsRollbackReleaseReadinessDecision.test.ts`
- `git diff --check`
- `git diff --cached --check`

## Recommended next packet

Editor placement proof-only implementation
(`codex/editor-placement-proof-only-implementation`).
