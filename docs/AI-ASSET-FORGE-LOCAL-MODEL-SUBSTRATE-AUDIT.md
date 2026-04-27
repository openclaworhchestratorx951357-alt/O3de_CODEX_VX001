# O3DE AI Asset Forge Local Model Substrate Audit

## Purpose

This document records the Forge Phase 0 model substrate audit for O3DE AI Asset
Forge.

The audit selects a first proof-only local/private generation candidate before
any model download, dependency change, asset generation, generated asset commit,
O3DE project mutation, Asset Processor execution, import corridor, assignment
corridor, or placement corridor.

## Audit decision

Use TripoSR as the first proof-only local generation candidate.

This is not a production admission. It only selects the smallest next proof path
for generating one raw test asset outside the repository and outside any O3DE
project.

Why TripoSR first:

- permissive MIT license in the upstream repository
- single-image-to-3D scope is narrow enough for a first proof
- documented inference path can save reconstructed output to an operator-chosen
  output directory
- documented default inference budget is small enough to make a local proof more
  practical than larger model families
- output can feed a later Blender cleanup/conversion proof before any O3DE
  import is considered

Stable Fast 3D is the strongest second proof candidate because its output shape
is likely a better fit for O3DE source-asset import, but its Stability AI
Community License terms require explicit license/commercial review before it
becomes the first local proof backend.

Hunyuan3D-2 and TRELLIS remain promising later candidates for higher-quality or
more versatile generation, but they need additional license, hardware,
dependency, and output-format review before they are used in this project.

Blender automation is selected as the likely cleanup/conversion layer, not as a
generation backend.

## Candidate comparison

| Candidate | Inputs | Outputs | Hardware needs | License/commercial risk | O3DE import fit | Audit decision |
| --- | --- | --- | --- | --- | --- | --- |
| Hunyuan3D-2 | Image-to-shape, multiview image-to-shape, texture generation, and related text/image workflows depending on selected release. | Upstream examples return a mesh object that can be saved to GLB, OBJ, or other supported mesh formats. | Upstream documentation lists about 6 GB VRAM for shape generation and about 16 GB total for shape plus texture generation. | Tencent Hunyuan community license has territory exclusions, use restrictions, and a monthly-active-user commercial threshold; legal/operator review is required. | Promising for high-quality source mesh generation after cleanup/conversion. | Later high-quality candidate, not first proof. |
| TRELLIS | Image-to-3D and text-to-3D. | Structured 3D latent outputs, including mesh, radiance-field, and 3D Gaussian style representations. | Likely NVIDIA/Linux/VRAM-heavy for practical local proof; exact local Windows feasibility must be audited. | Upstream repo marks the main models/code as MIT, but submodules have separate licenses that must be reviewed. | Promising for later high-fidelity research lanes after conversion to O3DE-friendly formats. | Later research candidate, not first proof. |
| Stable Fast 3D | Image-to-3D. | Mesh with UV/material-oriented output suitable for GLB-style proof flows. | Intended for fast reconstruction, but local GPU/Windows requirements must still be verified. | Stability AI Community License allows limited free commercial use below a revenue threshold and requires registration for commercial use; production use needs operator/legal approval. | Strong O3DE import fit candidate after cleanup/conversion because UV/material output is directly useful. | Strong second candidate after license review. |
| TripoSR | Single-image-to-3D. | Reconstructed 3D model output in an operator-selected output directory, with texture baking options. | Upstream README states the default single-image path takes about 6 GB VRAM. | Upstream repository is MIT licensed; model weights and any third-party dependencies still need capture in the proof packet. | Good first raw mesh proof candidate; cleanup/conversion will be needed before O3DE import. | First proof-only candidate. |
| Blender automation | Generated GLB, OBJ, FBX, textures, material maps, and metadata. | Normalized GLB/FBX/source-asset candidates plus metadata. | CPU is enough for many conversion tasks; GPU may help preview/rendering but must not be required without audit. | Blender itself is GPL; scripts using Blender APIs need license review before distribution, and generated asset/model licenses remain separate. | Central conversion layer for scale, pivot, mesh cleanup, texture packing, format export, and later collision/LOD preparation. | Cleanup/conversion layer, not generator. |

## First proof-only path

Next Forge packet:

