# Phase 6B Persistence Change Set

## Purpose

This document defines the first implementation-ready persistence change set for
Phase 6B.

It names the exact tables, columns, backend models, repository methods, and
backward-compatible API additions that should land before any remote executor
runtime implementation begins.

It does not implement schema migrations, runtime services, or route changes by
itself.

Read this together with:
- `docs/PHASE-6B-BACKEND-MAPPING.md`
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
- `docs/PHASE-6B-API-EVENT-CONTRACT.md`
- `docs/PHASE-6B-POLICY-AND-ADMISSION-CONTRACT.md`
- `docs/PHASE-6B-IMPLEMENTATION-SEQUENCE.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`

## Branch Truth To Preserve

This change set must preserve current branch truth:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real
- Docker/compose baseline and CI stack validation exist
- local Docker startup is verified
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` is the first admitted mutation-gated real path
- broader real adapter coverage is still narrow
- simulated vs real wording must remain explicit

This document defines the first substrate-aware schema and model expansion.
It does not claim that remote executor runtime, workspace lifecycle APIs, or
broader real tool admission already exist.

## Change-Set Objective

The first Phase 6B backend implementation slice should:
- preserve all current run, execution, artifact, and event behavior
- add substrate-aware identity fields without breaking current APIs
- make executor/workspace identity queryable through structured storage
- keep policy and evidence attachment points explicit
- avoid any schema move that implies broader real execution coverage by itself

## Database Change Set

### Existing tables to extend

Extend:
- `executions`
- `events`
- `artifacts`

Keep unchanged in the first slice except for compatibility review:
- `runs`
- `approvals`
- `locks`

### New tables to add

Add:
- `executors`
- `workspaces`

## Exact Table Additions

### `executions` table additions

Add nullable columns:
- `executor_id TEXT`
- `workspace_id TEXT`
- `runner_family TEXT`
- `execution_attempt_state TEXT`
- `failure_category TEXT`
- `failure_stage TEXT`
- `approval_class TEXT`
- `lock_scope TEXT`
- `backup_class TEXT`
- `rollback_class TEXT`
- `retention_class TEXT`

Foreign key direction:
- `executor_id` should reference `executors(id)` once the table exists
- `workspace_id` should reference `workspaces(id)` once the table exists

Reason for nullability:
- existing rows must remain readable
- current branch data should not need backfill before the first release of the
  schema change
- simulated and legacy execution rows can continue to exist without invented
  substrate values

### `events` table additions

Add nullable columns:
- `execution_id TEXT`
- `executor_id TEXT`
- `workspace_id TEXT`
- `event_type TEXT`
- `previous_state TEXT`
- `current_state TEXT`
- `failure_category TEXT`

Keep:
- existing `category`
- existing `severity`
- existing `message`
- existing `details`

Reason:
- current event list and timeline behavior should remain backward-compatible
- structured transition fields should coexist with the current human-readable
  event baseline

### `artifacts` table additions

Add nullable columns:
- `artifact_role TEXT`
- `executor_id TEXT`
- `workspace_id TEXT`
- `retention_class TEXT`
- `evidence_completeness TEXT`

Keep:
- existing `metadata` blob

Reason:
- artifact role and substrate linkage are central to Phase 6B evidence queries
- detailed provenance can remain in metadata initially

### `executors` table

Add new table:

- `id TEXT PRIMARY KEY`
- `executor_kind TEXT NOT NULL`
- `executor_label TEXT NOT NULL`
- `executor_host_label TEXT NOT NULL`
- `execution_mode_class TEXT NOT NULL`
- `availability_state TEXT NOT NULL`
- `supported_runner_families TEXT NOT NULL`
- `capability_snapshot TEXT NOT NULL`
- `last_heartbeat_at TEXT`
- `last_failure_summary TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

Notes:
- `supported_runner_families` may be stored as JSON text in the first slice
- `capability_snapshot` may be stored as JSON text in the first slice

### `workspaces` table

Add new table:

