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
- operator-facing status now separates read-only, editor-authoring/runtime,
  plan-only, execution-gated, and mutation-gated real lanes instead of
  collapsing them into one hybrid bucket
- operator visibility for adapter mode, capability gating, provenance, and
  approval/policy meaning is in place
- operator visibility now also includes persisted settings.patch audit summary,
  admitted mutation evidence wording, and refresh-preserved run detail context
- admitted Phase 7 backend evidence now also carries aligned manifest/root
  provenance and fallback categorization across `project.inspect`,
  `build.configure`, `settings.patch`, and the newer admitted asset/render/test
  plan-only and mutation-gated paths

Real O3DE execution is still narrow.

## Current accepted tool surfaces

### Real read-only

- `project.inspect`
- `asset.processor.status`
- `asset.source.inspect`
- `editor.entity.exists`
- `editor.component.property.get`
- `render.capture.viewport`
- `render.material.inspect`
- `test.visual.diff`

Current truth:
- may use a real read-only manifest-backed path in `O3DE_ADAPTER_MODE=hybrid`
- may now capture manifest-backed project-config, requested-vs-discovered Gem,
  requested Gem subset matching, requested settings subset matching, and
  top-level settings evidence from `project_root/project.json` when requested
- now also persists explicit manifest/root/source-of-truth provenance for the
  admitted real path
- now also persists explicit simulated-fallback provenance including expected
  manifest path and missing-vs-unreadable fallback categorization
- asset and render admitted read-only slices remain narrow and evidence-first:
  `asset.processor.status` and `asset.source.inspect` expose explicit local
  asset/runtime evidence, `render.capture.viewport` remains an explicit
  runtime-probe/read-only evidence path, and `render.material.inspect` now adds
  explicit project-local `.material` readback evidence without implying broader
  render runtime readback or shader/reference expansion
- `test.visual.diff` remains a narrow admitted real evidence path and does not
  imply broad test runner execution
- `editor.entity.exists` is a standalone admitted read-only bridge-backed
  existence check for exactly one explicit entity id or one exact entity name
  on the currently loaded level; it does not imply delete, reload, parenting,
  prefab work, broad scene enumeration, component discovery, property mutation,
  or proof that file-backed restore removed an entity from the live Editor
- the direct live read-only proof completed on `2026-04-25` against
  `Levels/TestLoevel01` in `McpSandbox` and verified exact-name existence
  readback for `Ground` with entity id `[2949498829790842453]`
- direct entity-exists proof bundle:
  `backend/runtime/live_editor_entity_exists_proof_20260425-083436.json`
- direct entity-exists proof lineage:
  `run-2ae86612d8e0`, `exe-ec24e70a8678`, `art-ff7b77eb135e`
- the direct entity-exists proof did not execute or need cleanup/restore and
  did not prove live Editor undo, viewport reload, entity absence after restore,
  broad entity discovery, component discovery, property mutation, delete,
  parenting, prefab, material, asset, render, build, or arbitrary Editor Python
- falls back to simulated when the real manifest path is unavailable
- remains explicitly labeled as real vs simulated in backend and frontend
- still does not authorize deeper layered settings discovery or any mutation path

### Real plan-only

- `build.configure`
- `asset.batch.process`
- `asset.move.safe`
- `render.shader.rebuild`
- `test.run.gtest`
- `test.run.editor_python`
- `test.tiaf.sequence`

Current truth:
- may use a real plan-only preflight path in `O3DE_ADAPTER_MODE=hybrid`
- only when `dry_run=true`
- records real preflight evidence, plan metadata, and explicit
  manifest/root/source-of-truth provenance
- now also records explicit simulated-fallback provenance including
  `dry-run-required`, `manifest-missing`, and `manifest-unreadable`
  categorization when the real preflight path is unavailable
- `asset.batch.process` and `asset.move.safe` now have admitted real
  preflight/result-truth corridors for explicit project-local source-glob and
  identity-corridor requests
- `render.shader.rebuild` now has an admitted real preflight/result-truth
  corridor for explicit shader target requests
- `test.run.gtest`, `test.run.editor_python`, and `test.tiaf.sequence` now
  have admitted real preflight/result-truth corridors for explicit validation
  requests without implying actual test execution
- does not execute a real configure mutation
- falls back to simulated when preconditions are not satisfied

### Real execution-gated

- `build.compile`

Current truth:
- `dry_run=true` remains an admitted real plan-only preflight path for explicit
  named targets
- `dry_run=false` now uses an admitted real execution-gated runner path for
  explicit named targets only
- preserves truthful attempted/not-attempted status, exit code truth, timeout
  truth, and retained log artifact path/content type/size evidence
- now also records generic before/after candidate revalidation against the
  pre-discovered target artifact candidate paths after runner exit
- still does not imply broad compile execution, arbitrary build command
  execution, or compiled-output verification unless the generic revalidation
  evidence actually proves more

### Real mutation-gated

- `settings.patch`
- `gem.enable`
- `render.material.patch`

Current truth:
- may use a real hybrid preflight path
- now also includes the first admitted narrow mutation corridors, each limited
  to its own explicit file-backed or manifest-backed scope
- keeps backup provenance, rollback outcome evidence, patch-plan evidence, and
  post-write verification explicit for the admitted real mutation records
- now also persists explicit source-of-truth provenance for both the admitted
  real preflight and admitted real mutation records
- now also persists explicit simulated-fallback provenance including
  `manifest-missing`, `manifest-unreadable`, and `mutation-not-admitted`
  categorization when the admitted real path is unavailable
- `gem.enable` now has an admitted narrow approval-gated real mutation corridor
  for explicit local `project.json` top-level `gem_names` insertion, with
  backup, reread verification, and rollback on failure
