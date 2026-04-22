# docs

Architecture, plans, handoffs, and operator-facing documentation for the O3DE agent control app.

## Workflow and roadmap

See these official source files:
- `AGENTS.md`
- `docs/CODEX-EVERGREEN-EXECUTION-CHARTER.md`
- `docs/APP-OPERATOR-GUIDE.md`
- `docs/WORKFLOW-CODEX-CHATGPT.md`
- `docs/SLICE-START-CHECKLIST.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/PHASE-6B-REMOTE-EXECUTOR-CONTRACT.md`
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
- `docs/PHASE-6B-API-EVENT-CONTRACT.md`
- `docs/PHASE-6B-POLICY-AND-ADMISSION-CONTRACT.md`
- `docs/PHASE-6B-RELEASE-AND-CONFORMANCE-PLAN.md`
- `docs/PHASE-6B-IMPLEMENTATION-SEQUENCE.md`
- `docs/PHASE-6B-BACKEND-MAPPING.md`
- `docs/PHASE-6B-PERSISTENCE-CHANGESET.md`
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/OPERATOR-EDITOR-RUNTIME-PROOF-CHECKLIST.md`
- `docs/UNPUBLISHED-WORKTREE-INVENTORY.md`
- `docs/PERSISTED-SCHEMA-COVERAGE-CHECKPOINT.md`
- `docs/PHASE-7-REAL-ADAPTER-GATE.md`
- `docs/PHASE-7-FIRST-MUTATION-CANDIDATE.md`
- `docs/PHASE-7-PROJECT-BUILD-CANDIDATES.md`
- `docs/PHASE-7-PROJECT-INSPECT-CHECKLIST.md`
- `docs/PHASE-7-PROJECT-CONFIG-INSPECTION-CONTRACT.md`
- `docs/PHASE-7-GEM-STATE-REFINEMENT-CONTRACT.md`
- `docs/PHASE-7-SETTINGS-GEM-INSPECTION-CHECKLIST.md`
- `docs/PHASE-7-SETTINGS-GEM-CANDIDATES.md`
- `docs/PHASE-8-GUARDED-AUTONOMY-PROGRAM.md`
- `docs/PHASE-0-REPO-AUDIT.md`
- `docs/PHASE-3-CHECKPOINT.md`
- `docs/LOCAL-STACK-RUNBOOK.md`
- `docs/MISSION-CONTROL-RUNBOOK.md`
- `CONTRIBUTING.md`

Default guidance note:
- `docs/CODEX-EVERGREEN-EXECUTION-CHARTER.md` is the stable evergreen reference
  for future Codex work packets unless the user explicitly supersedes it
- packet-by-packet status should evolve in normal slice outputs and proof docs,
  not by constantly rewriting the charter

Current Phase 7 checkpoint truth:
- `project.inspect` is the current real read-only path in hybrid mode
- that path now includes manifest-backed project-config subset matching, manifest-backed Gem subset/source evidence with explicit source/count visibility, and manifest-backed top-level settings subset evidence with explicit source/count visibility
- `settings.patch` is still the first recommended mutation-capable candidate and now has a real hybrid path for both dry-run preflight and the first fully admitted manifest-backed set-only mutation case, with backup provenance, rollback outcome evidence, patch-plan evidence, and post-write verification
- `editor.session.open` and `editor.level.open` are admitted real on the
  verified `McpSandbox` target wiring through the persistent bridge-backed
  runtime path
- `editor.entity.create` is now admitted real-authoring on the same verified
  `McpSandbox` target wiring, but only for root-level named entity creation on
  the loaded/current level
- the canonical local verification path for that admitted editor-runtime
  boundary is the repo-owned backend on `127.0.0.1:8000`, launched via
  `backend/runtime/launch_branch_backend_8000.cmd`, with the repeatable proof
  command at `backend/runtime/prove_live_editor_authoring.cmd`
- the operator proof checklist for the admitted editor-runtime boundary lives in
  `docs/OPERATOR-EDITOR-RUNTIME-PROOF-CHECKLIST.md` and now points operators to
  the repo-owned proof command plus the generated evidence bundle path
- the current post-publish dirty-tree classification lives in
  `docs/UNPUBLISHED-WORKTREE-INVENTORY.md`
- the next safest refinement is still manifest-adjacent and keeps settings/Gem evidence on `project.json`
- `build.configure` is still only a real plan-only preflight path
- mutation surfaces remain gated
- broader real remote automation coverage is still narrow and should now be
  expanded only through the Phase 6B/6C program defined in
  `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md` and
  `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- persisted execution-details and artifact-metadata schema coverage now spans 21
  tools across the published catalog
- fully covered persisted-schema families are now `editor-control`,
  `asset-pipeline`, `project-build`, `render-lookdev`, and `validation`
- this remains a persisted-payload contract milestone, not a broader
  real-adapter milestone

Planned contents:
- architecture
- implementation plans
- handoffs
- operating guides
- safety and approval playbooks
