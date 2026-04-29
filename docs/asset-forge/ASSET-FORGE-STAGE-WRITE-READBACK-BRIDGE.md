# Asset Forge Stage-Write Readback Bridge

## Status
Implemented.

This packet adds a bounded, read-only evidence bridge from successful proof-only
`asset_forge.o3de.stage_write.v1` executions into
`asset_forge.o3de.ingest.readback`.

## Purpose
After an exact-scope proof-only stage-write succeeds, the same endpoint now
captures immediate O3DE ingest evidence signals without running Asset Processor
or expanding mutation scope.

## Scope
- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`
- docs updates only

## Behavior
When stage-write is blocked:
- behavior is unchanged
- `post_write_readback.ingest_readback_bridge_status = "not_run"`

When stage-write succeeds:
- endpoint performs a read-only bridge call to ingest/readback for the staged
  source path
- bridge status is recorded in:
  - `post_write_readback.ingest_readback_bridge_status`
  - `post_write_readback.ingest_readback_bridge`
- bridge summary includes bounded evidence fields such as:
  - readback status
  - selected platform
  - source existence
  - assetdb existence / source indexed signal
  - product/dependency counts
  - catalog existence / presence signal
  - bounded warning list and safest next step

Default bridge platform is `pc` and can be overridden with:
- `ASSET_FORGE_STAGE_WRITE_V1_READBACK_PLATFORM`

## Safety posture
This packet does not:
- run Asset Processor
- run Blender
- call providers
- execute placement
- call runtime bridge mutation surfaces
- broaden file-write scope beyond the exact stage-write corridor
- treat client approval fields as authorization

## Notes on outcomes
- Stage-write success can coexist with bridged readback `blocked` status when
  assetdb/catalog evidence is not present yet.
- That blocked readback signal is expected and surfaces the next safe operator
  step (operator-managed Asset Processor refresh outside this endpoint).

## Next packet
Placement proof contract/evidence gate checks (operator packet reference,
evidence bundle reference, readback plan reference, revert statement
contract), still default fail-closed and non-executing.
