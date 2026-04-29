# Audit Review Dashboard Shell

Status: frontend/static-fixture first

## Purpose

Expose cross-domain audit verdicts in the UI so operators can quickly see
which lanes are passing, watching, or blocked before approving further unlock
packets.

## Scope in this packet

- frontend-only shell surface
- static fixture rows for cross-domain audit verdicts
- explicit maturity/risk/gate labels
- explicit no-execution boundary labels

## Not in scope

- no backend API/runtime changes
- no mutation or execution admission changes
- no approval/session model changes
- no provider/Blender/Asset Processor/placement execution admission

## Evidence

- `frontend/src/components/AppAuditReviewDashboardShell.tsx`
- `frontend/src/fixtures/appAuditReviewDashboardFixture.ts`
- `frontend/src/components/AppAuditReviewDashboardShell.test.tsx`
- `frontend/src/App.tsx` Home Overview integration
