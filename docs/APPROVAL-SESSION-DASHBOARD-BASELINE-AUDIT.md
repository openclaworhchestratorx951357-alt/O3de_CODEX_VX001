# Approval Session Dashboard Baseline Audit

Status: baseline audited (no runtime admission change)

## Purpose

Establish the current truthful baseline for approval and session visibility
before any dedicated approval/session dashboard shell packet.

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

Approval visibility currently exists through existing operations workspace
surfaces, not a dedicated approval/session dashboard shell.

Observed UI truth:

- `ApprovalQueue` renders approval list/cards, decision actions, and status
  chips
- operations workspace routes approval interactions through that queue
- no dedicated `approval.session.dashboard` component/shell is present yet

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

## Recommended next packet

Approval/session dashboard shell (frontend/static-fixture first):

- add a dedicated approval/session dashboard shell
- keep all approval/session labels truthful and explicit
- preserve `client fields are intent-only` boundary text
- no runtime admission broadening

