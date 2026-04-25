# Phase 6B Execution Record Model

## Purpose

This document defines the contract-first execution record model for Phase 6B.

It exists to describe how remote executor, workspace, run-binding, lifecycle,
failure, and evidence state should be represented before runtime implementation
begins.

It does not implement persistence, APIs, or runtime behavior by itself.

Read this together with:
- `docs/PHASE-6B-REMOTE-EXECUTOR-CONTRACT.md`
- `docs/PHASE-6B-API-EVENT-CONTRACT.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`

## Branch Truth To Preserve

This model must preserve current branch truth:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` is the first admitted mutation-gated real path
- broader real adapter coverage is still narrow
- simulated vs real wording must remain explicit

This document defines future-ready record shapes. It does not claim the remote
executor substrate already exists.

## Goals

The Phase 6B execution record model should:
- give the control plane a stable representation of remote execution identity
- make workspace lifecycle auditable
- keep executor/workspace state distinct from tool-surface admission truth
- provide structured attachment points for approval, lock, backup, rollback,
  artifact, and log evidence
- support future real runner families without changing the meaning of already
  real bookkeeping records

## Non-Goals

This model is not:
- a database migration plan
- an API implementation spec
- proof that any new tool surface is real
- permission to widen current mutation or execution boundaries

## Primary Record Families

Phase 6B should introduce or plan for these primary record families:

1. executor record
2. workspace record
3. run execution binding record
4. lifecycle event record extensions
5. artifact/log linkage record extensions

These may eventually map to new tables, expanded entities, or related audit
records, but this slice does not choose the final storage mechanism.

## Executor Record

### Purpose

Represents the execution substrate that handled or attempted to handle a run.

### Minimum fields

- `executor_id`
- `executor_kind`
- `executor_label`
- `executor_host_label`
- `executor_capability_snapshot`
- `executor_version`
- `execution_mode_class`
- `supported_runner_families`
- `created_at`
- `updated_at`

### Field semantics

#### `executor_kind`

Examples:
- local process executor
- container-backed executor
- remote host executor
- remote session executor

The exact set can evolve, but the field must be stable enough for audit and UI
presentation.

#### `execution_mode_class`

Must remain explicit and aligned with branch truth:
- simulated
- real read-only
- real plan-only
- real mutation-gated

This field classifies the execution substrate context for a record.

It must not be allowed to blur per-tool admission status.

#### `supported_runner_families`

Should be a declared set rather than an inferred set, so the operator shell and
control plane can explain why a runner did or did not execute on a given
executor.

## Workspace Record

### Purpose

Represents the isolated filesystem and environment scope used for a run.

### Minimum fields

- `workspace_id`
- `workspace_kind`
- `workspace_root`
- `workspace_state`
- `workspace_cleanup_policy`
- `engine_binding`
- `project_binding`
- `runner_family`
- `owner_run_id`
- `owner_executor_id`
- `created_at`
- `activated_at`
- `completed_at`
- `cleaned_at`

### Field semantics

#### `workspace_kind`

Examples:
- ephemeral local workspace
- ephemeral remote workspace
- retained diagnostic workspace
- shared read-only workspace cache

This field should help explain isolation and retention behavior.

#### `workspace_state`

Recommended state machine:
- `provisioning`
- `ready`
- `preflight_running`
- `executing`
- `verifying`
- `retained`
- `cleanup_pending`
- `cleaned`
- `failed`

The state model should support both successful and partially failed runs without
losing audit clarity.

#### `engine_binding`

Should capture:
- engine root or engine identifier
- binding source
- binding confidence or validation result where needed

#### `project_binding`

Should capture:
- project root or project identifier
- binding source
- binding validation result

## Run Execution Binding Record

### Purpose

Binds an existing control-plane run to an executor, a workspace, and a runner
family attempt.

This avoids overloading the existing run record with all execution-substrate
details while preserving the reality that runs, executions, and artifacts are
already real bookkeeping entities on this branch.

### Minimum fields

- `run_execution_binding_id`
- `run_id`
- `executor_id`
- `workspace_id`
- `tool_name`
- `runner_family`
- `request_identity`
- `approval_ref`
- `lock_ref`
- `backup_requirement_class`
- `rollback_requirement_class`
- `execution_attempt_state`
- `started_at`
- `completed_at`

### Field semantics

#### `request_identity`

Should be stable enough to correlate:
- the run request
- the execution attempt
- any repeated retries or resumed attempts

#### `execution_attempt_state`

Recommended states:
- `queued`
- `preflight_failed`
- `ready`
- `running`
- `verification_failed`
- `completed`
- `cancelled`
- `timed_out`
- `failed`
- `rolled_back`

This state is attempt-scoped and distinct from workspace lifecycle state.

## Lifecycle State Machine

Phase 6B should track at least three related but separate state machines:

1. run state
2. execution attempt state
3. workspace lifecycle state

These should not be collapsed into one field.

### Why separation matters

- a run can exist before an executor or workspace is assigned
- a workspace can fail during provisioning before a tool actually runs
- a verification step can fail after execution while the workspace still exists
- rollback can occur after a failure while the run remains auditable as failed
  or recovered depending on policy

### Recommended relationship

- the run remains the top-level business record
- the execution attempt records substrate-specific progress
- the workspace record describes isolation and retention lifecycle

## Failure Taxonomy Fields

### Purpose

The record model should support structured failure categories rather than only
freeform error text.

### Minimum failure fields

- `failure_category`
- `failure_stage`
- `failure_code`
- `failure_summary`
- `failure_detail_ref`

### Recommended `failure_stage`

- provision
- bind
- preflight
- execute
- verify
- rollback
- cleanup

### Recommended `failure_category`

At minimum, align with the Phase 6B contract categories:
- executor unavailable
- workspace provision failed
- engine binding invalid
- project binding invalid
- prerequisite missing
- approval missing or denied
- lock unavailable
- backup failed
- runner launch failed
- runner timed out
- runner cancelled
- verification failed
- rollback failed
- cleanup failed

## Artifact And Log Linkage Contract

### Purpose

Phase 6B must preserve traceability from business run to substrate execution to
evidence outputs.

### Minimum linkage fields

- `primary_log_artifact_id`
- `summary_artifact_id`
- `backup_artifact_id`
- `rollback_artifact_id`
- `verification_artifact_id`
- `artifact_bundle_label`

These can be nullable depending on surface class, but the attachment points must
be explicit.

### Evidence expectations by class

#### Read-only or plan-only

Expected linkage:
- summary artifact
- primary log artifact
- provenance or verification artifact as applicable

#### Mutation-gated

Expected linkage:
- summary artifact
- primary log artifact
- backup artifact
- post-write verification artifact
- rollback artifact when rollback is triggered or required to be rehearsed

## Approval, Lock, Backup, And Rollback References

The model should attach these concerns by reference rather than burying them in
freeform summaries.

### Approval reference

Minimum:
- `approval_required`
- `approval_id`
- `approval_class`

### Lock reference

Minimum:
- `lock_required`
- `lock_scope`
- `lock_record_id`

### Backup reference

Minimum:
- `backup_required`
- `backup_class`
- `backup_artifact_id`
- `backup_result`

### Rollback reference

Minimum:
- `rollback_required`
- `rollback_class`
- `rollback_result`
- `rollback_verification_artifact_id`

## Operator-Facing Projection Requirements

The record model should support operator views that can truthfully answer:
- which executor handled this run
- which workspace it ran in
- which engine/project it was bound to
- what lifecycle state the workspace is in
- whether approval/lock/backup/rollback controls were applied
- where the logs and evidence artifacts live
- whether the run was simulated, real read-only, real plan-only, or real
  mutation-gated

These should be projected from structured fields, not assembled only from
unstructured logs.

## Compatibility With Existing Real Bookkeeping

This branch already has real:
- runs
- executions
- artifacts
- events

Phase 6B should extend those realities rather than replacing them.

Preferred direction:
- keep top-level run bookkeeping intact
- enrich execution records or bind them to executor/workspace records
- keep artifact records as the evidence layer
- use event records for lifecycle transitions and operator-facing audit

The future model should feel like an extension of the current control plane, not
a second parallel bookkeeping system.

## Suggested Incremental Delivery Order

The execution record model should be planned and eventually implemented in this
order:

1. vocabulary and canonical record fields
2. lifecycle state machine and failure taxonomy
3. artifact/log linkage fields
4. approval/lock/backup/rollback references
5. operator-facing projection requirements

## Definition Of Done For This Planning Slice

This planning slice is complete when the repository has:
- a canonical execution record model document
- explicit executor/workspace/binding record vocabulary
- explicit lifecycle and failure taxonomy planning
- explicit artifact/log linkage planning
- alignment with the Phase 6B remote executor contract
- no wording drift that implies runtime implementation already exists

## Recommended Next Planning Slice

After this model, the next narrow planning slice should define the Phase 6B API
and event contract:
- executor/workspace status endpoints or projections
- lifecycle event payloads
- run-to-executor/workspace summary projections
- operator-console truth labels for executor/workspace state

Primary planning source:
- `docs/PHASE-6B-API-EVENT-CONTRACT.md`
