# Supervisor Branch Cleanup Report - Batch 01

Status: merged-branch cleanup audit with supervisor-controlled deletion

Inspection date: 2026-04-26

## Summary

This report records the first repo-wide supervisor branch cleanup batch after
the Phase 8 Camera write/restore cleanup sequence.

The supervisor deleted 15 ordinary merged branches. Parallel agents provided
read-only inventory, merge verification, risk classification, PR/activity, and
docs-planning input. Deletion was centralized in the supervisor path only; no
worker agent deleted branches.

No runtime, backend, frontend, CI, GitHub settings, capability, property-write,
or restore behavior changed.

## Current Main SHA

`origin/main` and local `HEAD` both pointed to:

```text
60725c3a2fe08f5bf6065f2a50e521d49415f6eb
```

## Branch Count Before Cleanup

Remote branch heads before deletion:

```text
61
```

Open PRs from the public GitHub PR endpoint:

```text
[]
```

Unmerged branch heads before deletion:

```text
codex/canonical-backend-bridge-editor-readiness
codex/ci-devx
```

## Deleted Branches

Every deleted branch passed all required gates:

- The branch existed before deletion.
- The branch was listed by `git branch -r --merged origin/main --no-color`.
- `git log --oneline origin/main..origin/<branch>` returned no commits.
- `git rev-list --left-right --count origin/main...origin/<branch>` had
  branch-side count `0`.
- The branch had no open PR.
- The branch did not match backup, stable, production, checkpoint, baseline,
  release, main, unmerged, or active-handoff preservation rules.
- Post-delete `git branch -r --list origin/<branch>` returned no branch.
- Post-delete `git ls-remote --heads origin <branch>` returned no branch.

| Branch | Associated PR if known | Tip before deletion | `origin/main..branch` | `origin/main...branch` | Delete command |
| --- | --- | --- | --- | --- | --- |
| `codex/branch-cleanup-report-after-camera-restore` | #58 | `24d0aba06bc2aaf1d17148e6d5c05503d0f17d7f` | No commits. | `11 0` | `git push origin --delete codex/branch-cleanup-report-after-camera-restore` |
| `codex/delete-merged-camera-write-restore-examples-branch` | #59 | `97a93223fe0c540b27a5bfc8d77c706a230c5439` | No commits. | `9 0` | `git push origin --delete codex/delete-merged-camera-write-restore-examples-branch` |
| `codex/delete-merged-camera-restore-review-status-branch` | #60 | `43e14b6a845e1b3651c30699a470b0a330592e02` | No commits. | `7 0` | `git push origin --delete codex/delete-merged-camera-restore-review-status-branch` |
| `codex/delete-merged-camera-bool-restore-public-corridor-branch` | #61 | `8c3817d7678e5e17eb92c9d9d0edc6aee511d84c` | No commits. | `5 0` | `git push origin --delete codex/delete-merged-camera-bool-restore-public-corridor-branch` |
| `codex/delete-merged-camera-restore-admission-decision-branch` | #62 | `ddbff5cfe60b301ae639bae7d56d9df9f898cca5` | No commits. | `3 0` | `git push origin --delete codex/delete-merged-camera-restore-admission-decision-branch` |
| `codex/delete-merged-camera-bool-write-branch` | #45 | `208158fecc02a6139f9e801780a93e4c0b1e05ef` | No commits. | `38 0` | `git push origin --delete codex/delete-merged-camera-bool-write-branch` |
| `codex/normalize-phase-workflow-pattern` | #49 | `b1d3190f7d91e9a017d82a3c1efac7e553884db7` | No commits. | `29 0` | `git push origin --delete codex/normalize-phase-workflow-pattern` |
| `codex/post-promotion-workflow-docs` | Not resolved in this audit. | `47f125a3192865bfbf6ec66a01156bb60f9b37b3` | No commits. | `121 0` | `git push origin --delete codex/post-promotion-workflow-docs` |
| `codex/phase-8-comment-property-tree-discovery-fix` | #29 | `df165c9069810908c2c115cbf1bc445a4e56aedc` | No commits. | `72 0` | `git push origin --delete codex/phase-8-comment-property-tree-discovery-fix` |
| `codex/phase-8-comment-root-string-readback` | #30 | `2113ddfafd1e9f81e890b626cd17a48dd47b5793` | No commits. | `70 0` | `git push origin --delete codex/phase-8-comment-root-string-readback` |
| `codex/phase-8-comment-scalar-target-discovery` | #28 | `706cba20969f980fd1ced09c9ad4ec316cabf956` | No commits. | `74 0` | `git push origin --delete codex/phase-8-comment-scalar-target-discovery` |
| `codex/phase-8-component-find-property-readback` | Not resolved in this audit. | `6044d92f2fb882e0b992e69c507c8abd348d4b1d` | No commits. | `82 0` | `git push origin --delete codex/phase-8-component-find-property-readback` |
| `codex/phase-8-component-property-write-candidate` | Not resolved in this audit. | `34c42e5e8158fb8b51e0efae3ca7a32dee90b6c9` | No commits. | `105 0` | `git push origin --delete codex/phase-8-component-property-write-candidate` |
| `codex/phase-8-editor-candidate-envelope-checklist` | Not resolved in this audit. | `203f7b6433ca720918eb6663e9108646804163e6` | No commits. | `109 0` | `git push origin --delete codex/phase-8-editor-candidate-envelope-checklist` |
| `codex/phase-8-editor-candidate-refusal-coverage` | Not resolved in this audit. | `3f091757fa4393d68dd73906fc14e684ae41c8f4` | No commits. | `107 0` | `git push origin --delete codex/phase-8-editor-candidate-refusal-coverage` |

