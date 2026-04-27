# Phase 9 Production Generalization Plan

## Current proof state

Phase 9 currently proves asset readback on a bounded local `McpSandbox` target.

Current proof target:

- project: `C:\Users\topgu\O3DE\Projects\McpSandbox`
- Asset Processor database:
  `C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\assetdb.sqlite`
- source: `Levels/BridgeLevel01/BridgeLevel01.prefab`
- product: `pc/levels/bridgelevel01/bridgelevel01.spawnable`
- supplemental catalog:
  `C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\pc\assetcatalog.xml`

This proves the read-only substrate and the bounded adapter corridor. It is not
yet a production-general claim.

Clear labels:

- `McpSandbox` is a proof target, not a production assumption.
- `BridgeLevel01` is a proof target, not a required user level.
- `assetdb.sqlite` is a standard O3DE Asset Processor database substrate, but
  its location is project-specific.
- `pc` is a platform cache example, not the only possible platform.

## Production requirement

A production adapter must discover or be configured with:

- user project root
- `project.json`
- engine/project relationship if needed
- `Cache` directory
- `assetdb.sqlite` path
- available platform cache directories
- `assetcatalog.xml` path
- source asset path requested by user
- product asset rows
- product dependency rows
- catalog presence

The production adapter must treat each of those as runtime project facts, not
as hardcoded `McpSandbox` or `BridgeLevel01` assumptions.

## AI Asset Forge validation backbone

Phase 9 is the required validation backbone for O3DE AI Asset Forge.

The future Forge pipeline will generate or convert source assets before they
enter an O3DE project. Those generated assets are not considered usable until
Phase 9 can prove, read-only, that the selected project and platform contain the
expected source asset, product rows, product dependency rows, and Asset Catalog
presence.

The next Phase 9 proof must therefore support future generated assets as
dynamic source-asset inputs, not only the current `BridgeLevel01` proof target.
`BridgeLevel01` remains valuable because it proves the current substrate; it
must not become a hidden production assumption for AI Asset Forge.

## Completed discovery packet

The first Phase 9 production-generalization packet was:

```text
Branch:
codex/phase-9-project-asset-readback-discovery

PR title:
Discover project-general asset readback inputs
```

Purpose:

Replace hardcoded `McpSandbox` and `BridgeLevel01` assumptions with
project-root and source-asset inputs, while remaining read-only.

That packet should discover project-local readback inputs, define blocked or
readiness results for missing substrates, and prove one non-hardcoded path
through user/project discovery before any production-general wording is used.

This discovery packet is now tracked in
`docs/PHASE-9-PROJECT-ASSET-READBACK-DISCOVERY.md`.

## Completed proof packet

The next proof packet was:

```text
Branch:
codex/phase-9-project-general-asset-source-inspect-proof

PR title:
Prove project-general asset source inspect
```

Purpose:

Use the project-general discovery helper inside the proof-only
`asset.source.inspect` path, query `assetdb.sqlite` read-only, cross-check
`assetcatalog.xml`, and return structured readiness/proof metadata without
mutating project assets.

This proof packet is tracked in
`docs/PHASE-9-PROJECT-GENERAL-ASSET-SOURCE-INSPECT-PROOF.md`.

## Required future packet

The next required Phase 9 production-generalization packet should be:

```text
Branch:
codex/phase-9-asset-source-inspect-schema-hardening

PR title:
Harden asset source inspect proof schema
```

Purpose:

Make the structured source/product/dependency/catalog proof fields explicit in
the published schemas and decide which readiness/proof states are part of the
stable public readback contract.

## Future production flow

1. User selects or registers an O3DE project.
2. System verifies project root and `project.json`.
3. System finds `Cache/assetdb.sqlite`.
4. System detects available platform cache folders.
5. System finds `assetcatalog.xml`.
6. User requests source asset inspection.
7. System queries source, product, and dependency evidence read-only.
8. System returns structured evidence.
9. If anything is missing, system returns a blocked/readiness result instead of
   mutating.

## Failure states

Project-general readback must report precise blocked/readiness states such as:

- `project_root_missing`
- `project_json_missing`
- `asset_cache_missing`
- `asset_database_missing`
- `asset_catalog_missing`
- `source_not_found`
- `product_not_found`
- `dependency_rows_missing`
- `schema_mismatch`
- `platform_cache_missing`
- `asset_processor_not_run`

These states should not trigger Asset Processor execution, cache repair, source
asset mutation, product asset mutation, or broad project scans unless a later
high-risk packet explicitly admits that behavior.

## Phase 8 comparison

Did Phase 8 need something like this too?

Yes, but differently.

Phase 8 does not depend primarily on `assetdb.sqlite`. It depends on live
Editor, component, and property reflection plus project/editor availability.

Phase 8 production-generalization should mean:

- discover whether the target component exists in the current user
  project/editor
- discover whether the exact property path exists
- verify property type before read, write, or restore
- refuse if the component or property path differs
- avoid assuming `Camera` exists on every target entity
- avoid assuming all O3DE versions expose identical property paths
- keep generic property writes blocked unless separately admitted
- make the local `McpSandbox` Camera bool proof a proof target, not a universal
  assumption

## Required future Phase 8 generalization packet

Future optional Phase 8 packet:

```text
Branch:
codex/phase-8-component-property-portability-audit

PR title:
Audit Phase 8 component property portability
```

Purpose:

Document and test how exact admitted Camera bool write/restore corridors behave
across projects, component availability, and property-path variations.

This packet should preserve the exact admitted Camera bool corridor while
making portability and refusal behavior explicit for projects or entities where
the component, property path, type, or Editor bridge conditions differ.

## Production-readiness labels

Use these labels when documenting Phase 8 and Phase 9 capability status:

- local proof target
- project-general readback candidate
- production-general adapter
- public admitted corridor
- blocked/unavailable in this project

Current Phase 9 label:

```text
local proof target + project-general proof-only readback candidate
```

Current Phase 8 Camera bool label:

```text
local proof target + exact public admitted corridor, portability audit pending
```

## Final rule

No future PR may describe a proof target as production-general unless the
adapter accepts project/source inputs dynamically and has blocked/readiness
behavior for missing project, cache, schema, component, or property conditions.

This rule applies directly to O3DE AI Asset Forge: no generated asset may be
described as production-ready until the adapter can validate that asset through
project-general source/product/dependency/catalog readback and report truthful
blocked/readiness states.
