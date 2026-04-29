# Asset Forge Placement Proof Contract Gates

## Status
Implemented as fail-closed, contract-evidence metadata checks for placement proof readiness.

This packet does not admit placement execution.

## Corridor
- `asset_forge.o3de.placement.proof.v1`

## Purpose
Add server-owned contract/evidence gate checks that must be present before placement proof can ever be considered for runtime execution, while keeping execution blocked.

## Server-owned contract evidence inputs
When `ASSET_FORGE_PLACEMENT_PROOF_V1_ADMISSION_ENABLED` is `explicit_on`, the following server-owned references are required:
- `ASSET_FORGE_PLACEMENT_PROOF_V1_ADMISSION_PACKET_REF`
- `ASSET_FORGE_PLACEMENT_PROOF_V1_ADMISSION_OPERATOR_ID`
- `ASSET_FORGE_PLACEMENT_PROOF_V1_EVIDENCE_BUNDLE_REF`
- `ASSET_FORGE_PLACEMENT_PROOF_V1_READBACK_PLAN_REF`
- `ASSET_FORGE_PLACEMENT_PROOF_V1_REVERT_CONTRACT_KEY`

## Revert contract key
A deterministic revert-contract key is computed from exact-scope placement-proof request fields:
- candidate id/label
- staged source path
- target level path
- target entity/component
- stage-write corridor and evidence/readback references

If the provided server-owned key is missing or mismatched, placement proof fails closed.

## Added dry-run metadata fields
Placement proof responses now include:
- `admission_packet_reference`
- `admission_operator_id`
- `evidence_bundle_reference`
- `readback_plan_reference`
- `revert_statement_contract_key`
- `revert_statement_contract_match`
- `operator_note_present`
- `contract_evidence_ready`

## Fail-closed reasons (contract-related)
- `admission_packet_reference_missing`
- `admission_operator_id_missing`
- `evidence_bundle_reference_missing`
- `readback_plan_reference_missing`
- `revert_statement_contract_key_missing`
- `revert_statement_contract_key_mismatch`
- `contract_evidence_incomplete`

## Runtime behavior remains blocked
Even with all contract evidence present:
- `proof_status = blocked`
- `execution_admitted = false`
- `placement_write_admitted = false`
- `write_occurred = false`
- `placement_execution_status = blocked`

## Tests added
- explicit-on placement proof with complete contract evidence reports `contract_evidence_ready=true` and remains blocked
- explicit-on placement proof with contract-key mismatch fails closed
- existing dry-run fail-closed placement tests continue to assert blocked behavior

## Safety posture
This packet does not:
- execute placement runtime
- call runtime bridge mutation surfaces
- run provider generation
- run Blender
- run Asset Processor
- broaden stage-write or placement mutation scope
- treat client approval fields as authorization

## Next packet
Placement bridge-readiness evidence contract for exact runtime command binding (read-only), still default fail-closed and non-executing.
