# Phase 9 Asset Catalog Path Presence Live Proof

## Purpose

This packet records live read-only proof that the Phase 9 Asset Catalog
product-path presence cross-check works against the local `McpSandbox` project.

No backend behavior, frontend behavior, schemas, dependencies, lockfiles, O3DE
project files, cache files, source assets, or product assets are changed by
this packet.

## Live Target

Project:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox
```

Source:

```text
Levels/BridgeLevel01/BridgeLevel01.prefab
```

Read-only substrates:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\assetdb.sqlite
C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\pc\assetcatalog.xml
```

The live proof invoked the hybrid `asset.source.inspect` adapter directly to
avoid creating dispatcher artifacts. The adapter read the project source file,
the project-local Asset Processor database, and the project-local Asset Catalog
only.

## Result

The live proof confirmed:

- source exists: `true`
- source is file: `true`
- product evidence available: `true`
- product evidence source: `assetdb.sqlite-read-only`
- product count: `1`
- dependency evidence available: `true`
- dependency evidence source: `assetdb.sqlite-read-only`
- dependency count: `5`
- Asset Catalog evidence requested: `true`
- Asset Catalog evidence available: `true`
- Asset Catalog evidence source: `assetcatalog.xml-read-only`
- Asset Catalog product path count: `1`
- unavailable evidence: none

The proven product path was:

```text
pc/levels/bridgelevel01/bridgelevel01.spawnable
```

The catalog cross-check queried:

```text
levels/bridgelevel01/bridgelevel01.spawnable
```

and found:

```text
present=True, match_count=1
```

## Catalog Metadata

Catalog:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\pc\assetcatalog.xml
```

Observed metadata:

- size: `5925410` bytes
- SHA-256:
  `ced0872cd9fc14ac93fb6041d115677f1afce7c38f7e4cc2055e77b1968ccbfa`
- read mode: `read-only`
- observed format: `binary-or-serialized`

## Validation

Commands:

```text
PYTHONPATH=backend python -m pytest backend/tests/test_dispatcher.py -k "asset_source_inspect"
PYTHONPATH=backend python -m pytest backend/tests/test_prompt_control.py -k "asset_source_inspect or asset_product"
ruff check backend/app/services/adapters.py backend/tests/test_dispatcher.py
python -m py_compile backend/app/services/adapters.py backend/tests/test_dispatcher.py
git diff --check
git diff --cached --check
```

Results:

- `5 passed, 151 deselected`
- `3 passed, 92 deselected`
- ruff passed
- py_compile passed
- diff checks passed

## Still Not Admitted

- Asset Catalog public query surface
- broad asset catalog resolve
- `asset.product.resolve`
- source-to-product mapping from catalog alone
- product-to-source mapping from catalog alone
- dependency graph readback from catalog alone
- product freshness claims from catalog alone
- Asset Processor or `AssetProcessorBatch` execution
- cache mutation
- source/product asset mutation

## Next Safe Packet

The next safe Phase 9 packet is an operator examples update that shows the
exact safe prompt for `asset.source.inspect` catalog cross-check evidence and
the refused prompts for broad catalog resolve, catalog-only mapping, and
`asset.product.resolve`.
