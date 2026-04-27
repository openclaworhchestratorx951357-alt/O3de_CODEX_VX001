# Phase 9 Asset Readback Blocked Checkpoint

Status: normalized phase blocked checkpoint

Date: 2026-04-27

## Current Main SHA

This checkpoint was prepared from:

```text
015b4ec04a6126fc06cc6f462b89ca1935c2706b
```

## Checkpoint Decision

Phase 9 product/dependency readback is checkpointed as blocked at the substrate
gate.

Do not implement product/dependency evidence availability, prefab/reference
graph readback, `asset.product.resolve`, Asset Processor job telemetry, or
Asset Processor execution until an operator provides an exact read-only
project/cache substrate sample and a later audit admits it.

## Sequence Completed

The completed Phase 9 asset readback sequence is:

| PR | Packet | Outcome |
| --- | --- | --- |
| #75 | `docs/PHASE-9-ASSET-READBACK-BASELINE.md` | Re-established current asset/pipeline truth before widening any asset surface. |
| #76 | `docs/PHASE-9-ASSET-READBACK-DISCOVERY.md` | Selected product/dependency evidence behind `asset.source.inspect` as the safest candidate. |
| #77 | `docs/PHASE-9-ASSET-READBACK-DESIGN.md` | Designed a future read-only corridor without runtime, schema, or public-admission changes. |
| #78 | `docs/PHASE-9-ASSET-READBACK-READINESS-AUDIT.md` | Found the candidate not ready because no exact substrate, mapping, or freshness model was available. |
| #79 | `docs/PHASE-9-ASSET-READBACK-SUBSTRATE-RESEARCH.md` | Confirmed no repo-owned or operator-provided product/dependency substrate exists yet. |

## Current Admitted Asset Truth

These asset/pipeline surfaces remain unchanged:

- `asset.processor.status` is admitted narrow real read-only host process-name
  visibility only.
- `asset.source.inspect` is admitted narrow real read-only project-local source
  file identity and hash evidence.
- `asset.batch.process` is admitted real plan-only preflight/result truth.
- `asset.move.safe` is admitted real plan-only identity/reference preflight.

Current `asset.source.inspect` may report:

- source path input and resolved project-local path
- source existence and file status
- source size
- source SHA-256
- requested product/dependency flags
- product/dependency evidence unavailable fields and reasons

It must not report product/dependency availability as true yet.

## Blocked Or Missing

The following remain blocked, missing, or unadmitted:

- product asset lookup from source asset identity
- dependency graph or reference graph readback
- prefab reference and nesting inspection
- source/product UUID or asset-id mapping beyond explicit source file metadata
- Asset Processor job telemetry
- Asset Processor platform status telemetry
- `asset.product.resolve`
- real `AssetProcessorBatch` execution
- real asset reprocess execution
- real asset move or rename mutation
- reference repair or path-to-UUID migration
- product cache mutation
- broad material, render, shader, build, TIAF, or Editor Python expansion
  through asset readback

## Required Unblocker

To reopen this Phase 9 corridor, an operator must provide an exact read-only
sample with:

- project root
- engine root, if relevant
- cache or product-index root, if relevant
- one explicit project-relative source asset path
- exact product/dependency index, database, catalog, log, or sidecar path
- source-to-product mapping explanation
- source-to-dependency mapping explanation
- freshness evidence such as timestamp, generation id, cache epoch, source hash,
  or another auditable signal
- confirmation that the sample may be read without running Asset Processor or
  mutating source/product/cache files

The next packet after such evidence should be:

```text
codex/phase-9-asset-readback-substrate-audit
```

## What Not To Do Next

Do not create a proof-only harness or implementation packet for this corridor
until the substrate audit exists.

Do not use:

- ignored runtime restore-boundary `.prefab` backups as product/dependency truth
- broad external cache probing
- inferred source-to-product mapping
- partial dependency evidence as completeness
- Asset Processor execution as a readback shortcut
- documentation-only claims to promote product/dependency availability

## Safe Pivot Options

With product/dependency readback checkpointed as blocked, safe next slices are:

1. Operator-provided substrate audit, only if a concrete sample is available.
2. A separate Phase 9 read-only discovery slice for another narrow asset/pipeline
   surface that does not require product/dependency availability.
3. A Phase 8 read-only discovery slice for the next component/property target,
   without adding restore targets, generalized undo, or broad write behavior.
4. Repository hygiene or documentation packets that do not change runtime,
   dependencies, GitHub settings, CI, or branch state.

## Validation Commands For This Packet

This docs-only packet should be validated with:

```powershell
git diff --check
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_dispatcher.py -k "asset_source_inspect or asset_processor_status or asset_batch_process or asset_move_safe" -q
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "asset_source_inspect or asset_processor_status or asset_batch_process or asset_move_safe" -q
Pop-Location
git diff --cached --check
```

Run `surface-matrix-check` only if a later packet changes surface labels,
admission state, or matrix wording.

## Revert Path

Revert the commit that adds this checkpoint document and its index/status
pointers. No runtime cleanup, dependency cleanup, proof artifact cleanup, or
asset cleanup should be required.
