# Future Thread Supervisor Startup Protocol

## Purpose

New Codex threads do not inherit chat history from older threads. Therefore,
this repository must carry its own startup rules.

If the operator says "use supervisor mode," Codex must activate Supervisor Mode
from this protocol.

This protocol is documentation only. It does not broaden runtime capability,
change dependency versions, or authorize global/system installs.

## Trigger Phrase

If the operator prompt begins with or clearly includes:

```text
use supervisor mode
```

Codex must immediately enter Supervisor Mode before planning or editing.

If the phrase appears with a specific task, activate Supervisor Mode and execute
the task using the repo workflow. Do not ask the operator to restate the task
unless the request is unsafe or genuinely ambiguous.

## Supervisor Mode Structure

When Supervisor Mode is active, Codex must organize work into explicit roles.
The roles may be mental roles in the main thread, or separate worker agents when
the current environment and operator instructions allow delegation.

Required roles:

1. Supervisor Agent
   - owns the final decision
   - assigns worker roles
   - reviews all worker findings
   - controls destructive actions
   - controls branch deletion
   - controls public capability admission
   - produces final report

2. Repository State Agent
   - verifies repo root
   - verifies origin
   - verifies branch
   - verifies `HEAD` and `origin/main`
   - checks worktree status
   - classifies dirty/untracked files

3. Dependency Bootstrap Agent
   - checks project-local dependencies
   - creates a local virtual environment if needed
   - installs repo-declared dependencies only
   - does not install system/global packages without explicit approval

4. Documentation/Context Agent
   - reads required docs
   - identifies relevant phase/checkpoint/status docs
   - confirms current truth before changes

5. Validation Agent
   - selects validation commands
   - runs targeted checks first
   - escalates to full checks when shared surfaces are touched
   - records exact command output/results

6. Risk/Boundary Agent
   - checks high-risk actions
   - blocks broadening
   - verifies forbidden actions are not happening
   - requires explicit operator approval for high-risk work

7. Implementation Agent
   - edits only within approved scope
   - does not broaden the task
   - does not stage local artifacts

Supervisor rule:

Worker agents may inspect and report in parallel. Only the Supervisor Agent may
execute final destructive actions, branch deletion, public capability admission,
merge decisions, or GitHub-setting changes.

## Mandatory Startup Sequence

Every future Codex thread should begin with:

```powershell
git rev-parse --show-toplevel
git remote get-url origin
git branch --show-current
git status --short
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/main
```

If starting a new packet from `main`, continue with:

```powershell
git checkout main
git pull --ff-only origin main
git status --short
```

If the operator named a branch, verify that exact branch before editing. Do not
silently switch baselines.

Expected local artifacts:

- `.venv/` may appear as untracked local state.
- `backend/.venv/` may exist as the repo-local backend environment.
- `frontend/node_modules/` may exist as local frontend dependencies.

Do not stage, commit, delete, or rename those local dependency directories.

## Required Startup Docs

Before implementing a new phase, widening a capability, or continuing broad
project work, read:

1. `AGENTS.md`
2. `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md`
3. `docs/CODEX-PROJECT-WORKFLOW-QUICK-REFERENCE.md`
4. `docs/NORMALIZED-PHASE-WORKFLOW.md`
5. `docs/CODEX-OPERATING-RUNBOOK.md`
6. `docs/CURRENT-STATUS.md`
7. the relevant phase checkpoint, quick reference, or readiness/audit doc

If the request is branch hygiene, also read:

- `docs/BRANCH-AND-PR-HYGIENE.md`
- the latest branch cleanup or purpose-map report

If the request touches admitted surfaces, also read:

- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`
- the relevant phase admitted-surfaces quick reference

## Dependency Bootstrap Rules

Dependency bootstrap is allowed only for project-local, repo-declared
dependencies.

This section defines the safe scope for dependency bootstrap. It does not
override active system/developer/tool confirmation rules. If the current agent
policy requires action-time confirmation before installing packages, obtain that
confirmation before running the install command.

Never perform these actions unless the operator explicitly approves them:

- global `npm install -g`
- global `pip install`
- `sudo`, `apt`, `choco`, `winget`, `brew`, or system package installation
- dependency version changes
- lockfile rewrites
- package upgrades

Do not add a dependency just because the local environment is stale. First check
whether the dependency is already declared in repo-owned files.

For backend Python:

```powershell
Test-Path backend\.venv\Scripts\python.exe
Test-Path backend\requirements.txt
```

If `backend/.venv` is missing and the task requires backend validation, use
only the repo-local virtual environment path:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

If a package import fails, inspect `backend/requirements.txt` before changing
code or dependencies. If the package is already declared, report the local venv
as stale and sync the venv instead of editing requirements.

For frontend Node:

```powershell
Test-Path frontend\package-lock.json
Test-Path frontend\node_modules
```

If `frontend/node_modules` is missing and the task requires frontend validation,
use only repo-declared frontend dependencies:

```powershell
cd frontend
npm ci
cd ..
```

For secondary worktrees, prefer the repo-owned worktree bootstrap:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 bootstrap-worktree
```

That command links shared backend dependency folders from the primary checkout
and ensures local frontend dependencies for the worktree.

## Missing Package Triage

When a validation command fails with a missing package:

1. Identify the import site.
2. Determine whether the import is runtime, test-only, or optional helper code.
3. Check repo-owned dependency declarations before adding anything.
4. If already declared, treat the local environment as stale.
5. If optional, prefer lazy/guarded imports so unrelated tests can collect.
6. If truly required and undeclared, use the correct repo-owned dependency file
   in a dedicated dependency-change packet with explicit risk classification.

Do not hide local stale-environment truth. Report it plainly.

## Startup Readiness Report

Before editing files, report:

- repo root
- origin URL
- active branch
- `HEAD`
- `origin/main`
- worktree status
- whether `.venv/`, `backend/.venv/`, or `frontend/node_modules/` are present
- docs read for the task
- selected risk level
- intended next packet
- validation plan

This can be concise, but it must be specific.

## Continue Into Normalized Workflow

After startup readiness is confirmed, continue into
`docs/NORMALIZED-PHASE-WORKFLOW.md`.

Do not jump directly from an idea to broad admission. Use the normalized gates:

```text
unknown -> discovered -> designed -> audited -> proof-only -> admission decision -> exact admission -> reviewed -> documented -> checkpointed
```

For low-risk documentation and hygiene work, proceed quickly after validation.
For high-risk runtime, security, destructive, dependency, or public capability
changes, require explicit operator approval.

## Non-Negotiable Boundaries

Supervisor Mode does not authorize unsafe work.

Forbidden without explicit operator approval:

- public capability admission
- branch deletion
- GitHub settings changes
- dependency version changes
- CI behavior changes
- runtime mutation widening
- arbitrary shell, Python, or Editor execution surfaces
- asset/material/render/build/TIAF mutation
- generalized undo or rollback claims
- force-push
- history rewrite

Forbidden always:

- committing `.venv/`
- committing `node_modules/`
- committing runtime proof JSON unless a policy explicitly requires a summary
  artifact and the file is not ignored runtime output
- committing secrets, local databases, logs, caches, or build outputs

## Final Report Requirements

Every Supervisor Mode packet should end with:

- PR number/link, if created
- merged yes/no
- branch and commit or merge commit
- files changed
- validation used
- capability/runtime behavior changed yes/no
- dependency/bootstrap actions taken
- `.venv/` and `node_modules/` status
- branch cleanup performed yes/no
- recommended next slice
- revert path

Future threads must trust the repository state and these docs over stale chat
memory.