## Verification Evidence

Supervisor verification commands used for each candidate:

```powershell
git branch -r --list origin/<branch>
git branch -r --merged origin/main --no-color
git log --oneline origin/main..origin/<branch>
git rev-list --left-right --count origin/main...origin/<branch>
```

The final allowlist contained exactly 15 branches, which is within the approved
first-batch cap.

Post-delete confirmation commands used for each deleted branch:

```powershell
git fetch origin --prune
git branch -r --list origin/<branch>
git ls-remote --heads origin <branch>
```

Both post-delete checks returned no branch for every branch listed above.

## Preserved Branches

The following branches were intentionally preserved by rule or risk category:

- `main`: primary branch.
- `codex/backup/main-before-integration-promotion-20260425`: backup branch.
- `codex/main-promotion-resolution`: promotion/history branch.
- `codex/control-plane/gui-overhaul-integration`: integration/history branch.
- `codex/control-plane/gui-safe-baseline-2026-04-22`: baseline branch.
- `codex/control-plane/o3de-thread-launchpad-stable`: stable branch.
- `codex/control-plane/operator-desktop-stable`: stable branch.
- `codex/phase-8-camera-corridor-checkpoint`: checkpoint branch.
- `feature/production-baseline-v1`: production baseline branch.

## Unmerged Branches

These branches were not merged into `origin/main` and were not considered for
deletion:

| Branch | Reason |
| --- | --- |
| `codex/canonical-backend-bridge-editor-readiness` | Unmerged active/readiness work. |
| `codex/ci-devx` | Unmerged CI/DevX work. |

## Uncertain Branches

These branches are merged but were preserved because they need a separate
operator review or a later targeted cleanup packet:

