# AI Asset Forge Entity Assignment Design Readiness Audit

Status: readiness audit only (no runtime change)

## Purpose

Verify which assignment-design contract gates are already testable with current
surfaces, and which gates must still be implemented before any proof-only
assignment-design runtime packet.

## Scope

- audits readiness against
  `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-CONTRACT.md`
- classifies gates as ready vs missing
- confirms non-admission boundaries remain explicit
- does not unlock assignment/placement execution or mutation

## Truth sources used

1. Current code and tests:
   - `backend/app/services/asset_forge.py`
   - `backend/tests/test_api_routes.py`
2. Assignment design inputs:
   - `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-BASELINE-AUDIT.md`
   - `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-CONTRACT.md`
3. Current review/placement gates:
   - `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-LONG-HOLD-CHECKPOINT.md`
   - `docs/ASSET-FORGE-STAGE-WRITE-ADMISSION-FLAG-VERIFICATION.md`
   - `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`

## Validation evidence

Commands run:

- `python -m pytest backend/tests/test_api_routes.py -k "review_packet or placement_plan or placement_proof" -q`
- `git diff --check`
- `git diff --cached --check`

Result summary:

- targeted Forge review/placement tests passed
- diff checks passed

## Readiness checklist

| Gate | Status | Evidence | Notes |
| --- | --- | --- | --- |
| review packet exposes explicit operator decision taxonomy | ready | review packet tests/docs | `approve_assignment_design_only` and `operator_approved_assignment_design` are present. |
| review packet remains read-only/non-authorizing | ready | review packet tests/docs | `read_only=true`, `mutation_occurred=false` invariants are covered. |
| source path allowlist and extension checks | ready | placement-plan code/tests | Existing path policy logic can be reused for assignment design. |
| target level path constraint checks (`Levels/*.prefab`) | ready | placement-plan code/tests | Existing level-bound checks are already test-backed. |
| stage-write/readback evidence reference contract | partial | placement-proof code/tests | Evidence reference fields exist, but no assignment-design surface consumes them yet. |
| assignment-design request/response schema (`asset_forge.assignment.design.v1`) | missing | contract doc only | No runtime assignment-design endpoint exists yet. |
| assignment-design fail-closed reasons and policy payload | missing | contract doc only | Must be implemented and test-backed in a dedicated packet. |
| assignment-design status output (`blocked`/`ready-for-approval`) | missing | contract doc only | No existing runtime surface emits assignment-design status. |

## Boundary confirmations

This readiness audit confirms the following remain blocked/unadmitted:

- generated-asset assignment execution
- level placement execution
- provider generation execution
- Blender execution
- Asset Processor execution
- broad project mutation
- client/operator fields as authorization

## What this packet does not do

- no backend/runtime code changes
- no new endpoint admission
- no assignment/placement execution
- no mutation broadening

## Recommended next packet

Entity assignment design proof-only packet implementation:

- add a bounded plan-only assignment-design endpoint candidate
- enforce fail-closed contract checks from this readiness audit
- keep assignment execution blocked and non-mutating
