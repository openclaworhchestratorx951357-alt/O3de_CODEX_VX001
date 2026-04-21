# frontend

React and Vite frontend for the O3DE Agent Control app.

## Requirements

- Node.js 20+
- npm

## Install

1. Change into the frontend directory.
2. Run npm install.

## Run

1. Change into the frontend directory.
2. Run npm run dev.

For the repo-root Windows helper that keeps the dev server in the current shell and pins the canonical local API base, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 frontend-dev
```

Default local URL:

- [http://127.0.0.1:4173](http://127.0.0.1:4173)

Default backend API base used by the helper:

- [http://127.0.0.1:8000](http://127.0.0.1:8000)

Optional overrides:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 frontend-dev -FrontendHost 127.0.0.1 -FrontendPort 4174 -ApiBaseUrl http://127.0.0.1:8000
```

For a repo-native startup smoke check that launches the same helper, verifies the local URL responds, and then stops automatically, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 frontend-smoke
```

## Build

1. Change into the frontend directory.
2. Run npm run build.

## Lint

1. Change into the frontend directory.
2. Run npm run lint.

## Docker

The frontend now has a Phase 5 baseline container image:

```bash
docker build --build-arg VITE_API_BASE_URL=http://localhost:8000 -t o3de-codex-frontend ./frontend
docker run --rm -p 5173:80 o3de-codex-frontend
```

For the full stack, prefer the repo-root compose flow:

```bash
docker compose up --build
```

## Environment

The frontend uses `VITE_API_BASE_URL` to decide which backend to call.

Example:

- `VITE_API_BASE_URL=http://localhost:8000`

If the variable is not set, the frontend defaults to `http://localhost:8000`.

For the local compose baseline, the frontend is built with:
- `VITE_API_BASE_URL=http://localhost:8000`

## Current UI

- agent control panels
- approval queue
- layout header
- task timeline
- tools catalog
- dispatch form and response viewer

## Settings Profiles

The frontend now keeps user-owned shell preferences in a versioned local profile stored under:

- `o3de_codex_vx001_settings_profile_v1`

Saved profile shape:

```json
{
  "version": 1,
  "updatedAt": "2026-04-21T12:00:00.000Z",
  "settings": {
    "appearance": {
      "themeMode": "system",
      "accentColor": "#2f6fed",
      "density": "comfortable",
      "contentMaxWidth": "wide",
      "cardRadius": "rounded",
      "reducedMotion": false,
      "fontScale": 1
    },
    "layout": {
      "preferredLandingSection": "home",
      "showDesktopTelemetry": true
    },
    "operatorDefaults": {
      "projectRoot": "",
      "engineRoot": "",
      "dryRun": true,
      "timeoutSeconds": 30,
      "locks": ["project_config"]
    }
  }
}
```

Persisted settings intentionally exclude transient backend state such as fetched catalog responses,
dispatch results, logs, artifacts, and other server-derived runtime payloads.
