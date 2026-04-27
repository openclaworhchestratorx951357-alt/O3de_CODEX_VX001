# Phase 9 Asset Readback Readiness Review Contract

## Purpose

This contract defines the operator-facing readiness and review packet required
before Phase 9 asset readback can be described as production-general.

It is documentation only. It does not change runtime behavior, admit asset
mutation, execute Asset Processor, run `AssetProcessorBatch`, import generated
assets, or create a public asset write corridor.

## Scope

The current `asset.source.inspect` path is a narrow public read-only corridor
with project-general proof-only discovery and structured schema coverage.

The readiness review packet must make that evidence understandable to an
operator before any future production-general admission decision. It must
explain what project, platform, source, product, dependency, catalog, and
freshness facts were proven, what remains unknown, and the safest next step.

## Required Inputs

A Phase 9 readiness review packet must identify:

- `project_root`
- `project_json_path`
- `project_name`, when available
- `cache_path`
- `asset_database_path`
- `available_platforms`
- `selected_platform`
- `asset_catalog_path`
- `original_source_path`
- `normalized_source_path`
- `read_only: true`
- `mutation_occurred: false`

The selected platform must be explicit. `pc` may appear in the current
`McpSandbox` proof, but it is not a universal production assumption.

## Required Evidence Fields

A review packet should carry the structured evidence already produced by the
proof path when available:

- `source_id`
- `source_guid`
- `product_path`
- `product_id`
- `product_sub_id`
- `product_rows`
- `product_count`
- `dependency_rows`
- `dependency_count`
- `catalog_presence`
- `asset_catalog_product_path_presence`
- `asset_database_read_mode`
- `readiness_status`
- `proof_status`
- `blocked_reason`, when blocked

String-array compatibility evidence may remain present:

- `products`
- `dependencies`

Structured rows are preferred for future operator review and O3DE AI Asset
Forge validation, while compatibility arrays remain useful for older artifact
consumers.

## Freshness Contract

Phase 9 must not silently imply that Asset Processor output is current.

Until a later implementation packet proves stronger freshness checks, the
readiness review packet must report freshness explicitly with conservative
states:

- `fresh_enough_for_readback`
- `stale_or_unverified`
- `unknown`
- `missing`

At minimum, the packet should distinguish:

- `asset_database_freshness_status`
- `asset_catalog_freshness_status`
- `freshness_checked_at`, if a check occurred
- source/product/catalog timestamp or hash evidence, if available
- `asset_processor_rerun_required`, when the safest next step is for the
  operator to refresh assets outside Codex automation

The review packet must not run Asset Processor, repair cache files, or update
catalogs to establish freshness. If freshness cannot be proven read-only, it
must say so.

## Readiness And Proof States

The review packet must preserve the existing fail-closed states:

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
- `dependency_rows_missing`
- `schema_mismatch`
- `unsafe_source_path`
- `ready_for_asset_source_inspect`
- `asset_source_inspect_proven`

These are reporting states only. They do not authorize mutation, import,
processing, repair, broad scans, or public write admission.

## Review Packet Shape

A complete operator-facing review packet should use a stable top-level shape:

```json
{
  "capability": "asset.source.inspect",
  "readiness_status": "asset_source_inspect_proven",
  "proof_status": "asset_source_inspect_proven",
  "read_only": true,
  "mutation_occurred": false,
  "selected_project": {
    "project_root": "...",
    "project_json_path": "...",
    "project_name": "..."
  },
  "selected_platform": {
    "platform": "pc",
    "cache_path": "...",
    "asset_catalog_path": "...",
    "asset_catalog_freshness_status": "unknown"
  },
  "asset_database": {
    "path": "...",
    "read_mode": "uri_mode_ro",
    "freshness_status": "unknown"
  },
  "source": {
    "original_source_path": "...",
    "normalized_source_path": "...",
    "source_id": 0,
    "source_guid": "..."
  },
  "products": [],
  "dependencies": [],
  "catalog": {
    "catalog_presence": true,
    "asset_catalog_product_path_presence": true
  },
  "warnings": [],
  "blocked_reason": null,
  "safest_next_step": "operator_review",
  "operator_approval_state": "not_requested"
}
```

The exact runtime shape may evolve in a later implementation packet, but those
semantic fields must remain visible in any production-general review surface.

## Missing-Substrate Guidance

When readback is not ready, the review packet must tell the operator what was
missing and what the safest next action is:

- missing `project_root`: select or register an O3DE project
- missing `project.json`: choose a valid O3DE project root
- missing `Cache`: run or refresh the O3DE asset pipeline outside this
  read-only corridor
- missing `assetdb.sqlite`: run Asset Processor or provide a project with
  processed assets
- missing platform cache: choose an available platform or process assets for
  the requested platform
- missing `assetcatalog.xml`: refresh/generate catalog outside this read-only
  corridor
- missing source: choose a project-relative source asset that exists in the
  selected project
- missing product/dependency rows: treat the source as not validated for use
  until Asset Processor evidence exists
- schema mismatch: stop and harden the schema/query before claiming support

The packet must avoid "fixed automatically" language unless a future admitted
repair corridor exists.

## AI Asset Forge Handoff

O3DE AI Asset Forge may not treat a generated asset as usable until Phase 9 can
produce a review packet that includes the generated asset handoff fields:

- `generated_asset_id` or `asset_slug`
- generation backend
- model name and version
- prompt
- input image or reference, if used
- seed and settings, if available
- license and commercial-use status
- generation timestamp
- raw and normalized file hashes
- source asset path
- product asset path
- dependency rows
- catalog presence
- warnings
- operator approval state

Those fields are future provenance/review requirements. This packet does not
implement generation, provenance storage, import, assignment, or placement.

## Not Admitted

This contract does not admit:

- production-general public asset readback
- complete asset graph resolution
- `asset.product.resolve`
- broad Asset Catalog queries
- Asset Processor execution
- `AssetProcessorBatch` execution
- cache repair or mutation
- source or product asset mutation
- generated asset import or staging
- generated asset assignment or placement
- public asset write corridors

## Revisit Gate

Production-general public admission may be reconsidered only after a future
implementation packet can produce the readiness review packet from live
`asset.source.inspect` execution and tests prove the blocked/readiness states,
freshness labels, platform selection, mutation flags, and operator guidance.

Recommended future packet:

```text
Branch:
codex/phase-9-asset-readback-review-packet-implementation

PR title:
Implement Phase 9 asset readback review packet
```

Purpose:

Carry this contract into the runtime/operator-facing review output without
widening mutation or asset-processing capability.

After that review packet exists, the first O3DE AI Asset Forge packet remains:

```text
Branch:
codex/ai-asset-forge-local-model-substrate-audit

PR title:
Audit local AI 3D model substrate options
```
