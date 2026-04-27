# Supervisor Branch Cleanup Report - Batch 03 Control Plane

Status: merged control-plane branch cleanup audit with supervisor-controlled
deletion

Inspection date: 2026-04-26

## Summary

This report records the Batch 03 cleanup of ordinary merged
`codex/control-plane/*` branches after the review-only inventory in
`docs/CONTROL-PLANE-BRANCH-REVIEW-INVENTORY-2026-04-26.md`.

The batch deleted exactly the 16 branches classified as delete-safe candidates
in that inventory, after re-verifying every branch from fresh `origin` refs.

No runtime, backend, frontend, CI, GitHub settings, capability, property-write,
restore, adapter, or Prompt Studio behavior changed.

## Current Main SHA

`HEAD` and `origin/main` both pointed to:

```text
52b13d6cfe5a01e01c1b933510ce1a33110042e3
```

## Branch Count Before Cleanup

Remote branch heads before deletion:

```text
30
```

Open pull requests from the public GitHub PR endpoint:

```text
0
```

## Deleted Branches

Every deleted branch passed all required gates:

- The branch existed before deletion.
- The branch was listed by `git branch -r --merged origin/main --no-color`.
- `git log --oneline origin/main..origin/<branch>` returned no commits.
- `git rev-list --left-right --count origin/main...origin/<branch>` had
  branch-side count `0`.
- No open PR referenced the branch.
- The branch was not on the preserve or uncertain list.
- The branch did not match backup, stable, baseline, production, history,
  checkpoint, release, or main preservation rules.
- Post-delete `git branch -r --list origin/<branch>` returned no branch.
- Post-delete `git ls-remote --heads origin <branch>` returned no ref.

| Branch | Tip before deletion | `origin/main..branch` | `origin/main...branch` | Delete command |
| --- | --- | --- | --- | --- |
| `codex/control-plane/desktop-shell` | `ca759e50ea4551d8f75687164b33857d61c206ba` | No commits. | `302 0` | `git push origin --delete codex/control-plane/desktop-shell` |
| `codex/control-plane/gui-overhaul-contextual-help` | `9c508c597ce7474fe0534fbea335904179bb54b7` | No commits. | `255 0` | `git push origin --delete codex/control-plane/gui-overhaul-contextual-help` |
| `codex/control-plane/gui-overhaul-guided-flows` | `9c508c597ce7474fe0534fbea335904179bb54b7` | No commits. | `255 0` | `git push origin --delete codex/control-plane/gui-overhaul-guided-flows` |
| `codex/control-plane/gui-overhaul-information-architecture` | `3368d3bcec48a90ab6590334e917965fedf712e7` | No commits. | `254 0` | `git push origin --delete codex/control-plane/gui-overhaul-information-architecture` |
| `codex/control-plane/gui-overhaul-navigation-shell` | `d5887a6ce8b6475af579b74f7bd22e592f3f32d7` | No commits. | `210 0` | `git push origin --delete codex/control-plane/gui-overhaul-navigation-shell` |
| `codex/control-plane/gui-overhaul-polish-validation` | `9c508c597ce7474fe0534fbea335904179bb54b7` | No commits. | `255 0` | `git push origin --delete codex/control-plane/gui-overhaul-polish-validation` |
| `codex/control-plane/gui-overhaul-workspace-simplification` | `9c508c597ce7474fe0534fbea335904179bb54b7` | No commits. | `255 0` | `git push origin --delete codex/control-plane/gui-overhaul-workspace-simplification` |
| `codex/control-plane/gui-section-router` | `4be653365d6ff1f11a53fd528480f58b5d6334cf` | No commits. | `199 0` | `git push origin --delete codex/control-plane/gui-section-router` |
| `codex/control-plane/gui-stabilization-refactor` | `1e7d722ff24086001e27004f464196c755db24bd` | No commits. | `188 0` | `git push origin --delete codex/control-plane/gui-stabilization-refactor` |
| `codex/control-plane/home-shell-next` | `066c98b2def257837b744557e24b75f3dea1ad38` | No commits. | `287 0` | `git push origin --delete codex/control-plane/home-shell-next` |
| `codex/control-plane/operations-workspace-next` | `066c98b2def257837b744557e24b75f3dea1ad38` | No commits. | `287 0` | `git push origin --delete codex/control-plane/operations-workspace-next` |
| `codex/control-plane/operator-desktop-next` | `dd93dd8205d434593ec9010322d1ffae45665ee0` | No commits. | `286 0` | `git push origin --delete codex/control-plane/operator-desktop-next` |
| `codex/control-plane/operator-guide-next` | `066c98b2def257837b744557e24b75f3dea1ad38` | No commits. | `287 0` | `git push origin --delete codex/control-plane/operator-guide-next` |
| `codex/control-plane/prompt-payload-compat` | `3e2f89b8a922f5cf2f7272addd314bd68a6065f4` | No commits. | `303 0` | `git push origin --delete codex/control-plane/prompt-payload-compat` |
| `codex/control-plane/records-workspace-next` | `066c98b2def257837b744557e24b75f3dea1ad38` | No commits. | `287 0` | `git push origin --delete codex/control-plane/records-workspace-next` |
| `codex/control-plane/runtime-workspace-next` | `066c98b2def257837b744557e24b75f3dea1ad38` | No commits. | `287 0` | `git push origin --delete codex/control-plane/runtime-workspace-next` |

## Verification Evidence

Supervisor verification commands used for each candidate:

```powershell
git fetch origin --prune
git branch -r --list origin/<branch>
git branch -r --merged origin/main --no-color
git log --oneline origin/main..origin/<branch>
git rev-list --left-right --count origin/main...origin/<branch>
```

