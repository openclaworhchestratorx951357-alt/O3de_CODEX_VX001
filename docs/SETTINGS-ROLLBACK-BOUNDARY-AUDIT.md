# Settings Rollback Boundary Audit

Status: completed (boundary/review hardening only; non-admitting)

## Purpose

Checkpoint and harden operator-facing rollback truth so `settings.rollback`
wording stays evidence-bound to the admitted `settings.patch.narrow` corridor
without implying a standalone broad rollback execution lane.

## Scope in this packet

- refine fixture + matrix wording for rollback class boundaries
- keep rollback expectations tied to manifest-backed backup identity and
  post-rollback readback evidence
- roll stream recommendations from rollback boundary audit to rollback
  verification checkpoint

## Not in scope

- no backend runtime behavior changes
- no standalone `settings.rollback` execution admission broadening
- no broadening of `settings.patch` mutation scope
- no provider/Blender/Asset Processor/placement execution admission changes

## Current truth checkpointed

- `settings.patch.narrow` remains the exact admitted mutation corridor
- rollback wording remains bounded to evidence linked to that narrow corridor
- no generic rollback execution corridor is admitted
- broad project/config mutation remains out of scope

## Evidence

- `frontend/src/fixtures/appCapabilityDashboardFixture.ts`
- `frontend/src/fixtures/appAuditReviewDashboardFixture.ts`
- `frontend/src/fixtures/appWorkspaceStatusChipsFixture.ts`
- `frontend/src/fixtures/appEvidenceTimelineFixture.ts`
- `frontend/src/components/AppCapabilityDashboardShell.tsx`
- `frontend/src/components/AppAuditReviewDashboardShell.tsx`
- `frontend/src/components/AppApprovalSessionDashboardShell.tsx`
- `frontend/src/components/AppEvidenceTimelineShell.tsx`
- `frontend/src/components/AppWorkspaceStatusChipsShell.tsx`
- corresponding component tests under `frontend/src/components/*.test.tsx`
- `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`
- `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`

## Recommended next packet

Settings rollback verification checkpoint
(`codex/settings-rollback-verification-checkpoint`).
