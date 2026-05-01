# Codex Handoff — Asset Forge Production Path

Use this prompt after copying this folder into the repository.

## Mission

Move Asset Forge toward its intended product: a Meshy-like 3D asset generation studio with Blender-grade preparation tools and safe O3DE ingestion/review.

The immediate priority is the GUI and product shell. The user specifically says the product does not feel thought out like Meshy and Blender.

## First actions

1. Verify repo root and origin.
2. Check branch and working tree state.
3. Read this folder in the README order.
4. Inspect existing Asset Forge docs and code.
5. Inspect frontend routing, layout, and build system.
6. Select the smallest safe packet.

## Required repo checks

```powershell
git rev-parse --show-toplevel
git remote get-url origin
git status --short
git branch --show-current
```

Expected repo:

```text
openclaworhchestratorx951357-alt/O3de_CODEX_VX001
```

## Frontend discovery

```powershell
Get-ChildItem -Recurse -File frontend | Select-Object FullName
Get-ChildItem -Recurse -File . | Where-Object {
  $_.FullName -match "frontend|vite|react|tsx|jsx|route|component|asset|forge|dashboard|studio"
} | Select-Object FullName
```

Also inspect:
- `package.json`
- `vite.config.*`
- `tsconfig.json`
- frontend test/build scripts
- existing navigation/sidebar components
- existing status chip/card/timeline components

## Backend discovery

Inspect likely files:
- `backend/app/services/capability_registry.py`
- `backend/app/services/policy.py`
- `backend/app/services/dispatcher.py`
- `backend/app/services/prompt_orchestrator.py`
- `backend/app/services/adapters.py`
- `backend/app/services/planners/`
- `backend/tests/`

Also search:
- Asset Forge
- AI Asset Forge
- asset.source.inspect
- provider
- Blender
- generated assets
- candidate
- staging

## Default packet

If no stronger repo truth says otherwise, implement:

```text
Packet 01 — Asset Forge Studio GUI shell with truthful demo state
```

## Packet 01 exact requirements

Add or upgrade the frontend so Asset Forge has a first-class studio page with:

- studio header
- status chips
- generation workspace
- four demo candidate cards
- selected candidate inspector
- Blender Prep panel
- O3DE ingest/review panel
- evidence timeline
- settings/status panel
- typed demo state if TypeScript is used
- visible plan-only/demo/blocked labels

Do not:
- call external providers
- run Blender
- mutate O3DE projects
- create real generated assets
- claim production readiness
- claim real generation

## Validation

Run the narrowest relevant commands that exist in the repo.

Possible commands:
- `npm run build`
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `pwsh -File .\\scripts\\dev.ps1 frontend-build`
- `pwsh -File .\\scripts\\dev.ps1 frontend-lint`
- `pwsh -File .\\scripts\\dev.ps1 checks`

If a command does not exist, report it as missing and do not treat it as a failed product test.

## Required final report

Include:

- repo root
- origin
- branch
- files changed
- GUI route/page added
- components added
- state/types added
- styling/layout changes
- tests/build commands and results
- capability delta
- remaining blockers
- safest next packet
- revert path

Capability delta example:

```text
Asset Forge GUI: M1 concept/docs -> M3 plan-only/demo studio shell
Blender Prep GUI: M1 concept/docs -> M3 visible preflight/planned tool surface
O3DE Ingest GUI: M1 concept/docs -> M3 plan-only review surface
```

## Current Packet 01 status snapshot (2026-04-28)

- Asset Forge studio shell is present as a first-class frontend surface.
- Typed demo state is in use for Packet 01 UI content.
- Packet 01 demo lock is active in app/runtime:
  - no external provider execution
  - no Blender execution
  - no O3DE mutation/write execution
- Non-real states are visibly labeled as `demo`, `plan-only`, `preflight-only`, or `blocked`.
- Conservative capability-delta copy is rendered in the settings/status panel.

Most recent validated commands:

- `npm run lint` (warnings only, no errors)
- `npm run typecheck` (pass)
- `npm run build` (pass)
- `npm test -- --run src/components/AssetForgeStudioPacket01.test.tsx src/App.test.tsx src/App.desktop-hydration.test.tsx` (pass)

Packet 01 guardrail note:

- `AssetForgeStudioPacket01` keeps runtime execution blocked in app/runtime.
- Vitest mode keeps mocked runtime-path coverage available so regression tests can still verify parsing and UI behavior without enabling real execution in product runtime.

## Current Blender editor handoff snapshot (2026-05-01)

Start new Asset Forge editor threads from
`docs/asset-forge/ASSET-FORGE-BLENDER-EDITOR-CURRENT-HANDOFF.md`.

Current integration branch and savepoint:

- branch: `codex/asset-forge-prompt-prefill-polish`
- current commit: `4d5bc42 Add cockpit app registry foundation`
- protected visual tag: `asset-forge-blender-layout-polished`
- protected visual commit: `821710a Polish Asset Forge Blender-like editor layout`

Current capability truth:

- Asset Forge has a full-screen Blender-style editor shell.
- The editor consumes backend `/asset-forge/editor-model` where available and
  preserves static fallback if unavailable.
- Tools, menus, workflow stages, status strip tabs, outliner, transform,
  properties, material preview, prompt templates, and blocked capabilities are
  backend-model supported.
- Frontend interactions are local/editor-like only: menu dropdowns, selected
  tools, selected outliner nodes, viewport mode switching, transform draft
  editing, properties tabs, bottom tabs, and prompt-template preview/copy/open.
- `frontend/src/lib/cockpitAppRegistry.ts` now registers Asset Forge as a
  first-class `full-screen-editor` cockpit.

Safety truth:

- `execution_admitted=false`
- `mutation_admitted=false`
- `provider_generation_admitted=false`
- `blender_execution_admitted=false`
- `asset_processor_execution_admitted=false`
- `placement_write_admitted=false`
- no prompt template auto-executes
- no UI tool click dispatches backend mutation

Next recommended packet:

- Add read-only backend `GET /cockpit-apps/registry`, then add frontend typed
  fetch support while preserving static fallback. Do not combine that with real
  generation, Blender, Asset Processor, placement, material mutation, or prompt
  auto-execution.

## Revert path

State exactly how to revert the commit. If only frontend/docs changed, say so. If runtime artifacts were created, list them and how to remove them.
