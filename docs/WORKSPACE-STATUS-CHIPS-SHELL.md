# Workspace Status Chips Shell

Status: implemented (frontend static-fixture shell only)

## Purpose

Add an operator-facing status-chip shell that summarizes app-wide maturity
taxonomy in one surface without widening runtime authorization, execution, or
mutation admission.

## Scope

- adds fixture:
  - `frontend/src/fixtures/appWorkspaceStatusChipsFixture.ts`
- adds shell component:
  - `frontend/src/components/AppWorkspaceStatusChipsShell.tsx`
- adds component test:
  - `frontend/src/components/AppWorkspaceStatusChipsShell.test.tsx`
- integrates shell into Home overview stack:
  - `frontend/src/App.tsx`

## Taxonomy covered

- `admitted-real`
- `proof-only`
- `dry-run only`
- `plan-only`
- `demo`
- `hold-default-off`
- `blocked`

## Boundary truth

- static fixture only
- server-owned authorization truth
- no execution admission broadening
- no mutation corridor broadening
- no client-side authorization

## Validation

- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `git diff --check`
- `git diff --cached --check`

## Recommended next packet

Editor placement proof-only design
(`codex/editor-placement-proof-only-design`).
