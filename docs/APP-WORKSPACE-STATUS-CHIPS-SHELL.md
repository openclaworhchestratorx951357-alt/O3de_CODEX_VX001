# App-wide Workspace Status Chips Shell

Status: frontend/static-fixture first

## Purpose

Provide compact workspace-level truth chips so operators can quickly see
maturity/risk/status posture across desks without opening every dashboard.

## Scope in this packet

- frontend-only workspace status chips shell
- static fixture first for cross-workspace chip records
- explicit chip labels for:
  - `demo`
  - `plan-only`
  - `dry-run only`
  - `proof-only`
  - `admitted-real`
  - `blocked`
- explicit no-execution/no-mutation boundary labels

## Not in scope

- no backend runtime changes
- no endpoint admission changes
- no execution or mutation admission broadening
- no provider/Blender/Asset Processor/placement admission changes
- no project file mutation

## Evidence

- `frontend/src/components/AppWorkspaceStatusChipsShell.tsx`
- `frontend/src/fixtures/appWorkspaceStatusChipsFixture.ts`
- `frontend/src/components/AppWorkspaceStatusChipsShell.test.tsx`
- `frontend/src/App.tsx` Home Overview integration

## Boundary truth

This packet is visibility-only and does not unlock execution.

## Recommended next packet

Validation intake endpoint-candidate admission design (docs/design first,
default fail-closed, no execution admission changes).
