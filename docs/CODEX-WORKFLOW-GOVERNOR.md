# Codex Workflow Governor

Status: repo-wide workflow governor

Date: 2026-04-27

## Purpose

This governor prevents the project from drifting into many small trivial PRs
that do not move the system forward.

Use this document after the future-thread startup protocol and before creating
any branch, commit, or PR.

## Core Rule

Every PR must move the project toward at least one meaningful outcome:

- a capability design, proof, admission, or review gate
- a blocker removal or blocker checkpoint with new evidence
- operator UX that improves truthful operation
- validation, CI, or test coverage that protects an important boundary
- workflow governance that changes how future work is selected or executed
- repo hygiene that resolves a concrete risk, ambiguity, or stale instruction

If a proposed PR does not satisfy one of those outcomes, do not create it.

## Anti-Drift Rules

Do not create standalone PRs only to:

- update a status SHA after every merge
- echo facts already present elsewhere
- add another refusal-only checkpoint without new behavior or new coverage
- add a docs index entry for a trivial doc
- split one coherent docs/governance update into several tiny PRs
- record "next recommended slice" without actually selecting or advancing one

Bundle incidental status, index, and quick-reference updates into the same PR
that caused the truth change.

## Meaningful Packet Test

Before opening a PR, answer these questions in the PR body or internal
readiness note:

1. What project problem does this remove?
2. What future decision becomes easier or safer because of this change?
3. What evidence, test, operator guidance, or governance rule is new?
4. Why should this be a PR instead of being bundled into a larger meaningful
   packet?
5. What is the next project-moving packet after this one?

If the answers are weak, stop and choose a stronger slice.

## Supervisor Mode Autonomy

Codex is allowed to proceed without constant operator approval when all are
true:

- risk is low or approved medium
- the task fits the requested scope
- validation is clear and project-local
- no forbidden action is needed
- no runtime capability is broadened
- the packet passes the meaningful packet test

Codex must still stop for explicit operator approval before high-risk work,
destructive actions, public capability admission, dependency version changes,
GitHub settings changes, branch deletion, force-push, or global/system installs.

## Dependency Bootstrap Gate

Dependency bootstrap is part of startup readiness, not a separate feature PR.

Allowed bootstrap:

- project-local Python venv from repo-declared Python dependency files
- frontend `node_modules` from `frontend/package-lock.json`
- repo-owned worktree bootstrap scripts

Forbidden without explicit approval:

- global installs
- system package managers
- dependency upgrades
- dependency file or lockfile rewrites

If dependency files need to change, create a dedicated dependency packet with
operator approval and clear risk classification.

## Refusal-Hardening Rule

Refusal tests and docs are valuable only when they protect a real boundary.

A refusal-only PR is allowed only when it includes at least one of:

- a failing or probing prompt that currently plans or admits incorrectly
- a targeted test that prevents a known regression
- a consolidated guard that closes a class of partial-plan gaps
- a checkpoint requested explicitly by the operator

Do not create a separate status-refresh PR after a refusal-hardening PR. Include
the status update in the same PR when needed.

## Status And Index Update Rule

Status and index updates are allowed when they are attached to meaningful work.

Standalone status/index PRs are allowed only when:

- the operator explicitly asks for a handoff/status packet
- stale docs would mislead the next thread about current capability truth
- the status update consolidates multiple merged packets into one useful
  project-moving handoff

Otherwise, bundle them into the capability, proof, blocker, operator UX, or
governance PR.

## Branch And Merge Rule

Use one branch per coherent project-moving packet.

Before merge, confirm:

- the PR has one primary intent
- incidental docs/status/index updates are bundled
- validation passed or blockers are explicit
- no local artifacts are staged
- `.venv/`, `node_modules`, runtime JSON, caches, logs, and local databases are
  untouched
- the PR body names risk, boundaries, validation, and revert path

Self-merge remains allowed for low-risk project-moving work after validation and
green CI.

## High-Risk Gate

The following always require explicit operator approval before implementation or
merge:

- runtime behavior changes
- public capability admission
- dependency version changes
- lockfile rewrites
- CI requirements or GitHub settings changes
- branch deletion
- force-push or history rewrite
- destructive file operations
- arbitrary shell, Python, or Editor execution surfaces
- asset/material/render/build/TIAF mutation
- generalized undo, rollback, or restore claims

## Final Report Additions

Every final report should include:

- why the packet passed the workflow-governor gate
- whether incidental status/index updates were bundled or intentionally skipped
- the next project-moving packet

Future threads must use this governor before producing another PR.
