# GitHub Branch Hygiene Settings Recommendation

Status: recommendation only

Date: 2026-04-26

## Summary

The repository branch list has been cleaned down to a small, intentional set of
long-lived branches. To prevent ordinary merged Codex PR branches from piling
up again, the recommended low-friction GitHub setting is:

```text
Automatically delete head branches: enabled
```

This document does not change GitHub settings. It only records the
recommendation for the operator.

## Current Branch State

Current `main` at the time of this recommendation:

```text
d88817c11b6045943f39d941134305493bac779e
```

Current remote branch state:

- 14 remaining remote branch heads.
- No automatic delete candidates remain in
  `docs/FINAL-REMAINING-BRANCH-PURPOSE-MAP.md`.
- Remaining branches are either active/unmerged, preserved
  backup/stable/baseline/checkpoint/history references, or review-only
  integration/evidence/proof branches.

## Recommended Low-Friction Setting

Enable GitHub's repository setting:

```text
Automatically delete head branches
```

Suggested UI path:

```text
Repository Settings -> General -> Pull Requests -> Automatically delete head branches
```

## Why

This setting helps preserve the current low-friction workflow while preventing
routine merged PR branches from accumulating again.

It is a good fit for this repository because:

- PRs are preferred but should not create permanent branch clutter.
- Codex can continue to use small branches and self-merge low-risk PRs after
  validation.
- Ordinary merged branch heads do not need to linger after the merge commit is
  on `main`.
- Checkpoint, backup, stable, production, and active branches remain a separate
  preservation policy.

## What This Does Not Do

Enabling automatic deletion of merged PR head branches does not:

- Delete the current preserved branches.
- Delete unmerged branches.
- Delete backup, stable, checkpoint, production, baseline, or history branches
  that are not PR head branches being merged.
- Require human PR reviews.
- Block Codex autonomy for low-risk work.
- Enable strict branch protection.
- Require signed commits.
- Require linear history.
- Change CI behavior.
- Protect `main` strictly.

This is intentionally not a strict governance change. It is a branch hygiene
setting that removes ordinary merged PR heads after they have served their
purpose.

## Warnings

Do not casually delete:

- backup branches
- stable branches
- checkpoint branches
- production branches
- baseline branches
- unmerged branches
- uncertain integration/evidence/proof history branches

Keep `docs/FINAL-REMAINING-BRANCH-PURPOSE-MAP.md` updated if any long-lived
branch is added, retired, or reclassified.

If a future workflow needs a PR branch to remain after merge, record that branch
as a checkpoint, backup, stable, production, baseline, history, or evidence
branch before relying on it as long-lived state.

## Recommended Future Policy

Ordinary PR branches:

- Delete after merge.
- Prefer GitHub automatic deletion for normal merged PR head branches.
- Do not preserve unless the PR explicitly creates a long-lived branch role.

Checkpoint, backup, stable, production, and baseline branches:

- Preserve intentionally.
- Document purpose in the final branch purpose map or a successor inventory.
- Delete only through a dedicated approval/review packet.

Unmerged branches:

- Never delete automatically.
- Review branch-side commits and open work before any cleanup decision.
- Preserve until merged, superseded, or explicitly retired.

Integration, evidence, and proof-history branches:

- Preserve by default.
- Reclassify only with explicit operator approval.
- Delete only through a targeted packet that records why the history is no
  longer needed.

## Branch Protection Position

Do not enable strict branch protection as part of this recommendation.

Current low-friction governance remains:

- PRs are preferred.
- Reviews are optional for low-risk work.
- Codex may self-merge low-risk PRs after validation and green CI.
- Human approval is reserved for high-risk runtime, security, destructive, or
  history-sensitive changes.
- Force-pushing and deleting `main` remain forbidden operating actions.

Optional light safety can still be considered later, after the operator asks for
it and CI stability is well understood.

## Revert Or Disable Path

If automatic deletion becomes inconvenient, the operator can disable the setting
from the same GitHub UI path:

```text
Repository Settings -> General -> Pull Requests -> Automatically delete head branches
```

Disabling the setting does not restore already deleted branch heads. Recreate a
deleted branch from its recorded tip SHA when a cleanup report provides a
restore command.

## Explicit Non-Mutation Note

This recommendation changes no GitHub settings. It changes documentation only.
