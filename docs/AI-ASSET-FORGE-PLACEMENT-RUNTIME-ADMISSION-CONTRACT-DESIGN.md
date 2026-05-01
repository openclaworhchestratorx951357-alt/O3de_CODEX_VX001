# AI Asset Forge Placement Runtime-Admission Contract Design

Status: design-only (no runtime admission change)

## Purpose

Define exact bounded contract design requirements for any future placement
runtime-admission candidate, while preserving fail-closed no-go boundaries.

## Current baseline

Current runtime-admission baseline truth is recorded in:

- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-BASELINE-AUDIT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-LONG-HOLD-CHECKPOINT.md`
- `docs/asset-forge/ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-DECISION-DESIGN.md`

No placement runtime execution corridor is admitted by this packet.

## Contract design scope

Candidate surfaces for future runtime-admission consideration:

- `POST /asset-forge/o3de/placement-harness/execute`
- `POST /asset-forge/o3de/placement-harness/live-proof`

Design target in this packet: contract-only hardening.

Execution/mutation admission in this packet: none.

## Candidate contract shape (v1 design)

Any future runtime-admission candidate should expose an explicit contract with:

- exact corridor/capability identifiers per endpoint
- exact request-binding scope fields (candidate/source/target/platform/session)
- explicit server-owned admission/session evidence references
- explicit bridge readiness contract and freshness fields
- explicit command-contract identifier and result-contract identifier
- explicit post-run verification contract fields
- explicit revert/rollback contract and scope identifier fields
- explicit fail-closed reason taxonomy
- explicit non-goal/no-go labels for out-of-scope mutation

## Required preconditions

Any future runtime-admission candidate must fail closed unless all are true:

1. server-owned approval/session is present, valid, and request-bound
2. request fingerprint and operation scope fingerprint match exact target
3. explicit server-owned admission gate is enabled for exact corridor
4. stage-write/readback evidence references are present and `succeeded`
5. placement proof and harness/live-proof contract evidence is present
6. deterministic contract-key checks match exact-scope request
7. bridge readiness is fresh and request-scoped
8. post-run verification plan is explicit and bounded
9. exact-scope revert/rollback plan is explicit and bounded
10. no client approval/session field is treated as authorization

## Fail-closed rules

A future runtime-admission candidate must fail closed when:

- session is missing/revoked/rejected/expired or request binding mismatches
- admission gate/evidence references are missing
- contract key is missing or mismatched
- bridge readiness is stale/missing/unavailable
- command/result contract identifiers are missing/invalid
- post-run verification plan is missing/invalid
- revert/rollback scope is missing/invalid
- any request path escapes exact allowlisted scope

Fail-closed responses must keep:

- execution blocked
- mutation blocked
- no provider/Blender/Asset Processor execution
- no broad scene/prefab/project mutation

## No-go boundaries

This design explicitly keeps blocked:

- broad placement runtime execution
- arbitrary entity selection or mutation scope
- broad prefab/material/scene mutation
- generated-asset assignment execution
- provider generation execution
- Blender execution
- Asset Processor execution admission
- client/operator metadata as authorization

## Required tests for any future implementation packet

At minimum, future packets must prove:

- missing/invalid server-owned session and request binding fail closed
- missing admission references fail closed
- contract-key mismatch fails closed
- stale/missing bridge readiness fails closed
- missing command/result/post-verification/revert contract fields fail closed
- blocked paths perform no runtime mutation and no bridge mutation call
- ready-looking evidence remains blocked unless separate exact admission gate
  is explicitly enabled

## What this packet does not do

- no backend/runtime code changes
- no endpoint admission changes
- no placement runtime execution
- no mutation broadening

## Recommended next packet

Placement runtime-admission readiness audit packet:

- classify ready vs missing gates against this contract design
- identify exact implementation touchpoints and no-touch boundaries
- keep placement runtime execution blocked and non-mutating

