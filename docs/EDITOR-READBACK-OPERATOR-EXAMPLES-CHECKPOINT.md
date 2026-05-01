# Editor Readback Operator Examples Checkpoint

Status: completed (operator examples checkpoint; non-admitting)

## Purpose

Provide operator-facing safe/refused examples for the editor readback review
lane after contract-alignment auditing while preserving exact restore/write
corridor boundaries.

## Scope in this packet

- checkpoint safe readback-only operator prompts for
  `editor.component.property.get`
- checkpoint safe exact-corridor restore/write wording for the Camera bool lane
- checkpoint refused broad editor mutation and broad restore prompt patterns
- keep Flow Trigger runtime-admission hold posture wording unchanged
- roll app-wide recommendation surfaces to editor readback release-readiness
  decision

## Not in scope

- no backend runtime behavior changes
- no broadening of editor mutation, restore, or placement admission
- no provider/Blender/Asset Processor/placement execution admission changes
- no approval/session authorization model broadening

## Current boundary checkpointed

- `editor.component.property.get` remains read-only and evidence-first
- `editor.component.property.write.narrow` remains limited to the exact Camera
  bool corridor
- `editor.content.restore.narrow` remains limited to the exact Camera bool
  corridor with recorded before-value evidence expectations
- broad editor mutation and broad restore requests remain fail-closed

## Safe operator examples

Safe readback-only prompt:

```text
Open level "Levels/Main.level", inspect the Camera make active camera on activation bool on entity named "ShotCamera".
```

Expected truth:

- readback-only evidence for exact entity/component/property path
- no write or restore implication
- broad mutation admission remains unchanged

Safe exact-corridor restore prompt:

```text
Open level "Levels/Main.level", create entity named "CameraRestoreProof", add a Camera component, then restore the Camera make active camera on activation bool to the recorded before value true.
```

Expected truth:

- exact Camera bool corridor wording remains explicit
- restore remains bounded to the admitted narrow corridor
- generic restore claims remain unadmitted

## Refused operator examples

Refused broad mutation prompt:

```text
Set any Camera property I name.
```

Refused broad restore prompt:

```text
Undo every editor change made in this level.
```

Expected truth:

- broad editor mutation remains blocked
- broad restore remains blocked
- no new admission is implied by this checkpoint

## Evidence

- `docs/EDITOR-READBACK-CONTRACT-ALIGNMENT-AUDIT.md`
- `docs/PHASE-8-READBACK-OPERATOR-EXAMPLES.md`
- `frontend/src/fixtures/appCapabilityDashboardFixture.ts`
- `frontend/src/fixtures/appAuditReviewDashboardFixture.ts`
- `frontend/src/fixtures/appWorkspaceStatusChipsFixture.ts`
- `frontend/src/fixtures/appEvidenceTimelineFixture.ts`
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
- `frontend/src/fixtures/settingsRollbackReleaseReadinessDecision.test.ts`
- `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`

## Recommended next packet

Editor readback release-readiness decision
(`codex/editor-readback-release-readiness-decision`).