- `render.material.patch` now has an admitted narrow approval-gated real
  mutation corridor for explicit local `.material` top-level `propertyValues`
  overrides, with backup, reread verification, rollback on failure, and
  optional explicit post-patch shader preflight review evidence
- remains approval-gated and tightly bounded rather than broadly mutation-capable
- falls back to simulated when the admitted real path is unavailable or
  preconditions are not satisfied

### Real editor-authoring/runtime

- `editor.session.open`
- `editor.level.open`
- `editor.entity.create`
- `editor.component.add`

Current truth:
- are admitted real only on the verified `McpSandbox` target wiring
- depend on the persistent project-local bridge publishing an observable
  heartbeat from a live editor launch
- were re-verified through the canonical repo-owned backend bound to
  `127.0.0.1:8000`
- now also compose truthfully inside Prompt Studio as a bounded editor chain
  that may automatically bind the created entity id into allowlisted
  component attachment and bind the added component id into admitted property
  readback when the planner has a proven mapping
- the canonical live proof completed on `2026-04-25` against
  `Levels/TestLoevel01` in `McpSandbox` through the exact composed chain:
  `editor.session.open` -> `editor.level.open` -> `editor.entity.create` ->
  `editor.component.add` -> `editor.component.property.get`
- live proof bundle:
  `backend/runtime/live_editor_authoring_proof_20260425-080441.json`
- the proof verified entity creation, Mesh attachment, and
  `Controller|Configuration|Model Asset` readback through the prompt
  orchestrated path
- the proof now also invoked the pre-entity-create `loaded-level-file` restore
  boundary and hash-verified the selected level prefab against the captured
  backup after proof execution
- latest proof entity/component evidence:
  `CodexProofEntity_20260425_080441`, entity id `[362085715539]`, Mesh
  component id
  `EntityComponentIdPair(EntityId(5957391582996336467), 16444678243022057229)`
- latest proof cleanup boundary:
  `2ba80761a0e741da9fd728da67c60712`,
  `restore_result = restored_and_verified`
- no live Editor undo, viewport reload, entity-absence readback, broader
  property write, delete, parenting, prefab, material, asset, render, build, or
  arbitrary Editor Python behavior was executed or verified by that proof
- now also produce operator-facing post-action review summaries that separate
  requested action, executed action, verified facts, assumptions, missing
  proof, and safest next step using bounded result labels
- remain explicitly labeled real vs simulated in backend and frontend evidence
- do not imply a broad real editor-control family beyond the admitted tools,
  broader component/property mutation, or arbitrary Editor Python execution

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
- explicit operator-visible separation between plan-only, execution-gated, and
  mutation-gated lanes in adapter and readiness rollups
- explicit bridge heartbeat, queue, cleanup history, and lag-note visibility
  for the admitted editor-authoring/runtime boundary
- local operator-lane state, action rails, and detail-panel carry-through for
  pinned-lane navigation
- explicit preset restore, preset drift, local note, local clipboard, and local
  reset cues inside the operator shell

## What remains intentionally limited

- broad real O3DE adapters are still not implemented
- admitted real editor-authoring/runtime remains limited to
  `editor.session.open`, `editor.level.open`, `editor.entity.create`, and
  `editor.component.add` on the verified `McpSandbox` target wiring
- the composed prompt-controlled editor chain remains limited to those admitted
  tools plus explicit admitted `editor.component.property.get` readback; the
  standalone `editor.entity.exists` read path now has direct exact-name
  readback evidence but remains outside cleanup/restore proof and does not
  imply arbitrary component names, broader property reads or writes, delete,
  parenting, prefab mutation, broad entity discovery, or arbitrary Editor
  Python execution
- `build.configure` is not a real configure execution path
- `project.inspect` real evidence is still limited to manifest-backed
  project-config, requested-vs-discovered Gem, requested Gem subset matching,
  requested settings subset matching, top-level settings fields, explicit
  engine compatibility inventory, explicit project origin provenance, and
  explicit presentation metadata inventory, and explicit identity/tag inventory
  rather than broader layered config discovery
- `build.compile` remains limited to explicit named targets, bounded runner
  invocation, exit/timeout/log truth, and generic candidate revalidation; it
  still does not imply arbitrary build execution or broad compiled-output
  verification
- `asset.batch.process` and `asset.move.safe` remain preflight-only and do not
  imply real asset processing or real asset move/reference-repair execution
- `test.run.gtest`, `test.run.editor_python`, and `test.tiaf.sequence` remain
  preflight-only and do not imply real test execution or structured result
  artifact production
- `render.capture.viewport` and `render.material.inspect` remain narrow
  read-only evidence paths; `render.capture.viewport` remains runtime-probe-only,
  while `render.material.inspect` now also includes explicit local `.material`
  readback evidence and still does not imply broader render runtime readback,
  shader data expansion, or reference expansion
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
- the canonical local backend verification path for the admitted
  editor-authoring/runtime boundary is
  `backend/runtime/launch_branch_backend_8000.cmd` on
  `127.0.0.1:8000`
- operator-lane notes, preset restore memory, handoff summaries, clipboard copy,
  and local reset remain frontend browser-session helpers rather than backend
  persistence or shared operator records

## Next safe expansion boundary

Before widening into broader real adapter execution, the next slice should stay
narrow and truthful.

Recommended next boundary:
- refresh operator-facing proof/checkpoint surfaces around the successful
  composed editor live proof plus hash-verified restore-boundary cleanup before
  widening any capability family
- keep the next real editor slice bounded to admitted readback/review depth
  unless live Editor undo/reload or absence-readback semantics are explicitly
  implemented and verified
