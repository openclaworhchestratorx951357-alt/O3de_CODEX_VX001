# Future Thread Supervisor Startup Protocol

## Purpose

New Codex threads do not inherit previous chat context. Therefore, this
repository carries its own startup rules.

If the operator says "use supervisor mode," Codex must activate Supervisor
Low-Friction Mode from this protocol.

This protocol is documentation only. It does not broaden runtime capability,
change dependency versions, or authorize global/system installs.

## Trigger Phrase

If the operator prompt begins with or clearly includes:

```text
use supervisor mode
```

Codex must immediately enter Supervisor Low-Friction Mode before planning,
editing, deleting branches, admitting capabilities, or running destructive
commands.

If the phrase appears with a specific task, activate Supervisor Low-Friction
Mode and execute the task using the repo workflow. Do not ask the operator to
restate the task unless the request is unsafe or genuinely ambiguous.

## Supervisor Low-Friction Mode

Supervisor Low-Friction Mode means:

- move quickly on low-risk repo, documentation, and test work
- use multiple worker roles for parallel inspection
- keep final authority centralized in the Supervisor Agent
- do not interrupt the operator for low-risk, already-approved workflow actions
- check O3DE evidence substrates before declaring O3DE capability work blocked
- still require explicit approval for high-risk, destructive, security, or
  runtime-broadening actions

## Required Roles

When Supervisor Mode is active, Codex must organize work into explicit roles.
The roles may be mental roles in the main thread, or separate worker agents when
the current environment and operator instructions allow delegation.

1. Supervisor Agent
   - owns final decisions
   - assigns worker roles
   - reviews all worker findings
   - controls destructive actions
   - controls branch deletion
   - controls public capability admission
   - controls merge/self-merge decisions
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
   - creates local virtual environment if needed
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

6. Evidence Substrate Agent
   - searches O3DE caches, databases, catalogs, generated outputs, and proof
     artifacts
   - proposes read-only proof paths before blocked status is allowed
   - verifies one bounded proof example is impossible before accepting a
     blocked claim

7. Risk/Boundary Agent
   - checks high-risk actions
   - blocks unsafe broadening
   - verifies forbidden actions are not happening
   - requires explicit operator approval for high-risk work

8. Implementation Agent
   - edits only within approved scope
   - does not broaden task
   - does not stage local artifacts

Supervisor rule:

Worker agents may inspect and report in parallel. Only the Supervisor Agent may
execute final destructive actions, branch deletion, public capability admission,
merge decisions, or GitHub-setting changes.

## Mandatory Startup Sequence

Every future Codex thread must begin with:

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
3. `docs/CODEX-WORKFLOW-GOVERNOR.md`
4. `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md`
5. `docs/CODEX-PROJECT-WORKFLOW-QUICK-REFERENCE.md`
6. `docs/NORMALIZED-PHASE-WORKFLOW.md`
7. `docs/CODEX-OPERATING-RUNBOOK.md`
8. `docs/CURRENT-STATUS.md`
9. the relevant phase checkpoint, quick reference, readiness/audit, or blocker
   doc

If the request is branch hygiene, also read:

- `docs/BRANCH-AND-PR-HYGIENE.md`
- the latest branch cleanup or purpose-map report

If the request touches admitted surfaces, also read:

- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`
- the relevant phase admitted-surfaces quick reference

## Dependency Bootstrap Rules

Dependency bootstrap checking is required at startup. Actual installation or
sync is required only when validation or implementation needs local
dependencies that are missing or stale. Bootstrap is allowed only for
project-local, repo-declared dependencies.

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

Declared dependency sources currently include:

- `pyproject.toml`
- `backend/requirements.txt`
- `frontend/package.json`
- `frontend/package-lock.json`

For backend Python:

```powershell
Test-Path pyproject.toml
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

If `frontend/node_modules` is missing and the task requires frontend
validation, use only repo-declared frontend dependencies:

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
   in a dedicated dependency-change packet with explicit risk classification and
   operator approval.

Do not hide local stale-environment truth. Report it plainly.

## Workflow Governor Gate

After startup and before creating a branch or PR, Codex must apply
`docs/CODEX-WORKFLOW-GOVERNOR.md`.

A new PR must move the project toward a meaningful capability, proof,
admission, operator UX, blocker removal, validation improvement, or workflow
governance improvement. Do not create standalone PRs whose only purpose is a
status SHA refresh, a trivial doc echo, or another refusal-only checkpoint
unless the operator explicitly requests that exact packet.

Bundle incidental status/index updates into the meaningful PR that caused them.

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
- intended next packet and why it passes the workflow-governor gate
- validation plan

This can be concise, but it must be specific.

## Mandatory Slice Log Append

For supervisor-mode project packets, append timestamped entries to:

`C:\Users\topgu\OneDrive\Documents\New project\continue-queue\codex-slice-log.txt`

Use:

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Add-Codex-Slice-Log.ps1 "startup readiness confirmed: <branch>/<packet>"
```

and again when a slice is completed (before the final report):

```powershell
powershell -NoLogo -ExecutionPolicy Bypass -File .\scripts\Add-Codex-Slice-Log.ps1 "slice complete: <result summary>"
```

Treat the completion append as a blocking gate: do not send the final report
until this log line is written.

If the helper script is unavailable, append an equivalent ISO timestamp entry
with PowerShell `Add-Content`.

## Continue Into Normalized Workflow

After startup readiness is confirmed, continue into
`docs/NORMALIZED-PHASE-WORKFLOW.md`.

Do not jump directly from an idea to broad admission. Use the normalized gates:

```text
unknown -> discovered -> designed -> audited -> proof-only -> admission decision -> exact admission -> reviewed -> documented -> checkpointed
```

For low-risk documentation and hygiene work, proceed quickly after validation
when the workflow governor says the packet has real project value. For high-risk
runtime, security, destructive, dependency, or public capability changes,
require explicit operator approval.

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
- slice-log entries written yes/no
- exact completion slice-log line appended
- branch cleanup performed yes/no
- recommended next slice
- revert path

Future threads must trust the repository state and these docs over stale chat
memory.