- `id TEXT PRIMARY KEY`
- `workspace_kind TEXT NOT NULL`
- `workspace_root TEXT NOT NULL`
- `workspace_state TEXT NOT NULL`
- `cleanup_policy TEXT NOT NULL`
- `retention_class TEXT NOT NULL`
- `engine_binding TEXT NOT NULL`
- `project_binding TEXT NOT NULL`
- `runner_family TEXT NOT NULL`
- `owner_run_id TEXT`
- `owner_execution_id TEXT`
- `owner_executor_id TEXT`
- `created_at TEXT NOT NULL`
- `activated_at TEXT`
- `completed_at TEXT`
- `cleaned_at TEXT`
- `last_failure_summary TEXT`

Notes:
- `engine_binding` and `project_binding` may be stored as JSON text in the
  first slice
- ownership references may be nullable for partially provisioned or retained
  workspaces

## Recommended Index Additions

Add indexes:
- `idx_executions_executor_id` on `executions(executor_id, started_at DESC)`
- `idx_executions_workspace_id` on `executions(workspace_id, started_at DESC)`
- `idx_events_execution_id` on `events(execution_id, created_at DESC)`
- `idx_events_workspace_id` on `events(workspace_id, created_at DESC)`
- `idx_artifacts_execution_role` on `artifacts(execution_id, artifact_role, created_at DESC)`
- `idx_workspaces_owner_run_id` on `workspaces(owner_run_id, created_at DESC)`
- `idx_workspaces_state` on `workspaces(workspace_state, created_at DESC)`
- `idx_executors_availability_state` on `executors(availability_state, updated_at DESC)`

These should support operator projections without needing full table scans.

## Backend Model Additions

### Extend `ExecutionRecord`

File:
- `backend/app/models/control_plane.py`

Add nullable fields:
- `executor_id: str | None = None`
- `workspace_id: str | None = None`
- `runner_family: str | None = None`
- `execution_attempt_state: str | None = None`
- `failure_category: str | None = None`
- `failure_stage: str | None = None`
- `approval_class: str | None = None`
- `lock_scope: str | None = None`
- `backup_class: str | None = None`
- `rollback_class: str | None = None`
- `retention_class: str | None = None`

### Extend `EventRecord`

Add nullable fields:
- `execution_id: str | None = None`
- `executor_id: str | None = None`
- `workspace_id: str | None = None`
- `event_type: str | None = None`
- `previous_state: str | None = None`
- `current_state: str | None = None`
- `failure_category: str | None = None`

### Extend `ArtifactRecord`

Add nullable fields:
- `artifact_role: str | None = None`
- `executor_id: str | None = None`
- `workspace_id: str | None = None`
- `retention_class: str | None = None`
- `evidence_completeness: str | None = None`

### Add `ExecutorRecord`

Add new model in:
- `backend/app/models/control_plane.py`

Initial fields:
- `id`
- `executor_kind`
- `executor_label`
- `executor_host_label`
- `execution_mode_class`
- `availability_state`
- `supported_runner_families`
- `capability_snapshot`
- `last_heartbeat_at`
- `last_failure_summary`
- `created_at`
- `updated_at`

### Add `WorkspaceRecord`

Add new model in:
- `backend/app/models/control_plane.py`

Initial fields:
- `id`
- `workspace_kind`
- `workspace_root`
- `workspace_state`
- `cleanup_policy`
- `retention_class`
- `engine_binding`
- `project_binding`
- `runner_family`
- `owner_run_id`
- `owner_execution_id`
- `owner_executor_id`
- `created_at`
- `activated_at`
- `completed_at`
- `cleaned_at`
- `last_failure_summary`

## Repository Method Additions

File:
- `backend/app/repositories/control_plane.py`

### Extend existing execution methods

Update:
- `create_execution`
- `list_executions`
- `get_execution`
- `update_execution`
- `_row_to_execution`

Requirement:
- support the new nullable execution columns
- preserve compatibility with existing rows

### Extend existing event methods

Update:
- `create_event`
- `list_events`

Requirement:
- support the new nullable event columns
- preserve existing event cards and legacy event rows

### Extend existing artifact methods

Update:
- `create_artifact`
- `list_artifacts`
- `get_artifact`
- `_row_to_artifact`

Requirement:
- support new artifact role and substrate linkage fields

### Add executor repository methods

Add:
- `create_executor`
- `list_executors`
- `get_executor`
- `update_executor`

### Add workspace repository methods

