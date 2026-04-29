# Asset Forge Placement Proof Readiness Matrix

## Status
Implemented as dry-run readiness metadata and fail-closed checks for placement proof requests.

This packet does not admit placement execution.

## Scope
- `backend/app/models/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`
- docs updates only

## Intent
Require explicit stage-write and readback evidence references before placement proof can even be considered, while keeping placement execution blocked by default.

## Required readiness inputs
Placement proof requests now carry:
- `stage_write_corridor_name`
- `stage_write_evidence_reference`
- `stage_write_readback_reference`
- `stage_write_readback_status`

Required values:
- stage-write corridor must match `asset_forge.o3de.stage_write.v1`
- readback status must be `succeeded`
- staged source path must remain within `Assets/Generated/asset_forge/`
- target level path must remain within `Levels/` and end with `.prefab`

## Dry-run response fields
Placement proof responses now include:
- `corridor_name = asset_forge.o3de.placement.proof.v1`
- `dry_run_only = true`
- `execution_admitted = false`
- `placement_write_admitted = false`
- `stage_write_evidence_ready`
- `stage_write_readback_ready`
- `fail_closed_reasons`

Even ready-looking requests remain blocked with:
- `proof_status = blocked`
- `placement_execution_status = blocked`
- `write_occurred = false`

## Fail-closed reasons (examples)
- `stage_write_corridor_mismatch`
- `stage_write_evidence_reference_missing`
- `stage_write_readback_reference_missing`
- `stage_write_readback_not_succeeded`
- `staged_source_outside_allowlisted_prefix`
- `target_level_outside_allowlisted_prefab_scope`
- `server_approval:<decision_code>`
- `approval_state_not_approved`
- `approval_note_missing`
- `placement_proof_execution_not_admitted`

## Tests added
- placement proof response includes dry-run fail-closed readiness fields
- missing stage-write evidence/readback references fail closed
- ready-looking stage-write/readback evidence still remains blocked and non-admitted

## Safety posture
This packet does not:
- execute placement runtime
- call runtime bridge mutation surfaces
- run provider generation
- run Blender
- run Asset Processor
- broaden scene/prefab/material mutation scope
- treat client approval fields as authorization

## Next packet
Placement bridge-readiness evidence contract for exact runtime command binding (read-only), still default fail-closed and non-executing.
