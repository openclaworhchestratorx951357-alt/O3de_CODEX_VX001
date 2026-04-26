# Phase History Index

Status: reconstructed index

This index helps future agents understand the repo's phase trail without
depending on stale thread memory.

Code, tests, and observed runtime behavior remain stronger evidence than this
index. Reconstructed phase docs are intentionally weaker than original
checkpoints and must mark unknowns as unknown.

## Evidence Sources

This index is based on:

- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PHASE-0-REPO-AUDIT.md`
- `docs/PHASE-3-CHECKPOINT.md`
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/PHASE-8-*`
- `docs/LOCAL-STACK-RUNBOOK.md`
- `README.md`
- Git commit messages visible in repository history

## Phase Documents

| Phase | Current document | Status | Notes |
| --- | --- | --- | --- |
| Phase 0 | `docs/PHASE-0-REPO-AUDIT.md` | original checkpoint | Baseline inventory for early production-baseline work. |
| Phase 1 | `docs/PHASE-1-HISTORICAL-RECONSTRUCTION.md` | reconstructed | Backend control-plane foundation inferred from roadmap, Phase 0 audit, and commit history. |
| Phase 2 | `docs/PHASE-2-HISTORICAL-RECONSTRUCTION.md` | reconstructed | Persistence and audit trail inferred from Phase 0 audit and persistence commits. |
| Phase 3 | `docs/PHASE-3-CHECKPOINT.md` | original checkpoint | Schema and validator checkpoint. |
| Phase 4 | `docs/PHASE-4-HISTORICAL-RECONSTRUCTION.md` | reconstructed | Operator frontend baseline inferred from Phase 3 gate and UI wiring commits. |
| Phase 5 | `docs/PHASE-5-CHECKPOINT.md` | reconstructed checkpoint | Production engineering baseline from README, local stack runbook, CI/Docker commits. |
| Phase 6B | `docs/PHASE-6B-*` | contract/checkpoint family | Remote executor and execution-record planning/contracts. |
| Phase 7 | `docs/PHASE-7-CHECKPOINT.md` | original checkpoint | Real adapter gate and narrow admitted hybrid/real paths. |
| Phase 8 | `docs/PHASE-8-*` | active proof/checkpoint family | Editor guarded-autonomy, component/property target discovery, and design-only Camera scalar write candidate review. |

## Known Gaps

- There is no original committed `PHASE-1-CHECKPOINT.md`.
- There is no original committed `PHASE-2-CHECKPOINT.md`.
- There is no original committed `PHASE-4-CHECKPOINT.md`.
- Phase 5 evidence exists across README, runbooks, workflow, Docker/CI files,
  and commit history rather than one original checkpoint.
- Exact original validation output for Phases 1, 2, and 4 is not fully
  recoverable from committed docs alone.

## Maintenance Rule

When a future phase changes capability truth, update the specific phase
checkpoint or active proof doc first. Update this index only when document
navigation or historical classification changes.
