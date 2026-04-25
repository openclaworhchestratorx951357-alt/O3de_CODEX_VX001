# Phase 6B Remote Executor Contract

## Purpose

This document defines the contract-first planning boundary for Phase 6B:
remote executor substrate and workspace isolation.

It does not implement runtime code by itself.

It exists to make the next production planning step concrete before broader real
adapter expansion proceeds.

Read this together with:
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
- `docs/CODEX-OPERATING-RUNBOOK.md`
- `docs/WORKTREE-STRATEGY.md`

## Branch Truth To Preserve

This contract must not drift from the accepted branch truth:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` is the first admitted mutation-gated real path
- broader real adapter coverage is still narrow
- simulated vs real wording must remain explicit

This contract is planning infrastructure, not proof that production-grade remote
execution already exists.

## Scope

Phase 6B is the cross-cutting substrate that future real adapter work depends
on.

Its job is to define:
- what a remote executor is
- what an isolated workspace is
- how a run is bound to a workspace and execution substrate
- how artifacts/logs stream back into the control plane
- where approval, lock, backup, and rollback responsibilities attach

It does not decide by itself which tool surfaces are admitted as real. That
remains governed by the automation surface matrix and admission standard.

## Non-Goals

Phase 6B is not:
- blanket approval for broader real adapter execution
- a GUI automation framework
- a substitute for per-surface admission criteria
- an excuse to widen `build.configure`, `settings.patch`, or any other tool
  beyond their current truthful boundary

## Core Definitions

### Remote executor

A remote executor is the runtime substrate responsible for:
- receiving an admitted runner request from the control plane
- materializing an execution environment
- binding that environment to the correct workspace, engine, and project
- launching the correct runner family
- streaming status, logs, and artifacts back into the control plane
- reporting completion, failure, timeout, cancellation, and cleanup outcomes

The remote executor is infrastructure.

It is not itself a claim that the target tool surface is real or admitted.

### Workspace

A workspace is the isolated filesystem and environment scope within which a
remote run executes.

A workspace must have:
- a unique identity
- an execution owner
- a declared engine binding
- a declared project binding
- a declared runner family
- a lifecycle with creation, active use, teardown, and retained evidence

### Workspace isolation

Workspace isolation means:
- one run cannot silently mutate another run's active filesystem state
- one run's temp outputs, build directories, logs, and backup materials are not
  ambiguous with another run's
- cleanup and retention rules can be enforced deterministically

Isolation does not require that every run gets a full machine or container.

It does require that the repository define a truthful, auditable boundary for
filesystem state, environment state, and retained evidence.

### Runner family

A runner family is the operational substrate used by a tool execution:
- file/manifest runner
- CLI runner
- editor session runner
- asset pipeline runner
- standalone tool runner
- test runner
- remote content runner

Every remote execution must declare exactly one primary runner family, even if
evidence from multiple subsystems is collected.

## Remote Executor Contract

Every Phase 6B-compatible executor should provide the following contract fields:

### Executor identity

Required:
- executor id
- executor kind
- executor host or target label
- executor version or capability snapshot
- execution mode classification

Execution mode classification must remain explicit:
- simulated
- real read-only
- real plan-only
- real mutation-gated

### Workspace identity

Required:
- workspace id
- workspace root path
- workspace lifecycle state
- engine binding
- project binding
- runner family
- creation time
- cleanup policy

### Run binding

Required:
- control-plane run id
- tool name
- request hash or equivalent request identity
- initiating approval or policy class when applicable
- lock scope

### Environment contract

Required:
- declared env inputs
- secret sources or secret references
- toolchain assumptions
- working directory
- required executable surfaces

### Evidence contract

Required:
- stdout/stderr handling
- structured summary channel
- artifact bundle locations
- backup/rollback evidence when mutation is allowed
- final status reason

## Workspace Lifecycle

Every executor-compatible workspace should follow this lifecycle:

1. Provision
   - allocate workspace identity
   - bind engine/project roots
   - prepare filesystem scope
   - validate runner prerequisites

2. Preflight
   - confirm policy and approval gates
   - confirm lock acquisition
   - confirm mutation eligibility if applicable
   - declare backup/rollback requirement class

3. Execute
   - launch runner
   - stream status and logs
   - capture artifacts and intermediate evidence

4. Verify
   - run post-run or post-write verification
   - classify result
   - capture final summary and evidence pointers

5. Retain or clean up
   - retain required evidence and backup artifacts
   - clean temporary state according to policy
   - mark workspace lifecycle outcome

## Engine And Project Binding Rules

Phase 6B must define engine/project binding truthfully.

Minimum required rules:
- every run must declare which engine root it is bound to
- every run must declare which project root it is bound to
- no run may silently infer project or engine roots from unrelated state
- runner families that require both engine and project roots must fail clearly
  if either binding is absent or ambiguous
- the chosen binding must be visible in operator-facing evidence

This is especially important for:
- CMake configure/build runners
- editor session runners
- Asset Processor runners
- CLI runners that modify project or Gem registration state

## Approval, Lock, Backup, And Rollback Attachment Points

Phase 6B does not replace the admission matrix. It gives those controls a stable
place to attach.

### Approval attachment

If a surface is approval-gated, the executor contract must carry:
- approval id or approval record reference
- approval class
- approval decision timestamp

### Lock attachment

If a surface uses locks, the executor contract must carry:
- lock scope
- lock owner
- lock acquisition result
- lock release result

### Backup attachment

If a surface requires backup, the executor contract must carry:
- backup required flag
- backup target class
- backup artifact location
- backup completion result

### Rollback attachment

If a surface requires rollback capability, the executor contract must carry:
- rollback required flag
- rollback strategy class
- rollback execution result if triggered
- post-rollback verification result

## Runner-Family Expectations

### File / manifest runners

Must define:
- target file set
- pre-write backup rules if mutating
- post-write verification method
- source-of-truth provenance capture

### CLI runners

Must define:
- executable path resolution
- working directory
- environment contract
- exit-code classification
- artifact/log capture

### Editor session runners

Must define:
- editor bootstrap or attach model
- display/session expectations
- project and level preconditions
- save and mutation boundary handling

### Asset pipeline runners

Must define:
- project/platform scope
- AP/APBatch launch model
- asset/log outputs
- reprocess/mutation risk class

### Standalone tool runners

Must define:
- tool bootstrap path
- headless or attended execution assumptions
- artifact and capture outputs

### Test runners

Must define:
- test inventory source
- result normalization
- artifact retention
- retry or sharding semantics where supported

## Failure Model

Phase 6B should classify at least these failure categories:
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

These categories should be represented as structured control-plane outcomes, not
only freeform log text.

## Artifact And Log Streaming Contract

Minimum evidence expectations:
- live stdout/stderr or equivalent event stream
- persisted structured summary
- retained runner-specific artifacts
- retained backup/rollback evidence when required
- visible linkage from run to execution to artifact records

Phase 6B should not assume that raw log streaming alone is sufficient. The
control plane still needs structured end-state evidence.

## Security And Secret Boundary

Phase 6B should define:
- where executor credentials live
- how secrets are injected into runner environments
- how secrets are prevented from leaking into persisted artifacts and operator
  views
- how executor identity is distinguished from operator identity

This planning slice does not choose a final secret manager.

It only defines that the executor contract must not leave secret handling
implicit.

## Relationship To Worktrees

Git worktrees and remote workspaces are related but not identical.

Worktree strategy is a developer collaboration model.

Workspace isolation is an execution substrate model.

Phase 6B should preserve that distinction:
- worktrees are for human/Codex parallel development lanes
- remote workspaces are for runner execution isolation and evidence hygiene

Do not treat Git worktrees as the production remote executor substrate by
default.

## Admission Dependencies

The following future surfaces should not broaden real coverage until the Phase 6B
contract is implemented enough to support them:
- real configure execution
- real compile execution
- editor session automation
- asset pipeline execution
- real validation submission
- rendering/material mutation or capture automation

## Definition Of Done For Phase 6B Planning

This planning phase is complete when the repository has:
- a canonical Phase 6B contract document
- explicit executor/workspace vocabulary
- explicit lifecycle and attachment points for approval, lock, backup, and
  rollback
- alignment with the roadmap and remote automation plan
- no drift that implies runtime implementation already exists

## Recommended Next Planning Slice After This Contract

After this contract, the next narrow planning slice should define the Phase 6B
execution record model:
- executor record
- workspace record
- run-to-workspace binding
- lifecycle state machine
- failure taxonomy fields
- artifact/log linkage contract

Primary planning source:
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
