# Approval Session Dashboard Shell

Status: implemented (frontend static-fixture shell + validation linkage truth refresh)

## Purpose

Add a dedicated approval/session dashboard shell so operators can review
approval and server-session truth in one place without widening runtime
authorization or execution surfaces.

## Scope

- adds static-fixture dashboard component:
  - `frontend/src/components/AppApprovalSessionDashboardShell.tsx`
- adds shell fixture data:
  - `frontend/src/fixtures/appApprovalSessionDashboardFixture.ts`
- adds shell test:
  - `frontend/src/components/AppApprovalSessionDashboardShell.test.tsx`
- integrates shell into Home overview stack:
  - `frontend/src/App.tsx`

## Boundary truth

This shell is display-only and keeps existing boundaries explicit:

- `Static fixture only`
- `Server-owned authorization model`
- `Client fields are intent-only`
- `Fail-closed gate-state enforcement`
- `Dispatch unadmitted for validation.report.intake`
- `No backend admission changes`

No backend routes, policies, execution admission, or mutation admission are
broadened.

## Evidence modeled in shell

- general approvals queue surfaces (`/approvals*`)
- Asset Forge approval-session preflight surfaces
- client approval fields remain non-authorizing intent
- validation intake endpoint candidate gate-state matrix:
  - `missing_default_off`
  - `explicit_off`
  - `explicit_on`
  - `invalid_default_off`
- fail-closed refusal matrix linkage:
  - gate missing/off/invalid -> endpoint blocked (`404`)
  - client authorization fields -> fail-closed review payload
  - `/tools/dispatch` for `validation.report.intake` -> `INVALID_TOOL`
- operator-facing review/status fields surfaced in the shell fixture:
  - `admission_flag_name`
  - `admission_flag_state`
  - `admission_flag_enabled`
  - `endpoint_candidate`
  - `endpoint_admitted`
  - `dry_run_only`
  - `execution_admitted`
  - `write_executed`
  - `project_write_admitted`
  - `write_status`
  - `accepted`
  - `fail_closed_reasons`

## Validation

- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `git diff --check`
- `git diff --cached --check`

## Recommended next packet

Validation workflow hold-boundary long-hold checkpoint packet
(`codex/validation-workflow-hold-boundary-long-hold-checkpoint-packet`):

- keep CI/test long-hold checkpoint wording aligned with the existing
  fail-closed approval/session boundary model
- keep approval/session + validation hold semantics explicit across handoff
  wording
- preserve non-authorizing client-field boundary wording






















