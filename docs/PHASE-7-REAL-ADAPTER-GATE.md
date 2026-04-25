# Phase 7 Real Adapter Gate

## Purpose

This document defines the minimum rules for moving a tool family from the
current simulated adapter baseline toward a real O3DE-backed adapter.

It is intentionally narrow.

It does not authorize broad real integration work by itself.

It exists so future Phase 7+ slices can answer one question truthfully:

> What must be true before any tool can stop being described as simulated?

## Current truthful baseline

As of the current accepted branch state:
- control-plane bookkeeping is real
- approvals, runs, locks, events, executions, and artifacts are real records
- adapter mode selection is real and config-driven
- adapter registry reporting is real
- adapter-family provenance is persisted
- `project.inspect` is the current real read-only hybrid path when manifest
  preconditions are satisfied
- `editor.session.open` is an admitted real editor-session path on
  `McpSandbox`
- `editor.level.open` is an admitted real level-open path on `McpSandbox`
- `editor.entity.create` is an admitted real root-level named entity-create path
  on `McpSandbox`
- `editor.component.add` is an admitted real allowlist-bound component attach
  path on `McpSandbox`
- `editor.component.property.get` is an admitted hybrid read-only explicit
  component/property readback path on `McpSandbox`
- `build.configure` is the current real plan-only hybrid preflight path when
  `dry_run=true` and manifest preconditions are satisfied
- `settings.patch` now includes a narrow admitted manifest-backed hybrid
  preflight path plus a narrow admitted manifest-backed set-only mutation path
  when its admission criteria are satisfied
- remaining published tools are still limited to their documented read-only,
  plan-only, execution-gated, mutation-gated, or admitted editor-runtime
  corridors; none of these exceptions imply broad real O3DE adapter coverage

That means a tool is only eligible for "real" status when the adapter behind it
has been implemented and validated, not just because the control plane around
it is mature.

## Real adapter admission criteria

A tool family may only move from simulated to real when all of the following
are true for that family:

1. The execution surface is identified precisely.
2. The execution preconditions are known and testable.
3. Failure modes are explicit and operator-visible.
4. Approval and lock behavior remains enforced.
5. Evidence of real execution can be persisted and inspected.
6. The tool can still report "simulated" or "unavailable" truthfully when the
   real path is not usable.

## Required onboarding checklist

Before implementing a real adapter slice, the slice must define:
- target family
- target tools in scope
- read-only vs mutating classification
- runtime dependency assumptions
- workspace assumptions
- environment variables or discovery rules required
- lock requirements
- approval requirements
- artifact/evidence expectations
- rollback or containment expectations for mutating actions

## Capability gating rules

Real execution must remain gated until the adapter can prove all of the
following:
- the required runtime dependency is present
- the target workspace or engine path is valid
- the adapter can detect unsupported or unsafe states before mutation
- the adapter can emit operator-facing failure messages without pretending the
  action ran successfully

If those checks fail, the system must:
- reject the attempt before real execution, or
- fall back to a clearly labeled simulated or unavailable status
- persist enough fallback provenance that operators can tell which admitted
  manifest/root boundary was expected and why the real path did not run

## First real slice constraints

The first real slice should stay in the `project-build` family and prefer:
- project inspection
- settings inspection
- Gem state inspection
- build/configure planning

Mutation should come later than inspection.

Any mutating flow must remain:
- approval-gated
- auditable
- reversible or clearly recoverable where practical

## What does not count as real

The following do not by themselves justify a "real" label:
- persisted execution records
- artifact summaries
- adapter registry visibility
- schema validation
- frontend visibility
- route availability

Those are all important, but they do not replace actual validated O3DE
execution.

## Exit criteria for the first real adapter slice

A first real adapter slice is only complete when:
- at least one tool path uses a real O3DE-backed execution surface
- operator messaging still distinguishes real vs simulated correctly
- the real path has been run and validated in an actual environment
- failure states were exercised or at least directly observed
- persisted execution/artifact evidence makes the real path visible in run
  history
- docs were updated to name the exact real scope and remaining simulated scope

## Standing rule

Until those criteria are met for a tool family, keep the family and its tools
explicitly labeled as simulated.

The current admitted exceptions remain narrow:
- `project.inspect` real read-only manifest-backed inspection
- `editor.session.open` admitted real editor-session runtime on `McpSandbox`
- `editor.level.open` admitted real level-open runtime on `McpSandbox`
- `editor.entity.create` admitted real root-level named entity creation on
  `McpSandbox`
- `editor.component.add` admitted real allowlist-bound component attachment on
  `McpSandbox`
- `editor.component.property.get` admitted hybrid read-only component property
  readback on `McpSandbox`
- `build.configure` real plan-only manifest-backed preflight
- `settings.patch` narrow manifest-backed preflight plus narrow admitted
  manifest-backed set-only mutation

The current canonical local verification path for the editor-session/runtime
admissions is the repo-owned backend on `127.0.0.1:8000` launched via
`backend/runtime/launch_branch_backend_8000.cmd` against the verified
`McpSandbox` target wiring.

Those exceptions do not imply broad real O3DE adapter coverage.
