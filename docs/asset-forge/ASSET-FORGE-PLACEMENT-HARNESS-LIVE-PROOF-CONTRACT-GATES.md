# Asset Forge Placement Harness And Live-Proof Contract Gates

## Status
Implemented as fail-closed, server-owned contract-evidence gate checks for placement harness execute and placement live-proof endpoints.

This packet does not admit runtime placement execution.

## Scope
- `backend/app/models/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`
- docs updates only

## Corridors
- `asset_forge.o3de.placement.harness.execute`
- `asset_forge.o3de.placement.live_proof`

## Intent
Align harness/live-proof pre-admission responses with the same contract-evidence discipline used by stage-write and placement-proof readiness: explicit server-owned packet/operator/evidence/readback/revert-contract references, deterministic contract-key matching, and fail-closed metadata.

## Server-owned contract evidence inputs
Harness execute requires:
- `ASSET_FORGE_PLACEMENT_HARNESS_V1_ADMISSION_PACKET_REF`
- `ASSET_FORGE_PLACEMENT_HARNESS_V1_ADMISSION_OPERATOR_ID`
- `ASSET_FORGE_PLACEMENT_HARNESS_V1_EVIDENCE_BUNDLE_REF`
- `ASSET_FORGE_PLACEMENT_HARNESS_V1_READBACK_PLAN_REF`
- `ASSET_FORGE_PLACEMENT_HARNESS_V1_REVERT_CONTRACT_KEY`

Live proof requires:
- `ASSET_FORGE_PLACEMENT_LIVE_PROOF_V1_ADMISSION_PACKET_REF`
- `ASSET_FORGE_PLACEMENT_LIVE_PROOF_V1_ADMISSION_OPERATOR_ID`
- `ASSET_FORGE_PLACEMENT_LIVE_PROOF_V1_EVIDENCE_BUNDLE_REF`
- `ASSET_FORGE_PLACEMENT_LIVE_PROOF_V1_READBACK_PLAN_REF`
- `ASSET_FORGE_PLACEMENT_LIVE_PROOF_V1_REVERT_CONTRACT_KEY`

## Added response metadata fields
Both endpoints now return:
- `admission_packet_reference`
- `admission_operator_id`
- `evidence_bundle_reference`
- `readback_plan_reference`
- `revert_statement_contract_key`
- `revert_statement_contract_match`
- `operator_note_present`
- `contract_evidence_ready`
- `fail_closed_reasons`

## Deterministic contract key checks
Both endpoints now compute an exact-scope expected revert-contract key from request fields and compare it to server-owned keys.

Mismatch or missing keys fail closed.

## Fail-closed reasons (examples)
- `approval_state_not_approved`
- `approval_note_missing`
- `admission_packet_reference_missing`
- `admission_operator_id_missing`
- `evidence_bundle_reference_missing`
- `readback_plan_reference_missing`
- `revert_statement_contract_key_missing`
- `revert_statement_contract_key_mismatch`
- `contract_evidence_incomplete`
- `server_approval:<decision_code>`
- `placement_harness_execution_not_admitted`
- `placement_live_proof_execution_not_admitted`

## Runtime behavior remains blocked
Harness execute remains:
- `execute_status=blocked`
- `execution_performed=false`
- `readback_captured=false`

Live proof remains:
- `proof_status=blocked`
- `execution_performed=false`
- `readback_captured=false`

No runtime bridge mutation calls are executed.

## Tests added
- harness execute contract-ready evidence still blocked
- harness execute contract mismatch fails closed
- live-proof contract-ready evidence still blocked
- live-proof contract mismatch fails closed
- existing blocked-path tests now assert contract metadata/fail-closed fields

## Safety posture
This packet does not:
- execute placement runtime
- execute placement live proof
- call runtime bridge mutation surfaces
- run providers
- run Blender
- run Asset Processor
- broaden mutation admission scope
- treat client approval fields as authorization

## Next packet
Placement runtime admission-decision design for exact proof-only corridor boundaries (still default fail-closed and non-executing).
