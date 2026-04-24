# Persisted Schema Coverage Checkpoint

## Purpose

This checkpoint captures the current published persisted-payload schema
boundary.

It is intentionally narrow.

It documents what the backend currently validates for persisted
`execution.details` and `artifact.metadata`.

It does not imply broader real-adapter support.

## Current truthful status

As of the current accepted branch state:
- persisted execution-details schema coverage is published for 21 tools
- persisted artifact-metadata schema coverage is published for the same 21 tools
- `/ready` and schema-validation status report per-tool and per-family rollout
  explicitly
- five published families are now fully covered for persisted payload contracts:
  `editor-control`, `asset-pipeline`, `project-build`, `render-lookdev`, and
  `validation`
- all covered tools still remain truthful about whether they are real,
  plan-only, or simulated

## Covered tools

### `editor-control`

- `editor.session.open`
- `editor.level.open`
- `editor.entity.create`
- `editor.component.add`

### `asset-pipeline`

- `asset.processor.status`
- `asset.source.inspect`
- `asset.batch.process`
- `asset.move.safe`

### `project-build`

- `project.inspect`
- `build.configure`
- `settings.patch`
- `gem.enable`
- `build.compile`

### `render-lookdev`

- `render.material.inspect`
- `render.capture.viewport`
- `render.material.patch`
- `render.shader.rebuild`

### `validation`

- `test.visual.diff`
- `test.run.editor_python`
- `test.run.gtest`
- `test.tiaf.sequence`

## Coverage meaning

For the covered tools above:
- runtime dispatch now has published schema targets for persisted
  `execution.details`
- runtime dispatch now has published schema targets for persisted
  `artifact.metadata`
- drift between emitted persisted payloads and published schema now fails
  explicitly as persisted-payload contract drift

This is a persistence-contract coverage checkpoint, not a real-execution
checkpoint.

## Real vs simulated truth

Current execution truth is still:
- `project.inspect`, `asset.processor.status`, `asset.source.inspect`,
  `render.capture.viewport`, `render.material.inspect`, `test.visual.diff`,
  and `editor.component.property.get` may use admitted real read-only paths
- `build.configure`, `build.compile`, `asset.batch.process`,
  `asset.move.safe`, `render.shader.rebuild`, `test.run.gtest`,
  `test.run.editor_python`, and `test.tiaf.sequence` may use admitted real
  plan-only preflight/result-truth paths
- `settings.patch`, `gem.enable`, and `render.material.patch` now have
  admitted narrow real mutation boundaries with backup, verification, and
  rollback visibility
- broader execution, artifact production, dependency resolution, reference
  repair, runtime readback, and runner/build semantics remain unavailable
  outside those admitted slices

## Current uncovered surfaces

No uncovered published tools remain in the current catalog for persisted
`execution.details` and `artifact.metadata`.

This means the current published catalog has persisted payload coverage for
every tool in:
- `editor-control`
- `asset-pipeline`
- `project-build`
- `render-lookdev`
- `validation`

## Recommended next expansion

The safest next expansion is no longer tool-by-tool schema rollout inside the
current published catalog. The highest-signal next slice is to reselect one
truthful next depth packet from the now-aligned read-only, plan-only, and
mutation-gated baseline.

After that, the next engineering decision is whether to:
- keep tightening contract and verification depth around the already admitted
  narrow plan-only and mutation-gated boundaries
- or reselect the single safest next mutation or execution lane only when a
  narrower evidence-first packet is no longer available

## Non-goals of this checkpoint

- claiming broad real O3DE adapter support
- implying that persisted schema coverage changes the real/simulated execution
  boundary
- changing the truthful baseline that operator-configured persistence remains
  the safest local non-container persistence claim
