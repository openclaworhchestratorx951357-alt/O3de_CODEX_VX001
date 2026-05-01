# AI Asset Forge Placement Bridge-Readiness Proof-Only Implementation

Status: implemented (read-only bridge preflight; runtime remains blocked)

## Purpose

Implement bounded bridge-readiness preflight signals for placement harness/live
proof surfaces while keeping placement runtime execution and mutation
non-admitted.

## Capability movement

- capability: `asset_forge.o3de.placement.harness.prepare`
- capability: `asset_forge.o3de.placement.harness.execute`
- capability: `asset_forge.o3de.placement.live_proof`
- old maturity: proof-only/plan-only with placeholder bridge readiness
- new maturity: proof-only/plan-only with explicit read-only bridge preflight
  contract fields
- execution admitted: no
- mutation admitted: no

## Implemented scope

- added shared bridge-readiness contract field on placement harness/live-proof
  records:
  - `bridge_readiness_contract`
  - schema: `asset_forge.placement_bridge_readiness.v1`
- added read-only bridge preflight collection through:
  - `O3DETargetService.get_bridge_status()`
- propagated explicit bridge/runtime gate truth into endpoint responses:
  - `bridge_configured`
  - `bridge_heartbeat_fresh`
  - `runtime_gate_enabled`
  - `bridge_readiness_contract.readiness_status`
- added fail-closed bridge gate taxonomy in blocked responses:
  - `placement_runtime_gate_disabled`
  - `bridge_not_configured`
  - `bridge_heartbeat_not_fresh`
  - `bridge_status_unavailable` (defensive path)
- preserved blocked execution posture for all placement runtime surfaces.

## Files

- `backend/app/models/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`

## Validation

- `python -m pytest backend/tests/test_api_routes.py -k "placement_plan or placement_proof or placement_harness or placement_live_proof or placement_evidence" -q`
- `python -m pytest backend/tests/test_api_routes.py -k "placement_harness_prepare_defaults_blocked or placement_harness_execute_stays_blocked_even_when_client_claims_approval or placement_live_proof_stays_blocked_even_when_client_claims_approval" -q`
- `git diff --check`
- `git diff --cached --check`

## Boundaries preserved

- no generated-asset assignment execution admission
- no placement runtime execution admission
- no provider/Blender/Asset Processor execution admission
- no broad scene/prefab/project mutation admission
- no client-declared approval/session fields treated as authorization

## Recommended next packet

Placement bridge-readiness operator examples checkpoint packet:

- add safe/refused operator examples for bridge-readiness placement harness/live
  proof requests
- checkpoint updated fail-closed taxonomy and bridge-readiness status labels
- keep runtime execution and mutation blocked/non-admitted

