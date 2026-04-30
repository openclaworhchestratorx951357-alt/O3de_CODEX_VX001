# AI Asset Forge Provider Preflight Hardening

Status: hardened (preflight-only provider registry; non-authorizing)

## Purpose

Harden provider-preflight truth so provider readiness remains auditable while
all external provider task creation and generation execution stay blocked.

## Scope

- audit provider status route/model/service behavior
- confirm provider-mode and credential-state reporting remains deterministic
- confirm provider preflight remains no-provider-call and non-authorizing
- preserve stage-plan/stage-write/readback non-authorizing boundaries
- no runtime admission or mutation broadening

## Truth sources used

1. Runtime/service/model/route implementation:
   - `backend/app/services/asset_forge.py`
   - `backend/app/models/asset_forge.py`
   - `backend/app/api/routes/asset_forge.py`
2. Existing stream docs:
   - `docs/AI-ASSET-FORGE-STAGE-PLAN-EVIDENCE-REFRESH.md`
   - `docs/AI-ASSET-FORGE-READBACK-BRIDGE-HARDENING-AUDIT.md`
   - `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`
3. O3DE evidence-substrate baseline:
   - `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md`

## Hardened provider preflight truth

Established and verified:

- provider status endpoint exists:
  - `GET /asset-forge/provider/status`
- capability remains bounded:
  - `capability_name=asset_forge.provider.status`
  - `maturity=preflight-only`
  - `generation_execution_status=blocked`
  - `external_task_creation_allowed=false`
- provider mode resolution remains deterministic:
  - `ASSET_FORGE_PROVIDER_MODE` accepts `disabled|mock|configured|real`
  - invalid/unknown values fail closed to `disabled`
- credential reporting remains non-secret and preflight-only:
  - `credential_status=missing` when key env vars are absent
  - `credential_status=redacted-env-present` when a key is present
- provider registry entry remains explanatory-only and non-authorizing:
  - per-mode note text remains explicit about blocked execution
  - no external provider request is issued by this endpoint path

Cross-packet boundary continuity preserved:

- stage-plan remains plan-only and non-writing
- stage-write remains exact-corridor and admission-flag gated
- readback bridge remains reporting-only/read-only

## Boundaries preserved

- no provider generation execution admission
- no Blender execution admission
- no Asset Processor execution admission
- no generated-asset assignment execution admission
- no placement runtime execution admission
- no broad scene/prefab/project mutation admission
- no client/operator approval fields treated as authorization

## Validation evidence

Commands run:

- `python -m pytest backend/tests/test_api_routes.py -k "asset_forge_provider_status or asset_forge_blender_status or asset_forge_studio_status or stage_plan or stage_write or o3de_readback" -q`
- `git diff --check`
- `git diff --cached --check`

Result summary:

- targeted provider/preflight-linked tests passed
- diff checks passed (CRLF warnings only)

## Recommended next packet

Asset Forge Blender preflight hardening:

- tighten Blender preflight no-execution safeguards and evidence wording
- preserve provider/stage-plan/stage-write/readback non-authorizing boundaries
- keep assignment/placement/provider/Blender/Asset Processor execution blocked
