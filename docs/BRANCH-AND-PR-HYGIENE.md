# Branch And PR Hygiene

Purpose: keep the repository easy for future agents to continue without making
the operator approve every small cleanup step.

## Branch Naming

Use the `codex/` prefix for working branches:

```text
codex/<area>-<short-description>
```

Examples:

- `codex/repo-professionalization-docs-foundation`
- `codex/docs-phase-history-backfill`
- `codex/validation-matrix-alignment`

Keep historical backup, checkpoint, and promotion branches until the operator
explicitly approves cleanup.

## Before Opening A PR

Confirm:

- the branch starts from the intended base
- `git status --short` contains only intentional changes plus allowed local
  untracked noise such as `.venv/`
- `.venv/`, runtime proof JSON, local databases, logs, caches, build outputs,
  and secrets are not staged
- validation appropriate to the change has passed
- `git diff --cached --check` passes after staging

## PR Readiness

A PR is ready to merge when:

- the risk level is stated
- validation is recorded
- boundaries are explicit
- the revert path is clear
- there is no unreported local artifact or generated file in the commit
- high-risk work has operator approval

Draft PRs are appropriate for runtime proof work, exploratory evidence, or any
slice that needs operator review before merge.

## Self-Merging

Codex may self-merge only under the rule in
`docs/REPOSITORY-OPERATIONS.md`.

Preferred merge method:

- use a normal merge commit when preserving PR context matters
- use squash only when the operator has asked for a compressed history
- do not rebase merge unless the operator asks for it

Never force-push `main`.

## After Merge

Run:

```powershell
git checkout main
git pull --ff-only origin main
git status --short
```

Then report:

- PR number and link
- merged: yes/no
- risk level
- validation run
- files changed
- capability/runtime behavior changed: yes/no
- branch deleted: yes/no
- next recommended PR

## Branch Deletion

Delete a merged working branch only when all are true:

- the PR was merged
- the branch has no unmerged commits
- the branch is not referenced by an active handoff
- the branch is not a checkpoint, backup, promotion, or audit branch
- the branch name and PR relationship are unambiguous

Ask the operator before bulk branch deletion or any uncertain branch cleanup.

## Revert Paths

Docs-only PR:

```powershell
git revert -m 1 <merge-commit>
```

Single-commit branch before merge:

```powershell
git revert <commit>
```

Do not rewrite history to undo public work. Prefer a normal revert commit so the
audit trail remains visible.
