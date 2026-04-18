# Phase 7 Settings/Gem Inspection Candidates

## Purpose

This document defines the next concrete read-oriented candidate set after the
current Phase 7 checkpoint.

It is intentionally narrow.

It does not implement any real adapter execution by itself.

It exists so the next precursor slice can answer one bounded question
truthfully:

> Which settings and Gem inspection surfaces are safe candidates before any
> mutation-gated `settings.patch` or `gem.enable` work moves forward?

Read this together with:
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/PHASE-7-REAL-ADAPTER-GATE.md`
- `docs/PHASE-7-SETTINGS-GEM-INSPECTION-CHECKLIST.md`
- `backend/README.md`

## Candidate model

Each candidate below is classified as one of:
- `file-read-only`
- `layered-read-only`
- `defer`

Meanings:

### `file-read-only`
- can likely be implemented through direct file inspection
- should remain read-only and workspace-local
- is a strong candidate for the next real precursor slice

### `layered-read-only`
- may require reading multiple sources and explaining precedence
- still read-oriented, but needs clearer evidence rules before implementation
- should not mutate state

### `defer`
- still valuable, but too coupled to mutation, runtime discovery, or ambiguity
- should wait until the simpler read-oriented candidates are proven

## Candidate matrix

### Project manifest-backed config inspection

- classification: `file-read-only`
- likely sources:
  - `project_root/project.json`
- likely value:
  - reads the current project manifest source of truth directly
  - stays aligned with the already accepted real `project.inspect` boundary
  - can expose project-level config signals without changing files
- likely evidence:
  - manifest path used
  - keys or config sections inspected
  - real vs simulated provenance

### Registry/settings file inspection

- classification: `layered-read-only`
- likely sources:
  - project-local settings registry files
  - repo-local or project-local configuration overlays if present
- likely value:
  - prepares the ground for later `settings.patch` work
  - lets operators inspect config state before any mutation path exists
- caution:
  - must define precedence if multiple registry-like files are read
  - must stay explicit about missing-file behavior and partial visibility

### Gem list from project manifest inspection

- classification: `file-read-only`
- likely sources:
  - `project_root/project.json`
  - existing manifest-backed Gem name fields already used by `project.inspect`
- likely value:
  - extends an already accepted real manifest path
  - gives operators truthful real Gem-state visibility without enabling Gem mutation
- likely evidence:
  - Gem names discovered
  - source file path
  - real vs simulated provenance

### Gem resolution from multiple config surfaces

- classification: `layered-read-only`
- likely sources:
  - project manifest
  - Gem config files or registries if present
  - workspace metadata that affects discoverability
- likely value:
  - would support a stronger eventual `gem.enable` boundary
- caution:
  - needs explicit precedence rules
  - may need broader path/runtime assumptions than the first precursor should take on

### Patch-planning preview for settings mutation

- classification: `defer`
- why defer:
  - drifts too close to mutation semantics
  - needs rollback/recovery framing even if it stays preview-only
  - should follow at least one proven real settings inspection slice first

### Patch-planning preview for Gem enablement

- classification: `defer`
- why defer:
  - drifts too close to mutation semantics
  - depends on stronger Gem discovery truth first
  - should follow a proven real Gem inspection slice

## Recommended next precursor order

The safest next order is:

1. project manifest-backed config inspection
2. Gem list inspection from the same manifest-backed source
3. only then consider layered settings/Gem inspection surfaces
4. defer patch-planning previews until read-only evidence is stable

## Recommended first implementation boundary

If the next real precursor slice moves ahead, the narrowest truthful statement
to make is:

> a project-config or Gem-state inspection path can read a known project source
> of truth without mutation, while `settings.patch` and `gem.enable` remain
> explicitly mutation-gated.

## What should still remain out of scope

Until a real inspection precursor is validated, these should remain out of
scope:
- settings mutation previews that imply write readiness
- Gem enablement previews that imply write readiness
- any compile or broader build execution work
- any non-local or workspace-ambiguous config discovery
