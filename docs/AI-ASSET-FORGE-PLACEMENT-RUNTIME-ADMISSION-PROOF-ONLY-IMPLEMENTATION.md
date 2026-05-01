# AI Asset Forge Placement Runtime-Admission Proof-Only Implementation

Status: implemented (proof-only contract/reporting deltas; execution remains blocked)

## Purpose

Implement bounded runtime-admission contract/reporting fields for placement
harness/live-proof surfaces while preserving fail-closed blocked execution
posture.

## Capability movement

- capability: `asset_forge.o3de.placement.harness.execute`
- capability: `asset_forge.o3de.placement.live_proof`
- old maturity: proof-only blocked with approval/session + bridge-readiness + revert-key checks
- new maturity: proof-only blocked with explicit runtime command/result/post-verification/revert-scope contracts
- execution admitted: no
- mutation admitted: no

## Implemented scope

- added explicit runtime-admission contract fields on blocked proof-only records:
  - `runtime_command_contract`
  - `runtime_result_contract`
  - `post_run_verification_contract`
  - `revert_scope_contract`
- added deterministic contract-id generation tied to exact request binding and
  expected revert-scope key.
- surfaced contract evidence readiness/incomplete status inside runtime contract
  fields without broadening execution.
- preserved fail-closed blocked posture for:
  - missing/incomplete server-owned contract evidence
  - stale/missing bridge readiness
  - non-admitted runtime execution

## Files

- `backend/app/models/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`
- `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`
- `docs/APP-CAPABILITY-UNLOCK-PROGRAM.md`
- `docs/README.md`

## Validation

- `python -m pytest backend/tests/test_api_routes.py -k "placement_plan or placement_proof or placement_harness or placement_live_proof or placement_evidence" -q`
- `git diff --check`
- `git diff --cached --check`

## Boundaries preserved

- no provider generation execution
- no Blender execution
- no Asset Processor execution admission
- no generated-asset assignment execution
- no placement runtime execution admission
- no broad scene/prefab/project mutation admission
- no client/operator fields treated as authorization

## Recommended next packet

Placement runtime-admission operator examples checkpoint:

- document safe blocked usage for runtime-admission harness/live-proof requests
- document refused/no-go wording and expected fail-closed review fields
- preserve blocked/non-admitted execution posture
