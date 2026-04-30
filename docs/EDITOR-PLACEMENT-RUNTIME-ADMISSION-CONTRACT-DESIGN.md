# Editor Placement Runtime-Admission Contract Design

Status: design-only (no runtime admission change)

## Purpose

Define exact bounded contract requirements for any future editor placement
runtime-admission candidate while preserving fail-closed no-go boundaries.

## Current baseline

Current runtime-admission baseline truth is recorded in:

- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-BASELINE-AUDIT.md`
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-IMPLEMENTATION.md`
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-LONG-HOLD-CHECKPOINT.md`

No editor placement runtime execution corridor is admitted by this packet.

## Contract design scope

Candidate surface for future runtime-admission consideration:

- `POST /asset-forge/o3de/editor-placement-proof-only`

Design target in this packet: contract-only hardening.

Execution/mutation admission in this packet: none.

## Candidate contract shape (v1 design)

Any future runtime-admission candidate should expose an explicit contract with:

- exact corridor/capability identifiers for the editor placement lane
- exact request-binding scope fields (candidate/source/level/entity/component)
- explicit server-owned approval/session evidence references
- explicit stage-write/readback evidence and freshness fields
- explicit runtime gate-state fields (default-off when missing/malformed)
- explicit command-contract identifier and result-contract identifier
- explicit post-run verification contract fields
- explicit revert/rollback scope contract and contract-key match fields
- explicit fail-closed reason taxonomy
- explicit non-goal/no-go labels for out-of-scope mutation

## Required preconditions

Any future runtime-admission candidate must fail closed unless all are true:

1. server-owned approval/session is present, valid, and request-bound
2. request fingerprint and operation scope fingerprint match exact target
3. explicit server-owned admission gate is enabled for exact corridor
4. stage-write/readback evidence references are present and `succeeded`
5. deterministic contract-key checks match exact-scope request
6. runtime gate-state and bridge/evidence readiness are explicit and fresh
7. post-run verification plan is explicit and bounded
8. exact-scope revert/rollback plan is explicit and bounded
9. fail-closed reason taxonomy remains explicit and test-covered
10. no client approval/session field is treated as authorization

## Fail-closed rules

A future runtime-admission candidate must fail closed when:

- session is missing/revoked/rejected/expired or request binding mismatches
- admission gate/evidence references are missing
- runtime gate-state is missing/malformed/off
- contract key is missing or mismatched
- command/result contract identifiers are missing/invalid
- post-run verification plan is missing/invalid
- revert/rollback scope is missing/invalid
- any request path escapes exact allowlisted scope

Fail-closed responses must keep:

- execution blocked
- mutation blocked
- `execution_admitted=false`
- `placement_write_admitted=false`
- `mutation_occurred=false`

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
- runtime gate-state missing/malformed/off fails closed
- contract-key mismatch fails closed
- missing command/result/post-verification/revert contract fields fail closed
- blocked paths perform no runtime mutation
- ready-looking evidence remains blocked unless a separate exact admission gate
  is explicitly enabled

## What this packet does not do

- no backend/runtime code changes
- no endpoint admission changes
- no placement runtime execution
- no mutation broadening

## Recommended next packet

Editor placement runtime-admission readiness audit
(`codex/editor-placement-runtime-admission-readiness-audit`):

- classify ready vs missing gates against this contract design
- identify exact implementation touchpoints and no-touch boundaries
- keep runtime placement execution blocked and non-mutating
