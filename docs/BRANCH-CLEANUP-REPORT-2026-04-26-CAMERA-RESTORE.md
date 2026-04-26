# Branch Cleanup Report - Camera Restore

Status: single-branch and batch deletion audits plus branch cleanup report refresh

Inspection date: 2026-04-26

This report refreshes branch cleanup truth after the Camera bool restore
proof/admission/review/examples sequence, including PRs #55-#57.

The next repo-wide supervisor cleanup report is
`docs/BRANCH-CLEANUP-REPORT-SUPERVISOR-BATCH-01.md`. It records a broader
15-branch cleanup batch after the Camera restore-specific cleanup packets.

This report records four approved single-branch deletion audits and one
supervisor-controlled batch deletion audit. The earlier single-branch audits
deleted:

```text
codex/phase-8-camera-write-restore-examples-refresh
codex/phase-8-camera-restore-review-status
codex/phase-8-camera-bool-restore-public-corridor
```

This update records the approved deletion of exactly one additional remote
branch:

```text
codex/phase-8-camera-restore-admission-decision
```

Batch deletion 01 deleted four additional verified merged branches:

```text
codex/phase-8-camera-bool-restore-proof-only
codex/phase-8-camera-corridor-restore-readiness-audit
codex/phase-8-camera-corridor-rollback-restore-design
codex/branch-cleanup-report-after-phase-8-camera-write
```

No other branch deletion was performed by this packet. Checkpoint, backup,
stable, production, unmerged, and uncertain branches were preserved.

## Inspection Baseline

`origin/main` at inspection time:

```text
9fbfc13b316500871c878642b22853105c8f81f4
Record deletion of merged Camera restore admission branch
```

Current local branch for this report:

```text
codex/batch-delete-merged-phase-8-branches-01
```

Required inspection commands used:

```powershell
git fetch origin --prune
git branch -r --format='%(refname:short)'
git branch -r --merged origin/main --format='%(refname:short)'
git branch -r --no-merged origin/main --format='%(refname:short)'
git log --oneline origin/main..<candidate-branch>
git rev-list --left-right --count origin/main...<candidate-branch>
```

Single-branch deletion verification commands used:

```powershell
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/main
git branch -r --list origin/codex/phase-8-camera-write-restore-examples-refresh
git branch -r --merged origin/main --no-color
git log --oneline origin/main..origin/codex/phase-8-camera-write-restore-examples-refresh
git rev-list --left-right --count origin/main...origin/codex/phase-8-camera-write-restore-examples-refresh
git push origin --delete codex/phase-8-camera-write-restore-examples-refresh
git fetch origin --prune
git branch -r --list origin/codex/phase-8-camera-write-restore-examples-refresh
git ls-remote --heads origin codex/phase-8-camera-write-restore-examples-refresh
```

Latest single-branch deletion verification commands used:

```powershell
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/main
git branch -r --list origin/codex/phase-8-camera-restore-admission-decision
git branch -r --merged origin/main --no-color
git log --oneline origin/main..origin/codex/phase-8-camera-restore-admission-decision
git rev-list --left-right --count origin/main...origin/codex/phase-8-camera-restore-admission-decision
git push origin --delete codex/phase-8-camera-restore-admission-decision
git fetch origin --prune
git branch -r --list origin/codex/phase-8-camera-restore-admission-decision
git ls-remote --heads origin codex/phase-8-camera-restore-admission-decision
```

Remote branch inventory after `git fetch origin --prune`:

- remote branch refs, excluding `origin/HEAD`: 62
- merged into `origin/main`: 60
- not merged into `origin/main`: 2
- open GitHub PRs found by the public PR endpoint: 0

First deletion verification results:

- `HEAD` and `origin/main` both pointed to
  `b3819c347cf343f4f8641c2a94b7f7dd025b462a` before deletion.
- `origin/codex/phase-8-camera-write-restore-examples-refresh` existed before
  deletion.
- The branch appeared in `git branch -r --merged origin/main --no-color`.
- `git log --oneline origin/main..origin/codex/phase-8-camera-write-restore-examples-refresh`
  returned no commits.
- `git rev-list --left-right --count origin/main...origin/codex/phase-8-camera-write-restore-examples-refresh`
  returned `3 0`; the right-side `0` confirms the branch had no unique commits
  outside `origin/main`.
