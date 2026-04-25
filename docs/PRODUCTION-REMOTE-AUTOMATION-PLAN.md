# Production Remote Automation Plan

## Purpose

This document is the canonical completion program for taking this repository from
its current narrow real-adapter boundary to a production-grade remote automation
control plane for admitted O3DE operational surfaces.

It is roadmap-native. It is not a disconnected note.

It does not claim that "all of O3DE remotely automatable" is already true.
It also does not treat GUI menu clicking or hotkey driving as the primary
production substrate when lower-level official O3DE surfaces exist.

Instead, it defines:
- the supported automation surface map
- the official O3DE execution substrates this project should target
- the admission standard for expanding real remote automation safely
- the cross-cutting phases that must land before broader real adapter expansion

Read this together with:
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `README.md`

## Branch Truth To Preserve

Current accepted truth on `feature/production-baseline-v1`:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real
- Docker/compose baseline and CI stack validation exist
- local Docker startup is verified
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` is the first admitted mutation-gated real path
- broader real adapter coverage is still narrow
- simulated vs real wording must stay explicit

This plan must not be used to overstate current capability.

## Supported Automation Surface Definition

This repository's production target is not "every GUI affordance in O3DE."

The target is production-grade remote automation for admitted, evidence-backed
O3DE operational surfaces that map to official execution substrates and can be
run with:
- explicit preconditions
- approval and lock enforcement when mutating
- auditable evidence
- rollback-aware mutation handling
- truthful frontend labeling
- release-testable conformance

Unsupported as a primary production model:
- blind menu/hotkey GUI automation where an official lower-level substrate
  already exists
- undocumented editor state poking
- mutation without backup/rollback rules
- remote execution without workspace isolation, evidence capture, and policy
  gates

## Official O3DE Execution Substrate Families

The production plan is organized around these substrate families:

### 1. File / manifest runner

Official surfaces:
- `project.json`
- `gem.json`
- `.setreg`
- `.setregpatch`
- manifest-backed settings surfaces

Primary role:
- source-of-truth inspection
- narrow admitted mutation where schema, backup, and rollback rules are clear

### 2. CLI runner

Official surfaces:
- `scripts/o3de.py` / `o3de.bat` / `o3de.sh`
- `register`
- `enable-gem`
- `disable-gem`
- repo/download flows where applicable
- CMake configure/build flows

Primary role:
- registered-object lifecycle
- project and Gem state transitions
- build configuration and compile orchestration

### 3. Editor session runner

Official surfaces:
- Python Editor Bindings
- Editor Python automation
- EBus-mediated editor operations where officially supported and evidence-backed

Primary role:
- level
- entity
- component
- property
- editor asset operations

### 4. Asset pipeline runner

Official surfaces:
- Asset Processor
- `AssetProcessorBatch`

Primary role:
- asset pipeline status
- batch compilation
- asset identity and pipeline evidence
- safe move/reprocess planning and, later, admitted mutation

### 5. Standalone tool runner

Official surfaces:
- Material Editor
- other standalone O3DE tools where the tool itself is an official execution
  surface

Primary role:
- rendering/lookdev workflows that do not require unsupported GUI scripting as
  the primary production substrate

### 6. Test runner

Official surfaces:
- TIAF
- native tests
- editor Python tests
- visual diff flows built on official test runners and test-tool packages

Primary role:
- validation
- release gating
- evidence-backed conformance

### 7. Remote content runner

Official surfaces:
- O3DE remote repository lifecycle
- `repo.json`
- CLI-based create/update/download flows

Primary role:
- optional later workstream for content distribution, repository activation, and
  remote content ingestion

## Production Completion Strategy

The production program is:

1. Stabilize remote executor substrate and workspace isolation before broadening
   real adapters.
2. Publish a canonical automation surface matrix and admission standard.
3. Expand real adapters one workstream at a time using the same mutation
   discipline proven by `settings.patch`.
4. Require release-grade evidence, rollback rules, and frontend truth labels for
   every newly admitted surface.

## New Cross-Cutting Roadmap Phases

### Phase 6B - Remote executor substrate and workspace isolation

Purpose:
- add the production-grade remote execution substrate that real adapter
  expansion depends on

Required scope:
- remote executor abstraction
- isolated workspace provisioning
- engine/project path binding rules
- runner-specific environment contracts
- secrets/auth boundary
- artifact and log streaming contracts
- backup staging and rollback hooks for mutation-capable tools
- failure-mode classification

Phase 6B must complete before broader real adapter expansion beyond the current
narrow Phase 7 boundary.

### Phase 6C - Automation surface matrix and admission standard

Purpose:
- make automation admission explicit before widening real tool coverage

Required scope:
- canonical surface matrix
- per-surface runner classification
- approval/lock classes
- backup and rollback rules
- release test requirements
- frontend truth-label standard

Phase 6C converts "we think this should be automatable" into "this surface is
admitted, gated, and release-testable."

## Major Workstreams

Each workstream below defines:
- current truth on this branch
- official substrate(s)
- runner type
- missing capabilities
- production admission criteria
- required tests/evidence
- rollback/backup requirements if mutating
- blockers/dependencies

### Project / config / settings / Gem automation

Current truth on this branch:
- `project.inspect` is real read-only
- `build.configure` is real plan-only
- `settings.patch` is the first admitted mutation-gated real path
- broader project/Gem mutation coverage is still narrow

Official substrate(s):
- `project.json`
- `gem.json`
- `.setreg`
- `.setregpatch`
- `scripts/o3de.py` register/enable/disable flows

Runner type:
- file/manifest runner
- CLI runner

Missing capabilities:
- admitted real `register` flows
- admitted real `enable-gem` / `disable-gem`
- admitted real project and Gem property edits beyond the current narrow
  `settings.patch` boundary
- layered settings registry coverage beyond current manifest-backed scope

Production admission criteria:
- target files and objects are explicitly enumerated
- preflight detects manifest presence, readability, schema shape, and ownership
- mutation plan is diffable before execution
- backup and rollback are proven for every mutating path
- post-write verification confirms exact intended state

Required tests/evidence:
- dry-run evidence
- backup manifest evidence
- rollback rehearsal evidence
- post-write inspection evidence
- contract tests for simulated vs real labeling

Rollback / backup requirements if mutating:
- mandatory backup before write
- deterministic rollback path
- explicit rollback outcome record

Blockers / dependencies:
- Phase 6B remote executor isolation
- Phase 6C admission matrix
- lock and approval hardening

### Build configure / compile automation

Current truth on this branch:
- `build.configure` is real plan-only when `dry_run=true`
- `build.compile` is admitted real execution-gated for explicit named targets

Official substrate(s):
- CMake configure/build
- CLI invocation from remote workspace

Runner type:
- CLI runner

Missing capabilities:
- admitted real configure execution
- broader compile target/output verification beyond the current explicit named
  target and generic artifact-candidate revalidation corridor
- toolchain and package-path normalization
- remote build cache and artifact collection contracts

Production admission criteria:
- workspace has isolated build directory semantics
- toolchain preconditions are checked before execution
- configure/build logs stream live and persist as artifacts
- compile failure classification is structured
- rerun/idempotence semantics are explicit

Required tests/evidence:
- dry-run preflight parity tests
- successful configure/build smoke tests
- intentional failure classification tests
- artifact/log preservation tests

Rollback / backup requirements if mutating:
- build-directory isolation rather than source-tree rollback as primary control
- config-file backup if runner mutates tracked config inputs

Blockers / dependencies:
- remote executor workspace isolation
- artifact/log streaming
- engine and package-path contract

### Editor session / level / entity / component automation

Current truth on this branch:
- no broad admitted real editor automation yet
- `editor.session.open`, `editor.level.open`, `editor.entity.create`, and
  `editor.component.add` are admitted real editor-authoring/runtime on the
  verified `McpSandbox` target wiring
- `editor.entity.exists` and `editor.component.property.get` are admitted
  hybrid read-only on their explicit lookup/readback surfaces
- the composed prompt-controlled chain was live-proven on `2026-04-25` through
  `editor.session.open` -> `editor.level.open` -> `editor.entity.create` ->
  `editor.component.add` -> `editor.component.property.get`
- the cleanup-enhanced proof bundle
  `backend/runtime/live_editor_authoring_proof_20260425-080441.json` also
  invoked the pre-entity-create `loaded-level-file` restore boundary and
  hash-verified the selected level prefab against the captured backup
- the separate direct read-only proof bundle
  `backend/runtime/live_editor_entity_exists_proof_20260425-094047.json`
  verified exact-name `editor.entity.exists` readback for `Ground` on
  `Levels/TestLoevel01` through the repo-owned
  `scripts/dev.ps1 live-entity-exists-proof` lifecycle command
- the direct entity-exists proof helper now drives that readback through Prompt
  Studio so the live evidence includes prompt planning, approval walking, child
  lineage, exact-name readback, and the bounded final review summary
- Prompt Studio now plans direct read-only entity-exists prompts through
  `editor.session.open` -> read-only `editor.level.open` ->
  `editor.entity.exists`, and its operator review labels exact presence,
  absence, ambiguity, missing target/level, runtime failure, or incomplete
  readback without claiming cleanup, restore, mutation, or reversibility
- the proofs do not claim live Editor undo, viewport reload, entity-absence
  readback, broader component or property mutation, delete, parenting, prefab
  mutation, material, asset, render, build, or arbitrary Editor Python behavior

Official substrate(s):
- Python Editor Bindings
- editor Python automation
- EBus-backed editor surfaces where validated

Runner type:
- editor session runner

Missing capabilities:
- broad session lifecycle management beyond the admitted bridge-backed path
- project/editor compatibility checks beyond the canonical `McpSandbox` target
- live Editor undo/reload or entity-absence readback after file-backed restore
- broader entity/component/property mutation classification
- editor-safe rollback model

Production admission criteria:
- editor session bootstrap is deterministic
- operations declare required project, level, Gem, and component preconditions
- read-only and mutating editor actions are separated in contracts
- editor mutation actions emit before/after evidence

Required tests/evidence:
- composed editor live-proof harness evidence for the admitted chain
- bridge/runtime regression tests for entity id, component id, safe level, and
  property readback handoff
- mutation regression tests for any newly admitted write paths
- screenshot/log evidence where appropriate

Rollback / backup requirements if mutating:
- level/source backup before mutation
- undo is not sufficient as the only rollback control
- save semantics must be explicit

Blockers / dependencies:
- remote executor display/session strategy
- workspace isolation
- approval/lock hardening for mutating editor actions

### Asset processor / asset identity / safe move / pipeline automation

Current truth on this branch:
- no admitted broad real asset pipeline automation yet

Official substrate(s):
- Asset Processor
- `AssetProcessorBatch`

Runner type:
- asset pipeline runner

Missing capabilities:
- real asset pipeline status/run contracts
- asset identity inspection model
- safe move/reprocess plan contract
- dependency-aware pipeline evidence

Production admission criteria:
- source/product identity is explicit
- dependency and reference impact is surfaced before mutation
- batch processing logs and outputs are captured
- move/rename paths are not admitted until backup and verification are strong

Required tests/evidence:
- AssetProcessorBatch smoke runs
- asset identity evidence
- dependency/reference verification
- failure classification and retry tests

Rollback / backup requirements if mutating:
- source backup
- path/reference rollback plan
- product-cache regeneration evidence

Blockers / dependencies:
- remote executor filesystem isolation
- artifact and log streaming
- approval gates for move/reprocess mutation

### Rendering / material / capture automation

Current truth on this branch:
- no admitted broad real rendering/lookdev automation yet

Official substrate(s):
- Material Editor
- editor automation where Material Editor is not the right substrate
- official test/capture flows for evidence

Runner type:
- standalone tool runner
- editor session runner
- test runner for capture/visual verification

Missing capabilities:
- material document lifecycle contracts
- capture orchestration
- evidence-backed visual comparison
- mutation admission rules for material edits

Production admission criteria:
- the chosen substrate matches the operation
- capture outputs are deterministic enough for release use
- visual difference thresholds are documented
- material edits preserve rollback evidence

Required tests/evidence:
- material open/edit/save smoke tests
- capture artifact tests
- visual diff evidence and threshold policy

Rollback / backup requirements if mutating:
- source material backup
- explicit revert path

Blockers / dependencies:
- test runner integration
- artifact storage
- image/diff evidence standards

### Validation / TIAF / native / Python / visual diff automation

Current truth on this branch:
- validation bookkeeping is real at the control-plane level
- broad real validation execution coverage is not yet admitted

Official substrate(s):
- TIAF
- native tests
- editor Python tests
- CTest / PyTest / GoogleTest based O3DE testing surfaces
- visual diff flows through official test tooling

Runner type:
- test runner

Missing capabilities:
- real remote validation submission
- TIAF runtime integration
- result normalization
- flaky-test handling
- visual diff gating standards

Production admission criteria:
- runner contract declares test family and environment
- result parsing is structured and auditable
- artifacts/logs/images are preserved
- retry/sharding semantics are explicit where supported

Required tests/evidence:
- local reproducibility of remote test runs
- result parsing contract tests
- artifact retention tests
- TIAF/native/Python coverage smoke suites

Rollback / backup requirements if mutating:
- not usually file-mutating, but environment cleanup and temporary workspace
  cleanup rules are required

Blockers / dependencies:
- remote executor substrate
- artifact/log streaming
- conformance matrix and release gates

### Remote transport / executor model

Current truth on this branch:
- control-plane bookkeeping and operator shell are real
- production-grade remote execution substrate is not yet implemented

Official substrate(s):
- repository-defined remote execution substrate built around official O3DE
  tool surfaces rather than GUI scraping

Runner type:
- cross-cutting infrastructure runner

Missing capabilities:
- remote host/session model
- workspace provisioning
- engine/project binding
- secret handling
- command/result transport

Production admission criteria:
- every remote run has isolated workspace identity
- execution target, toolchain, and engine version are explicit
- logs/artifacts/exit status stream reliably
- executor failure modes are classified

Required tests/evidence:
- remote connectivity smoke tests
- workspace isolation tests
- artifact streaming tests
- cancellation and timeout tests

Rollback / backup requirements if mutating:
- workspace snapshots or explicit file backups for mutating flows
- cleanup guarantees

Blockers / dependencies:
- none; this is the prerequisite cross-cutting workstream

### Auth / approval / policy / lock hardening

Current truth on this branch:
- approvals, locks, and bookkeeping are real
- mutation admission beyond the first narrow real path remains limited

Official substrate(s):
- repository control-plane enforcement plus runner-specific admission rules

Runner type:
- cross-cutting control-plane enforcement

Missing capabilities:
- per-surface approval classes
- stronger lock scope by workspace and substrate
- remote identity mapping
- release-grade policy audit coverage

Production admission criteria:
- mutating surfaces cannot bypass approval and lock rules
- approval class is explicit in the surface matrix
- policy decisions and lock events are preserved as real evidence

Required tests/evidence:
- approval-required integration tests
- lock-conflict tests
- policy rejection audit tests

Rollback / backup requirements if mutating:
- approval record must include backup/rollback requirement class

Blockers / dependencies:
- surface matrix and admission standard
- remote executor identity model

### Artifact / log / summary streaming

Current truth on this branch:
- runs, executions, and artifacts are real bookkeeping records
- production-grade remote streaming and evidence normalization are not complete

Official substrate(s):
- runner-generated logs, summaries, manifests, screenshots, diff outputs, and
  build/test artifacts

Runner type:
- cross-cutting evidence subsystem

Missing capabilities:
- standardized artifact bundles by runner family
- live log streaming contracts
- summary normalization
- retention and truncation policy

Production admission criteria:
- every admitted real surface produces evidence artifacts appropriate to its
  runner type
- logs are preserved and queryable
- summaries distinguish real, plan-only, mutation-gated, and simulated outcomes

Required tests/evidence:
- streaming tests
- artifact persistence tests
- truncation/retention tests

Rollback / backup requirements if mutating:
- backup and rollback artifacts must be first-class evidence

Blockers / dependencies:
- remote executor substrate
- per-surface conformance requirements

### Frontend operator-console completion

Current truth on this branch:
- operator shell is real
- local handoff cockpit is now present
- many operator aids are still frontend-local rather than backend-persisted

Official substrate(s):
- backend truth surfaces and evidence, not frontend invention

Runner type:
- frontend truth presentation

Missing capabilities:
- complete per-surface truth labeling
- release-conformance views
- executor/workspace visibility
- mutation backup/rollback visibility

Production admission criteria:
- every surface label matches the backend truth class
- operator can see preconditions, evidence, artifacts, and rollback status
- frontend does not imply broader real automation than admitted

Required tests/evidence:
- UI truth-label tests
- contract rendering tests
- end-to-end visibility tests

Rollback / backup requirements if mutating:
- UI must expose backup/rollback state when mutation is admitted

Blockers / dependencies:
- backend evidence contracts
- surface matrix

### Release / conformance matrix

Current truth on this branch:
- roadmap and Phase 7 checkpoint exist
- release-grade automation conformance matrix does not yet exist as the primary
  admission instrument

Official substrate(s):
- the canonical matrix in `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`

Runner type:
- cross-cutting release governance

Missing capabilities:
- release gate by surface family
- platform-by-platform evidence expectations
- explicit admission/non-admission rows

Production admission criteria:
- every admitted real surface has a matrix row
- release signoff checks the matrix rather than ad hoc assumptions

Required tests/evidence:
- per-row release test requirement completion

Rollback / backup requirements if mutating:
- reflected in the matrix and release checklists

Blockers / dependencies:
- Phase 6C

### Optional remote repository / content-distribution automation

Current truth on this branch:
- not yet admitted
- should remain optional unless the project literally intends remote content
  lifecycle automation as part of the "all supported surfaces" goal

Official substrate(s):
- O3DE remote repositories
- `repo.json`
- CLI create/repo/download flows

Runner type:
- remote content runner

Missing capabilities:
- repository lifecycle contract
- download provenance
- remote content approval model

Production admission criteria:
- repository origin and integrity are explicit
- download and activation behavior is auditable
- content-distribution scope is separated from project mutation scope

Required tests/evidence:
- repo lifecycle smoke tests
- download provenance tests
- content activation verification

Rollback / backup requirements if mutating:
- repo config backup where local manifests/settings are changed

Blockers / dependencies:
- decide whether this workstream is in-scope for the repository mission

## Admission Standard For New Real Surfaces

No new real remote automation surface should be admitted unless it has:
- an official substrate family
- a named runner type
- explicit preconditions
- approval/lock classification
- backup/rollback requirements if mutating
- post-run or post-write verification
- artifacts/logs/evidence outputs
- truthful frontend labeling
- release test requirements

`settings.patch` is the current model for mutation admission discipline.

It is not proof that every future mutation surface is already safe or admitted.

## Recommended Implementation Order After Current Branch State

1. Align roadmap and checkpoint docs around Phase 6B and Phase 6C.
2. Build the remote executor substrate and workspace isolation layer.
3. Publish and enforce the automation surface matrix as a release gate.
4. Expand real project/config/settings/Gem and build surfaces first.
5. Add editor, asset pipeline, validation, and rendering surfaces only after the
   executor, evidence, and admission systems are stable.
6. Keep remote repository/content-distribution automation optional unless the
   product scope explicitly requires it.

## Source Notes

The substrate families above are derived from official O3DE documentation for:
- project and Gem manifests, settings registry, and CLI/project configuration
- configure/build with CMake
- Editor Python Bindings
- Asset Processor and AssetProcessorBatch
- Material Editor
- TIAF and O3DE test tooling
- O3DE remote repositories and `repo.json`
