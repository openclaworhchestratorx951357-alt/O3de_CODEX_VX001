# Phase 8 Editor Component Property Write Candidate

## Purpose

This document defines the first proof-only design packet for a future
`editor.component.property.write` surface.

It does not implement the tool.

It does not admit component property writes from Prompt Studio.

It exists to keep the next property-write discussion narrow enough that a
future implementation can prove one safe corridor without widening into
arbitrary Editor Python, arbitrary components, arbitrary property paths,
materials, assets, prefab work, hierarchy mutation, or build behavior.

Read this together with:
- `docs/PHASE-8-EDITOR-CANDIDATE-MUTATION-ENVELOPE.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-TARGET-DISCOVERY.md`
- `docs/PHASE-8-CAMERA-SCALAR-WRITE-CANDIDATE-DESIGN.md`
- `docs/OPERATOR-EDITOR-RUNTIME-PROOF-CHECKLIST.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`

## Current Truth

Current admitted editor property behavior is read-only:
- `editor.component.property.get` is admitted hybrid read-only.
- The composed live proof read back only
  `Controller|Configuration|Model Asset` from the newly added `Mesh` component.
- The target-bound readback proof later read the same Mesh
  `Controller|Configuration|Model Asset` path from an existing entity through
  live `editor.component.find` provenance, but classified it as
  `asset_reference_readback_only` and did not select it as a write target.

Current prompt behavior for property writes remains:
- broader property-write prompts are refused at planning time with
  `editor.candidate_mutation.unsupported`
- no editor session plan should be created for a property-write prompt
- no component property write bridge operation is admitted

## Candidate Tool Shape

Proposed future tool name:
- `editor.component.property.write`

Candidate family:
- `editor-control`

Candidate stage after this document:
- `documented-candidate`

The next possible stage would be:
- `runtime-reaching-proof-only`

That next stage must still keep Prompt Studio property-write prompts refused
until the proof artifacts are reviewed and a separate admission slice is
approved.

## Candidate Scope

The first proof-only candidate should write exactly one allowlisted property on
exactly one allowlisted component type.

Recommended first target class:
- a non-asset scalar or text-like property on an allowlisted component, such as
  a `Comment`-style component property, only after its exact property path and
  value type are proven by read-only introspection on the canonical sandbox
  target.

No exact first write target is selected by this document. The target must be
chosen by the read-only discovery packet in
`docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-TARGET-DISCOVERY.md`, or the discovery
packet must record the exact blocker instead of guessing a path.

Current blocker:
- no non-asset scalar, boolean, numeric, or text-like property has been
  selected through read-only live evidence
- Mesh `Controller|Configuration|Model Asset` is readback evidence only and is
  blocked as a first write target because it is asset-reference behavior
- scalar-like Mesh paths from the proof-only property-list evidence remain
  blocked as first write targets because they are render-adjacent or
  derived/statistical evidence
- current target-selection blocker code:
  `no_non_asset_non_render_scalar_target`
- the non-render `Comment` target discovery proof reached allowlisted
  temporary component provisioning and verified restore, then the typed
  property-tree/root-readback packets proved that list/tree evidence exposes
  only an empty live Comment path, root `PropertyTreeEditor.get_value("")`
  returns a non-scalar object, and source-guided named readbacks fail; blocker
  code: `comment_root_string_readback_failed`
- the follow-up scalar discovery matrix is proof-only and may select a
  readback-only candidate from another already-allowlisted low-risk component,
  currently starting with `Camera`; any selected target remains review evidence
  only and does not admit `editor.component.property.write`
- the scalar discovery matrix selected the `Camera` bool path
  `Controller|Configuration|Make active camera on activation?` as
  `readback_only_candidate`; this is a target-discovery result, not a write
  admission
- the Camera bool path now has a design-only packet in
  `docs/PHASE-8-CAMERA-SCALAR-WRITE-CANDIDATE-DESIGN.md`; that packet defines
  future proof requirements but still does not implement, expose, or admit
  property writes

Do not use `Mesh` `Controller|Configuration|Model Asset` as the first write
target unless a separate asset-reference proof exists. It is already useful as
readback evidence, but writing it may imply asset identity, material, or product
dependency behavior that this candidate does not cover.

