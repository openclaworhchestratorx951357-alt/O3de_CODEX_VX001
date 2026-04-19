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
