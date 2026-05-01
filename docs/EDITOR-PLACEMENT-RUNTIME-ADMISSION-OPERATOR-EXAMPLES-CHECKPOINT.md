# Editor Placement Runtime-Admission Operator Examples Checkpoint

Status: operator examples checkpoint (proof-only blocked; non-authorizing)

## Purpose

Provide operator-facing safe/refused examples for the contract-enriched
`editor.placement.proof_only` lane after runtime-admission proof-only
implementation.

## Current boundary

- endpoint:
  - `POST /asset-forge/o3de/editor-placement-proof-only`
- capability:
  - `editor.placement.proof_only`
- maturity:
  - `proof-only`
- execution and mutation admission:
  - `execution_admitted=false`
  - `placement_write_admitted=false`
  - `mutation_occurred=false`
- response posture remains fail-closed:
  - `proof_status=approval-required` or `proof_status=blocked`
  - `read_only=true`
  - `dry_run_only=true`

## Safe blocked example: approval not granted

Request pattern:

- `approval_state=not-approved`
- empty `approval_note`
- bounded staged source and target level paths

Expected response truths:

- `proof_status=approval-required`
- fail-closed reasons include:
  - `approval_state_not_approved`
  - `editor_placement_proof_only_execution_not_admitted`
- execution and mutation remain non-admitted

## Safe blocked example: ready-looking request with missing server contract evidence

Request pattern:

- `approval_state=approved`
- non-empty `approval_note`
- bounded staged source path and level path
- stage-write references present and readback status `succeeded`
- runtime-admission flag missing/off and no server-owned contract references

Expected response truths:

- `proof_status=blocked`
- `stage_write_evidence_ready=true`
- `stage_write_readback_ready=true`
- `contract_evidence_ready=false`
- fail-closed reasons include:
  - `admission_flag_disabled_or_missing`
  - `runtime_gate_disabled_or_missing`
  - `editor_placement_proof_only_execution_not_admitted`

## Safe blocked example: contract-ready evidence still non-admitted

Request pattern:

- `approval_state=approved`
- non-empty `approval_note`
- stage-write evidence/readback references present and `succeeded`
- runtime-admission flag on with admission packet/operator/evidence/readback/revert
  references present and exact-scope revert contract key match

Expected response truths:

- `revert_statement_contract_match=true`
- `contract_evidence_ready=true`
- runtime contract bundle reflects ready evidence state:
  - `runtime_command_contract.contract_evidence_status=ready`
  - `post_run_verification_contract.status=ready`
  - `revert_scope_contract.status=ready`
- still fail-closed and non-admitted:
  - `execution_admitted=false`
  - `placement_write_admitted=false`
  - `mutation_occurred=false`
  - `editor_placement_proof_only_execution_not_admitted` remains present

## Contract-mismatch example: explicit fail-closed mismatch taxonomy

When an incorrect revert contract key is provided:

- `revert_statement_contract_match=false`
- `contract_evidence_ready=false`
- fail-closed reasons include:
  - `revert_statement_contract_key_mismatch`
  - `contract_evidence_incomplete`
- execution remains blocked and non-mutating

## Runtime contract vocabulary checkpoint

Schemas now checkpointed on the editor proof-only lane:

- `editor.placement_runtime.command_contract.v1`
- `editor.placement_runtime.result_contract.v1`
- `editor.placement_runtime.post_run_verification_contract.v1`
- `editor.placement_runtime.revert_scope_contract.v1`

These fields are reporting-only in this stream stage and do not authorize
runtime execution.

## Fail-closed reason taxonomy checkpoint

Current explicit fail-closed reasons for this corridor include:

- `admission_flag_invalid_state`
- `admission_flag_disabled_or_missing`
- `admission_packet_reference_missing`
- `admission_operator_id_missing`
- `evidence_bundle_reference_missing`
- `readback_plan_reference_missing`
- `revert_statement_contract_key_missing`
- `revert_statement_contract_key_mismatch`
- `contract_evidence_incomplete`
- `runtime_gate_disabled_or_missing`
- `bridge_not_configured`
- `bridge_heartbeat_not_fresh`
- `staged_source_path_traversal_detected`
- `target_level_path_traversal_detected`
- `staged_source_outside_allowlisted_prefix`
- `staged_source_extension_not_allowlisted`
- `target_level_outside_allowlisted_prefab_scope`
- `stage_write_corridor_mismatch`
- `stage_write_evidence_reference_missing`
- `stage_write_readback_reference_missing`
- `stage_write_readback_not_succeeded`
- `approval_state_not_approved`
- `approval_note_missing`
- `server_approval:<decision_code>`
- `editor_placement_proof_only_execution_not_admitted`

## Evidence map

- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-CONTRACT-DESIGN.md`
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-READINESS-AUDIT.md`
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-PROOF-ONLY-IMPLEMENTATION.md`
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`

## Final boundary

This checkpoint does not admit provider generation, Blender execution, Asset
Processor execution, generated-asset assignment execution, placement runtime
execution, or broad scene/prefab/project mutation.

## Recommended next packet

Editor placement runtime-admission release-readiness decision
(`codex/editor-placement-runtime-admission-release-readiness-decision`):

- record explicit hold/no-go decision for any runtime-execution broadening
- preserve proof-only blocked/non-admitted posture
- define exact admission gates required before any future runtime-admission
  revisit
