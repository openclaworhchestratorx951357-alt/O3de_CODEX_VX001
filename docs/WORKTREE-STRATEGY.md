# Worktree Strategy

## Purpose

This document defines the recommended worktree layout for parallel Codex work in
`O3de_CODEX_VX001`.

Use worktrees when parallel lanes would otherwise collide in one checkout.

## Default rule

Keep the primary repository checkout as the integration lane for the active
branch.

Create separate worktrees only for:
- risky refactors
- independent multi-day tracks
- experiments that may fail
- concurrent backend and frontend lanes

## Current parallel-thread baseline

Use the current O3DE control-plane stream with:
- integration lane:
  `codex/control-plane/o3de-real-integration`
- stable launchpad branch for new threads:
  `codex/control-plane/o3de-thread-launchpad-stable`
- one worker branch per active thread, created from the launchpad branch
- one shared mission-control board described in
  `docs/MISSION-CONTROL-RUNBOOK.md`

Mission Control keeps the coordination state under the Git common directory so
all attached worktrees see the same task claims, waiters, and notifications
without writing tracked board files into the repository.

Preferred entry point:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control board
```

## Recommended base layout

Recommended local structure:

```text
<repo-root>
<repo-parent>\O3de_CODEX_VX001-runtime-adapters
<repo-parent>\O3de_CODEX_VX001-operator-shell
<repo-parent>\O3de_CODEX_VX001-persistence
<repo-parent>\O3de_CODEX_VX001-ci-devx
```

The current repo root remains the integration lane.

## Named lanes

### Integration lane

- branch: current accepted working branch
- purpose: the branch you intend to publish next
- use for: small coherent slices and accepted follow-on work

## Current branch map

Use the current desktop/operator stream with one integration branch, one stable
checkpoint branch, and focused follow-on branches that can diverge safely from
the same published commit.

### Published integration branch

- branch: `codex/control-plane/operator-desktop-next`
- purpose: the active integration lane for the current desktop-shell,
  operator-guide, and workspace-performance stream
- use for:
  - accepted UI shell slices
  - verified operator-guide updates
  - integration-ready performance refinements

### Stable checkpoint branch

- branch: `codex/control-plane/operator-desktop-stable`
- purpose: a published snapshot of the current accepted desktop/operator
  baseline
- use for:
  - creating new focused branches without branching from an in-flight local
    worktree
  - recovering a clean starting point for future slices

### Focused follow-on branches

- branch: `codex/control-plane/home-shell-next`
  - use for: home workspace shell, launchpad, and summary-surface slices
- branch: `codex/control-plane/operations-workspace-next`
  - use for: command-center dispatch, approvals, and timeline slices
- branch: `codex/control-plane/runtime-workspace-next`
  - use for: bridge status, executors, workspaces, and governance slices
- branch: `codex/control-plane/records-workspace-next`
  - use for: runs, executions, artifacts, and evidence drilldown slices
- branch: `codex/control-plane/operator-guide-next`
  - use for: in-app instructions, tooltips, and guide synchronization work

### Current branch rules

- create new focused slices from
  `codex/control-plane/o3de-thread-launchpad-stable` unless the work is
  explicitly intended to extend the active integration lane
- merge or cherry-pick back into
  `codex/control-plane/o3de-real-integration` only after local verification
- keep admitted-real wording explicit:
  - `editor.session.open` admitted real
  - `editor.level.open` admitted real
  - `editor.entity.create` admitted real only for the current narrow
    root-level named entity-create slice on the loaded/current level

### Runtime adapters lane

- branch prefix: `codex/runtime-adapters`
- use for:
  - real or hybrid adapter boundary work
  - manifest-backed evidence refinements
  - mutation-gate contract work
- avoid mixing:
  - frontend cosmetic work
  - unrelated CI or dev tooling

### Operator shell lane

- branch prefix: `codex/operator-shell`
- use for:
  - dashboard panels
  - drilldowns
  - operator wording
  - frontend presentation and UX
- avoid mixing:
  - backend persistence or adapter semantics unless required for the same slice

### Persistence lane

- branch prefix: `codex/persistence`
- use for:
  - readiness persistence claims
  - DB path handling
  - schema checkpoints
  - local vs container persistence alignment

### CI / developer experience lane

- branch prefix: `codex/ci-devx`
- use for:
  - `scripts/dev.ps1`
  - CI workflows
  - Dockerfiles
  - compose validation
  - repo-level tooling

## Creation examples

From the main repo checkout:

```powershell
git worktree add ..\O3de_CODEX_VX001-runtime-adapters -b codex/runtime-adapters origin/feature/production-baseline-v1
git worktree add ..\O3de_CODEX_VX001-operator-shell -b codex/operator-shell origin/feature/production-baseline-v1
git worktree add ..\O3de_CODEX_VX001-persistence -b codex/persistence origin/feature/production-baseline-v1
git worktree add ..\O3de_CODEX_VX001-ci-devx -b codex/ci-devx origin/feature/production-baseline-v1
```

If the branch should start from the current local branch tip instead of the
remote tracking branch, replace the final argument with the current branch name.

After creating a fresh worktree, bootstrap its local task environment:

```powershell
pwsh -File .\scripts\dev.ps1 bootstrap-worktree
```

Current bootstrap behavior:
- links `backend/.venv` from the primary checkout when the worktree does not
  have its own backend virtualenv
- links `backend/.vendor_tools` from the primary checkout when needed
- installs a local `frontend/node_modules` tree inside the worktree

This keeps backend Python assets shared while letting frontend tools run against
worktree-local packages and source paths.

If worktree-local task execution is inconsistent, gather the launch trace first:

```powershell
pwsh -File .\scripts\dev.ps1 runner-diagnostics
```

Use that output to compare executable resolution, cwd, env overrides, and
scripted versus direct task behavior before patching the runner.

Current `codex/ci-devx` boundary:
- backend verification is stable through the scripted runner
- frontend lint is stable through the scripted runner
- frontend build may still fail under scripted child-process launch with Windows
  `spawn EPERM`
- when that happens, the accepted temporary workaround is to run `npm run build`
  directly from the worktree `frontend/` directory and report that result

## Worktree rules

One worktree should own one concern at a time.

Inside each worktree:
- run the same repo verification checks as the primary checkout
- avoid mixing unrelated fixes
- commit with an intentional scope
- push the lane branch before switching attention elsewhere

Do not:
- use two worktrees on the same branch for active edits
- leave ambiguous unstaged drift across multiple worktrees
- merge lane branches mentally without an explicit review pass

When multiple threads are active, also:
- register each worktree as a worker lane in Mission Control
- claim file scopes before editing shared backend/frontend paths
- claim `resource/port-8000`, `resource/o3de-editor`, and
  `resource/mcpsandbox-bridge` before touching the canonical live stack
- use waiters and notifications instead of guessing when a blocked resource is
  free

## Recommended usage pattern

Use this pattern for parallel work:
1. keep the integration lane clean
2. open one worktree per risky track
3. finish and verify each lane independently
4. merge or cherry-pick intentionally back into the integration lane
5. remove stale worktrees after publication

## Inspect and clean up

Show worktrees:

```powershell
git worktree list
```

Remove a finished worktree:

```powershell
git worktree remove ..\O3de_CODEX_VX001-operator-shell
```

Prune stale metadata:

```powershell
git worktree prune
```

## When not to use a worktree

Stay in the active checkout when:
- the slice is small
- the risk of overlap is low
- the branch is already the correct integration lane
- adding another worktree would create more coordination overhead than safety
