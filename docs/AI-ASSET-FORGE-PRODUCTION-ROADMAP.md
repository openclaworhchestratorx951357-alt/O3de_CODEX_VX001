# O3DE AI Asset Forge Production Roadmap

## Mission

Build a private O3DE-native alternative to Meshy-style AI 3D asset generation.

This system should generate, clean, import, validate, catalog, review, and
eventually place 3D assets inside O3DE projects using natural language.

## Non-goals

- Not Meshy integration.
- Not Meshy API usage.
- Not external proprietary service dependency.
- Not immediate foundation-model training from scratch.
- Not immediate generated asset import.
- Not immediate O3DE project mutation.
- Not bypassing O3DE Asset Processor.
- Not committing generated assets, Cache files, or model weights without
  explicit approval.

## Production pipeline

1. Prompt/image/reference input.
2. Local/private generation backend produces a raw 3D asset.
3. Cleanup/conversion layer prepares mesh/material/textures.
4. Source asset is staged into an O3DE project asset folder.
5. Asset Processor processes the source asset.
6. Phase 9 asset readback verifies source/product/dependency evidence.
7. Asset catalog cross-check verifies runtime product availability.
8. Operator review confirms provenance, quality, scale, naming, and safety.
9. Later admitted corridor assigns generated asset to an entity.
10. Later admitted corridor places/updates the entity in a level.

## Why Phase 9 matters

Phase 9 is the validation backbone for AI Asset Forge.

Generated assets are not considered usable until O3DE confirms:

- source asset exists
- product asset exists
- product dependency rows exist
- asset catalog presence exists
- no mutation occurred outside admitted corridors

Phase 9 must therefore become project-general before AI Asset Forge can claim a
production-ready O3DE import path. The current `McpSandbox` evidence proves the
read-only substrate; it does not prove that generated assets are portable,
reviewed, imported, or safe to place.

## Candidate local/private model backends

These candidates are planning inputs only. This roadmap does not download
models, add dependencies, run inference, generate assets, or select a production
backend.

The Forge Phase 0 substrate audit is recorded in
`docs/AI-ASSET-FORGE-LOCAL-MODEL-SUBSTRATE-AUDIT.md`. It selects TripoSR as the
first proof-only local generation candidate because it has the narrowest first
proof surface and a permissive upstream license. That decision does not admit
production use, generated asset import, model downloads, dependency changes, or
O3DE project mutation.

### Hunyuan3D-2

- input types: text-to-3D, image-to-3D, and texturing workflows depending on the
  selected released variant
- output formats: mesh assets such as GLB are a likely proof target, with exact
  output support to be verified during the model substrate audit
- hardware needs: GPU/VRAM requirements vary by model and mode; local Windows
  feasibility must be tested before any production claim
- license/commercial risk: community license and model terms must be reviewed
  before production or commercial use
- expected O3DE import fit: promising for source mesh generation followed by
  Blender cleanup/conversion and O3DE Asset Processor validation
- proof-only first step: document install, license, hardware, output format,
  and isolation requirements without downloading weights
- audit disposition: later high-quality candidate, not first proof

### TRELLIS

- input types: text-to-3D and image-to-3D
- output formats: structured 3D latent representations with mesh, radiance
  field, and 3D Gaussian style outputs to be verified for O3DE import fit
- hardware needs: likely NVIDIA GPU-oriented for practical local inference;
  exact VRAM and platform requirements must be audited
- license/commercial risk: code/model/submodule licenses must be reviewed,
  especially for commercial use and bundled dependencies
- expected O3DE import fit: potentially useful for higher-fidelity generated
  assets after conversion to O3DE-friendly mesh/material formats
- proof-only first step: audit local inference path, license stack, expected
  export formats, and hardware requirements
- audit disposition: later high-fidelity research candidate, not first proof

### Stable Fast 3D

- input types: image-to-3D
- output formats: mesh/UV/material-oriented output, commonly GLB-oriented in
  examples
- hardware needs: intended as a fast proof candidate; GPU availability improves
  practicality, and exact Windows requirements must be audited
- license/commercial risk: Stability AI license and commercial thresholds must
  be reviewed before production use
- expected O3DE import fit: useful as a fast image-to-mesh candidate because
  UV/material-oriented output can feed cleanup and O3DE import experiments
- proof-only first step: audit license, offline use, output format, and whether
  generated files can remain outside the repo and outside O3DE projects
- audit disposition: strong second proof candidate after license/commercial
  review

### TripoSR

- input types: image-to-3D
- output formats: fast single-image reconstruction mesh outputs to be verified
  for conversion quality and material completeness
- hardware needs: useful for early prototype or fallback because it is designed
  for low inference budgets, but local performance still requires audit
- license/commercial risk: license and model-card terms must be reviewed before
  production use
