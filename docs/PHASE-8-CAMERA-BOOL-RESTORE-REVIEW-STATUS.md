# Phase 8 Camera Bool Restore Review Status

Status date: 2026-04-26

Workflow stage: post-admission review/status refinement.

## Current Truth

The exact public restore corridor is admitted for only:

```text
editor.component.property.restore.camera_bool_make_active_on_activation
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

This is not generalized undo, generic property restore, generic property write,
or public property listing.

## Review Goal

After execution, the operator-facing result must make it obvious what happened,
what evidence was used, and what was not admitted.

Every successful restore review should report:

- capability name:
  `editor.component.property.restore.camera_bool_make_active_on_activation`
- target entity from the same admitted prompt chain or parsed live component id
- component: `Camera`
- property path:
  `Controller|Configuration|Make active camera on activation?`
- before-value evidence: `recorded_before_value`
- recorded before value
- current value before restore
- restore value
- restored readback
- verification result
- approval/admission class
- `write_occurred` semantics
- `restore_occurred` semantics
- restore/revert guidance
- `generalized_undo_available: false`

## Write And Restore Semantics

The restore corridor necessarily performs one bounded write because O3DE
property restoration is implemented by setting the exact Camera bool property
back to the recorded before value.

That does not admit generic property writes.

The review must separate these facts:

- `write_occurred: true` means the exact restore corridor wrote the recorded
  before value to the one admitted Camera bool path.
- `restore_occurred: true` means the exact restore operation was attempted and
  verified through restored readback.
- `write_admission: false` means the restore result must not be interpreted as
  broad write admission.
- `generic_property_write_admission: false` means arbitrary property writes
  remain unavailable.
- `generalized_undo_available: false` means no global undo/scene rollback is
  claimed.

## Refusal Boundaries

The review/status refinement does not admit any new capability.

The following remain refused or unavailable:

- generic restore prompts
- broad undo prompts
- generic property-write prompts
- public property listing
- non-Camera restores
- other Camera property restores
- non-bool restore values
- arbitrary Editor Python
- asset/material/render/build/TIAF mutation

## Operator Interpretation

If a restore review says `restored_readback_verified`, the operator can treat
the exact Camera bool property as restored to the recorded before value.

The operator must not treat that as proof of:

- generalized undo
- arbitrary scene rollback
- generic property restore
- broad Camera editing
- broad component property writes

## Revert Path

Revert the PR that introduced this review/status refinement to return to the
previous exact restore corridor output. Reverting this packet does not remove
the underlying exact public restore corridor unless the admission PR is also
reverted.

## Recommended Next Slice

The next normalized packet should be one of:

- operator examples refresh for the exact restore corridor
- checkpoint refresh for the write/restore corridor
- next read-only scalar discovery packet
