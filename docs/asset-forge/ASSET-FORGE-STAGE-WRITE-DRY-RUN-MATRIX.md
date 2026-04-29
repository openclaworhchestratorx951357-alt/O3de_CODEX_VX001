# Asset Forge Stage-Write Dry-Run Matrix

## Status
Implemented as dry-run metadata + fail-closed matrix for blocked paths.

Default remains fail-closed and blocked. A separate fully gated proof-only execution path now exists and is documented in `ASSET-FORGE-STAGE-WRITE-PROOF-ONLY-EXECUTION.md`.

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
- `admission_packet_reference`
- `admission_operator_id`
- `operator_note_present`
- `admission_evidence_ready`
- `evidence_bundle_reference`
- `post_write_readback_plan_reference`
- `revert_plan_reference`
- `post_write_readback_plan_ready`
- `revert_plan_ready`
- `revert_plan_exact_scope`
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
- admission flag on with missing server admission packet reference fails closed
- admission flag on with missing server admission operator identity fails closed
- approval state approved without operator note fails closed
- incomplete admission evidence remains blocked
- admission flag on with missing evidence bundle reference fails closed
- admission flag on with missing post-write readback plan reference fails closed
- admission flag on with missing revert plan reference fails closed
- admission flag on without exact revert-path allowlist fails closed
- revert scope mismatch fails closed
- admission flag true still fails closed when any required gate/evidence condition is missing
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
Placement harness/live-proof contract gate alignment (server-owned packet/evidence/readback/revert metadata), still default fail-closed and non-executing.
