# Codex Prompt — Asset Forge GUI Production Path

You are working in `openclaworhchestratorx951357-alt/O3de_CODEX_VX001`.

The user wants Asset Forge restored to its intended direction: a Meshy-like 3D asset generation studio with Blender-grade preparation tools and safe O3DE ingestion/review. The GUI must be a first-class deliverable and must not feel like a generic backend dashboard.

Copy the downloaded `docs/asset-forge/` folder into the repo, then follow:

1. `docs/asset-forge/README.md`
2. `docs/asset-forge/ASSET-FORGE-PRODUCT-CHARTER.md`
3. `docs/asset-forge/ASSET-FORGE-GUI-UX-SPEC.md`
4. `docs/asset-forge/ASSET-FORGE-SYSTEM-ARCHITECTURE.md`
5. `docs/asset-forge/ASSET-FORGE-CAPABILITY-CONTRACTS.md`
6. `docs/asset-forge/ASSET-FORGE-CODEX-IMPLEMENTATION-PACKETS.md`
7. `docs/asset-forge/CODEX-HANDOFF-ASSET-FORGE-PRODUCTION.md`

Start with Packet 01 unless current repo truth proves it is already complete:

`Packet 01 — Asset Forge Studio GUI shell with truthful demo state`

Exact requirements:
- Add Asset Forge as a visible frontend page or route.
- Add studio header with status chips.
- Add generation workspace.
- Add four demo candidate cards.
- Add selected candidate inspector.
- Add Blender Prep panel.
- Add O3DE ingest/review panel.
- Add evidence timeline.
- Add settings/status panel.
- Use typed frontend demo data if TypeScript is used.
- Label all non-real states as demo, planned, plan-only, preflight-only, or blocked.

Do not:
- call external providers
- run Blender
- mutate O3DE projects
- create real generated assets
- expose arbitrary script or command execution
- claim production readiness

Run frontend validation commands that exist in the repo and report exact results.

Final report must include:
- files changed
- GUI route/page added
- components/state/types added
- tests/build commands and results
- capability delta
- blockers
- safest next packet
- revert path
