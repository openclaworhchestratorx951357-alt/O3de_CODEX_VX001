# Project/Config Readiness Baseline Audit

Status: baseline audit only (no runtime change)

## Purpose

Establish current truth for project/config/build lanes before any broader
execution or mutation admission work.

## Scope

- audits current maturity for project/config/build capabilities
- confirms mutation and execution boundaries
- records evidence and next gaps
- does not unlock any new runtime path

## Truth sources used

1. Current code and tests:
   - `backend/app/services/capability_registry.py`
   - `backend/app/services/catalog.py`
   - `backend/app/services/policy.py`
   - `backend/tests/test_api_routes.py`
2. Surface/maturity docs:
   - `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
   - `docs/CAPABILITY-MATURITY-MATRIX.md`
   - `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`

## Validation evidence

Commands run:

- `python -m pytest backend/tests -k "project or settings or build.configure or build.compile" -q`
- `git diff --check`
- `git diff --cached --check`

Result summary:

- targeted project/config/build tests passed
- diff checks passed

## Baseline maturity verdict

| Capability | Baseline verdict | Risk | Notes |
| --- | --- | --- | --- |
| `project.inspect` | read-only reviewable | Medium | Admitted real read-only inspect path with provenance. |
| `settings.inspect` | read-only reviewable | Medium | Treated as inspect/readback lane; no mutation admission implied. |
| `settings.patch.narrow` | admitted-real (narrow mutation-gated) | High | Bounded manifest-backed mutation path with backup/readback/rollback expectations. |
| `settings.rollback` | reviewable (bounded rollback evidence through `settings.patch`) | High | Narrow rollback posture exists for admitted patch corridor only; not generalized rollback. |
| `build.configure.preflight` | preflight-only | Medium | Real plan/preflight lane when dry-run semantics are preserved. |
| `build.execute.real` | gated execution (explicit named targets) | Critical | Real execution-gated compile lane exists for explicit named targets; broad build execution remains unadmitted. |

## Boundary confirmations

This audit confirms the following remain blocked/unadmitted:

- broad settings mutation beyond admitted narrow patch scope
- generalized rollback claims across arbitrary files/surfaces
- unrestricted build execution targets
- broad build/export/shipping admission
- arbitrary shell/script execution admission

## What this packet does not do

- no backend/runtime code changes
- no new execution or mutation admission
- no policy broadening

## Recommended next packet

Audit review dashboard shell (frontend/static-fixture first), to expose
cross-domain audit verdicts and maturity drift clearly in the UI without
enabling execution.
