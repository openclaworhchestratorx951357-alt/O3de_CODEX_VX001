# Phase 9 Asset Readback Proof-Only Packet

## Purpose

This packet admits one bounded proof-only readback path for
`asset.source.inspect`.

The adapter may inspect the project-local Asset Processor database at
`Cache/assetdb.sqlite` in read-only mode when a requested source asset exists
under the project root and the caller asks for product or dependency evidence.

## Boundary

- read-only inspection only
- no Asset Processor execution
- no `AssetProcessorBatch` execution
- no source, product, cache, or project mutation
- no cache or raw proof artifact commits
- no public asset mutation admission

## Proof Target

The Phase 9 substrate audit proved the path with:

- source: `Levels/BridgeLevel01/BridgeLevel01.prefab`
- product: `pc/levels/bridgelevel01/bridgelevel01.spawnable`
- substrate: `McpSandbox/Cache/assetdb.sqlite`

## Behavior

When the database contains a matching `Sources` row, `asset.source.inspect` can
report bounded product rows from `Jobs`/`Products` and bounded dependency rows
from `ProductDependencies`.

If the database is missing, unreadable, unsupported, or does not contain the
requested source, the tool remains read-only and reports unavailable evidence
instead of claiming mutation capability.
