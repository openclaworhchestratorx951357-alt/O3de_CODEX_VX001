# Phase 8 Camera Bool Restore Readiness Audit

Status: readiness audit packet

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

Rollback and restore expectations are designed in:

```text
docs/PHASE-8-CAMERA-BOOL-ROLLBACK-RESTORE-DESIGN.md
```

No generalized undo is implemented, proven, or admitted.

The following remain blocked or forbidden:

- generic `editor.component.property.write`
- arbitrary component/property writes
- public `editor.component.property.list`
- arbitrary Editor Python
- asset/material/render/build/TIAF mutation
- generalized undo or broad scene rollback

## Workflow Stage

Readiness audit packet.

The normalized workflow state is:

```text
baseline/design exists -> readiness audit
```

This packet audits readiness only. It does not implement restore/revert
behavior and does not admit any new capability.

## What Restore/Revert Would Mean

For this corridor, restore/revert would mean only:

```text
write the exact Camera bool property back to a previously observed bool value
```

It would not mean:

- arbitrary undo
- file-level scene rollback
- asset/material rollback
- broad level cleanup
- restoring arbitrary properties
- restoring arbitrary Camera state
- using public property listing or public property discovery

The future restore operation must stay bound to the exact Camera component and
the exact property path:

```text
Controller|Configuration|Make active camera on activation?
```

## Required Gates Before Implementation

Before any implementation packet starts, these gates must be true or explicitly
implemented by that packet:

- before-value capture is available for the exact Camera bool write corridor
- after-value verification is available through readback
- restore-value verification is available through readback
- failure handling is specified for write, readback, restore, and target lookup
- approval class is specified as an editor mutation, not read-only behavior
- exact capability naming is chosen
- refusal boundaries are testable
- generic rollback remains refused
- non-Camera restore remains refused
- arbitrary property restore remains refused
- public property list remains unavailable
- generic property write remains blocked

Current audit result:

- before-value capture: present in the exact Camera bool write evidence model
- after-value verification: present in the exact Camera bool write evidence
  model
- restore-value verification: proven in the private proof harness and required
  for any future restore packet
- failure handling: designed, but implementation-specific handling still needs
  tests before runtime work is merged
- approval class: must remain approval-gated editor mutation
- capability naming: proposed below, not implemented
- refusal boundaries: required before implementation and already aligned with
  the existing exact-corridor refusal model

## Proposed Future Capability Name

If a future packet implements a public restore/revert corridor, use this exact
proposed name unless a later design packet supersedes it:

```text
editor.component.property.restore.camera_bool_make_active_on_activation
```

This packet does not implement or admit that capability.

## Required Tests Before Implementation

Before any restore/revert implementation is merged, tests must prove:

- exact restore is accepted only for the Camera bool path
- non-Camera restore is refused
- other Camera property restore is refused
- generic restore is refused
- restore without before-value evidence is refused
- restore with a non-bool value is refused
- public `editor.component.property.list` remains unavailable
- generic `editor.component.property.write` remains blocked
- generic rollback or undo prompts are refused
- arbitrary Editor Python remains refused
- result evidence includes before value, requested value, after value, restore
  value, restored readback, and verification status
- result evidence reports `generalized_undo_available: false`
- restore failure prevents success status
- readback failure prevents restore-success claims

## Required Live Proof Before Admission

Before any public restore corridor is admitted, a proof must run the exact
bounded sequence:

```text
read original bool
-> write inverse bool
-> verify inverse bool
-> restore original bool
-> verify original bool
```

The proof must also confirm:

- no broad surface was admitted
- no public property list was admitted
- generic property write remains blocked
- non-Camera restore remains blocked
- non-bool restore remains blocked
- arbitrary Editor Python remains blocked
- runtime proof JSON stays ignored and uncommitted unless a checkpoint summary
  is intentionally added

## Files Likely Touched In A Future Implementation

A future proof-only or public restore implementation would likely touch a narrow
subset of:

- `backend/app/services/prompt_orchestrator.py`
- `backend/app/services/editor_automation_runtime.py`
- `backend/app/services/capability_registry.py`
- `backend/app/services/catalog.py`
- `backend/app/api/routes/adapters.py`
- `backend/runtime/prove_live_editor_camera_scalar_write.py`
- `backend/runtime/live_verify_control.ps1`
- `scripts/dev.ps1`
- `scripts/setup_control_plane_editor_bridge.ps1`
- `backend/runtime/editor_scripts/control_plane_bridge_ops.py`
- `backend/tests/test_prompt_control.py`
- `backend/tests/test_editor_automation_runtime.py`
- `backend/tests/test_prove_live_editor_camera_scalar_write.py`
- `backend/tests/test_adapters.py`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`
- `docs/CURRENT-STATUS.md`

The future packet must inspect the current repo before editing because file
ownership may have shifted.

## Files That Must Not Be Touched

A future restore/revert packet must not touch unrelated:

- asset/material/render code
- build/TIAF code
- broad property-list or public discovery surfaces
- generic property-write admission
- arbitrary Editor Python surfaces
- frontend behavior
- dependency files
- GitHub settings
- branch cleanup or deletion docs unless the packet is explicitly cleanup-only

## Risk Classification

- This docs audit: low risk.
- Future proof-only restore harness: medium/high risk because it mutates live
  Editor state privately, even if it remains non-public.
- Future public restore corridor: high risk because it would admit a new public
  mutation surface.

## Go/No-Go Decision

Go for the next normalized packet only if the operator explicitly approves a
proof-only restore harness packet.

This audit finds the repo is ready to design and implement a proof-only restore
harness for the exact Camera bool path because the existing write corridor
already records before/after evidence and the private proof harness has proven
readback-verified restoration.

No-go for public restore admission right now.

Public admission still requires a separate high-risk packet with targeted tests,
fresh live proof, refusal checks, status/matrix updates, and CI.

## Recommended Next Normalized Packet

Recommended next packets:

- proof-only restore harness design/implementation only if explicitly approved
- otherwise pause Phase 8 and start the next readback-only scalar discovery
  packet
- continue report-first branch cleanup packets only when cleanup is the stated
  goal

Do not implement restore/revert behavior from this audit packet alone.

## Revert Path

This is a docs-only audit. To revert it, revert the merge commit that added this
document and its index/status/checkpoint pointers. No runtime code, public
capability, proof command, dependency, or local environment cleanup is required.
