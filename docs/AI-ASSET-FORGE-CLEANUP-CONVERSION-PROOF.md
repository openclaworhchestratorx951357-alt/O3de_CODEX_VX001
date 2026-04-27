# O3DE AI Asset Forge Cleanup Conversion Proof

## Purpose

This packet records the first proof-only cleanup/conversion pass for O3DE AI
Asset Forge.

The proof uses the locally generated TripoSR OBJ from
`docs/AI-ASSET-FORGE-LOCAL-GENERATION-PROOF.md`, inspects the mesh, normalizes
it to a bounded unit scale, and exports a GLB candidate outside the repository
and outside any O3DE project.

This is not an O3DE import, Asset Processor, assignment, placement, or
production-admission packet.

## Proof decision

The first cleanup/conversion proof succeeded using the external Python/trimesh
toolchain already installed for the local generation proof.

Blender was checked and was not available on PATH, so this packet does not claim
a Blender automation proof. Blender remains the likely later automation layer
for richer cleanup, preview, collision, LOD, material, and export workflows.

## Boundaries preserved

- no repo dependency files changed
- no lockfiles changed
- no backend runtime code changed
- no frontend code changed
- no O3DE project files changed
- no generated asset staged into an O3DE project
- no Asset Processor or AssetProcessorBatch execution
- no generated OBJ or GLB committed
- no model weights committed
- no cache files committed
- no public import, assignment, or placement corridor admitted

## External proof workspace

All proof-only artifacts were kept outside the repository:

```text
C:\Users\topgu\O3DE\AIAssetForge
```

Input OBJ:

```text
C:\Users\topgu\O3DE\AIAssetForge\outputs\triposr-chair-20260427-072555\0\mesh.obj
```

Output GLB:

```text
C:\Users\topgu\O3DE\AIAssetForge\outputs\cleanup-conversion-20260427-073139\mesh_normalized_unit.glb
```

External metadata:

```text
C:\Users\topgu\O3DE\AIAssetForge\outputs\cleanup-conversion-20260427-073139\cleanup_conversion_metadata.json
```

Those paths are local proof evidence only. They must not be committed.

## Tooling

Observed tooling:

```text
Python 3.11.9
trimesh 4.0.5
```

Blender availability check:

```text
blender : The term 'blender' is not recognized as the name of a cmdlet,
function, script file, or operable program.
```

## Proof operation

The proof:

1. Loaded the generated OBJ read-only.
2. Verified it was a `trimesh.Trimesh`.
3. Recorded vertex count, face count, bounds, extents, and centroid.
4. Translated the mesh by the negative bounding-box centroid.
5. Uniformly scaled the mesh so the longest extent became `1.0`.
6. Exported `mesh_normalized_unit.glb`.
7. Wrote external metadata with hashes and normalization values.

## Proof result

Status:

```text
succeeded
```

Input SHA-256:

```text
1AE08CFE6D7F48072B6D491B1AD7EC400C124099A23928219723390420E312D7
```

Output SHA-256:

```text
2FFAE9FD6B85F320E79CC92835B18F7488E10BBC8D4673481FD0AAB605F045C5
```

Output size:

```text
121344 bytes
```

Mesh counts:

```text
vertices: 3016
faces: 6000
```

Original extents:

```text
x: 0.51369261
y: 0.74128973
z: 0.93649954
```

Normalization:

```text
translation:
[-0.03182661500000001, -0.01247173499999999, 0.012941570000000005]

uniform_scale:
1.0678061838663584

target_longest_extent:
1.0
```

Normalized extents:

```text
x: 0.5485241455644495
y: 0.7915537577306232
z: 1.0
```

## Findings

The first cleanup/conversion proof demonstrates:

- the generated TripoSR OBJ can be read by a local conversion toolchain
- mesh counts and bounds can be inspected before O3DE import
- a normalized unit-scale GLB candidate can be produced outside the repo
- conversion metadata can capture hashes, extents, translation, scale, and
  mutation flags
- the proof can remain fully outside O3DE projects

The proof does not demonstrate:

- Blender automation
- production-grade mesh repair
- material or texture baking
- pivot policy beyond bounding-box centering
- collision or LOD generation
- O3DE source-asset staging
- Asset Processor product generation
- Asset Database or Asset Catalog readback for generated assets
- operator review UI
- entity assignment or placement

## Next required Forge packet

```text
Branch:
codex/ai-asset-forge-import-readiness-design

PR title:
Design AI Asset Forge O3DE import readiness
```

Purpose:

Design the first safe staging convention for generated source assets before any
O3DE project mutation occurs. The design must define staging folder policy,
source naming, provenance metadata, allowed formats, hash capture, operator
approval gates, and the later Phase 9 readback proof path.

## Final rule

This proof confirms cleanup/conversion only.

Generated assets still must not enter O3DE until a later import-readiness design
packet and an explicitly approved proof-only staging packet exist. O3DE
usability must still be proven through Phase 9 source/product/dependency/catalog
readback and operator review.
