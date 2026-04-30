# AI Asset Forge Placement Runtime-Admission Operator Examples Checkpoint

Status: operator examples checkpoint (proof-only blocked; non-authorizing)

## Purpose

Provide operator-facing safe/refused examples for placement runtime-admission
harness/live-proof surfaces after proof-only contract-field implementation.

## Current boundary

- endpoints:
  - `POST /asset-forge/o3de/placement-harness/execute`
  - `POST /asset-forge/o3de/placement-harness/live-proof`
- maturity: `proof-only`
- runtime execution admission: no
- mutation admission: no
- response posture remains fail-closed:
  - `execute_status=blocked` / `proof_status=blocked`
  - `execution_performed=false`
  - `readback_captured=false`
  - `read_only=true`

## Safe blocked example: client approval intent without server-owned evidence

Request pattern:

- `approval_state=approved`
- client-provided `approval_note`
- missing server-owned admission references and contract keys

Expected response truths:

- execution remains blocked
- `contract_evidence_ready=false`
- `runtime_command_contract.contract_evidence_status=incomplete`
- `post_run_verification_contract.status=incomplete`
- `revert_scope_contract.status=incomplete`
- fail-closed reasons include missing contract references and explicit
  non-admission (`placement_harness_execution_not_admitted` or
  `placement_live_proof_execution_not_admitted`)

## Safe blocked example: bridge/runtime gate not ready

If runtime gate is disabled or bridge readiness is stale/missing:

- `runtime_gate_enabled=false` and/or bridge readiness fields fail
- `bridge_readiness_contract.readiness_status=blocked`
- fail-closed reasons include `placement_runtime_gate_disabled`,
  `bridge_not_configured`, or `bridge_heartbeat_not_fresh`

Execution remains blocked and non-mutating.

## Safe ready-looking example: contract references present but still blocked

Even when request-bound contract evidence is present and matches exact scope:

- `revert_statement_contract_match=true`
- `contract_evidence_ready=true`
- runtime contract bundles report `ready` contract evidence states

Expected truth still remains:

- `execution_admitted=false`
- `status=blocked_non_admitted` in runtime command/result contracts
- `placement_harness_execution_not_admitted` or
  `placement_live_proof_execution_not_admitted` remains in fail-closed reasons

## Runtime contract vocabulary checkpoint

Schemas now checkpointed on both runtime-admission surfaces:

- `asset_forge.placement_runtime.command_contract.v1`
- `asset_forge.placement_runtime.result_contract.v1`
- `asset_forge.placement_runtime.post_run_verification_contract.v1`
- `asset_forge.placement_runtime.revert_scope_contract.v1`

These fields are reporting-only in this stream stage and do not authorize
runtime execution.

## Evidence map

- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-CONTRACT-DESIGN.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-READINESS-AUDIT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-PROOF-ONLY-IMPLEMENTATION.md`
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`

## Final boundary

This checkpoint does not admit provider generation, Blender execution, Asset
Processor execution, generated-asset assignment execution, placement runtime
execution, or broad scene/prefab/project mutation.

## Recommended next packet

Placement runtime-admission release-readiness decision:

- record explicit hold/no-go decision for runtime-admission broadening
- preserve proof-only blocked execution posture
- document exact admission gates still required before any runtime execution
