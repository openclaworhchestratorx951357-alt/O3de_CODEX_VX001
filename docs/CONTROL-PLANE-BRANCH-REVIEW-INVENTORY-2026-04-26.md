# Control-Plane Branch Review Inventory - 2026-04-26

Status: review-only inventory

Inspection date: 2026-04-26

## Summary

This report inventories the remaining `codex/control-plane/*` remote branches
after Phase 8 branch cleanup PRs #64 through #66.

No branches were deleted in this packet. The goal is only to classify remaining
control-plane branches before any future deletion packet.

The inventory used fresh remote refs from `origin`, checked merge status against
`origin/main`, checked branch-side unique commits, and checked whether any open
pull request referenced each branch.

## Current Main SHA

Local `HEAD` and `origin/main` both pointed to:

```text
3e0a1a6f38dd0793f3138017372e4134b185d40d
```

## Total Branch Count

Remote branch heads at inspection time:

```text
30
```

Open pull requests from the public GitHub PR endpoint:

```text
0
```

## Control-Plane Branches Inspected

The inventory found 22 remote branches matching `origin/codex/control-plane/*`.

For every inspected branch:

- The branch existed at inspection time.
- `git log --oneline origin/main..origin/<branch>` returned no commits.
- `git rev-list --left-right --count origin/main...origin/<branch>` had
  branch-side count `0`.
- No open PR referenced the branch.

| Branch | Tip | Merged into `origin/main` | `origin/main...branch` | Open PR | Classification |
| --- | --- | --- | --- | --- | --- |
| `codex/control-plane/app-os-review-evidence` | `754e0ed59182e9e3ccc6effbb73dd72fe71e6552` | yes | `189 0` | none | uncertain |
| `codex/control-plane/desktop-shell` | `ca759e50ea4551d8f75687164b33857d61c206ba` | yes | `302 0` | none | delete-safe candidate |
| `codex/control-plane/gui-overhaul-contextual-help` | `9c508c597ce7474fe0534fbea335904179bb54b7` | yes | `255 0` | none | delete-safe candidate |
| `codex/control-plane/gui-overhaul-guided-flows` | `9c508c597ce7474fe0534fbea335904179bb54b7` | yes | `255 0` | none | delete-safe candidate |
| `codex/control-plane/gui-overhaul-information-architecture` | `3368d3bcec48a90ab6590334e917965fedf712e7` | yes | `254 0` | none | delete-safe candidate |
| `codex/control-plane/gui-overhaul-integration` | `9ee1c5657feb3831eb515b818655a9a2c18cfd97` | yes | `136 0` | none | uncertain |
| `codex/control-plane/gui-overhaul-navigation-shell` | `d5887a6ce8b6475af579b74f7bd22e592f3f32d7` | yes | `210 0` | none | delete-safe candidate |
| `codex/control-plane/gui-overhaul-polish-validation` | `9c508c597ce7474fe0534fbea335904179bb54b7` | yes | `255 0` | none | delete-safe candidate |
| `codex/control-plane/gui-overhaul-workspace-simplification` | `9c508c597ce7474fe0534fbea335904179bb54b7` | yes | `255 0` | none | delete-safe candidate |
| `codex/control-plane/gui-safe-baseline-2026-04-22` | `abe013b7e6cf8c42898b0834c49b73cd8a264ee8` | yes | `258 0` | none | preserve |
| `codex/control-plane/gui-section-router` | `4be653365d6ff1f11a53fd528480f58b5d6334cf` | yes | `199 0` | none | delete-safe candidate |
| `codex/control-plane/gui-stabilization-refactor` | `1e7d722ff24086001e27004f464196c755db24bd` | yes | `188 0` | none | delete-safe candidate |
| `codex/control-plane/home-shell-next` | `066c98b2def257837b744557e24b75f3dea1ad38` | yes | `287 0` | none | delete-safe candidate |
| `codex/control-plane/o3de-real-integration` | `abe013b7e6cf8c42898b0834c49b73cd8a264ee8` | yes | `258 0` | none | uncertain |
| `codex/control-plane/o3de-thread-launchpad-stable` | `481a22f6bebf0819d906aea6850315b849636d45` | yes | `261 0` | none | preserve |
| `codex/control-plane/operations-workspace-next` | `066c98b2def257837b744557e24b75f3dea1ad38` | yes | `287 0` | none | delete-safe candidate |
| `codex/control-plane/operator-desktop-next` | `dd93dd8205d434593ec9010322d1ffae45665ee0` | yes | `286 0` | none | delete-safe candidate |
| `codex/control-plane/operator-desktop-stable` | `066c98b2def257837b744557e24b75f3dea1ad38` | yes | `287 0` | none | preserve |
| `codex/control-plane/operator-guide-next` | `066c98b2def257837b744557e24b75f3dea1ad38` | yes | `287 0` | none | delete-safe candidate |
| `codex/control-plane/prompt-payload-compat` | `3e2f89b8a922f5cf2f7272addd314bd68a6065f4` | yes | `303 0` | none | delete-safe candidate |
| `codex/control-plane/records-workspace-next` | `066c98b2def257837b744557e24b75f3dea1ad38` | yes | `287 0` | none | delete-safe candidate |
| `codex/control-plane/runtime-workspace-next` | `066c98b2def257837b744557e24b75f3dea1ad38` | yes | `287 0` | none | delete-safe candidate |

