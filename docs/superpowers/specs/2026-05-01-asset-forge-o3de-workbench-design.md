# Asset Forge Over O3DE Workbench Design

Date: 2026-05-01

Status: design approved for planning, not implementation

## Summary

Asset Forge should become the visible product shell for the app. Users should
open Asset Forge, work inside an Asset Forge editor/workbench, and reach every
major O3DE-backed workflow through organized Asset Forge menus and panels.

O3DE remains the engine and tool substrate behind Asset Forge. The app should
continue using existing O3DE project, bridge, Asset Processor, records,
readback, runtime, and evidence code where it already exists. The visible user
experience should no longer feel like a generic O3DE Agent Control App with an
Asset Forge panel bolted on.

This design does not admit new execution or mutation.

## Current Baseline

The current branch already moved Asset Forge in the right direction:

- Asset Forge is the default app home when no valid workspace session exists.
- Asset Forge has a Blender-style editor layout with top menu, left tools,
  dominant viewport, right outliner/properties, and bottom status strip.
- The Asset Forge cockpit has an `App` menu that routes to existing workspaces.
- Backend-supported editor model contracts exist for the Asset Forge editor.
- Tool clicks and menu selections are UI/navigation only unless a separate
  admitted corridor exists.

The remaining product gap is that users can still see old app-shell language
and mental models. The next work should consolidate the product around Asset
Forge without deleting or hiding the O3DE engine truth.

## Goals

1. Make Asset Forge the visible application identity.
2. Present O3DE as the engine/tool substrate behind Asset Forge.
3. Preserve every existing workspace and O3DE-backed status surface.
4. Route major workflows through Asset Forge menus and editor panels.
5. Keep O3DE-specific labels only where they are useful technical truth:
   project target, bridge status, Asset Processor status, readback evidence,
   logs, safety gates, and runtime diagnostics.
6. Keep all unsafe actions blocked, preflight-only, proof-only, or plan-only
   until admitted by a separate exact corridor.

## Non-Goals

This design does not:

- run provider generation
- run Blender
- run Asset Processor
- mutate O3DE projects, levels, prefabs, assets, or materials
- admit placement writes
- admit arbitrary shell, Python, or Editor script execution
- auto-execute prompt templates
- delete existing O3DE service code
- rename backend code in a way that obscures evidence or history
- claim O3DE is gone

## Product Architecture

Use a three-layer model.

### Layer 1: Asset Forge Shell

The Asset Forge shell is the visible product:

- brand/title
- top menu bar
- mode/context strip
- central editor viewport
- left tool shelf
- right outliner/properties stack
- bottom timeline/evidence/log strip
- module navigation through menus

The shell should become the default place users land and the default place they
return to after completing a workflow.

### Layer 2: Asset Forge Workbench Modules

Existing app workspaces become Asset Forge modules. They should remain
functionally intact at first, but be reached and described through the Asset
Forge shell.

Initial module mapping:

| Asset Forge menu/module | Existing surface |
| --- | --- |
| Create > Game | Create Game workspace |
| Create > Movie | Create Movie workspace |
| Project > Load Project | Load Project workspace |
| Prompt > Prompt Studio | Prompt workspace |
| Build > Builder | Builder workspace |
| Ops > Operations | Operations workspace |
| Engine > Runtime | Runtime workspace |
| Records > Evidence | Records workspace |
| Safety > Gates | current truth/safety/readiness surfaces |

This mapping can start as navigation. Later packets can embed selected modules
into the right pane, bottom strip, or full workbench pages.

### Layer 3: O3DE Core Services

O3DE services remain real and explicit under the hood:

- project profile and project root
- O3DE bridge health
- readiness and adapter mode
- Asset Processor readiness/status
- records and evidence
- asset source/readback proofs
- cockpit app registry
- policy, dispatcher, prompt orchestration, and capability registry

The UI should phrase these as "Engine", "Project", "Processor", "Runtime",
"Evidence", or "Safety" services where possible, with O3DE named in technical
detail rows and logs.

## Navigation Design

The top visible shell should use Asset Forge menus instead of generic app tabs.

Recommended top-level menus:

- App
- File
- Create
- Project
- Asset
- View
- Tools
- Prompt
- Engine
- Records
- Safety
- Help

Menu entries must truth-label their behavior. Examples:

- `Create > Game` opens the Create Game module; navigation only.
- `Project > Load Project` opens the Load Project module; no project write.
- `Engine > Runtime Overview` opens runtime diagnostics; read-only.
- `Engine > Asset Processor` shows status/preflight; no execution.
- `Prompt > Prompt Studio` opens prompt drafting; no auto-execute.
- `Records > Evidence` opens read-only records/evidence.
- `Tools > Generate Asset` remains blocked until a generation corridor exists.
- `Tools > Place In Level` remains blocked or proof-only until placement is
  explicitly admitted.

