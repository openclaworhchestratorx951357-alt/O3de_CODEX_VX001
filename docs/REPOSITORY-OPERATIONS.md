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
3. Stage only intentional files.
4. Run `git diff --cached --check`.
5. Commit.
6. Push.
7. Open a PR.
8. Self-merge only if the self-merge rule below allows it.
9. Pull updated `main` after merge.

Never stage `.venv/`, runtime proof JSON, logs, caches, build outputs, local
databases, or secrets.

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

## Revert path
```

## Branch Protection Guidance

Do not make strict branch protection a default requirement right now.

Recommended current settings:

- allow squash merge: yes
- allow merge commits: yes if operator wants PR context
- allow rebase merge: optional
- automatically delete head branches: yes if comfortable
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
