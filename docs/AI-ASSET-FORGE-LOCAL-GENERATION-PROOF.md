# O3DE AI Asset Forge Local Generation Proof

## Purpose

This packet records the first proof-only local AI 3D generation run for O3DE AI
Asset Forge.

The proof verifies that the selected open-source TripoSR path can produce one
raw mesh candidate outside this repository and outside any O3DE project.

This is not an O3DE import, Asset Processor, assignment, placement, or
production-admission packet.

## Proof decision

TripoSR is confirmed as a working first proof-only local generation backend on
this machine using CPU execution.

The proof produced one OBJ mesh from the upstream TripoSR example input.

## Boundaries preserved

- no repo dependency files changed
- no lockfiles changed
- no backend runtime code changed
- no frontend code changed
- no O3DE project files changed
- no generated asset staged into an O3DE project
- no Asset Processor or AssetProcessorBatch execution
- no generated asset committed
- no model weights committed
- no cache files committed
- no public import, assignment, or placement corridor admitted

## External proof workspace

All proof-only artifacts were kept outside the repository:

```text
C:\Users\topgu\O3DE\AIAssetForge
```

External paths used:

```text
TripoSR clone:
C:\Users\topgu\O3DE\AIAssetForge\TripoSR

CPU proof virtual environment:
C:\Users\topgu\O3DE\AIAssetForge\venv-triposr-cpu

Hugging Face / model cache:
C:\Users\topgu\O3DE\AIAssetForge\model-cache\huggingface

Generated output:
C:\Users\topgu\O3DE\AIAssetForge\outputs\triposr-chair-20260427-072555\0\mesh.obj
```

Those paths are local proof evidence only. They must not be committed.

## Source and model provenance

Backend:
TripoSR.

Upstream repository:
<https://github.com/VAST-AI-Research/TripoSR>

Local upstream commit:

```text
d26e33181947bbbc4c6fc0f5734e1ec6c080956e
```

Model:

```text
stabilityai/TripoSR
```

Input image:

```text
C:\Users\topgu\O3DE\AIAssetForge\TripoSR\examples\chair.png
```

Output format:

```text
OBJ
```

## Environment

Observed local hardware:

```text
NVIDIA GeForce RTX 3070 Laptop GPU
8192 MiB VRAM
NVIDIA driver 577.00
CUDA driver capability 12.9
```

Observed Python and key packages:

```text
Python 3.11.9
torch 2.11.0+cpu
torch.cuda.is_available(): false
trimesh 4.0.5
transformers 4.35.0
huggingface_hub 0.17.3
```

## Proof commands

The first CUDA-wheel dependency attempt installed PyTorch CUDA locally in an
external venv but did not complete TripoSR dependency installation because
`torchmcubes` required a local CUDA toolkit/NVCC path during native build.

The proof then used a CPU PyTorch environment to avoid system CUDA/toolkit
installation:

```powershell
python -m venv C:\Users\topgu\O3DE\AIAssetForge\venv-triposr-cpu
C:\Users\topgu\O3DE\AIAssetForge\venv-triposr-cpu\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
C:\Users\topgu\O3DE\AIAssetForge\venv-triposr-cpu\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
C:\Users\topgu\O3DE\AIAssetForge\venv-triposr-cpu\Scripts\python.exe -m pip install -r C:\Users\topgu\O3DE\AIAssetForge\TripoSR\requirements.txt
C:\Users\topgu\O3DE\AIAssetForge\venv-triposr-cpu\Scripts\python.exe -m pip install onnxruntime
```

The successful proof command:

```powershell
$env:HF_HOME="C:\Users\topgu\O3DE\AIAssetForge\model-cache\huggingface"
$env:TRANSFORMERS_CACHE="C:\Users\topgu\O3DE\AIAssetForge\model-cache\huggingface\transformers"
C:\Users\topgu\O3DE\AIAssetForge\venv-triposr-cpu\Scripts\python.exe C:\Users\topgu\O3DE\AIAssetForge\TripoSR\run.py C:\Users\topgu\O3DE\AIAssetForge\TripoSR\examples\chair.png --device cpu --no-remove-bg --output-dir C:\Users\topgu\O3DE\AIAssetForge\outputs\triposr-chair-20260427-072555 --model-save-format obj --mc-resolution 64 --chunk-size 2048
```

The output subdirectory
`C:\Users\topgu\O3DE\AIAssetForge\outputs\triposr-chair-20260427-072555\0`
was pre-created because upstream `run.py` does not create it when
`--no-remove-bg` is used.

## Proof result

Status:

```text
succeeded
```

Generated mesh:

```text
C:\Users\topgu\O3DE\AIAssetForge\outputs\triposr-chair-20260427-072555\0\mesh.obj
```

Mesh file size:

```text
305009 bytes
```

SHA-256:

```text
1AE08CFE6D7F48072B6D491B1AD7EC400C124099A23928219723390420E312D7
```

Observed OBJ counts:

```text
vertices: 3016
faces: 6000
```

Timing from TripoSR logs:

```text
model initialization: 4181.18 ms
image processing: 16.39 ms
model inference: 8674.04 ms
mesh extraction: 909.29 ms
mesh export: 16.00 ms
```

## Findings

The first proof demonstrates:

- TripoSR can run locally from the open-source repository.
- The model weights can be cached outside the repo.
- A raw OBJ mesh can be generated outside the repo and outside O3DE projects.
- CPU execution is viable for a bounded proof, even without local CUDA toolkit
  installation.
- The upstream example path needs a small operational workaround when
  `--no-remove-bg` is used: pre-create the per-image output directory.

The proof does not demonstrate:

- production-quality generated assets
- prompt-to-3D generation
- custom image/reference input quality
- cleanup/conversion readiness
- GLB/FBX export suitability for O3DE
- material or texture readiness
- O3DE source-asset staging
- Asset Processor product generation
- Asset Database or Asset Catalog readback for generated assets
- operator review UI
- entity assignment or placement

## Next required Forge packet

```text
Branch:
codex/ai-asset-forge-cleanup-conversion-proof

PR title:
Prove AI Asset Forge cleanup conversion outside O3DE
```

Purpose:

Use the generated OBJ as a local proof input and prove a cleanup/conversion
step outside O3DE. The next proof should inspect mesh scale/origin/material
state, produce normalized metadata, and decide whether Blender automation is the
right conversion layer before any O3DE import is designed.

## Final rule

This proof confirms local generation only.

Generated assets still must not enter O3DE until a later import-readiness design
packet and an explicitly approved proof-only staging packet exist. O3DE
usability must still be proven through Phase 9 source/product/dependency/catalog
readback and operator review.
