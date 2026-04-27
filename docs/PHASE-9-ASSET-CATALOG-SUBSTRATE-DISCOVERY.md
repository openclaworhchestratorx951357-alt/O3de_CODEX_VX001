# Phase 9 Asset Catalog Substrate Discovery

## Purpose

This discovery packet checks whether the local O3DE Asset Catalog can provide a
second read-only evidence substrate for Phase 9 asset readback.

This packet is discovery only. It does not change runtime behavior, schemas,
prompt behavior, adapters, dependencies, or O3DE project/cache files.

## Read-Only Substrate Checked

Project:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox
```

Catalog:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\pc\assetcatalog.xml
```

Observed metadata:

- exists: `true`
- size: `5925410` bytes
- last write time: `2026-04-26 22:08:26`
- SHA-256:
  `CED0872CD9FC14AC93FB6041D115677F1AFCE7C38F7E4CC2055E77B1968CCBFA`

No Asset Processor, `AssetProcessorBatch`, project mutation, cache mutation, or
source/product asset mutation command was run.

## Discovery Result

The file has an `.xml` extension, but read-only inspection showed it is not
useful as plain text XML for this packet. It behaves like a binary or
serialized catalog with embedded path strings.

Bounded byte-level inspection found:

- `levels/bridgelevel01/bridgelevel01.spawnable`
- `levels/bridgelevel01_probe_b/bridgelevel01_probe_b.spawnable`

The BridgeLevel product path appears once for the known Phase 9 proof target:

```text
levels/bridgelevel01/bridgelevel01.spawnable
```

That matches the product already proven through `Cache/assetdb.sqlite` for:

```text
Levels/BridgeLevel01/BridgeLevel01.prefab
```

## Candidate Value

The Asset Catalog is a useful read-only evidence substrate for product-name
presence and broad product path inventory.

It may be useful later for:

- confirming that a product path is present in the runtime catalog
- cross-checking Asset Processor database product rows
- detecting product paths that exist in the catalog but are not returned by a
  source-focused database lookup

## Limits Found

This discovery did not prove:

- source-to-product mapping from catalog alone
- product-to-source mapping from catalog alone
- product dependency rows
- source dependency rows
- product freshness
- broad catalog completeness
- a stable parser contract for the serialized catalog format

Plain text search found path strings, but not enough structured evidence to
replace the current `assetdb.sqlite` reader.

## Decision

Do not implement an Asset Catalog reader yet.

Keep the admitted Phase 9 readback corridor centered on project-local
`Cache/assetdb.sqlite` until a future design packet identifies a stable,
structured, read-only parser for the catalog format.

The no-runtime parser design is now tracked in
`docs/PHASE-9-ASSET-CATALOG-PARSER-DESIGN.md`.

## Future Design Gates

Before adding Asset Catalog readback, a future packet should answer:

1. What official O3DE API or stable file format reads `assetcatalog.xml`?
2. Can the catalog be parsed without O3DE runtime execution?
3. Can product path entries be mapped to Asset IDs and source GUIDs
   deterministically?
4. Can dependency data be read from the catalog, or is it still database-only?
5. How should the reader report binary/serialized catalog shape failures?

## Still Not Admitted

- Asset Catalog public query surface
- broad asset catalog resolve
- `asset.product.resolve`
- Asset Processor execution
- `AssetProcessorBatch` execution
- cache mutation
- source/product asset mutation
- dependency repair or product generation

## Next Safe Packet

The next safe packet is either a proof-only product-path presence
implementation behind the existing narrow `asset.source.inspect` corridor, or a
schema-only catalog evidence shape packet if structured fields should be
admitted before runtime code.
