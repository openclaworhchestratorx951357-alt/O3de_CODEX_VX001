# Audit Review Dashboard Truth Refresh + Status-Chip Linkage

Status: implemented (frontend fixture + shell truth linkage only; non-admitting)

## Purpose

Refresh audit review dashboard wording and row labels so the review surface
matches the shared status-chip taxonomy vocabulary.

## Scope

- refresh audit review fixture rows with explicit `statusTaxonomy` values
- update shell boundary labels to match non-authorizing operator truth
- add status-taxonomy mix card
- surface taxonomy chips on each audit row
- add explicit per-taxonomy status-chip linkage cues for cross-shell parity
- update targeted component tests for taxonomy-aligned wording
- keep shell display-only and non-executing

## Boundaries preserved

- no backend route changes
- no execution admission broadening
- no mutation admission broadening
- no provider/Blender/Asset Processor/placement execution changes
- no client fields treated as authorization

## Validation

- `npm --prefix frontend test -- src/components/AppCapabilityDashboardShell.test.tsx src/components/AppAuditReviewDashboardShell.test.tsx src/components/AppApprovalSessionDashboardShell.test.tsx src/components/AppEvidenceTimelineShell.test.tsx src/components/AppWorkspaceStatusChipsShell.test.tsx src/fixtures/settingsRollbackReleaseReadinessDecision.test.ts`
- `git diff --check`
- `git diff --cached --check`

## Recommended next packet

Editor placement proof-only implementation
(`codex/editor-placement-proof-only-implementation`).
