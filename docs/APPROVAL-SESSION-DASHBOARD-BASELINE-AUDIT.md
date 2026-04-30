# Approval Session Dashboard Baseline Audit

Status: completed (baseline audited and reconciled; no runtime admission change)

## Purpose

Establish and preserve the truthful approval/session baseline so later shell and
timeline packets can stay anchored to explicit server-owned authorization and
fail-closed validation-hold semantics.

## Current backend surfaces

General approvals API is present:

- `GET /approvals`
- `GET /approvals/cards`
- `POST /approvals/{approval_id}/approve`
- `POST /approvals/{approval_id}/reject`

Current behavior:

- approval records are persisted and listable
- pending approvals are server-decidable through approve/reject routes
- run/event records are updated when decisions are applied

Asset Forge server-owned approval session API is present:

- `GET /asset-forge/approval-sessions`
- `POST /asset-forge/approval-sessions/prepare`
- `GET /asset-forge/approval-sessions/{session_id}`
- `POST /asset-forge/approval-sessions/{session_id}/revoke`

Current behavior:

- maturity remains `preflight-only`
- session listing is read-only
- session evaluation stays fail-closed and reports
  `client_approval_is_intent_only=true`
- mutation-capable execution remains not admitted

## Current frontend surfaces

Baseline observation captured in this packet:

- `ApprovalQueue` rendered approval list/cards, decision actions, and status
  chips in existing operations workspace surfaces
- operations workspace routed approval interactions through that queue
- no dedicated `approval.session.dashboard` component/shell was present at
  baseline capture time

Current state after downstream packets:

- dedicated `approval.session.dashboard` fixture shell is now implemented
- dashboard truth linkage for validation-hold gate-state semantics is now
  explicit
- these downstream surfaces do not broaden runtime admission and remain
  non-authorizing for client approval fields

## Authorization boundary truth

Client-provided approval fields must remain intent-only and non-authorizing.

This baseline preserves:

- server-owned approval/session records as the source of truth
- fail-closed behavior when server session scope, binding, or status is invalid
- no client-side approval/session field authorization

## Capability classification

For `approval.session.dashboard` in app unlock tracking:

- current maturity: `baseline-audited`
- desired next maturity: `GUI/demo only`

This packet does not add a new runtime endpoint, mutation path, or public
admission.

## Historical baseline and superseding packets

This baseline audit remains the canonical pre-shell reference and is now
superseded for current dashboard behavior by:

- `docs/APPROVAL-SESSION-DASHBOARD-SHELL.md`
- `docs/APPROVAL-SESSION-DASHBOARD-TRUTH-REFRESH-VALIDATION-LINKAGE.md`
- `docs/APP-WIDE-EVIDENCE-TIMELINE-SHELL.md`

## Evidence

- `backend/app/api/routes/approvals.py`
- `backend/app/services/approvals.py`
- `backend/app/api/routes/asset_forge.py`
- `backend/app/models/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `frontend/src/components/ApprovalQueue.tsx`
- `frontend/src/components/workspaces/OperationsWorkspaceDesktop.tsx`
- `frontend/src/App.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/types/contracts.ts`
- `frontend/src/components/AppApprovalSessionDashboardShell.tsx`
- `frontend/src/fixtures/appApprovalSessionDashboardFixture.ts`
- `frontend/src/components/AppApprovalSessionDashboardShell.test.tsx`

## Recommended next packet

Approval/session dashboard long-hold checkpoint packet
(`codex/approval-session-dashboard-long-hold-checkpoint-packet`):

- keep baseline, shell, and timeline wording aligned for server-owned
  authorization truth
- keep validation-hold gate-state matrix language deterministic across app-wide
  recommendation surfaces
- preserve explicit non-authorizing client-field boundary wording with no
  runtime admission broadening

