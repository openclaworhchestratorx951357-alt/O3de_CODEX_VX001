# Validation Workflow Index Refresh Packet

Status: completed (workflow index refresh; non-admitting)

## Purpose

Refresh and centralize deterministic validation command references for current
backend/frontend workflow checks without broadening runtime admission.

## Scope in this packet

- consolidate validation command references used by current app-wide shell and
  fixture recommendation surfaces
- keep deterministic backend/frontend command boundaries explicit for future
  slices
- preserve long-hold non-admitting posture for `TIAF/preflight` and
  CI/test-execution broadening lanes
- roll app-wide recommendation surfaces to the next project-moving packet

## Not in scope

- no backend runtime behavior changes
- no `TIAF/preflight` execution admission
- no CI/test execution admission broadening
- no provider/Blender/Asset Processor/placement admission changes
- no approval/session authorization broadening

## Validation index refresh checkpoint

- validation workflow references are explicit and deterministic across docs and
  app-wide shell recommendation surfaces
- `TIAF/preflight` and CI/test-execution hold boundaries remain unchanged
- broad shell/script execution remains blocked
- no runtime mutation or execution admissions were broadened

## Evidence

- `docs/VALIDATION-MATRIX.md`
- `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`
- `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`
- `docs/APP-CAPABILITY-UNLOCK-PROGRAM.md`
- `docs/APP-CAPABILITY-DASHBOARD-SHELL.md`
- `docs/AUDIT-REVIEW-DASHBOARD-SHELL.md`
- `docs/APPROVAL-SESSION-DASHBOARD-SHELL.md`
- `docs/APP-WIDE-EVIDENCE-TIMELINE-SHELL.md`
- `docs/WORKSPACE-STATUS-CHIPS-SHELL.md`
- `docs/APP-GUI-SHELL-STATUS-TAXONOMY-QUICK-REFERENCE.md`
- `docs/README.md`
- `frontend/src/fixtures/appCapabilityDashboardFixture.ts`
- `frontend/src/fixtures/appAuditReviewDashboardFixture.ts`
- `frontend/src/fixtures/appWorkspaceStatusChipsFixture.ts`
- `frontend/src/fixtures/appEvidenceTimelineFixture.ts`
- `frontend/src/fixtures/settingsRollbackReleaseReadinessDecision.test.ts`
- `frontend/src/components/AppCapabilityDashboardShell.tsx`
- `frontend/src/components/AppAuditReviewDashboardShell.tsx`
- `frontend/src/components/AppApprovalSessionDashboardShell.tsx`
- `frontend/src/components/AppEvidenceTimelineShell.tsx`
- `frontend/src/components/AppWorkspaceStatusChipsShell.tsx`
- `frontend/src/components/AppCapabilityDashboardShell.test.tsx`
- `frontend/src/components/AppAuditReviewDashboardShell.test.tsx`
- `frontend/src/components/AppApprovalSessionDashboardShell.test.tsx`
- `frontend/src/components/AppEvidenceTimelineShell.test.tsx`
- `frontend/src/components/AppWorkspaceStatusChipsShell.test.tsx`

## Recommended next packet

Validation workflow drift-guard checkpoint packet
(`codex/validation-workflow-drift-guard-checkpoint-packet`).
