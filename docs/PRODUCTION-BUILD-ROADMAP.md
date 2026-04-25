# Official Production Build Roadmap

## Purpose

This document is the official ordered implementation roadmap for turning `O3de_CODEX_VX001` into a production-oriented O3DE control-plane application.

It is written for Codex Desktop execution and ChatGPT review.

It exists to:
- define the implementation order
- keep work aligned with the repository mission
- prevent random feature drift
- distinguish production baseline work from future real O3DE adapter depth
- make progress auditable phase by phase

Read this together with:
- `docs/WORKFLOW-CODEX-CHATGPT.md`
- `README.md`
- `docs/README.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/PHASE-6B-REMOTE-EXECUTOR-CONTRACT.md`

---

## Mission Summary

`O3de_CODEX_VX001` is an O3DE-focused agent control plane.

It is not a generic chat UI or toy orchestration app.

Its job is to provide:
- operator-driven control
- structured tool dispatch
- approvals
- locks
- audit trail
- typed contracts and schemas
- clear agent boundaries
- safe evolution toward real O3DE adapters

The core domain families already established by research are:
- editor / authoring automation
- project / build / settings control
- asset pipeline / prefabs / content processing
- validation / TIAF / test orchestration
- rendering / materials / lookdev
- framework / Gem-aware architecture boundaries

This roadmap preserves that structure.

---

## Delivery Philosophy

### Production-ready baseline means
A production-ready baseline for this repository means:
- stable backend architecture
- typed APIs and persistent state
- approval and lock enforcement model
- auditable execution records
- usable frontend operator console
- documented contracts and schemas
- CI/lint/test/build automation
- Dockerized local stack and deployable baseline
- clear separation between real adapters and simulated adapters

### Production-ready does not automatically mean
The following are **not** assumed to be complete in the first baseline unless implemented and validated:
- full real Editor EBus execution
- full real Asset Processor orchestration
- full real TIAF driver integration
- full real Atom/render automation
- full real project/build mutation against a live engine workspace

If a feature is simulated, adapter-only, or contract-only, it must be labeled clearly.

---

## Global Rules for Codex

Before starting any phase, Codex must follow `docs/WORKFLOW-CODEX-CHATGPT.md`.

### Mandatory behavior
- verify Git worktree identity before editing
- summarize the task before changing files
- keep branch scope coherent
- report exact files changed
- report commands actually run
- distinguish implemented vs stubbed behavior

### Do not
- skip ordering in this roadmap without a strong reason
- jump to flashy frontend work before backend contracts exist
- present stubs as real integrations
- add broad unsafe mutation behavior without approval gates and auditability

---

## Phase Order Overview

1. Phase 0 — Repository audit and stabilization
2. Phase 1 — Core backend control-plane foundation
3. Phase 2 — Persistence, runs, approvals, locks, audit trail
4. Phase 3 — Typed contracts, schemas, and agent definitions
5. Phase 4 — Operator frontend baseline
6. Phase 5 — Production engineering baseline
7. Phase 6 — Adapter framework and simulated O3DE executors
8. Phase 6B — Remote executor substrate and workspace isolation
9. Phase 6C — Automation surface matrix and admission standard
10. Phase 7 — Real O3DE integration slice: project/build/settings
11. Phase 8 — Real O3DE integration slice: editor automation
12. Phase 9 — Real O3DE integration slice: assets/prefabs/pipeline
13. Phase 10 — Real O3DE integration slice: validation/TIAF
14. Phase 11 — Real O3DE integration slice: rendering/lookdev
15. Phase 12 — Hardening, release readiness, and operator handoff

Each phase below includes goals, required outputs, and exit criteria.

---

# Phase 0 — Repository Audit and Stabilization

## Goal
Understand the actual current codebase and remove ambiguity before major implementation work.

## Required work
- inspect repository tree fully
- identify what already exists in backend, frontend, contracts, schemas, agents, and docs
- classify current files as one of:
  - implemented
  - scaffolded
  - placeholder
  - obsolete
- identify missing config files, package manifests, Docker files, CI files, and test setup
- identify accidental duplication or inconsistent naming

## Deliverables
- short architecture inventory document or section update in docs
- file-level status summary
- implementation gap list
- recommended first branch for Phase 1

## Exit criteria
- Codex can state exactly what exists now
- no major ambiguity remains about repo structure
- next implementation phase can proceed without guessing

