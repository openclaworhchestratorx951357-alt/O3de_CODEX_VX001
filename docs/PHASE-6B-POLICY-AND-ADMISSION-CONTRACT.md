# Phase 6B Policy And Admission Contract

## Purpose

This document defines the contract-first policy and admission model for
Phase 6B.

It exists to describe how approval, lock, backup, rollback, cancellation,
timeout, retention, and admission controls should attach to remote executor and
workspace flows before runtime implementation begins.

It does not implement policy engines, lock services, executor services, or
frontend behavior by itself.

Read this together with:
- `docs/PHASE-6B-REMOTE-EXECUTOR-CONTRACT.md`
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
- `docs/PHASE-6B-API-EVENT-CONTRACT.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`

## Branch Truth To Preserve

This contract must preserve current branch truth:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` is the first admitted mutation-gated real path
- broader real adapter coverage is still narrow
- simulated vs real wording must remain explicit

This document defines future policy attachment and admission rules.
It does not claim that broader remote execution or broader real tool coverage
already exists.

## Goals

The Phase 6B policy and admission contract should:
- define where approval and lock controls attach in executor/workspace flows
- define how backup and rollback requirements are classified
- define how cancellation and timeout behavior should be represented
- define evidence-retention and cleanup policy classes
- define the minimum admission standard future tool surfaces must satisfy before
  being widened from simulated or narrow real status

## Non-Goals

This contract is not:
- a runtime authorization implementation
- a final policy DSL
- proof that any new tool surface is admitted as real
- permission to widen mutation or execution scope without matrix-backed review

## Policy Attachment Model

Phase 6B should treat policy controls as first-class execution attachments, not
as freeform operator notes.

Every future real or candidate-real execution path should be able to express:
- approval class
- lock class
- backup class
- rollback class
- timeout class
- cancellation class
- retention class
- admission class

These should attach to the run execution binding and remain visible in operator
projections and evidence records.

## Approval Attachment Flow

### Purpose

Approval must attach before a mutating or otherwise sensitive runner can cross
from planned to executable state.

### Required flow stages

1. request classification
2. approval requirement evaluation
3. approval record binding
4. approval decision capture
5. execution release or denial

### Required approval fields

- `approval_required`
- `approval_class`
- `approval_id`
- `approval_state`
- `approval_decided_at`
- `approval_scope_summary`

### Recommended approval classes

- `none`
- `read-sensitive`
- `plan-sensitive`
- `mutation-required`
- `release-sensitive`

### Rules

- a future runner must not infer that approval is unnecessary solely because an
  executor is available
- approval evaluation must remain distinct from tool truth labeling
- a denied or missing approval must produce a structured non-execution outcome,
  not only a freeform note

## Lock Scope Model

### Purpose

Locks must prevent overlapping operations from silently colliding on shared
engine, project, workspace, or target resources.

### Required lock dimensions

- scope target
- scope granularity
- owner identity
- acquisition result
- release result

### Recommended lock scopes

- `project-manifest`
- `settings-registry-target`
- `gem-registration-surface`
- `build-tree`
- `editor-session`
- `asset-pipeline-project`
- `validation-sequence`
- `render-capture-target`
- `workspace`

### Rules by runner family

#### File / manifest runner

Should lock the smallest truthful mutable target set, such as:
- `project-manifest`
- `settings-registry-target`
- `gem-registration-surface`

#### CLI runner

Should lock based on the mutation or side-effect boundary, such as:
- `build-tree`
- `project-manifest`
- `workspace`

#### Editor session runner

Should treat session occupancy and project/level context as lockable resources.

#### Asset pipeline runner

Should treat project pipeline state and shared processor outputs as lockable
resources when concurrent runs would create ambiguity.

#### Test runner

Should lock sequence ownership when result attribution or shared environment
state would become ambiguous.

## Backup Requirement Classes

### Purpose

Backup policy must be defined before a mutating path can be considered
production-admissible.

### Recommended backup classes

- `none`
- `manifest-snapshot`
- `settings-snapshot`
- `workspace-diff-bundle`
- `artifact-bundle-only`
- `release-bundle`

### Rules

- read-only and plan-only paths may legitimately use `none`
- mutation-gated paths should declare an explicit backup class before execution
- backup completion should create structured evidence, not only a boolean flag
- backup failure should be classified before runner execution continues when the
  matrix marks backup as required

## Rollback Requirement Classes

### Purpose

Rollback policy must describe how the system returns to a safe or known state if
mutation fails or post-write verification does not pass.

### Recommended rollback classes

- `none`
- `restore-backed-file`
- `restore-settings-target`
- `workspace-revert`
- `reconstruct-from-backup-bundle`
- `manual-operator-recovery`

### Rules

- a rollback class must be declared before a mutation-gated runner begins
- `manual-operator-recovery` is allowed only when the surface matrix and UI
  explicitly label it as such
- rollback completion must still require post-rollback verification evidence
- rollback capability must not be implied by backup existence alone

## Cancellation And Timeout Policy

### Purpose

Cancellation and timeout behavior must be auditable and consistent across runner
families.

### Required timeout fields

- `timeout_class`
- `timeout_duration_hint`
- `timeout_action`
- `timeout_result_state`

### Required cancellation fields

- `cancellation_supported`
- `cancellation_mode`
- `cancellation_requested_at`
- `cancellation_completed_at`
- `cancellation_result_state`

### Recommended timeout classes

- `short-preflight`
- `interactive-session`
- `long-build`
- `pipeline-batch`
- `validation-suite`

### Recommended timeout actions

- `mark-failed`
- `request-runner-stop`
- `force-workspace-retain`
- `force-cleanup-after-retain`

### Recommended cancellation modes

- `cooperative`
- `best-effort`
- `operator-assisted`
- `unsupported`

### Rules

- timeout and cancellation semantics must be surfaced independently from
  generic failure text
- retention policy must be allowed to override immediate cleanup after timeout
  or cancellation when evidence preservation is required
- unsupported cancellation must be labeled explicitly in operator views

## Evidence Retention And Cleanup Policy

### Purpose

Retention policy must define what evidence survives the run and under which
conditions a workspace may be cleaned.

### Recommended retention classes

- `ephemeral-success`
- `retain-on-failure`
- `retain-on-mutation`
- `retain-on-timeout`
- `retain-for-release`
- `manual-review-hold`

### Required evidence categories

- structured summary
- primary log stream
- verification evidence
- backup evidence where required
- rollback evidence where triggered or required
- workspace retention reason when cleanup is deferred

### Cleanup rules

- cleanup eligibility must depend on retention class and final execution state
- retained workspaces must expose a clear retention reason
- cleanup completion should be evented and auditable
- cleanup failure must not erase or hide the retained evidence that already
  exists

## Admission Standard For Future Real Surface Expansion

### Purpose

Phase 6B should define the minimum substrate and policy bar a tool surface must
 meet before broader real admission.

### Minimum admission requirements

Every candidate surface should have:
- a matrix row in `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- an official substrate mapping
- a declared runner family
- explicit preconditions
- an approval and lock class
- a backup and rollback requirement decision
- a post-run or post-write verification method
- artifact and evidence expectations
- truthful frontend labeling
- release-test requirements

