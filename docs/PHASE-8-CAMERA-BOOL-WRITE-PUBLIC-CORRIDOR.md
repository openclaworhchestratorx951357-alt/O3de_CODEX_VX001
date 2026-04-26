# Phase 8 Camera Bool Write Public Corridor

Status: high-risk exact public admission packet

Date: 2026-04-26

This packet admits one public, approval-gated editor property write corridor:

```text
editor.component.property.write.camera_bool_make_active_on_activation
```

It is not a general `editor.component.property.write` feature.

It admits exactly this target:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

## Current Admission

The public corridor may write only the exact Camera bool property path named
above. The request must provide a boolean value, a live component id with
`admitted_runtime_component_add_result` provenance, and a restore boundary id
captured before mutation.

The operation remains approval-gated as a `content_write` editor mutation.

The public runtime operation must:

- pre-read the original value
- write the requested bool value
- post-read and verify the requested value
- emit previous/requested/current evidence
- emit restore or revert guidance
- keep `property_list_admission` false
- keep broad property-write admission false

## What Stays Forbidden

These remain forbidden:

- generic `editor.component.property.write`
- arbitrary component writes
- arbitrary Camera property writes
- non-bool writes
- public `editor.component.property.list`
- arbitrary Editor Python
- asset, material, render, build, or TIAF mutation
- generalized undo or broad cleanup claims
- prefab-derived component ids as live write targets

## Prompt Boundary

Prompt Studio may plan this exact corridor only when the prompt creates the
live target and adds the Camera component in the same admitted chain. That keeps
the write target tied to a runtime component id returned by the already
admitted `editor.component.add` path.

Prompts that ask to modify an existing unknown component, set an arbitrary
property path, list properties before writing, or write any non-selected Camera
property must still be refused.

## Evidence Model

Every successful dispatch result must preserve reviewable evidence:

- capability name
- approval-gated execution mode
- component name `Camera`
- component id
- component id provenance
- property path
- requested value
- previous value
- verified changed/current value
- bridge operation used by the bounded runtime path
- `write_verified: true`
- `public_admission: true`
- `write_admission: true`
- `property_list_admission: false`
- restore or revert guidance

## Operator Review Status

Prompt-level operator review for this exact corridor should make the write
status readable without opening raw execution details.

The review should name:

- capability
  `editor.component.property.write.camera_bool_make_active_on_activation`
- target entity from the same admitted prompt chain
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- before value
- requested bool value
- after/readback value
- `write_verified`
- admission class `content_write`
- `generalized_undo_available: false`
- restore/revert guidance

Generic property-write prompts must still be refused. Public property-list
access must still be unavailable.

The allowed restore/revert statement is narrow:

```text
This is not generalized undo. To revert the value, rerun the same exact Camera
bool corridor with the recorded previous value when available, or restore the
recorded loaded-level restore boundary outside the public corridor.
```

Do not claim live Editor undo, viewport reload, broad level cleanup, or
generalized reversibility.

## Fresh Live Proof Requirement

This admission packet reran:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-scalar-write-proof
```

Fresh ignored runtime artifact:

```text
backend/runtime/live_editor_camera_scalar_write_proof_20260426-173312.json
```

The proof passed with `status: succeeded_verified` and `succeeded: true`.

Observed proof evidence:

- selected level: `Levels/TestLoevel01`
- entity: `CodexCameraScalarWriteProofEntity_20260426_173312`
- component: `Camera`
- component id provenance: `admitted_runtime_component_add_result`
- original value: `true`
- proof write requested value: `false`
- changed readback: `false`
- proof restore requested value: `true`
- restored readback: `true`
- loaded-level restore result: `restored_and_verified`
- runtime proof JSON ignored and uncommitted
- `public_admission: false` inside the proof harness, because the proof command
  remains private/proof-only evidence

The proof command remains the proof harness. It does not admit a generic
property-write bridge operation, and it does not expose property list.

## Validation Required

Required validation for this admission packet:

- Ruff on touched backend files and tests
- targeted dispatcher/catalog/adapter/schema tests
- targeted prompt-control tests
- targeted editor runtime tests
- existing proof-only Camera write harness tests
- `surface-matrix-check`
- `git diff --check`
- `git diff --cached --check`
- live `live-camera-scalar-write-proof`

## Revert Path

If the exact public corridor causes problems:

1. Revert the merge commit that admits this corridor.
2. Confirm Prompt Studio again refuses Camera property-write prompts.
3. Confirm dispatcher/catalog no longer include
   `editor.component.property.write.camera_bool_make_active_on_activation`.
4. Confirm `/adapters` no longer exposes the exact corridor.
5. Leave historical proof-only docs and ignored runtime artifacts intact unless
   later evidence invalidates them.

Do not rewrite history.
