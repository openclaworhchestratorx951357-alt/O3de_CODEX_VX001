# Normalized Phase Workflow

## Purpose

Every future phase should follow the same evidence-based promotion pattern
proven during Phase 8. Phase 8 is the reference example because it moved from
discovery to exact public admission through narrow, reviewable gates instead of
jumping from an idea to a broad capability.

This document makes that workflow reusable for all future phases. Future phases
should copy the discipline, not the Camera-specific implementation.

## Core Rule

No phase may jump directly from idea to broad admission.

Every phase must progress through narrow, reviewable gates. If a phase skips a
gate, the PR must explain why the gate is not applicable and what evidence
replaces it.

Every phase packet must also pass `docs/CODEX-WORKFLOW-GOVERNOR.md`. A packet
that only refreshes a status SHA, echoes existing docs, or adds refusal-only
paperwork without new evidence or tests should be bundled into a meaningful
packet instead of becoming its own PR.

## The Normalized Phase Pipeline

Every phase should use this order unless there is a documented reason not to.

### 1. Baseline / Current Truth Packet

Purpose:

Re-establish current repo truth from code, tests, runtime behavior, and docs.

Required output:

- current main SHA
- current capability state
- admitted surfaces
- proof-only surfaces
- blocked surfaces
- unsafe or forbidden surfaces
- validation commands

Do not:

- implement new behavior
- widen scope
- delete branches

### 2. Discovery Packet

Purpose:

Find a candidate target or next safe surface using read-only evidence.

Required output:

- candidate list
- evidence for each candidate
- blockers
- selected safest candidate, if any
- explicit `candidate-only` label

Do not:

- mutate runtime state except bounded temporary proof target provisioning if
  explicitly allowed
- admit public behavior
- claim writes are safe

### 3. Design Packet

Purpose:

Document how a future implementation would work before implementing it.

Required output:

- exact scope
- exact non-goals
- preflight requirements
- evidence model
- restore or rollback expectations
- failure behavior
- required tests
- operator approval class
- future command and artifact names if applicable

Do not:

- implement the feature
- expose public capability
- run live mutation proof

### 4. Readiness Audit Packet

Purpose:

Confirm whether every required safety gate exists before implementation.

Required output:

- readiness checklist
- missing gates
- implementation touchpoints
- files that must not be touched
- safest future branch name
- explicit approval requirement if risk is medium or high

Do not:

- implement the feature
- silently promote design into runtime behavior

### 5. Proof-Only Harness Packet

Purpose:

Prove the exact operation privately before public admission.

Required output:

- private proof harness
- exact allowlist
- tests for proof-only behavior
- live proof if applicable
- ignored runtime artifact
- checkpoint summary

Rules:

- proof-only means not public
- no Prompt Studio admission unless explicitly part of a later admission packet
- no dispatcher/catalog public admission unless explicitly part of a later
  admission packet
- no `/adapters` public exposure unless explicitly part of a later admission
  packet

### 6. Admission Decision Packet

Purpose:

Decide whether the proof-only capability should stay proof-only or become an
exact admitted public corridor.

Required output:

- admission decision
- exact capability name if future admission is allowed
- what remains blocked
- what remains forbidden
- approval requirements
- required tests
- required proof rerun

Do not:

- implement the public corridor yet

### 7. Exact Public Admission Packet

Purpose:

Admit only the exact proven corridor.

Required output:

- exact capability name
- exact target and scope
- schema/policy/catalog/planner/adapter behavior only for that target
- refusal tests for everything outside the target
- verification evidence
- live proof rerun if applicable

Rules:

- do not admit broad or generic capability names
- do not admit arbitrary arguments
- do not broaden from one target to a category
- preserve all refusal boundaries

### 8. Post-Admission Review / Status Refinement Packet

Purpose:

Make the newly admitted capability understandable and auditable to operators.

Required output:

- review summary fields
- before/after evidence where applicable
- verification status
- approval/admission metadata
- restore or revert guidance
- explicit `generalized_undo_available: false` unless truly implemented

Do not:

- add new capability surfaces

### 9. Operator Examples Packet

Purpose:

Document safe and refused prompt examples.

Required output:

- safe read prompts
- safe write or action prompts, if admitted
- refused prompts
- expected review output
- troubleshooting
- revert and safety guidance

Do not:

- change runtime behavior

### 10. Quick Reference Packet

Purpose:

Create a concise page that future threads can read before working in the phase.

Required output:

- admitted surfaces
- proof-only surfaces
- blocked surfaces
- forbidden surfaces
- safe examples
- refused examples
- evidence requirements

