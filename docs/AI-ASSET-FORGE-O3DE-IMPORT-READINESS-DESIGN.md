# O3DE AI Asset Forge Import Readiness Design

## Purpose

This document designs how the first generated AI Asset Forge source asset may
enter an O3DE sandbox project in a later proof-only packet.

This packet is design-only. It does not copy generated assets into O3DE, run
Asset Processor, mutate a project, admit import, assign assets to entities, or
place anything in a level.

## Current proof inputs

Local generation proof:

```text
docs/AI-ASSET-FORGE-LOCAL-GENERATION-PROOF.md
```

Cleanup/conversion proof:

```text
docs/AI-ASSET-FORGE-CLEANUP-CONVERSION-PROOF.md
```

Current converted candidate:

```text
C:\Users\topgu\O3DE\AIAssetForge\outputs\cleanup-conversion-20260427-073139\mesh_normalized_unit.glb
```

That file is a local proof artifact outside the repository and outside O3DE
projects. It is not committed and is not yet staged into O3DE.

## Readiness decision

AI Asset Forge is ready for a later proof-only O3DE source-asset staging packet
only if the operator explicitly approves one bounded O3DE project mutation.

The next packet may stage one generated source asset into one sandbox project
folder, but it must still keep public import, assignment, placement, and
production admission blocked.

## Candidate sandbox project

Default proof target:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox
```

This is a proof target, not a production assumption.

The staging packet must verify:

- project root exists
- `project.json` exists
- target project is the operator-approved sandbox
- target staging folder is inside the project root
- source path normalization cannot escape the project root
- generated source asset is copied only after explicit approval for that packet

## Staging convention

Future generated source assets should use:

```text
Assets/Generated/<asset_slug>/
```

For the current chair proof candidate:

```text
Assets/Generated/triposr_chair_001/
```

Required files for the first staging proof:

```text
Assets/Generated/triposr_chair_001/triposr_chair_001.glb
Assets/Generated/triposr_chair_001/triposr_chair_001.forge.json
```

The `.forge.json` file is source provenance metadata. It should be committed
only if the operator approves the source asset staging packet and the project
policy allows generated-source provenance in the sandbox project.

## Naming rules

Generated asset slugs must:

- use lowercase ASCII
- use underscores instead of spaces
- include a stable backend/source hint when useful
- include a sequence number for proof targets
- avoid absolute paths
- avoid user names in asset filenames
- avoid prompt text as a filename
- avoid overwriting existing assets

Example:

```text
triposr_chair_001
```

## Allowed source formats

Initial source-format candidates:

- `.glb`
- `.fbx`
- `.obj`

Preferred first staging format:

```text
.glb
```

Reason:

The cleanup/conversion proof already produced a normalized GLB, and GLB keeps
mesh packaging tighter than OBJ. A later import proof must verify whether the
target O3DE project and Asset Processor configuration actually process that GLB
as expected.

## Required provenance metadata

The first `.forge.json` metadata packet should include:

- asset slug
- source filename
- source format
- generator backend
- generator repository URL
- generator commit
- model name
- model source
- generation input path or sanitized reference label
- generation timestamp
- generation proof document
- cleanup/conversion proof document
- input OBJ SHA-256
- staged source SHA-256
- converted GLB SHA-256
- mesh vertex count
- mesh face count
- original extents
- normalized extents
- normalization translation
- normalization scale
- license status
- commercial-use status
- operator approval state
- intended use: internal/prototype/final
- O3DE project root
- project-relative source path
- Asset Processor status
- Phase 9 source/product/dependency/catalog readback status
- review status

## Approval gate

The first staging packet is a project mutation packet.

It requires explicit operator approval for:

- target O3DE project root
- exact generated source file to stage
- exact project-relative destination path
- whether provenance metadata should be staged beside the source
- whether Asset Processor may run or must remain manual

Default for the first staging proof:

```text
Asset Processor execution: not allowed
AssetProcessorBatch execution: not allowed
generated source staging: allowed only after explicit packet approval
public import admission: blocked
asset assignment: blocked
level placement: blocked
```

## Post-staging Phase 9 readback requirement

After a generated source asset is staged and O3DE has processed it, Phase 9 must
prove:

- project root
- project-relative generated source path
- `Cache/assetdb.sqlite`
- selected platform
- `assetcatalog.xml`
- source row
- product rows
- product dependency rows
- catalog product-path presence
- read-only proof status
- mutation flags
- operator review handoff

If Asset Processor has not produced rows yet, the system must return a
readiness result such as:

```text
asset_processor_not_run
product_not_found
dependency_rows_missing
asset_catalog_missing
```

It must not silently run Asset Processor unless a later packet explicitly
approves that action.

## Failure states

The future staging/readback flow must fail closed for:

- project_root_missing
- project_json_missing
- generated_source_missing
- generated_source_hash_mismatch
- destination_exists
- destination_escapes_project
- staging_not_approved
- provenance_missing
- provenance_hash_mismatch
- unsupported_source_format
- asset_cache_missing
- asset_database_missing
- platform_cache_missing
- asset_catalog_missing
- asset_processor_not_run
- source_not_found
- product_not_found
- dependency_rows_missing
- schema_mismatch

## Next required Forge packet

```text
Branch:
codex/ai-asset-forge-proof-only-o3de-source-staging

PR title:
Stage one AI Asset Forge source asset into O3DE sandbox
```

Purpose:

With explicit operator approval, copy exactly one generated GLB and one
provenance metadata file into the `McpSandbox` generated-assets staging folder.
Do not run Asset Processor in that packet unless separately approved. Do not
assign or place the asset.

## Final rule

O3DE import readiness is now designed, but import is not admitted.

Generated assets still must not become usable candidates until a staged source
asset is processed by O3DE and Phase 9 proves source/product/dependency/catalog
evidence with an operator review packet.
