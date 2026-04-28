# Asset Forge Reference Matrix

Status: reference model for product and technical inspiration

## Meshy-like references

Use Meshy as a workflow reference, not as branding to copy.

Useful concepts:
- text or image based 3D generation entrypoint
- task-based generation
- preview stage before final refinement
- refinement and texture stages
- downloadable/exportable output formats
- candidate review before final use

Asset Forge adaptation:
- preview candidates become candidate cards
- refine/texture become blocked or planned buttons until providers are admitted
- output download becomes isolated artifact retrieval first
- O3DE staging requires approval and evidence

## Blender-like references

Use Blender as the preparation and inspection reference.

Useful concepts:
- object hierarchy and inspector thinking
- import/export format control
- transform application
- scale/origin normalization
- mesh cleanup
- normals, UVs, material slots, and texture checks
- scripted background processing for repeatable pipelines

Asset Forge adaptation:
- Blender is a visible panel in the GUI
- operations are allowlisted tool presets
- raw user scripts are not a product feature
- every run creates a structured prep report

## O3DE-specific references

Use O3DE as the destination truth model.

Important O3DE concepts:
- source assets are portable inputs
- product assets are Asset Processor outputs
- Asset Processor and assetdb evidence matter
- asset catalog/product-path evidence matters where available
- prefab/material/reference mutation can be risky
- Editor placement must stay within admitted surfaces

Asset Forge adaptation:
- source staging and product evidence are separate UI states
- ingest review is read-only before mutation expands
- placement is plan-only until exact admitted paths exist
- rollback state is explicit

## Existing repo references

Codex should inspect existing files before implementation, especially:
- `docs/AI-ASSET-FORGE-*`
- `docs/PHASE-9-*`
- frontend route/navigation files
- backend capability registry
- backend policy
- backend adapters
- backend planners
- backend tests
- frontend build/test config
