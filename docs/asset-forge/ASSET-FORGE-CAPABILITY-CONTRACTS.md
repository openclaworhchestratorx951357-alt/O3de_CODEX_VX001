# Asset Forge Capability Contracts

Status: capability naming and admission guide

## Capability naming convention

Use explicit names. Avoid vague operations such as `run`, `execute`, `process`, or `do_asset`.

Suggested capability families:

```text
asset_forge.task.plan
asset_forge.task.create
asset_forge.provider.status
asset_forge.provider.preview.plan
asset_forge.provider.preview.create
asset_forge.provider.output.fetch
asset_forge.candidate.list
asset_forge.candidate.select
asset_forge.candidate.reject
asset_forge.local_import.plan
asset_forge.local_import.create
asset_forge.blender.status
asset_forge.blender.inspect
asset_forge.blender.prep.plan
asset_forge.blender.prep.execute
asset_forge.o3de.stage.plan
asset_forge.o3de.stage.write
asset_forge.o3de.ingest.inspect
asset_forge.o3de.placement.plan
asset_forge.o3de.placement.execute
asset_forge.review.bundle
```

## Initial maturity recommendations

| Capability | Initial state | Notes |
|---|---|---|
| `asset_forge.task.plan` | plan-only | Safe first backend target. |
| `asset_forge.candidate.list` | demo | Safe for GUI shell if clearly labeled. |
| `asset_forge.candidate.select` | demo/local | Safe local UI state first. |
| `asset_forge.provider.status` | preflight-only | Report disabled/mock/configured only. |
| `asset_forge.provider.preview.create` | blocked | Do not call provider until policy/config/cost/provenance gates exist. |
| `asset_forge.blender.status` | preflight-only | Detect path/version only. |
| `asset_forge.blender.inspect` | future gated-real | Requires repo-owned script and tests. |
| `asset_forge.blender.prep.execute` | blocked | Requires allowlisted scripts and artifact evidence. |
| `asset_forge.o3de.stage.plan` | plan-only | Safe before mutation. |
| `asset_forge.o3de.stage.write` | blocked | Requires approval, deterministic path, manifest, and revert plan. |
| `asset_forge.o3de.ingest.inspect` | future read-only | Build on Phase 9 asset readback. |
| `asset_forge.o3de.placement.plan` | plan-only | Safe before Editor mutation. |
| `asset_forge.o3de.placement.execute` | blocked | Requires exact admitted Editor path. |
| `asset_forge.review.bundle` | plan-only/demo first | Should become real as evidence grows. |

## Contract rules

Every capability needs:
- typed input schema
- typed output schema
- maturity label
- policy/admission behavior
- test coverage
- evidence behavior
- rollback or clear non-rollback statement for writes

## Provider contract

Provider calls must not be introduced casually.

Before real provider execution:
- provider mode must be visible
- credentials must not be exposed to frontend
- cost/rate-limit behavior must be understood
- output format support must be explicit
- task provenance must be recorded
- generated files must land in isolated runtime workspace

## Blender contract

Blender integration must be allowlisted.

Allowed early operations:
- locate executable
- report version
- report supported status
- run read-only inspection script after tests exist

Blocked until proven:
- raw script entry from user
- arbitrary Python execution
- broad file-system writes
- destructive cleanup without input/output artifact capture

## O3DE staging contract

O3DE project mutation requires:
- staging plan
- approval
- deterministic destination
- provenance manifest
- post-write readback
- revert or restore path
- clear distinction between source asset and product asset

## Review contract

Review output must include:
- operation summary
- verified facts
- assumptions
- warnings
- artifacts
- approvals
- rollback status
- safest next step
