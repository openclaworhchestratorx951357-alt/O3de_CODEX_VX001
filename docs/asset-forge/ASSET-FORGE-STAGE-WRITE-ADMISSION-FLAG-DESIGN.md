# Asset Forge Stage-Write Admission Flag Design

## Status
Design-only. No mutation admitted by this document.

Implementation status (current):
- server-owned admission-flag metadata plumbing is implemented with default-off fail-closed parsing
- malformed flag values fail closed
- client override attempts are ignored
- stage-write execution is still blocked
- this is not an admitted execution path

## Intent
Define the explicit server-owned admission flag required before any future proof-only stage-write execution packet can even be considered for `asset_forge.o3de.stage_write.v1`.

This packet does not enable stage-write execution.

## Scope
This design applies only to the first candidate mutation corridor:
- `asset_forge.o3de.stage_write.v1`

It does not apply to:
- provider generation
- Blender execution
- placement runtime/harness/live-proof execution
- Asset Processor execution
- material/prefab mutation
- broad project mutation

## Proposed admission flag
Proposed server-owned gate identifier:
- `asset_forge.o3de.stage_write.v1.proof_only_admission_enabled`

Required semantics:
- default state is `false` (or missing => `false`)
- fail-closed on missing/invalid/unreadable flag state
- never writable by client request payload, query params, headers, or UI state
- evaluated server-side only
- scoped only to `asset_forge.o3de.stage_write.v1`

## Ownership and enable authority
The admission flag must be controlled by server-owned policy state, not client input.

Enable authority must be explicit and auditable:
- operator-approved, server-side workflow only
- requires approval packet reference and operator identity
- requires timestamped enable/disable audit trail
- requires explicit disable path that returns corridor to fail-closed default

## Required gating model before any execution attempt
A future proof-only execution packet may only proceed if all are true:
- admission flag is enabled server-side for this corridor
- server-owned approval session is present
- session is valid (not expired/revoked/rejected)
- requested operation matches exact corridor mapping
- request fingerprint matches session binding
- staging root is allowlisted
- normalized destination is inside staging root
- path traversal is not detected
- overwrite policy is supported and no overwrite is permitted by default
- source hash and manifest hash match expected values
- evidence bundle preconditions are satisfied

If any condition fails, behavior remains blocked and fail-closed.

## Off-by-default behavior contract
Before a future execution packet, and after it, the default contract remains:
- `dry_run_only=true`
- `execution_admitted=false`
- `write_executed=false`
- `project_write_admitted=false`
- `write_status=blocked`

No client-provided field can override this contract.

## Required evidence before enabling flag
Before enablement can be used in any execution PR:
- merged mutation-admission corridor design
- merged dry-run fail-closed matrix packet
- explicit approval packet naming exact candidate/source/paths/hashes
- operator note and reviewer reference
- pre-write dry-run evidence artifact
- no-overwrite proof
- rollback/revert plan for exact staged files only

## Required tests for future flag implementation
Any PR implementing this flag must include tests proving:
- flag missing => blocked (fail-closed)
- flag false => blocked (fail-closed)
- malformed flag state => blocked (fail-closed)
- client override attempts are ignored
- flag true but approval session missing => blocked
- flag true but session expired/revoked/rejected => blocked
- flag true but wrong operation/fingerprint mismatch => blocked
- flag true but traversal/outside-root/overwrite/hash mismatch => blocked
- flag true with valid session and valid dry-run checks still remains blocked until proof-only execution gate is explicitly implemented in that same future PR
- no files are written in every blocked case

## What remains blocked after this design
- all stage-write execution
- all placement execution
- runtime bridge calls
- provider generation
- Blender execution
- Asset Processor execution
- material/prefab/source-product-cache mutation
- arbitrary file writes and arbitrary script/shell execution

## Implementation constraints for the future proof-only execution PR
A later implementation PR may proceed only if:
- PR title explicitly says proof-only
- server-owned admission flag is implemented as default-off fail-closed
- execution corridor remains exact-scope and bounded
- evidence write/readback/revert requirements are implemented
- tests above pass and are committed
- operator explicitly approves that PR

## Decision
Adopt a server-owned default-off admission flag design for `asset_forge.o3de.stage_write.v1`, but keep execution blocked until a separate proof-only implementation packet is explicitly approved.
