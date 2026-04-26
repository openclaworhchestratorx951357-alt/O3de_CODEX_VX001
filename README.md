# O3de_CODEX_VX001

Agent control app for O3DE-focused orchestration, tooling, approvals, and
operator-driven workflows.

The repository is being developed as a truthful control-plane product: simulated
behavior stays labeled, real O3DE capabilities are admitted only through narrow
verified paths, and docs follow code/tests/runtime proof rather than replacing
them.

## Start Here

- `docs/CURRENT-STATUS.md` - latest mainline status and active capability
  boundaries.
- `docs/README.md` - documentation index.
- `docs/REPOSITORY-OPERATIONS.md` - Codex admin workflow, PR policy, and
  self-merge rules.
- `docs/BRANCH-AND-PR-HYGIENE.md` - branch, PR, cleanup, and revert hygiene.
- `docs/VALIDATION-MATRIX.md` - validation commands and proof boundaries.
- `docs/CODEX-EVERGREEN-EXECUTION-CHARTER.md` - stable execution charter and
  capability maturity model.
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md` - canonical admitted automation
  surface matrix.
- `AGENTS.md` - repo-wide agent working defaults.

## Repository Layout

- `frontend/` - operator GUI.
- `backend/` - orchestration API, jobs, approvals, locks, audit trail, runtime
  proof helpers, and admitted adapter boundaries.
- `contracts/` - human-readable tool contracts and policy docs.
- `schemas/` - machine-readable schemas for tools, requests, responses, and
  persisted records.
- `agents/` - agent definitions, capabilities, policies, and prompts.
- `docs/` - architecture notes, phase checkpoints, proof summaries, handoffs,
  and operating docs.
- `scripts/` - repo-owned local development and live-proof helper commands.

## Local Development

Common repo-root commands:

```powershell
pwsh -File .\scripts\dev.ps1 checks
pwsh -File .\scripts\dev.ps1 backend-lint
pwsh -File .\scripts\dev.ps1 backend-test
pwsh -File .\scripts\dev.ps1 frontend-lint
pwsh -File .\scripts\dev.ps1 frontend-build
pwsh -File .\scripts\dev.ps1 surface-matrix-check
```

Local compose startup:

```powershell
docker compose up --build
```

Default local ports:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`

See `docs/LOCAL-STACK-RUNBOOK.md` for container startup and canonical live
backend/editor lifecycle details.

## Operating Truth

Use this truth hierarchy when documents disagree:

1. Observed runtime behavior on the admitted path.
2. Targeted tests and proof harnesses.
3. Implementation code.
4. Surface matrix and phase checkpoints.
5. Roadmap text.

Do not expose arbitrary shell, arbitrary Python, arbitrary Editor script
execution, or unrestricted file mutation as prompt surfaces.

Do not claim a capability is real, reviewable, or reversible unless code, tests,
and runtime evidence prove that exact boundary.

## New Thread Handoff

Before starting a new slice:

```powershell
git fetch origin --prune
git checkout main
git pull --ff-only origin main
git status --short
```

Then read:

- `docs/CURRENT-STATUS.md`
- `docs/SLICE-START-CHECKLIST.md`
- `docs/REPOSITORY-OPERATIONS.md`
- the specific phase/proof docs for the slice you are about to touch

Keep local `.venv/`, runtime proof JSON, logs, caches, build outputs, local
databases, and secrets out of commits.