## Editor Panel Design

Asset Forge should keep the Blender-like layout as the product baseline.

### Left Tool Shelf

The left shelf remains editor-tool oriented:

- selection and transform tools are UI state only
- mutating tools show blocked or preflight-only reasons
- future admitted tools can appear here only after backend admission

### Center Viewport

The center viewport remains dominant. It should show:

- selected candidate or demo preview
- active tool
- viewport mode
- selected object
- safety overlays
- no-mutation truth when no real model or renderer is loaded

### Right Outliner/Properties

The right pane becomes the main workbench inspector:

- outliner selection
- transform draft fields
- material preview metadata
- project/engine status rows
- blocked mutation explanations
- prompt/template handoff
- safety/admission truth

### Bottom Strip

The bottom strip becomes the compact operator timeline:

- timeline
- evidence
- prompt template
- logs
- latest artifacts
- blocked/preflight/proof-only status messages

## Data Flow

Frontend flow:

1. App starts with Asset Forge as the default workspace unless a valid session
   workspace is restored.
2. Asset Forge fetches task/provider/Blender/editor-model status where
   available.
3. Asset Forge shell menus route to existing modules through callbacks.
4. Tool/menu/panel interactions update local UI state or open read-only
   surfaces.
5. Prompt templates are previewed or loaded into Prompt Studio only with
   `auto_execute=false`.

Backend flow:

1. Existing backend services continue to expose readiness, records, runtime,
   policies, cockpit registry, and Asset Forge editor model data.
2. New backend contracts, when added, should be read-only unless they are in a
   separately admitted exact corridor.
3. Runtime-changing service calls must remain out of this shell consolidation
   packet.

## Safety Model

The shell must preserve the current safety posture:

- `execution_admitted=false` unless a specific existing admitted path says
  otherwise.
- `mutation_admitted=false` for Asset Forge editor actions in this product
  shell work.
- provider generation remains blocked.
- Blender execution remains blocked.
- Asset Processor execution remains blocked.
- placement writes remain blocked.
- material and prefab mutation remain blocked.
- prompt templates remain preview-first and user-controlled.

The UI may help users understand what is blocked and what unlocks it, but it
must not make blocked operations look functional.

## First Implementation Packet

Recommended next packet: `Asset Forge App Shell Consolidation`.

Scope:

- Change visible app-level branding from O3DE Agent Control App toward Asset
  Forge.
- Keep O3DE wording in technical truth rows and diagnostics.
- De-emphasize or hide the old top-level shell navigation where Asset Forge
  menus provide equivalent access.
- Expand Asset Forge `App`/module menus into a more complete workbench menu
  structure.
- Add tests proving default users land in Asset Forge and can reach existing
  major modules through Asset Forge menus.
- Keep static fallback behavior for backend editor-model failures.

Out of scope:

- backend mutation
- provider generation
- Blender execution
- Asset Processor execution
- project file writes
- placement writes
- material/prefab mutation
- arbitrary shell/Python/Editor execution

## Test Strategy

Frontend tests:

- app defaults to Asset Forge without valid restored session state
- visible product title uses Asset Forge language
- old O3DE app-shell title is absent or de-emphasized in the primary shell
- Asset Forge menu exposes Create Game, Create Movie, Load Project, Prompt
  Studio, Builder, Operations, Runtime, Records, Safety
- each menu route opens the intended existing module
- blocked execution/mutation wording remains visible for unsafe actions
- prompt templates remain non-auto-executing
- fallback editor model path still works

Backend tests are not required for the first shell consolidation packet unless
new backend read-only contracts are added.

## Rollout Plan

Use small packets:

1. Shell consolidation: visible branding/navigation only.
2. Workbench menu refinement: organize menus by Create, Project, Asset, Engine,
   Records, Safety.
3. Panel migration: progressively embed Runtime/Records/Prompt summaries into
   Asset Forge right or bottom panels.
4. Backend model expansion: expose module/menu metadata from backend read-only
   contracts.
5. Exact capability packets: admit any real generation/import/processor/
   placement action only through separate proof, review, and admission gates.

## Open Decisions

The design intentionally leaves these for later packets:

- whether the old Home workspace remains as a hidden Start page or is fully
  retired
- whether module content opens as full workspaces, editor tabs, or docked
  panels
- how much O3DE technical naming appears in the primary menu labels versus
  secondary diagnostics
- when backend menu/module registry becomes the source of truth for the whole
  shell

## Approval Class

This design supports low-risk frontend shell work first. Any future packet that
adds real O3DE execution, generation, Asset Processor execution, project writes,
or editor mutation is high risk and requires separate explicit operator
approval plus normalized proof/admission gates.