- `git push origin --delete codex/phase-8-camera-write-restore-examples-refresh`
  deleted only that remote branch.
- After `git fetch origin --prune`, both `git branch -r --list` and
  `git ls-remote --heads` returned no matching branch.

Second deletion verification results:

- `HEAD` and `origin/main` both pointed to
  `ede866a72ed912960592f5f8fe6b02c5628bf599` before deletion.
- `origin/codex/phase-8-camera-restore-review-status` existed before deletion.
- The branch appeared in `git branch -r --merged origin/main --no-color`.
- `git log --oneline origin/main..origin/codex/phase-8-camera-restore-review-status`
  returned no commits.
- `git rev-list --left-right --count origin/main...origin/codex/phase-8-camera-restore-review-status`
  returned `7 0`; the right-side `0` confirms the branch had no unique commits
  outside `origin/main`.
- `git push origin --delete codex/phase-8-camera-restore-review-status`
  deleted only that remote branch.
- After `git fetch origin --prune`, both `git branch -r --list` and
  `git ls-remote --heads` returned no matching branch.

Third deletion verification results:

- `HEAD` and `origin/main` both pointed to
  `55830ac336ac2ef553ff0fdf19efcdba85b1b045` before deletion.
- `origin/codex/phase-8-camera-bool-restore-public-corridor` existed before
  deletion.
- The branch appeared in `git branch -r --merged origin/main --no-color`.
- `git log --oneline origin/main..origin/codex/phase-8-camera-bool-restore-public-corridor`
  returned no commits.
- `git rev-list --left-right --count origin/main...origin/codex/phase-8-camera-bool-restore-public-corridor`
  returned `11 0`; the right-side `0` confirms the branch had no unique
  commits outside `origin/main`.
- `git push origin --delete codex/phase-8-camera-bool-restore-public-corridor`
  deleted only that remote branch.
- After `git fetch origin --prune`, both `git branch -r --list` and
  `git ls-remote --heads` returned no matching branch.

Latest deletion verification results:

- `HEAD` and `origin/main` both pointed to
  `19912814bd02c6332efad736eb100250751d99d3` before deletion.
- `origin/codex/phase-8-camera-restore-admission-decision` existed before
  deletion.
- The branch appeared in `git branch -r --merged origin/main --no-color`.
- `git log --oneline origin/main..origin/codex/phase-8-camera-restore-admission-decision`
  returned no commits.
- `git rev-list --left-right --count origin/main...origin/codex/phase-8-camera-restore-admission-decision`
  returned `15 0`; the right-side `0` confirms the branch had no unique
  commits outside `origin/main`.
- `git push origin --delete codex/phase-8-camera-restore-admission-decision`
  deleted only that remote branch.
- After `git fetch origin --prune`, both `git branch -r --list` and
  `git ls-remote --heads` returned no matching branch.

## Batch Deletion 01

Batch deletion 01 was supervisor-controlled. Audit agents were allowed to
inspect, but branch deletion was executed only from the supervisor allowlist.
The batch was capped below the five-branch limit and deleted four branches.

All deleted branches passed these gates before deletion:

- `HEAD` and `origin/main` both pointed to
  `9fbfc13b316500871c878642b22853105c8f81f4`.
- The branch existed in `git branch -r --list`.
- The branch appeared in `git branch -r --merged origin/main --no-color`.
- `git log --oneline origin/main..<branch>` returned no commits.
- `git rev-list --left-right --count origin/main...<branch>` had right-side
  count `0`.
- The public GitHub PR endpoint returned no open PR head for the branch.
- The branch name did not match backup, stable, production, main, or
  unmerged-history preservation rules.