### Admission classes

- `simulated-only`
- `real-read-only`
- `real-plan-only`
- `real-mutation-gated`
- `release-blocked`

### Rules

- a surface must not move to a stronger admission class without satisfying the
  lower-class evidence and policy requirements first
- executor availability alone must not upgrade a surface's admission class
- GUI menu or hotkey automation should not be treated as the primary production
  substrate when an official lower-level O3DE substrate exists
- `settings.patch` remains the current model for mutation admission discipline,
  but its real status must not be generalized to other tools without separate
  evidence

## Operator-Console Policy Truth Labels

The frontend should eventually surface policy state separately from tool truth
state.

### Minimum label families

- approval status label
- lock status label
- backup status label
- rollback status label
- timeout/cancellation label
- retention status label
- tool-surface truth label

### Rule

The UI should not compress these into one generic "safe" or "unsafe" label.

It should be possible to truthfully show combinations such as:
- approval satisfied + lock acquired + tool real plan-only
- approval pending + workspace ready + tool mutation-gated candidate
- runner timed out + evidence retained + rollback not required

## Release And Conformance Expectations

This policy contract should feed future release readiness review.

Before a surface is considered production-admitted, release review should
confirm:
- matrix row completeness
- policy attachment completeness
- evidence completeness
- failure classification coverage
- truthful frontend labeling
- conformance testing for the runner family and admission class

## Definition Of Done For This Planning Slice

This planning slice is complete when the repository has:
- a canonical Phase 6B policy and admission contract document
- explicit approval, lock, backup, rollback, timeout, cancellation, and
  retention policy classes
- an explicit minimum admission standard for future real surface expansion
- alignment with the remote executor, execution record, and API/event contracts
- no wording drift that implies runtime implementation already exists

## Recommended Next Planning Slice

After this contract, the next narrow planning slice should define the Phase 6B
release and conformance plan:
- runner-family conformance test expectations
- executor/workspace failure rehearsal expectations
- operator-console evidence and truth-label acceptance criteria
- release gate alignment with the surface matrix

Primary planning source:
- `docs/PHASE-6B-RELEASE-AND-CONFORMANCE-PLAN.md`