---

# Phase 1 — Core Backend Control-Plane Foundation

## Goal
Turn the backend from scaffold dispatch into a real control-plane core.

## Required work
- establish clear backend app structure
- formalize request validation pipeline
- build tool registry abstraction
- build policy/approval precheck layer
- build lock precheck layer
- define run lifecycle states
- define structured error taxonomy
- define service boundaries for:
  - catalog
  - dispatch
  - approvals
  - locks
  - runs
  - events/audit
  - artifacts
  - policy

## Suggested endpoints
- `GET /`
- `GET /health`
- `GET /ready`
- `GET /version`
- `GET /tools/catalog`
- `POST /tools/dispatch`
- `GET /runs`
- `GET /runs/{id}`
- `GET /approvals`
- `POST /approvals/{id}/approve`
- `POST /approvals/{id}/reject`
- `GET /locks`
- `GET /events`
- `GET /policies`

## Deliverables
- backend routes implemented cleanly
- backend service layer no longer scaffold-only
- structured response envelopes across all endpoints
- basic unit tests for routes and services

## Exit criteria
- backend supports real control-plane bookkeeping even if adapters are simulated
- dispatcher no longer returns only "not implemented" scaffold responses

---

# Phase 2 — Persistence, Runs, Approvals, Locks, Audit Trail

## Goal
Persist the control-plane state so the system behaves like an operator product rather than an in-memory demo.

## Required work
- add practical persistence backend, defaulting to SQLite
- persist:
  - runs
  - approvals
  - lock records
  - event log
  - artifacts metadata
  - tool execution records
- define approval states
- define run states
- define lock ownership and release semantics
- define event model with timestamps and severity
- define artifact metadata model

## Required behavior
- every dispatch attempt creates a run record
- every decision is audit logged
- approvals are queryable and actionable
- locks are visible and enforceable
- state survives process restart

## Deliverables
- database models / migrations / init flow
- repository access layer
- tests for persistence-backed workflows

## Exit criteria
- operator can inspect past runs and approval history
- control-plane state survives restart

---

# Phase 3 — Typed Contracts, Schemas, and Agent Definitions

## Goal
Make the system explicit and machine-readable.

## Required work
- fill `contracts/` with human-readable tool contracts
- fill `schemas/` with machine-readable schemas for:
  - request envelope
  - response envelope
  - run entity
  - approval entity
  - lock entity
  - artifact entity
  - event entity
  - per-tool args/results where practical
- fill `agents/` with formal agent capability boundaries and safety notes

## Agent domains to formalize
- editor-control
- project-build
- asset-pipeline
- validation
- render-lookdev
- optional shared/orchestration policy agent layer

## Deliverables
- source-controlled contract docs
- source-controlled schema docs/files
- source-controlled agent boundary docs

## Exit criteria
- backend, frontend, and docs use the same vocabulary
- agent/tool scope is no longer implicit

---

# Phase 4 — Operator Frontend Baseline

## Goal
Build a frontend that is actually usable by an operator.

## Required views
- overview dashboard
- agent cards / domain summary
- tools catalog
- dispatch form
- approval queue
- runs list
- run detail page
- locks view
- events/audit timeline
- artifacts/log panel
- policy visibility panel

## Required behavior
- frontend consumes real backend APIs
- clear status labels for stubbed vs real integrations
- easy visibility into approval blockers and run progress
- sensible loading / empty / error states

## Deliverables
- React/Vite UI wired to backend
- reusable typed API client layer
- practical navigation and layout

## Exit criteria
- an operator can dispatch, inspect, approve/reject, and review runs from the UI

---

# Phase 5 — Production Engineering Baseline

## Goal
Make the repo buildable, testable, and deployable as a serious software project.

## Required work
- backend Dockerfile
- frontend Dockerfile
- local `docker-compose` stack
- example environment files
- lint/format config
- test runner config
- CI workflow for lint/test/build
- startup/readiness documentation

## Deliverables
- local full-stack startup path
- repeatable CI
- clear dev setup docs

## Exit criteria
- a new developer can run the stack reliably
- CI catches obvious regressions

---

# Phase 6 — Adapter Framework and Simulated O3DE Executors

## Goal
Create a robust adapter model before deep real integrations.

## Required work
- define adapter interfaces for each domain
- separate control-plane logic from execution adapters
- create simulated/demo executors for each domain tool family
- ensure UI and backend can operate meaningfully even without live engine coupling

