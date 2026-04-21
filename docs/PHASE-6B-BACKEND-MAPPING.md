# Phase 6B Backend Mapping

## Purpose

This document defines the first code-adjacent backend mapping for Phase 6B.

It identifies which current backend records, tables, repositories, services,
and API response models should carry future executor, workspace, and run-binding
state before any remote executor runtime implementation begins.

It does not implement migrations, runtime orchestration, or new endpoints by
itself.

Read this together with:
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
- `docs/PHASE-6B-API-EVENT-CONTRACT.md`
- `docs/PHASE-6B-POLICY-AND-ADMISSION-CONTRACT.md`
- `docs/PHASE-6B-RELEASE-AND-CONFORMANCE-PLAN.md`
- `docs/PHASE-6B-IMPLEMENTATION-SEQUENCE.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`

## Branch Truth To Preserve

This mapping must preserve current branch truth:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real
- Docker/compose baseline and CI stack validation exist
- local Docker startup is verified
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` is the first admitted mutation-gated real path
- broader real adapter coverage is still narrow
- simulated vs real wording must remain explicit

This document defines where Phase 6B state should attach in the current
backend.
It does not claim that remote executor runtime, workspace lifecycle APIs, or
broader real tool admission already exist.

## Current Backend Truth Surfaces

The current backend is already centered on real control-plane bookkeeping:

- `backend/app/models/control_plane.py`
- `backend/app/repositories/control_plane.py`
- `backend/app/services/db.py`
- `backend/app/services/runs.py`
- `backend/app/services/executions.py`
- `backend/app/services/artifacts.py`
- `backend/app/services/events.py`
- `backend/app/services/summary.py`
- `backend/app/models/api.py`
- `backend/app/api/routes/runs.py`
- `backend/app/api/routes/executions.py`
- `backend/app/api/routes/artifacts.py`
- `backend/app/api/routes/summary.py`

That is the correct backbone for Phase 6B.

The goal should be to extend this backbone rather than introduce a second,
parallel substrate store that bypasses current runs, executions, artifacts, and
events.

## Current Persistence Baseline

`backend/app/services/db.py` currently initializes and owns these SQLite tables:

- `runs`
- `approvals`
- `locks`
- `events`
- `executions`
- `artifacts`

This means the truthful current baseline is:
- run identity is already real
- execution attempts are already real bookkeeping entities
- artifact linkage is already real
- policy and lock records are already real
- lifecycle events are already real

Phase 6B should build on that existing schema rather than replace it.

## Existing Record Ownership

### Run record ownership

Current owner:
- `RunRecord` in `backend/app/models/control_plane.py`
- stored in `runs`
- managed by `RunsService`

Current responsibility:
- business request identity
- top-level run status
- approval and granted-lock references
- execution mode label
- result summary

Phase 6B recommendation:
- keep `RunRecord` as the top-level business entity
- do not overload `RunRecord` with full workspace lifecycle state
- allow it to keep high-level summary pointers only

### Execution record ownership

Current owner:
- `ExecutionRecord` in `backend/app/models/control_plane.py`
- stored in `executions`
- managed by `ExecutionsService`

Current responsibility:
- per-run execution attempt identity
- execution status
- logs
- warnings
- artifact ids
- details blob
- result summary

Phase 6B recommendation:
- make `ExecutionRecord` the primary bridge into substrate-aware state
- attach executor/workspace binding references here first
- keep attempt-level status here rather than moving it onto runs
- preserve `details` for extensible metadata, but do not rely on `details` alone
  for long-term canonical executor/workspace fields

### Artifact record ownership

Current owner:
- `ArtifactRecord` in `backend/app/models/control_plane.py`
- stored in `artifacts`
- managed by `ArtifactsService`

Current responsibility:
- execution-linked artifact identity
- label, kind, URI/path
- simulated flag
- metadata blob

Phase 6B recommendation:
- keep `ArtifactRecord` as the evidence anchor
- extend artifact metadata and linkage semantics before inventing a separate
  evidence system
- use explicit artifact roles for primary log, summary, verification, backup,
  and rollback evidence

### Event record ownership

Current owner:
- `EventRecord` in `backend/app/models/control_plane.py`
- stored in `events`
- managed by `EventsService`

Current responsibility:
- lifecycle and audit event identity
- severity
- human-readable message
- details payload

Phase 6B recommendation:
- keep `EventRecord` as the event timeline anchor
- enrich event details with structured executor/workspace transition fields
- avoid building a separate event feed system outside current events

## Recommended Phase 6B Record Attachments

### Executor record

Recommended persistence choice:
- new dedicated executor table and model

Reason:
- executor identity is reusable across many runs
- executor availability and capability snapshots are not attempt-local
- overloading execution `details` would make projection logic brittle

Recommended future backend ownership:
- new `ExecutorRecord`
- new repository methods alongside the current control-plane repository or in an
  adjacent repository module that still shares the same DB layer

### Workspace record

Recommended persistence choice:
- new dedicated workspace table and model

Reason:
- workspace lifecycle is distinct from run status and execution attempt status
- workspace retention and cleanup state need independent auditability
- multiple artifacts and events may point at the same workspace lifecycle

Recommended future backend ownership:
- new `WorkspaceRecord`
- persisted independently, referenced from execution attempts

### Run execution binding

Recommended persistence choice:
- extend `ExecutionRecord` first, optionally with a later dedicated binding
  table only if the current execution table becomes too overloaded

Reason:
- the current backend already treats executions as the per-run attempt record
- adding executor and workspace references to executions preserves continuity
- it avoids introducing an unnecessary third attempt-like entity too early

Recommended first-step fields on execution ownership:
- `executor_id`
- `workspace_id`
- `runner_family`
- `execution_attempt_state`
- `failure_category`
- `failure_stage`
- `approval_class`
- `lock_scope`
- `backup_class`
- `rollback_class`
- `retention_class`

## Recommended Schema Direction

### Keep and extend existing tables

Keep:
- `runs`
- `executions`
- `artifacts`
- `events`
- `approvals`
- `locks`

Extend first:
- `executions`
- `artifacts`
- `events`

Add next:
- `executors`
- `workspaces`

### Why this order is safest

- the current repository already lists and renders runs, executions, artifacts,
  and events
- summary aggregation already depends on those real tables
- extending them first preserves API continuity and minimizes drift
- adding `executors` and `workspaces` later gives Phase 6B stable reusable
  identities without breaking current cards and summary endpoints

## Existing API Shapes To Extend

### `backend/app/models/api.py`

This file is the main current place where operator-facing list and summary
models live.

Phase 6B should extend it with:
- executor status response models
- workspace status response models
- run-to-executor/workspace summary models
- policy-state projection models
- evidence completeness projection models

It should also extend existing card models with substrate-aware summary fields
once backend persistence exists.

### Existing list card models to extend later

- `RunListItem`
- `ExecutionListItem`
- `ArtifactListItem`
- `ControlPlaneSummaryResponse`

Recommended first additions after persistence exists:
- `runner_family`
- `executor_id` or `executor_label`
- `workspace_id`
- `workspace_state`
- `execution_attempt_state`
- policy-state labels where appropriate

### Existing route files to extend later

- `backend/app/api/routes/runs.py`
- `backend/app/api/routes/executions.py`
- `backend/app/api/routes/artifacts.py`
- `backend/app/api/routes/summary.py`

Recommended future direction:
- extend existing run and execution detail routes before creating a large number
  of brand-new top-level endpoints
- add dedicated executor/workspace status routes only when reusable projections
  exist in persistence and services

## Existing Services To Extend

### `RunsService`

Keep responsibility for:
- top-level run lifecycle
- top-level operator filtering

Do not make it the owner of:
- workspace lifecycle state
- executor availability state

Recommended Phase 6B role:
- join preferred execution substrate summary back onto run cards and run detail

### `ExecutionsService`

Recommended primary Phase 6B owner for first implementation slices:
- execution-attempt substrate fields
- execution-to-executor/workspace linkage
- execution failure taxonomy
- execution policy-state summary fields

This is the most natural first landing zone for Phase 6B state in the current
backend.

### `ArtifactsService`

Recommended Phase 6B role:
- classify evidence artifacts by substrate role
- expose richer evidence completeness and retrieval semantics

### `EventsService`

Recommended Phase 6B role:
- emit structured executor/workspace lifecycle events
- preserve existing event timeline model while enriching details

### `ControlPlaneSummaryService`

Recommended Phase 6B role:
- aggregate executor/workspace counts and health summaries
- aggregate evidence completeness and failure categories
- avoid inferring tool admission from substrate availability

## Repository Layer Recommendation

`backend/app/repositories/control_plane.py` already centralizes CRUD for real
bookkeeping entities.

Recommended Phase 6B approach:
- keep one coherent repository layer
- add executor/workspace CRUD and projection queries there or in closely related
  modules
- avoid bypassing the repository layer with ad hoc SQL in services or routes

This keeps migrations, JSON encoding, and row-to-model decoding consistent with
the existing architecture.

## Minimal First Change Set Recommendation

The narrowest truthful first implementation slice after this document should be:

1. extend persistence planning around `executions`, `events`, and `artifacts`
2. add new backend models for `ExecutorRecord` and `WorkspaceRecord`
3. add nullable executor/workspace linkage fields to execution persistence
4. add decoding/encoding support in the repository layer
5. add no new admission claims and no frontend truth changes yet

This produces substrate-aware bookkeeping before any runtime executor service is
introduced.

## Fields Best Kept In Structured Columns First

The following should become structured persisted fields rather than living only
inside freeform `details` or `metadata` blobs:

- `executor_id`
- `workspace_id`
- `runner_family`
- `execution_attempt_state`
- `failure_category`
- `failure_stage`
- `retention_class`

These are central to Phase 6B projections and should not remain stringly-typed
UI conventions.

## Fields Reasonable To Keep In Details Or Metadata Initially

The following can remain in JSON blobs early, as long as their existence is
intentional and documented:

- executor capability snapshot details
- engine binding validation detail
- project binding validation detail
- environment snapshot detail
- long-form failure detail
- artifact provenance detail

This keeps the first persistence slice narrow while still moving core identity
and lifecycle fields into structured storage.

## Summary Endpoint Mapping Recommendation

The existing `/summary` path should remain a branch-level operator summary, but
Phase 6B should eventually let it aggregate:

- executor availability counts
- workspace lifecycle counts
- execution-attempt state counts
- failure-category counts
- evidence completeness counts

It should not become the only place Phase 6B truth exists.

Detailed substrate projections should still live on run, execution, executor,
workspace, and event-oriented responses.

## Guardrails For Implementation

When implementation starts, backend slices should:
- extend current real bookkeeping rather than replace it
- keep `RunRecord` business-oriented
- use `ExecutionRecord` as the first substrate attachment point
- keep artifacts and events as first-class evidence and audit layers
- avoid any schema change that implies broader real tool admission on its own

## Definition Of Done For This Planning Slice

This planning slice is complete when the repository has:
- a canonical backend mapping document for Phase 6B
- explicit mapping from current real records to future executor/workspace state
- a minimal first backend change-set recommendation
- clear guidance on what should extend existing tables versus new tables
- no wording drift that implies runtime implementation already exists

## Recommended Next Slice

After this mapping document, the next narrow slice should be the first actual
implementation-ready backend spec:
- identify the exact migration additions for `executions`, `events`, and
  `artifacts`
- define initial `ExecutorRecord` and `WorkspaceRecord` model fields
- define the first route/model changes that can surface substrate truth without
  widening admitted tool coverage

Primary planning source:
- `docs/PHASE-6B-PERSISTENCE-CHANGESET.md`
