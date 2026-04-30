# Audit Review Dashboard Shell

Status: frontend/static-fixture shell with status-taxonomy truth refresh

## Purpose

Expose cross-domain audit verdicts in the UI so operators can quickly see
which lanes are passing, watching, or blocked before approving further unlock
packets.

## Scope in this packet

- frontend-only shell surface
- static fixture rows for cross-domain audit verdicts
- explicit maturity/status-taxonomy/risk/gate labels
- explicit non-authorizing boundary labels
- cross-shell taxonomy vocabulary linkage

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

## Recommended next packet

Audit review dashboard truth refresh + status-chip linkage
(`codex/audit-review-dashboard-truth-refresh-status-chip-linkage`).
