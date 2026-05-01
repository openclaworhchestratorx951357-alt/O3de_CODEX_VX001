# AI Asset Forge Entity Assignment Design Contract

Status: design-only (no runtime admission change)

## Purpose

Define the first explicit contract for generated-asset assignment design without
admitting assignment execution, placement execution, or broad mutation.

This packet documents scope, contract fields, fail-closed rules, and required
tests for a future readiness-audit packet.

## Current baseline

Current baseline is recorded in:

- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-BASELINE-AUDIT.md`
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-LONG-HOLD-CHECKPOINT.md`
- `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`
- `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`

No assignment-design corridor is currently admitted.

## Proposed corridor (design only)

- candidate capability name: `asset_forge.o3de.assignment.design`
- maturity target in this packet: `plan-only`
- execution/mutation admission in this packet: none

## Candidate contract shape (v1 design)

Future assignment-design requests should use bounded fields:

| Field | Required | Rules |
| --- | --- | --- |
| `schema` | yes | exact string `asset_forge.assignment.design.v1` |
| `capability_name` | yes | exact string `asset_forge.o3de.assignment.design` |
| `candidate_id` | yes | non-empty stable id |
| `candidate_label` | yes | non-empty human-readable label |
| `source_asset_relative_path` | yes | project-relative path under `Assets/Generated/asset_forge/` |
| `provenance_metadata_relative_path` | yes | project-relative `.forge.json` path |
| `selected_platform` | yes | bounded value, default `pc` |
| `review_packet_reference` | yes | bounded review evidence reference id |
| `operator_decision_reference` | yes | must resolve to `approve_assignment_design_only` disposition |
| `target_level_relative_path` | yes | bounded `Levels/*.prefab` path |
| `target_entity_name` | yes | deterministic non-empty name |
| `target_component` | yes | bounded component target (default `Mesh`) |
| `notes` | no | optional operator-facing design note |

## Required preconditions

Any future implementation must fail closed unless all preconditions are true:

1. review packet status is `operator_approved_assignment_design`
2. review packet remains `read_only=true` and `mutation_occurred=false`
3. staged source path is still present and allowlisted
4. stage-write and readback evidence references are present
5. candidate target level path stays under `Levels/` and ends with `.prefab`
6. no client-provided approval/session field is treated as authorization

## Fail-closed rules

A future assignment-design handler must fail closed when:

- required fields are missing or malformed
- `schema` or `capability_name` are unexpected
- source/provenance paths escape project root
- operator decision is not assignment-design-only approval
- review packet evidence is missing or indicates blocked state
- stage/readback evidence references are missing
- target level/entity/component fields are invalid
- client attempts to inject authorization via payload fields

Fail-closed responses must keep:

- no execution admission
- no mutation admission
- no file writes
- no provider/Blender/Asset Processor execution
- no placement execution

## Design output expectations

Future design output should be explicit and non-authorizing:

- `assignment_design_status` (`blocked` or `ready-for-approval`)
- `blocked_reason`
- `next_safest_step`
- `assignment_design_policy`
- `read_only=true`
- `mutation_occurred=false`
- `assignment_execution_status=blocked`

## Boundary confirmations

This contract keeps blocked:

- generated-asset assignment execution
- level placement execution
- provider generation execution
- Blender execution
- Asset Processor execution
- broad mutation corridors

## Required tests for future readiness/implementation packets

Future packets should prove at minimum:

- schema/capability mismatch fails closed
- missing review packet evidence fails closed
- non-approved operator decision fails closed
- path normalization/traversal guards fail closed
- target level constraint checks fail closed
- non-authorizing client approval/session fields are ignored
- ready design output remains non-executing/non-mutating

## What this packet does not do

- no backend/runtime code changes
- no new endpoint admission
- no assignment or placement execution
- no mutation broadening

## Recommended next packet

Entity assignment design proof-only packet implementation:

- add a bounded plan-only assignment-design endpoint candidate
- enforce fail-closed checks for review/status/readback/path gates
- keep assignment/placement execution blocked
