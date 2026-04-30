# Editor Placement Proof-Only Design

Status: designed (proof-only candidate scope; non-authorizing)

## Purpose

Define a bounded future proof-only design for editor placement work without
admitting editor placement execution, broad mutation, or runtime broadening in
this packet.

## Scope

- define exact proof-only candidate shape for `editor.placement.proof_only`
- define explicit non-goals and no-admission boundaries
- define required fail-closed gates and evidence dependencies
- align editor-lane design terms with current Asset Forge placement hold posture
- no runtime admission or mutation broadening

## Truth sources used

1. Runtime/service/model/route implementation:
   - `backend/app/services/planners/editor_planner.py`
   - `backend/app/services/asset_forge.py`
   - `backend/app/models/asset_forge.py`
   - `backend/app/api/routes/asset_forge.py`
2. Targeted tests:
   - `backend/tests/test_prompt_control.py`
   - `backend/tests/test_api_routes.py`
3. Current stream docs:
   - `docs/EDITOR-PLACEMENT-PLAN-MATRIX-BASELINE-AUDIT.md`
   - `docs/AI-ASSET-FORGE-PLACEMENT-PROOF-ONLY-ADMISSION-FLAG-LONG-HOLD-CHECKPOINT.md`
   - `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`
4. O3DE evidence-substrate baseline:
   - `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md`

## Current design baseline

Established and verified:

- current placement planning remains `plan-only` and blocked for execution:
  - `asset_forge.o3de.placement.plan`
  - `placement_execution_status=blocked`
  - `placement_write_admitted=false`
- no admitted editor runtime corridor named `editor.placement.proof_only` is
  currently exposed
- editor planner currently refuses candidate placement/mutation intents outside
  admitted corridors using `editor.candidate_mutation.unsupported`
- Asset Forge placement proof/admission lane remains held fail-closed and
  non-authorizing

## Proposed proof-only candidate design (non-admitting)

Future proof-only candidate must remain exact-scope and fail-closed:

- one bounded target level path under `Levels/*.prefab`
- one bounded target entity name/component pair
- one bounded staged source path under allowlisted generated-asset prefix
- request-bound evidence references for stage-write and readback prerequisites
- server-owned approval/session binding as non-authorizing gate input
- explicit blocked/default-off behavior when any gate is missing, mismatched, or
  stale

Design expectation:

- proof-only candidate remains private/non-admitted until a later explicit
  admission decision packet
- any future proof implementation must prove no broad mutation and preserve
  exact-scope revert boundaries

## Required fail-closed gates for future readiness audit

1. explicit bounded target contract (level/entity/component/source path)
2. bounded allowlist gates for path/suffix/scope
3. request-bound stage-write/readback evidence dependency checks
4. server-owned approval/session binding checks
5. explicit blocked reason taxonomy for each missing/mismatch gate
6. explicit no-admission flags:
   - `execution_admitted=false`
   - `placement_write_admitted=false`
   - `mutation_occurred=false`
7. explicit safest-next-step guidance that preserves non-admitted posture

## Non-goals

- no editor placement runtime execution admission
- no generated-asset assignment execution admission
- no provider generation admission
- no Blender execution admission
- no Asset Processor execution admission
- no broad scene/prefab/project mutation admission
- no client approval/session fields treated as authorization

## Boundaries preserved

- placement execution remains blocked
- editor candidate mutation refusal boundaries remain in force
- Asset Forge placement proof admission-flag hold boundaries remain in force
- no new route/schema/catalog/planner admission claims are made

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

Editor placement proof-only readiness audit:

- audit whether each designed fail-closed gate has explicit runtime/test
  touchpoints and a safe bounded implementation path
- identify missing gates and exact files/touchpoints for a future proof-only
  implementation packet
- preserve all current non-admission boundaries
