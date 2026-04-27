# Phase 9 Asset Readback Design

Status: normalized phase design packet

Date: 2026-04-27

## Current Main SHA

This design packet was prepared from:

```text
dcb2bc4a7b7dfd5aef1d072922ea309fe322dc2d
```

## Phase Workflow Stage

Design packet.

This packet designs a future read-only product/dependency evidence extension
for `asset.source.inspect`. It does not implement runtime behavior, change
schemas, run Asset Processor, mutate assets, or admit a new public surface.

## Exact Scope

Future implementation may extend only this existing surface:

```text
asset.source.inspect
```

The target is product/dependency evidence for exactly one explicit
project-local source asset path already accepted by the current args schema:

```json
{
  "source_path": "Assets/Textures/example.png",
  "include_products": true,
  "include_dependencies": true
}
```

The future path may move `product_evidence_available` or
`dependency_evidence_available` from `false` to `true` only when a later
readiness audit identifies an exact read-only evidence substrate and tests prove
the evidence is truthful.

## Exact Non-Goals

This design does not allow:

- Asset Processor or `AssetProcessorBatch` execution
- Asset Processor job/platform telemetry admission
- asset reprocess execution
- asset move, rename, delete, or rewrite mutation
- reference repair
- prefab mutation or prefab graph admission
- product cache mutation
- arbitrary asset database probing
- global cache probing without an explicit admitted root
- material, render, shader, build, TIAF, or Editor Python expansion
- product/dependency completeness claims when evidence is partial or stale

## Current Contract To Preserve

Current `asset.source.inspect` already emits:

- `source_path_input`
- `source_path_resolved`
- `source_path_relative_to_project_root`
- `source_path_within_project_root`
- `source_read_mode: read-only`
- `source_exists`
- `source_is_file`
- `source_resolution_status`
- `source_size_bytes`
- `source_sha256`
- `include_flags`
- `products`
- `product_count`
- `product_evidence_requested`
- `product_evidence_available`
- `product_evidence_source`
- `product_unavailable_reason`
- `dependencies`
- `dependency_count`
- `dependency_evidence_requested`
- `dependency_evidence_available`
- `dependency_evidence_source`
- `dependency_unavailable_reason`

The current schemas allow these fields in:

- `schemas/tools/asset.source.inspect.execution-details.schema.json`
- `schemas/tools/asset.source.inspect.artifact-metadata.schema.json`
- `schemas/tools/asset.source.inspect.args.schema.json`
- `schemas/tools/asset.source.inspect.result.schema.json`

The first implementation should prefer the existing string-array fields unless
the readiness audit proves structured product/dependency objects are required.
If structured objects are required, that must be a separate schema-change
packet.

## Required Preflight

A future implementation must pass these preflight checks before returning any
available product/dependency evidence:

1. `source_path` is present, non-empty, and resolves inside `project_root`.
2. The resolved source exists and is a file.
3. `include_products` or `include_dependencies` is true.
4. The product/dependency evidence substrate is explicitly admitted by a
   readiness audit.
5. The substrate path is read-only for this operation.
6. The substrate path is inside an admitted root such as project root, an
   explicitly configured cache root, or another audited read-only root.
7. The substrate can map evidence back to the exact project-relative source
   path without broad scene, prefab, or reference graph inference.
8. Evidence freshness is known or reported as unknown/stale.
9. Counts and returned entries stay bounded.
10. Missing, stale, unsupported, or unreadable evidence keeps availability false
    with an explicit reason.

## Evidence Model

When product evidence is available, future `execution_details` and
`artifact_metadata` should include:

- `product_evidence_requested: true`
- `product_evidence_available: true`
- `product_evidence_source`
- `product_count`
- `products`
- substrate provenance fields, for example:
  - `product_index_path`
  - `product_index_source_of_truth`
  - `product_index_freshness`
  - `product_index_read_mode: read-only`

When dependency evidence is available, future output should include:

- `dependency_evidence_requested: true`
- `dependency_evidence_available: true`
- `dependency_evidence_source`
- `dependency_count`
- `dependencies`
- substrate provenance fields, for example:
  - `dependency_index_path`
  - `dependency_index_source_of_truth`
  - `dependency_index_freshness`
  - `dependency_index_read_mode: read-only`

