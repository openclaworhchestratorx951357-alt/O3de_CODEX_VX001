# AI Asset Forge Placement Bridge-Readiness Operator Examples

Status: operator examples checkpoint (proof-only/plan-only; non-authorizing)

## Purpose

Provide operator-facing safe/refused examples for placement bridge-readiness
surfaces while preserving fail-closed non-admission boundaries.

## Current boundary

- endpoints:
  - `POST /asset-forge/o3de/placement-harness/prepare`
  - `POST /asset-forge/o3de/placement-harness/execute`
  - `POST /asset-forge/o3de/placement-harness/live-proof`
- maturity:
  - prepare: `plan-only`
  - execute/live-proof: `proof-only`
- bridge readiness contract:
  - `bridge_readiness_contract.schema=asset_forge.placement_bridge_readiness.v1`
  - `bridge_readiness_contract.placement_execution_admitted=false`
- placement runtime execution admission: no
- mutation admission: no

## Safe blocked example: runtime gate off

When `ASSET_FORGE_ENABLE_PLACEMENT_PROOF` is unset/off:

- `runtime_gate_enabled=false`
- `bridge_readiness_contract.readiness_status=blocked`
- `fail_closed_reasons` includes `placement_runtime_gate_disabled` on execute and
  live-proof responses.

## Safe blocked example: client approval claim without server-owned evidence

Request pattern:

- `approval_state=approved`
- client-supplied approval note only
- missing server-owned admission references

Expected response truths:

- execute/live-proof remain `blocked`
- `fail_closed_reasons` includes:
  - `admission_packet_reference_missing`
  - `admission_operator_id_missing`
  - `evidence_bundle_reference_missing`
  - `readback_plan_reference_missing`
  - `revert_statement_contract_key_missing`
  - `placement_harness_execution_not_admitted` or
    `placement_live_proof_execution_not_admitted`
- client approval remains non-authorizing.

## Safe ready-looking example: bridge healthy + contract-ready still blocked

Even when:

- runtime gate is enabled
- bridge is configured and heartbeat fresh
- server-owned contract references are present and match exact scope

Expected response truths still remain:

- execution status/proof status: `blocked`
- `placement_execution_admitted=false`
- `execution_performed=false`
- `read_only=true`
- explicit next safest step keeps runtime execution non-admitted.

## Checkpointed status/reason vocabulary

Bridge readiness status:

- `blocked`
- `ready-for-admitted-runtime-harness` (preflight readiness only; not admission)

Bridge fail-closed reasons currently surfaced:

- `placement_runtime_gate_disabled`
- `bridge_not_configured`
- `bridge_heartbeat_not_fresh`
- `bridge_status_unavailable` (defensive path)

## Evidence map

- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-CONTRACT-DESIGN.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-READINESS-AUDIT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-PROOF-ONLY-IMPLEMENTATION.md`
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`

## Final boundary

This checkpoint does not admit provider generation, Blender execution, Asset
Processor execution, generated-asset assignment execution, placement runtime
execution, or broad scene/prefab/project mutation.

## Recommended next packet

Placement bridge-readiness release-readiness decision packet:

- record explicit hold/no-go decision for any bridge-readiness admission
  broadening
- preserve non-authorizing placement execution boundaries
- define conditions required before any future runtime-admission consideration

