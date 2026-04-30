# App-wide Capability Dashboard Shell

Status: frontend/static-fixture shell with status-taxonomy and status-chip linkage cue truth refresh

## Purpose

Provide an app-wide operator dashboard shell for capability maturity without enabling runtime execution or mutation paths.

## Scope in this packet

- frontend-only shell surface
- static fixture rows for cross-domain capability maturity
- explicit truth labels for current maturity, desired next maturity, status
  taxonomy, and risk
- explicit status-chip linkage cues per taxonomy row for cross-shell parity
- explicit non-authorizing boundary labels
- status-taxonomy linkage with approval/session and evidence timeline shells

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

Status taxonomy vocabulary aligned in this shell:

- `admitted-real`
- `proof-only`
- `dry-run only`
- `plan-only`
- `demo`
- `hold-default-off`
- `blocked`

## Evidence

- `frontend/src/components/AppCapabilityDashboardShell.tsx`
- `frontend/src/fixtures/appCapabilityDashboardFixture.ts`
- `frontend/src/components/AppCapabilityDashboardShell.test.tsx`
- `frontend/src/App.tsx` home overview integration

## Recommended next packet

Audit review dashboard truth refresh + status-chip linkage
(`codex/audit-review-dashboard-truth-refresh-status-chip-linkage`).
