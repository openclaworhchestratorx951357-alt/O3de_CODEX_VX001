# Phase 8 Camera Bool Operator Examples

Status: operator examples for the exact admitted Camera bool corridors

Date: 2026-04-26

This guide gives operators safe prompt wording for inspecting, changing, and
restoring the one admitted Camera bool target without implying broad
component-property editing, generic restore, or generalized undo support.

For the broader readback-only target map, including Camera far clip distance,
also see `docs/PHASE-8-READBACK-OPERATOR-EXAMPLES.md`.

## Current Truth

The admitted public component-property write corridor is:

```text
editor.component.property.write.camera_bool_make_active_on_activation
```

The admitted public component-property restore corridor is:

```text
editor.component.property.restore.camera_bool_make_active_on_activation
```

It targets exactly:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

The matching read-only inspection path is:

```text
editor.component.find -> editor.component.property.get
```

That readback path inspects the current value only. It does not perform a
write, does not list properties, and does not admit generic property editing.

Together, these are exact corridors for one bool property. They are not a
general property system.

## Safe Readback Prompts

Use readback prompts when you want to inspect the current value on an existing
entity that can be identified by exact entity id or exact entity name.

```text
Open level "Levels/Main.level", then show the current value of the Camera make active camera on activation bool on entity id 101.
```

```text
Open level "Levels/Main.level", inspect the Camera make active camera on activation bool on entity named "ShotCamera".
```

```text
Open level "Levels/Main.level", get the current value of Controller|Configuration|Make active camera on activation? for the Camera component on entity id 101.
```

Expected readback review fields:

- capability path or chain:
  `editor.component.find -> editor.component.property.get`
- entity target
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- value type `bool`
- current value
- `read_only: true`
- `write_occurred: false`
- public property list remains unavailable

## Other Readback-Only Camera Evidence

`Camera :: Controller|Configuration|Far clip distance :: float` is live-proven
readback-only evidence. Operators may ask to inspect it, but it is not admitted
for writes or restore.

```text
Open level "Levels/Main.level", inspect the Camera far clip distance on entity named "ShotCamera".
```

Expected far clip readback review fields:

- capability path or chain:
  `editor.component.find -> editor.component.property.get`
- entity target
- component `Camera`
- property path `Controller|Configuration|Far clip distance`
- value type `float`
- current value when available
- `read_only: true`
- `write_occurred: false`
- `write_admission: false`
- `restore_admission: false`
- `property_list_admission: false`

Do not present far clip as changeable by an operator unless a future high-risk
packet designs, proves, reviews, and admits a separate exact corridor.

## Safe Write Prompts

Use write prompts only for the exact same-chain flow that creates the temporary
target and adds the Camera component before writing the exact bool property.
This keeps the write bound to a live component id returned by the admitted
runtime chain.

```text
Open level "Levels/Main.level", create entity named "CameraWriteProof", add a Camera component, then set the Camera make active camera on activation bool to false.
```

```text
Open level "Levels/Main.level", create entity named "CameraWriteProof", attach a Camera component, then change Controller|Configuration|Make active camera on activation? to true.
```

Expected write review fields:

- capability name:
  `editor.component.property.write.camera_bool_make_active_on_activation`
- entity target
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- requested value
- before value
- after value
- verification result or `write_verified`
- approval/admission class
- `write_occurred: true`
- `property_list_admission: false`
- `generalized_undo_available: false`

The write corridor is approval-gated. A successful write should include
before/write/after evidence and narrow restore or revert guidance. The guidance
must not claim generalized undo.

## Safe Restore Prompts

Use restore prompts only for the exact same-chain flow that creates the
temporary target, adds the Camera component, and includes recorded bool
before-value evidence. This is not generalized undo and cannot restore any
other property.

```text
Open level "Levels/Main.level", create entity named "CameraRestoreProof", add a Camera component, then restore the Camera make active camera on activation bool to the recorded before value true.
```

```text
Open level "Levels/Main.level", create entity named "CameraRestoreProof", attach a Camera component, then restore Controller|Configuration|Make active camera on activation? to its recorded before value false.
```

