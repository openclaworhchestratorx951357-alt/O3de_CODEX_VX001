# Repository Operations

Purpose: define the low-friction Codex admin workflow for
`openclaworhchestratorx951357-alt/O3de_CODEX_VX001`.

This document is repo hygiene guidance only. It does not broaden runtime
capabilities.

## Operating Model

The repository is early and should preserve velocity.

Default governance:

- Prefer PRs, but do not require human review for every low-risk change.
- Codex may self-merge low-risk PRs after validation.
- Codex may self-merge narrow medium-risk PRs only with strong targeted
  validation.
- Human approval is required for high-risk changes.
- Keep branch protection light unless the operator explicitly asks for stricter
  controls.

Force-pushing and deleting `main` are forbidden operating actions, regardless of
GitHub settings.

## Standard Slice Workflow

For new threads, and especially when the operator says "use supervisor mode",
start with `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md`. That protocol
is the repo-local source of truth for activating Supervisor Mode, verifying repo
state, checking local dependencies, and reporting readiness before edits.

Then apply `docs/CODEX-WORKFLOW-GOVERNOR.md` before creating a branch or PR. A
PR must move a meaningful capability, proof, admission, operator UX, blocker,
validation, or governance outcome forward. Do not create standalone status SHA
refreshes, trivial docs echoes, or refusal-only checkpoint PRs unless the
operator explicitly requests that exact packet.

When working on O3DE-specific capabilities, inspect read-only evidence stores
before claiming blockers. Use `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md` to check
O3DE caches, databases, catalogs, generated outputs, registries, build outputs,
project files, and proof artifacts while preserving no-mutation rules. Missing
prompt/catalog/adapter admission alone is not a valid blocker.

Use this flow for most repo work:

```powershell
git fetch origin --prune
git checkout main
git pull --ff-only origin main
git status --short
git checkout -b codex/<area>-<short-description>
```

Then:

1. Make the narrow change.
2. Run validation appropriate to the change.
3. Confirm the workflow-governor value and bundle incidental docs/status/index
   updates into the same PR.
4. Stage only intentional files.
5. Run `git diff --cached --check`.
6. Commit.
7. Push.
8. Open a PR.
9. Self-merge only if the self-merge rule below allows it.
10. Pull updated `main` after merge.

Cross-thread review rule:

- When more than one implementation thread is active, each thread must keep an
  open PR (draft allowed) for its branch until merge.
- Do not keep thread-only local commits without a PR once work is reviewable.
- Use the PR body as the cross-thread handoff log (scope, validation, blockers,
  and compatibility notes).
- Before opening, updating, or merging a PR in a multi-thread window, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 pr-open-list
```

  and capture relevant head/base chain dependencies in the PR body.

Never stage `.venv/`, runtime proof JSON, logs, caches, build outputs, local
databases, or secrets.

## Project-Local Dependency Bootstrap

Missing local dependencies are a setup issue, not automatic permission to add
or upgrade dependencies.

Allowed bootstrap scope, subject to active agent confirmation rules:

- create or sync `backend/.venv` from `backend/requirements.txt` when backend
  validation requires it
- install frontend dependencies into local `frontend/node_modules` from
  `frontend/package-lock.json`
- run `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 bootstrap-worktree`
  for secondary worktrees

Forbidden without explicit operator approval:

- global `npm install -g`
- global `pip install`
- `sudo`, `apt`, `choco`, `winget`, `brew`, or system package installation
- dependency version changes
- lockfile rewrites
- package upgrades

If a package is missing, inspect the import site and repo-owned dependency
files before editing dependencies. If the package is already declared, report
the local environment as stale and sync the project-local environment.

If current agent policy requires action-time confirmation before installing
packages, obtain that confirmation before running the install command.

## Post-Admission Review Packet

After any high-risk runtime/capability admission is merged, make the next slice
a bounded post-admission review/status packet before widening the capability
again.

That packet should:

- improve operator-facing result/review wording
- update status or matrix docs if mainline truth changed
- add tests for the review/status output when code is touched
- confirm the old refusal boundaries still hold
- avoid admitting new tools, targets, adapters, or mutation surfaces

This gives the operator a clearer handoff and keeps capability expansion from
running ahead of reviewability.

## Risk Classes

Low-risk changes Codex may self-merge after validation:

- docs
- README
- CONTRIBUTING
- AGENTS instructions
- GitHub issue templates
- PR templates
- docs indexes
- phase history reconstruction
- validation matrices
- repo operation guides
- comments, typos, and documentation formatting
- non-behavioral cleanup

Low-risk does not automatically mean worth a PR. The packet must still pass
`docs/CODEX-WORKFLOW-GOVERNOR.md`.

Medium-risk changes Codex may self-merge only with strong validation:

- backend tests only
- frontend UI copy only
- test harness improvements
- CI workflow clarification
- `scripts/dev.ps1` additions that do not alter existing behavior
- documentation plus tests for already-existing behavior
- small bug fixes with targeted tests

High-risk changes require human approval:

- security settings
- secrets or credentials
- deletion of files with uncertain purpose
- deletion of uncertain or unmerged branches
- CI requirements that could block all future work
- GitHub branch protection settings
- dependency versions
- database schemas
- production or runtime behavior
- broad O3DE editor mutation
- arbitrary command execution
- arbitrary Python execution
- asset, material, render, or build mutation
- real build/test execution as a default prompt action
- rollback, undo, or reversibility claims
- force-pushes, history rewrites, releases, tags, or visibility changes

## Self-Merge Rule

Codex may merge its own PR only when all are true:

- risk is low, or medium with strong targeted tests
- validation passed, or any failure is documented as environment-only and not
  caused by the change
- runtime capability was not broadened unexpectedly
- no secrets or local artifacts were committed
- no unresolved uncertainty affects the change
- the PR body states the revert path
- the change is not on the high-risk list

If any condition is false, leave the PR open and report the blocker.

## Validation Expectations

For docs-only changes:

```powershell
git diff --check
git diff --cached --check
```

For matrix or surface docs:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 surface-matrix-check
```

For backend changes:

```powershell
backend\.venv\Scripts\python.exe -m ruff check <touched files>
cd backend
.\.venv\Scripts\python.exe -m pytest <targeted tests> -q
cd ..
```

For frontend changes:

```powershell
cd frontend
npm test -- --run
npm run build
cd ..
```

Use the narrowest truthful validation that proves the change.

## PR Body Contract

Every PR should include:

```markdown
## Summary

## Scope

## Validation

## Risk level

## Self-merge decision

## Boundaries

## Workflow-governor value

## Blocked-status / evidence-substrate check

## Revert path
```

## Branch Protection Guidance

Do not make strict branch protection a default requirement right now.

Recommended current settings:

- allow squash merge: yes
- allow merge commits: yes if operator wants PR context
- allow rebase merge: optional
- automatically delete head branches: yes if comfortable; see
  `docs/GITHUB-BRANCH-HYGIENE-SETTINGS-RECOMMENDATION.md`
- allow auto-merge: optional
- require PR reviews: no
- require conversation resolution: no
- require signed commits: no
- require linear history: no
- require merge queue: no

Optional light safety later:

- require status checks only after CI is stable
- block force pushes to `main`
- block deletion of `main`

## Non-Negotiable Runtime Boundaries

Do not expose arbitrary shell, arbitrary Python, arbitrary Editor script
execution, or unrestricted file mutation as prompt surfaces.

Do not claim simulated, proof-only, or plan-only behavior is real.

Do not call an operation reversible unless rollback, restore, or reverse behavior
is actually implemented and verified.
