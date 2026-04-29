# App-wide Capability Dashboard Shell

Status: frontend/static-fixture first

## Purpose

Provide an app-wide operator dashboard shell for capability maturity without enabling runtime execution or mutation paths.

## Scope in this packet

- frontend-only shell surface
- static fixture rows for cross-domain capability maturity
- explicit truth labels for current maturity, desired next maturity, and risk
- explicit no-execution boundary labels

## Not in scope

- no backend API changes
- no approval/session admission changes
- no mutation/path admission
- no provider execution
- no Blender execution
- no Asset Processor execution
- no placement execution
- no runtime bridge admission changes

## Fixture-first truth model

The dashboard intentionally starts from static fixture data so operators can audit maturity state before any new execution lanes are proposed.

This packet is a UI truth surface, not an execution unlock.

## Evidence

- `frontend/src/components/AppCapabilityDashboardShell.tsx`
- `frontend/src/fixtures/appCapabilityDashboardFixture.ts`
- `frontend/src/components/AppCapabilityDashboardShell.test.tsx`
- `frontend/src/App.tsx` home overview integration