```text
Branch:
codex/ai-asset-forge-local-generation-proof

PR title:
Prove local AI asset generation outside O3DE
```

Purpose:

Run one proof-only TripoSR local generation outside the repository and outside
any O3DE project, producing one raw generated asset candidate plus a provenance
summary.

Required boundaries:

- obtain explicit operator approval before any model download, dependency
  installation, or large cache creation
- keep model weights outside this repository
- keep generated outputs outside this repository
- keep generated outputs outside O3DE projects
- do not stage generated assets into O3DE
- do not run Asset Processor or AssetProcessorBatch
- do not commit model weights, generated assets, cache files, or raw proof
  artifacts
- commit only small docs/provenance summaries if a later proof packet explicitly
  allows them

## Storage and isolation requirements

Future proof packets must use operator-approved paths and record them before any
download or generation happens.

Recommended default categories:

- model cache: outside the repo and outside O3DE projects
- inference workspace: outside the repo and outside O3DE projects
- raw generated outputs: outside the repo and outside O3DE projects
- proof summaries: ignored runtime artifacts unless a checkpoint explicitly
  allows a small sanitized summary
- O3DE source-asset staging: forbidden until Forge Phase 3/4 design and explicit
  mutation approval

No future packet may use `docs/`, `backend/`, `frontend/`, `Cache/`, or an O3DE
project source folder as the default raw generation output location.

## License gate

Before using any model backend for production or commercial work, a later packet
must record:

- upstream repository URL
- model/source license URL
- model weights license URL if separate
- license version or retrieval date
- commercial use status
- attribution or notice requirements
- revenue, territory, hosted-service, or user-count restrictions
- whether outputs can be used internally, as prototypes, or as final assets
- operator/legal approval state

The first proof may only be described as internal/prototype unless those fields
are explicitly reviewed and approved.

## Hardware gate

Before any local generation proof runs, the proof packet must record:

- operating system
- Python/runtime requirements
- GPU model if used
- VRAM available
- CUDA/PyTorch requirements if used
- expected model/cache size
- expected output size
- fallback behavior if local hardware is insufficient

If the local machine does not satisfy the selected backend's minimum practical
requirements, the packet must stop at readiness/blocker documentation rather
than installing broad dependencies or trying unrelated backends.

## O3DE import gate

This audit does not admit O3DE import.

Generated assets must not enter an O3DE project until later packets have:

1. Proven local generation outside O3DE.
2. Proven cleanup/conversion outside O3DE.
3. Designed staging folder, naming, and provenance conventions.
4. Received explicit operator approval for one proof-only source-asset staging
   mutation.
5. Used Phase 9 readback to prove source/product/dependency/catalog evidence.
6. Produced an operator review packet.

## Provenance fields for first proof

The first local generation proof must capture:

- backend name
- backend repository URL
- backend commit/tag
- model name/version
- model license URL
- model download source
- prompt or input image/reference path
- seed/settings if available
- generation timestamp
- machine/runtime summary
- raw output path
- output file hashes
- output format
- whether the output stayed outside the repo
- whether the output stayed outside O3DE projects
- operator approval state
- next cleanup/conversion recommendation

## Final rule

No AI Asset Forge implementation packet may download models, add dependencies,
generate assets, stage imports, run Asset Processor, or place assets in O3DE
until the packet explicitly passes the relevant license, hardware, storage,
provenance, and mutation gates.

The next allowed Forge packet is a proof-only local TripoSR generation packet
outside O3DE, with explicit operator approval for any downloads or dependency
installation.

## References

- Hunyuan3D-2 repository: <https://github.com/Tencent-Hunyuan/Hunyuan3D-2>
- Hunyuan3D-2 license: <https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2/main/LICENSE>
- TRELLIS repository: <https://github.com/microsoft/TRELLIS>
- Stable Fast 3D repository: <https://github.com/Stability-AI/stable-fast-3d>
- Stable Fast 3D license: <https://raw.githubusercontent.com/Stability-AI/stable-fast-3d/main/LICENSE.md>
- TripoSR repository: <https://github.com/VAST-AI-Research/TripoSR>
- Blender Python API documentation: <https://docs.blender.org/api/current/index.html>
- Blender license documentation: <https://developer.blender.org/docs/license>
