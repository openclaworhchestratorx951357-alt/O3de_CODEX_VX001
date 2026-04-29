# Asset Forge Stage-Write Proof-Only Execution

## Status
Implemented as an exact, server-gated proof-only corridor for `asset_forge.o3de.stage_write.v1`.

Default remains fail-closed and blocked unless every gate passes.

## Corridor
- `asset_forge.o3de.stage_write.v1`

## What this packet implements
- exact-scope proof-only stage-write execution for:
  - one source asset
  - one `.forge.json` provenance manifest
- server-owned gate enforcement before any write attempt
- deterministic manifest payload generation and hash verification
- post-write readback hash verification for source + manifest
- exact-scope failure revert for only the staged source + manifest paths
- post-write read-only ingest/readback evidence bridge summary capture

## Required gates before execution can occur
- server approval decision would allow if mutation admitted
- explicit admission flag on (`ASSET_FORGE_STAGE_WRITE_V1_PROOF_ONLY_ADMISSION_ENABLED`)
- admission evidence present:
  - admission packet reference
  - admission operator id
  - operator note (when approval state is `approved`)
- proof contract evidence present:
  - evidence bundle reference
  - post-write readback plan reference
  - revert plan reference
  - exact revert allowlist matching only stage + manifest paths
- bounded path constraints:
  - no traversal
  - destination inside allowlisted stage root
  - destination inside configured project root
  - destination source extension allowlisted
  - source inside runtime root
  - source extension allowlisted
- hash and overwrite constraints:
  - source hash matches expected
  - manifest hash matches expected
  - overwrite policy supported
  - overwrite denied unless future corridor explicitly changes policy
- source size within configured cap

## Default fail-closed behavior (still active)
When any gate fails:
- `write_status=blocked`
- `dry_run_only=true`
- `execution_admitted=false`
- `write_executed=false`
- `project_write_admitted=false`
- no project file writes occur

## Proof-only execution behavior (fully gated only)
When every gate passes:
- `write_status=succeeded`
- `dry_run_only=false`
- `execution_admitted=true`
- `write_executed=true`
- `project_write_admitted=true`
- only the exact approved source + manifest files are written
- post-write readback hashes are recorded and must match expected values
- a bridged ingest/readback evidence summary is attached under `post_write_readback`

If execution write/readback fails:
- response returns `write_status=failed`
- exact-scope revert is applied only to the staged source + manifest files
- corridor remains fail-closed for that request

## What remains blocked
- provider generation
- Blender execution
- placement runtime execution
- placement harness/live-proof mutation execution
- Asset Processor execution
- material mutation
- prefab mutation
- source-product-cache mutation
- runtime bridge mutation calls
- arbitrary file writes
- arbitrary shell/script execution
- broad project mutation
- client approval as authorization

## Validation focus
- stage-write proof-only success test with full gate context
- existing fail-closed matrix tests remain active for:
  - missing/expired/revoked/wrong-operation/fingerprint mismatch sessions
  - path traversal/outside root
  - overwrite attempts
  - source/manifest hash mismatch
  - missing gate evidence

## Next packet
Placement proof-only design/readiness update that consumes stage-write + readback evidence while keeping placement execution blocked by default.