## Adapter families
- project/build/settings adapter
- editor adapter
- asset/pipeline adapter
- validation/TIAF adapter
- render/lookdev adapter

## Deliverables
- adapter interfaces
- simulated adapters with explicit labels
- config-driven selection of adapter mode

## Exit criteria
- system can be demoed honestly without pretending to be fully integrated
- backend architecture is ready for real adapters

---

# Phase 6B — Remote Executor Substrate and Workspace Isolation

## Goal
Build the production-grade remote execution substrate that broader real O3DE
automation depends on.

## Required work
- define the remote executor model for official O3DE substrates rather than GUI
  automation-first control
- provision isolated workspaces for remote runs
- define engine/project binding rules per workspace
- define environment and secret boundaries for runner families
- add artifact/log/summary streaming contracts
- add cancellation, timeout, and failure classification behavior
- add backup staging and rollback hooks for mutating runner families

## Deliverables
- remote executor contract
- isolated workspace lifecycle contract
- runner environment contract
- evidence streaming contract
- policy and admission contract
- release and conformance plan
- implementation sequence
- backend mapping
- persistence change set

Primary planning source:
- `docs/PHASE-6B-REMOTE-EXECUTOR-CONTRACT.md`

## Exit criteria
- real remote execution has a stable substrate independent of any single tool
- mutating future runners have a place to attach backup and rollback controls
- broader real adapter work no longer depends on ad hoc host execution

---

# Phase 6C — Automation Surface Matrix and Admission Standard

## Goal
Make real remote automation expansion explicit, testable, and release-governed.

## Required work
- create the canonical automation surface matrix
- classify each admitted or candidate surface by official substrate and runner
  type
- define approval/lock class, backup/rollback rules, and frontend truth labels
- define release evidence requirements per surface
- make the matrix part of roadmap and checkpoint review

## Deliverables
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- aligned roadmap and checkpoint references

## Exit criteria
- the repository has one canonical admission matrix for remote automation scope
- no new real surface should be widened without a matrix row and evidence rules
- release readiness can be checked against the matrix instead of informal claims

---

# Phase 7 — Real O3DE Integration Slice: Project / Build / Settings

## Goal
Implement the first real integration slice in the lowest-risk high-value domain.

## Why first
Project/build/settings is the most natural first real integration because O3DE’s project manifests, build flows, settings registry, Gem configuration, and CLI surfaces provide a strong operational boundary for automation.

## Focus areas
- project inspection
- settings inspection / safe patch planning
- Gem state inspection
- configure/build planning
- optional safe execution for selected build commands

## Guardrails
- prefer inspect/read flows first
- mutation must be approval-gated and auditable
- config changes must be reversible and visible
- do not bypass the Phase 6B executor/isolation boundary or the Phase 6C
  admission matrix when broadening real surfaces

## Exit criteria
- at least one project/build/settings flow is truly real and validated
- simulated vs real status is explicit per tool

---

# Phase 8 — Real O3DE Integration Slice: Editor Automation

## Goal
Add real editor-facing automation carefully.

## Why later
Editor automation carries more statefulness and safety risk, and documented Python/EBus surfaces require exact validation before being treated as stable automation contracts.

## Focus areas
- session/connectivity detection
- level inspection/open planning
- entity search/inspection
- component inspection
- narrow safe mutation candidates only after validation

## Guardrails
- do not assume all documented example surfaces are production-safe
- distinguish read-only actions from mutating actions
- log preconditions such as Gem enabled / level open / editor context available

## Exit criteria
- at least one real read-oriented editor flow exists and is validated end to end

---

# Phase 9 — Real O3DE Integration Slice: Assets / Prefabs / Pipeline

## Goal
Add real asset- and content-pipeline-aware control-plane capabilities.

## Why later
Asset identity, relocation, metadata, prefab propagation, and Asset Processor behavior all carry nontrivial correctness and migration risk.

## Focus areas
- asset inspection
- Asset Processor status inspection
- source/product identity visibility
- prefab reference and risk inspection
- safe planning for moves/reprocess operations before mutation

## Guardrails
- do not normalize rename/move operations until identity implications are explicit
- expose risk warnings around path references, metadata coverage, and prefab nesting

## Exit criteria
- at least one real asset/pipeline inspection capability exists and is validated

---

