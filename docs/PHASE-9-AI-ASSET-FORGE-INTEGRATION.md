# Phase 9 and AI Asset Forge Integration

## Current Phase 9 status

Current Phase 9 state:

- project-general asset readback discovery helper exists
- `McpSandbox` proof target still works
- project-general discovery is integrated into the proof-only
  `asset.source.inspect` path
- structured proof schema hardening exists
- readiness/review contract exists
- review packet implementation exists
- production-general public admission is still withheld

The helper is recorded in
`docs/PHASE-9-PROJECT-ASSET-READBACK-DISCOVERY.md` and implemented in
`backend/app/services/asset_readback_discovery.py`. It discovers project root,
`project.json`, `Cache`, `assetdb.sqlite`, available platform cache folders,
platform `assetcatalog.xml`, and source-asset readiness without mutating the
project.

The proof-only adapter integration is recorded in
`docs/PHASE-9-PROJECT-GENERAL-ASSET-SOURCE-INSPECT-PROOF.md`. It carries
project-general discovery metadata through `asset.source.inspect`, opens
`assetdb.sqlite` read-only, queries source/product/dependency evidence, and
cross-checks Asset Catalog product-path presence.

The structured proof schema hardening is recorded in
`docs/PHASE-9-ASSET-SOURCE-INSPECT-SCHEMA-HARDENING.md`.

The public admission decision is recorded in
`docs/PHASE-9-ASSET-READBACK-ADMISSION-DECISION.md`: keep the existing narrow
read-only `asset.source.inspect` surface active, but do not promote it to a
production-general public adapter until freshness, platform, and operator
readiness/review gaps are closed.

The readiness/review contract is recorded in
`docs/PHASE-9-ASSET-READBACK-READINESS-REVIEW-CONTRACT.md`. It defines the
operator-facing review fields needed for freshness, selected platform,
missing-substrate guidance, mutation flags, safest next step, and future AI
Asset Forge provenance handoff.

The review packet implementation is recorded in
`docs/PHASE-9-ASSET-READBACK-REVIEW-PACKET-IMPLEMENTATION.md`. It carries the
review contract into `asset.source.inspect` execution details and artifact
metadata without widening mutation or asset-processing capability.

## Why AI Asset Forge depends on Phase 9

Generated assets must be validated through the same source/product/dependency
and catalog readback path.

AI Asset Forge should not treat a generated GLB, OBJ, FBX, material, or texture
as O3DE-ready until O3DE has processed the source asset and Phase 9 can prove:

- the source asset is inside the selected project
- Asset Processor produced product rows
- product dependency rows are available when expected
- the selected platform catalog contains the product path
- the review packet can report provenance and readiness honestly
- no mutation occurred outside an admitted corridor

## Completed Phase 9 packet

This packet is now implemented:

```text
Branch:
codex/phase-9-project-general-asset-source-inspect-proof

PR title:
Prove project-general asset source inspect
```

Purpose:

Integrate project-general discovery into `asset.source.inspect` proof path,
still read-only.

The proof uses dynamic project-root and source-asset inputs rather than
hardcoded `McpSandbox` or `BridgeLevel01` assumptions. It proves fail-closed
readiness behavior for missing project root, `project.json`, `Cache`,
`assetdb.sqlite`, platform catalog, unsafe source path, missing source, and
missing product evidence.

## Completed Phase 9 schema packet

This packet is now implemented:

```text
Branch:
codex/phase-9-asset-source-inspect-schema-hardening

PR title:
Harden asset source inspect proof schema
```

Purpose:

Promote the newly returned structured source/product/dependency/catalog proof
fields into the published `asset.source.inspect` execution-details and
artifact-metadata schemas, while preserving compatibility with existing string
evidence.

## Completed Phase 9 admission decision

This packet is now implemented:

```text
Branch:
codex/phase-9-asset-readback-admission-decision

PR title:
Decide Phase 9 asset readback public admission
```

Purpose:

Decide whether the current project-general, read-only
`asset.source.inspect` source/product/dependency/catalog corridor is ready to
be described as a public admitted readback corridor, or whether additional
schema, freshness, platform, or operator UX work is required first.

Decision:

Do not promote to production-general public admission yet. Keep the existing
narrow read-only corridor active while the next packet defines the
operator-facing readiness/review contract.

## Completed Phase 9 readiness contract packet

This packet is now documented:

```text
Branch:
codex/phase-9-asset-readback-readiness-review-contract

PR title:
Define Phase 9 asset readback readiness review contract
```

Purpose:

Define the operator-facing readiness/review packet for project-general asset
readback, including freshness, platform, missing-substrate guidance, and the
fields AI Asset Forge will need before generated assets can be considered
usable.

## Completed Phase 9 review packet implementation

This packet is now implemented:

```text
Branch:
codex/phase-9-asset-readback-review-packet-implementation

PR title:
Implement Phase 9 asset readback review packet
```

Purpose:

Carry the readiness/review contract into the operator-facing output path while
remaining read-only and preserving all asset mutation, Asset Processor, import,
assignment, and placement boundaries.

## Completed Forge Phase 0 audit

This packet is now documented:

```text
Branch:
codex/ai-asset-forge-local-model-substrate-audit

PR title:
Audit local AI 3D model substrate options
```

Purpose:

Choose the first private/local 3D generation backend for a proof-only asset
generation pipeline.

The audit is recorded in
`docs/AI-ASSET-FORGE-LOCAL-MODEL-SUBSTRATE-AUDIT.md`. It selects TripoSR as the
first proof-only local generation candidate while keeping all model downloads,
dependency changes, generated assets, O3DE import, Asset Processor execution,
assignment, placement, and production admission blocked.

## Required next Forge packet

After the model substrate audit, this packet was implemented:

```text
Branch:
codex/ai-asset-forge-local-generation-proof

PR title:
Prove local AI asset generation outside O3DE
```

Purpose:

Generate one proof-only raw asset candidate outside the repository and outside
any O3DE project, using the audited TripoSR path and explicit operator approval
before any model download or dependency installation.

Result:

The proof is recorded in `docs/AI-ASSET-FORGE-LOCAL-GENERATION-PROOF.md`.
TripoSR generated one OBJ mesh from the upstream chair example outside the repo
and outside O3DE projects. The generated asset is not committed and is not
admitted for O3DE import, assignment, placement, or production use.

## Required next Forge packet

After local generation proof, this packet was implemented:

```text
Branch:
codex/ai-asset-forge-cleanup-conversion-proof

PR title:
Prove AI Asset Forge cleanup conversion outside O3DE
```

Purpose:

Use the generated OBJ as a proof-only input and validate cleanup/conversion
outside O3DE before any import-readiness design or O3DE project mutation.

Result:

The proof is recorded in `docs/AI-ASSET-FORGE-CLEANUP-CONVERSION-PROOF.md`.
The generated TripoSR OBJ was inspected, normalized to unit scale, and exported
as a GLB outside the repo and outside O3DE projects. The converted asset is not
committed and is not admitted for O3DE import, assignment, placement, or
production use.

## Required next Forge packet

After cleanup/conversion proof:

```text
Branch:
codex/ai-asset-forge-import-readiness-design

PR title:
Design AI Asset Forge O3DE import readiness
```

Purpose:

Design the staging, naming, provenance, format, approval, and Phase 9 readback
requirements for the first future proof-only O3DE source-asset staging packet.

## Final rule

Do not build AI Asset Forge by bypassing O3DE.

Generated assets must flow through O3DE source assets, Asset Processor, Asset
Database, Asset Catalog, and operator review.
