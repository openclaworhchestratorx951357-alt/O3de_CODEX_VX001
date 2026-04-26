# Phase 8 Camera Bool Restore Admission Decision

Status: admission decision packet

Date: 2026-04-26

This packet decides the boundary for the proof-only Camera bool restore harness
from PR #53.

It does not implement public restore/revert behavior.

It does not admit generalized undo.

## Current Truth

The exact Camera bool write corridor is public and admitted:

```text
editor.component.property.write.camera_bool_make_active_on_activation
```

The exact target remains:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

The exact Camera bool restore harness is proof-only. Its command is:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-bool-restore-proof
```

Public restore/revert is unimplemented and unadmitted.

Generalized undo remains false and unclaimed.

The matching read-only affordance remains:

```text
editor.component.find -> editor.component.property.get
```

## Phase Workflow Stage

Admission decision packet.

The normalized workflow state is:

```text
proof-only evidence -> admission decision
```

This packet decides the admission boundary only. It does not promote the
proof-only restore harness into public runtime behavior.

## What PR #53 Proved

PR #53 added and live-proved a private proof-only reverse-write restore harness.

Proof command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-bool-restore-proof
```

Ignored runtime artifact:

```text
backend/runtime/live_editor_camera_bool_restore_proof_20260426-214147.json
```

Observed proof evidence:

- before value: `true`
- inverse write value: `false`
- changed readback: `false`
- restore value: `true`
- restored readback: `true`
- loaded-level cleanup restore: `restored_and_verified`
- restore path: `proof_only_reverse_write`
- component id provenance: `admitted_runtime_component_add_result`
- `write_admission`: `false`
- `restore_admission`: `false`
- `property_list_admission`: `false`
- `public_admission`: `false`
- `generalized_undo_available`: `false`

The proof also confirmed that `/adapters` did not expose property list, generic
property write, property restore, or the proof-only restore operation.

## Admission Decision

Decision: keep the Camera bool restore harness proof-only for now.

The proof is strong enough to become the candidate basis for one future exact
public restore corridor, but that corridor must be implemented in a separate
operator-approved high-risk PR.

No public restore/revert capability is admitted by this packet.

No generalized undo is admitted by this packet.

## Proposed Future Capability Name

If a future public restore corridor is explicitly approved, use this exact
capability name unless a later admission packet supersedes it:

```text
editor.component.property.restore.camera_bool_make_active_on_activation
```

That capability is a proposal only in this packet. It is not implemented or
admitted.

## Meaning Of A Future Public Corridor

A future public restore corridor would mean only:

- restore the exact Camera bool path
- restore only from recorded before-value evidence
- accept only bool restore values
- require the exact Camera component
- require the exact property path
- require live component id provenance
- require approval as an editor mutation
- return before/change/restore/readback evidence
- keep `generalized_undo_available: false`

It would not mean arbitrary undo.

It would not mean generic property restore.

It would not mean file-level scene rollback as a public user feature.

It would not mean public property listing or discovery-before-restore.

## What Must Remain Blocked

These remain blocked or forbidden even if the exact Camera bool restore corridor
is admitted later:

- generic restore
- generic property writes
- public property list
- arbitrary component/property restore
- arbitrary Camera property restore
- non-bool Camera restore
- restore without recorded before-value evidence
- arbitrary Editor Python
- asset/material/render/build/TIAF mutation
- generalized undo
- broad scene rollback
- viewport reload claims

## Required Tests Before Future Admission

Before any future public restore admission, tests must prove:

- exact restore is accepted only for the Camera bool path
- non-Camera restore is refused
- other Camera property restore is refused
- restore without before-value evidence is refused
- restore with non-bool value is refused
- generic undo prompts are refused
- generic restore prompts are refused
- public property list remains unavailable
- generic property write remains blocked
- public restore result includes before value, changed value, restore value,
  restored readback, verification status, and approval class
- public restore result reports `generalized_undo_available: false`
- restore failure prevents success status
- readback failure prevents restore-success claims

## Required Live Proof Before Future Admission

Before any public restore corridor is admitted, rerun:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-bool-restore-proof
```

The proof must verify:

- before value
- inverse write
- changed readback
- restore value
- restored readback
- loaded-level cleanup restore
- no public property-list admission
- no generic property-write admission
- no generic restore admission
- no arbitrary Editor Python
- no generalized undo claim

The raw runtime artifact must remain ignored unless a future packet explicitly
commits a checkpoint summary.

## Likely Future Implementation Files

A future public admission packet would likely inspect and may narrowly touch:

- `backend/app/services/prompt_orchestrator.py`
- `backend/app/services/editor_automation_runtime.py`
- `backend/app/services/capability_registry.py`
- `backend/app/services/catalog.py`
- `backend/app/api/routes/adapters.py`
- `backend/runtime/prove_live_editor_camera_bool_restore.py`
- `backend/runtime/prove_live_editor_camera_scalar_write.py`
- `backend/tests/test_prompt_control.py`
- `backend/tests/test_editor_automation_runtime.py`
- `backend/tests/test_prove_live_editor_camera_bool_restore.py`
- `backend/tests/test_adapters.py`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`
- `docs/CURRENT-STATUS.md`

The future packet must inspect the current repo before editing because file
ownership may shift.

## Files And Areas That Must Not Be Touched

A future public restore corridor must not touch unrelated:

- asset/material/render behavior
- build/TIAF behavior
- broad property-list or public discovery surfaces
- generic property-write admission
- arbitrary Editor Python surfaces
- dependency files
- GitHub settings
- branch cleanup or deletion docs unless the packet is explicitly cleanup-only

## Safety And Revert Notes

If the proof-only restore harness causes confusion:

1. Revert PR #53 or the later merge commit that introduced the harness.
2. Keep the exact public Camera bool write corridor decision separate unless it
   is also the source of the problem.
3. Confirm `/adapters` still does not expose property restore.
4. Confirm Prompt Studio still refuses generic restore and undo requests.
5. Leave ignored runtime proof artifacts uncommitted.
6. Do not rewrite history.

If a future public restore corridor causes problems, revert the public admission
PR first. Do not remove the proof-only evidence unless later runtime evidence
invalidates it.

## Recommended Next Normalized Packet

Safe next packets:

- exact public restore corridor only if explicitly approved
- otherwise pause Phase 8 and start the next readback-only scalar discovery
- report-first branch cleanup packet if cleanup becomes the priority

Do not implement public restore/revert behavior from this decision packet alone.

## Revert Path

This is a docs-only admission decision. To revert it, revert the merge commit
that added this document and its index/status/matrix pointers. No runtime code,
public capability, proof command, dependency, or local environment cleanup is
required.
