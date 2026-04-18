# Phase 0 Repo Audit

## Scope

This audit captures the repository state after syncing `feature/production-baseline-v1` and before deep O3DE adapter work. It is intended to satisfy the Phase 0 roadmap deliverables and to define the first coherent Phase 1 backend branch target.

## Architecture Inventory

| Area | Current state | Classification | Notes |
| --- | --- | --- | --- |
| Root README | Mission, structure, workflow pointers | implemented | Accurate high-level entrypoint. |
| `docs/` | Workflow, roadmap, architecture overview | implemented | Core planning docs are now present. |
| `backend/` | FastAPI service with dispatch/catalog routes and tests | scaffolded | Real API shell exists, but production bookkeeping was previously thin. |
| `frontend/` | React/Vite operator shell | scaffolded | Usable demo UI exists, but several panels still relied on mock data. |
| `contracts/` | Human-readable v1 tool contract | implemented | Strong domain vocabulary exists. |
| `schemas/` | Request/response schemas | scaffolded | Core envelopes exist, broader entity schemas are still missing. |
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
| `backend/README.md` | scaffolded | Run instructions exist, but wording still undersells control-plane behavior. |
| `backend/app/README.md` | scaffolded | Module intentions documented, implementation still catching up. |
| `backend/app/__init__.py` | implemented | Package marker. |
| `backend/app/api/__init__.py` | implemented | Package marker. |
| `backend/app/api/routes/__init__.py` | implemented | Package marker. |
| `backend/app/api/routes/approvals.py` | implemented | Approval query and decision routes. |
| `backend/app/api/routes/events.py` | implemented | Event log route. |
| `backend/app/api/routes/health.py` | implemented | Health, readiness, and version endpoints. |
| `backend/app/api/routes/locks.py` | implemented | Active-lock visibility route. |
| `backend/app/api/routes/policies.py` | implemented | Tool policy visibility route. |
| `backend/app/api/routes/runs.py` | implemented | Run query routes. |
| `backend/app/api/routes/tools.py` | implemented | Structured dispatch route. |
| `backend/app/api/routes/tools_catalog.py` | implemented | Rich tool catalog route. |
| `backend/app/main.py` | implemented | Wires the Phase 1 backend route set. |
| `backend/app/models/__init__.py` | implemented | Package marker. |
| `backend/app/models/api.py` | implemented | Shared API response models. |
| `backend/app/models/catalog.py` | implemented | Rich catalog contract with tool metadata. |
| `backend/app/models/control_plane.py` | implemented | Run, approval, lock, event, and policy models. |
| `backend/app/models/request_envelope.py` | implemented | Typed request validation with normalized locks. |
| `backend/app/models/response_envelope.py` | implemented | Shared dispatch response envelope. |
| `backend/app/services/__init__.py` | implemented | Package marker. |
| `backend/app/services/approvals.py` | implemented | In-memory approval bookkeeping. |
| `backend/app/services/catalog.py` | implemented | Tool registry abstraction with metadata. |
| `backend/app/services/dispatcher.py` | implemented | Dispatch prechecks, run lifecycle bookkeeping, simulated execution. |
| `backend/app/services/events.py` | implemented | In-memory event log service. |
| `backend/app/services/locks.py` | implemented | In-memory lock precheck and acquisition service. |
| `backend/app/services/policy.py` | implemented | Derived policy/precheck service. |
| `backend/app/services/runs.py` | implemented | In-memory run tracking service. |
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
| `schemas/README.md` | scaffolded | Directory intent only. |
| `schemas/request-envelope.schema.json` | implemented | Machine-readable request envelope schema. |
| `schemas/response-envelope.schema.json` | scaffolded | Covers dispatch envelope, but broader entities are not yet modeled. |

## Current Gaps

1. Persistence is still absent. Runs, approvals, locks, and events are now real control-plane records, but they are in-memory only until Phase 2.
2. The frontend still uses mock approval and timeline data. It is not yet wired to the new approval, runs, locks, events, or policy endpoints.
3. The contract layer is ahead of implementation depth. Several tools are cataloged and policy-aware, but they do not yet execute real O3DE adapters.
4. `agents/engine-code.yaml` is missing even though the contract defines an engine-code domain.
5. The schema layer is incomplete for Phase 3. There are no machine-readable schemas yet for runs, approvals, locks, artifacts, events, or policies.

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

Move into Phase 2 by adding SQLite-backed persistence for runs, approvals, locks, events, and artifacts, then wire the Phase 4 frontend views to those real APIs instead of mock datasets.