| Branch deleted | Tip before deletion | `origin/main..branch` result | `origin/main...branch` result | Delete command | Post-delete confirmation | Restore command if needed |
| --- | --- | --- | --- | --- | --- | --- |
| `codex/phase-8-camera-bool-restore-proof-only` | `f791646892fd5d8124283d300f71ce7a102cd568` | No commits. | `19 0` | `git push origin --delete codex/phase-8-camera-bool-restore-proof-only` | `git branch -r --list` and `git ls-remote --heads` returned no branch. | `git push origin f791646892fd5d8124283d300f71ce7a102cd568:refs/heads/codex/phase-8-camera-bool-restore-proof-only` |
| `codex/phase-8-camera-corridor-restore-readiness-audit` | `3ad700d61f00cb2f7891c59bd8eae559fc898013` | No commits. | `21 0` | `git push origin --delete codex/phase-8-camera-corridor-restore-readiness-audit` | `git branch -r --list` and `git ls-remote --heads` returned no branch. | `git push origin 3ad700d61f00cb2f7891c59bd8eae559fc898013:refs/heads/codex/phase-8-camera-corridor-restore-readiness-audit` |
| `codex/phase-8-camera-corridor-rollback-restore-design` | `02fd05e61ffc883e74d8314dabb52c6a7ecbd4b5` | No commits. | `23 0` | `git push origin --delete codex/phase-8-camera-corridor-rollback-restore-design` | `git branch -r --list` and `git ls-remote --heads` returned no branch. | `git push origin 02fd05e61ffc883e74d8314dabb52c6a7ecbd4b5:refs/heads/codex/phase-8-camera-corridor-rollback-restore-design` |
| `codex/branch-cleanup-report-after-phase-8-camera-write` | `7e636d604fd680208c95639eb21b9242bdcbf673` | No commits. | `38 0` | `git push origin --delete codex/branch-cleanup-report-after-phase-8-camera-write` | `git branch -r --list` and `git ls-remote --heads` returned no branch. | `git push origin 7e636d604fd680208c95639eb21b9242bdcbf673:refs/heads/codex/branch-cleanup-report-after-phase-8-camera-write` |

Skipped/preserved during batch deletion 01:

- `codex/phase-8-camera-corridor-checkpoint`: preserved because the name
  explicitly marks it as a checkpoint branch.
- `codex/phase-8-camera-bool-operator-examples`: not present in current remote
  branch inventory, so no deletion was attempted.
- All report-listed uncertain, backup, stable, production, history, and
  unmerged branches were preserved.

## Already Absent / Deleted

These branches are already absent from `origin` after `git fetch origin
--prune`. Their work is either merged or intentionally preserved elsewhere.

| Branch | Evidence | Notes |
| --- | --- | --- |
| `codex/phase-8-camera-bool-write-public-corridor` | `git branch -r --list origin/codex/phase-8-camera-bool-write-public-corridor` returned no branch. | Deleted by the earlier approved single-branch cleanup audit after it was proven merged with no unique commits. |
| `codex/phase-8-camera-write-restore-examples-refresh` | `git branch -r --list origin/codex/phase-8-camera-write-restore-examples-refresh` and `git ls-remote --heads origin codex/phase-8-camera-write-restore-examples-refresh` returned no branch after deletion. | Deleted by this approved single-branch cleanup audit after it was proven merged and had no unique commits. |
| `codex/phase-8-camera-restore-review-status` | `git branch -r --list origin/codex/phase-8-camera-restore-review-status` and `git ls-remote --heads origin codex/phase-8-camera-restore-review-status` returned no branch after deletion. | Deleted by this approved single-branch cleanup audit after it was proven merged and had no unique commits. |
| `codex/phase-8-camera-bool-restore-public-corridor` | `git branch -r --list origin/codex/phase-8-camera-bool-restore-public-corridor` and `git ls-remote --heads origin codex/phase-8-camera-bool-restore-public-corridor` returned no branch after deletion. | Deleted by this approved single-branch cleanup audit after it was proven merged and had no unique commits. |
| `codex/phase-8-camera-restore-admission-decision` | `git branch -r --list origin/codex/phase-8-camera-restore-admission-decision` and `git ls-remote --heads origin codex/phase-8-camera-restore-admission-decision` returned no branch after deletion. | Deleted by this approved single-branch cleanup audit after it was proven merged and had no unique commits. |
| `codex/phase-8-camera-bool-restore-proof-only` | `git branch -r --list origin/codex/phase-8-camera-bool-restore-proof-only` and `git ls-remote --heads origin codex/phase-8-camera-bool-restore-proof-only` returned no branch after batch deletion 01. | Deleted by batch deletion 01 after it was proven merged and had no unique commits. |
| `codex/phase-8-camera-corridor-restore-readiness-audit` | `git branch -r --list origin/codex/phase-8-camera-corridor-restore-readiness-audit` and `git ls-remote --heads origin codex/phase-8-camera-corridor-restore-readiness-audit` returned no branch after batch deletion 01. | Deleted by batch deletion 01 after it was proven merged and had no unique commits. |
| `codex/phase-8-camera-corridor-rollback-restore-design` | `git branch -r --list origin/codex/phase-8-camera-corridor-rollback-restore-design` and `git ls-remote --heads origin codex/phase-8-camera-corridor-rollback-restore-design` returned no branch after batch deletion 01. | Deleted by batch deletion 01 after it was proven merged and had no unique commits. |
| `codex/branch-cleanup-report-after-phase-8-camera-write` | `git branch -r --list origin/codex/branch-cleanup-report-after-phase-8-camera-write` and `git ls-remote --heads origin codex/branch-cleanup-report-after-phase-8-camera-write` returned no branch after batch deletion 01. | Deleted by batch deletion 01 after it was proven merged and had no unique commits. |
| PR #31-#43 branches listed in `docs/BRANCH-CLEANUP-REPORT-2026-04-26-PHASE-8-CAMERA-WRITE.md` as absent | Previous report plus current remote inventory. | Still absent; not reclassified here. |

