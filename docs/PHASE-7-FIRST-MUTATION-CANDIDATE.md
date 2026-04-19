# Phase 7 First Mutation Candidate

## Purpose

This document defines the first recommended mutation-capable candidate for the
next real-adapter phase after the manifest-backed read-only evidence pass.

It does not implement real mutation.

It exists to answer one bounded question truthfully:

> Which published tool should be admitted first for real mutation planning, and
> what must be true before implementation starts?

Read this together with:
- `docs/PHASE-7-REAL-ADAPTER-GATE.md`
- `docs/PHASE-7-PROJECT-BUILD-CANDIDATES.md`
- `docs/PHASE-7-SETTINGS-GEM-INSPECTION-CHECKLIST.md`
- `docs/PHASE-7-GEM-STATE-REFINEMENT-CONTRACT.md`

## Recommendation

The first recommended mutation-capable candidate is:
- `settings.patch`

This recommendation is now partially implemented as a bounded preflight.

`settings.patch` now has a real dry-run preflight path in hybrid mode and a
first real mutation path for the fully admitted manifest-backed set-only case.
Broader settings mutation remains gated behind later admission criteria.

## Why `settings.patch` first

Compared with the current mutation-gated alternatives:
- it is narrower than `build.compile`
- it has fewer downstream execution side effects than `build.compile`
- it is easier to make reversible than `gem.enable`
- its manifest-adjacent inspection precursor is already stronger after the
  recent `project.inspect` project-config, settings, and Gem evidence work

## What this recommendation does not claim

This recommendation does not claim that:
- a real settings mutation path already exists
- a real settings write happened in the current slice
- layered settings discovery exists
- rollback is already implemented
- approval and lock handling are sufficient by themselves
- a patch plan is already operator-safe

## Current admitted scope

The currently admitted real scope is intentionally narrow:
- read `project.json`
- admit only dry-run preflight for `registry_path=/O3DE/Settings`
- match only manifest-backed top-level settings paths already present in
  `project.json`
- create a real backup file before reporting dry-run preflight success when the
  request includes admitted operations
- publish post-backup patch-plan validation and rollback-planning metadata
  without admitting real settings writes
- report unsupported operations truthfully without widening into mutation

If `dry_run=false`, if `project.json` is unavailable, or if later mutation-safe
criteria are needed, the path falls back to simulated.

If backup creation fails for an otherwise admitted real preflight request, the
run now rejects visibly before any mutation-capable step and does not degrade
silently to simulated.

If backup creation succeeds, the run now also records whether the remaining
patch plan is fully admitted or only partially admitted, plus the rollback
strategy that would restore the project manifest backup in a future mutation
slice.

If the post-backup plan is fully admitted, the run now records a
mutation-ready-but-write-blocked state. This is still not a real settings
write, but it gives operators a truthful final checkpoint before mutation
admission.

That checkpoint has now been crossed for one narrow case:
- `dry_run=false`
- `registry_path=/O3DE/Settings`
- all requested operations are admitted top-level manifest-backed `set`
  operations

Outside that narrow path, mutation remains blocked or simulated.

## Admission criteria before implementation

Before any real `settings.patch` implementation slice begins, all of the
following must be defined explicitly:

1. The exact writable settings surface in scope.
2. The exact backup strategy before mutation.
3. The exact rollback strategy if mutation or validation fails.
4. The exact pre-mutation validation checks.
5. The exact post-mutation verification checks.
6. The exact operator-visible failure messages.
7. The exact persisted evidence that proves mutation happened or was blocked.

## Minimum pre-mutation checks

The first real `settings.patch` slice must prove:
- the target settings file or manifest surface exists
- the target path stays within the accepted project workspace boundary
- the current content can be read and parsed without repair
- the requested patch operation is supported by the admitted scope
- the adapter can create a truthful backup before mutation

If any of those checks fail, the system must reject before real mutation and
must not report success.

## Minimum persisted evidence

If a future `settings.patch` mutation slice is admitted, persisted evidence
must make all of these visible:
- target path
- backup artifact or backup location
- requested patch operations
- admitted patch scope
- pre-mutation validation result
- post-mutation verification result
- whether rollback was required
- whether rollback succeeded

## Operator wording requirements

Operator-facing wording must stay specific:
- say `real settings patch` only when mutation truly happened
- say `mutation blocked before execution` when validation fails pre-mutation
- say `rollback attempted` when reversal was required
- say `simulated` when no real mutation happened

Operator wording must not imply:
- broader config-system support
- Gem mutation support
- build readiness
- recovery guarantees beyond the explicitly implemented rollback path

## Why not `gem.enable` first

`gem.enable` remains a viable later mutation candidate, but it is not the
first recommendation because:
- it changes project config and Gem state together
- it has stronger downstream configure/build coupling
- its rollback story is more coupled to subsequent project behavior

## Why not `build.compile` first

`build.compile` is not the first recommendation because:
- it has the highest runtime and environment coupling in the family
- it is more expensive to validate safely
- it should follow a stronger mutation-capable configure story, not precede it

## Exit condition for this planning phase

This planning phase is complete when this statement is true:

> `settings.patch` is the first recommended real mutation candidate, and its
> admission criteria are explicit enough that a future implementation slice can
> stay narrow, truthful, approval-gated, and rollback-aware.
