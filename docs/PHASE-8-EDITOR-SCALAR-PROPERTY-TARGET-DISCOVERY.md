# Phase 8 Editor Scalar Property Target Discovery

## Checkpoint - 2026-04-26

This checkpoint follows the target-bound readback proof and the write-target
blocker alignment packet.

It does not implement property writes.

It does not admit `editor.component.property.list` to Prompt Studio,
dispatcher/catalog, or `/adapters`.

It does not run a new live proof.

## Current Evidence

The proof-only Mesh property-list run returned 23 paths, including scalar-like
or boolean-looking paths such as:
- `Controller|Configuration|Sort Key`
- `Controller|Configuration|Use ray tracing`
- `Controller|Configuration|Always Moving`
- `Controller|Configuration|Lod Configuration|Minimum Screen Coverage`
- `Controller|Configuration|Lighting Channels|Lighting Channels|Lighting Channel 0`

Those paths are useful read-only discovery evidence, but they are not safe
first-write targets.

## Classification

Current blocker code:
- `no_non_asset_non_render_scalar_target`

Why Mesh paths remain blocked:
- `Controller|Configuration|Model Asset` and `Mesh Asset` are asset-reference
  evidence.
- `Model Stats` and `Mesh Stats` are derived/read-only-looking evidence.
- ray tracing, lighting channel, LOD, sort key, reflection, forward-pass, and
  related paths are Mesh render configuration.
- grouping paths such as `Controller` or `Controller|Configuration` are not
  concrete scalar targets.

The next writable target must be discovered through read-only live evidence and
must be a non-asset, non-render, non-derived scalar/boolean/numeric/text-like
property.

## Current Implementation Packet

The property-list proof helper now classifies returned Mesh property paths for
write-target suitability when the proof is rerun.

The classification is advisory evidence only:
- target selected: `false`
- status: `blocked`
- blocker code: `no_non_asset_non_render_scalar_target`
- required next evidence:
  non-asset, non-render, non-derived scalar/text-like readback on an allowlisted
  component outside the Mesh render surface

## Still Not Admitted

Still outside this packet:
- `editor.component.property.write`
- Prompt Studio property-list planning
- dispatcher/catalog or `/adapters` exposure for `editor.component.property.list`
- arbitrary property browsing
- arbitrary Editor Python
- asset, material, render, build, or TIAF behavior
- live Editor undo or viewport reload claims

## Recommended Next Packet

The first non-render attempt used the existing `Comment` component-add
allowlist entry and is recorded in
`docs/PHASE-8-EDITOR-COMMENT-SCALAR-TARGET-DISCOVERY.md`.

Result:
- `Comment` target provisioning succeeded through admitted temporary
  entity/create and component/add
- loaded-level file restore was verified
- no scalar/text-like target was selected
- typed property-list and property-tree evidence both exposed only an empty
  live Comment property path, which is recorded as evidence but not selected as
  a stable operator target
- Comment-only source-guided named readbacks failed
- blocker code: `comment_source_guided_readback_failed`

The next packet should choose another already-allowlisted non-render component,
such as `Camera`, or design a separate proof-only strategy for components whose
live reflected property path is the empty string. Do not widen into property
writes or public property-list admission.
