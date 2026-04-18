# Official Workflow — ChatGPT + Codex Desktop Collaboration

## Purpose

This document defines the official workflow for building `O3de_CODEX_VX001` with ChatGPT and Codex Desktop working against the same repository.

The goals are to:
- keep GitHub as the source of truth
- ensure Codex always works in the correct repository
- avoid accidental edits in the wrong folder or similarly named repo
- keep implementation aligned with the O3DE control-plane direction already documented in the research batches
- make progress auditable, reviewable, and production-oriented

---

## Repository of Record

Treat GitHub repo `openclaworhchestratorx951357-alt/O3de_CODEX_VX001` as the source of truth.

Canonical GitHub URLs:

```text
https://github.com/openclaworhchestratorx951357-alt/O3de_CODEX_VX001
https://github.com/openclaworhchestratorx951357-alt/O3de_CODEX_VX001.git
```

All code, docs, branches, pull requests, and reviewed changes must resolve back to that repository.

---

## Important Clarification: No Manual Clone Requirement

You do **not** need to personally work in a manually managed clone just to follow this workflow.

What matters is that Codex is attached to or editing the correct Git working tree for this repository.

That working tree may be:
- a Codex-managed local workspace
- a local checkout opened by Codex
- a synced repo folder already present on the machine

The rule is not "use a clone because it is a clone".

The rule is:

> Only edit the Git working tree whose `origin` remote and Git toplevel resolve to `openclaworhchestratorx951357-alt/O3de_CODEX_VX001`.

---

## Mandatory Repository Verification Before Editing

Before making any changes, Codex must verify all of the following:

1. current directory is inside a Git repository
2. `git rev-parse --show-toplevel` succeeds
3. `git remote get-url origin` points to `openclaworhchestratorx951357-alt/O3de_CODEX_VX001`
4. the working tree is the one Codex intends to edit

If any check fails, stop immediately and report the mismatch.

### PowerShell verification

```powershell
$GitTop = (git rev-parse --show-toplevel).Trim()
$Origin = (git remote get-url origin).Trim()
$Branch = (git branch --show-current).Trim()
$Cwd = (Get-Location).Path

Write-Host "Cwd=$Cwd"
Write-Host "GitTop=$GitTop"
Write-Host "Origin=$Origin"
Write-Host "Branch=$Branch"

if (-not $Origin.Contains("openclaworhchestratorx951357-alt/O3de_CODEX_VX001")) {
    throw "Refusing to edit: origin remote is not O3de_CODEX_VX001"
}
```

### Git Bash verification

```bash
CWD="$(pwd)"
GIT_TOP="$(git rev-parse --show-toplevel)"
ORIGIN="$(git remote get-url origin)"
BRANCH="$(git branch --show-current)"

printf 'Cwd=%s\n' "$CWD"
printf 'GitTop=%s\n' "$GIT_TOP"
printf 'Origin=%s\n' "$ORIGIN"
printf 'Branch=%s\n' "$BRANCH"

case "$ORIGIN" in
  *openclaworhchestratorx951357-alt/O3de_CODEX_VX001*) ;;
  *) echo "Refusing to edit: origin remote is not O3de_CODEX_VX001"; exit 1 ;;
esac
```

### Command Prompt verification

```bat
for /f "delims=" %%i in ('git rev-parse --show-toplevel') do set GIT_TOP=%%i
for /f "delims=" %%i in ('git remote get-url origin') do set ORIGIN=%%i
for /f "delims=" %%i in ('git branch --show-current') do set BRANCH=%%i
for /f "delims=" %%i in ('cd') do set CWD=%%i

echo CWD=%CWD%
echo GIT_TOP=%GIT_TOP%
echo ORIGIN=%ORIGIN%
echo BRANCH=%BRANCH%

echo %ORIGIN% | findstr /I "openclaworhchestratorx951357-alt/O3de_CODEX_VX001" >nul || exit /b 1
```

---

## Optional Approved Workspace Path

If the machine has a known stable repo path, it may also be recorded and checked.

Example:

```text
C:\Users\YourName\source\repos\O3de_CODEX_VX001
```

That path is optional.

The required check is the Git identity check above. The path check is only an additional safeguard when a stable path is known.

---

## Session Start Procedure

At the beginning of every Codex work session:

1. verify Git toplevel and origin remote
2. print current branch
3. print `git status --short`
4. fetch latest refs
5. confirm the exact task being worked on
6. only then begin edits

Recommended session start commands:

```powershell
git rev-parse --show-toplevel
git remote get-url origin
git branch --show-current
git status --short
git fetch --all --prune
```

