# App-wide Approval/Session Dashboard Shell

Status: frontend/static-fixture first

## Purpose

Provide an operator-facing approval/session truth surface that clearly separates
client intent fields from server-owned authorization.

## Scope in this packet

- frontend-only approval/session dashboard shell
- static fixture first for bounded approval/session lifecycle states
- explicit truth labels for:
  - client intent-only fields
  - server-evaluated but unadmitted states
  - fail-closed blocked states
  - admitted-by-server exact corridors
- explicit execution/mutation boundary labels

## Not in scope

- no backend runtime changes
- no new endpoint admission
- no execution admission broadening
- no project file mutation changes
- no provider/Blender/Asset Processor/placement admission changes

## Evidence

- `frontend/src/components/AppApprovalSessionDashboardShell.tsx`
- `frontend/src/fixtures/appApprovalSessionDashboardFixture.ts`
- `frontend/src/components/AppApprovalSessionDashboardShell.test.tsx`
- `frontend/src/App.tsx` Home Overview integration

## Boundary truth

This packet is visibility-only and does not unlock execution.

## Recommended next packet

Workspace status chips shell (frontend/static-fixture first) with truthful
maturity tags and no execution admission changes.
