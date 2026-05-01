# Editor Placement Runtime-Admission Proof-Only Implementation

Status: implemented (bounded contract/reporting deltas; non-admitting)

## Purpose

Implement the bounded runtime-admission contract/reporting deltas identified by
`docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-READINESS-AUDIT.md` while preserving
blocked/non-admitted execution and mutation posture.

## Capability movement

- capability: `editor.placement.proof_only`
- old maturity: proof-only (bounded fail-closed corridor)
- new maturity: proof-only (runtime-admission contract/reporting enriched,
  still non-admitting)
- execution admitted: no
- mutation admitted: no

## Implemented scope

- added explicit editor runtime-admission gate-state reporting:
  - `runtime_gate_env`
  - `runtime_gate_enabled`
  - `admission_flag_name`
  - `admission_flag_state`
  - `admission_flag_enabled`
- added explicit editor runtime-admission contract evidence fields:
  - `admission_packet_reference`
  - `admission_operator_id`
  - `evidence_bundle_reference`
  - `readback_plan_reference`
  - `revert_statement_contract_key`
  - `revert_statement_contract_match`
  - `operator_note_present`
  - `contract_evidence_ready`
- added explicit runtime contract bundles on editor proof-only responses:
  - `bridge_readiness_contract`
  - `runtime_command_contract`
  - `runtime_result_contract`
  - `post_run_verification_contract`
  - `revert_scope_contract`
- added dedicated editor revert-contract key derivation and fail-closed checks
  for missing/mismatch contract evidence
- preserved fail-closed blocked posture on every path:
  - `execution_admitted=false`
  - `placement_write_admitted=false`
  - `mutation_occurred=false`

## Files

- `backend/app/models/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`

## Validation

- `python -m pytest backend/tests/test_api_routes.py -k "editor_placement_proof_only or placement_proof or placement_harness" -q`
- `python -m pytest backend/tests/test_prompt_control.py -k "editor_placement_proof_only_candidate_when_explicitly_requested or candidate_editor_mutation_intents_without_session_plan" -q`
- `python -m pytest backend/tests/test_catalog.py -k "editor_placement_proof_only" -q`
- `python -m pytest backend/tests/test_api_routes.py -k "root_includes_current_control_plane_routes or adapters_endpoint_reports_hybrid_registry_summary" -q`

Result summary:

- targeted API route tests passed
- targeted prompt-control tests passed
- targeted catalog tests passed
- route registration/hybrid summary checks passed

## Boundaries preserved

- no provider generation execution admission
- no Blender execution admission
- no Asset Processor execution admission
- no generated-asset assignment execution admission
- no placement runtime execution admission
- no broad scene/prefab/project mutation admission
- no client approval/session fields treated as authorization

## Recommended next packet

Editor placement runtime-admission operator examples checkpoint
(`codex/editor-placement-runtime-admission-operator-examples-checkpoint`):

- checkpoint safe/refused prompt examples for the runtime-admission
  contract-enriched proof-only lane
- checkpoint fail-closed reason taxonomy and operator-facing review wording
- preserve blocked/non-admitted execution and mutation posture