Expected restore review fields:

- capability name:
  `editor.component.property.restore.camera_bool_make_active_on_activation`
- entity target
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- before-value evidence: `recorded_before_value`
- recorded before value
- current value before restore
- restore value
- restored readback
- verification result or `restore_verified`
- approval/admission class
- `write_occurred: true` only because the exact restore corridor performs one
  bounded write of the recorded before value
- `restore_occurred: true`
- `write_admission: false`
- `generic_property_write_admission: false`
- `property_list_admission: false`
- `generalized_undo_available: false`

## Unsafe Or Refused Prompts

These should still be refused or routed away from public admission:

```text
List all Camera properties.
```

Reason: public `editor.component.property.list` remains unavailable.

```text
Discover every writable property on this Camera component.
```

Reason: public property discovery/listing remains unavailable.

```text
Set any Camera property I name to false.
```

Reason: arbitrary Camera property writes remain unadmitted.

```text
Change the Mesh Model Asset property.
```

Reason: asset/model/material-adjacent property writes remain blocked.

```text
Run Editor Python to set the Camera property.
```

Reason: arbitrary Editor Python remains forbidden as a prompt surface.

```text
Find an existing Camera and toggle whatever property controls activation.
```

Reason: the public write corridor is exact and same-chain bounded; it does not
admit generic discovery-before-write or writes to unknown existing targets.

```text
Undo the last editor change.
```

Reason: generalized undo remains unadmitted.

```text
Restore any property on this Camera component.
```

Reason: generic restore remains unadmitted; only the exact Camera bool restore
corridor with recorded before-value evidence is admitted.

```text
Restore the Camera make active camera on activation bool.
```

Reason: restore requests must include recorded bool before-value evidence.

```text
Restore the Mesh component to its previous value.
```

Reason: non-Camera restores remain unadmitted.

```text
Restore the Camera field of view to the old value.
```

Reason: other Camera property restores remain unadmitted.

```text
Set the Camera far clip distance to 512.
```

Reason: Camera far clip is readback-only and discovered-but-not-admitted.

```text
Restore the Camera far clip distance to its previous value.
```

Reason: no Camera far clip restore corridor exists.

```text
Use Editor Python to restore the Camera bool.
```

Reason: arbitrary Editor Python remains forbidden, even when the requested end
state resembles the exact corridor.

```text
Change a material, render setting, asset reference, build setting, or TIAF state.
```

Reason: asset/material/render/build/TIAF mutation remains outside this corridor.

## Troubleshooting

No level loaded:

Use an explicit `Open level "..."` phrase. Readback and write reviews should
name the level context when runtime evidence is available.

Entity not found:

For readback, provide exactly one entity id or exact entity name. Broad scene
search is not part of this corridor.

Camera component not found:

For readback, the target entity must already have a live Camera component. For
write prompts, the admitted public corridor expects the same prompt to add the
Camera component before writing.

Non-bool value requested:

Use `true` or `false`. Values such as `yes`, `on`, `1`, strings, vectors, or
objects are not the admitted bool request shape unless separately normalized by
the planner and verified as bool.

Restore or revert expectations:

This is not generalized undo. The exact restore corridor may restore only the
same Camera bool property to recorded bool before-value evidence. Do not treat
this as live Editor undo, viewport reload, or broad cleanup.

If a restore review reports `write_occurred: true`, read it narrowly: the
restore corridor performed one bounded write of the recorded before value to the
exact Camera bool path. It does not mean generic property writes are admitted.

## Safety Guidance

This guide does not admit:

- generic `editor.component.property.write`
- generic `editor.component.property.restore`
- public `editor.component.property.list`
- arbitrary component/property writes
- arbitrary Editor Python
- asset, material, render, build, or TIAF mutation
- generalized undo or broad restore claims

If the corridor causes confusion or needs to be disabled, revert the PR that
introduced the operator examples first for wording-only rollback. To remove the
runtime corridor itself, revert the public admission PR and re-run the prompt,
dispatcher, schema, and surface-matrix validation that guards the exact Camera
bool capability.
