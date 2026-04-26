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
- root `PropertyTreeEditor.get_value("")` was attempted and API-successful, but
  the returned value was not scalar/text-like
- Comment-only source-guided named readbacks failed
- blocker code: `comment_root_string_readback_failed`

The next packet should choose another already-allowlisted non-render component,
such as `Camera`, or design a separate proof-only strategy for components whose
live reflected property path is the empty string. Do not widen into property
writes or public property-list admission.

## Scalar Discovery Matrix Packet - 2026-04-26

The next proof-only packet adds a read-only scalar target discovery matrix:
- proof command:
  `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-scalar-target-discovery-proof`
- proof helper:
  `backend/runtime/prove_live_editor_scalar_target_discovery.py`
- artifact pattern:
  `backend/runtime/live_editor_scalar_target_discovery_proof_*.json`

The matrix is still discovery only:
- no property write implementation
- no `editor.component.property.write` admission
- no public `editor.component.property.list` admission
- no dispatcher/catalog, Prompt Studio, or `/adapters` expansion
- no arbitrary Editor Python

Candidate components are restricted to already-allowlisted component-add
surfaces:
- `Camera` is probed first because local O3DE source inspection shows named
  reflected scalar/bool camera fields such as field of view, near/far clip,
  orthographic, and frustum dimensions.
- `Comment` is retained only as regression evidence for the known blocker:
  empty/root typed path metadata exists, but root readback returned a
  non-scalar `{x,y,z,w}`-shaped value.
- `Mesh` is excluded from first scalar write-candidate discovery because the
  current evidence is asset/render-adjacent.

For each probed component, the matrix provisions a temporary target through the
already-admitted `editor.entity.create` plus `editor.component.add` corridor and
requires returned component ids to have provenance
`admitted_runtime_component_add_result`.

The proof-only discovery ladder records:
- `EditorComponentAPIBus.BuildComponentPropertyList`
- `EditorComponentAPIBus.BuildComponentPropertyTreeEditor`
- `PropertyTreeEditor.build_paths_list_with_types()`
- `PropertyTreeEditor.build_paths_list()`
- read-only value verification by `GetComponentProperty` for list-derived paths
- read-only value verification by `PropertyTreeEditor.get_value(path)` for
  property-tree-derived paths

The matrix rejects empty paths, asset/material/mesh/model/render/lighting/LOD/
shader/texture/pipeline/transform-adjacent paths, vector/quaternion/color/
container type hints, shaped values such as `{x,y,z,w}`, and non-scalar
containers.

A selected candidate is review evidence only:
- status: `candidate_selected_readback_only`
- property path must be non-empty
- property path kind must be `named_component_property`
- target status remains `readback_only_candidate`
- `write_admission: false`
- `property_list_admission: false`

If no candidate is selected, the expected proof outcome is still successful
discovery with blocker `scalar_candidate_not_found`, plus per-component
blockers such as `camera_scalar_candidate_not_found` or
`comment_root_string_readback_failed`, as long as restore is verified.

## Scalar Discovery Matrix Live Proof - 2026-04-26

Proof command:
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-scalar-target-discovery-proof`

Proof artifact:
- `backend/runtime/live_editor_scalar_target_discovery_proof_20260426-100943.json`

Canonical proof target:
- project: `C:\Users\topgu\O3DE\Projects\McpSandbox`
- engine: `C:\src\o3de`
- level: `Levels/TestLoevel01`
- backend listener after proof: PID `29472`
- canonical `Editor.exe` after proof: PID `19616`
- bridge heartbeat after proof: `heartbeat_fresh: true`

Probed components:
- `Camera`
- `Comment`

Excluded components:
- `Mesh`, because current Mesh property evidence is asset/render-adjacent and
  remains blocked as a first scalar write target.

Selected readback-only candidate:
- component: `Camera`
- component id provenance: `admitted_runtime_component_add_result`
- entity:
  `CodexScalarTargetDiscoveryProofEntityCamera_20260426_100943_camera`
- property path:
  `Controller|Configuration|Make active camera on activation?`
- property path kind: `named_component_property`
- discovery method: `BuildComponentPropertyList`
- runtime value type: `bool`
- value preview: `True`
- target status: `readback_only_candidate`
- `write_admission: false`
- `property_list_admission: false`

Per-component result:
- `Camera`: `candidate_selected_readback_only`
- `Comment`: blocked with `comment_root_string_readback_failed`

Restore truth:
- mutation occurred for temporary `Camera` and `Comment` proof targets through
  already-admitted entity/create and component/add.
- `Camera` restore result: `restored_and_verified`
- `Camera` restore backup:
  `backend/runtime/editor_state/restore_boundaries/3474cf9464f71663/0febdc3e6d1e4b7eae7c73df8a25f11b.prefab`
- `Comment` restore result: `restored_and_verified`
- `Comment` restore backup:
  `backend/runtime/editor_state/restore_boundaries/3474cf9464f71663/eb8379a260bf4e9791b4d3cbfe987061.prefab`

What this proves:
- the repo-owned proof-only matrix can discover a non-empty scalar/bool Camera
  property path from a live component id returned by admitted component add
- readback evidence is scalar/text-like and JSON-safe
- temporary proof mutations were restored by loaded-level prefab file restore
- `editor.component.property.list` remains proof-only
- property writes remain unimplemented and unadmitted

Still not proven:
- no property write was attempted
- no before/write/after/restore/post-restore write proof exists
- no public property-list admission occurred
- no live Editor undo, viewport reload, or post-restore entity-absence
  readback was proven
