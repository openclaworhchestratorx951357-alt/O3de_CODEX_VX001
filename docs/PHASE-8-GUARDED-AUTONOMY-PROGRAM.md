# Phase 8 Guarded Autonomy Program

## Purpose

This document defines the guarded program for moving this repository from its
current narrow admitted-real O3DE surfaces toward broader agent-driven authoring
without breaking project, engine, content, or workspace state.

It is intentionally stricter than "natural language can do anything."

It does not claim that the repository already supports general autonomous O3DE
creation from prompt alone.

It exists to answer the next production question truthfully:

> How do we widen agent control over O3DE "inside and out" while keeping the
> system auditable, reversible, and safe enough for real operator use?

Read this together with:
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/PHASE-6B-POLICY-AND-ADMISSION-CONTRACT.md`
- `docs/PHASE-6B-RELEASE-AND-CONFORMANCE-PLAN.md`
- `docs/PHASE-7-REAL-ADAPTER-GATE.md`
- `docs/OPERATOR-EDITOR-RUNTIME-PROOF-CHECKLIST.md`

## Current Truth To Preserve

As of the current accepted branch state:
- control-plane bookkeeping is real
- approvals, locks, runs, executions, artifacts, and events are real
- prompt sessions are real control-plane entities
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` has a narrow admitted real path
- `editor.session.open` is admitted real on the verified `McpSandbox` target
- `editor.level.open` is admitted real on the verified `McpSandbox` target
- `editor.entity.create` is still runtime-reaching and excluded from the
  admitted real set on current tested local targets
- simulated vs real wording must remain explicit

This program must not blur those truths.

## What "Inside And Out" Actually Means

For this repository, "use and modify O3DE inside and out" should eventually
mean all of the following are possible through the control plane:
- inspect project, engine, build, and settings state
- inspect and safely mutate project manifests and related config
- open editor sessions and explicit levels through admitted real paths
- inspect entities, components, prefabs, and content relationships
- perform narrowly admitted content mutations with rollback evidence
- orchestrate build, validation, and pipeline flows through isolated runners
- preserve enough evidence that operators can tell exactly what changed, why it
  changed, what failed, and how recovery was handled

It does **not** mean:
- arbitrary shell execution from prompt
- silent mutation without approval or locks
- unsupported editor hotkey/UI automation treated as the production substrate
- broad mutation admission simply because a natural-language prompt compiled

## Core Autonomy Principle

Natural language is the front door, not the trust boundary.

The trust boundary remains:
- typed capability planning
- capability admission state
- approval and lock enforcement
- preflight validation
- backup and rollback requirements
- persisted evidence and release conformance

The system should become more autonomous only by widening those admitted typed
surfaces, never by bypassing them.

## Target Operating Model

The long-term operating model should be:

1. A natural-language prompt compiles into a typed prompt plan.
2. Each typed step binds to:
   - an admitted or candidate surface
   - an executor/workspace
   - approval class
   - lock class
   - backup class
   - rollback class
   - verification contract
3. Execution runs only after preflight proves the surface is safe enough for
   its current admission class.
4. Every meaningful mutation produces:
   - before-state evidence
   - execution evidence
   - after-state verification
   - rollback evidence when applicable
5. Operator views make the exact truth obvious:
   - admitted real
   - plan-only
   - read-only
   - runtime-reaching but excluded
   - simulated fallback
   - rejected before execution

## Required Safety Layers

Broad O3DE autonomy should not be widened until all of these layers exist in a
truthful way for the relevant surface.

### 1. Capability admission layer

Every surface must have:
- a matrix row
- a current truth label
- a runner family
- explicit preconditions
- explicit rejection criteria

### 2. State containment layer

Every mutating surface must define its blast radius:
- project manifest only
- settings targets only
- current editor level only
- selected entity/prefab only
- workspace-local build tree only
- asset/pipeline scope only

No surface should mutate a broader scope than it can describe.

### 3. Backup and rollback layer

Every mutating surface must define:
- what is backed up before mutation
- how restore is attempted
- how rollback success/failure is recorded
- when operator-assisted recovery is the truthful fallback

### 4. Verification layer

