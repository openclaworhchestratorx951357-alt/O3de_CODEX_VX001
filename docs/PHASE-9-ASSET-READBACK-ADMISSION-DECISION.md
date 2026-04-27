# Phase 9 Asset Readback Admission Decision

## Purpose

This packet decides whether the current project-general
`asset.source.inspect` proof path is ready to be described as a public
production-general readback corridor.

It is a documentation/status decision only. It does not change runtime
behavior, admit asset mutation, execute Asset Processor, run
`AssetProcessorBatch`, import generated assets, or create an asset write
corridor.

## Current Evidence

Phase 9 now has:

- a read-only discovery helper for project root, `project.json`, `Cache`,
  `assetdb.sqlite`, platform cache folders, `assetcatalog.xml`, and source path
  normalization
- proof-only `asset.source.inspect` integration using dynamic `project_root`
  plus `source_path` or `source_asset_path`
- read-only SQLite access using URI `mode=ro`
- bounded source/product/dependency readback from `assetdb.sqlite`
- bounded product-path presence cross-checks in `assetcatalog.xml`
- structured persisted payload schema fields for project/source/product/
  dependency/catalog proof metadata
- tests covering POSIX and Windows-style source paths, readiness blockers,
  read-only database access, catalog presence, schema validation, and unsafe
  asset mutation refusals
- a local live proof against the `McpSandbox` / `BridgeLevel01` target

## Decision

Do not promote Phase 9 asset readback to a production-general public admission
yet.

The existing narrow public read-only corridor remains valid:

```text
asset.source.inspect
```

Current admitted scope:

- one explicit project-local source asset
- read-only project/source identity and metadata
- read-only project-local `Cache/assetdb.sqlite` source/product/dependency
  evidence when present
- read-only selected-platform `assetcatalog.xml` product-path presence
  cross-check when product rows exist
- explicit readiness/proof states when substrates are missing
- no mutation

This is stronger than the old local-only proof, but it is still not a blanket
production-general claim for every O3DE project.

## Why Not Production-General Yet

The remaining blockers are not missing implementation basics. They are
production-readiness contract gaps:

- Asset Processor database freshness is not yet modeled.
- Asset Catalog freshness is not yet modeled.
- Platform cache selection is mostly discovered, but operator-facing platform
  choice/review is not yet designed.
- Missing product/dependency rows are reported, but the operator-facing
  readiness guidance is still minimal.
- Only the local `McpSandbox` proof target has live O3DE substrate proof.
- The corridor does not yet provide an operator review packet suitable for AI
  Asset Forge generated assets.
- No generated asset import, staging, assignment, or placement corridor is
  admitted.

## Allowed Public Wording

Future docs and UI may describe the current state as:

```text
project-general proof-only readback candidate with a narrow admitted read-only
asset.source.inspect surface
```

or:

```text
narrow public read-only asset.source.inspect corridor for one explicit
project-local source asset, with project-general discovery/readiness behavior
```

Future docs and UI must not describe it as:

```text
production-general asset readback adapter
```

or:

```text
complete O3DE asset graph resolver
```

## Still Not Admitted

- complete source/product/dependency graph resolution
- broad Asset Catalog queries
- `asset.product.resolve`
- Asset Processor execution
- `AssetProcessorBatch` execution
- cache mutation or repair
- source or product asset mutation
- generated asset import or staging
- generated asset assignment or placement
- public asset write corridors

## AI Asset Forge Impact

O3DE AI Asset Forge can treat Phase 9 as the validation backbone design, but
not yet as a production-approved generated-asset validation surface.

Before Forge can validate generated assets as usable, Phase 9 needs a review
packet that shows:

- selected project
- selected platform
- source asset path
- source/product/dependency rows
- catalog presence
- freshness/readiness state
- provenance handoff fields
- operator approval state
- mutation flags

## Required Next Packet

Next normalized packet:

```text
Branch:
codex/phase-9-asset-readback-readiness-review-contract

PR title:
Define Phase 9 asset readback readiness review contract
```

Purpose:

Define the operator-facing readiness/review packet for project-general asset
readback, including freshness, platform, missing-substrate guidance, and the
fields AI Asset Forge will need before generated assets can be considered
usable.

## Revisit Gate

Revisit production-general public admission after the readiness review contract
exists and the corridor can explain these states clearly:

- selected project and platform
- database/catalog freshness unknown vs acceptable
- source found vs missing
- product found vs missing
- dependency rows present vs missing
- catalog presence true vs false
- no mutation occurred
- safest next step
