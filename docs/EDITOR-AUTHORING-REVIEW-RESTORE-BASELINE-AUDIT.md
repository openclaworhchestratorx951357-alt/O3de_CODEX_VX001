# Editor Authoring Review/Restore Baseline Audit

Status: baseline audit only (no runtime change)

## Purpose

Establish current truth for editor authoring and review/restore lanes so future
unlock packets stay narrow, test-backed, and accurately labeled.

## Scope

- audits existing editor capabilities and maturity labels
- confirms review/restore boundary posture
- records evidence and gaps for the next packet
- does not unlock any new execution or mutation surface

## Truth sources used

1. Current code and tests:
   - `backend/app/services/*`
   - `backend/tests/test_api_routes.py`
2. Surface and maturity docs:
   - `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
   - `docs/CAPABILITY-MATURITY-MATRIX.md`
   - `docs/PHASE-8-ADMITTED-SURFACES-QUICK-REFERENCE.md`
3. Exact corridor docs:
   - `docs/PHASE-8-CAMERA-BOOL-WRITE-PUBLIC-CORRIDOR.md`
   - `docs/PHASE-8-CAMERA-BOOL-RESTORE-PUBLIC-CORRIDOR.md`
   - `docs/PHASE-8-CAMERA-BOOL-RESTORE-REVIEW-STATUS.md`

## Validation evidence

Commands run:

- `python -m pytest backend/tests -k "editor and (restore or property or component or session or level)" -q`
- `git diff --check`
- `git diff --cached --check`

Result summary:

- targeted editor tests passed
- diff checks passed

## Baseline maturity verdict

| Capability | Baseline verdict | Risk | Notes |
| --- | --- | --- | --- |
| `editor.session.open` | admitted-real (narrow runtime) | Medium | Admitted real on bounded wiring; not broad authoring admission. |
| `editor.level.open` | admitted-real (narrow runtime) | Medium | Admitted real on bounded wiring; must keep explicit target context. |
| `editor.entity.create` | admitted-real (narrow) | High | Real mutation-capable in bounded chain; keep exact scope and restore discipline. |
| `editor.component.add` | admitted-real (narrow) | High | Real mutation-capable in bounded allowlist chain. |
| `editor.entity.exists` | read-only reviewable | Medium | Admitted hybrid read-only for exact id/name checks. |
| `editor.component.find` | read-only reviewable | Medium | Admitted read-only target binding; no property listing admission. |
| `editor.component.property.get` | read-only reviewable | Medium | Admitted read-only property readback on bounded target/path. |
| `editor.component.property.write.camera_bool_make_active_on_activation` | admitted-real (exact narrow corridor) | High | Approval-gated exact Camera bool write only. |
| `editor.component.property.restore.camera_bool_make_active_on_activation` | admitted-real (exact narrow corridor) | High | Approval-gated exact Camera bool restore only. |
| `editor.component.property.list` | proof-only | High | Not dispatcher/catalog/prompt admitted. |
| `editor.placement.plan` | plan-only | Medium | Planning lane only; no placement execution admission. |
| `editor.placement.proof_only` | missing/plan-only candidate | High | Needs explicit design and gates before any proof execution. |

## Boundary confirmations

This audit confirms the following remain blocked/unadmitted:

- generic `editor.component.property.write`
- generic `editor.component.property.restore`
- public generic property listing admission
- arbitrary Editor Python/script execution
- broad placement execution
- generalized undo claims

Client-request fields remain intent only and never authorization.

## What this packet does not do

- no backend/runtime code changes
- no new capability admission
- no mutation broadening
- no placement execution

## Recommended next packet

Project/Config Readiness Lane baseline audit (docs + targeted tests only), to
extend the same truth-first audit discipline beyond editor lanes without
enabling new execution.
