# Validation Workflow Quick-reference Packet

Status: completed (quick-reference consolidation; non-admitting)

## Purpose

Publish one concise validation workflow quick-reference for deterministic
backend/frontend command usage and explicit held-lane boundaries without
broadening runtime admission.

## Scope in this packet

- consolidate deterministic backend/frontend validation commands into one
  operator-facing quick-reference surface
- keep `TIAF/preflight` and real CI/test execution long-hold boundaries
  explicit in the same reference
- align app-wide recommendation surfaces to this completed quick-reference
  checkpoint
- roll app-wide recommendation surfaces to the next project-moving packet

## Not in scope

- no backend runtime behavior changes
- no `TIAF/preflight` execution admission
- no CI/test execution admission broadening
- no provider/Blender/Asset Processor/placement admission changes
- no approval/session authorization broadening

## Quick-reference checkpoint

- deterministic command references are now centralized in one concise
  operator-facing workflow reference
- held-lane boundaries for `TIAF/preflight` and CI/test execution remain
  explicit and unchanged
- broad shell/script execution remains blocked
- no runtime mutation or execution admissions were broadened

## Evidence

- `docs/VALIDATION-MATRIX.md`
- `docs/VALIDATION-WORKFLOW-INDEX-REFRESH-PACKET.md`
- `docs/VALIDATION-WORKFLOW-DRIFT-GUARD-CHECKPOINT-PACKET.md`
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

Validation workflow command-evidence checkpoint packet
(`codex/validation-workflow-command-evidence-checkpoint-packet`).

