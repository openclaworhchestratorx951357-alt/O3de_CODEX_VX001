# Phase 8 Next Read-Only Target Discovery

Status: normalized phase discovery packet

Date: 2026-04-27

## Current Main SHA

This discovery packet was prepared from:

```text
2eb170868fa33a14477b7e3191fa0814f58d8098
```

## Phase Workflow Stage

Discovery packet.

This packet selects the next safest Phase 8 read-only discovery direction after
the exact Camera bool write/restore corridor and the Phase 9 asset-readback
blocked checkpoint. It does not implement runtime behavior, run a live proof,
change schemas, admit public property listing, add write behavior, or broaden
the exact Camera bool corridor.

## Discovery Decision

The next safest candidate is:

```text
Camera non-bool scalar readback discovery
```

This is candidate-only. It is not a public prompt admission and not a write
candidate yet.

Reason:

- `Camera` is already in the admitted component-add/find allowlist.
- Camera bool readback, write, and restore already have the strongest Phase 8
  evidence model.
- Existing docs and runtime proof helper references identify additional Camera
  scalar-like fields as plausible read-only targets.
- Staying on Camera avoids introducing a new component class before the current
  component/property safety model has another read-only data point.
- `Comment` remains blocked by `comment_root_string_readback_failed`.
- `Mesh` remains blocked as asset/render-adjacent for first write-target
  expansion.

## Current Truth To Preserve

The only admitted public write corridor remains:

```text
editor.component.property.write.camera_bool_make_active_on_activation
```

The only admitted public restore corridor remains:

```text
editor.component.property.restore.camera_bool_make_active_on_activation
```

The only exact public Camera property write/restore target remains:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

The current exact Camera bool readback affordance remains:

```text
editor.component.find -> editor.component.property.get
```

Generic property writes, generic restore, public property listing, arbitrary
Camera property writes, non-Camera writes, arbitrary Editor Python, and
generalized undo remain blocked.

## Candidate List

| Candidate | Current evidence | Decision |
| --- | --- | --- |
| Camera non-bool scalar readback | Camera is allowlisted, the proof-only scalar discovery helper references Camera fields beyond the admitted bool, and the existing Camera corridor has strong provenance rules. | Selected for a future read-only discovery packet. |
| Comment root string strategy | Comment provisioning and restore were proven, but live readback exposed only an empty path and non-scalar root object. | Defer until a typed strategy for empty-root properties is designed. |
| Mesh scalar-like paths | Mesh property list exposed scalar-like paths, but they are asset/render/derived/statistical or grouping evidence. | Keep blocked for write-target expansion. |
| New component class | Could reveal better scalar targets, but would require expanding the component allowlist or live fixture story. | Defer; adding components is a separate higher-risk design/proof sequence. |
| Existing entity unknown target | Existing target discovery is useful, but unknown target write/readback expansion risks ambiguous identity and prompt overreach. | Defer until exact read-only target rules are stronger. |

## Required Future Evidence

A future proof-only read-only discovery packet must record:

- backend target readiness
- canonical project and engine target
- loaded level path
- bridge heartbeat freshness
- whether the target is temporary or existing
- exact entity identity
- exact live Camera component id
- component id provenance
- property path source
- property path kind
- readback method
- observed value
- observed value type
- whether the property is bool, numeric, string, or other scalar-like evidence
- whether the property is render-, asset-, material-, prefab-, hierarchy-, or
  build-adjacent
- explicit `read_only: true`
- explicit `write_occurred: false`
- explicit `write_admission: false`
- explicit `property_list_admission: false`
- restore truth if temporary target provisioning is used

## Stop Conditions

The future read-only proof must stop without target selection if:

- backend or bridge readiness cannot be proven
- the loaded level is unknown
- the component id lacks admitted runtime provenance
- the property path is empty
- the value type is unknown or container-shaped
- the candidate is asset-, material-, render-, prefab-, hierarchy-, transform-,
  build-, or TIAF-adjacent
- readback requires public property-list admission
- readback requires arbitrary Editor Python
- selecting the candidate would imply a write, restore, or undo behavior

## Non-Goals

This discovery packet does not:

- implement a live proof harness
- run Editor or bridge automation
- admit a new public prompt path
- admit `editor.component.property.list`
- admit generic `editor.component.property.write`
- admit generic restore or generalized undo
- add new component types to the component-add/find allowlist
- change planner, dispatcher, catalog, policy, adapter, runtime, or schema code
- mutate levels, entities, components, prefabs, assets, materials, render
  state, build state, or TIAF state

## Recommended Next Normalized Packet

Create:

```text
codex/phase-8-camera-non-bool-readback-design
```

That packet should design a proof-only read-only harness for Camera non-bool
scalar readback. It must keep public prompts/refusals unchanged and must not
promote any new write or restore behavior.

If design finds the candidate too close to render behavior, record the blocker
instead of implementing a proof.

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

Revert the commit that adds this discovery document and its index/status
pointers. No runtime cleanup, dependency cleanup, proof artifact cleanup, or
asset cleanup should be required.
