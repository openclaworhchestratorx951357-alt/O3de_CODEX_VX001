# Next App-wide Unlock Packet

## Recommendation
Validation intake endpoint-candidate dry-run implementation (default-off).

## Why this is next
- Capability, audit, evidence timeline, approval/session, and workspace-status
  shells now exist.
- Validation intake baseline, contract, parser matrix, and endpoint-candidate
  admission design now exist.
- The narrow next move is a server-flagged endpoint-candidate implementation
  that preserves dry-run-only behavior and proves fail-closed defaults in code.

## Scope
- backend-targeted packet with no runtime execution admission
- implement endpoint-candidate path behind explicit server-owned admission flag
  that defaults to off
- preserve dry-run parser boundary and fail-closed defaults
- return explicit refusal reasons for unadmitted or invalid requests
- no backend execution admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- endpoint candidate remains blocked while admission flag is off
- valid requests return dry-run-only/no-execution flags
- implementation preserves server-owned authorization and intent-only client
  fields
- no mutation/execution admission changes
- targeted backend tests cover accepted + refused fail-closed paths

## Alternative considered
Flow Trigger Suite productization plan.

This remains valid, but validation-intake endpoint-candidate implementation is
recommended first to close the contract-to-runtime gap while preserving strict
default fail-closed behavior.
