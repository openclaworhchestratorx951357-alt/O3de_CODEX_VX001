# Validation Matrix

Status: repository validation guide

Purpose: help future agents choose the narrowest truthful validation for each
slice without overstating what a command proves.

This document does not change CI behavior or runtime capability.

## General Rules

- Run validation that matches the files and behavior touched.
- Prefer targeted tests before broad suites when working inside an active slice.
- Report exact commands and results in the PR body.
- Treat environment-only blockers truthfully instead of pretending validation
  passed.
- Do not run live O3DE/editor proofs for docs-only work.
- Do not claim live runtime proof from unit tests or static checks.

## Docs And Repo Hygiene

| Change type | Recommended validation | Proves | Does not prove |
| --- | --- | --- | --- |
| docs-only changes | `git diff --check` | no whitespace errors in unstaged diff | content accuracy |
| staged docs-only changes | `git diff --cached --check` | no whitespace errors in staged diff | link correctness or runtime behavior |
| docs index/navigation | repo-specific link existence check when practical | linked local files exist | linked docs are current |
| PR/issue templates | `git diff --check`, `git diff --cached --check` | template files are staged cleanly | GitHub UI rendering or label existence |

Useful docs-index check:

```powershell
$content = Get-Content docs\README.md -Raw
$paths = [regex]::Matches($content, '`([^`]+\.(md|yml))`') |
  ForEach-Object { $_.Groups[1].Value } |
  Where-Object { $_ -notlike 'http*' }
$missing = @()
foreach ($path in $paths) {
  if (-not (Test-Path $path)) { $missing += $path }
}
if ($missing.Count -gt 0) { $missing; exit 1 }
```

## Backend

| Change type | Recommended validation | Proves | Does not prove |
| --- | --- | --- | --- |
| backend lint-sensitive change | `backend\.venv\Scripts\python.exe -m ruff check <files>` | selected files pass Ruff | behavior correctness |
| backend unit behavior | `cd backend; .\.venv\Scripts\python.exe -m pytest <tests> -q` | targeted tests pass locally | live O3DE/editor behavior |
| broad backend confidence | `cd backend; .\.venv\Scripts\python.exe -m pytest -q` | local backend test suite passes | frontend, Docker, or live editor behavior |
| CI backend parity | `cd backend; python -m ruff check app tests; python -m pytest` | approximates GitHub `backend-tests` job after dependencies are installed | Windows/live-editor behavior |

Repo wrapper:

```powershell
pwsh -File .\scripts\dev.ps1 backend-lint
pwsh -File .\scripts\dev.ps1 backend-test
```

If a local `.venv` is stale, report the exact blocker. Do not hide missing
packages by relying on untracked local state as repository truth.

## Frontend

| Change type | Recommended validation | Proves | Does not prove |
| --- | --- | --- | --- |
| frontend lint/copy/UI change | `cd frontend; npm run lint` | lint passes | production bundle builds |
| frontend test-covered behavior | `cd frontend; npm test -- --run` | targeted frontend tests pass | backend/API/live behavior |
| frontend build confidence | `cd frontend; npm run build` | Vite production build succeeds | deployed runtime behavior |
| CI frontend parity | `cd frontend; npm ci; npm run lint; npm run build` | approximates GitHub `frontend-build` job | backend or Docker behavior |

Repo wrappers:

```powershell
pwsh -File .\scripts\dev.ps1 frontend-lint
pwsh -File .\scripts\dev.ps1 frontend-build
```

If the wrapper hits a Windows child-process launch issue, run the direct
frontend command and report both the wrapper failure and direct result.

## Surface Matrix

| Change type | Recommended validation | Proves | Does not prove |
| --- | --- | --- | --- |
| `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md` update | `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 surface-matrix-check` | matrix still contains required admitted-surface vocabulary | runtime behavior |
| capability wording docs | surface matrix check plus targeted tests when behavior files changed | docs do not drift below known admitted truth | new capability admission |

The surface matrix check is intentionally lightweight. It is a drift guard, not
a complete proof suite.

## Docker And CI Baseline

| Change type | Recommended validation | Proves | Does not prove |
| --- | --- | --- | --- |
| compose file change | `docker compose config` | compose file renders | images build |
| Dockerfile or dependency packaging change | `docker compose build backend frontend` | container images build locally | app behavior after startup |
| CI workflow parity | inspect `.github/workflows/ci.yml` and run the matching local commands where possible | local reproduction of declared CI steps | GitHub-hosted runner parity |

Current GitHub Actions jobs:

- `backend-tests`: installs `backend/requirements.txt`, runs
  `python -m ruff check app tests`, then `python -m pytest`.
- `frontend-build`: runs `npm ci`, `npm run lint`, then `npm run build` in
  `frontend/`.
- `stack-baseline`: runs `docker compose config` and
  `docker compose build backend frontend`.

## Live Backend And Editor Proofs

Live proofs are not routine validation. Use them only for slices that change or
need to verify live backend/editor behavior.

Readiness commands:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-status
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-bridge-start
```

Proof commands:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-proof
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-entity-exists-proof
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-component-find-proof
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-property-target-readback-proof
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-property-list-proof
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-comment-scalar-target-proof
```

Live proofs can prove only their bounded admitted or proof-only corridor. They
do not prove arbitrary Editor Python, arbitrary property writes, broad asset or
render behavior, live Editor undo, viewport reload, or rollback unless that
specific proof implements and verifies it.

Runtime proof JSON artifacts should remain ignored and uncommitted.

## PR Validation Reporting

Every PR should list:

- exact commands run
- pass/fail result
- any environment-only blocker
- whether a live proof was run
- whether runtime capability changed
- whether `.venv`, proof JSON, logs, caches, local DBs, build outputs, and
  secrets stayed out of the commit

When in doubt, validate less broadly but more truthfully. A small exact proof is
better than a broad command whose meaning is unclear.