If evidence is unavailable, the current behavior remains valid:

- keep `products: []` and `product_count: 0`
- keep `dependencies: []` and `dependency_count: 0`
- set availability false
- set source to a precise unavailable class
- set unavailable reason in operator-readable language

Suggested unavailable classes for a future implementation:

- `unavailable-missing-source`
- `unavailable-no-admitted-product-index`
- `unavailable-no-admitted-dependency-index`
- `unavailable-index-missing`
- `unavailable-index-unreadable`
- `unavailable-index-stale`
- `unavailable-source-not-indexed`
- `unavailable-unsupported-index-shape`

## Failure Behavior

The future implementation should fail closed:

- Outside-project source paths fall back or refuse as they do today.
- Missing source files do not produce product/dependency claims.
- Missing indexes keep product/dependency availability false.
- Unreadable indexes keep product/dependency availability false.
- Stale or freshness-unknown indexes must not be reported as complete.
- Unsupported index shapes must not be guessed.
- Product/dependency evidence should never trigger asset processing.
- Product/dependency evidence should never mutate cache, source files, prefabs,
  or references.

## Restore And Rollback Expectations

No restore or rollback behavior is needed for this read-only design.

The future implementation must keep:

- `approval_class: read_only`
- no backup requirement
- no rollback requirement
- no asset cleanup claim
- no product cache mutation claim
- no generalized undo claim

## Required Tests For A Future Implementation

A future code packet must add or update targeted tests for:

- successful source-file readback still works without product/dependency
  evidence
- requested product evidence unavailable because no index is admitted
- requested dependency evidence unavailable because no index is admitted
- missing source keeps product/dependency evidence unavailable
- outside-project source path remains rejected or simulated-fallback bounded
- admitted index path returns bounded product evidence
- admitted index path returns bounded dependency evidence
- unreadable/stale/unsupported index reports explicit unavailable reason
- prompt final summary distinguishes source readback from product/dependency
  completeness
- dispatcher persisted payloads pass execution-details and artifact-metadata
  schema validation

If schema fields change, the packet must also update:

- `schemas/tools/asset.source.inspect.execution-details.schema.json`
- `schemas/tools/asset.source.inspect.artifact-metadata.schema.json`
- relevant dispatcher schema drift tests

## Operator Review Requirements

Operator-facing summaries should say:

- which source asset was read
- whether product evidence was requested
- whether product evidence was available
- which product evidence source was used, if any
- whether dependency evidence was requested
- whether dependency evidence was available
- which dependency evidence source was used, if any
- whether evidence freshness is known
- that no asset processing, move, reference repair, prefab mutation, or product
  cache mutation occurred

## Approval Class

The future path must remain:

```text
read_only
```

No new approval gate is needed unless a later packet proposes execution or
mutation. That would be a separate high-risk packet.

## Future Artifact Names

Keep existing artifact kind unless schema/readback structure changes:

```text
asset_inspection_result
```

If a later proof-only packet records a local proof summary, use an ignored
runtime artifact name like:

```text
backend/runtime/live_asset_source_product_dependency_readback_proof_<timestamp>.json
```

Do not commit ignored runtime proof JSON.

## Required Readiness Audit

The next packet must be a readiness audit before implementation.

It should answer:

- Which exact product/dependency index substrate is being audited?
- Is the substrate official enough for the current Phase 9 standard?
- Where is it located?
- Is the path under an admitted root?
- Is it read-only for this operation?
- How is freshness determined?
- What fields can be persisted without schema ambiguity?
- What tests are required before code changes?
- Which files must not be touched?
- Does implementation remain low/medium risk, or does substrate access make it
  high risk?

## Recommended Next Normalized Packet

Create:

```text
codex/phase-9-asset-readback-readiness-audit
```

Do not implement product/dependency readback until that audit is complete.

## Revert Path

Revert the commit that adds this design document and its index/status pointers.
No runtime behavior, schema, dependency, or asset cleanup should be required.
