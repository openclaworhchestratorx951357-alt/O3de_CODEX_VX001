# AI Asset Forge Placement Bridge-Readiness Contract Design

Status: design-only (no runtime admission change)

## Purpose

Define an explicit contract for placement bridge-readiness surfaces before any
placement-runtime admission discussion.

This packet documents scope, contract fields, fail-closed rules, and required
tests for a future readiness-audit packet.

## Current baseline

Current baseline is recorded in:

- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-BASELINE-AUDIT.md`
- `docs/asset-forge/ASSET-FORGE-PLACEMENT-PROOF-READINESS-MATRIX.md`
- `docs/asset-forge/ASSET-FORGE-PLACEMENT-PROOF-CONTRACT-GATES.md`
- `docs/asset-forge/ASSET-FORGE-PLACEMENT-HARNESS-LIVE-PROOF-CONTRACT-GATES.md`
- `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`

No placement-runtime corridor is currently admitted.

## Placement bridge-readiness surfaces (design scope)

- `POST /asset-forge/o3de/placement-evidence`
- `POST /asset-forge/o3de/placement-harness/prepare`
- `POST /asset-forge/o3de/placement-harness/execute`
- `POST /asset-forge/o3de/placement-harness/live-proof`

Maturity target in this packet: design-only contract hardening.

Execution/mutation admission in this packet: none.

## Candidate contract shape (v1 design)

Future bridge-readiness checks should expose a bounded contract with:

- exact capability/corridor identifiers per endpoint
- explicit `read_only`/`mutation_occurred` invariants where applicable
- exact server-owned contract evidence references
- explicit bridge heartbeat/config preflight outcomes
- explicit fail-closed reason taxonomy
- explicit no-go boundary labels for non-admitted execution

## Required preconditions

Any future bridge-readiness implementation must fail closed unless all are true:

1. target staged source path remains allowlisted
2. target level path remains `Levels/*.prefab`
3. stage-write evidence/readback references are present and succeeded
4. server-owned admission/session references are present where required
5. revert statement contract key is present and matches expected exact scope
6. server approval/session evaluation is explicit and non-authorizing by default
7. no client-provided approval/session field is treated as authorization

## Fail-closed rules

A future bridge-readiness packet must fail closed when:

- required contract references are missing
- revert contract key is missing or mismatched
- bridge heartbeat/config checks are unknown or stale
- approval state is missing/invalid for the requested proof lane
- placement execution is not explicitly admitted by server-owned policy
- path normalization/allowlist checks fail

Fail-closed responses must keep:

- execution blocked
- mutation blocked
- no bridge mutation commands
- no provider/Blender/Asset Processor execution
- no broad scene/prefab/project mutation

## Design output expectations

Future bridge-readiness outputs should remain explicit and non-authorizing:

- `*_status` classification (`blocked`, `ready-for-...` where applicable)
- `fail_closed_reasons`
- `server_approval_evaluation`
- contract-evidence readiness booleans
- bridge readiness booleans
- `next_safest_step`
- explicit no-execution/no-mutation posture fields

## Boundary confirmations

This contract keeps blocked:

- generated-asset assignment execution
- placement runtime execution
- provider generation execution
- Blender execution
- Asset Processor execution
- broad level/prefab/project mutation

## Required tests for future readiness/implementation packets

Future packets should prove at minimum:

- missing contract references fail closed
- contract-key mismatch fails closed
- stale/missing bridge readiness fails closed
- non-authorizing client approval/session fields are ignored
- ready-looking contract outputs remain non-executing/non-mutating unless a
  separate admission packet exists

## What this packet does not do

- no backend/runtime code changes
- no new endpoint admission
- no placement runtime execution
- no mutation broadening

## Recommended next packet

Placement bridge-readiness readiness audit packet:

- classify ready vs missing gates against this contract design
- identify exact implementation touchpoints and no-touch boundaries
- keep placement runtime execution blocked and non-mutating
