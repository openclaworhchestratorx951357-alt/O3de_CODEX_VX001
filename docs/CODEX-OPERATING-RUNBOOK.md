# Codex Operating Runbook

## Purpose

This runbook defines the practical operating system for building
`O3de_CODEX_VX001` with Codex.

Use it to answer:
- how new slices get assigned
- when to stay on the active branch vs use a new branch or worktree
- which verification gates must pass before a slice is done
- which project truths must stay explicitly labeled
- when to use review, CI, or app automations

This runbook complements:
- `README.md`
- `docs/WORKFLOW-CODEX-CHATGPT.md`
- `docs/SLICE-START-CHECKLIST.md`
- `docs/LOCAL-STACK-RUNBOOK.md`
- `docs/WORKTREE-STRATEGY.md`

## Standing truths that must not drift

These are active constraints for this repository:
- simulated execution must remain explicitly labeled as simulated
- real O3DE adapters must not be implied unless they are truly implemented and
  verified
- `project.inspect` remains the narrow real read-only hybrid surface already
  admitted in the current phase docs
- `build.configure` remains a real plan-only preflight path rather than a real
  mutation path
- `settings.patch` is tightly bounded to the admitted hybrid preflight plus the
  first manifest-backed set-only mutation case
- broader mutation surfaces remain gated rather than broadly real
- operator-configured persistence remains the truthful baseline for local
  non-container runs unless non-container defaults are re-verified
- containerized compose readiness may be reported healthy only for the verified
  compose path

If any new code, UI copy, docs, or automation summary blurs those boundaries,
that slice is not done.

## Slice assignment model

Each slice should have exactly one primary intent.

Good slice categories:
- backend contract or persistence work
- frontend operator visibility work
- adapter-boundary work
- local tooling or CI hardening
- documentation and truth-alignment work

Each slice prompt should include:
- the exact outcome to implement
- the verification target
- whether the work is expected to stay simulated, hybrid, or fully real
- whether the slice is allowed to change docs, tests, UI wording, or contracts

Good slice prompt shape:

```text
Implement <single outcome>. Keep current Phase 7 truth boundaries intact.
Verify with <exact commands>. If you touch wording, align backend, frontend,
tests, and docs in the same slice.
```

## Start-of-slice gate

Before each slice:
1. verify repo path and `origin`
2. print the active branch
3. inspect `git status --short`
4. run `git fetch origin --prune`
5. if the worktree is clean, `git pull --ff-only origin <branch>`
6. classify any dirty state before editing

Required references:
- `docs/SLICE-START-CHECKLIST.md`
- `docs/WORKFLOW-CODEX-CHATGPT.md`

If another thread or workspace touched the repo:
- stop and audit `git status --short`
- inspect recent `git log --oneline --decorate`
- diff only the changed files
- classify the drift as:
  - landed upstream work
  - accepted local unpublished work
  - coherent parallel local slice
  - unexpected conflicting edits

Do not edit through ambiguity.

## Branch and worktree rules

Use the current integration branch when:
- the slice is small
- the worktree is clean
- no other risky lane is active
- the slice logically extends the current accepted branch

Create a new branch when:
- the change is coherent but independent
- you expect multiple commits
- you may want a PR or review checkpoint before merge

Use a dedicated worktree when:
- two substantial tracks may move in parallel
- a risky refactor could destabilize the active branch
- you want one lane for backend work and another for frontend or infra
- you want to compare alternative implementations without mixing diffs

See `docs/WORKTREE-STRATEGY.md` for the standard named lanes.

When a fresh worktree is created, bootstrap it before running repo tasks:

```powershell
pwsh -File .\scripts\dev.ps1 bootstrap-worktree
```

That task is the standard way to make a new worktree usable without manually
rebuilding every local dependency path.

If the worktree runner itself needs investigation, use:

```powershell
pwsh -File .\scripts\dev.ps1 runner-diagnostics
```

That diagnostic task is the standard way to compare backend and frontend launch
behavior before changing the task runner again.

## Verification matrix

Every slice must finish with the narrowest truthful verification that proves the
change.

### Backend slices

Minimum target:

```powershell
pwsh -File .\scripts\dev.ps1 backend-lint
```

If backend behavior changed:

```powershell
pwsh -File .\scripts\dev.ps1 backend-test
```

If `scripts/dev.ps1` has wrapper issues in the current shell, direct repo-local
Python execution is acceptable as a fallback as long as the exact command is
reported.

Current `codex/ci-devx` finding:
- backend task launches return clean exit codes in diagnostics
- the remaining runner issue is frontend build under scripted invocation, where
  `esbuild` can fail with Windows `spawn EPERM` in the worktree shell context
- current workaround: if `pwsh -File .\scripts\dev.ps1 frontend-build` reports
  that Windows child-process launch limit, run `npm run build` directly from the
  worktree `frontend/` directory and report that result explicitly

### Frontend slices

Minimum target:

```powershell
pwsh -File .\scripts\dev.ps1 frontend-lint
pwsh -File .\scripts\dev.ps1 frontend-build
```

### Cross-surface truth slices

When a slice changes operator wording, policy meaning, or execution claims,
verify all affected surfaces in one pass:
- backend contract text
- tests
- frontend wording
- checkpoint docs

### Docker or local stack slices

Minimum target:

```powershell
docker compose config
docker compose build
docker compose up -d
docker compose ps
Invoke-WebRequest http://localhost:8000/health
Invoke-WebRequest http://localhost:8000/ready
```

Only claim Docker success when those were actually run.

## Definition of done

A slice is done only when all of these are true:
- code, docs, and UI claims match each other
- verification was actually run and reported truthfully
- no broader real capability is implied than the code really provides
- unrelated local drift is not silently bundled
- commit scope matches one coherent intent
- the branch is either clean and pushed, or the remaining local state is
  explicitly explained

## When to use review

Request or perform review when:
- the slice changes execution truth boundaries
- persistence behavior changes
- approval, lock, or audit semantics change
- the operator shell could mislead users about simulated vs real execution
- a refactor spans backend, frontend, docs, and tests together

Review focus should prioritize:
- incorrect capability claims
- behavioral regressions
- missing verification
- stale tests or docs
- mixed-scope commits

## When to use CI

Use CI as the remote confirmation layer, not the only confirmation layer.

CI is especially important for:
- branch publication
- cross-platform or clean-environment validation
- Docker image builds
- lint or test baselines that may differ from the local shell

Do not skip local checks just because CI exists.

## When to use automations

Use app automations for recurring operational hygiene, not one-off coding.

Recommended standing automations:
- daily repo health
- merge-readiness sweep
- weekly architecture checkpoint

Automation outputs should:
- open an inbox item
- summarize what was checked
- call out blockers, drift, and the exact next action
- preserve the standing truth boundaries above

## Publish sequence

When a slice is ready:

```powershell
git status --short
git add -A
git commit -m "<intentional scope>"
git push origin <branch>
```

In the final summary for a slice, always report:
- repo path verified
- origin verified
- branch
- files changed
- commands run
- results
- implemented
- still stubbed / unverified
- next recommended step

## Recovery guide

If the repo feels confused or multiple threads touched it:
- inspect `git status --short`
- inspect `git log --oneline --decorate -n 20`
- diff only the changed files
- identify whether each change is:
  - already pushed
  - local and intentional
  - local and conflicting
- reconcile one coherent slice at a time

Prefer converting coherent local drift into an intentional commit instead of
leaving it unstaged and ambiguous.