- `codex/admitted-composed-editor-live-proof`
- `codex/control-plane/app-os-review-evidence`
- `codex/control-plane/desktop-shell`
- `codex/control-plane/gui-overhaul-contextual-help`
- `codex/control-plane/gui-overhaul-guided-flows`
- `codex/control-plane/gui-overhaul-information-architecture`
- `codex/control-plane/gui-overhaul-navigation-shell`
- `codex/control-plane/gui-overhaul-polish-validation`
- `codex/control-plane/gui-overhaul-workspace-simplification`
- `codex/control-plane/gui-section-router`
- `codex/control-plane/gui-stabilization-refactor`
- `codex/control-plane/home-shell-next`
- `codex/control-plane/o3de-real-integration`
- `codex/control-plane/operations-workspace-next`
- `codex/control-plane/operator-desktop-next`
- `codex/control-plane/operator-guide-next`
- `codex/control-plane/prompt-payload-compat`
- `codex/control-plane/records-workspace-next`
- `codex/control-plane/runtime-workspace-next`
- `codex/phase-8-editor-candidate-refusals`
- `codex/phase-8-editor-truth-ui-fixtures`
- `codex/phase-8-guarded-authoring-envelope`
- `codex/phase-8-live-component-discovery-binding`
- `codex/phase-8-live-component-find-proof`
- `codex/phase-8-property-discovery-refusal`
- `codex/phase-8-property-list-bridge-candidate`
- `codex/phase-8-property-list-bridge-readiness`
- `codex/phase-8-property-list-live-proof`
- `codex/phase-8-property-list-proof-runtime`
- `codex/phase-8-property-target-discovery-alignment`
- `codex/phase-8-property-target-discovery-design`
- `codex/phase-8-property-write-refusal-examples`
- `codex/phase-8-property-write-target-blocker-alignment`
- `codex/phase-8-read-only-property-target-selection`
- `codex/phase-8-scalar-property-target-discovery`

## Restore Commands

If one of the deleted branches needs to be recreated, use the recorded tip SHA:

```powershell
git push origin 24d0aba06bc2aaf1d17148e6d5c05503d0f17d7f:refs/heads/codex/branch-cleanup-report-after-camera-restore
git push origin 97a93223fe0c540b27a5bfc8d77c706a230c5439:refs/heads/codex/delete-merged-camera-write-restore-examples-branch
git push origin 43e14b6a845e1b3651c30699a470b0a330592e02:refs/heads/codex/delete-merged-camera-restore-review-status-branch
git push origin 8c3817d7678e5e17eb92c9d9d0edc6aee511d84c:refs/heads/codex/delete-merged-camera-bool-restore-public-corridor-branch
git push origin ddbff5cfe60b301ae639bae7d56d9df9f898cca5:refs/heads/codex/delete-merged-camera-restore-admission-decision-branch
git push origin 208158fecc02a6139f9e801780a93e4c0b1e05ef:refs/heads/codex/delete-merged-camera-bool-write-branch
git push origin b1d3190f7d91e9a017d82a3c1efac7e553884db7:refs/heads/codex/normalize-phase-workflow-pattern
git push origin 47f125a3192865bfbf6ec66a01156bb60f9b37b3:refs/heads/codex/post-promotion-workflow-docs
git push origin df165c9069810908c2c115cbf1bc445a4e56aedc:refs/heads/codex/phase-8-comment-property-tree-discovery-fix
git push origin 2113ddfafd1e9f81e890b626cd17a48dd47b5793:refs/heads/codex/phase-8-comment-root-string-readback
git push origin 706cba20969f980fd1ced09c9ad4ec316cabf956:refs/heads/codex/phase-8-comment-scalar-target-discovery
git push origin 6044d92f2fb882e0b992e69c507c8abd348d4b1d:refs/heads/codex/phase-8-component-find-property-readback
git push origin 34c42e5e8158fb8b51e0efae3ca7a32dee90b6c9:refs/heads/codex/phase-8-component-property-write-candidate
git push origin 203f7b6433ca720918eb6663e9108646804163e6:refs/heads/codex/phase-8-editor-candidate-envelope-checklist
git push origin 3f091757fa4393d68dd73906fc14e684ae41c8f4:refs/heads/codex/phase-8-editor-candidate-refusal-coverage
```

## Branch Count After Cleanup

Remote branch heads after deletion:

```text
46
```

Merged remote branches remaining after deletion:

```text
44
```

Unmerged remote branches remaining after deletion:

```text
2
```

## Recommended Next Cleanup Batch

Recommended next cleanup direction:

- Continue with ordinary merged Phase 8 packet branches that do not contain
  checkpoint, backup, stable, production, baseline, release, main, active, or
  unmerged signals.
- Keep `codex/phase-8-camera-corridor-checkpoint` preserved.
- Treat `codex/control-plane/*` branches as a separate review batch because
  some names indicate integration, baseline, stable, or long-term product
  history.

Before any future deletion batch, rerun all gates from this report and keep
deletion centralized in the supervisor path.
