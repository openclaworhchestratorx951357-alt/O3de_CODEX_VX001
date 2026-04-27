# O3DE AI Asset Forge Asset Processor Validation

## Purpose

This packet records the first proof-only Asset Processor validation for an
O3DE AI Asset Forge generated source asset.

It validates the staged `triposr_chair_001` GLB through O3DE Asset Processor,
then reads `assetdb.sqlite` and `assetcatalog.xml` for source, product,
dependency, and catalog evidence.

This is not an entity assignment, level placement, production import admission,
or public generated-asset corridor.

## Approval

The operator approved the current Supervisor Mode work to proceed with the next
slice, including downloads and bounded local work needed for the Forge proof
sequence.

The Supervisor Agent interpreted that approval narrowly for this packet:

- run or observe Asset Processor for the staged sandbox source asset
- inspect generated Asset Processor evidence read-only after processing
- do not edit the generated source asset
- do not edit source prefabs or levels
- do not assign the asset to an entity
- do not place the asset in a level
- do not admit public generated-asset import or production use

## Input From Previous Packet

Previous proof:
`docs/AI-ASSET-FORGE-O3DE-SOURCE-STAGING-PROOF.md`.

Sandbox project:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox
```

Project-relative generated source:

```text
Assets/Generated/triposr_chair_001/triposr_chair_001.glb
```

Project-relative provenance metadata:

```text
Assets/Generated/triposr_chair_001/triposr_chair_001.forge.json
```

Staged GLB SHA-256:

```text
2FFAE9FD6B85F320E79CC92835B18F7488E10BBC8D4673481FD0AAB605F045C5
```

## Asset Processor Invocation

Local tool path:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox\build\windows\bin\profile\AssetProcessor.exe
```

The invocation started Asset Processor for the `McpSandbox` project root. Asset
Processor scanned the project, processed the staged `.forge.json` and `.glb`
files, then became idle. The process was stopped after evidence collection.

Relevant Asset Processor log evidence:

```text
AssetProcessor will process assets from project root C:\Users\topgu\O3DE\Projects\McpSandbox.
Processing Assets/Generated/triposr_chair_001/triposr_chair_001.forge.json (pc)...
Processing Assets/Generated/triposr_chair_001/triposr_chair_001.glb (pc)...
Processed "C:/Users/topgu/O3DE/Projects/McpSandbox/Assets/Generated/triposr_chair_001/triposr_chair_001.forge.json" ("pc")...
Processed "C:/Users/topgu/O3DE/Projects/McpSandbox/Assets/Generated/triposr_chair_001/triposr_chair_001.glb" ("pc")...
Saved pc catalog containing 10408 assets
```

## Phase 9 Discovery Check

The project-general Phase 9 discovery helper was run read-only after processing.

Input:

```text
project_root: C:\Users\topgu\O3DE\Projects\McpSandbox
source_asset_path: Assets/Generated/triposr_chair_001/triposr_chair_001.glb
selected_platform: pc
```

Result:

```text
readiness_status: ready_for_asset_source_inspect
blocked_reason: None
read_only: True
mutation_occurred: False
normalized_source_path: Assets/Generated/triposr_chair_001/triposr_chair_001.glb
asset_database_path: C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\assetdb.sqlite
asset_catalog_path: C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\pc\assetcatalog.xml
```

## Read-Only Asset Database Evidence

`Cache/assetdb.sqlite` was opened read-only after Asset Processor completed.

Generated GLB source row:

```text
SourceID: 3216
SourceName: Assets/Generated/triposr_chair_001/triposr_chair_001.glb
SourceGuid: {A7FF11AC-5803-54B6-A918-A8AF225DAA3A}
```

Generated GLB job row:

```text
JobID: 3352
JobKey: Scene compilation
Platform: pc
Status: 4
ErrorCount: 0
WarningCount: 4
LastLogFile: @log@/JobLogs/Assets/Generated/triposr_chair_001/triposr_chair_001.glb-2492700964-9278.log
```

Product evidence:

```text
product_count: 15
product_dependency_count: 21
```

Representative products:

