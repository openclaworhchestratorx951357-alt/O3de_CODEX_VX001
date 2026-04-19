# docs

Architecture, plans, handoffs, and operator-facing documentation for the O3DE agent control app.

## Workflow and roadmap

See these official source files:
- `docs/WORKFLOW-CODEX-CHATGPT.md`
- `docs/SLICE-START-CHECKLIST.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/PERSISTED-SCHEMA-COVERAGE-CHECKPOINT.md`
- `docs/PHASE-7-REAL-ADAPTER-GATE.md`
- `docs/PHASE-7-PROJECT-BUILD-CANDIDATES.md`
- `docs/PHASE-7-PROJECT-INSPECT-CHECKLIST.md`
- `docs/PHASE-7-PROJECT-CONFIG-INSPECTION-CONTRACT.md`
- `docs/PHASE-7-GEM-STATE-REFINEMENT-CONTRACT.md`
- `docs/PHASE-7-SETTINGS-GEM-INSPECTION-CHECKLIST.md`
- `docs/PHASE-7-SETTINGS-GEM-CANDIDATES.md`
- `docs/PHASE-0-REPO-AUDIT.md`
- `docs/PHASE-3-CHECKPOINT.md`
- `docs/LOCAL-STACK-RUNBOOK.md`
- `CONTRIBUTING.md`

Current Phase 7 checkpoint truth:
- `project.inspect` is the current real read-only path in hybrid mode
- that path now includes manifest-backed project-config subset matching, requested-vs-discovered Gem, requested Gem subset matching, and manifest-backed top-level settings subset evidence with explicit source/count visibility
- the next safest refinement is still manifest-adjacent and keeps settings/Gem evidence on `project.json`
- `build.configure` is still only a real plan-only preflight path
- mutation surfaces remain gated
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
