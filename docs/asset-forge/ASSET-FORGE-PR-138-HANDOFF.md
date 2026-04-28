# Asset Forge PR #138 Handoff

## Current status
- PR: #138
- URL: https://github.com/openclaworhchestratorx951357-alt/O3de_CODEX_VX001/pull/138
- State: open, draft, unmerged
- Base branch: `main`
- Head branch: `codex/asset-forge-complete-gui-production-path`
- Head SHA: `df55baa9898a472ba5902dfdfc56ef7d9175ab98`
- PR #138 is a checkpoint branch, not a final production-ready feature.
- PR #138 is a large mixed branch: docs + frontend GUI + backend scaffolding + tests.

## Why this exists
Asset Forge is being re-centered as a Meshy-like 3D asset generation studio with Blender-style preparation and O3DE-safe ingest/review.

PR #138 exists to checkpoint the foundation rather than admit production execution. The current direction is GUI/editor shell and read-only/proof/preflight scaffolding first.

## What is already in PR #138
- Asset Forge docs/spec pack
- Frontend Asset Forge Studio/editor workspace shell
- Frontend API/type/demo state wiring
- Backend route/model/service scaffolding
- Backend tests
- Branch review notes
- Safety hardening commit disabling mutation-capable stage-write execution
- Safety hardening commit disabling placement live-proof runtime execution

## Safety boundaries
- Provider generation execution remains blocked.
- Blender execution remains blocked except detection/preflight/read-only inspect.
- O3DE staging mutation remains blocked.
- Placement runtime execution remains blocked.
- Asset Processor execution remains blocked.
- No arbitrary shell/script execution is exposed.
- No material/prefab/source-product-cache mutation is admitted.
- No backend capability should be considered production-admitted from this checkpoint alone.

## Important safety hardening
- Client-declared approval was identified as unsafe for stage-write and placement live-proof execution.
- Mutation-capable execution paths were disabled in commit `df55baa9898a472ba5902dfdfc56ef7d9175ab98`.
- Future mutation-capable endpoints require server-owned approval/session enforcement.
- Client request fields must be treated as intent only, not authorization.

## Validation known good
Latest known-good validation from this checkpoint:
- `python -m pytest backend/tests/test_api_routes.py -k "asset_forge" -q`
- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `git diff --check`
- `git diff --cached --check`

Reported results:
- Backend `asset_forge` route tests: pass
- Full frontend test suite: pass
- Frontend build: pass
- Frontend lint: pass with existing warnings only
- Git diff checks: clean

## Recommended decision
Do not merge PR #138 as-is unless the user explicitly accepts a large checkpoint merge.

Preferred approach: keep PR #138 as checkpoint/source branch and split into smaller PRs.

## Split plan
PR A — Asset Forge docs/spec pack
- Include `docs/asset-forge/*`
- Include `CODEX-PROMPT-ASSET-FORGE-GUI-PRODUCTION.md` if still desired
- No frontend code
- No backend code
- Lowest risk; merge first

PR B — Asset Forge frontend GUI/editor shell
- Include frontend Asset Forge Studio/editor workspace UI
- Include frontend types/fixtures/tests needed for demo/read-only UI
- No backend execution endpoints
- Must preserve demo/plan-only/preflight truth labels
- Merge after frontend tests pass

PR C — Backend read-only status/proof scaffolding
- Include only status/read-only/preflight/proof-index surfaces
- No mutation-capable stage-write execution
- No placement runtime execution
- Must include tests proving blocked behavior

PR D — Future mutation-capable gated endpoints
- Do not implement/merge yet
- Requires server-owned approval/session enforcement
- Requires tests proving client-declared approval cannot authorize mutation
- Requires explicit user approval before work starts

## Exact next Codex packet
Create PR A from PR #138: docs/spec pack only.

Instructions:
- Branch from current `main`
- Copy only docs/spec files from PR #138
- Exclude backend and frontend code
- Run `git diff --check`
- Open draft PR
- Do not merge without approval

## What not to do next
- Do not continue feature work on PR #138.
- Do not merge PR #138 whole without explicit user approval.
- Do not run Blender.
- Do not call providers.
- Do not stage assets into O3DE.
- Do not execute placement.
- Do not re-enable stage-write or live-proof runtime execution.
- Do not treat client approval fields as authorization.

## Codex Flow Trigger Suite
The user has local/untracked automation helper files referred to as the Codex Flow Trigger Suite.

These may include local watcher/relay/hotkey scripts and folders such as `.codex`, `continue-queue/`, `tmp-playwright/`, and `scripts/*auto_continue*` / `scripts/*Continue*` utilities.

These files are local operator workflow helpers, not part of PR #138 unless the user explicitly asks to productize them.

Do not commit them accidentally.

If a future session needs to formalize them, create a separate spec/PR named Codex Flow Trigger Suite with its own safety review.

They are recorded in this handoff so future Codex sessions do not confuse them with garbage or accidentally delete/commit them.

## Revert and cleanup
- To abandon PR #138, close the PR without merging.
- Delete branch only if the branch is explicitly abandoned:
  - `git push origin --delete codex/asset-forge-complete-gui-production-path`
- To revert latest safety hardening commit:
  - `git revert df55baa9898a472ba5902dfdfc56ef7d9175ab98`
- To revert prior checkpoint stabilization commits:
  - `git revert 64d60cf1e108847a4925f2806c98c4f86b029f51`
  - `git revert 662935f0fe658a9950e81719875a6343d85cf525`
  - `git revert ca4edeeb7d73f70688202e3cf99a4a9b87e49031`

PR #138 contains substantial work; do not casually delete it until split PRs are created or the user confirms abandonment.

## Future production path
1. docs/spec pack
2. GUI/editor shell
3. backend read-only status/preflight/proof surfaces
4. server-owned approval/session model
5. mutation-capable staging
6. Blender execution with allowlisted scripts only
7. provider generation integration
8. O3DE ingest and Asset Processor review
9. placement only after exact proof and rollback model
