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
- `project.inspect` may use a real read-only hybrid path
- `build.configure` may use a real plan-only hybrid preflight path
- `settings.patch` now has an admitted real hybrid boundary for preflight and
  the first manifest-backed set-only mutation case
- `gem.enable` and `build.compile` remain simulated in practice
- `editor-control`, `asset-pipeline`, `render-lookdev`, and `validation`
  tools remain simulated-only in practice

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
current published catalog. The highest-signal next slice is to refresh docs and
operator-facing status wording so the now-complete cross-family coverage is
described truthfully and consistently.

After that, the next engineering decision is whether to:
- keep tightening contract and documentation evidence around the existing
  hybrid boundary, especially the admitted settings.patch mutation boundary
- or start a new phase for genuinely real adapter implementation work

## Non-goals of this checkpoint

- claiming broad real O3DE adapter support
- implying that persisted schema coverage changes the real/simulated execution
  boundary
- changing the truthful baseline that operator-configured persistence remains
  the safest local non-container persistence claim
