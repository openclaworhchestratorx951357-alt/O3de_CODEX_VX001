# O3DE AI Asset Forge Source Staging Proof

## Purpose

This packet records the first proof-only O3DE source-asset staging mutation for
O3DE AI Asset Forge.

The proof copies exactly one generated GLB and one provenance metadata file into
the `McpSandbox` O3DE sandbox project, following the import-readiness design in
`docs/AI-ASSET-FORGE-O3DE-IMPORT-READINESS-DESIGN.md`.

This is not an Asset Processor, source/product/dependency readback, entity
assignment, level placement, or production-admission packet.

## Approval

The operator approved this bounded mutation in the current Supervisor Mode turn:

```text
Use supervisor mode, you have full operator approval for anything you may need
to download, proceed with your recommendations, then move to the next slice or
phase.
```

The Supervisor Agent interpreted that approval narrowly for this packet:

- stage one generated source asset into the sandbox project
- stage one provenance metadata file beside it
- do not run Asset Processor
- do not run AssetProcessorBatch
- do not assign the asset to an entity
- do not place the asset in a level
- do not admit public import or production use

## Project target

Sandbox project:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox
```

Verified project file:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox\project.json
```

Observed project name:

```text
McpSandbox
```

This remains a proof target, not a production assumption.

## Source input

Generated GLB source outside O3DE before staging:

```text
C:\Users\topgu\O3DE\AIAssetForge\outputs\cleanup-conversion-20260427-073139\mesh_normalized_unit.glb
```

Source SHA-256 before staging:

```text
2FFAE9FD6B85F320E79CC92835B18F7488E10BBC8D4673481FD0AAB605F045C5
```

## Staged files

Project-relative staged source:

```text
Assets/Generated/triposr_chair_001/triposr_chair_001.glb
```

Project-relative provenance metadata:

```text
Assets/Generated/triposr_chair_001/triposr_chair_001.forge.json
```

Absolute staged paths:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox\Assets\Generated\triposr_chair_001\triposr_chair_001.glb
C:\Users\topgu\O3DE\Projects\McpSandbox\Assets\Generated\triposr_chair_001\triposr_chair_001.forge.json
```

Staged GLB SHA-256:

```text
2FFAE9FD6B85F320E79CC92835B18F7488E10BBC8D4673481FD0AAB605F045C5
```

Staged provenance metadata SHA-256:

```text
18E21AAB5DEBABF8C38375049549DAF812E219E0EA9096197CACB678598D5770
```

## Provenance metadata

The staged `.forge.json` records:

- asset slug
- source filename and format
- TripoSR repository URL
- TripoSR commit
- model name/source
- generation proof document
- cleanup/conversion proof document
- import-readiness design document
- input OBJ SHA-256
- converted/staged GLB SHA-256
- mesh vertex and face counts
- original and normalized extents
- normalization translation and scale
- license/commercial-use status
- operator approval state
- intended use
- project root
- project-relative source path
- Asset Processor status
- Phase 9 readback status
- mutation boundaries

The metadata explicitly records:

```text
asset_processor_status: not_run_in_this_packet
phase9_readback_status: pending_after_asset_processor_processing
entity_assignment: false
level_placement: false
public_import_admission: false
```

## Staging verification

The staging proof verified:

- project root exists
- `project.json` exists
- destination did not already exist
- destination path stayed under the project root
- source GLB hash matched the cleanup/conversion proof before copy
- staged GLB hash matched after copy
- provenance metadata was written beside the staged source
- repo worktree did not see the staged GLB or provenance file

Repo status after staging still showed only:

```text
?? .venv/
```

## Phase 9 discovery check

The project-general Phase 9 discovery helper was run read-only for:

```text
project_root:
C:\Users\topgu\O3DE\Projects\McpSandbox

source_asset_path:
Assets/Generated/triposr_chair_001/triposr_chair_001.glb

selected_platform:
pc
```

Discovery result:

```text
readiness_status: ready_for_asset_source_inspect
blocked_reason: None
read_only: True
mutation_occurred: False
normalized_source_path: Assets/Generated/triposr_chair_001/triposr_chair_001.glb
asset_database_path: C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\assetdb.sqlite
asset_catalog_path: C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\pc\assetcatalog.xml
```

This proves the staged source path is safe and discoverable. It does not prove
Asset Processor output.

## Read-only Asset Database check

`Cache/assetdb.sqlite` was opened read-only after staging.

Source rows for the staged GLB:

```text
0
```

Interpretation:

Asset Processor was not run in this packet, and the generated source has not yet
been observed in the Asset Processor database.

Current readiness state:

```text
asset_processor_not_run
```

## Boundaries preserved

- no repo dependency files changed
- no lockfiles changed
- no backend runtime code changed
- no frontend code changed
- no generated asset committed to this repo
- no model weights committed
- no O3DE Cache files committed
- no Asset Processor execution
- no AssetProcessorBatch execution
- no product cache mutation by Codex
- no entity assignment
- no level placement
- no public import admission
- no production use admission

## Next required Forge packet

```text
Branch:
codex/ai-asset-forge-asset-processor-validation

PR title:
Validate AI Asset Forge staged source with Asset Processor
```

Purpose:

Run or otherwise observe Asset Processor processing for the staged generated GLB
with explicit operator approval, then use Phase 9 readback to verify
source/product/dependency/catalog evidence.

The packet must keep assignment, placement, and production admission blocked.

## Final rule

The generated source is staged in the sandbox project, but it is not yet an
O3DE-usable asset.

It becomes an O3DE-usable candidate only after Asset Processor processing and
Phase 9 source/product/dependency/catalog readback succeed, followed by operator
review.
