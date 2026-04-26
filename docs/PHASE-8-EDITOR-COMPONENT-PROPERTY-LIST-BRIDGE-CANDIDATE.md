# Phase 8 Editor Component Property List Bridge Candidate

## Purpose

This document defines the candidate typed read-only bridge operation needed
before component property target discovery can become executable.

It does not implement the operation.

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
- not implemented
- not prompt-admitted
- proof-only read-only candidate after bridge support exists

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

## Proof-Only Exit Criteria

Do not move this candidate into runtime proof until a later packet names:
- repo-owned or canonical bridge source change that adds
  `editor.component.property.list`
- backend runtime wrapper and adapter route
- schemas for args, result, execution details, and artifact metadata
- tests proving preflight rejection and bridge result mapping
- prompt tests proving Prompt Studio still refuses property discovery
- live proof command and evidence bundle path

Do not use this operation to select a property write target until one
proof-only read-only run records the exact property path list and either
selects a target or records the exact blocker.

## Explicit Non-Scope

This candidate does not cover:
- property writes
- property value bulk reads
- property allowlist implementation
- write-target selection
- component discovery by type or broad scene enumeration
- entity creation for fixture setup
- arbitrary Editor Python
- prefab, material, asset, render, build, validation, or TIAF behavior
- restore, cleanup, or reversibility claims
