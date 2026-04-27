# Final Remaining Branch Purpose Map

Status: review-only branch purpose map

Inspection date: 2026-04-26

## Summary

This report maps every remaining remote branch after the Phase 8 and
control-plane branch cleanup batches through PR #68.

No branches were deleted in this packet. The goal is to document why each
remaining branch exists, whether it should be preserved, and what action is
recommended.

At inspection time, there were no open pull requests. Most remaining branches
are intentionally preserved backup, stable, baseline, checkpoint, promotion, or
history references. Two branches remain unmerged active work.

## Current Main SHA

Local `HEAD` and `origin/main` both pointed to:

```text
c9684d597c4b2c54feb288a1c124e683816c029d
```

## Branch Count

Remote branch heads at inspection time:

```text
14
```

Open pull requests from the public GitHub PR endpoint:

```text
0
```

Every remaining branch was checked with:

```powershell
git fetch origin --prune
git branch -r --list origin/<branch>
git log --oneline origin/main..origin/<branch>
git rev-list --left-right --count origin/main...origin/<branch>
```

## Branches To Keep

These branches should be kept under the current repository policy.

| Branch | Classification | Merged | `origin/main...branch` | Open PR | Purpose | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| `main` | KEEP: primary | yes | `0 0` | none | Primary repository branch. | Keep permanently. |
| `codex/canonical-backend-bridge-editor-readiness` | KEEP: active/unmerged | no | `132 1` | none | Active backend/bridge/editor readiness work. | Keep until merged or explicitly retired. |
| `codex/ci-devx` | KEEP: active/unmerged | no | `379 3` | none | Active CI/DevX work. | Keep until merged or explicitly retired. |
| `codex/backup/main-before-integration-promotion-20260425` | KEEP: backup/history | yes | `530 0` | none | Backup of old `main` before integration promotion. | Preserve as rollback/audit reference. |
| `codex/main-promotion-resolution` | KEEP: backup/history/evidence | yes | `133 0` | none | Historical promotion branch used to move integration truth onto `main`. | Preserve unless operator explicitly retires old promotion history. |
| `codex/control-plane/gui-safe-baseline-2026-04-22` | KEEP: stable/baseline/checkpoint | yes | `262 0` | none | Control-plane safe baseline. | Preserve unless replaced by a newer approved baseline. |
| `codex/control-plane/o3de-thread-launchpad-stable` | KEEP: stable/baseline/checkpoint | yes | `265 0` | none | Stable O3DE thread-launchpad reference. | Preserve unless replaced by a newer approved stable branch. |
| `codex/control-plane/operator-desktop-stable` | KEEP: stable/baseline/checkpoint | yes | `291 0` | none | Stable operator desktop reference. | Preserve unless replaced by a newer approved stable branch. |
| `codex/phase-8-camera-corridor-checkpoint` | KEEP: stable/baseline/checkpoint | yes | `37 0` | none | Phase 8 Camera corridor checkpoint branch. | Preserve as the Phase 8 checkpoint reference. |
| `feature/production-baseline-v1` | KEEP: stable/baseline/checkpoint | yes | `308 0` | none | Production baseline branch. | Preserve as a production/reference baseline. |

## Branches Needing Operator Review

These branches are merged, have no branch-side unique commits, and have no open
PR, but their names suggest integration, evidence, or proof history. Preserve
them until the operator explicitly decides whether that history is still useful.

| Branch | Merged | `origin/main...branch` | Open PR | Purpose signal | Recommended action |
| --- | --- | --- | --- | --- | --- |
| `codex/admitted-composed-editor-live-proof` | yes | `130 0` | none | Live-proof evidence/history. | REVIEW before any deletion; preserve for now. |
| `codex/control-plane/app-os-review-evidence` | yes | `193 0` | none | Review evidence. | REVIEW before any deletion; preserve for now. |
| `codex/control-plane/gui-overhaul-integration` | yes | `140 0` | none | Integration history. | REVIEW before any deletion; preserve for now. |
| `codex/control-plane/o3de-real-integration` | yes | `262 0` | none | O3DE integration history. | REVIEW before any deletion; preserve for now. |

## Branches That May Be Deleted Later

There are no remaining branches that should be treated as automatic deletion
candidates in this packet.

The four review branches above are technically merged with zero branch-side
unique commits, but their names carry proof, evidence, or integration signals.
They should only be deleted in a future targeted packet after explicit operator
reclassification.

## Unmerged Branches

These branches are not merged into `origin/main` and must not be deleted by
cleanup automation.

| Branch | Unique branch-side commits | `origin/main...branch` | Latest subject | Recommended action |
| --- | --- | --- | --- | --- |
| `codex/canonical-backend-bridge-editor-readiness` | 1 | `132 1` | `Add readiness-only live bridge start` | Keep active until merged or retired. |
| `codex/ci-devx` | 3 | `379 3` | `docs(control-plane): note worktree frontend build workaround` | Keep active until merged or retired. |

## Backup/Stable/Baseline/Checkpoint Branches

These branches are preserved by naming policy and should not be bulk-deleted.

