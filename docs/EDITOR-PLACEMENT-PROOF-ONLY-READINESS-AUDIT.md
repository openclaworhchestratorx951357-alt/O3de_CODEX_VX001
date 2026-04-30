# Editor Placement Proof-Only Readiness Audit

Status: readiness audit only (no runtime change)

## Purpose

Verify which editor placement proof-only design gates already map to explicit
runtime/test touchpoints, and which gates are still missing before any proof-only
implementation packet.

## Scope

- audits readiness against `docs/EDITOR-PLACEMENT-PROOF-ONLY-DESIGN.md`
- classifies gates as ready vs missing
- identifies exact implementation touchpoints and no-touch boundaries
- preserves current non-admission and fail-closed posture

## Truth sources used

1. Design/baseline inputs:
   - `docs/EDITOR-PLACEMENT-PLAN-MATRIX-BASELINE-AUDIT.md`
   - `docs/EDITOR-PLACEMENT-PROOF-ONLY-DESIGN.md`
   - `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`
2. Current code/routes/models:
   - `backend/app/services/asset_forge.py`
   - `backend/app/models/asset_forge.py`
   - `backend/app/api/routes/asset_forge.py`
   - `backend/app/services/planners/editor_planner.py`
3. Targeted tests:
   - `backend/tests/test_api_routes.py`
   - `backend/tests/test_prompt_control.py`
4. O3DE evidence-substrate baseline:
   - `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md`

## Readiness checklist

| Gate | Status | Evidence | Notes |
| --- | --- | --- | --- |
| exact bounded target contract (candidate/source/level/entity/component) | ready | `AssetForgeO3DEPlacementPlanRequest` / `AssetForgeO3DEPlacementProofRequest` plus `create_o3de_placement_plan` and `execute_o3de_placement_proof` | Contract fields are explicit and normalized to project-relative paths. |
| bounded allowlist gates for path/suffix/scope | ready | placement plan/proof allowlist checks in `asset_forge.py`; placement plan tests | `Assets/Generated/asset_forge/` + allowlisted extension + `Levels/*.prefab` constraints are explicit and fail closed. |
| request-bound stage-write/readback dependency checks | ready | placement proof stage-write/readback checks in `asset_forge.py`; placement proof tests | Missing/invalid stage-write evidence and readback status fail closed. |
| server-owned approval/session binding checks | ready | `_evaluate_server_approval_session` use in placement proof/harness/live-proof; targeted API tests | Session/binding decision codes are recorded and treated as non-authorizing without admission. |
| explicit blocked reason taxonomy for missing/mismatch gates | ready | `fail_closed_reasons` population in placement proof/harness/live-proof; targeted API tests | Admission-flag, contract, session, and scope mismatch reasons are asserted. |
| explicit no-admission flags (`execution_admitted=false`, `placement_write_admitted=false`, `mutation_occurred=false`) | ready | placement plan/proof models + service blocked records + targeted tests | Runtime placement execution stays blocked and non-admitted. |
| explicit safest-next-step guidance preserving blocked posture | ready | `safest_next_step` fields in placement plan/proof/harness records | Guidance stays evidence-first and non-authorizing. |
| dedicated `editor.placement.proof_only` corridor surface (capability/schema/route) | missing | current routes expose only Asset Forge placement surfaces | No dedicated editor placement proof-only surface is implemented yet. |
| planner path from editor prompt to bounded placement-proof candidate | missing | `editor_planner.py` mutation-intent refusal behavior + prompt-control tests | Candidate placement intents are still refused as `editor.candidate_mutation.unsupported`. |
| targeted prompt-control + route tests for the future editor proof-only corridor | missing | existing tests cover Asset Forge placement and editor refusal only | New proof-only editor corridor tests are required before any admission decision packet. |

## Implementation touchpoints for next packet

- `backend/app/models/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `backend/app/api/routes/asset_forge.py`
- `backend/app/services/planners/editor_planner.py`
- `backend/tests/test_api_routes.py`
- `backend/tests/test_prompt_control.py`
- editor-placement stream docs in `docs/`

## No-touch boundaries for this packet line

- no provider generation execution admission
- no Blender execution admission
- no Asset Processor execution admission
- no generated-asset assignment execution admission
- no placement runtime execution admission
- no broad scene/prefab/project mutation admission
- no client approval/session fields treated as authorization

## What this packet does not do

- no backend/runtime code changes
- no new endpoint admission
- no placement execution
- no mutation broadening

## Validation evidence

Commands run:

- `python -m pytest backend/tests/test_api_routes.py -k "placement_plan or placement_proof or placement_harness or stage_write" -q`
- `python -m pytest backend/tests/test_prompt_control.py -k "candidate_editor_mutation_intents_without_session_plan or editor_property_discovery_without_session_plan" -q`
- `git diff --check`
- `git diff --cached --check`

Result summary:

- targeted placement plan/proof/harness tests passed
- targeted editor planner refusal tests passed
- diff checks passed (CRLF warnings only)

## Recommended next packet

Editor placement proof-only implementation
(`codex/editor-placement-proof-only-implementation`):

- implement one bounded non-admitting editor placement proof-only candidate
  surface using the ready gates in this audit
- preserve blocked default-off/no-mutation posture
- add targeted route + planner refusal/guard coverage for the new bounded surface
