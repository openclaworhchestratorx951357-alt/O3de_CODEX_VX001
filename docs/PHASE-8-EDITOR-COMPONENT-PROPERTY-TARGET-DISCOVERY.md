# Phase 8 Editor Component Property Target Discovery

## Purpose

This document defines the read-only discovery packet that must run before any
future `editor.component.property.write` proof selects its first target.

It does not implement property discovery.

It does not implement property writes.

It does not admit new Prompt Studio behavior.

It exists to prevent the first component property write candidate from choosing
a property path by static guess, stale memory, or broad Editor Python access.

Read this together with:
- `docs/PHASE-8-EDITOR-CANDIDATE-MUTATION-ENVELOPE.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-WRITE-CANDIDATE.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/OPERATOR-EDITOR-RUNTIME-PROOF-CHECKLIST.md`

## Current Truth

Current admitted editor property behavior is read-only:
- `editor.component.property.get` requires an explicit `component_id` and
  explicit `property_path`.
- The composed live proof read
  `Controller|Configuration|Model Asset` from an added `Mesh` component.
- That `Mesh` asset reference remains useful readback evidence, not a first
  write target.

Current property write behavior remains refused:
- Prompt Studio property-write intents must still return
  `editor.candidate_mutation.unsupported`.
- No editor session plan should be compiled for those prompts.
- No component property write bridge operation is admitted.

Current broad property discovery behavior also remains refused:
- Prompt Studio property-list or property-path discovery intents must return
  `editor.component.property.list.unsupported`.
- No editor session plan should be compiled for those prompts.
- No component property list bridge operation is admitted.

## Discovery Goal

The discovery packet must identify exactly one possible first write target by
read-only evidence only:
- component type
- entity identity
- component identity
- property path
- value type
- before value
- level path
- bridge command or artifact ids
- reason the property is safer than alternatives

The output may also be "no target selected" when the read-only evidence is not
strong enough. That is a valid successful discovery outcome.

## Candidate Selection Rules

Prefer a target that is:
- on the canonical `McpSandbox` project target
- on a non-default sandbox or test level when provable
- on an allowlisted component type
- scalar, boolean, integer, float, string, or other text-like value
- readable through the admitted `editor.component.property.get` corridor
- stable across repeated read-only observation
- not coupled to source assets, products, materials, prefabs, hierarchy, render
  state, or build state

Reject a target when:
- the property path is inferred but not observed
- the value type is unknown
- the entity or component identity is ambiguous
- the only candidate is an asset reference such as `Model Asset`
- the target exists only because an earlier mutation in the same packet created
  it
- the current level cannot be proven
- the bridge heartbeat is stale
- discovery requires arbitrary Editor Python or GUI automation

## Required Read-Only Evidence

A discovery proof bundle or checkpoint must record:
- backend readiness and target wiring
- bridge heartbeat freshness
- selected level path and why it is safe
- entity lookup mode and exact entity match
- component id, component type, and component source
- observed property path list or the exact blocker preventing list evidence
- successful `editor.component.property.get` readback for the selected path
- observed value and value type
- rejected alternatives and rejection reasons
- run, execution, artifact, and bridge command ids when available
- explicit non-mutation statement

The evidence must be committed as a reviewable summary when runtime artifacts
are ignored.

## Stop Conditions

Stop before target selection if any of these are true:
- no backend listener or bridge heartbeat is available
- the canonical project or engine target cannot be proven
- the loaded level is unknown or unsafe for proof work
- the entity lookup is ambiguous
- the component id cannot be tied to an exact component type
- property-path listing is unavailable and no exact path can be read back
  through the admitted `property.get` path
- every readable property is asset-like, material-like, prefab-like, transform,
  hierarchy, render, or build adjacent
- selecting the target would require a mutation

When a stop condition is hit, the packet should produce a blocker summary, not
a guessed allowlist entry.

## Output Contract

The discovery packet may produce one of two outcomes.

Target selected:
- exact component type
- exact property path
- exact value type
- exact entity and component identity
- before value
- proof artifact path or committed checkpoint
- recommendation for a later proof-only write harness

Target not selected:
- exact blocker
- evidence gathered before the stop
- safest next packet, such as adding a typed read-only property-list operation
  or provisioning a stable test fixture

Neither outcome admits `editor.component.property.write`.

## Explicit Non-Scope

This discovery packet does not cover:
- property writes
- property allowlist implementation
- bridge write operation implementation
- component add beyond the already admitted composed proof boundary
- entity creation for discovery-only convenience
- arbitrary Editor Python
- arbitrary component/property browsing through untyped scripts
- asset, material, prefab, hierarchy, transform, render, build, or TIAF behavior
- restore, cleanup, or reversibility claims

## Next Stage Gate

`editor.component.property.write` may move toward a proof-only implementation
only after discovery names a target with read-only evidence or names the exact
blocker that must be solved first.

Until then, the correct behavior is still refusal:
- `editor.candidate_mutation.unsupported`
- `editor.component.property.list.unsupported`
