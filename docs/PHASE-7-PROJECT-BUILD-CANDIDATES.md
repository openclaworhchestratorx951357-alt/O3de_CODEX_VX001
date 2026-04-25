# Phase 7 Project-Build Candidate Set

## Purpose

This document defines the first candidate tool set for Phase 7 real-adapter
work in the `project-build` family.

It does not implement any real adapter execution.

It only classifies the existing accepted tool surface so future Phase 7 slices
can stay narrow and truthful.

Read this together with:
- `docs/PHASE-7-REAL-ADAPTER-GATE.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `backend/README.md`

## Current accepted project-build tools

The currently published `project-build` tools are:
- `project.inspect`
- `settings.patch`
- `gem.enable`
- `build.configure`
- `build.compile`

## Classification model

Each candidate is classified as one of:
- `inspect-only`
- `plan-only`
- `mutation-gated`

Meanings:

### `inspect-only`
- real read-oriented execution is an acceptable first target
- should not mutate project or build state
- should be safe to expose first if the runtime dependency checks are solid

### `plan-only`
- may inspect real state and produce a plan or preflight result
- should not perform the actual mutating or build action yet
- useful for early real integration slices when operator trust matters more than breadth

### `mutation-gated`
- may eventually support real mutation or execution
- should only move after inspection/planning behavior is validated
- must remain approval-gated, audited, and clearly reversible or recoverable where practical

## Candidate matrix

### `project.inspect`
- classification: `inspect-only`
- why:
  - naturally read-oriented
  - aligns with the roadmap preference for project inspection first
  - lowest-risk real entry point in the `project-build` family
- minimum real evidence expected later:
  - actual project manifest or project-state inspection against a real workspace
  - persisted evidence that the real read path ran successfully

### `settings.patch`
- classification: `mutation-gated`
- why:
  - directly changes configuration state
  - requires explicit reversibility and operator visibility
  - should not be among the first real mutations until inspection/planning is proven
- expected precursor:
  - a real settings inspection or patch-planning path first

### `gem.enable`
- classification: `mutation-gated`
- why:
  - changes project configuration
  - can affect downstream configure/build behavior
  - should remain behind approval and explicit recovery expectations
- expected precursor:
  - real Gem state inspection first

### `build.configure`
- classification: `plan-only`
- why:
  - has strong value as a real preflight/planning step before true build execution
  - interacts with build-tree assumptions and environment constraints
  - should begin with configure planning or environment validation, not immediate real execution
- expected precursor:
  - real inspection of build tree state and configure prerequisites

### `build.compile`
- classification: `mutation-gated`
- why:
  - highest operational risk in this family among the current tool set
  - consumes build resources and has stronger runtime/environment coupling
  - should come after project inspection and configure planning are proven
- expected precursor:
  - real configure/build planning
  - validated runtime dependency checks

## Recommended first real order

The recommended order for real `project-build` onboarding is:

1. `project.inspect` as the first `inspect-only` tool
2. `build.configure` as a `plan-only` or preflight-oriented real slice
3. a real inspection companion for settings/Gem state if needed
4. only then consider `settings.patch`, `gem.enable`, or `build.compile`

## Guardrails for the first implementation slice

The first real `project-build` slice should:
- implement one tool only, or one tool plus a tightly coupled preflight helper
- keep simulated fallback behavior explicit
- keep approval and lock enforcement unchanged
- keep persisted execution and artifact evidence truthful about whether the path was real or simulated
- stop short of broad mutation support

## What should remain simulated for now

Until individually validated, these should still be treated as simulated:
- `settings.patch`
- `gem.enable`
- `build.compile`

`build.configure` should also remain simulated for actual mutation/execution
until a real planning or preflight slice is explicitly implemented and verified.

## Exit condition for the next Phase 7 code slice

The next implementation slice should only aim to make one statement true:

> `project.inspect` has a real, validated, read-oriented adapter path while the
> rest of the `project-build` family remains clearly labeled as simulated or
> plan-only.
