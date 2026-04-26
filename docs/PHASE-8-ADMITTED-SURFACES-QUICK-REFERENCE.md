# Phase 8 Admitted Surfaces Quick Reference

Status: operator and Codex quick reference

Date: 2026-04-26

Use this page at the start of future Phase 8 threads before planning editor
component/property work. It separates what is admitted, proof-only, blocked,
and forbidden so new slices do not accidentally widen the project.

## Current Phase 8 Status

Phase 8 is focused on guarded O3DE Editor component/property automation.

The current truth is narrow:

- one exact Camera bool write corridor is publicly admitted
- the same exact Camera bool property has a read-only operator affordance
- broad property writes remain blocked
- public property listing remains unavailable
- proof-only harnesses remain evidence, not public prompt surfaces

When this quick reference conflicts with code, tests, or observed runtime
evidence, treat code/tests/runtime as stronger and update the docs in a narrow
follow-up packet.

## Admitted Public Surfaces

Exact Camera bool write corridor:

```text
editor.component.property.write.camera_bool_make_active_on_activation
```

Exact target:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

This is approval-gated and is not a generic property-write feature. It is
admitted only for the same-chain flow that creates the target entity, adds the
Camera component, and writes the exact bool path using the live component id
returned by the admitted runtime path.

Exact Camera bool readback affordance:

```text
editor.component.find -> editor.component.property.get
```

This reads the same exact Camera bool property on one explicit target entity.
It reports current value evidence and must state that it is read-only and that
no write occurred.

## Proof-Only Surfaces

These are evidence-producing or regression-proof surfaces only. They must not
be treated as public Prompt Studio, dispatcher/catalog, or `/adapters`
admission.

- `editor.component.property.list`
- Camera scalar write proof harness
- Camera bool restore proof harness
- scalar target discovery proofs
- Comment scalar target discovery proofs
- component property-list bridge candidate proofs

Runtime proof JSON remains ignored unless a separate checkpoint summary is
intentionally committed.

## Blocked Surfaces

These remain blocked or unadmitted:

- generic `editor.component.property.write`
- public `editor.component.property.restore`
- generic property discovery/listing
- non-Camera property writes
- non-bool Camera writes
- arbitrary Camera property writes
- arbitrary property paths
- discovery-before-write flows for unknown existing targets
- prefab-derived component ids as live write targets

## Forbidden Surfaces

These are outside the current Phase 8 corridor:

- arbitrary Editor Python
- asset mutation
- material mutation
- render mutation
- build mutation through property workflows
- TIAF mutation
- generalized undo claims
- broad restore, cleanup, or viewport-reload claims

Do not present any of these as admitted unless a future high-risk packet
explicitly implements, proves, reviews, and admits them.

## Safe Prompt Examples

Read-only exact Camera bool inspection:

```text
Open level "Levels/Main.level", then show the current value of the Camera make active camera on activation bool on entity id 101.
```

```text
Open level "Levels/Main.level", inspect the Camera make active camera on activation bool on entity named "ShotCamera".
```

Approval-gated exact Camera bool write on a same-chain temporary target:

```text
Open level "Levels/Main.level", create entity named "CameraWriteProof", add a Camera component, then set the Camera make active camera on activation bool to false.
```

```text
Open level "Levels/Main.level", create entity named "CameraWriteProof", attach a Camera component, then change Controller|Configuration|Make active camera on activation? to true.
```

## Refused Prompt Examples

Public property list request:

```text
List every property on this Camera component.
```

Generic write request:

```text
Set any component property I ask for.
```

Non-selected Camera property request:

```text
Change the Camera field of view.
```

Non-Camera property request:

```text
Change the Mesh Model Asset property.
```

Arbitrary Editor Python request:

```text
Run Editor Python to set the Camera property.
```

Unknown existing target write:

```text
Find an existing Camera and toggle whatever property controls activation.
```

## Required Evidence For Admitted Camera Bool Write

Every admitted exact Camera bool write must return reviewable evidence:

- capability name
  `editor.component.property.write.camera_bool_make_active_on_activation`
- target entity from the same admitted prompt chain
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- requested bool value
- before value
- after value
- verification status or `write_verified`
- approval/admission class
- `write_occurred: true`
- `property_list_admission: false`
- `generalized_undo_available: false`
- restore or revert guidance that does not claim generalized undo

## Required Evidence For Readback-Only Request

Every exact Camera bool readback request must return reviewable evidence:

- entity target
- component `Camera`
- property path `Controller|Configuration|Make active camera on activation?`
- value type `bool`
- current value
- `read_only: true`
- `write_occurred: false`
- no property-list claim
- no write-admission claim

## Future-Thread Workflow

For future Codex threads working in this area:

1. Start from updated `main` unless the operator names a different baseline.
2. Reconfirm branch, status, and that `.venv/` is untracked only.
3. Read this quick reference before changing planner, dispatcher, adapter, or
   runtime behavior related to component properties.
4. Keep the slice small and classify it as admitted, proof-only, blocked, or
   forbidden before writing code.
5. Run targeted validation plus `surface-matrix-check` whenever a surface
   matrix or capability boundary changes.
6. Open a PR with explicit boundaries and revert path.
7. Self-merge only low-risk docs/hygiene or strongly validated narrow code
   packets that do not broaden capability unexpectedly.

Do not widen without a new high-risk approval packet.

Any future expansion beyond this page needs a dedicated design/proof/admission
packet that names the exact surface, exact target, evidence model, restore
claim, tests, validation, and rollback path.
