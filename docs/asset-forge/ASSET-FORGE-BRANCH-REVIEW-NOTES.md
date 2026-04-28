# Asset Forge Branch Review Notes

Branch: `codex/asset-forge-complete-gui-production-path`

This branch is **not GUI-only**. It is a mixed frontend/backend review packet.

## Scope Reality
- Backend route/model/service files were added.
- Frontend API/types/tests were changed.
- Docs, fixtures, and integration-facing contracts were added/updated.

## Safety Boundaries
- Generation remains blocked.
- Blender execution remains blocked (detection/preflight surfaces only unless explicitly admitted by policy).
- O3DE mutation remains blocked.
- Placement remains blocked.

## Test Stabilization Status
- Tests were failing at the start of this stabilization packet.
- Stabilization fixes applied in this packet:
  - `frontend/src/App.test.tsx` mock alignment for `fetchAssetForgeStudioStatus`
  - `frontend/src/components/AssetForgeStudioPacket01.test.tsx` outliner assertion alignment
- Current validation state after fixes:
  - `npm --prefix frontend test -- AssetForgeStudioPacket01` passed
  - `npm --prefix frontend test -- App.test.tsx` passed
  - `npm --prefix frontend test -- App.desktop-hydration.test.tsx` passed
  - `npm --prefix frontend test` passed
  - `npm --prefix frontend run build` passed
  - `npm --prefix frontend run lint` passed with pre-existing warnings only (no errors)
