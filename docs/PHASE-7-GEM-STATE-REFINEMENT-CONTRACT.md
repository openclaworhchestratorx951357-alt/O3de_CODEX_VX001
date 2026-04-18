# Phase 7 Gem-State Refinement Contract

## Purpose

This document defines the next safe manifest-adjacent refinement after the
current project-config inspection expansion.

It is intentionally narrower than any broader Gem discovery or enablement
design.

It does not implement a real adapter path by itself.

It exists to answer one bounded question truthfully:

> What should count as an accepted next real Gem-state refinement before any
> layered Gem discovery or `gem.enable` mutation work is attempted?

Read this together with:
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/PHASE-7-PROJECT-CONFIG-INSPECTION-CONTRACT.md`
- `docs/PHASE-7-SETTINGS-GEM-CANDIDATES.md`
- `backend/README.md`

## Contract boundary

This refinement must stay:
- file-read-only
- workspace-local
- manifest-adjacent
- fallback-safe
- explicitly non-mutating

That means the accepted real source of truth is still:
- `project_root/project.json`

This refinement must not widen into:
- layered Gem registry discovery
- engine-wide Gem resolution
- compatibility inference beyond what the manifest already states
- any write-preview for `gem.enable`
- mutation or build side effects

## Accepted scope

The accepted real scope for this refinement is:
- reading manifest-backed Gem state from `project_root/project.json`
- distinguishing between requested Gem evidence and actually present Gem entries
- persisting which Gem-state fields were inspected
- keeping provenance explicit as real vs simulated

Examples of acceptable Gem-state signals:
- `gem_names`
- Gem entry count
- explicit absence of Gem entries
- requested Gem-state inspection markers

Examples of explicitly out-of-scope Gem-state signals:
- resolved Gem paths from external registries
- layered Gem precedence across multiple config surfaces
- inferred enablement actions
- compatibility judgments not already encoded in the manifest

## Required truthful input assumptions

Before a real Gem-state refinement run is accepted, all of these must be true:

1. `project_root` is provided explicitly.
2. `project_root/project.json` exists.
3. `project_root/project.json` can be read as JSON without repair or mutation.
4. Gem-state evidence is derived only from the project manifest in this slice.

If any of those assumptions fail, the slice must:
- reject before real execution, or
- fall back to a clearly labeled simulated path

## Required truthful output

If a future real Gem-state refinement slice succeeds, it must make these
statements true:

- the run used `project_root/project.json` as the only real source of Gem-state truth
- the run was read-only
- the run did not mutate Gem state
- the run did not imply `gem.enable` readiness
- the run did not imply layered Gem discovery

Minimum evidence should identify:
- manifest path used
- Gem-state fields inspected
- requested Gem-state fields
- discovered Gem names
- Gem entry count
- whether the path was real or simulated
- adapter family
- adapter mode
- adapter contract version
- execution boundary

## Required operator wording

Operator-facing wording should stay specific:

- say `real read-only Gem-state inspection` when the real path succeeds
- say `manifest-backed Gem evidence` when describing the accepted source
- say `simulated fallback` when the real path is unavailable

Operator wording must not imply:
- `gem.enable` is real
- registry-backed Gem resolution is real
- mutation approval readiness exists

## Minimum validation expectations

Before this refinement is considered accepted, a future implementation slice
should demonstrate:

1. Success against a real `project_root/project.json` file containing Gem entries.
2. Truthful success when no Gem entries are present.
3. Truthful fallback when the manifest is missing.
4. Truthful fallback when the manifest is unreadable.
5. Persisted evidence that distinguishes requested Gem-state inspection from
   actually discovered Gem-state evidence.
6. Operator-visible wording that distinguishes Gem-state refinement from both
   broader Gem discovery and mutation-gated `gem.enable` work.

## Relationship to existing accepted paths

This contract should extend the already accepted `project.inspect` boundary.

It should not create a separate Gem subsystem first.

The safest next truthful statement is:

> `project.inspect` can expose a slightly richer real Gem-state refinement from
> `project_root/project.json`, while layered Gem discovery and `gem.enable`
> remain explicitly gated.

## Exit condition for the next implementation slice

The next refinement slice should stop once it can prove:

- one manifest-backed Gem-state refinement path is real
- the path remains file-read-only
- fallback behavior is explicit
- operator visibility is explicit
- no layered Gem discovery or mutation behavior was added
