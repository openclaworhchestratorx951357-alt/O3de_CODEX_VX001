# Unpublished Worktree Inventory

## Purpose

This note classifies the remaining local dirty tree after the
`bc5400d docs(control-plane): record editor runtime proof path` publish step.

It is intentionally operational.

It does not approve all remaining changes for publication.

It exists to separate:
- coherent unpublished source/docs work
- likely generated runtime byproducts
- the next safe commit boundaries

## Current branch context

- repo:
  `C:\Users\topgu\OneDrive\Documents\GitHub\O3de_CODEX_VX001`
- branch:
  `feature/production-baseline-v1`
- most recent published commit:
  `bc5400d docs(control-plane): record editor runtime proof path`

## Bucket 1: unpublished source cohort

This is the main unpublished implementation surface still present in the tree.

Observed areas:
- backend routes, models, repositories, services, and tests
- frontend app, panels, tests, and supporting libs/types
- execution-detail/result schema updates for admitted tool families
- new bridge/prompt schema families
- Phase 6B design/contract docs
- bridge setup helper:
  `scripts/setup_control_plane_editor_bridge.ps1`

Representative backend files:
- `backend/app/services/editor_automation_runtime.py`
- `backend/app/services/o3de_target.py`
- `backend/app/services/prompt_orchestrator.py`
- `backend/app/services/prompt_sessions.py`
- `backend/app/services/executors.py`
- `backend/app/services/workspaces.py`
- `backend/app/services/planners/`
- `backend/tests/test_editor_automation_runtime.py`
- `backend/tests/test_phase6b_api.py`
- `backend/tests/test_prompt_control.py`

Representative frontend files:
- `frontend/src/App.tsx`
- `frontend/src/components/SystemStatusPanel.tsx`
- `frontend/src/components/PromptControlPanel.tsx`
- `frontend/src/components/PromptSessionPanel.tsx`
- `frontend/src/components/ExecutorsPanel.tsx`
- `frontend/src/components/WorkspacesPanel.tsx`
- `frontend/src/components/OperatorOverviewPanel.tsx`
- `frontend/src/components/SystemStatusPanel.test.tsx`

Representative schema/docs files:
- `schemas/bridge/bridge-command.schema.json`
- `schemas/bridge/bridge-result.schema.json`
- `schemas/prompt/prompt_request.schema.json`
- `schemas/prompt/prompt_session.schema.json`
- `schemas/prompt/prompt_plan.schema.json`
- `docs/PHASE-6B-*.md`

Current reading:
- this bucket looks like coherent unpublished product work, not disposable
  runtime residue
- it should be split into smaller publish units rather than pushed as one large
  mixed commit

## Bucket 2: runtime support files that may be publishable

These files appear operational rather than disposable:
- `backend/runtime/launch_branch_backend_8000.cmd`
- `backend/runtime/launch_branch_backend_8000.ps1`
- `backend/runtime/editor_scripts/_control_plane_editor_bridge.py`
- `backend/runtime/editor_scripts/bridge_invoke.py`
- `backend/runtime/editor_scripts/session_ensure.py`
- `backend/runtime/editor_scripts/level_ensure_open_or_create.py`
- `backend/runtime/editor_scripts/entity_create.py`

Current reading:
- these should be reviewed as source/operational helpers
- they should not be lumped together with generated payload/result/state files

## Bucket 3: likely generated runtime byproducts

These look like verification residue rather than intended source files:
- `backend/runtime/live-verify-control-plane.sqlite3`
- `backend/runtime/live-verify-uvicorn.out.log`
- `backend/runtime/live-verify-uvicorn.err.log`
- `backend/runtime/editor_payloads/*`
- `backend/runtime/editor_results/*`
- `backend/runtime/editor_state/*`
- `backend/backend/runtime/editor_state/*`

Observed counts at inventory time:
- `backend/runtime/editor_payloads`: 77 files
- `backend/runtime/editor_results`: 69 files
- `backend/runtime/editor_state`: 84 files
- `backend/backend/runtime/editor_state`: 3 files

Current reading:
- this bucket should be treated as cleanup/audit material, not as a default
  publication candidate
- the files are useful as local forensic evidence, but they should be reviewed
  before any staging step

## Bucket 4: local environment drift

Observed local-environment file:
- `.env.example`

Current reading:
- do not bundle this with the prompt/bridge/runtime cohort unless its purpose is
  clearly tied to a specific publish slice

## Recommended next safe commit boundaries

The next publish work should stay narrow and follow this order:

1. Runtime hygiene slice
   - classify which files under `backend/runtime/` are intended source helpers
     versus generated residue
   - keep generated payload/result/state/log/database artifacts out of the next
     commit by default

2. API/test disentangling slice
   - separate the narrow O3DE target/bridge API glue from the broader
     prompt/executor/workspace substrate changes currently mixed into tracked
     files such as `backend/app/models/api.py` and
     `backend/tests/test_api_routes.py`
   - prefer focused route/test files or similarly narrow structure over staging
     mixed tracked files wholesale

3. Backend/runtime contract slice
   - package the coherent backend bridge/runtime files, schemas, and focused
     backend tests that support the admitted-real editor runtime path
   - keep prompt/workspace/executor planning work separate if it is not required
     for that runtime boundary

4. Prompt/workspace/executor substrate slice
   - package the prompt, executor, workspace, and planner cohort with its own
     docs/tests

5. Frontend/operator shell slice
   - package the UI surfaces that visualize the new backend contracts after the
     backend slice shape is settled

## Current runtime-contract blocker

The remaining runtime helper cohort is narrow:
- `backend/runtime/launch_branch_backend_8000.cmd`
- `backend/runtime/launch_branch_backend_8000.ps1`
- `backend/runtime/editor_scripts/_control_plane_editor_bridge.py`
- `backend/runtime/editor_scripts/bridge_invoke.py`
- `backend/runtime/editor_scripts/session_ensure.py`
- `backend/runtime/editor_scripts/level_ensure_open_or_create.py`
- `backend/runtime/editor_scripts/entity_create.py`
- `backend/app/services/editor_automation_runtime.py`
- `backend/app/services/o3de_target.py`
- `backend/app/api/routes/o3de_target.py`
- `backend/tests/test_editor_automation_runtime.py`
- `scripts/setup_control_plane_editor_bridge.ps1`

However, the tracked API/test glue currently needed to publish that packet is
not narrow:
- `backend/app/main.py` also imports broader untracked `executors`,
  `workspaces`, and `prompt_control` route surfaces
- `backend/app/models/api.py` mixes the O3DE target/bridge response models with
  broader executor/workspace/prompt-oriented additions
- `backend/tests/test_api_routes.py` mixes the O3DE target/bridge route checks
  with much broader executor/workspace/prompt and summary coverage

Current reading:
- a safe runtime-contract publish slice should wait until those tracked glue
  files are disentangled
- staging the runtime helper packet right now would over-bundle the branch and
  blur the next safe commit boundary

## Standing caution

Do not treat the current dirty tree as one safe publication unit.

In particular:
- do not publish generated runtime residue by accident
- do not blur admitted-real editor runtime work together with broader prompt or
  planner work unless the dependency is confirmed
- do not relabel `editor.entity.create` as admitted real while packaging any
  remaining slices
