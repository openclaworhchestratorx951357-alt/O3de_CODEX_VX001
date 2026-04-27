# Phase 8 Readback Operator Examples

Status: readback operator examples packet

Date: 2026-04-27

## Current Main SHA

This examples packet was prepared from:

```text
e00746f1dc4178083b18dff7f7063a17f912ee24
```

## Purpose

This guide gives operator wording for the current Phase 8 readback target map.
It separates safe readback-only requests from refused write, restore, discovery,
and property-list requests.

It does not admit new prompt behavior, public property listing, generic writes,
Camera far clip writes, Camera far clip restore, arbitrary Editor Python, or any
asset/material/render/build/TIAF mutation.

## Safe Readback-Only Prompts

Exact Camera bool readback:

```text
Open level "Levels/Main.level", inspect the Camera make active camera on activation bool on entity named "ShotCamera".
```

Expected result: read-only evidence for
`Controller|Configuration|Make active camera on activation?`, value type
`bool`, `read_only: true`, and `write_occurred: false`.

Camera far clip readback:

```text
Open level "Levels/Main.level", inspect the Camera far clip distance on entity named "ShotCamera".
```

Expected result: read-only evidence for
`Controller|Configuration|Far clip distance`, value type `float`,
`read_only: true`, `write_occurred: false`, `write_admission: false`,
`restore_admission: false`, and `property_list_admission: false`.

Mesh model asset readback:

```text
Open level "Levels/Main.level", inspect the Mesh model asset on entity named "Ground".
```

Expected result: read-only asset-reference evidence. This does not imply the
asset reference can be changed.

## Safe Exact Write And Restore Prompts

Only the exact Camera bool corridor has public write and restore admission.

Safe exact write:

```text
Open level "Levels/Main.level", create entity named "CameraWriteProof", add a Camera component, then set the Camera make active camera on activation bool to false.
```

Safe exact restore with recorded before-value evidence:

```text
Open level "Levels/Main.level", create entity named "CameraRestoreProof", add a Camera component, then restore the Camera make active camera on activation bool to the recorded before value true.
```

These remain approval-gated exact corridors. They do not admit generic Camera
property writes or generalized restore.

## Refused Or Not-Yet-Admitted Prompts

Camera far clip write:

```text
Set the Camera far clip distance to 512.
```

Reason: far clip is live-proven readback-only and discovered-but-not-admitted.
A future write path requires a separate design-only packet and explicit
high-risk approval before public admission.

Camera far clip restore:

```text
Restore the Camera far clip distance to its previous value.
```

Reason: no far clip restore corridor exists. Generic restore and generalized
undo remain unadmitted.

Property list:

```text
List every property on this Camera component.
```

Reason: public `editor.component.property.list` remains unavailable.

Generic write:

```text
Set any Camera property I name.
```

Reason: arbitrary Camera property writes remain unadmitted.

Generic discovery-before-write:

```text
Find whichever Camera property controls clipping and change it.
```

Reason: public discovery-before-write remains unavailable; far clip is
readback-only unless a future design/admission packet changes that.

Comment write:

```text
Set the Comment component text to "Hello".
```

Reason: the Comment scalar target proof is blocked. The live root string
metadata did not produce a scalar/text-like selected target.

Mesh asset write:

```text
Change the Mesh model asset on the Ground entity.
```

Reason: Mesh model asset is readback-only asset-reference evidence and is
blocked as a write target.

Arbitrary Editor Python:

```text
Run Editor Python to set the Camera far clip distance.
```

Reason: arbitrary Editor Python remains forbidden as a prompt surface.

## Operator Review Language

For readback-only targets, reviews should say:

- the exact entity target
- the component type
- the exact property path
- the observed value and value type when available
- `read_only: true`
- `write_occurred: false`
- whether the target is admitted, readback-only, or blocked

For Camera far clip, reviews must not say the property can be changed by an
operator. It is readback-only unless a future high-risk packet designs, proves,
reviews, and admits a separate write corridor.

## Revert Path

Revert this examples commit. No runtime cleanup, dependency cleanup, proof
artifact cleanup, asset cleanup, material cleanup, render cleanup, build
cleanup, or TIAF cleanup should be required.
