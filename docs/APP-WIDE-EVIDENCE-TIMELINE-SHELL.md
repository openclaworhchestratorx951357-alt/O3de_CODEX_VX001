# App-wide Evidence Timeline Shell

Status: implemented (frontend static-fixture shell + approval/validation linkage refresh)

## Purpose

Add an operator-facing evidence chronology shell that spans Asset Forge and
non-Asset-Forge domains while preserving strict no-execution/no-mutation truth.

## Scope in this packet

- adds a new fixture:
  - `frontend/src/fixtures/appEvidenceTimelineFixture.ts`
- adds a new shell component:
  - `frontend/src/components/AppEvidenceTimelineShell.tsx`
- adds a focused component test:
  - `frontend/src/components/AppEvidenceTimelineShell.test.tsx`
- integrates the shell into Home overview:
  - `frontend/src/App.tsx`

## Truth labels and chronology

The shell renders fixture-first chronology rows with explicit labels:

- `demo`
- `plan-only`
- `dry-run only`
- `proof-only`
- `admitted-real`

It also includes domain coverage and truth-label mix chips for quick audit
readback.

Approval/session + validation linkage is now explicit in timeline rows:

- validation intake endpoint candidate remains long-hold with
  server-gated default-off behavior
- `explicit_on` still stays dry-run-only with `write_status=blocked` and
  `execution_admitted=false`
- approval/session dashboard truth refresh is represented as a linked GUI demo
  row with intent-only client-field wording

## Boundary confirmation

This packet does not admit:

- backend execution for any timeline item
- mutation corridor widening
- provider/Blender/Asset Processor/placement execution
- client approval/session fields as authorization
- `/tools/dispatch` admission for `validation.report.intake`
- project file mutation

## Validation

- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `git diff --check`
- `git diff --cached --check`

## Recommended next packet

Approval/session dashboard baseline audit
(`codex/approval-session-dashboard-baseline-audit`):

- keep CI/test execution long-hold checkpoint posture explicit while preserving
  no-admission timeline truth
- keep Flow Trigger runtime-admission hold checkpoints and fail-closed taxonomy
  visible for handoff truth
- preserve restore-boundary and non-admitting runtime posture for held lanes






