## Delete-Safe Candidates

These branches appear eligible for a later cleanup packet because they are
merged into `origin/main`, have zero branch-side unique commits, have no open
PR, and do not contain protected naming signals such as `stable`, `baseline`,
`production`, `checkpoint`, or `backup`.

No branch in this list was deleted by this inventory packet.

| Branch | Reason |
| --- | --- |
| `codex/control-plane/desktop-shell` | Ordinary merged control-plane work branch with no unique commits. |
| `codex/control-plane/gui-overhaul-contextual-help` | Ordinary merged GUI-overhaul branch with no unique commits. |
| `codex/control-plane/gui-overhaul-guided-flows` | Ordinary merged GUI-overhaul branch with no unique commits. |
| `codex/control-plane/gui-overhaul-information-architecture` | Ordinary merged GUI-overhaul branch with no unique commits. |
| `codex/control-plane/gui-overhaul-navigation-shell` | Ordinary merged GUI-overhaul branch with no unique commits. |
| `codex/control-plane/gui-overhaul-polish-validation` | Ordinary merged GUI-overhaul branch with no unique commits. |
| `codex/control-plane/gui-overhaul-workspace-simplification` | Ordinary merged GUI-overhaul branch with no unique commits. |
| `codex/control-plane/gui-section-router` | Ordinary merged control-plane work branch with no unique commits. |
| `codex/control-plane/gui-stabilization-refactor` | Ordinary merged control-plane refactor branch with no unique commits. |
| `codex/control-plane/home-shell-next` | Ordinary merged workspace branch with no unique commits. |
| `codex/control-plane/operations-workspace-next` | Ordinary merged workspace branch with no unique commits. |
| `codex/control-plane/operator-desktop-next` | Ordinary merged workspace branch with no unique commits. |
| `codex/control-plane/operator-guide-next` | Ordinary merged workspace branch with no unique commits. |
| `codex/control-plane/prompt-payload-compat` | Ordinary merged compatibility branch with no unique commits. |
| `codex/control-plane/records-workspace-next` | Ordinary merged workspace branch with no unique commits. |
| `codex/control-plane/runtime-workspace-next` | Ordinary merged workspace branch with no unique commits. |

## Preserve Branches And Why

These branches passed merge/no-unique checks, but their names indicate
baseline, stable, or long-term reference value. Preserve them unless the
operator explicitly approves a targeted deletion packet.

| Branch | Reason |
| --- | --- |
| `codex/control-plane/gui-safe-baseline-2026-04-22` | Contains `baseline`; preserve as a safety/reference branch. |
| `codex/control-plane/o3de-thread-launchpad-stable` | Contains `stable`; preserve as a safety/reference branch. |
| `codex/control-plane/operator-desktop-stable` | Contains `stable`; preserve as a safety/reference branch. |

## Unmerged/Active Branches

No `codex/control-plane/*` branch was unmerged or tied to an open PR at
inspection time.

The repo still had non-control-plane unmerged branches, but they are outside the
scope of this report.

## Uncertain Branches

These branches passed merge/no-unique/open-PR gates but should be preserved
until the operator explicitly decides whether their names represent useful
history or audit context.

| Branch | Reason |
| --- | --- |
| `codex/control-plane/app-os-review-evidence` | Contains `evidence`; may be an audit/reference branch despite being merged. |
| `codex/control-plane/gui-overhaul-integration` | Historical integration branch for the GUI/control-plane promotion sequence; preserve unless explicitly retired. |
| `codex/control-plane/o3de-real-integration` | Contains `integration`; may be a useful O3DE integration history branch. |

## Recommended Next Batch

Recommended next cleanup direction:

- If the operator wants to continue cleanup, create a deletion packet for the
  delete-safe candidates listed above.
- Batch size should stay capped, for example 10 to 15 branches, with
  centralized deletion only after re-running all gates.
- Preserve `stable`, `baseline`, `integration`, and `evidence` branches unless
  a future packet explicitly reclassifies them with operator approval.
- Keep this inventory as the source table for the next control-plane cleanup
  decision, but do not trust it blindly; re-fetch and re-verify before deleting.

## Explicit Non-Deletion Note

This PR deletes no branches. It changes documentation only.

Before any future deletion packet, rerun:

```powershell
git fetch origin --prune
git branch -r --list origin/<branch>
git branch -r --merged origin/main --no-color
git log --oneline origin/main..origin/<branch>
git rev-list --left-right --count origin/main...origin/<branch>
```

A branch is delete-safe only if it still exists, is merged into `origin/main`,
has no `origin/main..branch` commits, has branch-side count `0`, has no open PR,
and does not match any preserve or uncertain naming rule.
