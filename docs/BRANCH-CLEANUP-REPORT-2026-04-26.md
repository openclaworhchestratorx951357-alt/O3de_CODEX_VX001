# Branch Cleanup Report - 2026-04-26

Status: report only

This report records remote branch cleanup candidates and preservation notes.

No branch deletion is authorized or performed by this report.

## Inspection Commands

```powershell
git fetch origin --prune
git branch -r --no-color
git branch -r --merged origin/main --no-color
git branch -r --no-merged origin/main --no-color
git for-each-ref refs/remotes/origin --format='%(refname:short)|%(objectname:short)|%(committerdate:short)|%(subject)'
```

## Current Main

`origin/main` at inspection time:

- `f1b6080`
- `Merge PR #36: Document capability maturity baseline`

## Not Merged Into `origin/main`

These branches are not merged into `origin/main` and must not be deleted without
operator approval:

| Branch | SHA | Date | Subject | Recommendation |
| --- | --- | --- | --- | --- |
| `origin/codex/canonical-backend-bridge-editor-readiness` | `5cd0495` | 2026-04-25 | `Add readiness-only live bridge start` | Preserve until inspected; may contain unmerged readiness work. |
| `origin/codex/ci-devx` | `71cbc09` | 2026-04-19 | `docs(control-plane): note worktree frontend build workaround` | Preserve until inspected; may contain unmerged DevX notes. |
| `origin/codex/phase-8-scalar-target-discovery-matrix` | `54343e2` | 2026-04-26 | `Add scalar property target discovery matrix` | Preserve; active Phase 8 proof PR branch. |

## Merged Branches With Strong Preserve Signals

These branches are merged into `origin/main`, but should still be preserved
unless the operator explicitly approves cleanup because they are backups,
promotion branches, integration branches, stable baselines, or audit/checkpoint
references:

- `origin/codex/backup/main-before-integration-promotion-20260425`
- `origin/codex/main-promotion-resolution`
- `origin/codex/control-plane/gui-overhaul-integration`
- `origin/codex/control-plane/gui-safe-baseline-2026-04-22`
- `origin/codex/control-plane/o3de-thread-launchpad-stable`
- `origin/codex/control-plane/operator-desktop-stable`
- `origin/feature/production-baseline-v1`

## Merged Working Branches To Consider For Cleanup Later

These remote branches are merged into `origin/main` and look like ordinary
working branches rather than backups. They may be cleanup candidates, but bulk
deletion should still wait for operator approval:

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

## Recommended Cleanup Policy

1. Do not delete unmerged branches.
2. Do not delete backup, promotion, integration, stable, or checkpoint branches
   without explicit operator approval.
3. If the operator approves cleanup, delete merged ordinary working branches in
   small batches.
4. After each batch, run `git fetch origin --prune` and re-check
   `git branch -r --no-merged origin/main`.
5. Keep at least one branch cleanup report committed so future agents know why
   branches were preserved or removed.

## Current Recommendation

Do not bulk-delete branches yet.

Next safe action is operator review of this report, especially the three
unmerged branches and the preserve-signal list.
