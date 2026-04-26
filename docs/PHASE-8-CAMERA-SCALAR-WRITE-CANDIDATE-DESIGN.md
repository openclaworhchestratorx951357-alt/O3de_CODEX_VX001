# Phase 8 Camera Scalar Write Candidate Design

Status: design/review packet only

This document defines the requirements for a future proof-only Camera bool
property write attempt.

It does not implement property writes.

It does not admit `editor.component.property.write`.

It does not expose property writes through Prompt Studio, dispatcher/catalog,
or `/adapters`.

## Current Truth

PR #31 merged the proof-only scalar target discovery matrix into `main`.

Current proof truth:

- proof command:
  `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-scalar-target-discovery-proof`
- proof artifact:
  `backend/runtime/live_editor_scalar_target_discovery_proof_20260426-154425.json`
- proof status: `candidate_selected_readback_only`
- selected component: `Camera`
- selected property path:
  `Controller|Configuration|Make active camera on activation?`
- selected runtime type: `bool`
- selected target status: `readback_only_candidate`
- component id provenance: `admitted_runtime_component_add_result`
- selected level: `Levels/TestLoevel01`
- restore status: `restored_and_verified`
- write admission: `false`
- property-list admission: `false`

Current refusal truth:

- `editor.component.property.write` is not implemented or admitted.
- Prompt Studio property-write intents must still be refused with
  `editor.candidate_mutation.unsupported`.
- `editor.component.property.list` remains proof-only and is not exposed through
  Prompt Studio, dispatcher/catalog, or `/adapters`.
- `/adapters` exposes `editor.component.property.get`, not property list/write.

Comment remains blocked with `comment_root_string_readback_failed`.

## Selected Readback-Only Candidate

The selected candidate is:

- component: `Camera`
- property path: `Controller|Configuration|Make active camera on activation?`
- property path kind: `named_component_property`
- discovery method: `BuildComponentPropertyList`
- runtime value type: `bool`
- candidate status: `readback_only_candidate`

This is a better future proof target than the earlier alternatives because:

- it is a named non-empty property path
- it is a scalar bool, not an asset reference
- it is on an already-allowlisted component-add surface
- it was discovered from a live component id returned by admitted runtime
  component add provenance
- it is not Mesh, material, shader, render, asset, LOD, lighting, or
  transform-adjacent
- it does not depend on Comment's unresolved empty/root property-tree behavior

## Why This Is Still Higher-Risk Than Readback

A readback-only candidate does not prove write safety.

Writing even a bool property may:

- dirty the loaded level
- require exact backup and restore discipline
- invalidate live component ids after file restore
- require reload-aware target reacquisition for post-restore verification
- alter editor session state in ways not visible from file restoration alone
- interact with Camera activation behavior in the live level

Therefore the next packet must remain design/review unless the operator
explicitly approves implementation of a proof-only write corridor.

## Explicit Non-Goals

This design does not cover:

- implementation of `editor.component.property.write`
- calls to `SetComponentProperty`
- calls to `PropertyTreeEditor.set_value`
- Prompt Studio admission for property writes
- dispatcher/catalog or `/adapters` exposure for property writes
- public admission of `editor.component.property.list`
- arbitrary Editor Python
- arbitrary component or property writes
- asset, material, render, build, or TIAF behavior
- transform, hierarchy, parenting, prefab, or delete mutation
- live Editor undo
- viewport reload claims
- generalized reversibility claims

## Required Preflight Before Any Future Write Proof

A future proof-only implementation must reject before mutation unless all of
these are true:

- operator explicitly approves the implementation slice
- backend is listening on the canonical `127.0.0.1:8000` live path
- `/ready` is healthy
- `/o3de/target` resolves the canonical `McpSandbox` project and engine roots
- `/o3de/bridge` reports `heartbeat_fresh: true`
- `/adapters` still does not expose property writes or public property list
- loaded level is explicit and safe, preferably `Levels/TestLoevel01`
- target entity is temporary proof-owned or otherwise explicitly selected for
  proof
- component id comes from live runtime evidence, preferably
  `admitted_runtime_component_add_result`
- component type is exactly `Camera`
- property path is exactly
  `Controller|Configuration|Make active camera on activation?`
- before value is read successfully and has runtime type `bool`
- requested value is boolean and intentionally toggles the before value
- loaded-level file backup exists before mutation
- approval and lock records are created or explicitly recorded as proof-only
  preconditions
- no stale restore boundary or ambiguous level state is reused

