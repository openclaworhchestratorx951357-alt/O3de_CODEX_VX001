# Asset Forge — Complete Codex Pack

Status: product, GUI, architecture, and implementation guidance
Audience: Codex, operator, reviewer
Purpose: restore Asset Forge as a Meshy-like 3D asset creation studio with Blender-grade preparation tools and safe O3DE ingestion/review.

## Read order

1. `ASSET-FORGE-PRODUCT-CHARTER.md`
2. `ASSET-FORGE-GUI-UX-SPEC.md`
3. `ASSET-FORGE-SYSTEM-ARCHITECTURE.md`
4. `ASSET-FORGE-CAPABILITY-CONTRACTS.md`
5. `ASSET-FORGE-CODEX-IMPLEMENTATION-PACKETS.md`
6. `ASSET-FORGE-PACKET-01-STATUS.md`
7. `ASSET-FORGE-PACKET-01-FINAL-REPORT.md`
8. `ASSET-FORGE-PACKET-02-READINESS-CHECKLIST.md`
9. `ASSET-FORGE-REFERENCE-MATRIX.md`
10. `CODEX-HANDOFF-ASSET-FORGE-PRODUCTION.md`
11. `ASSET-FORGE-SERVER-OWNED-APPROVAL-MODEL.md`

## Core correction

Asset Forge is not just an asset-pipeline readback lane, proof log, material utility, or file importer.

Asset Forge should become the creative 3D asset studio inside the O3DE control plane:

```text
prompt / image / references
  -> generate or import candidate 3D assets
  -> review candidate variants
  -> select one candidate
  -> inspect and prepare it with Blender-grade tools
  -> export a game-ready source asset
  -> stage it into an O3DE project only after approval
  -> verify Asset Processor, assetdb, catalog, and product evidence
  -> plan or execute admitted Editor placement
  -> present review evidence and rollback state
```

## GUI is required, not optional

The user specifically called out that the current direction does not feel thought out like Meshy or Blender. Codex must treat the GUI as a first-class implementation target.

The first safe GUI packet should create an Asset Forge Studio shell with truthful demo state. It should show the full intended workflow while making non-real actions visibly blocked, planned, demo, or preflight-only.

## Safety posture

Do not expose:
- unrestricted shell commands
- unrestricted Blender scripting
- unrestricted Editor scripting
- broad file mutation
- broad asset, material, prefab, or render mutation
- real provider submission without provider configuration, cost/provenance controls, policy, and tests

Do not claim a capability is real, production-ready, reviewable, or reversible unless the repo has code, tests, and evidence for that exact boundary.

## Existing repo history

This pack is intended to complement existing `docs/AI-ASSET-FORGE-*` and Phase 9 asset readback docs. It does not erase previous proof-only work. It provides the product and GUI path for turning that history into a coherent studio workflow.

## Checkpoint handoff

- `ASSET-FORGE-PR-138-HANDOFF.md` - durable checkpoint handoff for PR #138 status, safety boundaries, split plan, and next packet.
