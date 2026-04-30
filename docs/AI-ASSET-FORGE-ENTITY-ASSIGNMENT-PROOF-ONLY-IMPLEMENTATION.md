# AI Asset Forge Entity Assignment Proof-Only Implementation

Status: implemented (plan-only assignment-design endpoint; non-authorizing)

## Purpose

Implement a bounded assignment-design endpoint candidate that enforces
fail-closed checks while keeping assignment/placement execution blocked.

## Capability movement

- capability: `asset_forge.o3de.assignment.design`
- old maturity: missing (contract-only)
- new maturity: plan-only endpoint candidate
- execution admitted: no
- mutation admitted: no

## Implemented scope

- added endpoint:
  - `POST /asset-forge/o3de/assignment-design`
- added typed request/response models:
  - `AssetForgeO3DEAssignmentDesignRequest`
  - `AssetForgeO3DEAssignmentDesignRecord`
- implemented fail-closed contract checks for:
  - source/provenance/target path normalization and traversal rejection
  - source prefix/extension allowlist
  - target level `Levels/*.prefab` constraint
  - operator decision requirement
  - review packet status requirement
  - stage-write evidence/readback reference requirement
- implemented explicit plan-only output:
  - `assignment_design_status` (`blocked` / `ready-for-approval`)
  - `assignment_execution_status=blocked`
  - `assignment_write_admitted=false`
  - `read_only=true`
  - `mutation_occurred=false`

## Files

- `backend/app/models/asset_forge.py`
- `backend/app/api/routes/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `backend/app/main.py`
- `backend/tests/test_api_routes.py`

## Validation

- `python -m pytest backend/tests/test_api_routes.py -k "assignment_design or review_packet or root_includes_current_control_plane_routes" -q`
- `python -m pytest backend/tests/test_api_routes.py -k "assignment_design" -q`
- `python -m pytest backend/tests/test_validation_report_intake.py backend/tests/test_api_routes.py -k "stage_write or validation_report_intake or review_packet or assignment_design" -q`
- `git diff --check`
- `git diff --cached --check`

## Boundaries preserved

- no generated-asset assignment execution admission
- no placement execution admission
- no provider/Blender/Asset Processor execution admission
- no broad project mutation admission
- no client authorization semantics

## Recommended next packet

Placement bridge-readiness readiness audit packet:

- document safe/refused operator examples for assignment-design requests
- checkpoint fail-closed reasons and status taxonomy
- keep assignment/placement execution corridors blocked





