# Phase 9 Asset Catalog Path Presence Proof

## Purpose

This packet adds proof-only Asset Catalog product-path presence evidence to the
existing `asset.source.inspect` read-only corridor.

It does not add broad Asset Catalog resolve, source-to-product mapping from the
catalog, dependency graph readback from the catalog, Asset Processor execution,
cache mutation, or product/source mutation.

## Admitted Proof Boundary

When `asset.source.inspect` already proves product rows through project-local
`Cache/assetdb.sqlite`, the adapter may perform a read-only cross-check against:

```text
Cache/<platform>/assetcatalog.xml
```

The catalog query is derived only from the already-proven Asset Processor
database product path. For example:

```text
pc/levels/bridgelevel01/bridgelevel01.spawnable
```

becomes a read-only catalog presence query for:

```text
Cache/pc/assetcatalog.xml
levels/bridgelevel01/bridgelevel01.spawnable
```

## Evidence Fields

The proof adds additive execution-detail fields such as:

- `asset_catalog_evidence_requested`
- `asset_catalog_evidence_available`
- `asset_catalog_evidence_source`
- `asset_catalog_unavailable_reason`
- `asset_catalog_product_path_presence`
- `asset_catalog_product_path_count`
- `asset_catalog_path`
- `asset_catalog_size_bytes`
- `asset_catalog_sha256`
- `asset_catalog_last_write_time`
- `asset_catalog_read_mode`
- `asset_catalog_format_observed`
- `asset_catalog_parser_limit`

The evidence source for successful checks is:

```text
assetcatalog.xml-read-only
```

The read mode is:

```text
read-only
```

The observed format remains:

```text
binary-or-serialized
```

## Validation

Implemented validation uses a tiny binary test fixture with an embedded product
path string and verifies:

- product rows still come from `assetdb.sqlite`
- catalog presence is requested only after product rows exist
- catalog evidence stays additive
- persisted execution details and artifact metadata still match published
  schemas
- broad catalog resolve remains unadmitted

Targeted validation:

```text
PYTHONPATH=backend python -m pytest backend/tests/test_dispatcher.py -k "asset_source_inspect"
```

Result:

```text
5 passed, 151 deselected
```

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

The next safe Phase 9 packet is an operator example/checkpoint update for this
catalog cross-check evidence, or a separate schema-only packet if these additive
fields should become first-class schema properties rather than
`additionalProperties` evidence.
