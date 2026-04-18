# Phase 3 Checkpoint

## Scope

This checkpoint summarizes the current accepted Phase 3 backend and schema state on `feature/production-baseline-v1`.

It is intentionally narrow:
- no real O3DE adapters are claimed
- simulated execution remains explicitly labeled as simulated
- explicit operator-configured persistence remains the local-run baseline
- schema-validator support remains limited to the subset required by the currently published per-tool schemas

## Implemented Now

- machine-readable schemas exist for:
  - request envelope
  - response envelope
  - run
  - approval
  - lock
  - event
  - execution
  - artifact
  - policy
  - readiness and route output surfaces that are already published
- per-tool argument schemas and per-tool result schemas exist under `schemas/tools/`
- `/tools/catalog` publishes `args_schema` and `result_schema` refs for every registered tool
- `/policies` publishes the same schema refs alongside approval and lock policy metadata
- dispatch-time request-arg validation is implemented against the published per-tool arg schemas
- simulated dispatch-result conformance checks are implemented against the published per-tool result schemas
- readiness metadata reports schema-validation mode, scope, active supported keywords, and active unsupported keywords
- the active unsupported keyword list for the accepted published tool schema set is currently empty
- explicit operator-configured persistence is documented and usable end to end through `O3DE_CONTROL_PLANE_DB_PATH`

## Intentionally Limited

- the validator is a subset validator, not a full JSON Schema engine
- validator support should only grow when a currently published per-tool schema actually requires a new keyword
- current support is limited to the subset used by the accepted published tool arg/result schemas
- readiness and docs must continue to describe that subset truthfully
- simulated result validation only checks the current simulated dispatch payload shape
- default non-elevated persistence is not claimed healthy in this environment
- real O3DE adapter outputs are not validated because real O3DE adapters have not started yet

## Phase 4 Frontend Gate

Phase 4 frontend wiring should start only when all of the following remain true:

- Phase 1 and Phase 2 backend bookkeeping and persistence routes are already in place and stable enough for UI consumption
- Phase 3 schema vocabulary is stable across backend models, published route outputs, tool catalog entries, and policy surfaces
- the accepted published per-tool schema set stays inside the supported validator subset, with active unsupported keywords still empty
- operator-facing docs and readiness output still describe simulated execution and persistence truthfully
- local operators have a known-good explicit persistence path configured through `O3DE_CONTROL_PLANE_DB_PATH` or an equivalent accepted operator override
- frontend work can consume real backend APIs without pretending that simulated adapters are real O3DE integrations

## Current Truthful Status

- Phase 3 backend/schema work is materially in place for the currently accepted control-plane surface
- Phase 3 is still intentionally conservative about validator scope
- the next schema-related step should only happen if the published tool schema set introduces a real new requirement
- frontend wiring should remain blocked until the Phase 4 work is started intentionally against the existing real backend surfaces, not mock assumptions