The public GitHub open-PR endpoint returned `0` open PRs at inspection time.

The final allowlist contained exactly the 16 delete-safe control-plane branches
from the inventory. No preserve or uncertain branch was included.

Post-delete confirmation commands used for each deleted branch:

```powershell
git fetch origin --prune
git branch -r --list origin/<branch>
git ls-remote --heads origin <branch>
```

Both post-delete checks returned no branch for every branch listed above.

## Preserved Branches And Why

The following branches were intentionally preserved:

| Branch | Reason |
| --- | --- |
| `main` | Primary branch; forbidden to delete. |
| `origin/HEAD` | Remote symbolic ref; forbidden to delete. |
| `codex/canonical-backend-bridge-editor-readiness` | Unmerged active/readiness work. |
| `codex/ci-devx` | Unmerged CI/DevX work. |
| `codex/backup/main-before-integration-promotion-20260425` | Backup branch. |
| `codex/main-promotion-resolution` | Promotion/history branch. |
| `codex/admitted-composed-editor-live-proof` | Merged but not part of this control-plane cleanup packet. |
| `codex/phase-8-camera-corridor-checkpoint` | Checkpoint branch. |
| `feature/production-baseline-v1` | Production baseline branch. |
| `codex/control-plane/gui-safe-baseline-2026-04-22` | Control-plane baseline branch. |
| `codex/control-plane/o3de-thread-launchpad-stable` | Control-plane stable branch. |
| `codex/control-plane/operator-desktop-stable` | Control-plane stable branch. |

## Unmerged Branches

These branches were not merged into `origin/main` and were not considered for
deletion:

| Branch | Reason |
| --- | --- |
| `codex/canonical-backend-bridge-editor-readiness` | Unmerged active/readiness work. |
| `codex/ci-devx` | Unmerged CI/DevX work. |

## Uncertain Branches

These control-plane branches passed merge/no-unique/open-PR gates but were
preserved because their names suggest audit, integration, or long-term context:

| Branch | Reason |
| --- | --- |
| `codex/control-plane/app-os-review-evidence` | Contains `evidence`; preserve as audit/reference context unless explicitly reclassified. |
| `codex/control-plane/gui-overhaul-integration` | Historical integration branch for the GUI/control-plane promotion sequence. |
| `codex/control-plane/o3de-real-integration` | Contains `integration`; may be useful O3DE integration history. |

## Restore Commands

If one of the deleted branches needs to be recreated, use the recorded tip SHA:

```powershell
git push origin ca759e50ea4551d8f75687164b33857d61c206ba:refs/heads/codex/control-plane/desktop-shell
git push origin 9c508c597ce7474fe0534fbea335904179bb54b7:refs/heads/codex/control-plane/gui-overhaul-contextual-help
git push origin 9c508c597ce7474fe0534fbea335904179bb54b7:refs/heads/codex/control-plane/gui-overhaul-guided-flows
git push origin 3368d3bcec48a90ab6590334e917965fedf712e7:refs/heads/codex/control-plane/gui-overhaul-information-architecture
git push origin d5887a6ce8b6475af579b74f7bd22e592f3f32d7:refs/heads/codex/control-plane/gui-overhaul-navigation-shell
git push origin 9c508c597ce7474fe0534fbea335904179bb54b7:refs/heads/codex/control-plane/gui-overhaul-polish-validation
git push origin 9c508c597ce7474fe0534fbea335904179bb54b7:refs/heads/codex/control-plane/gui-overhaul-workspace-simplification
git push origin 4be653365d6ff1f11a53fd528480f58b5d6334cf:refs/heads/codex/control-plane/gui-section-router
git push origin 1e7d722ff24086001e27004f464196c755db24bd:refs/heads/codex/control-plane/gui-stabilization-refactor
git push origin 066c98b2def257837b744557e24b75f3dea1ad38:refs/heads/codex/control-plane/home-shell-next
git push origin 066c98b2def257837b744557e24b75f3dea1ad38:refs/heads/codex/control-plane/operations-workspace-next
git push origin dd93dd8205d434593ec9010322d1ffae45665ee0:refs/heads/codex/control-plane/operator-desktop-next
git push origin 066c98b2def257837b744557e24b75f3dea1ad38:refs/heads/codex/control-plane/operator-guide-next
git push origin 3e2f89b8a922f5cf2f7272addd314bd68a6065f4:refs/heads/codex/control-plane/prompt-payload-compat
git push origin 066c98b2def257837b744557e24b75f3dea1ad38:refs/heads/codex/control-plane/records-workspace-next
git push origin 066c98b2def257837b744557e24b75f3dea1ad38:refs/heads/codex/control-plane/runtime-workspace-next
```

## Branch Count After Cleanup

Remote branch heads after deletion:

```text
14
```

Remaining `codex/control-plane/*` remote branches after deletion:

```text
codex/control-plane/app-os-review-evidence
codex/control-plane/gui-overhaul-integration
codex/control-plane/gui-safe-baseline-2026-04-22
codex/control-plane/o3de-real-integration
codex/control-plane/o3de-thread-launchpad-stable
codex/control-plane/operator-desktop-stable
```

## Recommended Next Cleanup Step

Recommended next cleanup direction:

- Preserve the remaining control-plane branches unless the operator explicitly
  reclassifies the uncertain integration/evidence branches or stable/baseline
  branches.
- If further cleanup is desired, perform a report-first review of
  `codex/admitted-composed-editor-live-proof`,
  `codex/main-promotion-resolution`, and any remaining non-control-plane
  merged history branches.
- Continue to keep branch deletion centralized in a supervisor-controlled path,
  with fresh fetch/merge/no-unique/open-PR verification before any deletion.
