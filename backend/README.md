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
- `POST /tools/dispatch` — structured tool dispatch stub
