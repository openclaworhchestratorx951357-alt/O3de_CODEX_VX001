# Phase 9 Asset Readback Substrate Research

Status: normalized phase substrate research packet

Date: 2026-04-27

## Current Main SHA

This research packet was prepared from:

```text
49a0ee0b31d148d50c0b9ccc0451a26ebd631ded
```

## Phase Workflow Stage

Substrate research follow-up to the readiness audit.

This packet searches for an exact read-only product/dependency evidence
substrate behind the future `asset.source.inspect` corridor. It does not
implement product/dependency readback, change schemas, run Asset Processor,
mutate assets, inspect broad external cache locations, or admit a new public
capability.

## Research Decision

No repo-owned or operator-provided substrate is available yet.

Phase 9 product/dependency evidence must remain blocked until an exact
read-only substrate is provided and audited. The correct next move is not a
proof-only harness; it is an operator-provided substrate sample or a deliberate
phase pause.

## Evidence Sweep

Read-only research inspected:

- tracked filenames through `git ls-files`
- tracked source/docs through `git grep`
- current `asset.source.inspect` adapter behavior
- current asset tool schemas
- current asset pipeline tests
- Phase 9 baseline, discovery, design, and readiness audit docs
- production roadmap and remote automation plan notes
- contract-only asset product resolution notes
- ignored runtime filenames under `backend/runtime/`

The sweep excluded dependency folders and did not touch:

- `.venv/`
- `backend/.venv/`
- `frontend/node_modules/`
- product cache or source asset locations outside this repository

## Findings

| Candidate substrate | Evidence found | Decision |
| --- | --- | --- |
| Tracked project-local asset catalog or database | No tracked `asset catalog`, `asset database`, `assetdb`, `.assetinfo`, product cache, product asset manifest, source asset, or dependency index file was found. | Not available. |
| Current `asset.source.inspect` adapter | The adapter records source-file identity and explicitly returns product/dependency evidence unavailable because no product/dependency index is admitted. | Preserve current behavior. |
| Published asset schemas | Schemas exist for `asset.processor.status`, `asset.source.inspect`, `asset.batch.process`, and `asset.move.safe`; no product-resolution tool schema exists. | No schema-backed product substrate is present. |
| `asset.product.resolve` contract note | `contracts/o3de-agent-tool-contract-v1.md` describes a possible read-only product resolution surface. It is not cataloged, planned, schematized, tested, or implemented in backend code. | Directional only; not an admitted substrate. |
| Asset Processor host process probe | Existing code can detect host-visible Asset Processor process names for `asset.processor.status`. It does not expose job telemetry, product outputs, dependency graphs, or source-to-product mapping. | Insufficient for product/dependency evidence. |
| `AssetProcessorBatch` | Roadmap and contracts identify it as official pipeline family context, but real execution remains non-admitted and no output/log sample is provided. | Not usable for this read-only packet. |
| Ignored runtime restore-boundary prefabs | Local ignored `.prefab` files exist under `backend/runtime/editor_state/restore_boundaries/`. They are restore backups from editor proof flows, not public project-source product/dependency truth. | Explicitly excluded. |
| External dependency snapshots | Snapshot files are bridge-operation references, not asset catalog or product/dependency data. | Not relevant. |
| Frontend production planner notes | Planner text mentions dependency concepts at product-design level only. | Not evidence. |

## Contract-Only Product Resolve Note

The contract file contains an `asset.product.resolve` section with read-only
intent for resolving product assets from a source asset or asset id.

That note is not enough to implement Phase 9 because the repo lacks:

- a catalog entry for `asset.product.resolve`
- args/result schemas for `asset.product.resolve`
- planner routing for `asset.product.resolve`
- policy and admission rules for `asset.product.resolve`
- adapter implementation
- persisted execution-detail and artifact-metadata schemas
- dispatcher and prompt-control tests
- a real source-to-product evidence substrate

If this direction is revived later, it should start as a separate normalized
discovery/design sequence. It should not be smuggled into the current
`asset.source.inspect` extension.

## Required Operator-Provided Evidence

To unblock product/dependency readback, an operator should provide an exact
read-only sample with:

- project root
- engine root, if relevant
- cache or product-index root, if relevant
- one explicit project-relative source asset path
- the exact product/dependency index, database, catalog, log, or sidecar path
- the relationship between the source path and returned product entries
- the relationship between the source path and returned dependency entries
- freshness evidence such as timestamp, generation id, cache epoch, source hash,
  or another auditable signal
- confirmation that the sample may be read without running Asset Processor or
  mutating source/product/cache files

The sample should be small enough to fixture or summarize without committing
large product assets or ignored runtime cache.

## Blocked Work

Do not create a proof-only harness yet for:

- product evidence availability
- dependency evidence availability
- prefab/reference graph readback
- `asset.product.resolve`
- Asset Processor job/platform telemetry
- Asset Processor or `AssetProcessorBatch` execution
- product cache probing
- source/product mutation
- asset move/reference repair mutation

No code packet should move `product_evidence_available` or
`dependency_evidence_available` to `true` until a substrate packet names the
exact source of truth and proves freshness behavior.

## Safe Future Paths

Two safe paths remain:

1. Operator-provided substrate audit.

   Use a new packet to audit the exact local project/cache sample before any
   code work. Suggested branch:

   ```text
   codex/phase-9-asset-readback-substrate-audit
   ```

2. Phase pause / checkpoint.

   If no substrate is available, checkpoint Phase 9 as blocked at the substrate
   gate and move to another low-risk discovery packet outside product/dependency
   readback. Suggested branch:

   ```text
   codex/phase-9-asset-readback-blocked-checkpoint
   ```

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

Revert the commit that adds this substrate research document and its
index/status pointers. No runtime cleanup, dependency cleanup, proof artifact
cleanup, or asset cleanup should be required.
