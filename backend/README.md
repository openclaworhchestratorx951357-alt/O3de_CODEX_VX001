# backend

FastAPI backend for the O3DE Agent Control app.

## Requirements

- Python 3.11+
- pip

## Install

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Test

From the repo root:

```powershell
python -m pytest backend/tests -q
```

Backend tests now include repo-local import bootstrap in
`backend/tests/conftest.py`, so no `PYTHONPATH` override is required.

For the current `codex/control-plane/o3de-real-integration` local O3DE target,
prefer the repo-owned lifecycle commands instead of ad hoc shell sessions.

From the repo root:

```powershell
pwsh -File .\scripts\dev.ps1 live-start
pwsh -File .\scripts\dev.ps1 live-status
pwsh -File .\scripts\dev.ps1 live-stop
pwsh -File .\scripts\dev.ps1 live-restart
pwsh -File .\scripts\dev.ps1 live-proof
```

What each command does:
- `live-start` brings up the canonical backend on `127.0.0.1:8000` with the
  verified McpSandbox target wiring and the repo-owned non-OneDrive operator DB
  fallback path.
- `live-status` reports the current listener on `8000`, canonical editor
  processes, target wiring, bridge state, and recent stdout/stderr log lines.
- `live-stop` clears the listener on `8000` and also shuts down the canonical
  McpSandbox `Editor.exe` so stale editor sessions do not linger between runs.
- `live-restart` forces a clean backend relaunch without requiring ad hoc port
  cleanup.
- `live-proof` currently performs a clean backend relaunch before running the
  repo-owned live proof helper. That proof still expects a fresh bridge
  heartbeat, so it will fail fast and truthfully if the editor-side bridge is
  not already live.

Those commands pin the currently verified local target wiring:
- `O3DE_TARGET_PROJECT_ROOT=C:\Users\topgu\O3DE\Projects\McpSandbox`
- `O3DE_TARGET_ENGINE_ROOT=C:\src\o3de`
- `O3DE_TARGET_EDITOR_RUNNER=C:\Users\topgu\O3DE\Projects\McpSandbox\build\windows\bin\profile\Editor.exe`
- `O3DE_CONTROL_PLANE_DB_STRATEGY=operator`
- `O3DE_CONTROL_PLANE_DB_FALLBACK_DIR=%LOCALAPPDATA%\O3DE_CODEX_VX001\live-verify-db`
- `O3DE_ADAPTER_MODE=hybrid`

Why this lifecycle path is the truthful local baseline:
- it avoids accidental drift between manual shell variables and the backend
  process that actually binds `127.0.0.1:8000`
- it avoids stale `8000` listener collisions by using one repo-owned clean
  start/stop/restart path
- it avoids leaving the canonical McpSandbox editor open when it is no longer
  needed for local verification
- it is the local path under which admitted-real `editor.session.open` and
  admitted-real `editor.level.open` were re-verified against `McpSandbox`

## Docker

The backend now has a Phase 5 baseline container image:

```bash
docker build -t o3de-codex-backend ./backend
docker run --rm -p 8000:8000 -e O3DE_CONTROL_PLANE_DB_PATH=/app/runtime/control_plane.sqlite3 -v "$(pwd)/runtime:/app/runtime" o3de-codex-backend
```

For the full stack, prefer the repo-root compose flow:

```bash
docker compose up --build
```

## Persistence configuration

The backend persists control-plane state in SQLite.

Recommended operator setup:
- Set `O3DE_CONTROL_PLANE_DB_PATH` to a known-good writable `.sqlite3` file path whenever you already know a safe location.
- If you prefer to provide a writable directory instead of a full file path, set `O3DE_CONTROL_PLANE_DB_FALLBACK_DIR`. The backend will place `control_plane.sqlite3` there and try that operator path before the repo-local `.runtime` fallback.
- Set `O3DE_CONTROL_PLANE_DB_STRATEGY=operator` when you want the operator fallback directory to be preferred ahead of LOCALAPPDATA.

Examples:

```powershell
$env:O3DE_CONTROL_PLANE_DB_PATH="$env:LOCALAPPDATA\Temp\O3DE_CODEX_VX001\control-plane\control_plane.sqlite3"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```powershell
$env:O3DE_CONTROL_PLANE_DB_FALLBACK_DIR="$env:LOCALAPPDATA\Temp\O3DE_CODEX_VX001\operator-fallback"
$env:O3DE_CONTROL_PLANE_DB_STRATEGY="operator"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

`GET /ready` reports:
- the requested database strategy
- the active database strategy and path actually in use
- attempted database paths
- whether persistence is actually ready
- warning or error text when a preferred target failed
- schema-validation capability and limits for the currently implemented subset validator

If `/ready` reports `persistence_ready=false`, the backend is not claiming healthy writable persistence.

For the local compose baseline, the backend uses:
- `O3DE_CONTROL_PLANE_DB_PATH=/app/runtime/control_plane.sqlite3`
- a mounted repo-root `./runtime` directory

## Adapter mode baseline

The backend now routes tool execution through an explicit adapter boundary.

Current mode support:
- `O3DE_ADAPTER_MODE=simulated`
- `O3DE_ADAPTER_MODE=hybrid`

