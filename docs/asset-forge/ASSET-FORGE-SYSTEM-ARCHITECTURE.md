# Asset Forge System Architecture

Status: architecture contract for future implementation

## Role in the repo

Asset Forge is a multi-stage orchestration lane. It should compose existing control-plane systems instead of bypassing them.

It sits above:
- prompt orchestration
- capability registry
- policy/admission
- provider integration
- Blender tooling
- O3DE project/staging logic
- Phase 9 asset readback
- Editor placement lanes
- evidence and review surfaces

## High-level architecture

```text
Frontend Asset Forge Studio
  -> backend Asset Forge API or planner entrypoint
  -> capability registry and policy
  -> provider adapter / local intake adapter
  -> candidate artifact store
  -> Blender preflight and prep adapter
  -> O3DE staging planner
  -> Asset Processor / assetdb / catalog readback
  -> Editor placement planner or admitted adapter
  -> evidence bundle
  -> GUI review timeline
```

## Core services

### Asset Forge planner

Responsibilities:
- translate user intent into typed Asset Forge operations
- reject open-ended execution
- select admitted capabilities only
- produce plan-only responses when execution is blocked
- preserve provider, Blender, O3DE, and Editor boundaries

### Provider adapter

Responsibilities:
- represent generation providers behind a safe interface
- report provider mode: disabled, mock, configured, real
- create provider tasks only when admitted
- record cost/provenance metadata
- fetch outputs only into isolated runtime workspace
- never write directly into an O3DE project

### Local intake adapter

Responsibilities:
- import user-supplied model references into an isolated workspace
- validate allowed extensions
- record provenance
- make the imported file a candidate
- do not mutate O3DE project paths directly

### Blender bridge adapter

Responsibilities:
- detect Blender executable and version
- run only repo-owned allowlisted scripts
- support read-only inspection before mutation
- output structured prep reports
- export prepared files into isolated runtime workspace
- never expose raw script execution as a product feature

### O3DE staging adapter

Responsibilities:
- create a staging plan
- require approval for project writes
- write deterministic source paths only inside approved generated asset folders
- write manifest/provenance sidecar
- leave product generation to Asset Processor

### O3DE ingest reviewer

Responsibilities:
- read asset database where available
- read asset catalog evidence where available
- report product paths and dependency evidence
- report freshness and missing-substrate warnings
- avoid mutating the project

### Editor placement lane

Responsibilities:
- plan placement before execution
- execute only already admitted exact placement operations
- return Editor readback evidence
- refuse broad scene or prefab mutation until proven

### Evidence builder

Responsibilities:
- collect task, candidate, provider, Blender, O3DE, Editor, approval, and warning events
- distinguish verified facts from assumptions
- create operator-facing review bundles

## Suggested runtime workspace

Before any O3DE project write, use an isolated runtime workspace:

```text
backend/runtime/asset_forge/
  tasks/
  candidates/
  provider_outputs/
  imported_sources/
  blender_reports/
  prepared_exports/
  o3de_stage_plans/
  review_bundles/
```

Runtime artifacts should stay out of commits.

## Suggested backend data models

### AssetForgeTask

Fields:
- task_id
- created_at
- prompt
- references
- target_use
- style
- output_preference
- provider_mode
- status
- approval_state
- evidence_ids

### AssetForgeCandidate

Fields:
- candidate_id
- task_id
- source_kind
- provider_task_id
- status
- source_artifact
- prepared_artifact
- formats
- scores
- warnings
- evidence_ids
- selected

### BlenderPrepReport

Fields:
- report_id
- candidate_id
- blender_version
- input_artifact
- output_artifact
- geometry_stats
- material_stats
- texture_stats
- action_log
- warnings
- success

### O3DEIngestPlan

Fields:
- plan_id
- candidate_id
- project_root
- staging_path
- source_asset_path
- expected_products
- approval_required
- mutation_admitted
- warnings

### AssetForgeEvidenceBundle

Fields:
- bundle_id
- task_id
- candidate_id
- events
- verified_facts
- assumptions
- warnings
- artifacts
- rollback_status
- safest_next_step

## Integration order

1. GUI shell with typed demo state.
2. Backend model definitions without external execution.
3. Capability registry entries with honest maturity states.
4. Provider configuration/preflight status.
5. Blender executable detection.
6. Blender read-only inspection.
7. Blender allowlisted prep scripts.
8. O3DE staging plan.
9. Approval-gated O3DE source staging.
10. Asset Processor and assetdb evidence.
11. Editor placement planning.
12. Admitted placement only after exact proof.

## Current editor/cockpit state (2026-05-01)

The current Asset Forge frontend has moved beyond the original dashboard-style
GUI shell. It now uses a full-screen Blender-style editor frame with a compact
top menu, left tool shelf, dominant central viewport, right outliner/properties
stack, and bottom timeline/status strip.

Backend support now exists for the editor model through
`GET /asset-forge/editor-model`. That model supplies tool metadata, menu
groups, workflow stages, status strip tabs, outliner rows, transform values,
property rows, material preview metadata, prompt templates, and blocked
capability reasons. The frontend preserves a static fallback when the backend
model is unavailable.

The app-wide cockpit registry foundation currently lives in frontend code at
`frontend/src/lib/cockpitAppRegistry.ts`. It registers Create Game, Create
Movie, Load Project, and Asset Forge, with Asset Forge marked as
`full-screen-editor`. A future backend contract should expose the same registry
read-only as `GET /cockpit-apps/registry`.

This current editor state remains non-mutating:

- tool clicks select local UI state only
- transform edits are local draft values only
- Apply remains blocked
- prompt templates are preview/copy/open only
- no provider generation, Blender execution, Asset Processor execution,
  placement write, material mutation, prefab mutation, or broad asset mutation
  is admitted
