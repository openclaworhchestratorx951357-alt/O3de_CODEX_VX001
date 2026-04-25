# Phase 6B Release And Conformance Plan

## Purpose

This document defines the contract-first release and conformance plan for
Phase 6B.

It exists to describe the evidence and gate model that future remote execution
surfaces must satisfy before they can be treated as production-admitted on this
repository.

It does not implement runtime tests, CI policy enforcement, or release tooling
by itself.

Read this together with:
- `docs/PHASE-6B-REMOTE-EXECUTOR-CONTRACT.md`
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
- `docs/PHASE-6B-API-EVENT-CONTRACT.md`
- `docs/PHASE-6B-POLICY-AND-ADMISSION-CONTRACT.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/PHASE-7-CHECKPOINT.md`

## Branch Truth To Preserve

This plan must preserve current branch truth:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real
- Docker/compose baseline and CI stack validation exist
- local Docker startup is verified
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` is the first admitted mutation-gated real path
- broader real adapter coverage is still narrow
- simulated vs real wording must remain explicit

This document defines future release and conformance gates.
It does not claim that broader remote execution or broader real tool admission
has already passed those gates.

## Goals

The Phase 6B release and conformance plan should:
- define the minimum evidence bundle required to admit a surface as production
- define runner-family conformance expectations
- define failure-rehearsal expectations before admission
- define operator-console truth-label acceptance criteria
- define how the matrix becomes a release gate rather than a planning note

## Non-Goals

This plan is not:
- a promise that every matrix row will become real
- a replacement for per-surface engineering contracts
- a claim that local Docker validation is sufficient proof of remote O3DE
  automation readiness
- permission to widen any surface without passing its specific release evidence

## Release Gate Principle

No surface should be considered production-admitted merely because:
- an official O3DE substrate exists
- a simulated adapter exists
- a local smoke run succeeded once
- an executor appears available

A surface becomes production-admitted only when:
- its matrix row is complete
- its runner-family conformance evidence exists
- its failure-rehearsal evidence exists
- its operator truth-label behavior is verified
- its admission class is updated truthfully

## Required Evidence Bundle Per Admitted Surface

Every future admitted surface should have a release evidence bundle containing:
- substrate and runner-family declaration
- preflight and precondition evidence
- approval/lock evidence where applicable
- primary execution logs
- structured summary artifact
- post-run or post-write verification evidence
- backup evidence where required
- rollback evidence where required
- failure-classification evidence
- frontend truth-label verification evidence

The exact artifact set can vary by runner family, but the bundle must be
sufficient to audit what happened and why the surface was admitted.

## Runner-Family Conformance Expectations

Each admitted surface should satisfy the shared Phase 6B gate plus the specific
runner-family gate below.

### File / manifest runner

Minimum conformance evidence:
- path-binding and target-selection verification
- manifest read/write scope verification
- diffable plan evidence for mutating cases
- post-write readback evidence
- backup and rollback proof for mutation-gated cases

### CLI runner

Minimum conformance evidence:
- executable resolution proof
- working-directory and environment binding proof
- exit-code classification proof
- stdout/stderr capture proof
- artifact and summary persistence proof

### Editor session runner

Minimum conformance evidence:
- editor bootstrap or attach proof
- project/level/session precondition proof
- structured operation result proof
- save boundary proof for mutating actions
- before/after evidence for admitted write paths

### Asset pipeline runner

Minimum conformance evidence:
- project/platform binding proof
- processor launch proof
- job/result normalization proof
- source/product identity evidence
- dependency/reference verification for mutating paths

### Standalone tool runner

Minimum conformance evidence:
- tool bootstrap proof
- project/document binding proof
- output/capture artifact proof
- save/revert evidence for mutating actions

### Test runner

Minimum conformance evidence:
- test inventory selection proof
- result normalization proof
- artifact retention proof
- retry/sharding behavior proof where supported
- failure triage evidence for non-passing outcomes

### Remote content runner

Minimum conformance evidence:
- repo origin and integrity proof
- content provenance proof
- activation/download verification proof
- rollback proof when local config is mutated

## Failure-Rehearsal Expectations

Every future production-admitted surface should prove not only successful runs
but also truthful failure handling.

### Minimum rehearsed failure classes

- prerequisite missing
- approval missing or denied where applicable
- lock unavailable where applicable
- runner launch failure
- runner timeout where applicable
- verification failure
- rollback failure path for mutation-gated surfaces
- cleanup or retention-path failure where relevant

### Rules

- failure rehearsal should use structured failure categories rather than only
  screenshot or log inspection
- a surface should not be promoted to production-admitted if its failure modes
  are still only loosely understood
- mutation-gated surfaces require both failed-write and failed-verification
  rehearsal evidence

## Operator-Console Acceptance Criteria

The frontend must eventually present backend truth without inflation.

### Minimum acceptance checks

- tool truth label matches the admitted backend class
- executor/workspace state is not confused with tool admission state
- approval, lock, backup, rollback, timeout, and retention states are visible
  where applicable
- evidence links and summaries are visible for the admitted surface
- simulated fallback is still explicit when a surface does not qualify for real
  execution

### Rejection conditions

A surface should fail operator-console acceptance if:
- the UI makes a simulated or plan-only path look fully real
- the UI hides approval or rollback state for a mutation-gated path
- the UI shows substrate availability as proof of tool admission

## Matrix-To-Release Gate Integration

The matrix in `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md` should become the
release checklist anchor for remote automation admission.

### Required matrix gate fields

Before release signoff, each admitted row should have:
- current truth updated
- official substrate confirmed
- runner type confirmed
- preconditions confirmed
- approval/lock class confirmed
- backup/rollback requirement confirmed
- post-run or post-write verification confirmed
- artifacts/logs/evidence confirmed
- frontend truth label confirmed
- release test requirement completed

### Rule

If a row cannot be filled truthfully, the surface is not release-admitted.

## Admission Promotion Rules

Future surfaces should promote only one truth step at a time:
- `simulated-only` -> `real-read-only`
- `real-read-only` -> `real-plan-only`
- `real-plan-only` -> `real-mutation-gated`

Promotion should require:
- successful conformance evidence for the target class
- failure-rehearsal evidence appropriate to the target class
- frontend acceptance evidence
- updated matrix truth
- updated checkpoint truth where the branch-wide status changes

No surface should skip directly to a stronger class without that intermediate
evidence.

## Branch-Level Release Review

Before broader real adapter coverage is claimed at branch or release level,
review should confirm:
- Phase 6B contract chain is internally aligned
- matrix rows are complete for every admitted surface
- branch checkpoint wording matches actual admitted scope
- README and docs index wording do not overstate capability
- local baseline validation is not being misrepresented as full remote O3DE
  production readiness

## Definition Of Done For This Planning Slice

This planning slice is complete when the repository has:
- a canonical Phase 6B release and conformance plan
- runner-family conformance expectations
- failure-rehearsal expectations
- operator-console truth-label acceptance criteria
- matrix-driven release gate rules
- no wording drift that implies broader runtime implementation already exists

## Recommended Next Planning Slice

After this contract, the next narrow planning slice should define the first
implementation-adjacent Phase 6B execution breakdown:
- backend record/API slices needed before runtime executor work
- frontend visibility slices needed before admission promotion
- test harness slices needed for conformance evidence collection

Primary planning source:
- `docs/PHASE-6B-IMPLEMENTATION-SEQUENCE.md`
