# Next App-wide Unlock Packet

## Recommendation
Validation report intake dry-run parser scaffold and fail-closed test matrix.

## Why this is next
- The intake contract and fail-closed parser design are now documented.
- The safest follow-up is a narrow dry-run parser scaffold with explicit
  malformed-input refusal tests.
- This moves validation intake from plan-only toward auditable dry-run behavior
  without admitting execution or mutation.

## Scope
- backend tests + docs with optional parser scaffolding kept dry-run only
- enforce schema/version/provenance gate checks in parser-facing contracts
- emit explicit refusal reasons for malformed input
- no runtime execution admission
- no mutation admission

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- parser contract fixtures exist for valid and invalid envelopes
- malformed input returns fail-closed refusal reasons
- dry-run responses keep execution/mutation flags false
- blocked/forbidden surfaces stay explicit

## Alternative considered
Evidence timeline shell.

This remains valid, but intake dry-run/parser safety coverage is recommended
first so timeline/dashboard surfaces can bind to explicit validation-intake
contract evidence.