## Required Backup, Snapshot, And Restore Expectations

A future proof must create a fresh loaded-level restore boundary before any
write attempt.

The evidence bundle must record:

- restore boundary id
- source prefab path
- backup path
- backup hash
- selected level path
- pre-write bridge heartbeat
- restore strategy
- restore trigger
- restored hash
- restore success or failure

Restore must be invoked after the write attempt, even if the write fails after
partially reaching the bridge.

The proof must not claim live Editor undo. It may claim only the restore action
that it actually performs and verifies.

## Required Evidence Model

A future proof artifact must include:

- proof name
- schema version
- operator approval marker for the implementation/proof run
- backend readiness snapshot
- target wiring snapshot
- bridge heartbeat snapshot before and after proof
- selected level path
- entity id and entity name
- component id
- component id provenance
- component type
- property path
- property path provenance
- before value
- requested value
- write operation result
- after value
- restore boundary metadata
- restore result
- post-restore readback result
- missing-proof list
- exact bridge command ids
- exact failure/blocker code when any gate fails

## Required Before/Write/After/Restore/Readback Flow

A future proof must run this sequence:

1. Open or verify the editor session.
2. Open or verify the safe non-default level.
3. Create a temporary proof entity.
4. Add a Camera component through the admitted component-add corridor.
5. Read the selected Camera bool property before mutation.
6. Capture the loaded-level restore boundary.
7. Write the boolean opposite of the before value.
8. Read the same property after mutation from the same live component id.
9. Invoke restore from the pre-mutation backup.
10. Verify restore by file hash.
11. Reacquire target identity if the restore invalidates the live component id.
12. Read back the post-restore value or record the exact blocker.
13. Emit a final review summary naming what was proven and what remains
    missing.

If post-restore readback cannot be completed, the proof may still be useful,
but it must remain proof-only and must not admit property writes.

## Required Failure Behavior

The future proof must fail closed.

Expected blocker codes should include:

- `camera_write_operator_approval_missing`
- `camera_write_bridge_unavailable`
- `camera_write_level_not_safe`
- `camera_write_component_id_not_live`
- `camera_write_property_path_mismatch`
- `camera_write_before_readback_failed`
- `camera_write_backup_failed`
- `camera_write_set_failed`
- `camera_write_after_readback_failed`
- `camera_write_restore_failed`
- `camera_write_post_restore_readback_failed`
- `camera_write_public_admission_detected`

If restore fails, the proof must not report success.

If the write succeeds but post-restore readback is blocked, the proof must
report the exact missing proof and remain unadmitted.

## Required Operator Approval Gate

Implementation of the future write proof requires explicit operator approval.

Approval is required because the next packet would introduce a real write
corridor, even if proof-only and tightly allowlisted.

Do not start implementation merely because this design exists.

## Required Tests Before Implementation

Before implementation, add or confirm tests covering:

- Prompt Studio refuses property-write prompts with
  `editor.candidate_mutation.unsupported`.
- Camera write prompts remain refused until a separate admission slice exists.
- `editor.component.property.write` is not in dispatcher/catalog.
- `editor.component.property.write` is not exposed through `/adapters`.
- `editor.component.property.list` remains proof-only and not publicly
  admitted.
- The future proof rejects non-Camera components.
- The future proof rejects any property path other than the exact Camera bool
  path.
- The future proof rejects non-bool requested values.
- The future proof refuses to write without a restore boundary.
- Restore failure prevents proof success.
- No arbitrary Editor Python or `PropertyTreeEditor.set_value` path is used.

## Future Proof Command Proposal

Proposed command name:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-scalar-write-proof
```

Do not add this command until implementation is explicitly approved.

## Future Artifact Naming Proposal

Proposed artifact pattern:

```text
backend/runtime/live_editor_camera_scalar_write_proof_<YYYYMMDD-HHMMSS>.json
```

Do not generate this artifact until implementation is explicitly approved.

## Current Blockers

Current blockers before implementation:

- no approved implementation packet for property writes
- no `editor.component.property.write` bridge/runtime operation
- no before/write/after/restore/post-restore proof bundle
- no reload-aware component reacquisition proof after restore
- no tests for the future write proof's failure modes
- no admission decision after proof review

These blockers are intentional safety gates.

## Revert Path

This design packet is docs-only.

To revert it after merge:

```powershell
git revert -m 1 <merge-commit-sha>
```

If reverted before merge, delete this branch:

```powershell
git branch -D codex/phase-8-camera-scalar-write-candidate-design
```
