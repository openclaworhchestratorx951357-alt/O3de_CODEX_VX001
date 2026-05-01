# Settings Inspect Review Packet

Status: completed (review/status refinement only; non-admitting)

## Purpose

Strengthen operator-facing review clarity for `settings.inspect` while keeping
settings inspection explicitly read-only through the already admitted
`project.inspect` lane.

## Scope in this packet

- refresh Home review shell fixture data to make `settings.inspect` truth
  explicit
- make clear that `settings.inspect` is represented via
  `project.inspect` (`include_settings`, `requested_settings_keys`) evidence
  fields, not a new standalone mutation path
- align cross-shell "recommended next packet" pointers after this review slice

## Not in scope

- no backend runtime behavior changes
- no standalone `settings.inspect` execution admission broadening
- no settings mutation admission broadening
- no provider/Blender/Asset Processor/placement execution admission
- no approval/session authorization broadening

## Current truth checkpointed

- `settings.inspect` review remains read-only and evidence-backed
- read-only settings review wording now explicitly calls out:
  - requested/matched/missing settings evidence shape
  - manifest-backed provenance boundaries
  - no standalone mutation admission
- `settings.patch.narrow` remains the separate admitted narrow mutation lane
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

## Recommended next packet

Settings rollback boundary audit
(`codex/settings-rollback-boundary-audit`).
