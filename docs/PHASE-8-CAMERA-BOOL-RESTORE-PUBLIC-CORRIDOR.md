# Phase 8 Camera Bool Restore Public Corridor

Status: high-risk exact public admission packet

Date: 2026-04-26

This packet admits one public, approval-gated editor property restore corridor:

```text
editor.component.property.restore.camera_bool_make_active_on_activation
```

It is not generalized undo.

It is not generic property restore.

It is not generic property write.

It admits exactly this target:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

## Current Admission

The public corridor may restore only the exact Camera bool property path named
above. The request must provide:

- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- a live component id with `admitted_runtime_component_add_result` provenance
- recorded bool `before_value` evidence
- a restore boundary id captured before mutation

The operation remains approval-gated as a `content_write` editor mutation.

The public runtime operation must:

- read the current value before restore
- write only the recorded bool `before_value`
- read back and verify the restored value
- emit before/current/restored/readback evidence
- keep `generalized_undo_available: false`
- keep generic property restore admission false
- keep generic property write admission false
- keep `property_list_admission: false`

## What PR #53 Proved

PR #53 live-proved the private proof-only restore harness:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-bool-restore-proof
```

Fresh proof artifact:

```text
backend/runtime/live_editor_camera_bool_restore_proof_20260426-214147.json
```

Observed evidence:

- before value: `true`
- inverse write: `false`
- changed readback: `false`
- restore value: `true`
- restored readback: `true`
- loaded-level cleanup restore: `restored_and_verified`
- generalized undo: false
- public restore admission inside that proof harness: false

This public corridor is admitted from that exact proof evidence plus the
separate admission decision in
`docs/PHASE-8-CAMERA-BOOL-RESTORE-ADMISSION-DECISION.md`.

## What Stays Forbidden

These remain blocked or forbidden:

- generic `editor.component.property.restore`
- generic `editor.component.property.write`
- arbitrary undo
- arbitrary component restore
- arbitrary Camera property restore
- non-bool Camera restore
- restore without recorded before-value evidence
- public `editor.component.property.list`
- arbitrary Editor Python
- asset, material, render, build, or TIAF mutation
- broad scene rollback
- viewport reload claims

## Prompt Boundary

Prompt Studio may plan this exact corridor only when the prompt creates the
live target and adds the Camera component in the same admitted chain. That keeps
the restore target tied to a runtime component id returned by the already
admitted `editor.component.add` path.

The prompt must name the exact Camera bool target and include recorded bool
before-value evidence, for example:

```text
Open level "Levels/Main.level", create entity named "CameraRestoreProof", add a Camera component, then restore the Camera make active camera on activation bool to the recorded before value true.
```

Prompts that ask for generic undo, broad restore, arbitrary property restore,
or restore without before-value evidence must still be refused.

## Evidence Model

Every successful dispatch result must preserve reviewable evidence:

- capability name
  `editor.component.property.restore.camera_bool_make_active_on_activation`
- approval-gated execution mode
- component name `Camera`
- component id
- component id provenance
- property path
- recorded before value
- current value before restore
- restored value
- restored readback
- verification status or `restore_verified`
- bridge operation used by the bounded runtime path
- `public_admission: true`
- `restore_admission: true`
- `write_admission: false`
- `generic_property_write_admission: false`
- `property_list_admission: false`
- `generalized_undo_available: false`

## Operator Review Status

Prompt-level operator review for this exact corridor should name:

- capability
  `editor.component.property.restore.camera_bool_make_active_on_activation`
- target entity from the same admitted prompt chain
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- recorded before value
- current value before restore
- restored value
- restored readback
- verification status
- admission class `content_write`
- `generalized_undo_available: false`
- restore/revert guidance that states this is not generalized undo

## Fresh Live Proof Requirement

This admission packet reran:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-bool-restore-proof
```

Fresh ignored runtime artifact:

```text
backend/runtime/live_editor_camera_bool_restore_proof_20260426-222106.json
```

The proof passed with `status: restore_succeeded_verified` and
`succeeded: true`.

Observed proof evidence:

- selected level: `Levels/TestLoevel01`
- entity: `CodexCameraBoolRestoreProofEntity_20260426_222106`
- component: `Camera`
- component id provenance: `admitted_runtime_component_add_result`
- before value: `true`
- inverse write value: `false`
- changed readback: `false`
- restore value: `true`
- restored readback: `true`
- loaded-level cleanup restore: `restored_and_verified`
- public restore capability admitted in `/adapters` gated paths: `true`
- `generalized_undo_available: false`
- runtime proof JSON ignored and uncommitted

The proof command remains the private proof harness. It does not execute a
generic restore operation, does not expose property list, and does not claim
generalized undo. It provides fresh live evidence that the exact before/change/
restore/readback flow remains healthy before the public corridor is merged.

Runtime proof JSON remains ignored and uncommitted.

## Revert Path

If the exact public restore corridor causes problems:

1. Revert the merge commit that admits this corridor.
2. Confirm Prompt Studio again refuses Camera restore prompts.
3. Confirm dispatcher/catalog no longer include
   `editor.component.property.restore.camera_bool_make_active_on_activation`.
4. Confirm `/adapters` no longer exposes the exact restore corridor.
5. Leave historical proof-only docs and ignored runtime artifacts intact unless
   later evidence invalidates them.

Do not rewrite history.