Do not treat the Camera bool path as prompt-admitted. Prompts that ask to set,
change, toggle, or modify a component property must remain refused unless a
future write corridor is explicitly implemented, proven, reviewed, and admitted.

## Explicit Non-Scope

This candidate does not cover:
- arbitrary property paths
- arbitrary component types
- property creation or schema mutation
- material assignment or material patching
- asset reference repair
- entity creation beyond the already admitted composed chain
- component removal or replacement
- transform or hierarchy mutation
- prefab propagation or prefab save behavior
- render, build, validation, or TIAF behavior
- live Editor undo
- arbitrary Editor Python, scripts, commands, or GUI automation

## Required Preflight

A future proof-only implementation must reject before mutation unless all of
these are true:
- backend target wiring resolves to the canonical `McpSandbox` project and
  engine roots
- bridge heartbeat is fresh
- level path is explicit or the loaded level is proven and recorded
- target entity identity is exact
- target component identity is exact
- component type is in the property-write proof allowlist
- property path is in the property-write proof allowlist
- value type is known before mutation
- requested value is schema-compatible with the property path
- loaded-level file backup exists before mutation
- approval and lock requirements are recorded before dispatch

## Required Backup And Restore

A future proof-only implementation must create a loaded-level restore boundary
before writing.

The proof must record:
- restore boundary id
- restore boundary source path
- restore boundary backup path
- backup hash
- restore strategy
- restore trigger
- restored hash
- restore success or failure

The proof must invoke restore after the write.

The proof must not claim live Editor undo unless a separate live undo path is
implemented and verified.

The proof must not claim viewport reload unless a separate reload/readback path
is implemented and verified.

## Required Verification

The proof-only harness must prove all of these in one evidence bundle:
- before-value readback from `editor.component.property.get`
- property-write command result
- after-value readback from the same component id and property path
- restore invocation from the pre-mutation backup
- post-restore readback from the same component id and property path, or a
  truthful blocker if restoring the loaded-level file invalidates the component
  id and requires a reload-aware identity reacquisition step
- final review summary that names the exact property path, values, restore
  result, and remaining missing proof

If post-restore readback cannot be performed because the live editor still holds
old state after file restore, the candidate must remain proof-only and must say
that reload-aware verification is still missing.

## Prompt Planning Requirements

Before admission, Prompt Studio must continue to refuse prompts like:
- "set component property"
- "write component property"
- "change the Mesh model asset"
- "modify the component property on entity id 101"

Refusal should remain:
- `editor.candidate_mutation.unsupported`

The refused plan must have:
- no `editor.session.open` step
- no editor mutation step
- an operator-facing explanation that the property write is outside the
  admitted Phase 8 editor envelope

## Persisted Evidence Requirements

A future proof-only bundle must include:
- prompt text and candidate scope
- backend readiness and bridge heartbeat snapshot
- selected level path
- entity id or exact entity name
- component id
- component type
- property path
- before value
- requested value
- after value
- restore boundary metadata
- restore result
- post-restore value or exact blocker
- run, execution, artifact, and bridge command ids
- explicit missing-proof list

## Admission Criteria

Do not admit `editor.component.property.write` into Prompt Studio until all of
these are true:
- one proof-only run succeeds on the canonical sandbox target
- restore is invoked and verified
- post-restore readback is verified or a reload-aware verification path is
  implemented and verified
- planner refusal tests still cover unsupported property-write prompts
- runtime tests reject unsupported component types, property paths, value types,
  and missing restore boundary setup
- operator-facing UI labels distinguish proof-only candidate from admitted
  prompt behavior
- the surface matrix row is updated from candidate to admitted mutation-gated
  only in the admission slice

## Exit Condition

This candidate can move from `documented-candidate` to
`runtime-reaching-proof-only` only when a prior discovery packet names:
- the exact allowlisted component type
- the exact allowlisted property path
- the exact value type and sample values
- the read-only discovery evidence path or exact blocker that was resolved
- the proof harness path
- the restore/reload verification strategy
- the runtime artifact paths
- the tests proving refusals remain intact
