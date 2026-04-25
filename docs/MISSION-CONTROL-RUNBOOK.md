# Mission Control Runbook

## Purpose

This runbook defines the shared coordination flow for multiple Codex threads
working in parallel from the same repository family without colliding on file
scope, port `8000`, or the canonical McpSandbox editor session.

Use it when you want:
- one promoted `main` baseline for new thread lanes
- one shared board visible from every worktree
- explicit task claims
- wait queues for busy resources
- notifications when blocked work becomes safe to resume

## Shared state location

Mission Control stores its shared board under the Git common directory so every
worktree attached to the same repository sees the same state.

Default state files:
- `<git-common-dir>\codex-mission-control\mission-control.sqlite3`
- `<git-common-dir>\codex-mission-control\latest-board.json`
- `<git-common-dir>\codex-mission-control\latest-board.txt`

## Entry points

Preferred entry points from the repo root:

```powershell
pwsh -File .\scripts\mission_control.ps1 board
pwsh -File .\scripts\dev.ps1 mission-control board
```

The `scripts/dev.ps1` task is a thin wrapper around the same shared
mission-control script.

## Baseline branch model

Use these roles:
- promoted baseline branch:
  `main`
- worker lane branches:
  one `codex/<slice>` or `codex/worker/<worker-id>` branch per active
  thread, created from a freshly fetched and fast-forwarded `origin/main`
- audit/rollback references:
  old integration, promotion, launchpad, and backup branches are not new-work
  baselines unless the operator explicitly reactivates one
- mission-control lane:
  the human/operator coordination lane that manages claims and unblock flow

Do not put multiple active worktrees on the exact same Git branch.

## Create a new worker lane

Create and bootstrap a new worker branch/worktree from the promoted `main`
baseline. Before creating a lane, update the primary checkout:

```powershell
git checkout main
git pull --ff-only origin main
```

Then create the lane:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control create-lane --worker-id backend-alpha
```

That command:
- creates a new branch named `codex/worker/backend-alpha` by default
- creates a sibling worktree directory
- bootstraps the worktree with `scripts/dev.ps1 bootstrap-worktree`
- registers the worker in the shared board

Useful overrides:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control create-lane `
  --worker-id ui-beta `
  --branch-name codex/worker/ui-beta `
  --worktree-path C:\Users\topgu\OneDrive\Documents\GitHub\O3de_CODEX_VX001-ui-beta
```

## Register an existing worktree

If the worktree already exists, register or refresh it instead of creating a
new one:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control sync-worker `
  --worker-id backend-alpha `
  --display-name "Backend Alpha" `
  --branch-name codex/worker/backend-alpha `
  --worktree-path C:\Users\topgu\OneDrive\Documents\GitHub\O3de_CODEX_VX001-backend-alpha
```

## Add and claim tasks

Every task must declare one or more scope paths. Scope paths are the collision
contract.

File or directory scope examples:
- `backend/app/services`
- `frontend/src/components/DesktopShell.tsx`
- `docs/MISSION-CONTROL-RUNBOOK.md`

Exclusive runtime resource scope examples:
- `resource/port-8000`
- `resource/o3de-editor`
- `resource/mcpsandbox-bridge`

Create a task:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control add-task `
  --task-id runtime-proof `
  --title "Stabilize live proof" `
  --summary "Own the canonical backend and bridge proof flow." `
  --priority 120 `
  --scope-path backend/runtime `
  --scope-path resource/port-8000 `
  --scope-path resource/o3de-editor `
  --scope-path resource/mcpsandbox-bridge
```

Claim a task directly:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control claim-task `
  --worker-id backend-alpha `
  --task-id runtime-proof
```

## Ask Mission Control for the next safe task

To ask for the next non-colliding task:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control next-task --worker-id backend-alpha
```

To automatically claim it if safe:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control next-task --worker-id backend-alpha --claim
```

If the best candidate is blocked by another active task, queue a waiter:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control next-task `
  --worker-id backend-alpha `
  --wait `
  --wait-reason "Waiting for the live editor lane to release port 8000."
```

## Heartbeats, completion, and notifications

Refresh worker status:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control heartbeat `
  --worker-id backend-alpha `
  --status active `
  --summary "Running targeted backend tests."
```

Complete a task and release any waiting lanes:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control complete-task `
  --worker-id backend-alpha `
  --task-id runtime-proof
```

Release a task without completing it:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control release-task `
  --worker-id backend-alpha `
  --task-id runtime-proof
```

Read notifications:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control notifications --worker-id backend-alpha
```

Mark notifications as read:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control notifications `
  --worker-id backend-alpha `
  --mark-read
```

## Recommended live-O3DE resource policy

Any thread that starts or verifies the canonical live backend on `127.0.0.1:8000`
should claim all of these scopes before touching the stack:
- `resource/port-8000`
- `resource/o3de-editor`
- `resource/mcpsandbox-bridge`

Any thread doing repo-only work should avoid claiming those resources unless it
actually needs them.

## Board outputs

Human-readable board:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control board
```

Structured JSON output:

```powershell
pwsh -File .\scripts\mission_control.ps1 --json board
```

The latest board snapshot is always written back to the shared state directory,
so other threads can read the same truth without editing tracked repo files.
