# Phase 8 Camera Bool Rollback And Restore Design

Status: design packet

Date: 2026-04-26

## Current Truth

One exact public Camera bool write corridor is admitted:

```text
editor.component.property.write.camera_bool_make_active_on_activation
```

The exact admitted target is:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

The matching read-only affordance remains:

```text
editor.component.find -> editor.component.property.get
```

That readback path reports the current value without writing. Expected readback
review evidence includes the entity target, `Camera` component, exact property
path, value type `bool`, current value, `read_only: true`, and
`write_occurred: false`.

Broad surfaces remain blocked or forbidden:

- generic `editor.component.property.write`
- arbitrary component/property writes
- public `editor.component.property.list`
- arbitrary Editor Python
- asset/material/render/build/TIAF mutation
- generalized undo or broad rollback claims

## Why Rollback And Restore Need A Separate Design

The Camera bool proof harness has already proven a bounded write/restore cycle:
read the original bool, write the inverse bool, verify the changed value, restore
the original bool, verify the restored value, and restore the selected loaded
level prefab from a pre-mutation backup.

That proof does not mean the public corridor has generalized undo.

The public corridor can safely tell an operator what value changed and how to
re-run the same exact corridor with a recorded previous value. It cannot claim
arbitrary scene rollback, live Editor undo, viewport reload, or broad cleanup
unless a future packet implements and verifies those behaviors.

Rollback and restore therefore need their own design packet before the repo
promotes any stronger operator-facing revert promise.

## Terms And Boundaries

### Restore Inside The Proof Harness

The proof harness is private/proof-only evidence. It can use its own bounded
pre-mutation evidence to restore the exact Camera bool value and verify readback.
It may also restore a selected loaded-level prefab from a pre-mutation backup
when the proof command captures and verifies that restore boundary.

This remains stronger than ordinary operator guidance because the harness owns
the full proof sequence and artifact model.

### Operator Revert Guidance

Operator revert guidance is not automatic undo. It is review text that tells the
operator the recorded before value and explains the narrow way to reverse the
same exact Camera bool change:

```text
Re-run the same exact Camera bool corridor with the recorded previous value.
```

This guidance must name the exact component, exact property path, previous
value, requested value, and current verification state when available.

### Generalized Undo

Generalized undo would mean a public claim that the system can roll back broad
Editor state, arbitrary scene changes, or unknown side effects. That is not
implemented, not proven, and not admitted.

Any response must continue to report:

```text
generalized_undo_available: false
```

unless a future high-risk packet implements and proves a real undo corridor.

### Loaded-Level Prefab Restore

Loaded-level prefab restore is a bounded proof technique that restores a
selected loaded-level file from a captured pre-mutation backup and verifies the
file hash. It is not public undo, not viewport reload, and not a guarantee that
every live Editor handle remains valid after restore.

Loaded-level file restore may be used in proof harnesses only when the proof
captures the restore boundary before mutation and verifies restoration after the
operation.

## Current Allowed Restore Claim

Allowed claim:

```text
The proof harness can restore the exact pre-proof Camera bool value and verify
the restored readback for the proof target.
```

For proof runs that also capture loaded-level restore evidence, it may also
claim:

```text
The selected loaded-level prefab restore boundary was restored and verified for
that proof run.
```

Both claims require run-specific evidence. They do not apply automatically to
every public write request.

## Current Forbidden Restore Claim

Do not claim:

- generalized undo
- arbitrary scene rollback
- asset/material/prefab-wide rollback
- broad level cleanup
- viewport reload
- live Editor undo stack integration
- rollback for arbitrary component/property writes
- rollback for non-Camera properties
- rollback for asset, material, render, build, or TIAF mutation

## Future Implementation Options

### Explicit Reverse Write Using Before Value

The smallest future revert feature would accept only the recorded previous bool
value from the exact Camera bool corridor and issue the same exact admitted
write corridor with that bool value.

This option should remain limited to:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

It should still require approval because it mutates the live editor level.

### Checkpointed Before-Value Restore

A stronger future option could persist a checkpoint summary that records the
entity target, component id/provenance, exact path, before value, requested
value, after value, and verification state.

The restore operation would then validate that the checkpoint still matches the
live target before writing the before value back. If the target no longer
matches, it must fail closed.

### Loaded-Level File Restore Under Bounded Proof Conditions

Loaded-level file restore should remain a proof-harness or explicitly approved
operator-maintenance path unless a future high-risk packet admits it publicly.

Required conditions include:

- restore boundary captured before mutation
- selected level path recorded
- pre-restore and post-restore file hashes recorded
- restoration verified
- no claim that live Editor handles, viewport state, or undo stack were restored

## Required Evidence For Any Future Rollback Feature

Any future rollback or revert feature must return:

- entity target
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- value type `bool`
- before value
- requested value
- after value
- restore value
- restored readback
- verification status
- approval/admission class
- whether the action was a reverse write or proof restore
- `generalized_undo_available: false`

The operation must fail closed if it cannot produce the required evidence.

## Failure Behavior

### Write Succeeds But Restore Fails

If a future write succeeds but restore fails, the result must not claim rollback
success. It must report the target entity, exact property path, before value,
requested value, current value if available, failed restore step, and safest
manual recovery guidance.

The PR or live proof must not be merged as a successful rollback feature while
this state is unresolved.

### Readback Unavailable

If readback is unavailable before write, the operation must refuse the write
because it cannot record a restore value.

If readback is unavailable after write or after restore, the operation must
report the blocker and avoid claiming verification.

### Entity Or Component Missing

If the entity or Camera component is missing, the operation must fail closed.
It must not fall back to arbitrary scene search, guessed component ids, prefab
component records, or operator-supplied stale component ids.

### Level Not Loaded

If the required level context is unavailable, the operation must fail closed
before write or restore. The operator guidance may ask for an explicit level
open step, but it must not infer a target level.

## Required Tests Before Claiming Rollback

Before a future packet claims rollback or revert behavior, tests must prove:

- exact Camera bool restore path writes the recorded previous bool value
- restore readback verifies the previous bool value
- generic rollback prompts are refused
- non-Camera rollback prompts are refused
- arbitrary property rollback prompts are refused
- non-bool values are refused
- public `editor.component.property.list` remains unavailable
- broad `editor.component.property.write` remains blocked
- result text reports `generalized_undo_available: false`
- restore failure prevents success status
- readback failure prevents restore-success claims

## Recommended Next Normalized Packet

Safe next packets:

- readiness audit for an exact Camera bool restore/revert capability
- pause Phase 8 and start the next readback-only discovery packet
- continue report-first branch cleanup packets without deleting uncertain
  branches

Do not implement rollback, generalized undo, or broader property writes from
this design packet alone.

## Revert Path

This is a docs-only packet. To revert it, revert the merge commit that added
this document and its index/status pointers. No runtime code, public capability,
proof command, or dependency state needs cleanup.
