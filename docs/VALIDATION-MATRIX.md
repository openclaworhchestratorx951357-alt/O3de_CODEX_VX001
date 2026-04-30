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

## App-wide Validation Workflow Quick Reference

Use this compact set when updating app-wide shell recommendation surfaces and
validation workflow guidance:

| Lane | Canonical command | Evidence owner checkpoint | Expected evidence boundary |
| --- | --- | --- | --- |
| backend targeted packet checks | `python -m pytest backend/tests/test_api_routes.py -k \"<targeted packet expression>\" -q` | `backend/tests/test_api_routes.py` and packet-scoped route/docs references | packet-specific backend boundary behavior is regression-checked; no live O3DE/runtime admission implied |
| prompt/control targeted checks | `python -m pytest backend/tests/test_prompt_control.py -k \"<targeted packet expression>\" -q` | `backend/tests/test_prompt_control.py` and planner/refusal packet notes | planner/refusal gate behavior is deterministic for the touched corridor; no execution admission implied |
| catalog/capability targeted checks | `python -m pytest backend/tests/test_catalog.py -k \"<targeted packet expression>\" -q` | `backend/tests/test_catalog.py` and capability/catalog packet notes | tool/capability visibility truth is regression-checked; no runtime execution admission implied |
| frontend shell/fixture checkpoint | `npm --prefix frontend run test -- src/components/AppCapabilityDashboardShell.test.tsx src/components/AppAuditReviewDashboardShell.test.tsx src/components/AppApprovalSessionDashboardShell.test.tsx src/components/AppEvidenceTimelineShell.test.tsx src/components/AppWorkspaceStatusChipsShell.test.tsx src/fixtures/settingsRollbackReleaseReadinessDecision.test.ts` | shell component tests + fixtures + packet timeline rows | app-wide shell recommendation surfaces and timeline/fixture linkage remain deterministic; no backend runtime admission implied |
| docs diff hygiene | `git diff --check` and `git diff --cached --check` | packet-touched docs and test surfaces | changed packet surfaces are whitespace-clean; does not prove runtime behavior |

Command-to-evidence ownership invariants:

- every canonical command above must map to at least one maintained test/doc
  surface that is named in packet evidence
- packet completion summaries must report exact command strings that were run
- command evidence must never be used to imply runtime-admission broadening

Held-lane reminder:

- `TIAF/preflight` and real CI/test execution remain long-hold non-admitting
  lanes.
- Broad shell/script execution remains blocked.
- Client approval/session fields remain intent-only and non-authorizing.

Held-lane boundary consistency checkpoints:

| Held lane | Canonical wording checkpoint | Expected consistency scope |
| --- | --- | --- |
| `TIAF/preflight` | `long-hold checkpointed (bounded harness + release-readiness hold/no-go + stream handoff posture; non-admitting)` | unlock matrix + app-wide shell recommendation surfaces + timeline summaries |
| `real CI/test execution` | `long-hold checkpointed (harness + release-readiness hold/no-go + stream handoff posture; non-admitting)` | unlock matrix + app-wide shell recommendation surfaces + timeline summaries |

Consistency invariant:

- held-lane wording for these two validation lanes must remain deterministic
  across recommendation surfaces unless a dedicated packet explicitly updates
  the canonical wording and associated evidence.

Held-lane operator-safe examples:

- `TIAF/preflight` example:
  `long-hold checkpointed (bounded harness + release-readiness hold/no-go +
  stream handoff posture; non-admitting); no runtime mutation broadening`
- `real CI/test execution` example:
  `long-hold checkpointed (harness + release-readiness hold/no-go + stream
  handoff posture; non-admitting); no execution admission broadening`

Example invariant:

- operator-facing examples must preserve canonical held-lane wording and must
  not imply admission broadening, runtime execution broadening, or
  authorization broadening.

Held-lane wording-audit checkpoint:

- canonical held-lane wording for `TIAF/preflight` and real CI/test execution
  is now explicitly audited for parity across unlock-matrix rows, app-wide
  shell recommendation surfaces, and validation timeline summaries.
- wording-audit evidence must preserve explicit non-admitting and
  no-runtime-mutation posture for held lanes.

Wording-audit invariant:

- any wording change to canonical held-lane checkpoints requires a dedicated
  packet that updates this matrix, recommendation surfaces, timeline evidence,
  and linked fixture tests in one bounded change set.

Held-lane review-status parity checkpoints:

| Held lane checkpoint evidence | Canonical review-status token pattern | Expected consistency scope |
| --- | --- | --- |
| `tiaf preflight long-hold checkpoint packet` | `hold-tiaf-preflight-...` | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `ci admission long-hold checkpoint packet` | `hold-ci-admission-...` | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `validation workflow hold-boundary checkpoint packets` | `pass-validation-workflow-hold-boundary-...` | timeline summaries + app-wide shell recommendation surfaces + fixture tests |

Review-status parity invariant:

- held-lane review-status tokens must remain deterministic and aligned to the
  canonical token patterns above unless a dedicated packet updates matrix
  wording, timeline evidence rows, recommendation surfaces, and linked fixture
  assertions together.

Held-lane taxonomy checkpoints:

| Held lane checkpoint evidence | Canonical truth label | Canonical review-status posture | Expected consistency scope |
| --- | --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | `plan-only` | `pass-validation-workflow-hold-boundary-...` | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | `proof-only` | `hold-tiaf-preflight-...` | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `ci admission long-hold checkpoint packet` | `proof-only` | `hold-ci-admission-...` | timeline summaries + app-wide shell recommendation surfaces + fixture tests |

Taxonomy invariant:

- held-lane truth labels, review-status token posture, and canonical boundary
  wording must remain aligned to the checkpoints above unless a dedicated
  packet updates matrix wording, timeline evidence rows, recommendation
  surfaces, and linked fixture assertions together.

Held-lane chronology checkpoints:

| Held lane checkpoint evidence | Canonical chronology posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | descending recorded-at ordering with newest checkpoint first | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | long-hold chronology remains after validation-workflow checkpoint chain | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | long-hold chronology remains after validation-workflow checkpoint chain | timeline summaries + fixture tests |

Chronology invariant:

- held-lane timeline ordering and lane progression must remain deterministic
  (newest-first validation workflow checkpoint chain, followed by preserved
  long-hold lane checkpoints) unless a dedicated packet updates matrix wording,
  timeline evidence rows, recommendation surfaces, and linked fixture
  assertions together.

Held-lane progression integrity checkpoints:

| Held lane checkpoint evidence | Canonical progression posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | newest-first progression chain with monotonic packet sequencing and pass-status continuity | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane progression remains in hold posture after validation workflow progression chain | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane progression remains in hold posture after validation workflow progression chain | timeline summaries + fixture tests |

Progression-integrity invariant:

- held-lane progression must remain deterministic (newest-first validation
  workflow checkpoint sequence with continuous pass-status progression and
  preserved downstream hold-lane posture) unless a dedicated packet updates
  matrix wording, timeline evidence rows, recommendation surfaces, and linked
  fixture assertions together.

Held-lane stability checkpoints:

| Held lane checkpoint evidence | Canonical stability posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | ordering, truth labels, review-status posture, and boundary wording remain deterministic under incremental stream updates | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through validation workflow checkpoint updates | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through validation workflow checkpoint updates | timeline summaries + fixture tests |

Stability invariant:

- held-lane stability must remain deterministic (ordering, truth labels,
  review-status posture, and boundary wording) across recommendation surfaces
  and timeline summaries while preserving downstream `TIAF/preflight` and real
  CI/test long-hold posture, unless a dedicated packet updates matrix wording,
  timeline evidence rows, recommendation surfaces, and linked fixture
  assertions together.

Held-lane resilience checkpoints:

| Held lane checkpoint evidence | Canonical resilience posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic stability posture remains intact through recommendation rollovers and incremental stream churn | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through resilience checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through resilience checkpoint rollovers | timeline summaries + fixture tests |

Resilience invariant:

- held-lane resilience must remain deterministic (stability posture preserved
  through recommendation rollovers and stream churn) across recommendation
  surfaces and timeline summaries while preserving downstream
  `TIAF/preflight` and real CI/test long-hold posture, unless a dedicated
  packet updates matrix wording, timeline evidence rows, recommendation
  surfaces, and linked fixture assertions together.

Held-lane continuity checkpoints:

| Held lane checkpoint evidence | Canonical continuity posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic resilience posture remains intact through subsequent packet additions and timeline growth | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through continuity checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through continuity checkpoint rollovers | timeline summaries + fixture tests |

Continuity invariant:

- held-lane continuity must remain deterministic (resilience posture preserved
  through subsequent packet additions and timeline growth) across
  recommendation surfaces and timeline summaries while preserving downstream
  `TIAF/preflight` and real CI/test long-hold posture, unless a dedicated
  packet updates matrix wording, timeline evidence rows, recommendation
  surfaces, and linked fixture assertions together.

Held-lane durability checkpoints:

| Held lane checkpoint evidence | Canonical durability posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic continuity posture remains intact through extended stream duration and repeated handoff cycles | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through durability checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through durability checkpoint rollovers | timeline summaries + fixture tests |

Durability invariant:

- held-lane durability must remain deterministic (continuity posture preserved
  through extended stream duration and repeated handoff cycles) across
  recommendation surfaces and timeline summaries while preserving downstream
  `TIAF/preflight` and real CI/test long-hold posture, unless a dedicated
  packet updates matrix wording, timeline evidence rows, recommendation
  surfaces, and linked fixture assertions together.

Held-lane endurance checkpoints:

| Held lane checkpoint evidence | Canonical endurance posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic durability posture remains intact under prolonged stream cadence and repeated supervisor handoffs | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through endurance checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through endurance checkpoint rollovers | timeline summaries + fixture tests |

Endurance invariant:

- held-lane endurance must remain deterministic (durability posture preserved
  under prolonged stream cadence and repeated supervisor handoffs) across
  recommendation surfaces and timeline summaries while preserving downstream
  `TIAF/preflight` and real CI/test long-hold posture, unless a dedicated
  packet updates matrix wording, timeline evidence rows, recommendation
  surfaces, and linked fixture assertions together.

Held-lane longevity checkpoints:

| Held lane checkpoint evidence | Canonical longevity posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic endurance posture remains intact through prolonged multi-packet operation and future thread handoffs | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through longevity checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through longevity checkpoint rollovers | timeline summaries + fixture tests |

Longevity invariant:

- held-lane longevity must remain deterministic (endurance posture preserved
  through prolonged multi-packet operation and future thread handoffs) across
  recommendation surfaces and timeline summaries while preserving downstream
  `TIAF/preflight` and real CI/test long-hold posture, unless a dedicated
  packet updates matrix wording, timeline evidence rows, recommendation
  surfaces, and linked fixture assertions together.

Held-lane sustainability checkpoints:

| Held lane checkpoint evidence | Canonical sustainability posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic longevity posture remains intact across extended packet churn and repeated supervisor transitions | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through sustainability checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through sustainability checkpoint rollovers | timeline summaries + fixture tests |

Sustainability invariant:

- held-lane sustainability must remain deterministic (longevity posture
  preserved across extended packet churn and repeated supervisor transitions)
  across recommendation surfaces and timeline summaries while preserving
  downstream `TIAF/preflight` and real CI/test long-hold posture, unless a
  dedicated packet updates matrix wording, timeline evidence rows,
  recommendation surfaces, and linked fixture assertions together.

Held-lane maintainability checkpoints:

| Held lane checkpoint evidence | Canonical maintainability posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic sustainability posture remains intact under continued stream extension and cross-thread maintenance updates | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through maintainability checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through maintainability checkpoint rollovers | timeline summaries + fixture tests |

Maintainability invariant:

- held-lane maintainability must remain deterministic (sustainability posture
  preserved under continued stream extension and cross-thread maintenance
  updates) across recommendation surfaces and timeline summaries while
  preserving downstream `TIAF/preflight` and real CI/test long-hold posture,
  unless a dedicated packet updates matrix wording, timeline evidence rows,
  recommendation surfaces, and linked fixture assertions together.

Held-lane adaptability checkpoints:

| Held lane checkpoint evidence | Canonical adaptability posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic maintainability posture remains intact under future recommendation-surface evolution | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through adaptability checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through adaptability checkpoint rollovers | timeline summaries + fixture tests |

Adaptability invariant:

- held-lane adaptability must remain deterministic (maintainability posture
  preserved under future recommendation-surface evolution) across
  recommendation surfaces and timeline summaries while preserving downstream
  `TIAF/preflight` and real CI/test long-hold posture, unless a dedicated
  packet updates matrix wording, timeline evidence rows, recommendation
  surfaces, and linked fixture assertions together.

Held-lane operability checkpoints:

| Held lane checkpoint evidence | Canonical operability posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic adaptability posture remains intact under extended operator-facing usage and handoff cadence | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through operability checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through operability checkpoint rollovers | timeline summaries + fixture tests |