# Phase 10 — Real O3DE Integration Slice: Validation / TIAF

## Goal
Add validation orchestration capabilities with strong auditability.

## Why later
TIAF and validation flows involve platform constraints, historic data, integrity rules, and CI/reseed implications that should not be rushed.

## Focus areas
- test inventory / sequence planning
- validation run submission model
- sequence result tracking
- artifact visibility
- explicit TIAF mode/status display

## Guardrails
- do not claim real TIAF orchestration unless driver/runtime integration exists
- expose integrity and reseed implications clearly

## Exit criteria
- at least one real validation-oriented flow exists and is validated

---

# Phase 11 — Real O3DE Integration Slice: Rendering / Lookdev

## Goal
Add rendering-aware operator support carefully.

## Why latest
Rendering/material workflows are highly specialized and are more valuable after the broader control-plane foundation is stable.

## Focus areas
- material/shader inspection
- render capture bookkeeping
- shader rebuild planning
- adapter hooks for future viewport capture / lookdev validation

## Guardrails
- do not overstate SRG/shader invalidation guarantees without validation
- keep render actions highly explicit and evidence-backed

## Exit criteria
- at least one real rendering-oriented inspection or orchestration flow exists and is validated

---

# Phase 12 — Hardening, Release Readiness, and Operator Handoff

## Goal
Prepare the project for sustained operator use and continued iteration.

## Required work
- close major TODOs in docs
- clean configuration and startup paths
- verify failure states are understandable
- improve logging and observability
- verify frontend and backend operator messaging
- produce release notes / known limitations
- produce operator handoff documentation

## Required outputs
- release-readiness checklist
- known limitations document
- operator startup/runbook doc
- developer contribution guide

## Exit criteria
- project can be handed to another operator/developer with clear expectations
- implemented vs stubbed areas are fully documented

---

## Phase Dependencies

### Must come before everything else
- Phase 0

### Must be complete before meaningful frontend product work
- Phase 1
- Phase 2
- Phase 3

### Must be complete before “production baseline” can be claimed
- Phase 4
- Phase 5

### Must exist before deep real integrations
- Phase 6
- Phase 6B
- Phase 6C

### Real integration sequence order
1. project/build/settings
2. editor automation
3. assets/prefabs/pipeline
4. validation/TIAF
5. rendering/lookdev
6. optional remote repository/content distribution only if the repository scope
   explicitly includes it

This order is intentional and should not be reversed casually.

---

## Definition of Done Per Phase

A phase is complete only if Codex reports:
- repo path verified
- origin verified
- branch used
- files changed
- commands run
- results of those commands
- implemented behavior
- still stubbed or unverified behavior
- next recommended step

If those items are missing, the phase is not considered fully complete.

---

## Required Codex Execution Pattern

At the start of each phase, Codex should:

1. verify worktree identity
2. restate the phase goal
3. inspect the current relevant files
4. propose a short implementation plan
5. make the edits
6. run relevant checks/tests
7. summarize the exact changes and remaining gaps

---

## Recommended First Action After This Roadmap

Codex should start with:

### Immediate next slice
Phase 0 followed by the beginning of Phase 1.

### Exact starting objective
- perform a full repository audit
- identify scaffold vs implemented backend/frontend/doc files
- replace scaffold dispatch assumptions with a concrete backend execution model plan
- then begin implementing the core backend control-plane foundation

---

## Official Codex Instruction Block for This Roadmap

```text
Follow docs/WORKFLOW-CODEX-CHATGPT.md and docs/PRODUCTION-BUILD-ROADMAP.md.

Treat GitHub repo openclaworhchestratorx951357-alt/O3de_CODEX_VX001 as the source of truth.
Before making changes, verify the worktree identity using git rev-parse --show-toplevel and git remote get-url origin.
If verification fails, stop immediately.

Execute work in roadmap order unless there is a strong documented reason not to.
Do not present stubs as real O3DE integrations.
Keep the system production-oriented, auditable, and phase-driven.
After each work session, report exactly:
- repo path verified
- origin verified
- branch
- files changed
- commands run
- results
- implemented
- still stubbed / unverified
- next recommended step
```

---

## Final Rule

A feature should only be called complete when:
- code exists
- behavior is wired end to end where applicable
- tests or validation were actually run where reasonable
- docs reflect reality
- stubbed limitations are still called out clearly

Truthful progress beats inflated progress.
