# Phase 9 Asset Source Inspect Schema Hardening

## Purpose

This packet hardens the published `asset.source.inspect` persisted payload
schemas for the structured project-general proof fields added by the
project-general source inspect proof.

The packet is schema, test, and documentation work only. It does not widen
runtime behavior, admit asset mutation, execute Asset Processor, run
`AssetProcessorBatch`, import generated assets, or create a public asset write
corridor.

## Hardened Schema Fields

The published execution-details schema now recognizes the structured proof
fields emitted by `asset.source.inspect`, including:

- project discovery fields such as `project_root`, `project_json_path`,
  `cache_path`, `database_path`, `asset_database_path`,
  `available_platforms`, `selected_platform`, and `catalog_path`
- source normalization fields such as `original_source_path` and
  `normalized_source_path`
- proof boundary fields such as `read_only`, `mutation_occurred`,
  `readiness_status`, `proof_status`, and `blocked_reason`
- source mapping fields such as `source_id` and `source_guid`
- structured product fields such as `product_path`, `product_id`,
  `product_sub_id`, and `product_rows`
- structured Asset Catalog fields such as `catalog_presence`,
  `asset_catalog_product_path_presence`, and catalog read metadata
- structured dependency fields such as `dependency_rows`

The artifact-metadata schema inherits those fields through the existing
`allOf` reference to the execution-details schema.

## Compatibility Rule

The legacy string-array evidence remains part of the contract:

- `products`
- `dependencies`
- `product_count`
- `dependency_count`
- product/dependency evidence availability fields

Structured rows are additive. Existing artifact consumers can continue reading
the string evidence while future consumers use the typed rows for review,
schema checks, and O3DE AI Asset Forge validation.

## Readiness and Proof States

The schema now names the proof/readiness states used by the project-general
adapter path:

- `project_root_missing`
- `project_json_missing`
- `asset_cache_missing`
- `asset_database_missing`
- `platform_cache_missing`
- `asset_catalog_missing`
- `source_asset_path_missing`
- `source_asset_path_escapes_project`
- `source_asset_not_checked_yet`
- `source_not_found`
- `product_not_found`
- `schema_mismatch`
- `unsafe_source_path`
- `ready_for_asset_source_inspect`
- `asset_source_inspect_proven`

These states are reporting states only. They do not authorize repair,
processing, cache mutation, asset mutation, or public admission.

## Validator Boundary

The schema stays within the repository's supported subset-json-schema
validator:

- `type`
- `properties`
- `additionalProperties`
- `items`
- `enum`
- `const`
- `minimum`
- `minLength`
- `allOf`
- `$ref`

The packet does not introduce unsupported keywords such as `anyOf`, `oneOf`,
`pattern`, or `format`.

## Still Not Admitted

This schema hardening does not admit:

- complete asset graph resolution
- `asset.product.resolve`
- Asset Processor execution
- `AssetProcessorBatch` execution
- cache mutation or repair
- source or product asset mutation
- generated asset import or staging
- generated asset assignment or placement
- public asset write corridors

## Validation

Validation run in this packet:

```text
PYTHONPATH=backend python -m pytest backend/tests/test_db.py -k "asset_source_inspect or subset_capabilities" -q
PYTHONPATH=backend python -m pytest backend/tests/test_api_routes.py::test_ready_reports_database_status_details -q
PYTHONPATH=backend python -m pytest backend/tests/test_dispatcher.py -k "asset_source_inspect" -q
PYTHONPATH=backend python -m pytest backend/tests -q
PYTHONPATH=backend python -m ruff check backend/tests/test_db.py --no-cache
PYTHONPATH=backend python scripts/check_surface_matrix.py
git diff --check
git diff --cached --check
docs link/path check
```

Results:

- targeted schema tests passed
- readiness endpoint schema profile test passed
- targeted asset source inspect dispatcher tests passed
- full backend tests passed
- ruff passed
- surface matrix check passed
- diff checks passed
- docs link/path check passed

## Next Normalized Packet

The next Phase 9 packet should be a public readback admission decision.

Recommended packet:

```text
Branch:
codex/phase-9-asset-readback-admission-decision

PR title:
Decide Phase 9 asset readback public admission
```

Purpose:

Decide whether the current project-general, read-only
`asset.source.inspect` source/product/dependency/catalog corridor is ready to
be described as a public admitted readback corridor, or whether additional
schema, freshness, platform, or operator UX work is required first.
