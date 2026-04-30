# AI Asset Forge Blender Preflight Hardening

Status: hardened (preflight-only Blender status; non-authorizing)

## Purpose

Harden Blender-preflight truth so executable detection remains auditable while
all Blender prep/model-processing execution paths stay blocked.

## Scope

- audit Blender status route/model/service behavior
- confirm executable detection and version-probe status reporting remain bounded
- confirm Blender preflight remains no-execution and non-authorizing
- preserve provider/stage-plan/stage-write/readback non-authorizing boundaries
- no runtime admission or mutation broadening

## Truth sources used

1. Runtime/service/model/route implementation:
   - `backend/app/services/asset_forge.py`
   - `backend/app/models/asset_forge.py`
   - `backend/app/api/routes/asset_forge.py`
2. Existing stream docs:
   - `docs/AI-ASSET-FORGE-PROVIDER-PREFLIGHT-HARDENING.md`
   - `docs/AI-ASSET-FORGE-STAGE-PLAN-EVIDENCE-REFRESH.md`
   - `docs/AI-ASSET-FORGE-READBACK-BRIDGE-HARDENING-AUDIT.md`
3. O3DE evidence-substrate baseline:
   - `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md`

## Hardened Blender preflight truth

Established and verified:

- Blender status endpoint exists:
  - `GET /asset-forge/blender/status`
- capability remains bounded:
  - `capability_name=asset_forge.blender.status`
  - `maturity=preflight-only`
  - `blender_prep_execution_status=blocked`
- executable detection remains deterministic and read-only:
  - environment/path hint resolution is used for preflight detection only
  - detection failure returns `executable_found=false` with blocked status
- version probing remains non-authorizing:
  - probe path is intentionally disabled for runtime execution broadening
  - `version_probe_status` is surfaced as bounded preflight evidence
- no Blender prep execution is admitted by this lane:
  - warnings and safest-next-step guidance keep execution blocked
  - endpoint response is evidence/reporting-only

Cross-packet boundary continuity preserved:

- provider status remains preflight-only and no-provider-call
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

- `python -m pytest backend/tests/test_api_routes.py -k "asset_forge_blender_status or asset_forge_provider_status or asset_forge_studio_status or stage_plan or stage_write or o3de_readback" -q`
- `git diff --check`
- `git diff --cached --check`

Result summary:

- targeted Blender/provider/preflight-linked tests passed
- diff checks passed (CRLF warnings only)

## Recommended next packet

Placement readiness matrix refresh:

- refresh placement dry-run readiness matrix wording and evidence expectations
- preserve provider/Blender/stage-plan/stage-write/readback non-authorizing
  boundaries
- keep assignment/placement/provider/Blender/Asset Processor execution blocked
