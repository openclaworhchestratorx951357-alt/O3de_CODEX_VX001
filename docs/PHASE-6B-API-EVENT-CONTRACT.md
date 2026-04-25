# Phase 6B API And Event Contract

## Purpose

This document defines the contract-first API and event model for Phase 6B.

It exists to describe how executor/workspace state should be exposed to the
control plane and operator console before runtime implementation begins.

It does not implement routes, services, schemas, or event producers by itself.

Read this together with:
- `docs/PHASE-6B-REMOTE-EXECUTOR-CONTRACT.md`
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`

## Branch Truth To Preserve

This contract must preserve current branch truth:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` is the first admitted mutation-gated real path
- broader real adapter coverage is still narrow
- simulated vs real wording must remain explicit

This document defines future executor/workspace visibility and event contracts.
It distinguishes implemented read-only projection slices from remaining
contract-only API and event streams.

## Current Implementation Checkpoint

The first read-only projection slice now exists:
- `GET /executors/status` exposes executor status projections.
- `GET /workspaces/status` exposes workspace status projections.
- `GET /runs/substrate-summary` exposes run-to-executor/workspace summary
  projections.

These endpoints are projections over persisted control-plane records. They do
not provision executors, run tools, mutate workspaces, prove runtime execution,
or admit any additional real tool surface.

Lifecycle event payload streams remain contract-only until implemented in a
later slice.

## Goals

The Phase 6B API and event contract should:
- expose executor/workspace state in a structured, operator-usable way
- preserve separation between run state, execution-attempt state, and workspace
  lifecycle state
- give the operator console truthful projections rather than ad hoc log
  summaries
- make failure, backup, rollback, and verification outcomes visible without
  overstating real execution coverage

## Non-Goals

This contract is not:
- a broad implementation of every endpoint or projection family
- an authorization model by itself
- proof that executor/workspace runtime exists
- permission to broaden any tool surface from simulated to real

## Projection Families

Phase 6B should eventually expose four main projection families:

1. executor status projections
2. workspace status projections
3. run-to-executor/workspace summary projections
4. lifecycle event payloads

These projections should be grounded in the execution record model rather than
invented independently in the operator UI.

## Executor Status Projection

### Purpose

Provide a concise operator-facing view of executor identity, health, and
capability surface.

### Minimum projection fields

- `executor_id`
- `executor_label`
- `executor_kind`
- `executor_host_label`
- `execution_mode_class`
- `supported_runner_families`
- `availability_state`
- `last_heartbeat_at`
- `active_workspace_count`
- `active_run_count`
- `last_failure_summary`

### Recommended `availability_state`

- `available`
- `degraded`
- `unreachable`
- `maintenance`
- `unknown`

### Truth-label requirement

Executor availability must not be described as proof that any specific tool
surface is real.

Executor status says whether substrate infrastructure appears available, not
whether a given tool row is admitted.

## Workspace Status Projection

### Purpose

Provide an operator-facing view of workspace identity, lifecycle, binding, and
cleanup/retention state.

### Minimum projection fields

- `workspace_id`
- `workspace_kind`
- `workspace_state`
- `engine_binding_label`
- `project_binding_label`
- `runner_family`
- `owner_run_id`
- `created_at`
- `updated_at`
- `cleanup_policy`
- `retention_label`
- `last_failure_summary`

### Recommended `retention_label`

- `ephemeral`
- `retained-for-evidence`
- `retained-for-rollback`
- `cleanup-pending`
- `cleaned`

### Truth-label requirement

Workspace state must describe execution isolation and retention truthfully.

It must not imply successful runner completion or admitted real execution unless
those are separately confirmed by execution-attempt and tool-surface truth.

## Run-To-Executor/Workspace Summary Projection

### Purpose

Give the operator console one clear summary linking business run state to
execution substrate state.

### Minimum projection fields

- `run_id`
- `tool_name`
- `execution_mode_class`
- `runner_family`
- `executor_id`
- `executor_label`
- `workspace_id`
- `workspace_state`
- `execution_attempt_state`
- `approval_state_label`
- `lock_state_label`
- `backup_state_label`
- `rollback_state_label`
- `verification_state_label`
- `primary_log_artifact_id`
- `summary_artifact_id`
- `final_status_reason`