Add:
- `create_workspace`
- `list_workspaces`
- `get_workspace`
- `update_workspace`

### Add projection query helpers

Add narrowly scoped helpers for:
- `list_workspace_records_by_run_id`
- `list_events_for_execution`
- `list_artifacts_by_role_for_execution`

Avoid adding complex projection SQL until the first persistence slice is stable.

## API Model Additions

File:
- `backend/app/models/api.py`

### Backward-compatible extensions to existing card models

#### `ExecutionListItem`

Add nullable fields:
- `executor_id`
- `workspace_id`
- `runner_family`
- `execution_attempt_state`
- `failure_category`

#### `ArtifactListItem`

Add nullable fields:
- `artifact_role`
- `workspace_id`
- `executor_id`
- `evidence_completeness`

#### `RunListItem`

Add nullable fields sourced from preferred execution:
- `runner_family`
- `executor_id`
- `workspace_id`
- `workspace_state`
- `execution_attempt_state`

#### `ControlPlaneSummaryResponse`

Add optional aggregate maps:
- `executions_by_attempt_state`
- `executions_by_failure_category`
- `workspaces_total`
- `workspaces_by_state`
- `executors_total`
- `executors_by_availability_state`

### New response models to add

Add:
- `ExecutorStatusItem`
- `ExecutorStatusResponse`
- `WorkspaceStatusItem`
- `WorkspaceStatusResponse`

These can be defined in the first persistence slice even if routes for them land
later, as long as the shapes stay marked as future-facing projections.

## Route Additions And Limits

The first persistence slice should not add a large new API surface.

### Allowed in the first implementation slice

- extend `GET /executions`
- extend `GET /executions/{execution_id}`
- extend `GET /artifacts`
- extend `GET /artifacts/{artifact_id}`
- extend `GET /runs/cards`
- extend `GET /summary`

### Prefer deferred to the next slice

- dedicated `/executors` routes
- dedicated `/workspaces` routes
- dedicated Phase 6B event feed routes

Reason:
- the first slice should prove storage and backward-compatible projection before
  multiplying route surface area

## Backward-Compatibility Rules

The first implementation slice must preserve:
- existing reads of legacy rows with null substrate fields
- current route compatibility for consumers that ignore new fields
- current run/execution/artifact/event semantics
- current execution-mode truth labeling

The first slice must not:
- require existing rows to be rewritten before startup
- infer fake executor or workspace ids for legacy records
- change current admitted tool status labels

## Migration Strategy Recommendation

The first migration should be staged in this order:

1. add nullable columns to `executions`
2. add nullable columns to `events`
3. add nullable columns to `artifacts`
4. create `executors`
5. create `workspaces`
6. create indexes
7. update row decoders and repository writes

This order keeps old rows valid throughout the migration.

## Test Scope For The First Persistence Slice

The first implementation branch should add tests for:
- database initialization with the new tables and columns
- repository round-trips for extended `ExecutionRecord`
- repository round-trips for extended `EventRecord`
- repository round-trips for extended `ArtifactRecord`
- repository CRUD for `ExecutorRecord`
- repository CRUD for `WorkspaceRecord`
- route compatibility when substrate fields are null
- summary compatibility when no executor/workspace records exist yet

It does not need to add real executor runtime tests yet.

## Guardrails

When this change set is implemented:
- no new surface should be promoted beyond current admitted truth
- `ExecutionRecord` should remain the first substrate attachment point
- `RunRecord` should stay business-oriented
- artifacts and events should remain the evidence and audit anchors
- JSON blobs should be used only for second-order detail, not core identity

## Definition Of Done For This Planning Slice

This planning slice is complete when the repository has:
- a canonical Phase 6B persistence change-set document
- exact table and column additions for the first backend slice
- initial model and repository method definitions
- backward-compatible API extension guidance
- migration ordering and test-scope guidance
- no wording drift that implies runtime implementation already exists

## Recommended Next Slice

After this persistence spec, the next narrow slice should be the first actual
implementation branch for Phase 6B backend storage:
- extend `backend/app/services/db.py`
- extend `backend/app/models/control_plane.py`
- extend `backend/app/repositories/control_plane.py`
- add the first compatibility tests
- keep routes minimal and do not widen admitted tool coverage
