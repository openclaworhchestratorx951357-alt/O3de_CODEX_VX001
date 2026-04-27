# Phase 9 and AI Asset Forge Integration

## Current Phase 9 status

Current Phase 9 state:

- project-general asset readback discovery helper exists
- `McpSandbox` proof target still works
- project-general discovery is integrated into the proof-only
  `asset.source.inspect` path
- structured proof schema hardening exists
- public production-general admission pending

The helper is recorded in
`docs/PHASE-9-PROJECT-ASSET-READBACK-DISCOVERY.md` and implemented in
`backend/app/services/asset_readback_discovery.py`. It discovers project root,
`project.json`, `Cache`, `assetdb.sqlite`, available platform cache folders,
platform `assetcatalog.xml`, and source-asset readiness without mutating the
project.

The proof-only adapter integration is recorded in
`docs/PHASE-9-PROJECT-GENERAL-ASSET-SOURCE-INSPECT-PROOF.md`. It carries
project-general discovery metadata through `asset.source.inspect`, opens
`assetdb.sqlite` read-only, queries source/product/dependency evidence, and
cross-checks Asset Catalog product-path presence.

The structured proof schema hardening is recorded in
`docs/PHASE-9-ASSET-SOURCE-INSPECT-SCHEMA-HARDENING.md`.

## Why AI Asset Forge depends on Phase 9

Generated assets must be validated through the same source/product/dependency
and catalog readback path.

AI Asset Forge should not treat a generated GLB, OBJ, FBX, material, or texture
as O3DE-ready until O3DE has processed the source asset and Phase 9 can prove:

- the source asset is inside the selected project
- Asset Processor produced product rows
- product dependency rows are available when expected
- the selected platform catalog contains the product path
- the review packet can report provenance and readiness honestly
- no mutation occurred outside an admitted corridor

## Completed Phase 9 packet

This packet is now implemented:

```text
Branch:
codex/phase-9-project-general-asset-source-inspect-proof

PR title:
Prove project-general asset source inspect
```

Purpose:

Integrate project-general discovery into `asset.source.inspect` proof path,
still read-only.

The proof uses dynamic project-root and source-asset inputs rather than
hardcoded `McpSandbox` or `BridgeLevel01` assumptions. It proves fail-closed
readiness behavior for missing project root, `project.json`, `Cache`,
`assetdb.sqlite`, platform catalog, unsafe source path, missing source, and
missing product evidence.

## Completed Phase 9 schema packet

This packet is now implemented:

```text
Branch:
codex/phase-9-asset-source-inspect-schema-hardening

PR title:
Harden asset source inspect proof schema
```

Purpose:

Promote the newly returned structured source/product/dependency/catalog proof
fields into the published `asset.source.inspect` execution-details and
artifact-metadata schemas, while preserving compatibility with existing string
evidence.

## Required next Phase 9 packet

Next packet:

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

## Required later Forge packet

After Phase 9 proof path is stable:

```text
Branch:
codex/ai-asset-forge-local-model-substrate-audit

PR title:
Audit local AI 3D model substrate options
```

Purpose:

Choose the first private/local 3D generation backend for a proof-only asset
generation pipeline.

That audit must review candidate licenses, hardware needs, offline/local
operation, output formats, dependency footprint, storage isolation, and whether
the first proof can produce a raw asset outside O3DE without committing model
weights or generated files.

## Final rule

Do not build AI Asset Forge by bypassing O3DE.

Generated assets must flow through O3DE source assets, Asset Processor, Asset
Database, Asset Catalog, and operator review.
