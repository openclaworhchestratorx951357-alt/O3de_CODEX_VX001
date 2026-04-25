# Phase 7 Project Inspect Real-Path Checklist

## Purpose

This document defines the exact preconditions, evidence outputs, and validation
checks required before `project.inspect` can truthfully move from simulated to
a real adapter-backed path.

It is intentionally narrow.

It does not implement real adapter execution by itself.

It exists so the first Phase 7 code slice can stay bounded and answer one
specific question:

> What must be true before `project.inspect` can run as a real read-only tool?

Read this together with:
- `docs/PHASE-7-REAL-ADAPTER-GATE.md`
- `docs/PHASE-7-PROJECT-BUILD-CANDIDATES.md`
- `backend/README.md`

## Tool in scope

This checklist applies only to:
- `project.inspect`

Everything else in the `project-build` family must remain explicitly simulated,
plan-only, or mutation-gated unless separately admitted.

## Preconditions before real execution

The first real `project.inspect` slice must verify all of the following before
attempting real execution:

### Workspace and path preconditions

- a target project path is provided or discoverable through the accepted tool
  arguments
- the target path exists
- the target path resolves inside an allowed workspace boundary for the slice
- the adapter can identify the expected project manifest or equivalent project
  descriptor at that path

### Runtime dependency preconditions

- the real inspection surface is named explicitly for the slice
- the required runtime dependency or CLI entrypoint is present
- the adapter can detect and report when that dependency is unavailable
- unsupported operating-system or environment states are rejected truthfully

### Safety and behavior preconditions

- the real path remains read-only
- no project files are modified as part of inspection
- no build, configure, Gem mutation, or settings mutation is triggered
- existing lock and approval behavior stays unchanged unless the slice
  explicitly and truthfully documents a narrower read-only policy path

### Fallback and truthfulness preconditions

- if the real path cannot run, the system must return a clearly labeled
  simulated or unavailable outcome
- operator-facing messages must distinguish:
  - real inspection ran
  - simulated inspection ran
  - real inspection was unavailable

## Expected evidence outputs

The first real `project.inspect` slice must define and persist evidence that a
real read path actually ran.

Minimum evidence expectations:
- run history must show whether the path was real or simulated
- execution details must include adapter provenance for the real path
- artifact metadata must identify the adapter family and contract version
- operator-visible summaries must describe the inspected project source
  truthfully

### Minimum execution details for a real path

At minimum, persisted execution evidence should make these fields inspectable:
- `adapter_family`
- `adapter_mode`
- `adapter_contract_version`
- `execution_boundary`
- a marker that the path used a real read-oriented inspection surface

### Minimum artifact expectations

If the slice emits artifacts, they should make it possible to tell:
- what project path or manifest was inspected
- whether the evidence came from a real or simulated path
- what adapter family and contract version produced the result

## Minimum validation checklist

The first implementation slice should not be considered complete until all of
the following have been exercised:

1. A successful real inspection run against an actual project path.
2. A failure path where the runtime dependency is missing, unsupported, or the
   project path is invalid.
3. Operator-visible messaging that clearly distinguishes real vs simulated
   behavior.
4. Persisted evidence visible through the accepted control-plane surfaces:
   - `/runs`
   - `/executions`
   - `/artifacts`
   - `/events`
5. Documentation updated to name the exact real scope and the remaining
   simulated scope.

## Non-goals for the first real slice

The first real `project.inspect` slice should not:
- broaden into `build.configure`
- broaden into `settings.patch`
- broaden into `gem.enable`
- broaden into `build.compile`
- imply that any mutating `project-build` tool is now real
- weaken approval, locking, or audit behavior

## Exit condition for the first implementation slice

The first real implementation slice is only complete when this statement is
true:

> `project.inspect` can run through a validated real read-only adapter path,
> while the rest of the `project-build` family remains explicitly labeled as
> simulated, plan-only, or mutation-gated.
