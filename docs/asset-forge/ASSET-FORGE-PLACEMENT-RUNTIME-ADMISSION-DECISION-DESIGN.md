# Asset Forge Placement Runtime Admission Decision Design

## Status
Design-only. No placement runtime admission by this document.

## Current merged baseline
- #139 docs/spec pack
- #140 frontend GUI/editor shell
- #141 backend read-only/status/proof scaffolding
- #142 server-owned approval/session substrate
- #143 approval enforcement evaluation
- #144 mutation-admission design
- #145 stage-write dry-run fail-closed matrix
- #146 stage-write admission-flag design
- #147 stage-write proof-only execution
- #148 stage-write readback bridge
- #149 placement proof readiness matrix
- #150 placement proof admission-flag design
- #155 placement proof contract gates
- #156 placement harness/live-proof contract gates

## Decision scope
This packet decides only whether placement runtime execution should be admitted now.

Decision: **do not admit placement runtime execution yet**.

## Candidate placement corridor family
- `asset_forge.o3de.placement.harness.execute`
- `asset_forge.o3de.placement.live_proof`

Both remain non-admitted and fail-closed.

## Why runtime placement is not admitted yet
Compared with stage-write proof-only execution, placement runtime carries broader risk:
- scene/prefab mutation semantics are harder to bound and verify
- revert behavior must prove exact object-level safety under runtime conditions
- bridge/runtime readiness and command/result binding need stronger evidence continuity
- post-action verification must prove exact entity/component state and no collateral mutation

## Required gates before any future placement runtime admission
All must be true before admission can even be considered:
- server-owned approval session exists and is valid
- request binding fingerprint matches exact candidate/target request
- operation scope matches exact placement corridor
- explicit server-owned admission flag is enabled for the exact corridor
- admission packet reference and operator identity are present
- stage-write corridor evidence is present and readback status is `succeeded`
- placement proof contract evidence is present and contract key matches exact-scope request
- harness/live-proof contract evidence is present and contract key matches exact-scope request
- bridge readiness evidence is fresh and request-scoped
- exact revert contract and exact rollback target scope are pre-declared

## Required proof artifacts before admission
- approval session record and decision timeline
- request fingerprint and operation scope fingerprint
- stage-write evidence + readback bridge summary
- placement proof contract evidence packet
- harness/live-proof contract evidence packet
- exact command contract and expected runtime response contract
- post-run bounded verification plan and expected evidence fields
- exact revert statement and rollback scope proof plan

## Required tests before any admission PR
- missing/expired/revoked/rejected sessions fail closed
- operation mismatch and fingerprint mismatch fail closed
- missing admission packet/operator/evidence/readback/revert contract refs fail closed
- contract key mismatches fail closed
- client approval fields remain intent-only
- runtime bridge is never called while execution is non-admitted
- execution remains blocked even when approval and contract evidence look ready
- no scene/prefab/entity mutation is performed in blocked paths

## Future proof-only admission PR requirements
A later proof-only runtime PR may proceed only if:
- this decision design is merged
- exact corridor name and boundary are explicit in title/body
- default behavior remains fail-closed/off
- runtime call path is bounded to one exact target envelope
- pre/post verification evidence is recorded and request-bound
- exact-scope revert path is implemented and tested
- operator explicitly approves the PR before merge

## What remains blocked
- broad placement runtime execution
- broad bridge mutation command execution
- arbitrary entity selection or mutation scope
- material/prefab broad mutation
- provider generation
- Blender execution
- Asset Processor execution
- client-side authorization claims

## PR sequencing
- This PR: admission-decision design only
- Next PR: bridge-readiness evidence contract (read-only) for exact runtime command binding
- Later PR: proof-only exact corridor runtime call with post-verification + exact-scope revert
- Later PR: admission revisit based on multi-case evidence

## Recommendation
Keep placement runtime non-admitted. Continue with read-only bridge-readiness evidence contract before any proof-only runtime execution attempt.
