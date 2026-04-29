# Next App-wide Unlock Packet

## Recommendation
Flow Trigger Suite operational retention policy packet.

## Why this is next
- Flow Trigger Suite stability audit is now complete.
- Repeated multi-lane runs now have explicit queue/event/state invariants and
  lane-isolation evidence.
- The next project-moving critical path is bounded retention policy definition
  for queue/event/state artifacts to prevent unbounded local growth.
- This gate can proceed without widening runtime execution boundaries in
  existing admission lanes.

## Scope
- narrow retention-policy packet
- define bounded local retention/rotation rules for queue/event/state artifacts
- preserve audit evidence requirements while limiting local growth
- preserve local-only trigger posture and fail-closed behavior
- keep runtime execution/mutation admission unchanged

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- retention boundaries are explicit, deterministic, and operator-auditable
- retention rules preserve required evidence contract and fail-closed posture
- no broadening of endpoint or dispatch execution/mutation capability
- no client approval/session fields treated as authorization
- recommendation for the next packet is explicit and testable

## Alternative considered
Flow Trigger Suite generalized cleanup packet.

This remains valid, but retention policy hardening is the next critical-path
gate after stability auditing.