Current truth:
- adapter selection is config-driven
- simulated remains the default path for all tools
- `hybrid` now enables a first real read-only `project.inspect` manifest path when `project_root/project.json` exists and can be read cleanly
- that real `project.inspect` path can now also persist manifest-backed Gem and top-level settings inspection evidence when those flags are requested
- that same real `project.inspect` path can now also persist a file-read-only manifest-backed project-config snapshot and inspected-key evidence when explicitly requested
- that same real `project.inspect` path can now also distinguish requested Gem evidence from actually discovered Gem entries while staying on the same manifest-backed source of truth
- when `include_build_state=true`, that same real `project.inspect` path now persists explicit "requested but still simulated" build-state evidence so operators can see that build-state inspection was asked for without implying a real adapter path
- that same real `project.inspect` path now also persists explicit manifest provenance showing the read stayed on `project_root/project.json`, remained read-only, and stayed workspace-local to the declared project root
- when the real `project.inspect` manifest path is unavailable, the simulated fallback now also persists explicit fallback provenance for the declared project root, expected manifest path, and unavailability category such as missing versus unreadable manifest
- `hybrid` also enables a real `build.configure` plan-only preflight path when `dry_run=true` and the same project-manifest preconditions are satisfied
- that same real `build.configure` preflight path now also persists explicit manifest/root provenance and plan-only execution labeling so operators can see the preflight stayed read-only and manifest-adjacent
- when the real `build.configure` preflight path is unavailable, the simulated fallback now also persists explicit fallback provenance including dry-run-required versus manifest-unavailable categories
- the real `settings.patch` preflight and admitted mutation paths now also persist explicit manifest/root provenance so operators can distinguish manifest-adjacent execution evidence from simulated fallback
- when the real `settings.patch` path is unavailable or the requested mutation leaves the admitted manifest-backed boundary, the simulated fallback now also persists explicit fallback categories and expected-manifest provenance
- `hybrid` also admits a real `editor.session.open` runtime path on
  `McpSandbox` when the target wiring resolves to the verified local editor
  runner and the live bridge heartbeat is observable
- `hybrid` also admits a real `editor.level.open` runtime path on
  `McpSandbox` under that same verified local bridge/runtime boundary
- those admitted-real editor paths were re-verified on the canonical local
  backend bound to `127.0.0.1:8000`
- `editor.entity.create` remains out of the admitted-real set on the current
  tested local targets and must continue to be reported as excluded rather than
  implied-real
- actual configure mutation still remains simulated in this phase
- every other tool still remains simulated in this phase
- broad real O3DE adapters are still not implemented

`GET /ready` now reports adapter-mode readiness, configured mode, active mode, supported modes, adapter contract version, execution-boundary text, and registered adapter families.

`GET /version` also reports the current adapter contract version so operators can track contract changes separately from the backend API version.

`GET /adapters` provides a read-only adapter registry summary with configured mode, active mode, supported modes, contract version, warning state, and registered adapter families.

Persisted execution records and artifact metadata now also carry adapter provenance fields such as `adapter_family` and `adapter_contract_version` so run history keeps the current simulated adapter boundary explicit.
For the first real `project.inspect` path, persisted execution details and artifact metadata also carry manifest-inspection provenance so operators can distinguish real read-only inspection from simulated fallback.
That same real `project.inspect` path now records manifest-backed `gem_names` and top-level settings evidence when `include_gems` or `include_settings` is requested, while still keeping deeper settings/Gem mutation work out of scope.
That same path now also records `requested_gem_evidence` and `gem_entries_present` so operators can distinguish requested Gem-state inspection from actually discovered manifest-backed Gem entries.
That same path can also record manifest-backed `project_config`, `project_config_keys`, and `requested_project_config_keys` evidence when `include_project_config` is requested, while still staying on `project_root/project.json` as the only real source of truth.
For the real `build.configure` preflight path, persisted execution details and artifact metadata also carry plan-only preflight provenance so operators can distinguish real preflight evidence from simulated fallback.

## Schema validation status

The backend currently uses a subset validator for published per-tool arg and simulated-result schemas.

What it does support for the currently published schema set:
- request-arg validation at dispatch time
- simulated result-shape conformance checks before a simulated dispatch is reported successful
- relative local `$ref` resolution
- a limited keyword set used by the current schemas, including `type`, `required`, `properties`, `additionalProperties`, `enum`, `const`, `minLength`, `minItems`, `minProperties`, `minimum`, `maximum`, `items`, and `allOf`
- readiness metadata reports the active keyword subset derived from the published tool arg/result schemas
- readiness metadata also reports whether any currently published tool schemas use unsupported keywords; for the current accepted schema set that list should stay empty

What it does not claim:
- full JSON Schema support
- the validator does not claim full JSON Schema support
- broad support for keywords such as `anyOf`, `oneOf`, `not`, `pattern`, `format`, `exclusiveMinimum`, `exclusiveMaximum`, `uniqueItems`, `patternProperties`, or `dependentRequired`
- validation of real O3DE adapter outputs

Simulated execution remains explicitly labeled as simulated even when result-shape conformance checks pass.

## Useful endpoints

- `GET /` — backend root status
- `GET /health` — backend health
- `GET /adapters` — adapter registry summary
- `POST /tools/dispatch` — structured tool dispatch stub
