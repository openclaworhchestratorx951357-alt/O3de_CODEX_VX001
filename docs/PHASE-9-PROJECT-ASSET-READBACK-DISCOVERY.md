# Phase 9 Project Asset Readback Discovery

## Purpose

This packet starts the required Phase 9 project-general asset readback
discovery layer.

It adds a read-only backend helper that discovers project-local inputs needed
before `asset.source.inspect` can be treated as production-general across user
projects.

This packet does not run Asset Processor, run `AssetProcessorBatch`, mutate
assets, mutate prefabs, mutate cache files, admit asset writes, broaden public
property writes, or expose arbitrary Editor Python.

## Discovery Helper

Backend helper:

```text
backend/app/services/asset_readback_discovery.py
```

Primary function:

```text
discover_project_asset_readback_inputs
```

Inputs:

- `project_root`
- `source_asset_path`
- optional `selected_platform`
- optional `check_source_asset`

The helper is read-only. It parses `project.json`, checks project-local cache
paths, detects platform cache folders, checks `assetcatalog.xml`, normalizes
the requested source asset path, and refuses paths that escape the project
root.

## Structured Result

The discovery result includes:

- `project_root`
- `project_json_path`
- `project_name`
- `cache_path`
- `asset_database_path`
- `available_platforms`
- `selected_platform`
- `asset_catalog_path`
- `source_asset_path`
- `source_asset_path_relative`
- `read_only`
- `mutation_occurred`
- `readiness_status`
- `blocked_reason`

Successful discovery returns:

```text
readiness_status: ready_for_asset_source_inspect
read_only: true
mutation_occurred: false
```

## Readiness States

The helper returns explicit readiness states:

- `project_root_missing`
- `project_json_missing`
- `asset_cache_missing`
- `asset_database_missing`
- `platform_cache_missing`
- `asset_catalog_missing`
- `source_asset_path_missing`
- `source_asset_path_escapes_project`
- `source_asset_not_checked_yet`
- `schema_mismatch`
- `ready_for_asset_source_inspect`

The helper is intentionally conservative. A blocked state reports what is
missing and does not mutate anything to repair the project.

## Platform Detection

The helper reports platform cache folders when they are known O3DE platform
names, explicitly selected, or contain `assetcatalog.xml`.

This keeps non-platform cache folders from being mistaken for available asset
platforms while still allowing a selected project-specific platform folder to
be evaluated.

## McpSandbox Proof Target

The helper still supports the current local proof target:

```text
Project: C:\Users\topgu\O3DE\Projects\McpSandbox
Source: Levels/BridgeLevel01/BridgeLevel01.prefab
```

Read-only live discovery returned:

```text
available_platforms: ["pc"]
selected_platform: pc
readiness_status: ready_for_asset_source_inspect
read_only: true
mutation_occurred: false
```

This proves the discovery helper can recognize the current proof target without
hardcoding `McpSandbox`, `BridgeLevel01`, or `pc` as universal assumptions.

## AI Asset Forge Relevance

This discovery helper is the first Phase 9 prerequisite for O3DE AI Asset
Forge.

Future generated assets must be inspected as ordinary O3DE project source
assets. The helper gives the future Forge pipeline a read-only way to discover
project root, cache, database, selected platform, catalog, and requested source
asset readiness before any generated asset can be reviewed, imported, assigned,
or placed.

This packet does not generate, import, stage, or assign AI assets. It only
prepares the project-general readback inputs that AI Asset Forge will need
later.

## Validation

Targeted tests:

```text
PYTHONPATH=backend python -m pytest backend/tests/test_asset_readback_discovery.py
```

Result:

```text
12 passed
```

Additional validation:

```text
ruff check backend/app/services/asset_readback_discovery.py backend/tests/test_asset_readback_discovery.py
python -m py_compile backend/app/services/asset_readback_discovery.py backend/tests/test_asset_readback_discovery.py
```

Results:

- ruff passed
- py_compile passed

## Still Not Production-General

This packet creates the project-general discovery layer, but it does not yet
make the public adapter production-general.

Still pending:

- integrate the discovery helper into `asset.source.inspect` execution details
- prove project-general asset source inspection using dynamic project/source
  inputs
- decide whether the discovery result needs first-class schema fields
- decide whether this readback corridor is ready for public admission beyond
  the current exact read-only proof corridor

## Next Normalized Packet

The next normalized packet should be:

```text
project-general asset source inspect proof
```

Purpose:

Use the discovery helper inside the read-only `asset.source.inspect` path,
return structured discovery readiness alongside source/product/dependency
evidence, and prove the adapter fails closed for missing project/cache/catalog
conditions without mutating assets.

That proof path should be shaped so a future generated source asset can be
validated by the same project/source inputs, while keeping actual generation
and import in later AI Asset Forge packets.
