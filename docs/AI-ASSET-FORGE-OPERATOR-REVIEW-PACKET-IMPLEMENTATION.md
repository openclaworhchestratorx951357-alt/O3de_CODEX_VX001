# AI Asset Forge Operator Review Packet Implementation

Status: implemented + boundary regression refresh (proof-only review packet output; no execution/mutation admission)

## Purpose

Implement the first structured operator-facing review packet output for bounded
generated-asset candidates, using existing Phase 9 readback evidence and
project-local provenance metadata.

## Capability movement

- capability: `asset_forge.o3de.review.packet`
- old maturity: missing
- new maturity: proof-only review packet output
- execution admitted: no
- mutation admitted: no

## Implemented scope

- added endpoint:
  - `POST /asset-forge/o3de/review-packet`
- added typed request/response models for review packet generation
- implemented read-only packet assembly using:
  - existing `asset_forge.o3de.ingest.readback` evidence
  - project-local source/provenance paths
  - project-local `project.json` name readback
  - structured provenance, Asset Processor, and Phase 9 readback sections
- implemented bounded review-status mapping:
  - provenance/source/assetdb/product/dependency/catalog blockers
  - Asset Processor warning/error review states
  - license/quality review-required states
  - operator decision mapping for `pending/reject/request_* /approve_*`
- preserved fail-closed and non-authorizing posture:
  - read-only only
  - no provider/Blender/Asset Processor execution
  - no assignment/placement execution
  - no project writes
- follow-on boundary hardening:
  - added regression coverage to prove operator decision fields cannot override
    blocked evidence gates
  - added regression coverage for `request_license_review` decision-state
    mapping under ready evidence

## Files

- `backend/app/models/asset_forge.py`
- `backend/app/api/routes/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `backend/app/main.py`
- `backend/tests/test_api_routes.py`

## Validation

- `python -m pytest backend/tests/test_api_routes.py -k "review_packet or o3de_readback or root_includes_current_control_plane_routes" -q`
- `python -m pytest backend/tests/test_api_routes.py -q`
- `python -m pytest backend/tests/test_validation_report_intake.py backend/tests/test_api_routes.py -k "stage_write or validation_report_intake or review_packet" -q`
- `git diff --check`
- `git diff --cached --check`

Latest refresh evidence:

- `python -m pytest backend/tests/test_validation_report_intake.py backend/tests/test_api_routes.py -k "stage_write or validation_report_intake or review_packet"` -> `40 passed, 117 deselected`

## Boundaries preserved

- no provider generation admission
- no Blender execution admission
- no Asset Processor execution admission
- no generated-asset assignment admission
- no placement execution admission
- no broad project mutation
- no client-side authorization semantics

## Recommended next packet

Asset Forge provider preflight hardening packet:

- define exact assignment-design candidate boundaries before proof/admission
- preserve review-packet hold-state and non-admission constraints
- keep assignment/placement execution corridors blocked
