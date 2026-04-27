# Phase 9 Asset Readback Schema Review

## Purpose

This design/audit packet reviews whether the current
`asset.source.inspect` product/dependency readback evidence shape should remain
string-array based or move to structured schema fields.

No runtime behavior, schema file, adapter behavior, prompt behavior, or
dependency version is changed by this review.

## Current Schema Shape

`schemas/tools/asset.source.inspect.execution-details.schema.json` currently
allows:

- `products`: array of non-empty strings
- `dependencies`: array of non-empty strings
- `product_count`: integer
- `dependency_count`: integer
- `product_evidence_requested`: boolean
- `product_evidence_available`: boolean
- `product_evidence_source`: string
- `dependency_evidence_requested`: boolean
- `dependency_evidence_available`: boolean
- `dependency_evidence_source`: string
- `additionalProperties: true`

`asset.source.inspect.artifact-metadata.schema.json` reuses the execution
details schema through `allOf`.

The argument schema already admits:

- `source_path`
- `include_products`
- `include_dependencies`

## Current Runtime Shape

The current read-only Asset Processor database reader returns bounded string
entries such as:

```text
pc/levels/bridgelevel01/bridgelevel01.spawnable (product_id=10608, sub_id=-575275456, platform=pc, job_key=Prefabs, job_status=4, hash=-7827569063961660435, last_log_time=1776972479705, source_guid=439941DB330C530FAD3E5A36C19A1519)
```

and:

```text
product_dependency (product_id=10608, platform=pc, dependency_source_guid=215E47FDD1815832B1AB91673ABF6399, dependency_sub_id=1000, flags=1, from_asset_id=1, unresolved_path=, unresolved_type=0)
```

This shape is human-readable, bounded, and already covered by dispatcher and
prompt-control tests.

## Decision

Keep the current string-array evidence shape for the admitted read-only Phase 9
corridor.

Reasons:

- it preserves the existing published schema
- it avoids a premature compatibility break for artifact consumers
- it is sufficient for operator-facing readback summaries
- it keeps the corridor narrow and read-only
- it avoids implying complete product/dependency graph semantics

## Structured Schema Candidate

A future schema packet may add optional structured fields without removing the
current string arrays.

Candidate additive fields:

- `product_records`
- `dependency_records`
- `assetdb_source_record`
- `assetdb_readback_limit`
- `assetdb_read_mode`
- `assetdb_path_source_of_truth`

Candidate `product_records` fields:

- `product_name`
- `product_id`
- `sub_id`
- `platform`
- `job_key`
- `job_status`
- `hash`
- `last_log_time`
- `source_guid`

Candidate `dependency_records` fields:

- `product_id`
- `platform`
- `dependency_source_guid`
- `dependency_sub_id`
- `flags`
- `from_asset_id`
- `unresolved_path`
- `unresolved_type`

## Gates Before Structured Fields

A future structured schema implementation should first answer:

1. Which consumers need machine-readable product/dependency fields?
2. Should values preserve SQLite numeric types exactly, or normalize to strings
   for cross-platform JSON stability?
3. Should `SourceDependency` rows be included separately from
   `ProductDependencies`?
4. Should `ScanFolders` and freshness evidence become first-class records?
5. How should WAL/SHM freshness or missing companion files be represented?

## Still Not Admitted

This review does not admit:

- broad asset graph completeness
- `asset.product.resolve`
- Asset Processor or `AssetProcessorBatch` execution
- cache mutation
- source/product asset mutation
- dependency repair
- product generation

## Next Safe Packet

The next safe packet is either:

- a no-runtime structured-schema design packet that answers the gates above, or
- a separate Phase 9 discovery packet for another read-only evidence substrate,
  such as Asset Catalog evidence, if the operator wants broader readback
  discovery.
