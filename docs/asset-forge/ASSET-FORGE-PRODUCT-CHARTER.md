# Asset Forge Product Charter

Status: product intent and production-mode north star

## Mission

Asset Forge is the natural-language 3D asset studio inside the O3DE control plane.

It should let an operator describe an asset, provide visual or text references, review generated or imported candidates, prepare the selected model with Blender-grade tooling, stage the result into an O3DE project, and review the resulting O3DE evidence.

Asset Forge is not only an Asset Processor status page. It is not only a file importer. It is not only a material utility. Those are supporting pieces.

## Product promise

The product promise is:

> Describe the asset you want. Review candidate models. Prepare the selected asset with Blender-grade checks. Stage it safely into O3DE with evidence.

## Target workflow

1. **Creative request**
   - text prompt
   - reference image placeholder
   - multiple reference placeholders
   - existing model import placeholder

2. **Generation or intake**
   - create provider task
   - import existing GLB, FBX, or OBJ
   - record provenance
   - return candidate metadata

3. **Candidate review**
   - show multiple candidate cards
   - compare geometry, texture, and O3DE readiness
   - mark candidates as selected, rejected, failed, or staged

4. **Blender preparation**
   - detect Blender
   - inspect model
   - normalize scale and origin
   - check geometry
   - check materials and textures
   - export into an O3DE-friendly source format
   - write a prep report

5. **O3DE staging**
   - create a deterministic staging plan
   - require approval before writing to the O3DE project
   - write provenance sidecar or manifest
   - keep original provider output and prepared output traceable

6. **O3DE ingest review**
   - inspect asset database evidence
   - inspect product paths
   - inspect asset catalog presence when available
   - report warnings and missing evidence

7. **Editor placement**
   - plan placement first
   - execute only exact admitted placement operations
   - capture Editor readback evidence

8. **Review and revision**
   - present a final evidence bundle
   - allow retry or refine
   - clearly state rollback or restore status

## Reference behavior

A Meshy-like product flow is useful because it separates preview candidates, refine, texture, and export/download stages.

A Blender-like tool flow is useful because generated assets need technical cleanup before engine use: transform application, scale normalization, origin placement, mesh checks, normals, material slot checks, texture relinking, and format export.

O3DE remains the destination and validation layer. Asset Forge must stay aware of source assets, product assets, Asset Processor state, asset database evidence, asset catalog evidence, Editor placement, and rollback truth.

## Required product pillars

### 1. Generation workspace

The user should be able to define the desired asset with:
- prompt
- avoid list
- asset type
- style
- target use
- output format
- polycount target
- texture mode
- reference inputs

### 2. Candidate gallery

The user should see candidate variants before staging anything into O3DE. Candidate cards should show:
- preview slot
- candidate status
- output formats
- warnings
- geometry score placeholder
- texture score placeholder
- O3DE readiness score placeholder
- evidence IDs

### 3. Blender prep lane

Blender must be visible as an explicit preparation lane, not hidden behind a vague backend step.

The lane should show:
- preflight status
- import and normalize tools
- geometry checks
- material and texture checks
- rigging and animation checks
- export actions
- prep reports

### 4. O3DE ingest lane

The O3DE lane must show:
- staging path
- source asset path
- expected products
- Asset Processor status
- asset database evidence
- catalog evidence
- path/reference risks
- placement readiness

### 5. Evidence and review

Every operation should report:
- verified facts
- assumptions
- warnings
- artifact IDs
- approval state
- maturity state
- rollback state

## Maturity language

Use these labels consistently:

- missing
- planned
- plan-only
- demo
- simulated
- preflight-only
- gated-real
- admitted-real
- reviewable-real
- reversible-real
- blocked
- failed
- succeeded

## Production-mode definition

Asset Forge is production-mode only when:

- GUI exposes the full workflow coherently.
- Backend models exist for tasks, candidates, provider jobs, Blender reports, O3DE ingest, and evidence bundles.
- Provider execution is configurable, isolated, and policy-gated.
- Blender execution uses repo-owned scripts and allowlisted operations only.
- O3DE staging is deterministic, auditable, and approval-gated.
- Asset Processor, assetdb, and catalog evidence are captured.
- Editor placement is plan-only or admitted-real with exact proof.
- Every meaningful write has approval behavior and a documented revert or restore path.

## What stays blocked until proven

- broad asset folder mutation
- broad prefab rewrite
- broad material or shader mutation
- raw Blender script execution as a user feature
- raw Editor script execution as a user feature
- open provider submission without configuration and cost/provenance controls
- claiming rollback where no rollback exists
- claiming generated assets are game-ready without inspection evidence
