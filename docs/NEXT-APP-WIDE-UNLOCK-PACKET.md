# Next App-wide Unlock Packet

## Recommendation
CI admission design packet.

## Why this is next
- TIAF preflight baseline is now documented as an explicit non-executing,
  plan-only corridor.
- The next missing validation gate is CI/test execution admission design.
- This preserves current fail-closed posture while defining future execution
  admission boundaries without widening runtime capability.

## Scope
- docs/design focused packet
- define CI/test execution allowlist boundary
- define timeout/provenance/refusal requirements
- define evidence and revert requirements for any future admission revisit
- no execution or mutation admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- CI/test execution boundaries are explicit and fail-closed
- allowlist and refusal semantics are concrete and reviewable
- evidence/revert requirements are explicit before any admission change
- no mutation/execution admission changes
- docs and matrices remain aligned on the same capability truth

## Alternative considered
Validation intake endpoint-candidate admission audit/review packet.

This remains valid, but CI admission design is the narrower immediate gate
after confirming the TIAF preflight baseline.
