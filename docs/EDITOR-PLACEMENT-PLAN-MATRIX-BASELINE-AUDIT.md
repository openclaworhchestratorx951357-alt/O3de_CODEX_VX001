# Editor Placement Plan Matrix Baseline Audit

Status: baseline audited (plan-only truth; non-authorizing)

## Purpose

Re-establish current editor placement-plan matrix truth from code and tests so
future editor placement packets stay narrow, fail-closed, and non-admitting.

## Scope

- audit current plan-only placement planning surfaces and status vocabulary
- confirm placement execution remains blocked and non-authorizing
- map editor-lane refusal boundaries versus Asset Forge placement-plan surfaces
- map cross-lane dependency expectations without broadening runtime capability
- no runtime admission or mutation broadening

## Truth sources used

1. Runtime/service/model/route implementation:
   - `backend/app/services/asset_forge.py`
   - `backend/app/models/asset_forge.py`
   - `backend/app/api/routes/asset_forge.py`
   - `backend/app/services/planners/editor_planner.py`
2. Targeted tests:
   - `backend/tests/test_api_routes.py`
   - `backend/tests/test_prompt_control.py`
3. Current stream docs:
   - `docs/AI-ASSET-FORGE-PLACEMENT-PROOF-ONLY-ADMISSION-FLAG-LONG-HOLD-CHECKPOINT.md`
   - `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`
   - `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`
4. O3DE evidence-substrate baseline:
   - `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md`

## Baseline placement-plan truth

Established and verified:

- placement planning exists as a plan-only Asset Forge surface:
  - route: `POST /asset-forge/o3de/placement-plan`
  - capability: `asset_forge.o3de.placement.plan`
  - maturity: `plan-only`
  - execution posture: `placement_execution_status=blocked`
  - admission posture: `placement_write_admitted=false`
- placement-plan policy remains bounded and explicit:
  - staged source must stay under `Assets/Generated/asset_forge/`
  - staged source extension must be allowlisted
  - level path must remain `Levels/*.prefab`
  - approval remains required for any future proof packet
- plan status is bounded:
  - `ready-for-approval` when constraints pass
  - `blocked` when constraints fail
- plan-only messaging remains explicit:
  - no editor placement execution performed in this packet
  - future proof/admission packet required before execution

## Editor-lane boundary truth

Established and verified:

- no separate admitted `editor.placement.plan` runtime execution corridor is
  exposed in current routes
- editor prompt planner continues to refuse candidate placement/mutation intents
  outside admitted editor corridors:
  - refusal capability: `editor.candidate_mutation.unsupported`
  - refusal coverage includes prefab/place/transform-style mutation prompts
- admitted editor corridors remain narrow and do not imply generic placement
  execution admission

## Cross-lane dependency map (non-authorizing)

- editor placement-plan discussion currently depends on bounded Asset Forge
  planning evidence and hold-state boundaries
- downstream proof/admission movement remains gated by separate explicit packets
- assignment/placement/provider/Blender/Asset Processor execution remains
  blocked by default

## Boundaries preserved

- no provider generation execution admission
- no Blender execution admission
- no Asset Processor execution admission
- no generated-asset assignment execution admission
- no placement execution admission
- no editor broad mutation admission
- no broad project mutation admission
- no client approval/session fields treated as authorization

## Validation evidence

Commands run:

- `python -m pytest backend/tests/test_api_routes.py -k "placement_plan or placement_proof or placement_harness or stage_write" -q`
- `python -m pytest backend/tests/test_prompt_control.py -k "candidate_editor_mutation_intents_without_session_plan or editor_property_discovery_without_session_plan" -q`
- `git diff --check`
- `git diff --cached --check`

Result summary:

- targeted placement-plan/proof/harness tests passed
- targeted editor planner refusal tests passed
- diff checks passed (CRLF warnings only)

## Recommended next packet

Editor placement proof-only implementation:

- define exact scope and non-goals for a future proof-only editor placement
  corridor design packet
- keep all execution/mutation lanes non-admitted in design scope
- preserve existing Asset Forge and editor fail-closed boundaries
