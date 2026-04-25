# Phase 0 Repo Audit

## Scope

This audit began as the Phase 0 baseline inventory for `feature/production-baseline-v1`. It now also includes short status corrections so the document remains truthful after the Phase 1 foundation work and the current Phase 2 persistence slices.

## Architecture Inventory

| Area | Current state | Classification | Notes |
| --- | --- | --- | --- |
| Root README | Mission, structure, workflow pointers | implemented | Accurate high-level entrypoint. |
| `docs/` | Workflow, roadmap, architecture overview | implemented | Core planning docs are now present. |
| `backend/` | FastAPI service with persistence-backed control-plane routes and tests | implemented | Backend now has real control-plane bookkeeping, SQLite-backed persistence, and explicit simulated execution labeling. |
| `frontend/` | React/Vite operator shell | scaffolded | Usable demo UI exists, but several panels still relied on mock data. |
| `contracts/` | Human-readable v1 tool contract | implemented | Strong domain vocabulary exists. |
| `schemas/` | Request/response schemas plus Phase 3-prep entity schemas | implemented | Core envelopes exist and branch state now includes machine-readable entity schemas for control-plane records. |
| `agents/` | YAML ownership boundaries for five domains | implemented | Clear agent scope exists, but `engine-code` is missing. |

## File-Level Status Summary

| File | Status | Notes |
| --- | --- | --- |
| `README.md` | implemented | Points to the official workflow and roadmap docs. |
| `agents/README.md` | scaffolded | Describes intended contents, not full operating guidance. |
| `agents/asset-pipeline.yaml` | implemented | Formal domain boundary with tools and handoff rules. |
| `agents/editor-control.yaml` | implemented | Formal domain boundary with tools and safety notes. |
| `agents/project-build.yaml` | implemented | Formal domain boundary with config/build ownership. |
| `agents/render-lookdev.yaml` | implemented | Formal domain boundary for render/lookdev. |
| `agents/validation.yaml` | implemented | Formal domain boundary for validation/TIAF flows. |
| `backend/README.md` | implemented | Run instructions exist and now document persistence behavior and DB-path override support. |
| `backend/app/README.md` | scaffolded | Module intentions documented, implementation still catching up. |
| `backend/app/__init__.py` | implemented | Package marker. |
| `backend/app/api/__init__.py` | implemented | Package marker. |
| `backend/app/api/routes/__init__.py` | implemented | Package marker. |
| `backend/app/api/routes/approvals.py` | implemented | Approval query and decision routes. |
| `backend/app/api/routes/events.py` | implemented | Event log route. |
| `backend/app/api/routes/health.py` | implemented | Health, readiness, version, and runtime DB strategy visibility. |
| `backend/app/api/routes/locks.py` | implemented | Active-lock visibility route. |
| `backend/app/api/routes/policies.py` | implemented | Tool policy visibility route. |
| `backend/app/api/routes/runs.py` | implemented | Run query routes. |
| `backend/app/api/routes/executions.py` | implemented | Persisted execution record routes. |
| `backend/app/api/routes/artifacts.py` | implemented | Persisted artifact metadata routes. |
| `backend/app/api/routes/tools.py` | implemented | Structured dispatch route. |
| `backend/app/api/routes/tools_catalog.py` | implemented | Rich tool catalog route. |
| `backend/app/main.py` | implemented | Wires Phase 1 and current Phase 2 backend route set plus DB init. |
| `backend/app/models/__init__.py` | implemented | Package marker. |
| `backend/app/models/api.py` | implemented | Shared API response models. |
| `backend/app/models/catalog.py` | implemented | Rich catalog contract with tool metadata. |
| `backend/app/models/control_plane.py` | implemented | Run, approval, lock, event, execution, artifact, and policy models. |
| `backend/app/models/request_envelope.py` | implemented | Typed request validation with normalized locks. |
| `backend/app/models/response_envelope.py` | implemented | Shared dispatch response envelope. |
| `backend/app/services/__init__.py` | implemented | Package marker. |
| `backend/app/services/approvals.py` | implemented | In-memory approval bookkeeping. |
| `backend/app/services/artifacts.py` | implemented | Persistence-backed artifact metadata service. |
| `backend/app/services/catalog.py` | implemented | Tool registry abstraction with metadata. |
| `backend/app/services/db.py` | implemented | SQLite init, path strategy, and runtime DB helpers. |
| `backend/app/services/dispatcher.py` | implemented | Dispatch prechecks, persistence-backed bookkeeping, and explicit simulated execution. |
| `backend/app/services/events.py` | implemented | Persistence-backed event log service. |
| `backend/app/services/executions.py` | implemented | Persistence-backed execution record service. |
| `backend/app/services/locks.py` | implemented | Persistence-backed lock precheck and acquisition service. |
| `backend/app/services/policy.py` | implemented | Derived policy/precheck service. |
| `backend/app/services/runs.py` | implemented | Persistence-backed run tracking service. |
| `backend/app/repositories/control_plane.py` | implemented | Thin repository/data-access layer for control-plane SQL. |
| `backend/requirements.txt` | scaffolded | Minimal runtime/test deps only. |
| `backend/tests/test_api_routes.py` | implemented | Route-level coverage for Phase 1 slice. |
| `backend/tests/test_catalog.py` | implemented | Catalog-level unit tests. |
| `backend/tests/test_dispatcher.py` | implemented | Dispatcher approval/lock/run behavior tests. |
| `contracts/README.md` | scaffolded | Directory intent only. |
| `contracts/o3de-agent-tool-contract-v1.md` | implemented | Rich control-plane contract and policy language. |
| `docs/PRODUCTION-BUILD-ROADMAP.md` | implemented | Official ordered build roadmap. |
| `docs/README.md` | implemented | Points to workflow and roadmap. |
| `docs/WORKFLOW-CODEX-CHATGPT.md` | implemented | Official collaboration and safety workflow. |
| `docs/architecture/overview.md` | implemented | High-level architecture and near-term slice. |
| `frontend/README.md` | scaffolded | Run instructions exist, but UI maturity is overstated if treated as production. |
| `frontend/index.html` | implemented | Standard Vite entrypoint. |
| `frontend/package.json` | scaffolded | Basic React/Vite package; no lint/test automation yet. |
| `frontend/src/App.tsx` | implemented | Operator shell now consumes rich catalog metadata. |
| `frontend/src/components/AgentPanel.tsx` | scaffolded | Visual summary panel. |
| `frontend/src/components/ApprovalQueue.tsx` | scaffolded | Still uses mock data. |
| `frontend/src/components/CatalogPanel.tsx` | implemented | Renders rich tool metadata from backend catalog. |
| `frontend/src/components/DispatchForm.tsx` | implemented | Dispatches using rich tool definitions. |
| `frontend/src/components/LayoutHeader.tsx` | implemented | Basic layout header. |
| `frontend/src/components/ResponseEnvelopeView.tsx` | implemented | Response viewer for dispatch output. |
| `frontend/src/components/TaskTimeline.tsx` | scaffolded | Still uses mock data. |
| `frontend/src/data/mockAgents.ts` | placeholder | Transitional fallback data for UI shell. |
| `frontend/src/data/mockApprovals.ts` | placeholder | Mock-only until approval endpoints are wired into UI. |
| `frontend/src/data/mockTimeline.ts` | placeholder | Mock-only until events/runs are wired into UI. |
| `frontend/src/lib/api.ts` | scaffolded | API client covers catalog and dispatch only. |
| `frontend/src/main.tsx` | implemented | React bootstrap. |
| `frontend/src/types/contracts.ts` | implemented | Frontend contract types now aligned with rich catalog metadata. |
| `frontend/tsconfig.json` | implemented | TypeScript config present. |
| `frontend/vite.config.ts` | implemented | Vite config present. |
| `schemas/README.md` | implemented | Directory now reflects current schema coverage and next schema gaps. |
| `schemas/run.schema.json` | implemented | Machine-readable run entity schema. |
| `schemas/approval.schema.json` | implemented | Machine-readable approval entity schema. |
| `schemas/lock.schema.json` | implemented | Machine-readable lock entity schema. |
| `schemas/event.schema.json` | implemented | Machine-readable event entity schema. |
| `schemas/execution.schema.json` | implemented | Machine-readable execution entity schema. |
| `schemas/artifact.schema.json` | implemented | Machine-readable artifact metadata schema. |
| `schemas/request-envelope.schema.json` | implemented | Machine-readable request envelope schema. |
| `schemas/response-envelope.schema.json` | implemented | Covers the dispatch response envelope used by the current backend/API surface. |