If working directly on `main`, Codex must say so explicitly.
If working on a feature branch, Codex must print the branch name before editing.

---

## Branching Rules

Do not work on `main` unless explicitly instructed.

Preferred branch naming:

```text
feat/backend-approvals-and-locks
feat/frontend-run-detail-view
feat/tool-registry-and-schemas
fix/dispatcher-request-validation
docs/codex-chatgpt-workflow
chore/ci-docker-baseline
```

One branch should correspond to one coherent change set.

---

## Official Roles

### ChatGPT
ChatGPT is responsible for:
- architecture direction
- planning and task slicing
- workflow and operator documentation
- consistency review across frontend, backend, contracts, schemas, agents, and docs
- identifying gaps between claims and implementation

### Codex Desktop
Codex is responsible for:
- verifying the correct repo/worktree
- editing files in that verified worktree
- running local commands/tests
- creating branches and preparing commits
- reporting exact changed files and actual results

### Shared rule
Neither should claim work is complete unless it is verified.
Neither should present stubbed integrations as real integrations.

---

## Project Direction Guardrails

This repository is not a generic chat app. It is an O3DE-focused control-plane app.

Work should stay aligned with these core operational domains:
- editor / authoring automation
- project / build / settings
- asset pipeline / prefabs / content processing
- validation / TIAF / test orchestration
- rendering / material / lookdev
- framework / Gem-aware extension boundaries

These domain boundaries are consistent with the research batches already collected in this repository’s source materials.

### Practical implication
Production-oriented work should prioritize:
- backend orchestration core
- approval and lock model
- typed request/response contracts
- audit/event persistence
- usable operator UI
- CI, linting, tests, Docker, deployment docs
- explicit adapter boundaries for real O3DE integrations

### Do not misrepresent stubs
A feature is only "real" if it is actually implemented and validated.
If an O3DE integration is simulated, stubbed, or contract-only, label it that way.

---

## Non-Negotiable Safety Rules

Codex must not:
- edit a repo whose `origin` remote does not match `openclaworhchestratorx951357-alt/O3de_CODEX_VX001`
- silently switch to a different similarly named repo
- claim tests passed if they were not run
- claim production readiness without stating what was actually verified
- overwrite existing local work without checking `git status`
- commit secrets, tokens, or private credentials

If uncertain, stop and report the exact uncertainty.

---

## Required End-of-Session Report

After each Codex work session, produce a report with:

```text
Repo path verified:
Origin verified:
Branch:
Files changed:
Commands run:
Results:
Implemented:
Still stubbed / unverified:
Next recommended step:
```

`Repo path verified` should be the output of `git rev-parse --show-toplevel`.

`Origin verified` should include the output of `git remote get-url origin`.

---

## Pull Request Rules

Every PR should include:
- purpose of the change
- exact scope
- API examples for backend changes when applicable
- screenshots for frontend changes when applicable
- migration notes if any
- known limitations
- explicit note if any O3DE integration remains stubbed

Checklist:
- [ ] Verified Git toplevel and origin before editing
- [ ] Worked only in the verified O3de_CODEX_VX001 worktree
- [ ] No secrets committed
- [ ] Tests run and results included
- [ ] Docs updated when operator-facing behavior changed
- [ ] Stubbed integrations clearly labeled

---

## Official Codex Session Instruction Block

Use this at the top of Codex sessions:

```text
Treat GitHub repo openclaworhchestratorx951357-alt/O3de_CODEX_VX001 as the source of truth.
Before making changes, verify that:
- git rev-parse --show-toplevel succeeds
- git remote get-url origin points to openclaworhchestratorx951357-alt/O3de_CODEX_VX001
If verification fails, stop immediately and report the mismatch.

Only edit the verified worktree for this repository.
Do not invent implementation status.
Do not claim real O3DE integrations unless they are actually implemented and validated.
Keep changes production-oriented, auditable, and scoped.

After finishing, report:
- repo path verified
- origin verified
- branch
- files changed
- commands run
- results
- implemented vs still stubbed
- next recommended step
```

---

## README Pointer

This workflow document should be linked from the root README and docs README so it is easy to find.

---

## Final Rule

If there is ever a conflict between:
- a random local folder
- an old copy of the repo
- a temporary extracted archive
- a similarly named workspace
- a Codex worktree whose `origin` does not match this repo
- the verified worktree whose `origin` matches `openclaworhchestratorx951357-alt/O3de_CODEX_VX001`

the verified worktree wins.

If the current workspace is not the verified worktree, stop and fix location first.
