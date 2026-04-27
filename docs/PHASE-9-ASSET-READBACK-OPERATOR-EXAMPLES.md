# Phase 9 Asset Readback Operator Examples

## Purpose

This guide gives operator-facing examples for the exact Phase 9
`asset.source.inspect` read-only product/dependency readback corridor, including
the proof-only Asset Catalog product-path presence cross-check.

Use these examples after the live-proven proof path recorded in
`docs/PHASE-9-ASSET-READBACK-LIVE-PROOF.md` and
`docs/PHASE-9-ASSET-CATALOG-PATH-PRESENCE-LIVE-PROOF.md`.

## Admitted Safe Requests

Safe request:

```text
Inspect asset "Levels/BridgeLevel01/BridgeLevel01.prefab" and include product and dependency evidence.
```

Expected behavior:

- plans `asset.source.inspect`
- keeps `dry_run: true`
- sets `include_products: true`
- sets `include_dependencies: true`
- reads the source file under the project root
- reads project-local `Cache/assetdb.sqlite` in read-only mode when present
- cross-checks already-proven product paths against
  `Cache/<platform>/assetcatalog.xml` in read-only mode when present
- reports bounded product/dependency evidence
- reports bounded Asset Catalog product-path presence evidence when product
  rows are available
- does not run Asset Processor
- does not mutate project, source, product, or cache files

Safe request:

```text
Read source/product/dependency evidence for "Levels/BridgeLevel01/BridgeLevel01.prefab".
```

Expected behavior:

- same bounded read-only corridor
- reports unavailable evidence if the asset database is missing, unsupported, or
  does not index the requested source
- does not treat missing product/dependency rows as permission to mutate or
  rebuild assets

Safe request:

```text
Inspect asset "Levels/BridgeLevel01/BridgeLevel01.prefab" and tell me whether its proven product path is present in the Asset Catalog.
```

Expected behavior:

- plans `asset.source.inspect`
- keeps `dry_run: true`
- sets `include_products: true`
- may set `include_dependencies: true` if the operator asks for dependency
  evidence too
- first derives product rows from project-local `Cache/assetdb.sqlite`
- uses only those already-proven product rows to query
  `Cache/<platform>/assetcatalog.xml`
- reports a bounded presence row such as
  `pc/levels/bridgelevel01/bridgelevel01.spawnable -> levels/bridgelevel01/bridgelevel01.spawnable`
- does not claim source-to-product mapping from the catalog alone
- does not claim broad catalog completeness

Safe request:

```text
Check whether "Assets/Textures/example.png" has product/dependency evidence.
```

Expected behavior:

- inspects the explicit source path only
- reports source metadata if the file exists
- reports product/dependency evidence only if a matching
  `Cache/assetdb.sqlite` row exists
- reports Asset Catalog evidence only if product rows first exist
- otherwise reports product/dependency evidence unavailable

## Refused Or Not-Admitted Requests

Not admitted:

```text
Run Asset Processor to generate missing products for BridgeLevel01.
```

Reason:

- Asset Processor execution remains unadmitted.
- `AssetProcessorBatch` execution remains unadmitted.

Not admitted:

```text
Fix the asset database so BridgeLevel01 has dependency rows.
```

Reason:

- cache mutation remains unadmitted
- project/source/product mutation remains unadmitted

Not admitted:

```text
Resolve every product and dependency in the whole asset catalog.
```

Reason:

- broad asset catalog query/resolve behavior remains unadmitted
- `asset.product.resolve` remains unadmitted
- public product/dependency completeness claims remain unadmitted

Not admitted:

```text
Use the Asset Catalog by itself to map BridgeLevel01.prefab to every product.
```

Reason:

- source-to-product mapping from the catalog alone remains unadmitted
- the admitted catalog evidence is only a product-path presence cross-check
  after `assetdb.sqlite` has already produced bounded product rows

Not admitted:

```text
List all products in the Asset Catalog and resolve their source files.
```

Reason:

- broad Asset Catalog inventory and source resolution remain unadmitted
- product-to-source mapping from the catalog alone remains unadmitted
- catalog evidence is bounded to the explicit source asset request

Not admitted:

```text
Change the source asset based on the dependency readback.
```

Reason:

- `asset.source.inspect` is read-only
- source/product asset mutation is outside the Phase 9 readback corridor

## Required Response Shape

For safe requests, Codex should report:

- source path inspected
- whether source exists and is a file
- source hash when available
- product evidence availability, source, and count
- dependency evidence availability, source, and count
- Asset Catalog evidence availability, source, and product-path presence rows
  when product rows were available
- unavailable evidence, if any
- explicit no-mutation boundary

For refused or not-admitted requests, Codex should name the closest admitted
safe alternative:

```text
I can inspect one explicit source asset, read any existing product/dependency
evidence from the project-local Asset Processor database, and cross-check
already-proven product paths against the project-local Asset Catalog read-only.
I cannot run Asset Processor, resolve the whole catalog, infer source mappings
from the catalog alone, or mutate cache/source/product files.
```

## Final Boundary

The admitted operator surface is exact read-only evidence readback through
`asset.source.inspect`.

This guide does not admit product generation, broad catalog resolve, dependency
repair, catalog-only source/product mapping, cache edits, source edits, or
product edits.