Operability invariant:

- held-lane operability must remain deterministic (adaptability posture
  preserved under extended operator-facing usage and handoff cadence) across
  recommendation surfaces and timeline summaries while preserving downstream
  `TIAF/preflight` and real CI/test long-hold posture, unless a dedicated
  packet updates matrix wording, timeline evidence rows, recommendation
  surfaces, and linked fixture assertions together.

Held-lane auditability checkpoints:

| Held lane checkpoint evidence | Canonical auditability posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic operability posture remains intact under prolonged evidence review and operator handoff trails | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through auditability checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through auditability checkpoint rollovers | timeline summaries + fixture tests |

Auditability invariant:

- held-lane auditability must remain deterministic (operability posture
  preserved under prolonged evidence review and operator handoff trails) across
  recommendation surfaces and timeline summaries while preserving downstream
  `TIAF/preflight` and real CI/test long-hold posture, unless a dedicated
  packet updates matrix wording, timeline evidence rows, recommendation
  surfaces, and linked fixture assertions together.

Held-lane traceability checkpoints:

| Held lane checkpoint evidence | Canonical traceability posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic auditability posture remains intact under cross-surface evidence lineage and recommendation provenance checks | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through traceability checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through traceability checkpoint rollovers | timeline summaries + fixture tests |

Traceability invariant:

- held-lane traceability must remain deterministic (auditability posture
  preserved under cross-surface evidence lineage and recommendation provenance
  checks) across recommendation surfaces and timeline summaries while
  preserving downstream `TIAF/preflight` and real CI/test long-hold posture,
  unless a dedicated packet updates matrix wording, timeline evidence rows,
  recommendation surfaces, and linked fixture assertions together.

Held-lane provenance checkpoints:

| Held lane checkpoint evidence | Canonical provenance posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic traceability posture remains intact under explicit evidence-source ownership and packet-chain provenance wording checks | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through provenance checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through provenance checkpoint rollovers | timeline summaries + fixture tests |

Provenance invariant:

- held-lane provenance must remain deterministic (traceability posture
  preserved under explicit evidence-source ownership and packet-chain
  provenance wording checks) across recommendation surfaces and timeline
  summaries while preserving downstream `TIAF/preflight` and real CI/test
  long-hold posture, unless a dedicated packet updates matrix wording,
  timeline evidence rows, recommendation surfaces, and linked fixture
  assertions together.

Held-lane accountability checkpoints:

| Held lane checkpoint evidence | Canonical accountability posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic provenance posture remains intact under explicit boundary-ownership language and refusal-accountability linkage | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through accountability checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through accountability checkpoint rollovers | timeline summaries + fixture tests |

Accountability invariant:

- held-lane accountability must remain deterministic (provenance posture
  preserved under explicit boundary-ownership language and
  refusal-accountability linkage) across recommendation surfaces and timeline
  summaries while preserving downstream `TIAF/preflight` and real CI/test
  long-hold posture, unless a dedicated packet updates matrix wording,
  timeline evidence rows, recommendation surfaces, and linked fixture
  assertions together.

Held-lane self-management checkpoints:

| Held lane checkpoint evidence | Canonical self-management posture | Expected consistency scope |
| --- | --- | --- |
| `validation workflow hold-boundary checkpoint packets` | deterministic self-command posture remains intact under explicit held-lane release-readiness decision wording and boundary-preservation self-management proof linkage | timeline summaries + app-wide shell recommendation surfaces + fixture tests |
| `tiaf preflight long-hold checkpoint packet` | held-lane non-admitting/no-runtime-mutation posture remains explicit and unchanged through self-management checkpoint rollovers | timeline summaries + fixture tests |
| `ci admission long-hold checkpoint packet` | held-lane non-admitting execution posture remains explicit and unchanged through self-management checkpoint rollovers | timeline summaries + fixture tests |

Self-management invariant:

- held-lane self-management must remain deterministic (self-command posture
  preserved under explicit held-lane release-readiness decision wording and
  boundary-preservation self-management proof linkage) across recommendation
  surfaces and timeline summaries while preserving downstream `TIAF/preflight`
  and real CI/test long-hold posture, unless a dedicated packet updates matrix
  wording, timeline evidence rows, recommendation surfaces, and linked fixture
  assertions together.

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
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-scalar-target-discovery-proof
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-scalar-write-proof
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
