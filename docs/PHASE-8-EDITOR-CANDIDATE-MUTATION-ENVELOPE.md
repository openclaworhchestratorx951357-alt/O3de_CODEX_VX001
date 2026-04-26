# Phase 8 Editor Candidate Mutation Envelope

## Purpose

This document defines the admission envelope for future editor mutation
candidates after the admitted composed editor chain.

It does not implement, admit, or prove any new editor behavior.

It exists to answer one bounded question before future work starts:

> What must be true before delete, parenting, prefab, transform, arbitrary
> component, property write, material, asset, render, build, or other broader
> editor-facing mutation can become an admitted Prompt Studio surface?

Read this together with:
- `docs/PHASE-8-GUARDED-AUTONOMY-PROGRAM.md`
- `docs/OPERATOR-EDITOR-RUNTIME-PROOF-CHECKLIST.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/PHASE-6B-POLICY-AND-ADMISSION-CONTRACT.md`

## Current Truth To Preserve

The current admitted editor-authoring boundary is intentionally narrow:
- `editor.session.open`
- `editor.level.open`
- `editor.entity.create`
- `editor.component.add`
- `editor.component.property.get`

The composed authoring proof covers only:

```text
editor.session.open -> editor.level.open -> editor.entity.create -> editor.component.add -> editor.component.property.get
```

The admitted read-only direct proof covers only:

```text
editor.session.open -> editor.level.open -> editor.entity.exists
```

Current prompt planning must continue to refuse broader candidate mutation
intents with `editor.candidate_mutation.unsupported` until the relevant
candidate completes this envelope.

## Candidate Mutation Surfaces

These surfaces are candidates only. They are not admitted prompt behavior.

| Candidate surface | Current status | Minimum pre-admission proof | Explicit non-claim |
| --- | --- | --- | --- |
| Delete or remove entity/object | Refused before editor session planning | exact target identity, pre-mutation backup, mutation execution evidence, post-delete absence readback, restore/reload proof, post-restore presence readback | no delete API or cleanup guarantee is admitted |
| Parent, reparent, attach, detach, or hierarchy mutation | Refused before editor session planning | exact parent/child identity, hierarchy before-state, mutation evidence, post-mutation hierarchy readback, restore/reload proof, post-restore hierarchy readback | no scene graph mutation is admitted |
| Prefab open, instantiate, connect, save, or propagate | Refused before editor session planning | prefab identity, instance identity, file and entity ownership boundary, backup, mutation evidence, reload proof, reference/instance readback | no prefab authoring is admitted |
| Move, place, position, rotate, scale, or transform entity/object | Refused before editor session planning | exact target identity, transform before-state, mutation evidence, post-write transform readback, restore/reload proof, post-restore transform readback | no transform/property write is admitted |
| Arbitrary component add, component remove, or component swap | Mostly runtime allowlist-gated or refused depending on prompt shape | component allowlist expansion proposal, exact component identity, before/after component list readback, backup, restore/reload proof | no arbitrary component surface is admitted |
| Component property write | Refused before editor session planning | component id, property path allowlist, type/schema validation, before-value readback, mutation evidence, after-value readback, restore/reload proof, restored-value readback | current `editor.component.property.get` remains read-only |
| Material assignment or material mutation through editor context | Refused before editor session planning | entity/component/material identity, material source provenance, before/after material readback, backup, restore/reload proof | no editor material assignment is admitted |
| Asset, render, build, or TIAF behavior triggered from an editor prompt | Refused or routed only through existing non-editor typed surfaces | separate matrix row and proof path in the owning family | editor prompt wording does not admit cross-family behavior |
| Arbitrary Editor Python, script, command, hotkey, or GUI automation | Refused as arbitrary command execution | none; must be decomposed into typed capability rows first | arbitrary editor execution is not a candidate surface |

## Required Envelope

Every candidate editor mutation must define these fields before implementation:
- tool name or proposed tool family
- exact natural-language intent aliases
- current refusal code and operator wording
- target identity requirements
- level and project scope
- mutation surface class
- backup class
- restore boundary class
- verification class
- approval class and lock class
- retained evidence and artifact classes
- explicit unsupported inputs
- exact success, partial success, refusal, and failure summaries

No candidate should enter implementation with "the editor can probably do it"
as its substrate description.

## Minimum Preflight

Before any future candidate executes a mutation, preflight must prove:
- the canonical target is the intended project and engine binding
- the bridge heartbeat is fresh when the candidate uses the live editor bridge
- the requested level is explicit or the loaded level is proven
- the target entity, component, prefab, material, or asset identity is exact
- the requested operation is inside an explicit allowlist
- the operation has a bounded state scope
- the backup target can be created before mutation
- approval and lock requirements are known before dispatch

If any preflight check fails, the prompt must refuse or stop before mutation.

## Minimum Backup And Restore

Every mutating candidate must define:
- what file, entity, component, prefab, or asset state is backed up
- where the backup is retained
- how the restore action is invoked
- what reload or re-open action is required after restore
- how restore success is verified
- what operator-assisted recovery message is shown if restore fails

File-backed restore is not the same as live Editor undo.

A candidate must not claim reversibility unless the restore path was actually
invoked and verified for that candidate.

## Minimum Verification

Every candidate must prove both sides of the mutation:
- before-state readback where applicable
- mutation command result
- after-state readback against the exact target
- restore invocation when cleanup or rollback is part of the proof
- post-restore readback against the exact target
- final review summary naming what was proven and what remains unproven

For destructive operations such as delete, success requires absence readback
after mutation and presence readback after restore.

For property-like operations, success requires before-value, after-value, and
restored-value readback.

For hierarchy/prefab operations, success requires relationship or instance
readback, not just a successful command result.

## Admission Sequence

Future slices should move each candidate through these stages in order:

1. `documented-candidate`
2. `planner-refused-with-explicit-envelope`
3. `runtime-reaching-proof-only`
4. `mutation-gated-proof-with-restore`
5. `prompt-admitted-approval-gated`
6. `release-hardened`

Do not skip from documentation to prompt admission.

Do not widen prompt planning before a candidate has a proof harness and a
reviewable evidence bundle.

## Operator Wording Requirements

Operator-facing text must say:
- `refused candidate editor mutation` when the planner blocks the surface
- `proof-only runtime-reaching candidate` when a harness touches the live editor
  but the prompt planner still refuses it
- `mutation-gated proof with restore` only when backup, mutation, restore, and
  verification all ran
- `prompt-admitted approval-gated` only after the candidate is admitted through
  a typed Prompt Studio plan

Operator-facing text must not say:
- reversible, unless restore was invoked and verified
- cleanup complete, unless cleanup was invoked and verified
- arbitrary Editor Python, unless the prompt was refused
- prefab-safe, unless prefab identity and reload verification were proven
- delete-safe, unless absence and post-restore presence were proven

## Implementation Packet Checklist

Before a future implementation packet starts, it must name:
- exactly one candidate surface from this document
- the intended stage transition
- the files or modules allowed to change
- the tests or proof harness that will demonstrate the transition
- the runtime artifact paths, if any
- the rollback/revert path for repo changes
- the explicit behaviors that remain out of scope

If the packet cannot name those items, it should stay a planning or docs slice.

## Exit Condition

This envelope is satisfied for a candidate only when this statement is true:

> The candidate has exact target identity, bounded state scope, preflight,
> backup, restore/reload, before/after/post-restore verification, persisted
> evidence, and operator wording strong enough to admit the next stage without
> widening arbitrary editor behavior.
