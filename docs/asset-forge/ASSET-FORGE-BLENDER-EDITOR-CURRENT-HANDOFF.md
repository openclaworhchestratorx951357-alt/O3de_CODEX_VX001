# Asset Forge Blender Editor Current Handoff

Status date: 2026-05-01

Use this handoff when starting a new thread on Asset Forge, cockpit apps, or
Prompt Studio handoff work. It captures the current momentum so future threads
do not revert to the older dashboard/card layout or accidentally widen runtime
capability.

## Current branch and savepoints

- Current integration branch: `codex/asset-forge-prompt-prefill-polish`
- Current integration commit: `4d5bc42 Add cockpit app registry foundation`
- Protected visual savepoint tag: `asset-forge-blender-layout-polished`
- Protected visual savepoint commit: `821710a Polish Asset Forge Blender-like editor layout`
- Draft PR note: PR #188 was opened for the cockpit registry slice and then
  closed after the commit was fast-forwarded into the integration branch.

Before editing, verify:

```powershell
git fetch origin --prune --tags
git switch codex/asset-forge-prompt-prefill-polish
git pull --ff-only origin codex/asset-forge-prompt-prefill-polish
git status --short --untracked-files=no
git rev-parse --short HEAD
git rev-parse --short asset-forge-blender-layout-polished
```

Expected current head at this handoff is `4d5bc42`. If the branch has moved,
read the newer commits before choosing a packet.

## Current product truth

Asset Forge now has a full-screen Blender-style editor direction, not just
dashboard cards.

Current implemented behavior:

- Asset Forge opens outside the normal desktop shell as its own full-screen
  workspace.
- The editor frame keeps a compact top menu, left tool shelf, dominant central
  grid/wireframe viewport, right outliner/properties stack, and bottom
  timeline/status strip.
- Left tools are selectable in frontend state.
- Top menus open dropdowns.
- Outliner rows select active objects locally.
- Viewport modes switch locally.
- Transform fields edit local draft values only.
- Transform Apply remains blocked.
- Material, Proof, Safety, and bottom status tabs switch locally.
- Prompt templates can be previewed/copied/opened in Prompt Studio without
  auto-execution.
- Backend `/asset-forge/editor-model` supplies editor-model contract data for
  tools, menus, workflow stages, status strip tabs, outliner, transform,
  properties, material preview, prompt templates, and blocked capabilities.
- Frontend keeps a static fallback if the backend editor model is unavailable.
- Frontend `cockpitAppRegistry` now registers Asset Forge as a first-class
  `full-screen-editor` cockpit alongside Create Game, Create Movie, and Load
  Project.

## Safety truth

No current Asset Forge editor or cockpit-registry slice admits:

- provider generation
- real Blender execution
- Asset Processor execution
- O3DE project writes
- placement writes
- material mutation
- prefab mutation
- broad asset mutation
- arbitrary shell execution
- arbitrary Python execution
- arbitrary Editor script execution
- automatic prompt execution
- backend dispatch from simple UI clicks

All current editor/cockpit registry admission flags remain false:

```text
execution_admitted=false
mutation_admitted=false
provider_generation_admitted=false
blender_execution_admitted=false
asset_processor_execution_admitted=false
placement_write_admitted=false
```

The Blender reference is a UI/editor-interaction target only. It does not mean
Blender itself is admitted as an execution dependency.

## Recent implementation stack

The important recent commits, newest first:

- `4d5bc42` - adds typed frontend cockpit app registry foundation and marks
  Asset Forge as `full-screen-editor`.
- `64aeb88` - uses backend Asset Forge property content for transform draft
  seed/reset, material rows, and blocked capability safety rows.
- `1f9d011` - uses backend Asset Forge properties tabs and material preview
  tabs.
- `ae33131` - moves Asset Forge workflow stages and status strip tabs into the
  backend editor model.
- `317bdd3` - moves editor menu groups into the backend editor model.
- `ccd083c` - preserves Asset Forge prompt template source handoff.
- `821710a` - protected polished Blender-like editor layout savepoint.

## Code anchors

Backend editor model:

- `backend/app/services/asset_forge_editor_model.py`
- `backend/app/api/routes/asset_forge.py`
- `backend/app/main.py`
- `backend/tests/test_api_routes.py`

Frontend Asset Forge editor:

- `frontend/src/components/assetForge/AssetForgeBlenderCockpit.tsx`
- `frontend/src/components/assetForge/AssetForgeBlenderCockpit.test.tsx`
- `frontend/src/components/AIAssetForgePanel.tsx`
- `frontend/src/types/contracts.ts`
- `frontend/src/lib/api.ts`

Cockpit registry:

- `frontend/src/lib/cockpitAppRegistry.ts`
- `frontend/src/lib/cockpitAppRegistry.test.ts`
- `frontend/src/components/HomeCockpitLaunchPanel.tsx`
- `frontend/src/components/HomeCockpitLaunchPanel.test.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/AppControlCommandCenter.tsx`

## Validation baseline

Most recent green validation on the integration branch:

```powershell
cd frontend
npm test -- --run src/lib/cockpitAppRegistry.test.ts src/components/HomeCockpitLaunchPanel.test.tsx src/components/AppControlCommandCenter.test.tsx src/App.test.tsx
npm run build
npm test -- --run
cd ..
git diff --check
```

Results from the latest slice:

- targeted frontend suite passed: 4 files, 28 tests
- frontend build passed
- full frontend suite passed: 69 files, 347 tests
- `git diff --check` passed

Recent backend editor-model validation also passed:

```powershell
python -m pytest backend/tests/test_api_routes.py -k "asset_forge_editor_model" -q
```

## Next packets

Recommended next packet:

1. Add backend read-only cockpit registry endpoint:
   `GET /cockpit-apps/registry`.
2. Mirror the frontend `cockpitAppRegistry` data into a backend service with
   all execution/mutation admission flags false.
3. Add backend route tests proving Asset Forge is `full-screen-editor`, all
   dangerous admission flags are false, blocked capabilities include reasons
   and next unlocks, and no success/mutation wording appears.
4. Add frontend TypeScript API types and `fetchCockpitAppRegistry`.
5. In a later packet only, make the frontend consume the backend cockpit
   registry with static fallback preserved.

Do not combine the backend registry endpoint with real generation, Blender,
Asset Processor, placement, material mutation, or prompt auto-execution.

## Avoid regressions

Do not:

- restore the older dashboard/card Asset Forge layout as the main surface
- shrink the central viewport below the side panels
- show visible `LEFT`, `CENTER`, `RIGHT`, or `BOTTOM` prototype labels
- treat prompt-template load/copy as execution
- call backend mutation or dispatch from tool clicks
- call Blender or Asset Processor from the editor UI
- edit `AGENTS.md` or
  `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md` without explicit direct
  operator instruction

If visual work continues, preserve the Blender structure:

```text
top menu
left tool shelf
dominant center viewport
right outliner/properties
bottom timeline/status strip
```

## Restore paths

Restore the polished visual baseline:

```powershell
git checkout asset-forge-blender-layout-polished -- frontend/src/components/assetForge/AssetForgeBlenderCockpit.tsx frontend/src/components/AIAssetForgePanel.tsx
```

Revert current cockpit registry foundation:

```powershell
git revert 4d5bc42
```

Revert backend property-content integration:

```powershell
git revert 64aeb88
```

Use the narrowest revert that matches the regression. Do not reset the whole
branch unless the operator explicitly asks for destructive history changes.
