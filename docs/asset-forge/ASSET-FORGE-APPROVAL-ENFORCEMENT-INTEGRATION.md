# Asset Forge Approval Enforcement Integration

Status: Packet E enforcement integration (non-mutating)

## Purpose

This packet wires server-owned approval/session evaluation into
mutation-adjacent Asset Forge endpoints without admitting any mutation
execution.

The server now evaluates:

- session exists
- session status is not expired/revoked/rejected
- requested operation matches session scope
- request fingerprint matches the current bounded envelope
- policy decision for whether execution would be allowed if mutation were ever
  admitted

Even when all checks pass, execution remains blocked in this packet.

## Decision Model

Mutation-adjacent responses now include a structured
`server_approval_evaluation` decision object with:

- `decision_state`: `denied`, `pending`, `ready_but_not_admitted`
- `decision_code`: explicit reason code (missing session, mismatch, expired,
  revoked, etc.)
- `policy_decision`: `deny`, `pending`, `allow_if_mutation_admitted`
- `policy_would_allow_if_mutation_admitted`: boolean policy preview
- `authorization_granted`: always `false` in this packet

Client approval fields remain intent-only metadata and never authorization.

## Endpoints Evaluating Server Sessions

- `POST /asset-forge/o3de/stage-write`
- `POST /asset-forge/o3de/placement-proof`
- `POST /asset-forge/o3de/placement-harness/execute`
- `POST /asset-forge/o3de/placement-harness/live-proof`

## Safety Boundaries Preserved

- stage-write execution remains blocked
- placement proof/runtime/live-proof execution remains blocked
- no runtime bridge calls are admitted
- no provider generation, Blender execution, or Asset Processor execution is
  admitted
- no O3DE source staging or placement mutation is admitted
- no file copy/write into O3DE project assets is admitted by this packet

## Next Gate

A future packet may propose mutation admission only after explicit operator
approval and dedicated tests proving:

- server decision ownership and session binding are enforced at execution time
- exact-scope mutation corridors are bounded and reversible where claimed
- all non-admitted paths remain fail-closed