### Projection rule

This projection should answer:
- where the run executed
- under which runner family
- whether approval/lock/backup/rollback controls attached
- what the current attempt state is
- what the workspace state is
- where the main evidence lives

It should not require the operator to reconstruct all of this from freeform
event logs.

## Lifecycle Event Payload Contract

### Purpose

Define structured event payloads for executor/workspace lifecycle transitions so
the event stream can remain meaningful and auditable.

### Required event families

- executor availability changed
- workspace provision started
- workspace provision completed
- workspace provision failed
- preflight started
- preflight failed
- runner started
- runner completed
- runner failed
- verification started
- verification failed
- rollback started
- rollback completed
- rollback failed
- cleanup started
- cleanup completed
- cleanup failed

### Minimum payload fields

- `event_type`
- `event_timestamp`
- `run_id`
- `executor_id`
- `workspace_id`
- `tool_name`
- `runner_family`
- `execution_mode_class`
- `previous_state`
- `current_state`
- `failure_category`
- `summary`
- `artifact_refs`

### Payload rules

- `previous_state` and `current_state` should reflect the specific state machine
  relevant to the event
- `failure_category` should be null for non-failure events
- `artifact_refs` should be used only when the event creates or clarifies
  evidence outputs

## Operator-Console Truth Labels

Phase 6B should define operator-facing labels that separate substrate truth from
tool admission truth.

### Required label classes

- executor availability label
- workspace lifecycle label
- execution attempt label
- tool-surface truth label
- evidence completeness label

### Labeling rule

The operator console must not collapse these into one "status" word.

For example:
- executor available + workspace ready + tool simulated
- executor available + workspace executing + tool real plan-only
- executor degraded + run failed preflight + tool mutation-gated candidate

This separation is necessary to avoid overstating capability.

## Evidence Exposure Rules

The API/event contract should expose evidence progressively:

### Summary layer

For list and dashboard surfaces:
- summary artifact presence
- main status reason
- lifecycle state
- truth label

### Detail layer

For run/execution detail views:
- full artifact references
- detailed failure category
- backup/rollback evidence
- verification evidence
- streamed or retained log references

### Rule

The summary layer should remain concise, but it must still expose enough truth
to distinguish:
- substrate availability problems
- tool admission limitations
- preflight failures
- execution failures
- verification failures

## Suggested Endpoint / Projection Shapes

The current implementation exposes the first three projection families as:
- `GET /executors/status`
- `GET /workspaces/status`
- `GET /runs/substrate-summary`

Future slices should still support projections equivalent to:

- executor status collection
- workspace status collection
- run execution substrate summary
- lifecycle event feed

Remaining lifecycle event projections may eventually appear as:
- dedicated endpoints
- embedded fields on run/execution detail responses
- operator summary panels
- event timeline enrichments

## Compatibility With Existing Real Records

Phase 6B API/event work should extend existing real bookkeeping, not replace it.

Recommended direction:
- keep runs as the top-level operator entity
- enrich execution detail views with executor/workspace summary fields
- keep artifacts as the evidence anchor
- use event records for lifecycle transition visibility

## Definition Of Done For This Planning Slice

This planning slice is complete when the repository has:
- a canonical API/event contract document for Phase 6B
- explicit projection families for executor/workspace state
- explicit lifecycle event payload requirements
- explicit operator-console truth label rules
- alignment with the execution record model and remote executor contract
- no wording drift that implies runtime implementation already exists

## Recommended Next Planning Slice

After this contract, the next narrow planning slice should define the Phase 6B
admission and policy interaction model:
- executor/workspace approval attachment flow
- lock scope model by workspace and runner family
- backup/rollback policy classes
- cancellation and timeout policy behavior
- evidence retention policy classes

Primary planning source:
- `docs/PHASE-6B-POLICY-AND-ADMISSION-CONTRACT.md`
