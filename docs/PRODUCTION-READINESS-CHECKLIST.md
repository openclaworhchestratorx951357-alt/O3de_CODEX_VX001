# Production Readiness Checklist

Status: living gate for shipping a production-grade release.

Purpose: define the minimum bar for declaring the repository production-ready
without over-claiming runtime capability.

## Release Gate Command

Run this command from repo root before declaring a release candidate:

```powershell
pwsh -File .\scripts\dev.ps1 production-readiness
```

This executes:

- backend lint
- backend tests
- frontend lint
- frontend production build
- surface matrix drift check
- Docker compose build (the helper now attempts to start Docker Desktop
  automatically and fails closed with explicit remediation guidance)

## Required Readiness Areas

1. Product behavior
- Core user workflows are complete and documented.
- All user-visible features have clear fallback/error messaging.
- No known P0/P1 defects remain open for release scope.

2. Quality and verification
- `production-readiness` gate passes locally and in CI.
- New features include targeted tests.
- Regression-prone paths include integration-level proof where practical.

3. Runtime and operations
- Backend `/ready`, `/o3de/target`, and `/o3de/bridge` are observable.
- Operator runbooks are current for startup, shutdown, and recovery.
- Logs and diagnostics are sufficient for incident triage.

4. Security and safety boundaries
- Capability boundaries remain truthful and enforced.
- No unrestricted shell or arbitrary file-mutation prompt surfaces are exposed.
- Secrets are externalized to environment and not committed.

5. Release hygiene
- Branch is synced with `origin/main` before release tagging.
- PR includes exact validation commands and outcomes.
- Any environment-only blockers are explicitly documented.

## Exit Criteria For "Production Ready"

Call the repository production-ready only when all items below are true:

- `production-readiness` gate passes.
- No unresolved release-blocking defects.
- Operator docs reflect actual runtime behavior.
- O3DE admitted corridors are verified and unchanged or intentionally updated
  with tests and proof.
- Rollback path is documented for the release.
