# Phase 8 Camera Non-Bool Readback Live Proof

Status: live proof checkpoint

Date: 2026-04-27

## Current Main SHA

This live proof packet was prepared from:

```text
f831c0f306f5b1f40f6fe91d1eca710fa6a88c5e
```

## Phase Workflow Stage

Live proof checkpoint.

This packet records a successful proof-only Camera non-bool scalar readback
run. It does not admit public prompt behavior, public property listing, a write
corridor, a restore corridor, or arbitrary Camera property mutation.

## Live Proof Command

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-scalar-target-discovery-proof
```

The command refreshed the project-local ControlPlaneEditorBridge setup before
running so the live Editor bridge matched the repo proof rules.

## Proof Artifact

Runtime artifact:

```text
backend/runtime/live_editor_scalar_target_discovery_proof_20260427-030832.json
```

The artifact remains ignored and is not committed.

## Selected Readback Candidate

The live proof selected:

```text
component: Camera
property_path: Controller|Configuration|Far clip distance
runtime_value_type: float
value_preview: 1024.0
component_id_provenance: admitted_runtime_component_add_result
status: candidate_selected_readback_only
```

The selected property is not:

- `Controller|Configuration|Make active camera on activation?`
- bool-like
- asset-adjacent
- material-adjacent
- render target texture-adjacent
- transform-adjacent
- shaped/container-valued

## Boundary Results

The proof summary recorded:

```text
read_only: true
write_occurred: false
write_admission: false
restore_admission: false
property_list_admission: false
adapters_boundary.property_list_exposed: false
adapters_boundary.property_write_exposed: false
```

The proof used `BuildComponentPropertyList` and
`EditorComponentAPIBus.GetComponentProperty` for the selected readback. It did
not call `SetComponentProperty`.

## Restore And Cleanup

The proof temporarily provisioned a Camera target entity in the safe test level
and restored the loaded-level prefab boundary afterward.

Cleanup result:

```text
restore_result: restored_and_verified
restore_succeeded: true
restore_strategy: restore-loaded-level-file-from-pre-mutation-backup
```

This restore is proof cleanup only. It does not admit generic restore,
generalized undo, or a public Camera non-bool restore corridor.

## Control Harness Fix

An earlier live attempt failed because the project-local bridge selected the
already admitted Camera bool path. This packet updates the live control flow so
`scalar-target-discovery-proof` refreshes the generated bridge setup before
running, and it tightens the generated bridge ladder so Camera non-bool scope is
intrinsic even if a caller omits exclusion args.

The failed artifacts are diagnostic only and are not admitted proof evidence.

## Revert Path

Revert the live-proof checkpoint commit. No dependency cleanup, runtime artifact
cleanup, public surface cleanup, asset cleanup, material cleanup, render
cleanup, build cleanup, or TIAF cleanup should be required.
