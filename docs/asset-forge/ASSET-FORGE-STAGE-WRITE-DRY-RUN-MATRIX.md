# Asset Forge Stage-Write Dry-Run Matrix

## Status
Implemented as dry-run metadata and fail-closed tests only. No mutation admitted.

## Corridor
- `asset_forge.o3de.stage_write.v1`

## Dry-run response fields
The stage-write endpoint now reports these dry-run-only fields:
- `corridor_name`
- `dry_run_only`
- `execution_admitted`
- `admission_flag_name`
- `admission_flag_state`
- `admission_flag_enabled`
- `write_executed`
- `project_write_admitted`
- `normalized_destination_path`
- `destination_within_staging_root`
- `staging_root_allowlisted`
- `overwrite_policy`
- `overwrite_detected`
- `source_hash_expected`
- `manifest_hash_expected`
- `source_hash_match`
- `manifest_hash_match`
- `path_traversal_detected`
- `fail_closed_reasons`
- `server_approval_evaluation`

## Fail-closed gates covered
- client `approval_state=approved` remains intent-only and never authorizes write execution
- missing approval session fails closed
- expired approval session fails closed
- revoked approval session fails closed
- wrong operation scope fails closed
- fingerprint mismatch fails closed
- admission flag missing/off fails closed by default
- malformed admission flag fails closed
- admission flag true still stays blocked until proof-only execution is explicitly implemented
- path traversal fails closed
- destination outside allowlisted staging root fails closed
- overwrite attempt with `overwrite_policy=deny` fails closed
- source hash mismatch fails closed
- manifest hash mismatch fails closed
- valid-looking request with matching hashes still returns dry-run-only blocked status

## No mutation guarantee
This packet does not:
- copy or write files into O3DE project assets
- execute stage-write mutation
- execute placement runtime/harness/live-proof mutation
- call runtime bridge commands
- call providers
- run Blender
- run Asset Processor
- authorize from client approval fields

## Next packet
Implement the server-owned admission flag as an explicit default-off gate with fail-closed behavior and bounded proof-only execution constraints, still without broad mutation admission.
