# AI Asset Forge Entity Assignment Operator Examples

Status: operator examples packet (plan-only assignment design; non-authorizing)

## Purpose

Provide operator-facing accepted/refused examples for
`POST /asset-forge/o3de/assignment-design` while preserving fail-closed truth
and explicit non-admission boundaries.

## Current boundary

- endpoint: `POST /asset-forge/o3de/assignment-design`
- capability: `asset_forge.o3de.assignment.design`
- maturity: `plan-only`
- response posture:
  - `assignment_execution_status=blocked`
  - `assignment_write_admitted=false`
  - `read_only=true`
  - `mutation_occurred=false`
- this endpoint does not authorize assignment or placement execution

## Safe blocked example: non-approved operator decision

Request body:

```json
{
  "candidate_id": "candidate-assignment",
  "candidate_label": "Candidate Assignment",
  "source_asset_relative_path": "Assets/Generated/asset_forge/candidate_assignment/candidate_assignment.glb",
  "provenance_metadata_relative_path": "Assets/Generated/asset_forge/candidate_assignment/candidate_assignment.forge.json",
  "target_level_relative_path": "Levels/BridgeLevel01/BridgeLevel01.prefab",
  "target_entity_name": "AssetForgeAssignmentCandidate",
  "target_component": "Mesh",
  "selected_platform": "pc",
  "operator_decision_reference": "pending",
  "review_packet_reference": "packet-13/review-packet.json",
  "stage_write_evidence_reference": "packet-10/stage-write-evidence.json",
  "stage_write_readback_reference": "packet-10/readback-evidence.json",
  "stage_write_readback_status": "succeeded"
}
```

Expected response truths:

- `assignment_design_status=blocked`
- `fail_closed_reasons` includes:
  - `operator_decision_not_assignment_design_approval`
  - `review_packet_not_assignment_design_approved`
- `blocked_reason` remains explicit
- `assignment_execution_status=blocked`
- `assignment_write_admitted=false`
- `read_only=true`
- `mutation_occurred=false`

## Safe blocked example: stage-write readback not succeeded

If stage-write readback status is not `succeeded`, expected truth remains
blocked with explicit fail-closed reasons.

Expected response truths:

- `assignment_design_status=blocked`
- `fail_closed_reasons` includes `stage_write_readback_not_succeeded`
- `stage_write_readback_ready=false`
- `assignment_execution_status=blocked`
- `assignment_write_admitted=false`

## Safe ready example: assignment-design-only approval

When review/readback/path gates are satisfied:

- `operator_decision_reference=approve_assignment_design_only`
- review packet resolves to `operator_approved_assignment_design`
- stage-write evidence and readback references are present and succeeded

Expected response truths:

- `assignment_design_status=ready-for-approval`
- `blocked_reason=null`
- `review_packet_status=operator_approved_assignment_design`
- `fail_closed_reasons=[]`
- `stage_write_evidence_ready=true`
- `stage_write_readback_ready=true`
- `assignment_execution_status=blocked`
- `assignment_write_admitted=false`
- `read_only=true`
- `mutation_occurred=false`

## Final boundary

This packet does not admit provider generation, Blender execution, Asset
Processor execution, generated-asset assignment execution, placement execution,
or broad project mutation.
