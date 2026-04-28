# Asset Forge GUI UX Spec

Status: frontend product specification for Asset Forge Studio

## Goal

Asset Forge must feel like a creative 3D asset studio, not a generic admin dashboard.

The page should communicate this within five seconds:

> Asset Forge is where I generate, prepare, stage, and review O3DE-ready 3D assets.

The first GUI packet may use static demo data, but every non-real state must be visibly labeled.

## Required route/page

Add Asset Forge as a first-class frontend route or page.

Suggested navigation label:

```text
Asset Forge
```

Suggested sub-navigation:

```text
Studio
Candidates
Blender Prep
O3DE Ingest
Evidence
Settings
```

## Preferred layout

Use the existing frontend style system and components where possible.

Preferred studio layout:
- left rail: prompt, reference, generation settings
- center: candidate gallery and preview
- right rail: selected candidate inspector and prep/ingest panels
- bottom or collapsible area: evidence timeline

Do not introduce a major UI library unless the repo already uses it or there is a specific reason.

## Studio header

Header content:
- title: `Asset Forge`
- subtitle: `Generate, prepare, and stage O3DE-ready 3D assets.`
- status chips:
  - Provider
  - Blender
  - O3DE ingest
  - Placement
  - Review
- visible truth note:
  - `Only admitted-real actions are executable. Planned, demo, and blocked actions are labeled.`

## Generation workspace

Inputs:
- prompt
- avoid list
- asset type
- style
- target use
- preferred output format
- polycount target
- texture mode
- reference input placeholders

Suggested options:

Asset type:
- prop
- character
- environment piece
- vehicle
- creature
- material test object
- other

Style:
- realistic
- stylized
- low-poly
- cinematic
- game-ready
- blockout

Target use:
- O3DE runtime prop
- cinematic asset
- blockout asset
- hero asset
- background asset

Output preference:
- glb
- fbx
- obj
- blend-source-planned

Texture mode:
- none
- base-color
- pbr-planned
- hd-pbr-planned

Buttons must be honest:
- Plan preview candidates
- Refine selected candidate
- Texture selected candidate
- Import existing model
- Send to Blender prep
- Stage for O3DE

Until backend support exists, disabled or blocked buttons should display why they are unavailable.

## Candidate gallery

Show four candidate cards by default.

Each candidate card should show:
- thumbnail or preview placeholder
- candidate name
- status chip
- demo warning when applicable
- output format tags
- geometry score placeholder
- texture score placeholder
- O3DE readiness score placeholder
- warnings count
- evidence id list
- actions:
  - select
  - compare
  - retry
  - reject
  - inspect

Demo candidates must say:

```text
Demo candidate — no real generation performed.
```

## Selected candidate inspector

Show details for the selected candidate.

Sections or tabs:
- Overview
- Geometry
- Materials
- Textures
- Rigging
- O3DE Readiness
- Evidence

Fields:
- source prompt
- generation stage
- provider mode
- selected output format
- dimensions placeholder
- scale placeholder
- polycount placeholder
- material slots placeholder
- texture maps placeholder
- rig/animation placeholder
- known warnings
- approval state
- evidence IDs

## Blender Prep panel

This panel is critical. Asset Forge is intended to feel like generation plus Blender-grade preparation.

Group tools by:

### Preflight
- detect Blender executable
- check version
- check import/export support
- check workspace
- check script policy

### Import and normalize
- import GLB or GLTF
- import FBX
- import OBJ
- normalize scale
- set origin
- apply transforms
- align to ground
- recenter asset

### Geometry cleanup
- remove loose geometry
- merge-by-distance plan
- recalculate normals plan
- non-manifold check
- decimation plan
- UV presence check

### Materials and textures
- detect material slots
- detect missing textures
- validate PBR map set
- relink texture plan
- material compatibility plan

### Rigging and animation
- detect armature
- detect animations
- check pose suitability
- auto-rig integration placeholder

### Export
- export GLB
- export FBX
- export O3DE staging format
- write manifest
- capture prep report

Each tool must show one state:
- missing
- planned
- preflight-only
- demo
- gated-real
- admitted-real
- blocked
- failed
- succeeded

The GUI must never expose raw Blender scripting as a user-facing feature.

## O3DE ingest and review panel

Show:
- source asset path
- staging folder
- source format
- expected product assets
- Asset Processor state
- asset identity placeholder
- product cache status
- warnings
- path/reference risk
- import/admission status
- placement readiness

Actions:
- inspect source asset
- plan O3DE staging
- stage source asset
- run ingest preflight
- review Asset Processor result
- plan place in level
- place in level only when admitted-real

Until staging and placement are admitted, these actions must be disabled, plan-only, or approval-gated.

## Evidence timeline

Show events such as:
- prompt submitted
- provider preview planned
- candidate selected
- Blender preflight run
- Blender prep planned or executed
- export artifact written
- O3DE ingest planned
- Asset Processor status captured
- Editor placement planned
- review completed
- rollback state recorded

Each event should show:
- time
- operation
- state
- verified versus assumed
- artifact ID if available
- approval requirement

## Settings panel

Show:
- generation provider registry
- provider mode
- API key presence flag only
- allowed output formats
- default staging directory
- Blender executable path status
- O3DE project root
- Asset Processor status
- default polycount target
- texture defaults
- approval policy
- retention policy

Never store secrets in frontend code.

## Frontend type suggestions

Adapt names to match repo conventions.

```ts
export type AssetForgeCapabilityState =
  | "missing"
  | "planned"
  | "plan_only"
  | "demo"
  | "simulated"
  | "preflight_only"
  | "gated_real"
  | "admitted_real"
  | "reviewable_real"
  | "reversible_real"
  | "blocked"
  | "failed"
  | "succeeded";

export type AssetForgeProviderMode =
  | "disabled"
  | "mock"
  | "configured"
  | "real";

export type AssetForgeCandidateStatus =
  | "demo"
  | "planned"
  | "preview_generated"
  | "refined"
  | "textured"
  | "rejected"
  | "failed"
  | "staged"
  | "ingested"
  | "placed";

export type AssetForgeCandidate = {
  id: string;
  name: string;
  prompt: string;
  status: AssetForgeCandidateStatus;
  providerMode: AssetForgeProviderMode;
  outputFormats: string[];
  thumbnailUrl?: string;
  previewModelUrl?: string;
  polycount?: number;
  geometryScore?: number;
  textureScore?: number;
  o3deReadinessScore?: number;
  warnings: string[];
  evidenceIds: string[];
  isDemo: boolean;
};

export type AssetForgeBlenderTool = {
  id: string;
  label: string;
  group:
    | "preflight"
    | "import_normalize"
    | "geometry_cleanup"
    | "materials_textures"
    | "rigging_animation"
    | "export";
  state: AssetForgeCapabilityState;
  description: string;
  requiresApproval: boolean;
};

export type AssetForgeEvidenceEvent = {
  id: string;
  time: string;
  operation: string;
  status: AssetForgeCapabilityState;
  verified: boolean;
  summary: string;
  artifactId?: string;
};
```

## Acceptance criteria

The first GUI implementation is acceptable only if:

1. Asset Forge appears as a visible page or route.
2. The page communicates the full studio workflow.
3. Required panels exist.
4. Non-real actions are visibly labeled.
5. Demo candidates are labeled as demo.
6. No button falsely implies real provider, Blender, or O3DE mutation support.
7. Frontend build passes.
8. The Codex report lists every frontend file changed.
