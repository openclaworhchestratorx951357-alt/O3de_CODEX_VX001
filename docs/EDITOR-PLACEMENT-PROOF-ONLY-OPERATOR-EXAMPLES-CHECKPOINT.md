# Editor Placement Proof-Only Operator Examples Checkpoint

Status: operator examples checkpoint (proof-only blocked; non-authorizing)

## Purpose

Provide operator-facing safe/refused examples for
`POST /asset-forge/o3de/editor-placement-proof-only` after the bounded
proof-only implementation packet.

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

Expected response truths:

- `proof_status=approval-required`
- fail-closed reasons include:
  - `approval_state_not_approved`
  - `editor_placement_proof_only_execution_not_admitted`
- execution and mutation remain non-admitted

## Safe blocked example: ready-looking request still non-admitted

Request pattern:

- `approval_state=approved`
- non-empty `approval_note`
- bounded staged source path and level path
- `stage_write_evidence_reference` present
- `stage_write_readback_reference` present
- `stage_write_readback_status=succeeded`

Expected response truths:

- `proof_status=blocked`
- `stage_write_evidence_ready=true`
- `stage_write_readback_ready=true`
- fail-closed reasons still include:
  - `editor_placement_proof_only_execution_not_admitted`
- if no server approval session is provided, fail-closed reasons include
  `server_approval:missing_session`

## Fail-closed reason taxonomy checkpoint

Current explicit fail-closed reasons for this corridor:

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

## Prompt-planner checkpoint

Explicit prompt phrasing for bounded editor placement proof-only candidacy can
plan `editor.placement.proof_only`.

Broad editor mutation requests remain refused on existing unsupported mutation
paths and are not admitted by this checkpoint.

## Evidence map

- `docs/EDITOR-PLACEMENT-PROOF-ONLY-IMPLEMENTATION.md`
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`
- `backend/tests/test_prompt_control.py`
- `backend/tests/test_catalog.py`

## Final boundary

This checkpoint does not admit provider generation, Blender execution, Asset
Processor execution, generated-asset assignment execution, placement runtime
execution, or broad scene/prefab/project mutation.

## Recommended next packet

Editor placement proof-only release-readiness decision
(`codex/editor-placement-proof-only-release-readiness-decision`):

- record explicit hold/no-go decision for any execution/mutation broadening
- preserve proof-only blocked/non-admitted posture
- define exact gates required before any future admission revisit
