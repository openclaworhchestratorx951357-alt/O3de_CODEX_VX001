# Codex Project Workflow Quick Reference

Status: repo-wide workflow reference for future threads

Date: 2026-04-26

Use this page at the start of every new Codex project thread, regardless of
phase. It captures the current low-friction build workflow: move quickly on
small verified packets, keep capability truth conservative, and avoid silent
runtime expansion.

## Use The Future Thread Startup Protocol

New Codex threads do not inherit prior chat context. If the operator says "use
supervisor mode", immediately read and follow
`docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md` before planning or editing.

Supervisor Mode requires Codex to:

- verify repo root, origin, branch, `HEAD`, `origin/main`, and worktree status
- organize explicit supervisor, repo-state, dependency-bootstrap, context,
  validation, risk/boundary, and implementation roles
- check project-local dependencies before validation
- bootstrap only repo-declared local dependencies when needed
- avoid global/system installs and dependency changes unless explicitly
  approved
- report startup readiness before editing
- continue into the normalized phase workflow

## Use The Normalized Phase Workflow

Future threads must start from `docs/NORMALIZED-PHASE-WORKFLOW.md` before
implementing a new phase or widening a capability. Phase 8 is the reference
example for how to promote a capability safely, but future phases must adapt
the pattern to their own domain and risk level.

## Start Every Slice From Truth

Before changing files:

1. Confirm the requested repo, branch, and baseline.
2. Run `git fetch origin --prune`.
3. Checkout the requested baseline, usually `main`.
4. Run `git pull --ff-only origin main` when starting from main.
5. Run `git status --short`.
6. Confirm `.venv/` remains untracked only when present.
7. Read the current status and relevant phase/surface docs before choosing the
   implementation path.

Primary truth sources:

- code, tests, and observed runtime behavior
- `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md`
- `docs/CURRENT-STATUS.md`
- `docs/NORMALIZED-PHASE-WORKFLOW.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`
- relevant phase checkpoint or proof docs
- `docs/PHASE-8-ADMITTED-SURFACES-QUICK-REFERENCE.md` for Phase 8
  component/property work

Docs are guidance, not stronger than runtime evidence. If docs drift from
code/tests/runtime, fix the docs in a narrow packet.

## Slice Shape

Use small branches and narrow PRs.

Default flow:

```text
git checkout main
git pull --ff-only origin main
git checkout -b codex/<area>-<short-description>
```

Then:

1. Make the smallest safe change.
2. Run validation appropriate to the touched area.
3. Stage only intended files.
4. Commit with a clear message.
5. Push the branch.
6. Open a PR with summary, scope, validation, risk, boundaries, and revert path.
7. Self-merge only when allowed by risk and validation.
8. Update local main after merge.
9. Delete only the just-merged branch when Git confirms it is merged and has no
   unique commits. Do not perform branch bulk deletion without an explicit
   cleanup packet.

## Risk Classes

Low risk:

- docs
- indexes
- examples
- repo hygiene reports
- comments/typos/formatting in documentation

Codex may self-merge low-risk work after validation and green CI.

Medium risk:

- tests only
- prompt/review wording with targeted tests
- harness improvements that do not admit new runtime capability
- narrow bug fixes with focused tests

Codex may self-merge only with strong validation and no unresolved uncertainty.

High risk:

- runtime behavior changes
- new or broadened capabilities
- dependency changes
- security or GitHub settings changes
- branch protection changes
- destructive cleanup
- arbitrary shell/Python/Editor execution
- asset/material/render/build/TIAF mutation
- rollback, undo, or restore claims

High-risk work requires explicit operator approval before implementation or
merge.

## Validation Ladder

Docs-only:

- `git diff --check`
- touched-docs link/path check
- `git diff --cached --check`
- GitHub checks after PR creation

Backend code:

- ruff on touched files
- targeted pytest for touched behavior
- broader backend pytest if shared planner/runtime/dispatcher code changed
- schema or surface checks when capability metadata changes

Frontend code:

- frontend lint/test/build commands from the repo workflow
- browser check when UI behavior changed and a local target is available

Runtime or capability surfaces:

- targeted unit tests
- dispatcher/catalog/adapter/prompt-control refusal tests
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 surface-matrix-check`
- live proof only when explicitly required and environment readiness is proven

Never report validation as passed unless it actually passed. If a check is
blocked by environment, report the exact blocker.

## Capability Discipline

Every capability-related slice must clearly classify the surface as one of:

- missing
- contract-only
- plan-only
- proof-only
- hybrid read-only
- gated real
- admitted real
- blocked
- forbidden

Do not turn proof-only paths into public Prompt Studio, dispatcher/catalog, or
`/adapters` behavior without a separate admission packet.

Do not claim cleanup, restore, rollback, undo, viewport reload, or reversibility
unless the slice actually implements and verifies that behavior.

## Runtime Proof Discipline

Before live proof:

1. Run local tests first.
2. Confirm canonical target readiness when required.
3. Keep proof scope inside the admitted/proposed corridor.
4. Preserve proof artifacts but do not commit ignored runtime JSON unless a
   checkpoint summary is intentionally created.
5. Stop on exact blockers instead of widening the slice.

Live proof outcomes may be successful, blocked, or failed. Blocked proof is
useful if it records exact evidence and does not overclaim.

## GitHub Admin Defaults

Use the low-friction repo governance:

- PRs are preferred.
- Human review is optional for low-risk work.
- Codex may self-merge low-risk PRs after validation and green CI.
- Codex may self-merge medium-risk PRs only with strong validation.
- High-risk PRs require explicit operator approval.
- Do not force-push.
- Do not rewrite history.
- Do not delete `main`.
- Do not delete uncertain or unmerged branches.
- Do not change GitHub settings unless explicitly approved.
- Recommended branch hygiene setting, if the operator chooses to enable it:
  `docs/GITHUB-BRANCH-HYGIENE-SETTINGS-RECOMMENDATION.md`.

## Future Thread Handoff

End each slice with:

- PR number/link
- merged yes/no
- branch and commit or merge commit
- files changed
- validation used
- capability/runtime behavior changed yes/no
- `.venv/` status
- branch cleanup performed yes/no
- recommended next slice
- revert path

This keeps future threads from relying on stale memory. The next thread should
trust the local repo state and current docs over old conversation context.
