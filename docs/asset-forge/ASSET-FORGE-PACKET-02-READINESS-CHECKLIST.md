# Asset Forge Packet 02 Readiness Checklist

Date: 2026-04-28

## Packet 02 Goal

Wire Asset Forge GUI status chips/lane truth to backend capability registry and read-only status endpoints, with graceful fallback when backend telemetry is unavailable.

## Entry Conditions (Current Truth)

- Packet01 studio shell exists and is visible as a first-class frontend surface.
- Packet01 uses typed demo state for non-real workflow surfaces.
- Packet01 app/runtime demo lock blocks provider execution, Blender execution, and O3DE mutation execution.
- Packet01 frontend validations are green (build/typecheck/tests), with lint warnings only.
- Backend route and full backend suite are green in current branch context.

## In Scope for Packet 02

- Read-only capability/status wiring only.
- Provider, Blender, O3DE ingest, Placement, and Review chip truth should derive from backend status where available.
- Preserve explicit fallback labels when backend data is unavailable or incomplete.
- Keep all execution actions blocked in app/runtime until a later admitted packet.

## Out of Scope for Packet 02

- External provider generation task submission.
- Blender execution.
- O3DE mutation/write/placement execution.
- Any claim of production-ready generation.

## Required Validation for Packet 02

- `npm run typecheck`
- `npm run build`
- `npm test -- --run src/components/AssetForgeStudioPacket01.test.tsx src/App.test.tsx src/App.desktop-hydration.test.tsx`
- `python -m pytest backend/tests/test_api_routes.py -q`

## Completion Gate

Packet 02 is complete only if status-chip truth visibly reflects backend registry/read-only status with graceful fallback and no new execution path is admitted.