```text
pc/assets/generated/triposr_chair_001/triposr_chair_001.glb.abdata.json
pc/assets/generated/triposr_chair_001/triposr_chair_001_glb.procprefab
pc/assets/generated/triposr_chair_001/triposr_chair_001__14520923307272750946.glb.azmaterial
pc/assets/generated/triposr_chair_001/triposr_chair_001_lod0_index.glb.azbuffer
pc/assets/generated/triposr_chair_001/triposr_chair_001_lod0_position0.glb.azbuffer
pc/assets/generated/triposr_chair_001/triposr_chair_001_lod0_normal0.glb.azbuffer
pc/assets/generated/triposr_chair_001/triposr_chair_001_lod0_color0.glb.azbuffer
pc/assets/generated/triposr_chair_001/triposr_chair_001_lod0.glb.azlod
pc/assets/generated/triposr_chair_001/triposr_chair_001.glb.azmodel
```

The `.forge.json` provenance file was also observed as a source and product:

```text
SourceName: Assets/Generated/triposr_chair_001/triposr_chair_001.forge.json
ProductName: pc/assets/generated/triposr_chair_001/triposr_chair_001.forge.json
```

## Asset Catalog Cross-Check

`Cache/pc/assetcatalog.xml` was inspected read-only after processing.

Catalog size:

```text
5939359 bytes
```

Representative product-path presence:

```text
assets/generated/triposr_chair_001/triposr_chair_001.glb.azmodel: true
assets/generated/triposr_chair_001/triposr_chair_001_glb.procprefab: true
assets/generated/triposr_chair_001/triposr_chair_001_lod0.glb.azlod: true
assets/generated/triposr_chair_001/triposr_chair_001.forge.json: true
```

## Product Cache Evidence

Generated product files were observed under the sandbox cache:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\pc\assets\generated\triposr_chair_001
```

Observed generated products include:

```text
triposr_chair_001.glb.azmodel
triposr_chair_001_glb.procprefab
triposr_chair_001_lod0.glb.azlod
triposr_chair_001_lod0_index.glb.azbuffer
triposr_chair_001_lod0_position0.glb.azbuffer
triposr_chair_001_lod0_normal0.glb.azbuffer
triposr_chair_001_lod0_color0.glb.azbuffer
triposr_chair_001__14520923307272750946.glb.azmaterial
triposr_chair_001.glb.abdata.json
```

Cache files remain outside the repository and must not be committed.

## Warnings

The generated GLB job completed with zero errors and four warnings.

Observed warning themes:

- the source watch folder was not reported for the generated source GUID
- the mesh node name `mesh.obj` was normalized to `mesh_obj`
- an empty material node name was normalized to `Material`
- tangents could not be generated because the mesh has no UV coordinates

The warnings do not block proof-only source/product/dependency/catalog evidence,
but they must be shown in a future operator review packet before any placement
or production-use decision.

## Boundaries Preserved

- no repository dependency files changed
- no lockfiles changed
- no backend runtime code changed
- no frontend code changed
- no generated asset committed to this repository
- no model weights committed
- no O3DE Cache files committed
- no source asset edits after staging
- no source prefab edits
- no level edits
- no entity assignment
- no level placement
- no public import admission
- no production use admission

## Result

Forge Phase 5 is proof-complete for the bounded `McpSandbox`
`triposr_chair_001` target.

The generated GLB is now an O3DE-processed candidate with Asset Database,
product, dependency, cache, and Asset Catalog evidence. It is still not
production-approved and must not be assigned or placed until an operator review
packet and later admitted corridor say so.

## Next Required Forge Packet

```text
Branch:
codex/ai-asset-forge-operator-review-packet

PR title:
Define AI Asset Forge generated asset operator review packet
```

Purpose:

Collect generation provenance, source path, product mapping, dependency counts,
catalog presence, Asset Processor warnings, hashes, license/commercial status,
and approval state into a reviewable operator packet before any entity
assignment or placement design.

## Final Rule

Generated assets must pass O3DE Asset Processor validation and Phase 9
source/product/dependency/catalog readback before review. Passing this packet
does not admit placement, production import, or public generated-asset use.