## Definitely Safe Cleanup Candidates

These remote branches are merged into `origin/main`, and
`git log --oneline origin/main..<branch>` returned no commits. They are safe
single-branch cleanup candidates if the operator wants a tidier remote.

| Branch | PR / packet | Unique commits vs `origin/main` | Evidence |
| --- | --- | --- | --- |
| `origin/codex/delete-merged-camera-bool-write-branch` | #45 single-branch deletion audit | 0 | Merged; `origin/main..branch` returned no commits. |
| `origin/codex/branch-cleanup-report-after-camera-restore` | #58 branch cleanup report | 0 | Merged; `origin/main..branch` returned no commits. |
| `origin/codex/delete-merged-camera-write-restore-examples-branch` | #59 single-branch deletion audit | 0 | Merged; `origin/main..branch` returned no commits. |
| `origin/codex/delete-merged-camera-restore-review-status-branch` | #60 single-branch deletion audit | 0 | Merged; `origin/main..branch` returned no commits. |
| `origin/codex/delete-merged-camera-bool-restore-public-corridor-branch` | #61 single-branch deletion audit | 0 | Merged; `origin/main..branch` returned no commits. |
| `origin/codex/delete-merged-camera-restore-admission-decision-branch` | #62 single-branch deletion audit | 0 | Merged; `origin/main..branch` returned no commits. |

Detailed count spot checks for the recent restore sequence:

```text
origin/codex/phase-8-camera-bool-restore-proof-only: origin/main...branch = 19 0 before deletion
origin/codex/phase-8-camera-corridor-restore-readiness-audit: origin/main...branch = 21 0 before deletion
origin/codex/phase-8-camera-corridor-rollback-restore-design: origin/main...branch = 23 0 before deletion
origin/codex/branch-cleanup-report-after-phase-8-camera-write: origin/main...branch = 38 0 before deletion
origin/codex/phase-8-camera-restore-admission-decision: origin/main...branch = 15 0 before deletion
origin/codex/phase-8-camera-bool-restore-public-corridor: origin/main...branch = 11 0 before deletion
origin/codex/phase-8-camera-restore-review-status: origin/main...branch = 7 0 before deletion
origin/codex/phase-8-camera-write-restore-examples-refresh: origin/main...branch = 3 0 before deletion
```

The right-side `0` in each count means the branch has no unique commits not
already reachable from `origin/main`.

## Preserve Because Open / Unmerged

These branches are not merged into `origin/main`. There were no open GitHub PRs
at inspection time, so they are preserved because their branch commits are
unmerged, not because an active PR was found.

Do not delete these without a separate operator-approved inspection packet.

| Branch | Unique commits vs `origin/main` | Unique commits | Recommendation |
| --- | --- | --- | --- |
| `origin/codex/canonical-backend-bridge-editor-readiness` | 1 | `5cd0495 Add readiness-only live bridge start` | Preserve; unmerged readiness work may still be useful. |
| `origin/codex/ci-devx` | 3 | `71cbc09 docs(control-plane): note worktree frontend build workaround`; `b02d870 chore(control-plane): add runner diagnostics`; `2bd6ac6 chore(control-plane): bootstrap ci worktrees` | Preserve; unmerged CI/DevX work needs operator review before deletion. |

