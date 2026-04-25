# Phase 6B Implementation Sequence

## Purpose

This document defines the first implementation-adjacent delivery breakdown for
Phase 6B.

It turns the Phase 6B contract stack into a sequenced set of backend, frontend,
and conformance slices that can be implemented without truth drift.

It does not implement runtime code by itself.

Read this together with:
- `docs/PHASE-6B-REMOTE-EXECUTOR-CONTRACT.md`
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
- `docs/PHASE-6B-API-EVENT-CONTRACT.md`
- `docs/PHASE-6B-POLICY-AND-ADMISSION-CONTRACT.md`
- `docs/PHASE-6B-RELEASE-AND-CONFORMANCE-PLAN.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`

## Branch Truth To Preserve

This sequence must preserve current branch truth:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real
- Docker/compose baseline and CI stack validation exist
- local Docker startup is verified
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` is the first admitted mutation-gated real path
- broader real adapter coverage is still narrow
- simulated vs real wording must remain explicit

This sequence defines how to build the Phase 6B substrate safely.
It does not claim that remote executor runtime, executor APIs, or broader real
surface admission already exist.

## Delivery Goals

The Phase 6B implementation sequence should:
- break Phase 6B into narrow, reviewable slices
- keep write scopes small enough for parallel worktree lanes
- make backend truth available before frontend claims depend on it
- establish conformance evidence collection before admission promotion
- avoid mixing executor infrastructure work with broad new tool admission

## Non-Goals

This sequence is not:
- a commitment to ship all slices in one branch
- a reason to widen real adapter status ahead of evidence
- a shortcut around the matrix or release gate
- permission to treat frontend mockups as backend truth

## Sequencing Principles

Phase 6B implementation should follow these rules:
- records before projections
- projections before frontend truth displays
- evidence plumbing before admission promotion
- substrate slices before new runner-family admission
- one admitted-surface change at a time after the substrate baseline exists

## Workstream Lanes

Phase 6B can be delivered in three coordinated lanes:

1. backend substrate lane
2. frontend truth-visibility lane
3. conformance harness lane

These lanes can overlap only when the upstream truth contract they depend on is
already stable.

## Lane 1: Backend Substrate Sequence

The backend lane should land first because frontend and conformance work depend
on stable record and projection shapes.

### Slice 1A - Canonical record vocabulary and persistence extension plan

Scope:
- map executor/workspace/binding vocabulary onto current real bookkeeping
- define which existing entities extend versus which new entities are needed
- define nullable-safe attachment points for backup, rollback, and verification

Expected outputs:
- implementation note or schema plan for executor/workspace/binding records
- compatibility notes for current runs/executions/artifacts/events

Must be true before moving on:
- no ambiguity remains about where executor/workspace identity will live
- no existing real bookkeeping meaning is broken

### Slice 1B - Execution record fields and lifecycle plumbing

Scope:
- add record-level support for executor identity
- add workspace lifecycle fields
- add execution-attempt state separation
- add structured failure taxonomy attachment points

Expected outputs:
- backend data-model slice
- migration or persistence update slice
- test coverage for lifecycle-state recording

Must be true before moving on:
- backend can record substrate state without UI invention

### Slice 1C - Artifact and evidence linkage extension

Scope:
- add primary log, summary, verification, backup, and rollback linkage fields
- define evidence completeness semantics for execution detail

Expected outputs:
- artifact-linkage storage changes
- execution-detail serialization changes
- tests for artifact association and retrieval

Must be true before moving on:
- admitted surfaces can expose evidence through structured fields rather than
  freeform summaries only

### Slice 1D - Executor/workspace projections and event enrichment

Scope:
- add executor status projections
- add workspace status projections
- add run-to-executor/workspace summary projection
- enrich lifecycle event payloads with structured substrate fields

Expected outputs:
- backend response-model slice
- event emission/model slice
- projection tests and serialization tests

Must be true before moving on:
- frontend has a stable source for substrate truth labels

### Slice 1E - Policy attachment plumbing

Scope:
- attach approval, lock, backup, rollback, timeout, cancellation, and retention
  fields to execution substrate records and projections

Expected outputs:
- policy field persistence and projection support
- integration tests proving policy state can be recorded and surfaced

Must be true before moving on:
- mutation-gated futures can display policy truth without hand-built UI logic

### Slice 1F - Minimal executor orchestration skeleton

Scope:
- define the smallest non-admission-widening executor/workspace orchestration
  service boundary
- keep execution mode truth explicit
- allow substrate smoke execution paths without claiming new real tool rows

Expected outputs:
- internal service boundaries for executor selection, workspace provisioning,
  and lifecycle state updates
- substrate smoke-test harness hook points

Must be true before moving on:
- the project can exercise substrate lifecycle without pretending broader real
  O3DE automation already exists

## Lane 2: Frontend Truth-Visibility Sequence

The frontend lane should begin only after the corresponding backend projection
fields exist.

### Slice 2A - Substrate summary visibility

Scope:
- show executor/workspace summary fields in run detail
- keep tool truth separate from substrate truth

Expected outputs:
- UI support for executor label, workspace state, runner family, and evidence
  summary
- component tests for truth-label combinations

### Slice 2B - Policy and evidence state visibility

Scope:
- surface approval, lock, backup, rollback, timeout, cancellation, and
  retention status fields
- expose evidence completeness without overstating admission status

Expected outputs:
- policy state UI strip or panel
- evidence-state UI rendering tests

### Slice 2C - Executor/workspace operator panels

Scope:
- add dedicated executor/workspace visibility where useful
- expose lifecycle and failure summaries for operator debugging

Expected outputs:
- operator-facing projections in dashboard or detail views
- UI tests proving substrate availability is not shown as proof of tool
  admission

### Slice 2D - Release-gate and conformance visibility

Scope:
- display per-surface admission state and evidence readiness
- present release-gate gaps without inventing backend truth

Expected outputs:
- UI support for matrix-backed admission and evidence status
- end-to-end truth-label checks

## Lane 3: Conformance Harness Sequence

This lane should start once backend fields and artifact hooks exist for the
relevant slice.

### Slice 3A - Record/projection contract tests

Scope:
- validate executor/workspace/binding serialization
- validate lifecycle-state transitions
- validate failure-category serialization

Expected outputs:
- backend tests for records, projections, and event payloads

### Slice 3B - Evidence and artifact retention tests

Scope:
- validate primary log, summary, verification, backup, and rollback linkage
- validate retention and cleanup labeling

Expected outputs:
- artifact persistence tests
- retention and retrieval tests

### Slice 3C - Policy-path rehearsal tests

Scope:
- validate approval-required flows
- validate lock-conflict flows
- validate backup-required and rollback-required state propagation
- validate timeout/cancellation labeling

Expected outputs:
- integration tests for policy attachment and failure categories

### Slice 3D - Substrate smoke and failure-rehearsal harness

Scope:
- validate non-admission-widening executor/workspace lifecycle smoke paths
- validate provision failure, timeout, cancellation, and cleanup-failure
  classification

Expected outputs:
- substrate smoke harness
- structured failure-rehearsal tests

### Slice 3E - Promotion-readiness harness

Scope:
- define the minimal reusable test bundle a future matrix row must satisfy
  before promotion from simulated-only to a stronger class

Expected outputs:
- reusable release-evidence checklist or harness definition
- row-level conformance checklist template

## Recommended Delivery Order Across Lanes

The safest Phase 6B delivery order is:

1. Lane 1A through 1C
2. Lane 3A through 3B
3. Lane 1D through 1E
4. Lane 2A through 2B
5. Lane 3C
6. Lane 1F
7. Lane 2C
8. Lane 3D through 3E
9. Lane 2D

This order keeps backend truth ahead of UI display and keeps conformance
collection ahead of admission promotion.

## Worktree Strategy Guidance

If parallel worktrees are used, recommended Phase 6B ownership is:
- backend lane worktree: record, projection, and policy plumbing
- frontend lane worktree: operator truth visibility only after backend fields
  land
- conformance lane worktree: tests and release-evidence harness

Parallel work should avoid overlapping writes until the prerequisite slice is
merged or otherwise stabilized.

## Admission Freeze Rule During Phase 6B Buildout

Until at least Lane 1E and Lane 3C are in place, the repository should avoid
promoting additional tool surfaces beyond current admitted truth.

This means:
- `project.inspect` remains the admitted real read-only baseline
- `build.configure` remains real plan-only
- `settings.patch` remains the only admitted mutation-gated real path
- broader runner-family admission should wait for substrate and conformance
  support

## Definition Of Done For This Planning Slice

This planning slice is complete when the repository has:
- a canonical implementation-adjacent Phase 6B delivery sequence
- explicit backend, frontend, and conformance lanes
- narrow slice ordering that respects truth dependencies
- explicit admission-freeze guidance during substrate buildout
- no wording drift that implies runtime implementation already exists

## Recommended Next Slice

After this sequencing document, the next narrow slice should move from planning
to the first implementation-ready backend breakdown:
- identify the concrete backend files and entities that would carry executor,
  workspace, and binding records
- define the minimal first persistence/API change set
- keep that slice code-adjacent but still truthful about what is not yet real

Primary planning source:
- `docs/PHASE-6B-BACKEND-MAPPING.md`