### 11. Checkpoint Packet

Purpose:

Record the completed phase or major capability milestone.

Required output:

- main SHA
- PR sequence
- admitted capabilities
- proof-only capabilities
- blocked or forbidden capabilities
- validation evidence
- live proof artifacts if any
- operator docs
- revert and safety notes
- recommended next safe slices

Checkpoint packets should consolidate meaningful phase truth. Do not create a
new checkpoint solely because another small PR merged unless the operator asks
for a handoff packet or stale docs would materially mislead the next thread.

### 12. Report-First Cleanup Packet

Purpose:

Clean branch and documentation hygiene safely after the phase work.

Required output:

- branch inventory
- safe cleanup candidates
- preserve branches
- uncertain branches
- no deletion unless separately authorized

If deletion is approved:

- delete one branch per cleanup packet
- verify merged state
- verify no unique commits
- document the deletion

## Risk Levels

### Low Risk

Examples:

- docs only
- examples
- quick references
- status docs
- branch cleanup reports without deletion

Self-merge:

Allowed if validation passes.

### Medium Risk

Examples:

- prompt/review formatting
- read-only runtime affordance
- tests around existing behavior
- non-public proof harness with no public admission

Self-merge:

Allowed only with targeted tests and CI.

### High Risk

Examples:

- public admission of any runtime mutation
- write corridors
- schema/policy/catalog/adapter exposure for new operations
- branch deletion
- GitHub settings changes
- CI behavior changes
- dependency changes

Self-merge:

Allowed only if explicitly approved by the operator and all gates pass.

## Required PR Body For Every Normalized Phase Packet

Every PR must include:

- Summary
- Scope
- Current truth
- Phase workflow stage
- Validation
- Risk level
- Self-merge decision
- Boundaries
- Revert path
- Recommended next slice
- Workflow-governor value

## Required Boundaries Section

Every PR must explicitly say what it does not do.

For runtime/O3DE work, include relevant boundaries such as:

- no generic write admission
- no arbitrary Editor Python
- no asset/material/render/build/TIAF expansion
- no generalized undo claim
- no public list/discovery surface unless explicitly admitted

## Current Truth Hierarchy

Use this order:

1. Runtime behavior.
2. Targeted tests.
3. Implementation code.
4. Repo docs.
5. External docs or research notes.

## Promotion Law

A capability cannot be promoted by documentation alone.

Promotion requires:

- implementation or proof path
- tests
- evidence
- truthful admission label
- review/status output
- rollback or restore story where claimed

## Normalized Naming Pattern

Use predictable branch names:

```text
codex/<phase>-<domain>-<workflow-stage>
```

Examples:

- `codex/phase-9-asset-readback-discovery`
- `codex/phase-9-asset-readback-design`
- `codex/phase-9-asset-readback-readiness-audit`
- `codex/phase-9-asset-readback-proof-only`
- `codex/phase-9-asset-readback-admission-decision`
- `codex/phase-9-asset-readback-public-corridor`
- `codex/phase-9-asset-readback-review-status`
- `codex/phase-9-asset-readback-operator-examples`
- `codex/phase-9-checkpoint`

## Normalized File Naming Pattern

Use predictable docs names:

- `docs/PHASE-X-<DOMAIN>-DISCOVERY.md`
- `docs/PHASE-X-<DOMAIN>-DESIGN.md`
- `docs/PHASE-X-<DOMAIN>-READINESS-AUDIT.md`
- `docs/PHASE-X-<DOMAIN>-PROOF.md`
- `docs/PHASE-X-<DOMAIN>-ADMISSION-DECISION.md`
- `docs/PHASE-X-<DOMAIN>-OPERATOR-EXAMPLES.md`
- `docs/PHASE-X-<DOMAIN>-QUICK-REFERENCE.md`
- `docs/PHASE-X-<DOMAIN>-CHECKPOINT.md`

## How Phase 8 Becomes The Model

Phase 8 is the reference example because it successfully used:

- read-only discovery
- candidate-only design
- readiness audit
- proof-only harness
- public admission decision
- exact public corridor
- post-admission review/status refinement
- operator examples
- admitted surfaces quick reference
- branch cleanup report

Future phases should not copy Camera-specific behavior. They should copy the
workflow discipline: narrow gates, explicit evidence, exact admission labels,
strong refusal boundaries, and honest rollback claims.

## Final Rule

Every future phase should move from:

```text
unknown -> discovered -> designed -> audited -> proof-only -> admission decision -> exact admission -> reviewed -> documented -> checkpointed
```

Never move directly from unknown to broad public capability.
