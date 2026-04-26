# Phase 8 Editor Component Property List Bridge Candidate

## Purpose

This document defines the candidate typed read-only bridge operation needed
before component property target discovery can become executable.

This packet adds repo-owned proof-only scaffolding for the operation in:
- `scripts/setup_control_plane_editor_bridge.ps1`
- `backend/app/services/editor_automation_runtime.py`

It does not add a dispatcher/catalog adapter route.

It does not run or claim live proof.

It does not admit Prompt Studio property discovery.

It does not admit property writes.

It records the current blocker: the canonical bridge can internally build a
property path list while serving `editor.component.property.get`, but it does
not expose a typed `editor.component.property.list` operation.

Read this together with:
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-TARGET-DISCOVERY.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-WRITE-CANDIDATE.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`

## Current Readiness Finding

Read-only local check:
- command: `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-status`
- observed at: `2026-04-26T03:31:59Z`
- backend listener: present on `127.0.0.1:8000`, process id `28512`
- canonical `Editor.exe`: present, process id `31776`
- bridge configured: true
- bridge module loaded: true
- bridge heartbeat fresh: false

Canonical bridge source inspected read-only:
- path:
  `C:\Users\topgu\O3DE\Projects\McpSandbox\Gems\ControlPlaneEditorBridge\Editor\Scripts\control_plane_bridge_ops.py`
- SHA-256:
  `3B0ABA69408A07815B1D3B4E62AC81095E4428D76709001FA9B676B9E96B90C8`
- finding:
  `BuildComponentPropertyList` is called inside the existing
  `editor.component.property.get` implementation
- blocker:
  bridge dispatch includes `editor.component.property.get`, but no
  `editor.component.property.list` operation

Backend adapter truth from `/adapters`:
- real tool paths include `editor.component.property.get`
- real tool paths do not include `editor.component.property.list`

## Candidate Operation Shape

Candidate future operation:
- `editor.component.property.list`

Candidate family:
- `editor-control`

Candidate status:
- repo-owned proof-only runtime wrapper added
- repo-owned bridge setup script operation added
- canonical live bridge refreshed from the repo-owned setup script on
  `2026-04-26`
- canonical bridge heartbeat recovered after restarting the Editor bridge host
- proof-only live run succeeded on the canonical bridge on `2026-04-26`
- not dispatcher/catalog-admitted
- not prompt-admitted
- proof-only candidate remains outside dispatcher/catalog and Prompt Studio
  admission

Required args:
- `component_id`
- `level_path`

Required result details:
- `component_id`
- `entity_id`, when resolvable from the component pair
- `component_type`, when available without broad component discovery
- `level_path`
- `loaded_level_path`
- `property_paths`
- `component_property_count`
- `bridge_command_id`
- `bridge_operation`
- `bridge_result_summary`

The operation should list paths only. It should not read every property value
by default, because bulk value reads can cross asset, material, prefab,
container, transform, or editor-state boundaries before each property is
classified.

## Required Preflight

The proof-only implementation must reject before dispatch unless:
- backend target wiring resolves to canonical `McpSandbox`
- backend listener is present
- canonical Editor process is present
- bridge heartbeat is fresh
- loaded level is known and matches `level_path`
- `component_id` is explicit and non-empty
- component id resolves to one exact component on the loaded level
- operation is routed through a typed bridge allowlist entry

## Required Bridge Behavior

The bridge operation must:
- call the editor component API path-listing primitive for one explicit
  component id
- return path strings without mutation
- avoid component creation, component removal, component writes, property
  writes, entity discovery, parenting, prefab work, material work, asset work,
  render work, build work, and arbitrary Editor Python
- return precise failure codes for missing level, level mismatch, invalid
  component id, component not found, property-list exception, and unsupported
  operation

## Prompt Studio Boundary

Prompt Studio must continue to refuse property discovery prompts with:
- `editor.component.property.list.unsupported`

The refused plan must have:
- no `editor.session.open`
- no `editor.level.open`
- no editor bridge execution step
- operator-facing text that says property listing is not admitted yet

## Current Proof-Only Packet

Implemented in this packet:
- repo-owned bridge setup source can dispatch
  `editor.component.property.list`
- backend runtime wrapper can queue the typed bridge operation directly
- runtime tests prove command payload shape, bridge result mapping,
  no property value readback field, and malformed `property_paths` rejection

Adjacent target-binding corridor:
- `editor.component.find` is the admitted read-only path for obtaining a live
  Editor component id on one explicit live entity and one allowlisted component
  name.
- discovered ids from that path carry provenance
  `admitted_runtime_component_discovery_result`.
- this does not admit `editor.component.property.list`; property listing remains
  proof-only and must not be exposed through Prompt Studio or `/adapters` until
  a separate admission packet exists.

Still required before admission:
- add a dispatcher/catalog adapter route only when proof-only execution is
  explicitly admitted
- add schemas for args, result, execution details, and artifact metadata when
  the dispatcher/catalog route is introduced
- prompt tests proving Prompt Studio still refuses property discovery
- keep the proof bundle path and remaining non-scope visible to operators

Do not use this operation to select a property write target until one
proof-only read-only run records the exact property path list and either
selects a target or records the exact blocker. The first proof-only run now
exists; target-discovery admission still remains separate.

## Canonical Bridge Readiness Checkpoint

Observed on `2026-04-26`.

Repo-owned refresh command:
- `powershell -ExecutionPolicy Bypass -File .\scripts\setup_control_plane_editor_bridge.ps1 -ProjectRoot 'C:\Users\topgu\O3DE\Projects\McpSandbox'`

Canonical bridge source:
- path:
  `C:\Users\topgu\O3DE\Projects\McpSandbox\Gems\ControlPlaneEditorBridge\Editor\Scripts\control_plane_bridge_ops.py`
- pre-refresh SHA-256:
  `3B0ABA69408A07815B1D3B4E62AC81095E4428D76709001FA9B676B9E96B90C8`
- post-refresh SHA-256:
  `29374D2A1FD5EC3D6DCAA41368ED2F9479A2DB26EAE7C51FF8BF306F17826E15`
- post-refresh source now contains:
  `def _list_component_properties(...)`,
  `EditorComponentAPIBus.BuildComponentPropertyList`, and
  dispatch for `editor.component.property.list`

Bridge restart/readiness commands:
- `powershell -ExecutionPolicy Bypass -File .\backend\runtime\live_verify_control.ps1 stop-editor`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-bridge-start`
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-status`

Restart result:
- old canonical `Editor.exe` PID stopped: `31776`
- new canonical `Editor.exe` PID launched: `17364`
- backend listener remained present on port `8000`, PID `28512`
- canonical target remained `C:\Users\topgu\O3DE\Projects\McpSandbox`
- final `live-status` observed at `2026-04-26T04:10:16Z`
- bridge configured: true
- bridge module loaded: true
- bridge heartbeat fresh: true

Stability sample after restart:
- six `/o3de/bridge` samples from `2026-04-26T04:09:04Z` through
  `2026-04-26T04:09:30Z`
- every sample reported `heartbeat_fresh: true`
- heartbeat age stayed below one second

Current adapter boundary:
- `/adapters` still does not expose `editor.component.property.list`
- this is expected because the dispatcher/catalog route has not been admitted

What this checkpoint proves:
- canonical bridge source on disk was refreshed from the repo-owned setup
  packet
- the running canonical Editor bridge host was restarted and loaded a fresh
  bridge session
- backend, canonical Editor, and bridge heartbeat readiness were made available
  for the subsequent bounded property-list proof

What this readiness checkpoint by itself does not prove:
- no `editor.component.property.list` live command was executed
- no property path list was returned by the live bridge
- no Prompt Studio or `/adapters` admission occurred
- no property write, entity mutation, component mutation, restore, cleanup, or
  reversibility behavior was exercised

## Live Proof Checkpoint - 2026-04-26

Proof command:
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-property-list-proof`

