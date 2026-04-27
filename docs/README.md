# Documentation Index

This directory holds the operating truth, architecture notes, phase checkpoints,
proof summaries, and handoff material for `O3de_CODEX_VX001`.

Use code, tests, and observed runtime behavior as stronger evidence than docs.
When docs conflict, update the docs in a narrow follow-up packet instead of
rounding up capability claims.

## Start Here

- `docs/CURRENT-STATUS.md` - current repo status, active capability boundaries,
  and next likely packets.
- `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md` - startup rules for new
  Codex threads, Supervisor Mode activation, repo-state checks, and
  project-local dependency bootstrap.
- `docs/REPOSITORY-OPERATIONS.md` - low-friction Codex admin workflow,
  validation expectations, and self-merge rules.
- `docs/CODEX-PROJECT-WORKFLOW-QUICK-REFERENCE.md` - repo-wide workflow
  checklist for future Codex threads across all phases.
- `docs/NORMALIZED-PHASE-WORKFLOW.md` - reusable phase promotion pattern from
  baseline truth through discovery, proof-only evidence, exact admission,
  operator docs, checkpoint, and report-first cleanup.
- `docs/BRANCH-AND-PR-HYGIENE.md` - branch, PR, cleanup, and rollback hygiene.
- `docs/VALIDATION-MATRIX.md` - validation command matrix and proof boundaries.
- `docs/CAPABILITY-MATURITY-MATRIX.md` - conservative capability maturity
  baseline.
- `docs/CODEX-EVERGREEN-EXECUTION-CHARTER.md` - stable capability truth and
  maturity model.
- `docs/SLICE-START-CHECKLIST.md` - required start gate for repo work.
- `AGENTS.md` - repo-wide agent defaults.

## Current Capability Truth

- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md` is the canonical admitted-surface
  matrix.
- `docs/PHASE-8-ADMITTED-SURFACES-QUICK-REFERENCE.md` is the short future-thread
  guide for Phase 8 admitted, proof-only, blocked, and forbidden surfaces.
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-TARGET-DISCOVERY.md` is the current
  editor component/property targeting truth source.
- `docs/PHASE-8-CAMERA-BOOL-WRITE-PUBLIC-CORRIDOR.md` tracks the only exact
  admitted public component-property write corridor.
- `docs/PHASE-8-CAMERA-BOOL-CORRIDOR-CHECKPOINT.md` records the completed
  normalized Phase 8 Camera bool corridor sequence.
- `docs/PHASE-8-CAMERA-BOOL-ROLLBACK-RESTORE-DESIGN.md` defines the current
  narrow restore/revert language and future rollback gates for that corridor.
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-READINESS-AUDIT.md` audits whether the
  exact corridor is ready for a future proof-only restore/revert packet.
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-LIVE-PROOF.md` records the proof-only
  reverse-write restore evidence for the exact Camera bool corridor.
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-ADMISSION-DECISION.md` keeps that restore
  evidence proof-only while naming the future exact public corridor candidate.
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-PUBLIC-CORRIDOR.md` tracks the exact
  admitted public restore corridor for the Camera bool path.
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-REVIEW-STATUS.md` defines the
  operator-facing review/status fields for that exact restore corridor.
- `docs/PHASE-8-CAMERA-BOOL-OPERATOR-EXAMPLES.md` gives paired safe/refused
  operator prompt examples for the exact Camera bool readback, write, and
  restore corridors.
- `docs/PHASE-9-ASSET-READBACK-BASELINE.md` starts Phase 9 with the current
  asset/pipeline readback truth before any new asset runtime surface is widened.
- `docs/PHASE-9-ASSET-READBACK-DISCOVERY.md` records the candidate-only Phase 9
  discovery decision for product/dependency evidence behind `asset.source.inspect`.
- `docs/PHASE-9-ASSET-READBACK-DESIGN.md` designs the future read-only
  `asset.source.inspect` product/dependency evidence corridor before code work.
- `docs/PHASE-9-ASSET-READBACK-READINESS-AUDIT.md` records that the Phase 9
  product/dependency readback corridor is not ready for implementation until an
  exact read-only substrate and freshness model are identified.
- `docs/PHASE-9-ASSET-READBACK-SUBSTRATE-RESEARCH.md` records the follow-up
  substrate search and keeps product/dependency readback blocked until an
  operator-provided exact read-only sample is audited.
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-WRITE-CANDIDATE.md` tracks why broad
  component property writes remain unadmitted.
- `docs/OPERATOR-EDITOR-RUNTIME-PROOF-CHECKLIST.md` records live editor proof
  operator steps and boundaries.

## Operating Guides

- `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md`
- `docs/CODEX-PROJECT-WORKFLOW-QUICK-REFERENCE.md`
- `docs/NORMALIZED-PHASE-WORKFLOW.md`
- `docs/CODEX-OPERATING-RUNBOOK.md`
- `docs/WORKFLOW-CODEX-CHATGPT.md`
- `docs/WORKTREE-STRATEGY.md`
- `docs/LOCAL-STACK-RUNBOOK.md`
- `docs/MISSION-CONTROL-RUNBOOK.md`
- `docs/APP-OPERATOR-GUIDE.md`
- `docs/GUI-CONTEXTUAL-HELP-SPEC.md`
- `docs/GUI-LAYOUT-AND-SCROLL-SPEC.md`
- `docs/GUI-OVERHAUL-BRANCH-MAP.md`

## Roadmaps And Contracts

- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PHASE-6B-REMOTE-EXECUTOR-CONTRACT.md`
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
- `docs/PHASE-6B-API-EVENT-CONTRACT.md`
- `docs/PHASE-6B-POLICY-AND-ADMISSION-CONTRACT.md`
- `docs/PHASE-6B-RELEASE-AND-CONFORMANCE-PLAN.md`
- `docs/PHASE-6B-IMPLEMENTATION-SEQUENCE.md`
- `docs/PHASE-6B-BACKEND-MAPPING.md`
- `docs/PHASE-6B-PERSISTENCE-CHANGESET.md`

## Phase Checkpoints And Proof Notes

- `docs/PHASE-HISTORY-INDEX.md`
- `docs/PHASE-0-REPO-AUDIT.md`
- `docs/PHASE-1-HISTORICAL-RECONSTRUCTION.md`
- `docs/PHASE-2-HISTORICAL-RECONSTRUCTION.md`
- `docs/PHASE-3-CHECKPOINT.md`
- `docs/PHASE-4-HISTORICAL-RECONSTRUCTION.md`
- `docs/PHASE-5-CHECKPOINT.md`
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/PHASE-7-REAL-ADAPTER-GATE.md`
- `docs/PHASE-7-FIRST-MUTATION-CANDIDATE.md`
- `docs/PHASE-7-PROJECT-BUILD-CANDIDATES.md`
- `docs/PHASE-7-PROJECT-INSPECT-CHECKLIST.md`
- `docs/PHASE-7-PROJECT-CONFIG-INSPECTION-CONTRACT.md`
- `docs/PHASE-7-GEM-STATE-REFINEMENT-CONTRACT.md`
- `docs/PHASE-7-SETTINGS-GEM-INSPECTION-CHECKLIST.md`
- `docs/PHASE-7-SETTINGS-GEM-CANDIDATES.md`
- `docs/PHASE-8-GUARDED-AUTONOMY-PROGRAM.md`
- `docs/PHASE-8-ADMITTED-SURFACES-QUICK-REFERENCE.md`
- `docs/PHASE-8-EDITOR-CANDIDATE-MUTATION-ENVELOPE.md`
- `docs/PHASE-8-CAMERA-SCALAR-WRITE-CANDIDATE-DESIGN.md`
- `docs/PHASE-8-CAMERA-SCALAR-WRITE-READINESS-AUDIT.md`
- `docs/PHASE-8-CAMERA-SCALAR-WRITE-LIVE-PROOF.md`
- `docs/PHASE-8-CAMERA-SCALAR-WRITE-ADMISSION-DECISION.md`
- `docs/PHASE-8-CAMERA-BOOL-WRITE-PUBLIC-CORRIDOR.md`
- `docs/PHASE-8-CAMERA-BOOL-CORRIDOR-CHECKPOINT.md`
- `docs/PHASE-8-CAMERA-BOOL-ROLLBACK-RESTORE-DESIGN.md`
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-READINESS-AUDIT.md`
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-LIVE-PROOF.md`
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-ADMISSION-DECISION.md`
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-PUBLIC-CORRIDOR.md`
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-REVIEW-STATUS.md`
- `docs/PHASE-8-CAMERA-BOOL-OPERATOR-EXAMPLES.md`
- `docs/PHASE-8-EDITOR-COMPONENT-FIND-LIVE-PROOF.md`
- `docs/PHASE-8-EDITOR-PROPERTY-TARGET-READBACK-PROOF.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-LIST-BRIDGE-CANDIDATE.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-TARGET-DISCOVERY.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-WRITE-CANDIDATE.md`
- `docs/PHASE-8-EDITOR-SCALAR-PROPERTY-TARGET-DISCOVERY.md`
- `docs/PHASE-8-EDITOR-COMMENT-SCALAR-TARGET-DISCOVERY.md`
- `docs/PHASE-9-ASSET-READBACK-BASELINE.md`
- `docs/PHASE-9-ASSET-READBACK-DISCOVERY.md`
- `docs/PHASE-9-ASSET-READBACK-DESIGN.md`
- `docs/PHASE-9-ASSET-READBACK-READINESS-AUDIT.md`
- `docs/PHASE-9-ASSET-READBACK-SUBSTRATE-RESEARCH.md`

## Evidence And Inventory

- `docs/PERSISTED-SCHEMA-COVERAGE-CHECKPOINT.md`
- `docs/UNPUBLISHED-WORKTREE-INVENTORY.md`
- `docs/BRANCH-CLEANUP-REPORT-2026-04-26.md`
- `docs/BRANCH-CLEANUP-REPORT-2026-04-26-PHASE-8-CAMERA-WRITE.md`
- `docs/BRANCH-CLEANUP-REPORT-2026-04-26-CAMERA-RESTORE.md`
- `docs/BRANCH-CLEANUP-REPORT-SUPERVISOR-BATCH-01.md`
- `docs/BRANCH-CLEANUP-REPORT-SUPERVISOR-BATCH-02.md`
- `docs/BRANCH-CLEANUP-REPORT-SUPERVISOR-BATCH-03-CONTROL-PLANE.md`
- `docs/CONTROL-PLANE-BRANCH-REVIEW-INVENTORY-2026-04-26.md`
- `docs/FINAL-REMAINING-BRANCH-PURPOSE-MAP.md`
- `docs/PRODUCTION-BASELINE-BRANCH-REVIEW.md`
- `docs/GITHUB-BRANCH-HYGIENE-SETTINGS-RECOMMENDATION.md`
- `docs/REMOTE-CONTROL-BRIDGE-LESSONS.md`
- `docs/OPERATOR-EDITOR-RUNTIME-PROOF-CHECKLIST.md`

Missing or uneven historical phase docs should be backfilled as reconstructed
history in a dedicated docs-only packet. Reconstructed docs must mark unknowns
as unknown and cite evidence rather than inventing phase claims.
