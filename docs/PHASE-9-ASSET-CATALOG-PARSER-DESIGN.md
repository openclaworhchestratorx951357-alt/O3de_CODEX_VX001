# Phase 9 Asset Catalog Parser Design

## Purpose

This design packet defines the safe parser boundary for future read-only Asset
Catalog evidence in Phase 9.

No runtime behavior, schema files, adapters, prompts, dependencies, O3DE project
files, cache files, or product assets are changed by this packet.

## Starting Evidence

The preceding discovery packet found this project-local catalog:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\pc\assetcatalog.xml
```

Observed catalog metadata:

- size: `5925410` bytes
- last write time: `2026-04-26 22:08:26`
- SHA-256:
  `CED0872CD9FC14AC93FB6041D115677F1AFCE7C38F7E4CC2055E77B1968CCBFA`

The file has an `.xml` extension, but read-only inspection showed it behaves
like a binary or serialized catalog with embedded product path strings. It must
not be treated as plain XML.

Bounded byte-level inspection found the known Phase 9 product path:

```text
levels/bridgelevel01/bridgelevel01.spawnable
```

The catalog did not prove source-to-product mapping, product-to-source mapping,
dependency records, freshness, or broad catalog completeness.

## Design Decision

Do not implement a broad Asset Catalog reader or public resolve surface yet.

A future parser may only enter as proof-only readback, and it must use one of
these approaches:

1. an official or stable O3DE Asset Catalog API, library, or documented format
   reader that can inspect the catalog without runtime mutation; or
2. a deliberately bounded binary string-index scanner that is labeled as a
   proof-only candidate and does not claim complete catalog semantics.

The first implementation candidate should be product-path presence readback,
not source-to-product mapping, dependency graph readback, or broad
`asset.product.resolve`.

## Parser Modes

### `catalog_path_presence`

Input:

- explicit product path
- project root
- platform cache directory, such as `Cache/pc`

Output:

- whether the explicit product path appears in the catalog
- bounded match count
- catalog metadata used for evidence
- unavailable reason when the catalog is missing, unreadable, outside the
  project cache, or in an unsupported shape

This mode does not prove source identity, dependency identity, product
freshness, or graph completeness.

### `catalog_product_inventory_sample`

Input:

- project root
- platform cache directory
- explicit sample limit

Output:

- bounded sample of product-like catalog paths
- candidate path count when available
- parser limit
- catalog metadata used for evidence

This mode is discovery-only until a later admission packet defines exact
operator value and refusal boundaries.

## Evidence Model

A future parser should report evidence with fields equivalent to:

- `catalog_path`
- `catalog_size_bytes`
- `catalog_sha256`
- `catalog_last_write_time`
- `catalog_read_mode`
- `catalog_format_observed`
- `product_path_query`
- `product_path_present`
- `product_path_match_count`
- `candidate_path_count`
- `parser_limit`
- `unavailable_reason`

Recommended values:

- `catalog_read_mode`: `read-only`
- `catalog_format_observed`: `binary-or-serialized`

The parser should avoid raw cache dumps. If byte offsets are useful for
debugging, keep them bounded and internal unless a later schema packet admits
them.

## Future Code Touchpoints

If a later implementation packet is approved, likely touchpoints are:

- `backend/app/services/adapters.py`
- `schemas/tools/asset.source.inspect.execution-details.schema.json`, only if
  optional structured fields are needed
- `backend/tests/test_dispatcher.py`
- `backend/tests/test_prompt_control.py`
- relevant Phase 9 docs

The existing execution-details schema allows additional properties, so a first
proof-only implementation may not need a schema file change.

## Safety Rules

A future parser must:

- open the catalog read-only
- require the catalog path to stay under `project_root/Cache`
- avoid Asset Processor or `AssetProcessorBatch` execution
- avoid cache, source asset, product asset, or project mutation
- keep raw catalog files and runtime proof artifacts uncommitted
- keep public capability admission separate from proof-only evidence

## Validation Plan

A future implementation packet should include:

- unit coverage with a tiny binary fixture containing known product path strings
- missing catalog coverage
- unsupported or unreadable catalog coverage
- path containment coverage for `project_root/Cache`
- bounded sample-limit coverage
- existing prompt refusal coverage for broad catalog resolve and
  `asset.product.resolve`

Live proof against `McpSandbox` may be used as additional evidence, but any raw
runtime proof output must stay ignored unless a checkpoint policy explicitly
admits it.

## Not Admitted

This design does not admit:

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

The next safe Phase 9 packet is a proof-only product-path presence
implementation behind the existing narrow `asset.source.inspect` corridor, or a
schema-only catalog evidence shape packet if structured fields should be
admitted before runtime code.

The implementation packet is medium risk because it touches backend behavior,
even though the intended readback is read-only.
