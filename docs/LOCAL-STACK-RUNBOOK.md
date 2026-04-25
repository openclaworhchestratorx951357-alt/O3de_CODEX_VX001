# Local Stack Runbook

## Purpose

This runbook documents the current verified Docker/compose baseline for `O3de_CODEX_VX001`.

Use it when you need to:
- start the local full stack
- confirm the backend and frontend containers are healthy
- understand which persistence path is being used inside containers
- keep simulated vs real behavior described truthfully

This runbook complements:
- `README.md`
- `CONTRIBUTING.md`
- `docs/WORKFLOW-CODEX-CHATGPT.md`
- `docs/MISSION-CONTROL-RUNBOOK.md`
- `docs/SLICE-START-CHECKLIST.md`

## Current verified local state

The local Docker baseline is now verified on this machine.

Verified successfully:
- `docker --version`
- `docker compose version`
- `docker info`
- `docker run --rm hello-world`
- `docker compose config`
- `docker compose build`
- `docker compose up -d`
- `docker compose ps`
- `GET http://localhost:8000/ready`
- `GET http://localhost:8000/health`

This means the Phase 5 compose stack is no longer just configured; it is locally runnable and health-checked here.

## Compose services

Current compose services:
- `backend`
- `frontend`

Current port mapping:
- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`

## Start the stack

From the repo root:

```powershell
docker compose up --build
```

Detached mode:

```powershell
docker compose up -d
```

## Canonical live backend lifecycle

For the non-container canonical live backend on `127.0.0.1:8000`, prefer the
repo-owned lifecycle commands instead of manual `uvicorn` shells:

```powershell
pwsh -File .\scripts\dev.ps1 live-start
pwsh -File .\scripts\dev.ps1 live-status
pwsh -File .\scripts\dev.ps1 live-stop
pwsh -File .\scripts\dev.ps1 live-restart
pwsh -File .\scripts\dev.ps1 live-proof
```

Operational intent:
- `live-start` starts only the canonical backend with the verified McpSandbox
  target env and the operator fallback SQLite path under `%LOCALAPPDATA%`.
- `live-status` reports the current `8000` listener, canonical editor process
  state, target wiring, bridge state, and recent backend logs.
- `live-stop` clears both the backend listener on `8000` and the canonical
  McpSandbox `Editor.exe` so stale editor sessions do not bleed into later test
  runs.
- `live-restart` gives operators one clean relaunch path when port collisions or
  stale backend state are suspected.
- `live-proof` restarts the backend, launches the canonical McpSandbox Editor
  bridge when no canonical `Editor.exe` is already running, waits for a fresh
  bridge heartbeat, and then runs the repo-owned live proof helper. If an
  existing canonical Editor is present but its heartbeat stays stale, the proof
  fails instead of launching a duplicate Editor. Unless `-KeepEditorOpen` is
  used, the wrapper stops only the Editor process it launched.

When multiple worktrees or Codex threads are active, claim these
mission-control scopes before running the canonical live backend or proof flow:
- `resource/port-8000`
- `resource/o3de-editor`
- `resource/mcpsandbox-bridge`

Use the shared board before touching the live stack:

```powershell
pwsh -File .\scripts\dev.ps1 mission-control board
```

## Desktop app launcher

For the repo-owned desktop launcher that opens the current app state from this
checkout, use:

```powershell
pwsh -File .\scripts\dev.ps1 desktop-start
pwsh -File .\scripts\dev.ps1 desktop-status
pwsh -File .\scripts\dev.ps1 desktop-stop
pwsh -File .\scripts\dev.ps1 desktop-restart
pwsh -File .\scripts\dev.ps1 desktop-shortcut
```

Operational intent:
- `desktop-start` bootstraps the current worktree if needed, starts or reuses
  the canonical backend on `127.0.0.1:8000`, starts or reuses the frontend app
  on `127.0.0.1:4173`, updates the desktop shortcut, and opens the app URL in a
  browser.
- `desktop-status` reports frontend readiness, backend readiness, and whether
  the desktop shortcut exists.
- `desktop-stop` shuts down the repo-managed frontend process and then clears
  the canonical backend/editor path through the existing live runtime control.
- `desktop-restart` performs a clean repo-managed relaunch of both sides.
- `desktop-shortcut` recreates the Windows desktop shortcut so it points at the
  current repo checkout.

The installed Windows shortcut is:
- `%USERPROFILE%\Desktop\O3DE Codex VX001 App.lnk`

That shortcut points at the repo-owned launcher script, so future launcher
improvements on this branch update behavior without needing a new shortcut file.

## Inspect the stack

Render the compose config:

```powershell
docker compose config
```

Show running services:

```powershell
docker compose ps
```

Stop the stack:

```powershell
docker compose down
```

## Health checks

Minimum backend checks:

```powershell
Invoke-WebRequest http://localhost:8000/health
Invoke-WebRequest http://localhost:8000/ready
```

Expected result:
- both endpoints return HTTP `200`

What that means:
- the backend container is serving requests
- containerized persistence is healthy for the compose path
- readiness is truthful for the currently active container runtime state

## Persistence behavior

Inside compose, the backend uses:
- `O3DE_CONTROL_PLANE_DB_PATH=/app/runtime/control_plane.sqlite3`

That path is backed by the repo-root bind mount:
- `./runtime:/app/runtime`

Practical implication:
- containerized persistence is now a verified healthy path on this machine
- this does **not** change the standing truth for non-container local runs

## Important distinction: container vs non-container persistence

For local non-container runs, the truthful baseline is still:
- use an explicit operator-configured writable path such as `O3DE_CONTROL_PLANE_DB_PATH`

Do not claim that default non-container LOCALAPPDATA persistence is healthy unless it has been specifically re-verified outside Docker.

## Simulated vs real behavior

The compose stack runs the real control-plane backend and frontend surfaces.

However:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real control-plane records
- many O3DE execution paths are still explicitly simulated
- admitted-real O3DE execution is still narrow and target-specific:
  `project.inspect`, `build.configure` preflight, admitted `settings.patch`
  slices, `editor.session.open`, `editor.level.open`, narrow
  `editor.entity.create`, allowlist-bound `editor.component.add`, and explicit
  `editor.component.property.get` readback
- `editor.entity.create` is admitted real-authoring only for root-level named
  entity creation on the loaded/current level through the persistent bridge
  path; `parent_entity_id`, `prefab_asset`, and `position` remain rejected
- `editor.component.add` is admitted real-authoring only for explicit entity id
  plus allowlisted component attachment on the loaded/current level
- `editor.component.property.get` is admitted hybrid read-only only for explicit
  component id plus explicit property path on the loaded/current level
- broad real O3DE adapter coverage is still not implemented

UI, API responses, and docs must continue to label simulated execution as simulated.

## When the stack is considered healthy

The local compose stack should be considered healthy only when all of these are true:
- `docker compose build` succeeds
- `docker compose up -d` succeeds
- `docker compose ps` shows both services running
- `GET /health` returns `200`
- `GET /ready` returns `200`

## Known limitations

- Docker validation is now locally verified on this machine, but other machines may still need Docker setup first.
- Real O3DE execution is still narrow and must not be generalized beyond the
  admitted-real set.
- `editor.entity.create` is admitted real only for the current narrow
  root-level named entity-create slice on McpSandbox.
- `editor.component.add` is admitted real only for the current allowlist-bound
  component attachment slice on McpSandbox.
- `editor.component.property.get` remains read-only and explicit-surface only.
- Non-container local persistence still requires truthful operator configuration unless separately re-verified.
- Simulated execution must remain explicitly labeled.