## Current Gaps

1. Frontend operator views still use mock approval and timeline data. Backend persistence exists, but the Phase 4 UI wiring is intentionally not complete yet.
2. The contract layer is still ahead of implementation depth. Tools are cataloged and policy-aware, but no real O3DE adapters are implemented yet.
3. `agents/engine-code.yaml` is still missing even though the contract defines an engine-code domain.
4. The schema layer is improved but still incomplete for full Phase 3 coverage. Policy schemas, per-tool arg/result schemas, and richer contract/schema cross-linking are not finished yet.
5. Verification remains partial in this workspace because `pytest` is unavailable and non-elevated SQLite writes have produced `sqlite3.OperationalError: disk I/O error`.

## Phase 2 Status Note

Current branch state now includes:

- persisted `runs`
- persisted `approvals`
- persisted `locks`
- persisted `events`
- persisted `executions`
- persisted `artifacts`
- a thin repository/data-access layer for control-plane SQL
- explicit simulated execution labeling across runtime behavior and persisted records

Verification limits observed so far:

- `pytest` is unavailable in the local Python environment
- non-elevated SQLite writes have failed in this workspace with `sqlite3.OperationalError: disk I/O error`
- elevated verification has succeeded, so the persistence path is partially validated but not fully sandbox-clean

## Missing Production Baseline Files

- No `.github/workflows/` CI configuration
- No backend or frontend `Dockerfile`
- No `docker-compose.yml` or equivalent local stack file
- No `.env.example`
- No lint or format configuration for Python or TypeScript
- No Python project metadata such as `pyproject.toml`
- No frontend lockfile committed
- No pytest config file beyond dependency pinning

## Naming and Consistency Findings

1. The repo mission is consistent across README, workflow, roadmap, and contract docs.
2. The contract defines an `engine-code` domain, but the agent directory and active backend catalog do not yet expose that domain.
3. The frontend was originally shaped around string-only tool lists, while the backend model already expected rich tool metadata. This has been corrected in the Phase 1 slice.
4. The repo uses `project-build`, `asset-pipeline`, `render-lookdev`, `editor-control`, and `validation` consistently across most files.

## Recommended First Branch For Phase 1

`feat/backend-control-plane-foundation`

This branch should own:
- backend service boundaries
- request prechecks
- runs/approvals/locks/events/policies APIs
- honest simulated execution labeling
- basic backend route/service tests

## Recommended Next Step

Continue Phase 2 and Phase 3-prep work by tightening runtime DB-path/environment handling, finishing machine-readable control-plane schemas, and keeping simulated execution explicit until Phase 6 adapter work begins.
