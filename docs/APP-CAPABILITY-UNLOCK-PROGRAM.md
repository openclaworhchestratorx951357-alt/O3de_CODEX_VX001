# App Capability Unlock Program

## Purpose
Move from isolated Asset Forge progress toward unlocking the whole O3DE control app safely.

## Current unlocked foundation
The following patterns are now established:
- docs/spec pack split
- frontend GUI shell split
- backend read-only/preflight split
- server-owned approval/session model
- enforcement evaluation
- dry-run/fail-closed matrix
- audit-agent review
- Codex Flow Trigger Suite awareness
- app-wide capability dashboard shell (static fixture first)
- editor authoring review/restore baseline audit
- project/config readiness baseline audit
- audit review dashboard shell (static fixture first)
- app-wide evidence timeline shell (static fixture first)
- app-wide approval/session dashboard shell (static fixture first)
- app-wide workspace status chips shell (static fixture first)
- validation report intake baseline audit
- validation report intake contract + fail-closed parser design
- validation report intake dry-run parser scaffold + fail-closed test matrix
- validation report intake endpoint-candidate admission design
- validation report intake endpoint-candidate dry-run implementation (default-off)

## App-wide domains

### 1. Editor Authoring
Capabilities:
- session open
- level open
- entity create
- component add
- property readback
- narrow approved property write
- restore/rollback
- placement planning
- placement proof-only execution later

### 2. Asset Forge
Capabilities:
- generation planning
- provider preflight
- candidate review
- Blender inspect/preflight
- O3DE stage plan
- proof-only source staging
- readback bridge
- placement readiness
- later generation/provider execution

### 3. Project / Config / Build
Capabilities:
- project inspect
- settings inspect
- narrow settings patch
- rollback
- build configure preflight
- validation report intake
- real build/test execution later

### 4. Asset / Pipeline
Capabilities:
- source inspect
- assetdb readback
- catalog readback
- product/dependency evidence
- cache freshness
- Asset Processor observation
- Asset Processor execution later

### 5. GUI / Operator Workspace
Capabilities:
- top-level workspaces
- review panels
- evidence timeline
- status badges
- capability truth chips
- approval/session UI
- audit dashboard

### 6. Automation / Codex Flow Trigger Suite
Capabilities:
- local continue triggers
- watchers
- queue
- status logging
- audit stop points
- safe productization later

## Unlock strategy
Use this sequence for each domain:
1. docs/spec
2. GUI/demo
3. read-only/preflight backend
4. dry-run plan
5. server-owned approval/session
6. fail-closed test matrix
7. proof-only execution
8. readback/review evidence
9. revert/rollback proof
10. admitted-real narrow corridor
11. broaden only one capability at a time

## First app-wide unlock candidates

### A. Editor Authoring Review/Restore Lane
Why:
- already has earlier work around entity/component/property corridors
- directly improves the whole app
- pairs well with Asset Forge placement later

### B. App-wide Capability Dashboard
Why:
- makes audit state visible to the user
- helps prevent confusion about what is real, demo, plan-only, or proof-only

### C. Project/Config Readiness Lane
Why:
- lower risk than build execution
- supports every O3DE workflow

### D. Codex Flow Trigger Suite Productization Plan
Why:
- current local helpers are useful but untracked/unproductized
- should be documented and bounded before deeper automation reliance

Status:
- completed in `docs/FLOW-TRIGGER-SUITE-PRODUCTIZATION-PLAN.md`
- audit-gate checklist completed in `docs/FLOW-TRIGGER-SUITE-AUDIT-GATE-CHECKLIST.md`
- threat-model design completed in `docs/FLOW-TRIGGER-SUITE-THREAT-MODEL-DESIGN.md`
- implementation touchpoint completed in `docs/FLOW-TRIGGER-SUITE-IMPLEMENTATION-TOUCHPOINT.md`
- validation packet completed in `docs/FLOW-TRIGGER-SUITE-VALIDATION-PACKET.md`
- productized rollout completed in `docs/FLOW-TRIGGER-SUITE-PRODUCTIZED-ROLLOUT-PACKET.md`
- next safe gate is Flow Trigger Suite productized admission decision packet

## What stays blocked globally
- arbitrary shell execution
- arbitrary Python/Blender/Editor script execution
- broad asset mutation
- broad prefab/material mutation
- broad placement execution
- real provider generation
- Asset Processor execution
- real build/export/shipping
- deletion/cleanup outside exact scoped revert plans

## Required PR footer for every future feature packet
Every Codex PR must state:
- capability moved
- old maturity -> new maturity
- execution/mutation introduced: yes/no
- approval/session gate: yes/no
- tests run
- evidence
- revert path
- Audit Agent verdict
- next packet
