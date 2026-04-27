# Phase 9 Asset Readback Checkpoint

## Purpose

This checkpoint records the current Phase 9 asset readback truth after the
`asset.source.inspect` Asset Processor database proof, live proof, operator
examples, and prompt refusal coverage.

## Current Admitted Read-Only Corridor

`asset.source.inspect` is an admitted narrow hybrid read-only path for one
explicit project-local source asset.

When the requested source exists under the project root and the caller asks for
product or dependency evidence, the adapter may inspect project-local
`Cache/assetdb.sqlite` in SQLite read-only URI mode.

When product rows are already proven through `Cache/assetdb.sqlite`, the
adapter may also perform a proof-only read-only product-path presence
cross-check against `Cache/<platform>/assetcatalog.xml`.

The reader may return:

- source path identity
- source file metadata and SHA-256
- bounded product rows from `Jobs` and `Products`
- bounded dependency rows from `ProductDependencies`
- bounded Asset Catalog product-path presence evidence derived only from
  already-proven product rows
- explicit unavailable evidence for missing, unreadable, unsupported, or
  source-not-indexed database cases

## Live-Proven Example

Live proof against `McpSandbox` confirmed:

- source: `Levels/BridgeLevel01/BridgeLevel01.prefab`
- product: `pc/levels/bridgelevel01/bridgelevel01.spawnable`
- product count: `1`
- dependency count: `5`
- evidence source: `assetdb.sqlite-read-only`
- unavailable evidence: none

The follow-up catalog proof added an additive read-only cross-check for the
same product path through `assetcatalog.xml-read-only`.

## Guarded Prompt Boundaries

Prompt Studio now refuses unsafe natural asset prompts for:

- Asset Processor or `AssetProcessorBatch` execution
- cache or `assetdb.sqlite` mutation
- broad product/dependency catalog resolution
- `asset.product.resolve`
- source/product asset mutation

The safe alternative remains exact read-only `asset.source.inspect` evidence
readback for one explicit source asset.

## Still Not Admitted

- public product/dependency completeness claims
- Asset Processor execution
- `AssetProcessorBatch` execution
- cache mutation
- source or product asset mutation
- broad asset catalog queries or source/product mapping from the catalog alone
- `asset.product.resolve`
- dependency repair or product generation

## Evidence

- `docs/PHASE-9-ASSET-READBACK-SUBSTRATE-AUDIT.md`
- `docs/PHASE-9-ASSET-READBACK-PROOF-ONLY.md`
- `docs/PHASE-9-ASSET-READBACK-LIVE-PROOF.md`
- `docs/PHASE-9-ASSET-READBACK-OPERATOR-EXAMPLES.md`
- `docs/PHASE-9-ASSET-CATALOG-SUBSTRATE-DISCOVERY.md`
- `docs/PHASE-9-ASSET-CATALOG-PARSER-DESIGN.md`
- `docs/PHASE-9-ASSET-CATALOG-PATH-PRESENCE-PROOF.md`
- `backend/tests/test_dispatcher.py`
- `backend/tests/test_prompt_control.py`

## Next Safe Packet

The next safe Phase 9 packet is schema/evidence-shape review for whether the
string-array product/dependency evidence should remain sufficient or become a
structured readback schema. That packet should be design/audit first and must
not change runtime behavior unless a later implementation packet is approved.

That review is now tracked in
`docs/PHASE-9-ASSET-READBACK-SCHEMA-REVIEW.md`.

Asset Catalog substrate discovery is now tracked in
`docs/PHASE-9-ASSET-CATALOG-SUBSTRATE-DISCOVERY.md`; it found product path
evidence but no implementation-ready structured parser.

Asset Catalog parser design is now tracked in
`docs/PHASE-9-ASSET-CATALOG-PARSER-DESIGN.md`; it keeps catalog work
proof-only and limits the first implementation candidate to product-path
presence evidence.

Asset Catalog product-path presence proof is now tracked in
`docs/PHASE-9-ASSET-CATALOG-PATH-PRESENCE-PROOF.md`; it adds an additive
read-only cross-check behind `asset.source.inspect` without admitting broad
catalog resolve.
