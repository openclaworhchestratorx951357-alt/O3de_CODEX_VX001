# Phase 9 Project-General Asset Source Inspect Proof

## Purpose

This packet integrates the project-general asset readback discovery helper into
the proof-only `asset.source.inspect` execution path.

It keeps the path read-only and uses dynamic `project_root` plus `source_path`
or `source_asset_path` inputs instead of treating `McpSandbox`,
`BridgeLevel01`, or `pc` as production assumptions.

## Implemented Proof Path

`asset.source.inspect` now:

1. Uses `discover_project_asset_readback_inputs`.
2. Verifies `project_root`.
3. Verifies `project.json`.
4. Verifies `Cache`.
5. Verifies `Cache/assetdb.sqlite`.
6. Detects the selected platform cache.
7. Verifies the selected platform `assetcatalog.xml`.
8. Normalizes the requested source asset path.
9. Opens `assetdb.sqlite` read-only with SQLite URI `mode=ro`.
10. Queries source, product, and dependency rows for the normalized source.
11. Cross-checks product-path presence in `assetcatalog.xml`.
12. Returns structured readiness and proof metadata.

## Structured Proof Summary

The execution details and artifact metadata now include:

- `project_root`
- `project_json_path`
- `project_name`
- `cache_path`
- `database_path`
- `asset_database_path`
- `asset_database_read_mode`
- `available_platforms`
- `selected_platform`
- `catalog_path`
- `original_source_path`
- `normalized_source_path`
- `read_only`
- `mutation_occurred`
- `readiness_status`
- `proof_status`
- `source_id`
- `source_guid`
- `product_path`
- `product_id`
- `product_sub_id`
- `product_rows`
- `dependency_rows`
- `catalog_presence`

The existing string-array `products` and `dependencies` evidence remains for
compatibility. A later schema-hardening packet should decide whether the new
structured rows become the preferred public contract.

The request args schema also accepts `source_asset_path` as a project-general
alias for the existing `source_path` field.

The structured fields are now covered by the published persisted payload
schemas. See `docs/PHASE-9-ASSET-SOURCE-INSPECT-SCHEMA-HARDENING.md`.

## Proof Target

The current bounded proof target still works:

```text
Project root:
C:\Users\topgu\O3DE\Projects\McpSandbox

Source asset:
Levels/BridgeLevel01/BridgeLevel01.prefab

Expected product:
pc/levels/bridgelevel01/bridgelevel01.spawnable
```

The test fixtures prove both POSIX-style and Windows-style relative source
paths:

```text
Levels/BridgeLevel01/BridgeLevel01.prefab
Levels\BridgeLevel01\BridgeLevel01.prefab
```

Local live dispatch against the `McpSandbox` proof target returned:

```text
readiness_status: ready_for_asset_source_inspect
proof_status: asset_source_inspect_proven
normalized_source_path: Levels/BridgeLevel01/BridgeLevel01.prefab
product_path: pc/levels/bridgelevel01/bridgelevel01.spawnable
dependency_count: 5
catalog_presence: true
read_only: true
mutation_occurred: false
```

## Readiness and Blocked States

The path now reports explicit readiness or proof states instead of silently
falling back to simulated evidence for project-general discovery failures:

- `project_root_missing`
- `project_json_missing`
- `asset_cache_missing`
- `asset_database_missing`
- `platform_cache_missing`
- `asset_catalog_missing`
- `source_not_found`
- `product_not_found`
- `schema_mismatch`
- `unsafe_source_path`
- `ready_for_asset_source_inspect`
- `asset_source_inspect_proven`

These states do not run Asset Processor, repair caches, mutate source assets,
or write product files.

## Safety Boundary

This packet does not admit:

- asset generation
- asset import or staging
- Asset Processor execution
- `AssetProcessorBatch` execution
- source asset mutation
- product asset mutation
- cache/database/catalog mutation
- generated asset assignment
- public asset write corridors

The reader remains proof-only and read-only.

## AI Asset Forge Relevance

O3DE AI Asset Forge needs this proof path before generated assets can be
validated in arbitrary selected projects.

Generated assets must eventually enter the same path as ordinary O3DE source
assets:

```text
project_root + source_path
-> project/cache/catalog discovery
-> assetdb.sqlite source/product/dependency readback
-> assetcatalog.xml product-path presence
-> operator review
```

## Still Pending

- live proof artifact command, if a future packet chooses to add one
- public readback admission decision beyond the current proof-only corridor
- AI Asset Forge model substrate audit

## Validation

Validation run in this packet:

```text
PYTHONPATH=backend python -m pytest backend/tests/test_dispatcher.py -k "asset_source_inspect" -q
PYTHONPATH=backend python -m pytest backend/tests/test_prompt_control.py -k "asset_source_inspect or phase_9_asset_mutation" -q
PYTHONPATH=backend python -m pytest backend/tests/test_asset_readback_discovery.py -q
PYTHONPATH=backend python -m pytest backend/tests -q
PYTHONPATH=backend python -m ruff check backend/app/services/adapters.py backend/app/services/asset_readback_discovery.py backend/tests/test_dispatcher.py backend/tests/test_prompt_control.py --no-cache
git diff --check
git diff --cached --check
docs link/path check
```

Results:

- targeted dispatcher tests passed
- targeted prompt/refusal tests passed
- discovery tests passed
- full backend tests passed
- ruff passed
- diff checks passed
- docs link/path check passed
