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
- `hybrid` also enables a real `build.configure` plan-only preflight path when `dry_run=true` and the same project-manifest preconditions are satisfied
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