## Preserve Because Checkpoint / History

These branches are merged or known, but have backup, promotion, integration,
stable-baseline, checkpoint, or production-history signals. Preserve them unless
the operator explicitly requests a targeted cleanup packet for historical
branches.

- `origin/codex/backup/main-before-integration-promotion-20260425`
- `origin/codex/main-promotion-resolution`
- `origin/codex/control-plane/gui-overhaul-integration`
- `origin/codex/control-plane/gui-safe-baseline-2026-04-22`
- `origin/codex/control-plane/o3de-thread-launchpad-stable`
- `origin/codex/control-plane/operator-desktop-stable`
- `origin/codex/phase-8-camera-corridor-checkpoint`
- `origin/feature/production-baseline-v1`

## Uncertain / Needs Operator Approval

These branches are merged into `origin/main`, but they are older historical
working branches or ordinary merged work branches outside the immediate Camera
restore cleanup target. They are not marked as definitely safe here because
bulk deletion should stay report-first and operator-approved.

- `origin/codex/admitted-composed-editor-live-proof`
- `origin/codex/control-plane/app-os-review-evidence`
- `origin/codex/control-plane/desktop-shell`
- `origin/codex/control-plane/gui-overhaul-contextual-help`
- `origin/codex/control-plane/gui-overhaul-guided-flows`
- `origin/codex/control-plane/gui-overhaul-information-architecture`
- `origin/codex/control-plane/gui-overhaul-navigation-shell`
- `origin/codex/control-plane/gui-overhaul-polish-validation`
- `origin/codex/control-plane/gui-overhaul-workspace-simplification`
- `origin/codex/control-plane/gui-section-router`
- `origin/codex/control-plane/gui-stabilization-refactor`
- `origin/codex/control-plane/home-shell-next`
- `origin/codex/control-plane/o3de-real-integration`
- `origin/codex/control-plane/operations-workspace-next`
- `origin/codex/control-plane/operator-desktop-next`
- `origin/codex/control-plane/operator-guide-next`
- `origin/codex/control-plane/prompt-payload-compat`
- `origin/codex/control-plane/records-workspace-next`
- `origin/codex/control-plane/runtime-workspace-next`
- `origin/codex/normalize-phase-workflow-pattern`
- `origin/codex/phase-8-comment-property-tree-discovery-fix`
- `origin/codex/phase-8-comment-root-string-readback`
- `origin/codex/phase-8-comment-scalar-target-discovery`
- `origin/codex/phase-8-component-find-property-readback`
- `origin/codex/phase-8-component-property-write-candidate`
- `origin/codex/phase-8-editor-candidate-envelope-checklist`
- `origin/codex/phase-8-editor-candidate-refusal-coverage`
- `origin/codex/phase-8-editor-candidate-refusals`
- `origin/codex/phase-8-editor-truth-ui-fixtures`
- `origin/codex/phase-8-guarded-authoring-envelope`
- `origin/codex/phase-8-live-component-discovery-binding`
- `origin/codex/phase-8-live-component-find-proof`
- `origin/codex/phase-8-property-discovery-refusal`
- `origin/codex/phase-8-property-list-bridge-candidate`
- `origin/codex/phase-8-property-list-bridge-readiness`
- `origin/codex/phase-8-property-list-live-proof`
- `origin/codex/phase-8-property-list-proof-runtime`
- `origin/codex/phase-8-property-target-discovery-alignment`
- `origin/codex/phase-8-property-target-discovery-design`
- `origin/codex/phase-8-property-write-refusal-examples`
- `origin/codex/phase-8-property-write-target-blocker-alignment`
- `origin/codex/phase-8-read-only-property-target-selection`
- `origin/codex/phase-8-scalar-property-target-discovery`
- `origin/codex/post-promotion-workflow-docs`

## Recommended Next Cleanup Packet

If the operator wants to continue cleanup, the safest next packet is a
single-branch deletion audit for one branch from the definitely-safe candidate
table above.

Recommended first candidate:

```text
codex/branch-cleanup-report-after-camera-restore
```

Before deleting any branch, rerun:

```powershell
git fetch origin --prune
git branch -r --merged origin/main --format='%(refname:short)'
git log --oneline origin/main..origin/<branch>
```

Delete only one branch per cleanup packet and only after confirming it is still
merged and has no unique commits.
