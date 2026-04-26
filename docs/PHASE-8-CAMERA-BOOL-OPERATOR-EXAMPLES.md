# Phase 8 Camera Bool Operator Examples

Status: operator examples for one exact admitted corridor

Date: 2026-04-26

This guide gives operators safe prompt wording for inspecting, changing, or
restoring the one admitted Camera bool target without implying broad
component-property editing support.

## Current Truth

The only admitted public component-property write corridor is:

```text
editor.component.property.write.camera_bool_make_active_on_activation
```

The only admitted public component-property restore corridor is:

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

- entity target
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- current value
- `read_only: true`
- `write_occurred: false`

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

- entity target
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- requested value
- before value
- after value
- verification status
- `write_occurred: true`
- `generalized_undo_available: false`

The write corridor is approval-gated. A successful write should include
before/write/after evidence and narrow restore or revert guidance.

## Safe Restore Prompts

Use restore prompts only for the exact same-chain flow that creates the
temporary target, adds the Camera component, and includes recorded bool
before-value evidence. This is not generalized undo.

```text
Open level "Levels/Main.level", create entity named "CameraRestoreProof", add a Camera component, then restore the Camera make active camera on activation bool to the recorded before value true.
```

Expected restore review fields:

- entity target
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- recorded before value
- current value before restore
- restored value
- restored readback
- verification status
- `restore_occurred: true`
- `write_admission: false`
- `generic_property_write_admission: false`
- `generalized_undo_available: false`

## Unsafe Or Refused Prompts

These should still be refused or routed away from public admission:

```text
List all Camera properties.
```

Reason: public `editor.component.property.list` remains unavailable.

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
