# Phase 7 Checkpoint

## Purpose

This checkpoint captures the current accepted Phase 7 execution boundary in one
place.

It is intentionally short.

It does not authorize broader real-adapter expansion by itself.

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

Real O3DE execution is still narrow.

## Current accepted tool surfaces

### Real read-only

- `project.inspect`

Current truth:
- may use a real read-only manifest-backed path in `O3DE_ADAPTER_MODE=hybrid`
- may now capture manifest-backed project-config, requested-vs-discovered Gem,
  requested Gem subset matching, requested settings subset matching, and
  top-level settings evidence from `project_root/project.json` when requested
- falls back to simulated when the real manifest path is unavailable
- remains explicitly labeled as real vs simulated in backend and frontend
- still does not authorize deeper layered settings discovery or any mutation path

### Real plan-only

- `build.configure`

Current truth:
- may use a real plan-only preflight path in `O3DE_ADAPTER_MODE=hybrid`
- only when `dry_run=true`
- records real preflight evidence and plan metadata
- does not execute a real configure mutation
- falls back to simulated when preconditions are not satisfied

### Real mutation-gated

- `settings.patch`

Current truth:
- may use a real hybrid preflight path
- now also includes the first admitted manifest-backed set-only mutation path
- keeps backup provenance, rollback outcome evidence, patch-plan evidence, and
  post-write verification explicit
- remains approval-gated and tightly bounded rather than broadly mutation-capable
- falls back to simulated when the admitted real path is unavailable or
  preconditions are not satisfied

### Mutation candidates after the current gate

- `gem.enable`
- `build.compile`

Current truth:
- remain approval-gated and explicitly non-real in this phase

### Simulated-only

All remaining currently published tools remain simulated-only.

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

## What remains intentionally limited

- broad real O3DE adapters are still not implemented
- `build.configure` is not a real configure execution path
- `project.inspect` real evidence is still limited to manifest-backed
  project-config, requested-vs-discovered Gem, requested Gem subset matching,
  requested settings subset matching, and top-level settings fields rather than
  broader layered config discovery
- broader mutation paths are still not implemented beyond the first admitted
  manifest-backed settings.patch case
- simulated fallback remains part of the truthful accepted behavior
- default non-container persistence is still not claimed healthy; explicit
  operator-configured persistence remains the truthful baseline for
  non-container local runs

## Next safe expansion boundary

Before widening into broader real adapter execution, the next slice should stay
narrow and truthful.

Recommended next boundary:
- define the exact contract for the next manifest-adjacent Gem-state refinement
  that stays file-read-only on `project_root/project.json`, or
- begin that next narrow refinement only if it stays on the same
  project-manifest source of truth, keeps fallback behavior explicit, and does
  not blur the already-admitted settings.patch mutation boundary into a broader
  mutation claim
