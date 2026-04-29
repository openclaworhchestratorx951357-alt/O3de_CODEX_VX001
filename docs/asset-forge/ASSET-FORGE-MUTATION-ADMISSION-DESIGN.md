# Asset Forge Mutation Admission Design

## Status
Design-only. No mutation admitted by this document.

## Current merged baseline
- #139 docs/spec pack
- #140 frontend GUI/editor shell
- #141 backend read-only/status/preflight/proof-index scaffolding
- #142 server-owned approval/session substrate
- #143 server-owned approval enforcement evaluation
- #144 mutation-admission design

## First candidate corridor
Name:
`asset_forge.o3de.stage_write.v1`

Purpose:
Stage one already-prepared source asset plus one Forge provenance manifest into a bounded O3DE generated-assets folder.

## Why this corridor first
`asset_forge.o3de.stage_write.v1` is the narrowest first mutation candidate because it can be constrained to deterministic file paths and exact file hashes before any runtime-side execution behavior is considered.

It is narrower than:
- provider generation: introduces external execution, cost/provenance variance, and non-local outputs
- Blender execution: introduces script/tool execution and broader file handling surfaces
- placement: introduces runtime/editor mutation and bridge execution risk
- material mutation: broad graph/property mutation with larger rollback scope
- prefab mutation: wider scene/prefab graph mutation risk
- Asset Processor execution: additional runtime pipeline execution and product-cache side effects

## Exact allowed future scope
The future corridor may only consider:
- one source asset
- one provenance manifest
- one bounded staging root
- no overwrite by default
- no delete
- no directory traversal
- no arbitrary path
- no generated cache/product writes
- no Asset Processor execution
- no placement
- no material/prefab mutation

## Required server-side gates
- server-owned approval session exists
- session not expired
- session not revoked/rejected
- operation scope exactly matches `asset_forge.o3de.stage_write.v1`
- request fingerprint matches
- staging root is allowlisted
- destination path is inside staging root after normalization
- source file exists in allowed runtime/export area
- source file hash matches approval request
- provenance manifest hash matches approval request
- no overwrite unless explicit future overwrite corridor exists
- operator note present
- review packet references the exact asset/candidate
- rollback/revert plan exists before execution

## Required proof artifacts before execution
- approval session record
- request fingerprint
- source file hash
- manifest hash
- destination plan
- normalized path proof
- no-overwrite proof
- pre-write dry-run report
- post-write readback plan
- rollback/delete plan for the exact files only

## Required tests before any future execution PR
Tests must prove:
- client `approval_state` does not authorize
- missing session fails closed
- expired session fails closed
- revoked session fails closed
- wrong operation fails closed
- fingerprint mismatch fails closed
- path traversal fails closed
- destination outside staging root fails closed
- overwrite attempt fails closed
- source hash mismatch fails closed
- manifest hash mismatch fails closed
- valid approval still stays blocked until a separate proof-only execution PR explicitly enables the exact corridor

## Future proof-only execution PR requirements
A later PR may implement proof-only stage-write only if:
- this design is merged
- tests above exist
- execution is behind an explicit server-side admission flag or capability gate
- execution writes only the exact approved files
- execution records evidence
- execution verifies post-write readback
- execution has a bounded revert/delete path
- PR title clearly says proof-only
- user explicitly approves that PR

## What remains blocked
- provider generation
- Blender execution
- placement runtime execution
- Asset Processor execution
- material mutation
- prefab mutation
- source-product-cache mutation
- arbitrary file write
- arbitrary script/shell execution
- broad project mutation

## PR sequencing
- This PR: design only
- Next PR: fail-closed test matrix / dry-run plan fields
- Later PR: proof-only stage-write corridor
- Later still: Asset Processor observation/readback
- Later still: placement design, not execution

## Decision
Recommendation:
Adopt `asset_forge.o3de.stage_write.v1` as the first candidate mutation corridor, but do not admit it yet.