Every mutating surface must define:
- what post-write or post-run verification means
- what counts as success
- what counts as partial success
- what counts as failure requiring rollback or retention

### 5. Evidence retention layer

Every meaningful action must retain enough evidence for a later operator to
answer:
- what prompted the action
- what typed steps ran
- what the target was
- what changed
- whether the result was real, simulated, or rejected
- how to inspect or recover from it

## Admission Classes For Broad Authoring

To widen safely, future authoring surfaces should move through these classes in
order:

1. `simulated-only`
2. `runtime-reaching`
3. `real-read-only`
4. `real-plan-only`
5. `real-mutation-gated`
6. `release-hardened`

Interpretation:
- `runtime-reaching` means the live substrate can be touched, but the repository
  still does not admit that surface as safe for general autonomous use
- `release-hardened` means the surface has passing conformance, recovery, and
  operator evidence expectations strong enough for broader production use

## Broad-Authoring Milestones

The safest path toward "inside and out" control is milestone-based.

### Milestone A: Read-everything truthfully

Goal:
- real read-only coverage across project, editor, asset, validation, and build
  surfaces

Required outcomes:
- all major domains can be inspected without mutation
- prompts can summarize state from real evidence
- operators can trust that reads are real when labeled real

### Milestone B: Plan-everything before writing

Goal:
- mutation-capable surfaces first gain real plan/preflight support

Required outcomes:
- prompts can ask for complex changes
- the system emits typed plans, risk, locks, backup needs, and verification
  expectations before mutation
- operators can approve based on concrete evidence instead of intent alone

### Milestone C: Narrow mutation corridors

Goal:
- widen mutation only in tightly scoped, reversible corridors

Priority examples:
- manifest-backed settings and Gem changes
- explicit level open/create/save operations
- prefab-safe entity creation once proven
- bounded component/property patch flows on explicit targets

### Milestone D: Workspace-isolated execution families

Goal:
- build, validation, asset pipeline, and content mutation run inside isolated
  workspaces with durable evidence

Required outcomes:
- failures do not silently contaminate the operator’s main workspace
- cleanup and retention rules are explicit

### Milestone E: Release-hardened authoring packs

Goal:
- package related admitted surfaces into stable operator-facing authoring packs

Example packs:
- project configuration pack
- editor level/session pack
- prefab/entity authoring pack
- asset identity and pipeline pack
- validation pack

## Non-Negotiable Guardrails

The repository should not claim broad autonomous authoring until all of the
following are true for the relevant surfaces:

- arbitrary command execution is still refused
- prompts never bypass typed capability planning
- every mutating step is approval-aware and lock-aware
- every admitted mutation has a declared backup and rollback story
- every admitted mutation has explicit post-run verification
- operator UI shows excluded or runtime-reaching surfaces as excluded
- release evidence exists for the widened surface

## First Implementation Slice Recommended By This Program

The next implementation slice after this document should **not** be "make
everything autonomous."

It should be:

### Guarded authoring envelope for candidate mutating editor surfaces

Scope:
- define a reusable mutation envelope for editor-facing candidate surfaces
- attach backup/rollback/verification classes in the control plane before
  widening any new editor mutation
- start with explicit candidate rows and operator labeling, not new admission

Concrete targets:
- add candidate mutation metadata for editor-domain prompt steps
- add operator-visible backup/rollback/verification labels for candidate editor
  mutations
- keep `editor.entity.create` excluded until prefab-safe conformance is proven

## Definition Of Done For This Planning Slice

This slice is complete when the repository has:
- a canonical document describing how broad autonomy can be widened safely
- explicit admission classes for broad authoring
- milestone ordering that preserves current branch truth
- a concrete recommended first implementation slice
- no wording drift that claims general autonomous O3DE creation already exists

## Short Honest Summary

The repository is now capable of:
- typed natural-language planning
- narrow admitted real editor session/level work
- narrow admitted real project/settings work
- richer operator visibility over real vs simulated execution

It is **not** yet capable of:
- arbitrary autonomous O3DE creation from prompt alone
- broad safe mutation across editor, assets, build, validation, and rendering
  families

This program defines how to get there without lying about the current state and
without breaking everything along the way.