| Branch | Preserve reason |
| --- | --- |
| `codex/backup/main-before-integration-promotion-20260425` | Backup branch. |
| `codex/control-plane/gui-safe-baseline-2026-04-22` | Baseline branch. |
| `codex/control-plane/o3de-thread-launchpad-stable` | Stable branch. |
| `codex/control-plane/operator-desktop-stable` | Stable branch. |
| `codex/phase-8-camera-corridor-checkpoint` | Checkpoint branch. |
| `feature/production-baseline-v1` | Production baseline branch. |

## Complete Evidence Table

| Branch | Tip | Latest subject | Merged | `origin/main...branch` | Open PR | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `codex/admitted-composed-editor-live-proof` | `b3ddf0b1c94442f2ddd708a858dc6ba2670549a6` | `Record admitted composed editor live proof` | yes | `130 0` | none | REVIEW: integration/evidence branch needing operator decision |
| `codex/backup/main-before-integration-promotion-20260425` | `8445ccbacec8d1ac5757941a06526c95a6e5f84b` | `docs(roadmap): add official production build roadmap for Codex` | yes | `530 0` | none | KEEP: backup/history |
| `codex/canonical-backend-bridge-editor-readiness` | `5cd0495ad5e8f79f0160a9baec4112a966707188` | `Add readiness-only live bridge start` | no | `132 1` | none | KEEP: active/unmerged |
| `codex/ci-devx` | `71cbc09005158cd79633fc0873cbff9cdcd91ffc` | `docs(control-plane): note worktree frontend build workaround` | no | `379 3` | none | KEEP: active/unmerged |
| `codex/control-plane/app-os-review-evidence` | `754e0ed59182e9e3ccc6effbb73dd72fe71e6552` | `feat(control-plane): checkpoint app os review evidence branch` | yes | `193 0` | none | REVIEW: integration/evidence branch needing operator decision |
| `codex/control-plane/gui-overhaul-integration` | `9ee1c5657feb3831eb515b818655a9a2c18cfd97` | `Add Phase 6B lifecycle event projections` | yes | `140 0` | none | REVIEW: integration/evidence branch needing operator decision |
| `codex/control-plane/gui-safe-baseline-2026-04-22` | `abe013b7e6cf8c42898b0834c49b73cd8a264ee8` | `Fix builder lane creation and refresh operator guide truth` | yes | `262 0` | none | KEEP: stable/baseline/checkpoint |
| `codex/control-plane/o3de-real-integration` | `abe013b7e6cf8c42898b0834c49b73cd8a264ee8` | `Fix builder lane creation and refresh operator guide truth` | yes | `262 0` | none | REVIEW: integration/evidence branch needing operator decision |
| `codex/control-plane/o3de-thread-launchpad-stable` | `481a22f6bebf0819d906aea6850315b849636d45` | `Add live backend lifecycle controls for local verification` | yes | `265 0` | none | KEEP: stable/baseline/checkpoint |
| `codex/control-plane/operator-desktop-stable` | `066c98b2def257837b744557e24b75f3dea1ad38` | `feat(control-plane): checkpoint operator desktop shell baseline` | yes | `291 0` | none | KEEP: stable/baseline/checkpoint |
| `codex/main-promotion-resolution` | `9f403e87e811b8796747c96fabfe6de41490c01a` | `Fix backend pytest portability` | yes | `133 0` | none | KEEP: backup/history/evidence |
| `codex/phase-8-camera-corridor-checkpoint` | `36f37e39d479a9d9056bb0f5d8b45ae7c7dd819d` | `Add Phase 8 Camera corridor checkpoint` | yes | `37 0` | none | KEEP: stable/baseline/checkpoint |
| `feature/production-baseline-v1` | `13176089dab7bf1df5200968ded67be07afb8c13` | `docs(control-plane): tighten editor runtime proof checklist` | yes | `308 0` | none | KEEP: stable/baseline/checkpoint |
| `main` | `c9684d597c4b2c54feb288a1c124e683816c029d` | `Batch clean verified merged control-plane branches` | yes | `0 0` | none | KEEP: primary |

## Recommended GitHub Setting

Consider enabling automatic deletion of merged PR head branches after the repo
owner is comfortable with the current cleanup policy. That setting would reduce
future cleanup work for ordinary merged PR branches.

Do not enable strict branch protection yet. The current low-friction governance
still prioritizes velocity, with explicit operator approval reserved for
high-risk runtime/security/history/destructive changes.

## Explicit Non-Deletion Note

This PR deletes no branches. It changes documentation only.

Future branch deletion should continue to use a dedicated packet with fresh
verification:

```powershell
git fetch origin --prune
git branch -r --list origin/<branch>
git branch -r --merged origin/main --no-color
git log --oneline origin/main..origin/<branch>
git rev-list --left-right --count origin/main...origin/<branch>
```

Delete only if the branch still exists, is merged into `origin/main`, has no
`origin/main..branch` commits, has branch-side count `0`, has no open PR, and
has no active, backup, stable, baseline, production, checkpoint, history,
integration, evidence, or uncertain preservation signal.
