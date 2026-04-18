# O3de_CODEX_VX001

Agent control app for O3DE-focused orchestration, tooling, approvals, and operator-driven workflows.

## Initial repository structure

- `frontend/` — customizable operator GUI
- `backend/` — orchestration API, jobs, approvals, locks, audit trail
- `contracts/` — human-readable tool contracts and policy docs
- `schemas/` — machine-readable schemas for tools, requests, responses, and layouts
- `agents/` — agent definitions, capabilities, policies, and prompts
- `docs/` — architecture notes, plans, handoffs, and operating docs

## Development workflow

See these official source files before making changes:
- `docs/WORKFLOW-CODEX-CHATGPT.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`

## Phase 5 startup baseline

The repository now includes a first local stack baseline for Phase 5:
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `docker-compose.yml`
- `.env.example`
- `.github/workflows/ci.yml`
- `pyproject.toml`

## Phase 5 local task runner baseline

The repository now also includes a repo-root PowerShell helper for repeatable local checks:
- `scripts/dev.ps1`

Common examples:

```powershell
pwsh -File .\scripts\dev.ps1 checks
pwsh -File .\scripts\dev.ps1 backend-lint
pwsh -File .\scripts\dev.ps1 backend-test
pwsh -File .\scripts\dev.ps1 frontend-lint
pwsh -File .\scripts\dev.ps1 frontend-build
```

Notes:
- backend tasks use the repo-local `backend/.vendor_tools` install path and set `PYTHONPATH` automatically
- frontend tasks run from `frontend/`
- compose tasks are available, but still require Docker to be installed locally

Local container startup:

```bash
docker compose up --build
```

Default local ports:
- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`

Persistence note:
- the truthful local-run baseline is still an explicit writable SQLite path
- the compose baseline uses `/app/runtime/control_plane.sqlite3` inside the backend container and mounts `./runtime` from the repo root
- real O3DE adapters are still not implemented; execution remains explicitly simulated

## Notes

This repository is being initialized as the control-plane app for managing O3DE agents and workflows.
