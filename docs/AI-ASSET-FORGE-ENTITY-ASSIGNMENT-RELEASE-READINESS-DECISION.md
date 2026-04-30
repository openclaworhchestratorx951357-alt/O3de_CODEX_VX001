# AI Asset Forge Entity Assignment Release Readiness Decision

Status: decision recorded (design/audit only; no runtime broadening)

## Purpose

Record whether `asset_forge.o3de.assignment.design` is ready for broader
admission movement, or should remain at the current plan-only,
non-authorizing posture.

## Decision

Decision: hold at current posture.

- keep `asset_forge.o3de.assignment.design` as plan-only guidance
- do not broaden to generated-asset assignment execution admission
- do not broaden to placement execution admission
- do not broaden to provider/Blender/Asset Processor execution admission
- do not broaden to broad project-mutation admission

## Current readiness truth

The following are established and verified:

- endpoint exists: `POST /asset-forge/o3de/assignment-design`
- maturity is `plan-only`
- assignment-design statuses remain bounded:
  - `blocked`
  - `ready-for-approval`
- fail-closed reason taxonomy is checkpointed and explicit
- response posture remains:
  - `assignment_execution_status=blocked`
  - `assignment_write_admitted=false`
  - `read_only=true`
  - `mutation_occurred=false`
- operator examples now document safe blocked/ready request outcomes

## Go/No-Go gates for any future broadening discussion

No future broadening should be considered unless all gates are explicitly
re-verified:

1. fail-closed reasons remain explicit for missing/invalid review, readback,
   and path gates
2. assignment-design ready state remains non-authorizing and non-mutating
3. review packet remains read-only and non-authorizing
4. assignment and placement execution remain blocked without separate admission
   packets
5. no forbidden boundary widening is introduced:
   - no provider generation
   - no Blender execution
   - no Asset Processor execution admission
   - no generated-asset assignment execution
   - no placement execution
   - no broad project mutation admission

## Risk classification

- packet type: design/audit decision
- risk level: low
- runtime behavior changed: no
- dependency/bootstrap changes: none

## What remains blocked

- generated-asset assignment execution admission
- placement execution admission
- provider/Blender/Asset Processor execution admission
- broad project mutation admission
- client/operator decision fields as authorization

## Evidence

- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-CONTRACT.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-READINESS-AUDIT.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-PROOF-ONLY-IMPLEMENTATION.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-OPERATOR-EXAMPLES.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-REVIEW-CHECKPOINT.md`
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`

## Recommended next packet

Editor placement proof-only readiness audit:

- checkpoint held assignment-design posture and stream handoff boundaries
- preserve plan-only/non-authorizing boundaries
- keep assignment and placement execution corridors blocked
