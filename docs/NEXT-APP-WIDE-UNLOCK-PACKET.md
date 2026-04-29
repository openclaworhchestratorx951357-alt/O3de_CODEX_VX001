# Next App-wide Unlock Packet

## Recommendation
Validation report intake contract and fail-closed parser design.

## Why this is next
- Validation intake baseline is now checkpointed and still lacks an explicit
  admitted contract.
- A design packet can define accepted payload shape, provenance requirements,
  and malformed-input fail-closed behavior without enabling execution.
- This prepares safe future implementation/testing while keeping scope narrow.

## Scope
- docs+tests design packet
- define intake payload contract and provenance requirements
- define malformed-input and schema mismatch fail-closed semantics
- no runtime behavior broadening
- no backend mutation admission
- no execution admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- design doc defines exact intake contract and fail-closed rules
- maturity labels remain conservative and evidence-backed
- blocked/forbidden surfaces stay explicit
- no runtime execution behavior changes in this packet

## Alternative considered
Evidence timeline shell.

This remains valid, but intake contract design is recommended first so timeline
and dashboard linkage can bind to explicit validation-intake semantics.
