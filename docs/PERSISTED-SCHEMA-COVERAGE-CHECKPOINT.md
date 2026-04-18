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
- persisted execution-details schema coverage is published for 8 tools
- persisted artifact-metadata schema coverage is published for the same 8 tools
- `/ready` and schema-validation status now report this coverage explicitly
- all covered tools still remain truthful about whether they are real,
  plan-only, or simulated

## Covered tools

### `project-build`

- `project.inspect`
- `build.configure`
- `settings.patch`
- `gem.enable`
- `build.compile`

### `asset-pipeline`

- `asset.processor.status`
- `asset.source.inspect`

### `render-lookdev`

- `render.material.inspect`

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
- `settings.patch`, `gem.enable`, and `build.compile` remain simulated in
  practice
- `asset.processor.status`, `asset.source.inspect`, and
  `render.material.inspect` remain simulated-only in practice

## Current uncovered families and surfaces

Persisted execution-details and artifact-metadata coverage is still not
published for many tools, including:

### `editor-control`

- `editor.session.open`
- `editor.level.open`
- `editor.entity.create`
- `editor.component.add`

### `asset-pipeline`

- `asset.batch.process`
- `asset.move.safe`

### `render-lookdev`

- `render.material.patch`
- `render.shader.rebuild`
- `render.capture.viewport`

### `validation`

- `test.run.gtest`
- `test.run.editor_python`
- `test.tiaf.sequence`
- `test.visual.diff`

## Recommended next expansion

The safest next expansion continues tool-by-tool on simulated or read-only
surfaces before broader mutation work.

Recommended order:
- extend `render-lookdev` with `render.capture.viewport` or another read-only
  inspect surface
- or extend `asset-pipeline` / `validation` with another low-risk simulated
  read-only or test-observation tool

## Non-goals of this checkpoint

- claiming broad real O3DE adapter support
- claiming cross-family persisted coverage is complete
- changing the truthful baseline that operator-configured persistence remains
  the safest local non-container persistence claim
