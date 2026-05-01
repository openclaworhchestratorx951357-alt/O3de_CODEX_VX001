# AI Asset Forge Placement Proof-Only Admission-Flag Design

Status: designed (proof-only admission-flag semantics; non-authorizing)

## Purpose

Define and checkpoint explicit placement proof-only admission-flag semantics so
the gate remains fail-closed, evidence-bound, and non-authorizing for runtime
placement execution in this packet.

## Scope

- audit placement proof-only admission-flag fields and state model
- audit fail-closed reasons tied to admission-flag and evidence readiness
- define bounded design expectations for admission-flag verification
- preserve provider/Blender/stage-plan/stage-write/readback non-authorizing
  boundaries
- no runtime admission or mutation broadening

## Truth sources used

1. Runtime/service/model/route implementation:
   - `backend/app/services/asset_forge.py`
   - `backend/app/models/asset_forge.py`
   - `backend/app/api/routes/asset_forge.py`
2. Targeted placement-proof tests:
   - `backend/tests/test_api_routes.py`
3. Existing stream docs:
   - `docs/AI-ASSET-FORGE-PLACEMENT-READINESS-MATRIX-REFRESH.md`
   - `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-LONG-HOLD-CHECKPOINT.md`
   - `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`
4. O3DE evidence-substrate baseline:
   - `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md`

## Admission-flag design truth

Design expectations established and verified:

- flag identity and environment are explicit:
  - `admission_flag_name=asset_forge.o3de.placement.proof.v1.admission_enabled`
  - `ASSET_FORGE_PLACEMENT_PROOF_V1_ADMISSION_ENABLED`
- flag state model is bounded and fail-closed:
  - `missing_default_off`
  - `explicit_off`
  - `explicit_on`
  - `invalid_default_off`
- proof-only response fields remain explicit and typed:
  - `admission_flag_state`
  - `admission_flag_enabled`
  - `placement_write_admitted=false`
  - `proof_status` remains blocked/non-admitting in this packet
- explicit-on does not authorize runtime placement execution in this packet:
  - gate-on still requires evidence references and contract keys
  - `placement_proof_execution_not_admitted` remains a hard stop
  - client approval fields remain intent-only and non-authorizing

Required evidence context (when flag is on) remains explicit:

- admission packet reference
- admission operator id
- evidence bundle reference
- readback plan reference
- revert-statement contract key

## Boundaries preserved

- no provider generation execution admission
- no Blender execution admission
- no Asset Processor execution admission
- no generated-asset assignment execution admission
- no placement runtime execution admission
- no broad scene/prefab/project mutation admission
- no client/operator approval fields treated as authorization

## Validation evidence

Commands run:

- `python -m pytest backend/tests/test_api_routes.py -k "placement_proof or placement_plan or placement_harness or stage_write" -q`
- `git diff --check`
- `git diff --cached --check`

Result summary:

- targeted placement admission-flag tests passed
- diff checks passed (CRLF warnings only)

## Recommended next packet

Placement proof-only admission-flag verification checkpoint:

- checkpoint verified admission-flag state/evidence permutations and fail-closed
  outcomes
- preserve non-authorizing proof-only boundaries
- keep placement runtime execution blocked pending future explicit admission
  decision packet
