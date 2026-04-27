# Phase 9 Asset Readback Baseline

Status: normalized phase baseline / current-truth packet

Date: 2026-04-27

## Current Main SHA

This baseline was prepared from:

```text
3e35b26de6cce5bb44eb38f544d825ac01d8e570
```

## Phase Workflow Stage

Baseline / current truth packet.

This packet starts Phase 9 asset readback work without implementing behavior,
running live asset mutation proof, or admitting any new public surface.

## Phase 9 Domain

Phase 9 is the real O3DE integration slice for assets, prefabs, and pipeline
work. The roadmap goal is asset and content-pipeline awareness, but this phase
must still follow the normalized workflow:

```text
unknown -> discovered -> designed -> audited -> proof-only -> admission decision -> exact admission -> reviewed -> documented -> checkpointed
```

The safe starting point is readback and identity evidence, not asset mutation.

## Current Capability State

The current asset/pipeline baseline is already narrow but useful:

| Surface | Current truth | Evidence boundary |
| --- | --- | --- |
| `asset.processor.status` | admitted real read-only / hybrid read-only | Host process-name probe for Asset Processor runtime visibility only. Job telemetry and platform status remain unavailable. |
| `asset.source.inspect` | admitted real read-only / hybrid read-only | Explicit project-local source path resolution, file presence/type, file size, and SHA-256 evidence. Product and dependency evidence remain unavailable because no product/dependency index is admitted. |
| `asset.batch.process` | admitted real plan-only | Explicit project-relative source glob preflight with source-candidate and runtime-probe evidence. Actual asset batch execution is not admitted. |
| `asset.move.safe` | admitted real plan-only | Explicit source-to-destination project-local identity preflight. No file move, rename, reference repair, or result artifact is produced. |
| prefab/reference inspection | missing / not admitted | No public prefab reference, nesting, source/product identity, or dependency graph readback surface is admitted for Phase 9 yet. |

Material and render surfaces are related but remain separate:

- `render.material.inspect` is a narrow real read-only material inspection path.
- `render.material.patch` is a narrow mutation-gated material-file corridor.
- Neither surface admits broad asset, prefab, render, shader, or reference
  graph mutation for Phase 9.

## Admitted Read Paths

Phase 9 may start from these already admitted read-only paths:

- `asset.processor.status`
- `asset.source.inspect`

Their useful readback fields include:

- runtime probe availability and process count for Asset Processor status
- requested source path
- resolved project-local source path
- project-relative source path
- source existence and file/non-file status
- source size and SHA-256 when the source resolves to a file
- explicit product/dependency evidence unavailable flags

## Plan-Only Paths

These paths are real preflight/result-truth corridors, not execution:

- `asset.batch.process`
- `asset.move.safe`

They can report candidate and identity facts, but must keep these flags true in
operator interpretation:

- no asset batch command was executed
- no asset files were moved
- no references were repaired
- no result artifact was produced by real execution
- any actual write-side action remains future work

## Proof-Only Surfaces

No Phase 9-specific proof-only asset product/dependency/prefab readback harness
is recorded in the current baseline.

Existing proof-only editor/component-property harnesses from Phase 8 do not
admit asset, prefab, product, or dependency graph readback.

## Blocked Or Missing Surfaces

These remain blocked, missing, or unadmitted:

- Asset Processor job telemetry
- Asset Processor platform status telemetry
- product asset lookup from source asset identity
- dependency graph or reference graph readback
- prefab reference and nesting inspection
- product/source UUID or asset-id mapping beyond explicit source file metadata
- real `AssetProcessorBatch` execution
- real asset reprocess execution
- real asset move or rename mutation
- reference repair or path-to-UUID migration
- source/product cache mutation
- broad material, render, or shader mutation through asset workflows

## Forbidden Or High-Risk Without Approval

Supervisor Mode does not authorize Phase 9 to jump straight to mutation.

These actions require a later high-risk packet with explicit operator approval,
implementation, tests, proof, review evidence, and rollback or restore story:

- moving, renaming, deleting, or rewriting asset files
- editing prefabs or scene references
- repairing references automatically
- running Asset Processor or `AssetProcessorBatch` as a real execution surface
- mutating product cache state
- claiming product/dependency completeness without a real index substrate
- broad asset/material/render mutation
- arbitrary shell, Python, or Editor Python execution

## Current Evidence Read For This Baseline

Code and docs inspected for this baseline:

- `backend/app/services/planners/asset_pipeline_planner.py`
- `backend/app/services/adapters.py`
- `backend/app/services/capability_registry.py`
- `backend/app/services/catalog.py`
- `backend/tests/test_dispatcher.py`
- `backend/tests/test_prompt_control.py`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/PERSISTED-SCHEMA-COVERAGE-CHECKPOINT.md`

Observed code truth:

- Prompt planning requires explicit paths or globs before asset inspection,
  batch preflight, or move preflight.
- The hybrid adapter has real read-only paths for runtime/source inspection.
- The hybrid adapter has real plan-only paths for asset batch and move
  preflight.
- Fallbacks preserve simulated/fallback provenance when the real path is
  unavailable or outside the admitted boundary.
- Tests cover dispatcher payloads, prompt planning, prompt execution summaries,
  persisted schema validation, dry-run fallback, and plan-required fallback for
  the current asset surfaces.

## Validation Commands For This Packet

This docs-only packet should be validated with:

```powershell
git diff --check
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_dispatcher.py -k "asset_processor_status or asset_source_inspect or asset_batch_process or asset_move_safe" -q
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "asset_source_inspect or asset_batch_process or asset_move_safe or asset_processor_status" -q
Pop-Location
git diff --cached --check
```

Run `surface-matrix-check` in a later packet if the surface matrix, capability
labels, or admission boundaries are changed.

## Recommended Next Normalized Packet

The next Phase 9 packet should be:

```text
codex/phase-9-asset-readback-discovery
```

Scope:

- candidate-only read-only discovery for product/dependency evidence substrates
  behind `asset.source.inspect`
- identify whether a project-local product index, asset database, asset catalog,
  or metadata source can be read safely
- record blockers for prefab/reference graph readback
- preserve `asset.batch.process` and `asset.move.safe` as plan-only
- do not mutate assets, product cache, prefabs, or references

Do not proceed directly to Asset Processor execution, asset move mutation, or
prefab/reference repair.

## Revert Path

Revert the commit that adds this baseline document and its index/status
pointers. No runtime behavior, capability admission, dependency, or proof
artifact should need cleanup.
