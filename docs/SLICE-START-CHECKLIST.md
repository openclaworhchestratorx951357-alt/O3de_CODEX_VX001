# Slice Start Checklist

## Purpose

This checklist is the required preflight for every new Codex implementation slice in `O3de_CODEX_VX001`.

It exists to make three things explicit before any edits begin:

- the work is happening in the correct Git repository
- the active branch is reconciled with GitHub as the source of truth
- the current slice starts from a known, reviewable local state

This checklist complements:
- `AGENTS.md`
- `docs/CODEX-EVERGREEN-EXECUTION-CHARTER.md`
- `docs/WORKFLOW-CODEX-CHATGPT.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`

## Required Slice-Start Gate

Before each new slice, run and report:

```powershell
git rev-parse --show-toplevel
git remote get-url origin
git branch --show-current
git status --short
git fetch origin --prune
```

Then apply these rules in order:

1. `git rev-parse --show-toplevel` must succeed.
2. `git remote get-url origin` must resolve to `openclaworhchestratorx951357-alt/O3de_CODEX_VX001`.
3. The active branch must be printed explicitly.
4. `git status --short` must be inspected before any edit.
5. `git fetch origin --prune` must run before each slice so remote-tracking refs are current.

If any of those checks fail, stop immediately and report the mismatch.

## GitHub Sync Rule Per Slice

GitHub remains the source of truth for every slice.

After `git fetch origin --prune`:

- if the worktree is clean and the current slice is continuing on an existing branch, fast-forward the local branch before editing:

```powershell
git pull --ff-only origin <current-branch>
```

- if the worktree is not clean, do **not** pull over local changes blindly
- instead, report the dirty state and make the next step explicit:
  - sync/push the existing local slice first, or
  - intentionally continue on top of already-accepted local changes

The rule is:

> Every slice must begin with a fresh remote fetch, and a fast-forward sync whenever that can be done safely.

## Local State Handling Rule

If `git status --short` is not empty at slice start, classify the state before editing:

- accepted local work not yet pushed
- in-progress local work from the current slice
- unexpected local changes
- unrelated user changes

Codex must report which case applies.

If the state is ambiguous, stop and report it instead of editing through uncertainty.

## Current Repository-Specific Baselines

These are active standing assumptions for this repository:

- simulated execution must remain explicitly labeled as simulated
- explicit operator-configured persistence remains the truthful local-run baseline
- Phase 3 validator support is intentionally frozen at the accepted subset unless a newly published per-tool schema actually requires more
- no real O3DE adapters should be claimed unless implemented and validated

Evergreen execution default:
- use `docs/CODEX-EVERGREEN-EXECUTION-CHARTER.md` as the default prioritization
  and capability-truth reference unless the user explicitly supersedes it
- use code, tests, and runtime behavior as truth over stale roadmap wording

## Recommended PowerShell Slice Start Block

```powershell
$GitTop = (git rev-parse --show-toplevel).Trim()
$Origin = (git remote get-url origin).Trim()
$Branch = (git branch --show-current).Trim()

Write-Host "Repo path verified: $GitTop"
Write-Host "Origin verified: $Origin"
Write-Host "Branch: $Branch"

git status --short
git fetch origin --prune

if (-not $Origin.Contains("openclaworhchestratorx951357-alt/O3de_CODEX_VX001")) {
    throw "Refusing to continue: wrong origin remote"
}
```

If the worktree is clean, then run:

```powershell
git pull --ff-only origin $Branch
```

If the worktree is dirty, report that state before taking any further action.

## End-of-Slice Sync Expectation

When a slice is accepted and ready to publish, the expected sync sequence is:

```powershell
git status --short
git add -A
git commit -m "<intentional message>"
git push origin <current-branch>
```

If `git commit` says there is nothing to commit, report that exactly.
If `git push` fails, report the exact error text and stop.

## Why This Is The Default

This checklist matches the practical recommendations used by official Git and GitHub documentation:

- `git status --short` is a compact way to inspect current working tree state
- `git fetch --prune` keeps remote-tracking refs current and removes stale remote refs
- `git pull --ff-only` updates safely without creating an accidental merge commit when histories diverge

For this repository, those defaults reduce drift, keep branch state auditable, and make it harder to edit the wrong worktree or start from stale GitHub state.
