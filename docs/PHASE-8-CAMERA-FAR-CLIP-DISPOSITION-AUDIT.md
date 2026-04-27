# Phase 8 Camera Far Clip Disposition Audit

Status: disposition audit packet

Date: 2026-04-27

## Current Main SHA

This disposition audit was prepared from:

```text
2fac490653b13dd31a90c8d50e207e273089edd5
```

## Phase Workflow Stage

Disposition audit packet.

This packet decides how to treat the live-proven Camera non-bool readback
target from `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-LIVE-PROOF.md`.

It does not implement runtime behavior, run Editor or bridge automation, admit
public property listing, admit public prompt behavior, add write behavior, add
restore behavior, or broaden the exact Camera bool corridor.

## Live-Proven Target

The live proof selected:

```text
component: Camera
property_path: Controller|Configuration|Far clip distance
runtime_value_type: float
value_preview: 1024.0
component_id_provenance: admitted_runtime_component_add_result
status: candidate_selected_readback_only
```

The proof recorded:

```text
read_only: true
write_occurred: false
write_admission: false
restore_admission: false
property_list_admission: false
restore_result: restored_and_verified
restore_succeeded: true
```

## Disposition Decision

`Camera :: Controller|Configuration|Far clip distance :: float` should remain
readback-only for now.

It is a valid future write-candidate design target, but it is not ready for
public prompt admission, public write admission, public restore admission, or
property-list admission.

Reason:

- the proof established readback, type, value preview, component id provenance,
  and cleanup restore truth
- the property is not the admitted Camera bool path
- float write safety, valid range, before/after verification, restoration
  semantics, and operator-facing review wording have not been designed yet
- no public prompt examples, approval wording, restore requirements, or rollback
  model exist for this float path
- exact Camera bool remains the only admitted Camera property write/restore
  corridor

## Required Future Gates Before Any Write

A future Camera far-clip write packet must first add a separate design packet
that answers:

- exact admitted property path and value type
- safe requested value range and invalid-value rejection rules
- before/read/write/read-after verification model
- loaded-level restore boundary requirements
- exact restore/revert design for the prior float value
- approval wording and operator review fields
- prompt examples for safe and refused requests
- tests proving generic Camera writes and property listing remain blocked

Any public write or restore admission for this path is high risk and requires
explicit operator approval.

## Current Boundary

Allowed now:

- private proof-only readback evidence for the far clip path
- docs-only audit, design, and checkpoint packets
- targeted tests that preserve public boundaries

Not allowed now:

- public Prompt Studio admission for far clip writes
- public `editor.component.property.write` admission for far clip
- public restore admission for far clip
- public property-list admission
- generic Camera property writes
- arbitrary Editor Python prompt behavior
- asset, material, render, build, or TIAF mutation

## Recommended Next Packet

Create one of:

```text
codex/phase-8-camera-far-clip-readback-checkpoint
codex/phase-8-camera-far-clip-write-candidate-design
```

The first is lower risk and simply checkpoints the discovered target as
readback-only. The second is a design-only packet and must not implement writes
or admission.

## Validation Commands For This Packet

This docs-only packet should be validated with:

```powershell
git diff --check
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_prove_live_editor_scalar_target_discovery.py -q
.\.venv\Scripts\python.exe -m pytest tests\test_dispatcher.py -k "editor_component_find or editor_component_property_get or camera_bool" -q
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "component_find or component_property_get or camera_bool" -q
Pop-Location
git diff --cached --check
```

## Revert Path

Revert the disposition audit commit. No runtime cleanup, dependency cleanup,
proof artifact cleanup, asset cleanup, material cleanup, render cleanup, build
cleanup, or TIAF cleanup should be required.