- expected O3DE import fit: useful as a fast fallback candidate for raw mesh
  creation followed by cleanup/conversion
- proof-only first step: audit source, model weights, license, output quality,
  and conversion requirements
- audit disposition: first proof-only local generation candidate

### Blender automation

- input types: generated GLB, OBJ, FBX, textures, material maps, and metadata
- output formats: normalized GLB/FBX/source assets plus metadata
- hardware needs: CPU is enough for many conversion tasks; GPU may help
  rendering/preview but must not be required without audit
- license/commercial risk: Blender automation scripts are project-owned, but
  imported asset/model licenses still govern final use
- expected O3DE import fit: central cleanup layer for conversion, scale
  normalization, pivot correction, mesh cleanup, texture packing, format export,
  and later collision/LOD preparation
- proof-only first step: design a read-only conversion plan against one
  generated asset outside O3DE, without staging it into a project
- audit disposition: cleanup/conversion layer, not generation backend

## Production feature phases

### Forge Phase 0 - Model substrate audit

Goal:
Pick local/open 3D generation candidates for first proof.

Output:
docs-only model substrate audit.

No model download yet.

Status:
Completed in `docs/AI-ASSET-FORGE-LOCAL-MODEL-SUBSTRATE-AUDIT.md`.

### Forge Phase 1 - Local generation proof

Goal:
Generate one local test asset outside O3DE.

Output:
raw GLB/OBJ/FBX candidate.

No O3DE project mutation.

Status:
Completed in `docs/AI-ASSET-FORGE-LOCAL-GENERATION-PROOF.md` using TripoSR
CPU execution against the upstream `examples/chair.png` input. The generated
OBJ stayed outside the repo and outside O3DE projects.

### Forge Phase 2 - Cleanup/conversion proof

Goal:
Run local conversion/cleanup on generated asset.

Output:
normalized GLB/FBX plus metadata.

No O3DE project mutation.

### Forge Phase 3 - O3DE import readiness design

Goal:
Design how generated assets enter an O3DE sandbox project safely.

Output:
staging folder convention, provenance metadata, naming convention.

No import yet.

### Forge Phase 4 - Proof-only O3DE import

Goal:
Place one generated source asset into sandbox source folder with explicit
approval.

Output:
source asset appears in project.

Still proof-only.

### Forge Phase 5 - Asset Processor validation

Goal:
Use Phase 9 asset readback to verify generated source -> product ->
dependencies -> catalog.

Output:
assetdb/catalog proof.

### Forge Phase 6 - Operator review

Goal:
Show generated asset provenance, paths, hash, source/product mapping,
dependencies, warnings, and approval state.

### Forge Phase 7 - Entity assignment design

Goal:
Design exact corridor for assigning generated asset to entity.

No mutation yet.

### Forge Phase 8 - Exact asset assignment proof

Goal:
Assign one generated asset to one sandbox entity under proof/restore discipline.

### Forge Phase 9 - Production corridor decision

Goal:
Decide whether generated asset import/assignment becomes a public admitted
corridor.

## Provenance requirements

Every generated asset must eventually track:

- generation backend
- model name/version
- prompt
- input image/reference
- seed/settings if available
- license
- generation timestamp
- file hashes
- source asset path
- product asset path
- dependency rows
- catalog presence
- operator approval state
- whether commercial use is allowed
- whether asset is internal/prototype/final

## Safety boundaries

- No external proprietary generator by default.
- No untracked generated assets in git.
- No Cache files in git.
- No asset mutation without normalized proof/admission.
- No public import corridor before design/readiness/proof/admission.
- No generated asset may be considered usable until Asset
  Processor/readback/catalog validation passes.
- No generated asset may be production-approved without provenance.

## Next recommended implementation sequence

1. Add cleanup/conversion proof after the raw TripoSR OBJ exists outside O3DE.
2. Design O3DE import readiness only after cleanup/conversion is proven.
3. Use Phase 9 readback for generated source/product/dependency/catalog
   validation after an explicitly approved proof-only O3DE source-asset staging
   packet.
4. Keep public import, assignment, placement, and production corridor admission
   blocked until provenance and operator review are implemented.

## Reference links

- Hunyuan3D-2: <https://github.com/Tencent-Hunyuan/Hunyuan3D-2>
- TRELLIS: <https://github.com/microsoft/TRELLIS>
- Stable Fast 3D: <https://github.com/Stability-AI/stable-fast-3d>
- TripoSR: <https://github.com/VAST-AI-Research/TripoSR>
- Forge Phase 0 audit: `docs/AI-ASSET-FORGE-LOCAL-MODEL-SUBSTRATE-AUDIT.md`
- Forge Phase 1 proof: `docs/AI-ASSET-FORGE-LOCAL-GENERATION-PROOF.md`
