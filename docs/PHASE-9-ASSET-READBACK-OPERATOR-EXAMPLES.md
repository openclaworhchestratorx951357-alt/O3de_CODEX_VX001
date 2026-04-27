# Phase 9 Asset Readback Operator Examples

## Purpose

This guide gives operator-facing examples for the exact Phase 9
`asset.source.inspect` read-only product/dependency readback corridor.

Use these examples after the live-proven proof path recorded in
`docs/PHASE-9-ASSET-READBACK-LIVE-PROOF.md`.

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
- reports bounded product/dependency evidence
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
Check whether "Assets/Textures/example.png" has product/dependency evidence.
```

Expected behavior:

- inspects the explicit source path only
- reports source metadata if the file exists
- reports product/dependency evidence only if a matching
  `Cache/assetdb.sqlite` row exists
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
- unavailable evidence, if any
- explicit no-mutation boundary

For refused or not-admitted requests, Codex should name the closest admitted
safe alternative:

```text
I can inspect the source and read any existing product/dependency evidence from
the project-local Asset Processor database, but I cannot run Asset Processor or
mutate cache/source/product files.
```

## Final Boundary

The admitted operator surface is exact read-only evidence readback through
`asset.source.inspect`.

This guide does not admit product generation, broad catalog resolve, dependency
repair, cache edits, source edits, or product edits.