Proof artifact:
- `backend/runtime/live_editor_component_property_list_proof_20260426-043614.json`

Runtime restore boundary artifact:
- `backend/runtime/editor_state/restore_boundaries/3474cf9464f71663/f2de0e13140b4f1caa9f214417d6a65e.prefab`

Canonical proof target:
- project: `C:\Users\topgu\O3DE\Projects\McpSandbox`
- level: `Levels/TestLoevel01`
- backend listener after proof: PID `30612`
- canonical Editor.exe during proof: PID `17364`
- post-proof bridge heartbeat: `heartbeat_fresh: true`

Executed chain:
- `editor.session.open`
- `editor.level.open`
- `editor.entity.create`
- `editor.component.add`
- proof-only `editor.component.property.list`

Temporary proof target:
- entity: `CodexPropertyListProofEntity_20260426_043614`
- component: `Mesh`
- component id: `EntityComponentIdPair(EntityId(8825628972962341928), 16304053675892170807)`
- component id provenance: `admitted_runtime_component_add_result`

Property target identity truth:
- prefab component records are serialized loaded-level file evidence only
- prefab-derived component ids must not be treated as valid live Editor
  component ids
- the current valid live component id source is `added_component_refs`
  returned by the admitted `editor.component.add` runtime step
- `editor.component.property.list` remains proof-only and must not be
  inferred as Prompt Studio, dispatcher, catalog, or `/adapters` admission

Verified result:
- `editor.component.property.list` executed through the typed
  ControlPlaneEditorBridge filesystem inbox
- returned `23` property paths
- included `Controller|Configuration|Model Asset`
- did not return property values
- `/adapters` still did not expose `editor.component.property.list`
- Prompt Studio, dispatcher, and catalog admission were not changed

Mutation and restore truth:
- mutation occurred through already-admitted temporary target provisioning:
  root entity creation plus allowlisted Mesh component add
- restore result: `restored_and_verified`
- restore scope: filesystem restoration of selected loaded-level prefab from
  the pre-entity-create backup
- no live Editor undo, viewport reload, or post-restore entity-absence
  readback was proven

## Explicit Non-Scope

This candidate does not cover:
- property writes
- property value bulk reads
- property allowlist implementation
- write-target selection
- component discovery by type or broad scene enumeration
- arbitrary entity creation beyond the admitted temporary root proof target
- arbitrary Editor Python
- prefab, material, asset, render, build, validation, or TIAF behavior
- restore, cleanup, or reversibility claims beyond the hash-verified
  loaded-level prefab file restore recorded above
