# Editor Placement Proof-Only Implementation

Status: implemented (bounded fail-closed proof-only corridor; non-admitting)

## Purpose

Implement a bounded editor placement proof-only corridor candidate while
preserving blocked/non-admitted runtime execution and mutation posture.

## Capability movement

- capability: `editor.placement.proof_only`
- old maturity: readiness-audit (design/audit complete, implementation missing)
- new maturity: proof-only candidate corridor (fail-closed, non-admitting)
- execution admitted: no
- mutation admitted: no

## Implemented scope

- added bounded endpoint:
  - `POST /asset-forge/o3de/editor-placement-proof-only`
- added typed request/record models and service logic for the corridor
- enforced fail-closed blocked posture on all responses:
  - `execution_admitted=false`
  - `placement_write_admitted=false`
  - `mutation_occurred=false`
- added planner candidate path for explicit editor placement proof-only prompts:
  - planned capability: `editor.placement.proof_only`
- preserved refusal behavior for broad editor mutation intents
- added catalog/capability/schema surfaces for
  `editor.placement.proof_only` as simulated/proof-only maturity
- added targeted tests for route behavior, planner path, catalog visibility, and
  schema validation updates
- wired prompt-session execution for `editor.placement.proof_only` through the
  bounded Asset Forge proof-only service path in hybrid adapter mode
- fixed persisted execution/artifact payload conformance for
  `editor.placement.proof_only` in both hybrid and simulated adapter fallbacks
  so prompt execution remains fail-closed instead of failing with
  `INVALID_PERSISTED_PAYLOAD`

## Files

- `backend/app/models/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `backend/app/api/routes/asset_forge.py`
- `backend/app/main.py`
- `backend/app/services/catalog.py`
- `backend/app/services/capability_registry.py`
- `backend/app/services/schema_validation.py`
- `backend/app/services/planners/editor_planner.py`
- `backend/tests/test_api_routes.py`
- `backend/tests/test_prompt_control.py`
- `backend/tests/test_catalog.py`
- `schemas/tools/editor.placement.proof_only.args.schema.json`
- `schemas/tools/editor.placement.proof_only.result.schema.json`
- `schemas/tools/editor.placement.proof_only.execution-details.schema.json`
- `schemas/tools/editor.placement.proof_only.artifact-metadata.schema.json`

## Validation

- `python -m pytest backend/tests/test_api_routes.py -k "root_includes_current_control_plane_routes or editor_placement_proof_only or placement_plan or placement_proof or placement_harness or stage_write" -q`
- `python -m pytest backend/tests/test_prompt_control.py -k "editor_placement_proof_only_candidate_when_explicitly_requested or candidate_editor_mutation_intents_without_session_plan or editor_property_discovery_without_session_plan" -q`
- `python -m pytest backend/tests/test_catalog.py -k "editor_placement_proof_only" -q`
- `python -m pytest backend/tests/test_api_routes.py -k "ready_reports_database_status_details or adapters_endpoint_reports_hybrid_registry_summary" -q`

## Boundaries preserved

- no provider generation execution admission
- no Blender execution admission
- no Asset Processor execution admission
- no generated-asset assignment execution admission
- no placement runtime execution admission
- no broad scene/prefab/project mutation admission
- no client approval/session fields treated as authorization

## Recommended next packet

Editor placement proof-only operator examples checkpoint
(`codex/editor-placement-proof-only-operator-examples-checkpoint`):

- document safe/refused prompt examples for the exact bounded proof-only lane
- checkpoint fail-closed status/reason taxonomy for operator review clarity
- preserve blocked/non-admitted execution and mutation posture
