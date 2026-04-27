# Phase 8 Camera Non-Bool Readback Design

Status: normalized phase design packet

Date: 2026-04-27

## Current Main SHA

This design packet was prepared from:

```text
5560952f38bb47b9b7a986a5aa402bd2917a400b
```

## Phase Workflow Stage

Design packet.

This packet designs a future proof-only read-only harness for Camera non-bool
scalar readback. It does not implement runtime behavior, run Editor or bridge
automation, change schemas, admit public property listing, admit public prompt
behavior, add write behavior, add restore behavior, or broaden the exact Camera
bool corridor.

## Exact Scope

The future proof-only harness may inspect only:

```text
Camera component scalar-like properties other than
Controller|Configuration|Make active camera on activation?
```

The target component must be `Camera`, and the component id must come from
admitted runtime provenance:

```text
admitted_runtime_component_add_result
```

or, for an existing entity readback-only proof, from:

```text
admitted_runtime_component_discovery_result
```

The proof may use temporary target provisioning only through already admitted
`editor.entity.create` and `editor.component.add` behavior. If it does, it must
record loaded-level restore truth and must not claim generic restore or
generalized undo.

## Current Contract To Preserve

These public corridors remain the only admitted write/restore paths:

```text
editor.component.property.write.camera_bool_make_active_on_activation
editor.component.property.restore.camera_bool_make_active_on_activation
```

The only admitted public Camera property write/restore target remains:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

The future non-bool readback proof must report:

- `read_only: true`
- `write_occurred: false`
- `write_admission: false`
- `restore_admission: false`
- `property_list_admission: false`
- `generic_property_write_admission: false`

## Candidate Property Classes

The future proof may consider Camera scalar-like paths only if read from live
runtime evidence.

Candidate classes:

- numeric Camera configuration values
- non-bool scalar Camera configuration values
- string-like Camera metadata, if any is live-proven

Blocked classes:

- `Controller|Configuration|Make active camera on activation?`
- asset references
- material references
- render pipeline, shader, texture, or product/cache references
- transform, hierarchy, prefab, entity-reference, or level-reference values
- vector, quaternion, color, object, list, tuple, set, map, or container-shaped
  values
- any empty/root property path

If the only available Camera scalar-like paths are render-adjacent, the proof
must return a blocker instead of selecting a candidate.

## Required Proof-Only Evidence Model

A future proof packet must record:

- backend readiness
- target project and engine roots
- bridge heartbeat freshness
- loaded level path
- target entity identity
- target component id
- component id provenance
- component type
- property path
- property path source
- property path kind
- readback API used
- observed value
- observed value type
- value shape
- scalar classification
- rejection classification for each rejected Camera candidate
- why the selected property is not the admitted Camera bool path
- why the selected property is not asset/material/render/prefab/hierarchy/build
  adjacent
- `read_only: true`
- `write_occurred: false`
- restore boundary summary if temporary target provisioning is used

Runtime proof JSON must remain ignored unless a later packet intentionally
commits a short checkpoint summary.

## Required Stop Conditions

The future proof must stop without target selection if:

- backend readiness is unavailable
- bridge heartbeat is stale
- loaded level cannot be proven
- component id provenance is not admitted runtime provenance
- no non-bool scalar-like Camera path is live-proven
- all non-bool scalar-like paths are render-adjacent
- a candidate readback returns a shaped/container value
- a candidate requires public property-list admission
- a candidate requires arbitrary Editor Python
- a candidate would imply write, restore, undo, prefab, asset, material, render,
  build, TIAF, or product/cache behavior

Successful blocked output is acceptable and should use a precise blocker such
as:

```text
camera_non_bool_scalar_candidate_not_found
camera_non_bool_scalar_render_adjacent_only
camera_non_bool_scalar_readback_unavailable
```

## Required Tests For A Future Proof Packet

A future proof-only implementation packet should add targeted tests for:

- excluding the admitted Camera bool path from non-bool candidate selection
- rejecting empty/root property paths
- rejecting asset/material/render/prefab/hierarchy/build-adjacent paths
- rejecting vector/quaternion/color/container-shaped values
- preserving `read_only: true`
- preserving `write_occurred: false`
- preserving `write_admission: false`
- preserving `restore_admission: false`
- preserving `property_list_admission: false`
- recording restore truth if temporary target provisioning is used
- keeping public Prompt Studio property-list and generic write prompts refused
- keeping exact Camera bool write/restore tests unchanged

## Operator-Facing Review Requirements

If a future proof selects a readback-only target, its review summary must say:

- component `Camera`
- target entity
- exact property path
- observed value
- observed value type
- read-only proof status
- no write occurred
- no restore corridor was admitted
- no property-list public admission occurred
- no generic property write was admitted
- whether the property remains readback-only or is safe to audit later

It must not say the property can be changed by an operator.

## Approval Class

The future proof-only readback path remains:

```text
read_only
```

No high-risk approval is needed for this design packet. A later packet that
implements a proof-only live readback harness is medium risk. Any future packet
that proposes a non-bool Camera write, public prompt admission, public
property-list admission, or restore corridor is high risk and requires explicit
operator approval.

## Recommended Next Normalized Packet

Create:

```text
codex/phase-8-camera-non-bool-readback-readiness-audit
```

That packet should audit whether the existing proof helper, tests, and runtime
preconditions are sufficient for a proof-only readback harness. It should not
implement the harness.

## Validation Commands For This Packet

This docs-only packet should be validated with:

```powershell
git diff --check
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_dispatcher.py -k "editor_component_find or editor_component_property_get or camera_bool" -q
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "component_find or component_property_get or camera_bool" -q
Pop-Location
git diff --cached --check
```

Run `surface-matrix-check` only if a later packet changes surface labels,
admission state, or matrix wording.

## Revert Path

Revert the commit that adds this design document and its index/status pointers.
No runtime cleanup, dependency cleanup, proof artifact cleanup, or asset cleanup
should be required.
