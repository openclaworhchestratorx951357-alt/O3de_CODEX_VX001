# AI Asset Forge Operator Review Packet Operator Examples

Status: operator examples packet (proof-only review packet; non-authorizing)

## Purpose

Provide operator-facing accepted/refused examples for
`POST /asset-forge/o3de/review-packet` while preserving fail-closed truth and
explicit non-admission boundaries.

## Current boundary

- endpoint: `POST /asset-forge/o3de/review-packet`
- capability: `asset_forge.o3de.review.packet`
- maturity: `proof-only`
- response posture:
  - `read_only=true`
  - `mutation_occurred=false`
- this endpoint does not authorize assignment/placement execution

## Safe blocked example: missing provenance

Request body:

```json
{
  "candidate_id": "candidate-a",
  "candidate_label": "Weathered Ivy Arch",
  "source_asset_relative_path": "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
  "provenance_metadata_relative_path": "Assets/Generated/asset_forge/candidate_a/candidate_a.forge.json",
  "selected_platform": "pc",
  "operator_decision": "pending"
}
```

Expected response truths:

- `review_status=missing_provenance`
- `blocked_reason` explains missing/invalid provenance
- `operator_decision=pending`
- `read_only=true`
- `mutation_occurred=false`

## Safe blocked example: Asset Processor warnings

When readback evidence shows warning rows and zero errors:

- `review_status=asset_processor_warnings_need_review`
- `blocked_reason` references warning count
- `next_safest_step` keeps review bounded before assignment design
- `read_only=true`
- `mutation_occurred=false`

## Safe ready/decision examples (still non-authorizing)

When provenance/readback/license/quality gates are satisfied:

- pending operator decision:
  - `review_status=ready_for_operator_decision`
  - `blocked_reason=null`
  - `next_safest_step` keeps assignment/placement execution blocked
- design-only approval decision:
  - request: `operator_decision=approve_assignment_design_only`
  - response: `review_status=operator_approved_assignment_design`
  - `blocked_reason=null`
  - `next_safest_step` explicitly forbids execution

In all ready/decision states:

- `read_only=true`
- `mutation_occurred=false`
- `o3de_source.staging_approval_source` remains non-authorizing

## Final boundary

This packet does not admit provider generation, Blender execution, Asset
Processor execution, generated-asset assignment execution, placement execution,
or broad project mutation.
