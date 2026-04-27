# Supervisor Branch Cleanup Report - Batch 02

Status: merged Phase 8 branch cleanup audit with supervisor-controlled deletion

Inspection date: 2026-04-26

## Summary

This report records Supervisor Batch 02 after PR #64. The batch deleted 15
ordinary merged Phase 8 branches while preserving checkpoint, control-plane,
backup, stable, baseline, production, unmerged, and uncertain branches.

Parallel agents provided read-only inventory, merge verification,
risk-classification, PR/activity, and docs-planning input. Deletion was executed
only from the supervisor-approved allowlist.

No runtime, backend, frontend, CI, GitHub settings, capability, property-write,
or restore behavior changed.

## Current Main SHA

`origin/main` and local `HEAD` both pointed to:

```text
442ed3818b53a09bf7547337f9117a3939bffe9a
```

## Branch Count Before Cleanup

Remote branch heads before deletion:

```text
46
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
  release, main, unmerged, control-plane, or active-handoff preservation rules.
- Post-delete `git branch -r --list origin/<branch>` returned no branch.
- Post-delete `git ls-remote --heads origin <branch>` returned no branch.

| Branch | Tip before deletion | `origin/main..branch` | `origin/main...branch` | Delete command |
| --- | --- | --- | --- | --- |
| `codex/phase-8-editor-candidate-refusals` | `5178068aac752eedbd01cb16f315266a365ff9c7` | No commits. | `115 0` | `git push origin --delete codex/phase-8-editor-candidate-refusals` |
| `codex/phase-8-editor-truth-ui-fixtures` | `016826b371997fd309c28d8288f04a3d432eff66` | No commits. | `113 0` | `git push origin --delete codex/phase-8-editor-truth-ui-fixtures` |
| `codex/phase-8-guarded-authoring-envelope` | `166f512a4a20f957f60d85789c53c23a22bd98a4` | No commits. | `118 0` | `git push origin --delete codex/phase-8-guarded-authoring-envelope` |
| `codex/phase-8-live-component-discovery-binding` | `e3a10fec99730e74a7a171be2fd8d3e0784f8be9` | No commits. | `89 0` | `git push origin --delete codex/phase-8-live-component-discovery-binding` |
| `codex/phase-8-live-component-find-proof` | `051c57289622fe08b73e8cc4fb2d9b0947974e2f` | No commits. | `86 0` | `git push origin --delete codex/phase-8-live-component-find-proof` |
| `codex/phase-8-property-discovery-refusal` | `ff4aa2121f506b324c43f5c1ed51c68b5ed8a6ff` | No commits. | `101 0` | `git push origin --delete codex/phase-8-property-discovery-refusal` |
| `codex/phase-8-property-list-bridge-candidate` | `494a60bb1c464e233c584725ff8a7828c3cb09e6` | No commits. | `99 0` | `git push origin --delete codex/phase-8-property-list-bridge-candidate` |
| `codex/phase-8-property-list-bridge-readiness` | `258e160c08a5ff3043565612c82f6bdc216afacc` | No commits. | `95 0` | `git push origin --delete codex/phase-8-property-list-bridge-readiness` |
| `codex/phase-8-property-list-live-proof` | `09acb03b9dbf9cdf2560fa7401d607208ece260c` | No commits. | `93 0` | `git push origin --delete codex/phase-8-property-list-live-proof` |
| `codex/phase-8-property-list-proof-runtime` | `ae26ed956b5b5d6caa4cddd1c21005fef1e79d55` | No commits. | `97 0` | `git push origin --delete codex/phase-8-property-list-proof-runtime` |
| `codex/phase-8-property-target-discovery-alignment` | `40d8ad68aefcfe436032341b43061722048dec98` | No commits. | `91 0` | `git push origin --delete codex/phase-8-property-target-discovery-alignment` |
| `codex/phase-8-property-target-discovery-design` | `ac054631b046209b0b3c259d7171e57fa2f98cc6` | No commits. | `103 0` | `git push origin --delete codex/phase-8-property-target-discovery-design` |
| `codex/phase-8-property-write-refusal-examples` | `6d7bfb86bdadd03796d5ff86451892fa97f0e9e7` | No commits. | `105 0` | `git push origin --delete codex/phase-8-property-write-refusal-examples` |
| `codex/phase-8-property-write-target-blocker-alignment` | `57c71a44ab60045d15122cc88deeb76db275964e` | No commits. | `80 0` | `git push origin --delete codex/phase-8-property-write-target-blocker-alignment` |
| `codex/phase-8-read-only-property-target-selection` | `29f0f63bd7627a32187a29497ac55222062a9e98` | No commits. | `82 0` | `git push origin --delete codex/phase-8-read-only-property-target-selection` |

## Verification Evidence

Supervisor verification commands used for each candidate:

```powershell
git branch -r --list origin/<branch>
git branch -r --merged origin/main --no-color
git log --oneline origin/main..origin/<branch>
git rev-list --left-right --count origin/main...origin/<branch>
```

The final allowlist contained exactly 15 branches, which is within the approved
Batch 02 cap.

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
- `codex/phase-8-scalar-property-target-discovery`

`codex/phase-8-scalar-property-target-discovery` was preserved only because the
Batch 02 allowlist reached the 15-branch cap. It remains a likely cleanup
candidate if it passes the same gates in a later packet.

## Restore Commands

If one of the deleted branches needs to be recreated, use the recorded tip SHA:

```powershell
git push origin 5178068aac752eedbd01cb16f315266a365ff9c7:refs/heads/codex/phase-8-editor-candidate-refusals
git push origin 016826b371997fd309c28d8288f04a3d432eff66:refs/heads/codex/phase-8-editor-truth-ui-fixtures
git push origin 166f512a4a20f957f60d85789c53c23a22bd98a4:refs/heads/codex/phase-8-guarded-authoring-envelope
git push origin e3a10fec99730e74a7a171be2fd8d3e0784f8be9:refs/heads/codex/phase-8-live-component-discovery-binding
git push origin 051c57289622fe08b73e8cc4fb2d9b0947974e2f:refs/heads/codex/phase-8-live-component-find-proof
git push origin ff4aa2121f506b324c43f5c1ed51c68b5ed8a6ff:refs/heads/codex/phase-8-property-discovery-refusal
git push origin 494a60bb1c464e233c584725ff8a7828c3cb09e6:refs/heads/codex/phase-8-property-list-bridge-candidate
git push origin 258e160c08a5ff3043565612c82f6bdc216afacc:refs/heads/codex/phase-8-property-list-bridge-readiness
git push origin 09acb03b9dbf9cdf2560fa7401d607208ece260c:refs/heads/codex/phase-8-property-list-live-proof
git push origin ae26ed956b5b5d6caa4cddd1c21005fef1e79d55:refs/heads/codex/phase-8-property-list-proof-runtime
git push origin 40d8ad68aefcfe436032341b43061722048dec98:refs/heads/codex/phase-8-property-target-discovery-alignment
git push origin ac054631b046209b0b3c259d7171e57fa2f98cc6:refs/heads/codex/phase-8-property-target-discovery-design
git push origin 6d7bfb86bdadd03796d5ff86451892fa97f0e9e7:refs/heads/codex/phase-8-property-write-refusal-examples
git push origin 57c71a44ab60045d15122cc88deeb76db275964e:refs/heads/codex/phase-8-property-write-target-blocker-alignment
git push origin 29f0f63bd7627a32187a29497ac55222062a9e98:refs/heads/codex/phase-8-read-only-property-target-selection
```

## Branch Count After Cleanup

Remote branch heads after deletion:

```text
31
```

Merged remote branches remaining after deletion:

```text
29
```

Unmerged remote branches remaining after deletion:

```text
2
```

Remaining `codex/phase-8-*` remote branches after deletion:

```text
codex/phase-8-camera-corridor-checkpoint
codex/phase-8-scalar-property-target-discovery
```

## Final Phase 8 Scalar Branch Cleanup

A follow-up single-branch cleanup packet deleted the last ordinary merged
Phase 8 branch left by the Batch 02 cap:

```text
codex/phase-8-scalar-property-target-discovery
```

This deletion was performed separately so the Batch 02 15-branch cap remained
intact.

Verification before deletion:

- `HEAD` and `origin/main` both pointed to
  `c60220ecf979fe6744b286031b56feafb638182b`.
- `git branch -r --list origin/codex/phase-8-scalar-property-target-discovery`
  confirmed the branch existed.
- `git branch -r --merged origin/main --no-color` listed the branch as merged.
- `git log --oneline origin/main..origin/codex/phase-8-scalar-property-target-discovery`
  returned no commits.
- `git rev-list --left-right --count origin/main...origin/codex/phase-8-scalar-property-target-discovery`
  returned `80 0`, so the branch-side unique commit count was `0`.
- The public GitHub open-PR check for the branch returned `0`.

Deletion command:

```powershell
git push origin --delete codex/phase-8-scalar-property-target-discovery
```

Post-delete absence confirmation:

- `git branch -r --list origin/codex/phase-8-scalar-property-target-discovery`
  returned no branch.
- `git ls-remote --heads origin codex/phase-8-scalar-property-target-discovery`
  returned no ref.

Restore command if this branch is ever needed again:

```powershell
git push origin 277fdb482ee54acc9b87304738fa97dc07fdd92e:refs/heads/codex/phase-8-scalar-property-target-discovery
```

Remote branch heads after the final scalar cleanup:

```text
30
```

Remaining `codex/phase-8-*` remote branches after the final scalar cleanup:

```text
codex/phase-8-camera-corridor-checkpoint
```

## Recommended Next Cleanup Batch

Recommended next cleanup direction:

- Ordinary merged Phase 8 work-branch cleanup is complete.
- Keep `codex/phase-8-camera-corridor-checkpoint` preserved.
- Treat `codex/control-plane/*` branches as a separate review batch because
  some names indicate integration, baseline, stable, or long-term product
  history.

Before any future deletion batch, rerun all gates from this report and keep
deletion centralized in the supervisor path.
