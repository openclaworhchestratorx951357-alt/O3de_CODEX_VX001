# Phase 7 Checkpoint

## Purpose

This checkpoint captures the current accepted Phase 7 execution boundary in one
place.

It is intentionally short.

It does not authorize broader real-adapter expansion by itself.

For the production completion program that must precede broader real adapter
expansion, read:
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`

## Current truthful status

As of the current accepted branch state:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real records
- adapter mode selection is real and config-driven
- adapter registry reporting is real
- operator visibility for adapter mode, capability gating, provenance, and
  approval/policy meaning is in place
- operator visibility now also includes persisted settings.patch audit summary,
  admitted mutation evidence wording, and refresh-preserved run detail context
- admitted Phase 7 backend evidence now also carries aligned manifest/root
  provenance and fallback categorization across `project.inspect`,
  `build.configure`, and `settings.patch`

Real O3DE execution is still narrow.

## Current accepted tool surfaces

### Real read-only

- `project.inspect`

Current truth:
- may use a real read-only manifest-backed path in `O3DE_ADAPTER_MODE=hybrid`
- may now capture manifest-backed project-config, requested-vs-discovered Gem,
  requested Gem subset matching, requested settings subset matching, and
  top-level settings evidence from `project_root/project.json` when requested
- now also persists explicit manifest/root/source-of-truth provenance for the
  admitted real path
- now also persists explicit simulated-fallback provenance including expected
  manifest path and missing-vs-unreadable fallback categorization
- falls back to simulated when the real manifest path is unavailable
- remains explicitly labeled as real vs simulated in backend and frontend
- still does not authorize deeper layered settings discovery or any mutation path

### Real plan-only

- `build.configure`

Current truth:
- may use a real plan-only preflight path in `O3DE_ADAPTER_MODE=hybrid`
- only when `dry_run=true`
- records real preflight evidence, plan metadata, and explicit
  manifest/root/source-of-truth provenance
- now also records explicit simulated-fallback provenance including
  `dry-run-required`, `manifest-missing`, and `manifest-unreadable`
  categorization when the real preflight path is unavailable
- does not execute a real configure mutation
- falls back to simulated when preconditions are not satisfied

### Real mutation-gated

- `settings.patch`

Current truth:
- may use a real hybrid preflight path
- now also includes the first admitted manifest-backed set-only mutation path
- keeps backup provenance, rollback outcome evidence, patch-plan evidence, and
  post-write verification explicit
- now also persists explicit manifest/root/source-of-truth provenance for both
  the admitted real preflight and admitted real mutation records
- now also persists explicit simulated-fallback provenance including
  `manifest-missing`, `manifest-unreadable`, and `mutation-not-admitted`
  categorization when the admitted real path is unavailable
- remains approval-gated and tightly bounded rather than broadly mutation-capable
- falls back to simulated when the admitted real path is unavailable or
  preconditions are not satisfied

### Real editor-runtime

- `editor.session.open`
- `editor.level.open`

Current truth:
- are admitted real only on the verified `McpSandbox` target wiring
- depend on the persistent project-local bridge publishing an observable
  heartbeat from a live editor launch
- were re-verified through the canonical repo-owned backend bound to
  `127.0.0.1:8000`
- remain explicitly labeled real vs simulated in backend and frontend evidence
- do not imply a broad real editor-control family beyond the admitted tools

### Editor-runtime excluded from admitted real

- `editor.entity.create`

Current truth:
- remains excluded from the admitted-real set on the current tested local
  targets
- must continue to be described as excluded rather than partially-real or
  implied-real
- should not be widened until a stable prefab-safe create contract is proven

### Mutation candidates after the current gate

- `gem.enable`
- `build.compile`

Current truth:
- `gem.enable` now has an admitted narrow approval-gated real mutation
  corridor for explicit local `project.json` top-level `gem_names` insertion,
  with backup, reread verification, and rollback on failure
- `build.compile` now has an admitted real plan-only preflight/result-truth
  corridor for explicit build target requests
- neither boundary implies broad Gem dependency/configure recovery or actual
  compile execution

### Simulated-only

No currently published tool on the current tested branch remains fully
simulated-only. The remaining boundaries are still explicitly read-only,
plan-only, or narrow mutation-gated.

## Operator-facing status

The operator shell now exposes this boundary through:
- system status
- adapter registry
- catalog and dispatch capability labels
- dispatch guidance for manifest-backed project-config, requested-vs-discovered
  Gem, requested Gem subset matching, requested settings subset matching, and
  settings evidence requests
- timeline wording
- runs list and run detail
- executions and artifacts provenance
- approval queue and policy meaning
- Phase 7 capability summary
- operator overview drilldowns and refresh timestamps
- explicit requested-vs-matched project-config count evidence for manifest-backed
  project inspection
- explicit discovered-vs-returned manifest-backed project-config key inventory
- explicit discovered-vs-returned manifest-backed Gem inventory
- explicit manifest-backed engine compatibility inventory
- explicit manifest-backed project origin provenance
- explicit manifest-backed presentation metadata inventory
- explicit manifest-backed identity and tag inventory
- explicit expected-manifest fallback provenance and fallback category evidence
  for admitted real-path failures
- explicit manifest/root/source-of-truth provenance for admitted real preflight
  and mutation evidence
- explicit bridge heartbeat, queue, cleanup history, and lag-note visibility
  for the admitted editor-runtime boundary
- local operator-lane state, action rails, and detail-panel carry-through for
  pinned-lane navigation
- explicit preset restore, preset drift, local note, local clipboard, and local
  reset cues inside the operator shell

## What remains intentionally limited

- broad real O3DE adapters are still not implemented
- admitted real editor-runtime remains limited to `editor.session.open` and
  `editor.level.open` on the verified `McpSandbox` target wiring
- `editor.entity.create` remains excluded from the admitted-real set on the
  current tested local targets
- `build.configure` is not a real configure execution path
- `build.compile` is not a real compile execution path
- `project.inspect` real evidence is still limited to manifest-backed
  project-config, requested-vs-discovered Gem, requested Gem subset matching,
  requested settings subset matching, top-level settings fields, explicit
  engine compatibility inventory, explicit project origin provenance, and
  explicit presentation metadata inventory, and explicit identity/tag inventory
  rather than broader layered config discovery
- `asset.batch.process` and `asset.move.safe` remain preflight-only and do not
  imply real asset processing or real asset move/reference-repair execution
- `test.run.gtest`, `test.run.editor_python`, and `test.tiaf.sequence` remain
  preflight-only and do not imply real test execution or structured result
  artifact production
- `render.capture.viewport` and `render.material.inspect` remain narrow
  runtime-probe/read-only evidence paths and do not imply broader render
  runtime readback
- `render.shader.rebuild` remains a preflight/result-truth path and does not
  imply actual shader rebuild execution
- broader mutation paths are still not implemented beyond the first admitted
  `settings.patch`, `gem.enable`, and `render.material.patch` corridors
- the admitted mutation boundaries above remain narrow and do not imply broad
  settings, Gem, or material mutation support
- simulated fallback remains part of the truthful accepted behavior
- default non-container persistence is still not claimed healthy; explicit
  operator-configured persistence remains the truthful baseline for
  non-container local runs
- the canonical local backend verification path for the admitted editor-runtime
  boundary is `backend/runtime/launch_branch_backend_8000.cmd` on
  `127.0.0.1:8000`
- operator-lane notes, preset restore memory, handoff summaries, clipboard copy,
  and local reset remain frontend browser-session helpers rather than backend
  persistence or shared operator records

## Next safe expansion boundary

Before widening into broader real adapter execution, the next slice should stay
narrow and truthful.

Recommended next boundary:
- refresh checkpoint and operator-facing truth so the already admitted
  read-only, plan-only, and narrow mutation-gated lanes are described
  consistently, and
- define the next narrow admitted backend contract only if it preserves the same
  explicit real-vs-simulated boundary and does not blur the already-admitted
  `settings.patch`, `gem.enable`, or `render.material.patch` mutation
  boundaries into broader mutation claims
