# Contributing

This repository follows a strict verified-worktree workflow.

Before making changes, always read:
- `docs/WORKFLOW-CODEX-CHATGPT.md`
- `docs/SLICE-START-CHECKLIST.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`

## Repository of record

Treat GitHub repo `openclaworhchestratorx951357-alt/O3de_CODEX_VX001` as the source of truth.

## Required preflight before each slice

Run:

```powershell
git rev-parse --show-toplevel
git remote get-url origin
git branch --show-current
git status --short
git fetch origin --prune
```

If the worktree is clean, then run:

```powershell
git pull --ff-only origin <current-branch>
```

If the worktree is dirty, stop and classify the state before editing.

## Local task runner

Use the repo-root helper for repeatable local checks:

```powershell
pwsh -File .\scripts\dev.ps1 checks
pwsh -File .\scripts\dev.ps1 backend-lint
pwsh -File .\scripts\dev.ps1 backend-test
pwsh -File .\scripts\dev.ps1 frontend-lint
pwsh -File .\scripts\dev.ps1 frontend-build
```

Notes:
- backend tasks use the repo-local `backend/.vendor_tools` tool path
- compose tasks require Docker to be installed locally
- frontend build can still need elevated execution in this environment because of `spawn EPERM`

## Persistence baseline

Default local persistence is not currently claimed healthy in this environment.

For truthful local runs, set an explicit writable SQLite path, for example:

```powershell
$env:O3DE_CONTROL_PLANE_DB_PATH="$env:LOCALAPPDATA\Temp\O3DE_CODEX_VX001\control-plane\control_plane.sqlite3"
```

`GET /ready` must be treated as the source of truth for persistence readiness.

## Simulated vs real behavior

Do not present simulated behavior as real integration.

Current standing rule:
- control-plane bookkeeping is real
- many O3DE execution paths are still explicitly simulated
- real O3DE adapters must not be claimed unless they are implemented and validated

## CI expectations

Current CI covers:
- backend Ruff
- backend pytest
- frontend lint
- frontend build
- Docker compose config rendering
- backend/frontend image builds

If operator-facing behavior changes, update docs in the same slice.

## End-of-slice sync

When the slice is ready:

```powershell
git status --short
git add -A
git commit -m "<intentional message>"
git push origin <current-branch>
```

If `git commit` reports nothing to commit, report that exactly.
If `git push` fails, report the exact error and stop.
