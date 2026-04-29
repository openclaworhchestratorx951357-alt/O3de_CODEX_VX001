# CI/Test Execution Admission Design

Status: design-only (no runtime admission change)

## Purpose

Define the exact gates required before any execution-capable CI/test corridor
can be admitted beyond current plan-only and preflight-only validation paths.

## Current Baseline

Current validation truth remains:

- `backend.test.run` and `frontend.test.run` are admitted local workflow
  execution paths
- `test.tiaf.sequence` remains plan-only/preflight-only for admitted usage
- broad `real CI/test execution` admission remains unadmitted

Reference evidence:

- `.github/workflows/ci.yml`
- `docs/VALIDATION-MATRIX.md`
- `docs/TIAF-PREFLIGHT-BASELINE-AUDIT.md`
- `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`

## Proposed Admission Target (Future Packet, Not This One)

Future candidate:

- bounded execution-capable CI/test corridor for explicit named suites only
- explicit distinction between local workflow execution and admitted remote/app
  execution surfaces

This packet does not implement or admit that corridor.

## Required Admission Gates (All Required)

1. explicit approval class for execution-capable validation requests
2. exact allowlist of executable test families/suites
3. explicit timeout/termination policy with truthful failure labels
4. artifact/log provenance contract for executed suites
5. refusal semantics when required runtime/toolchain prerequisites are missing
6. no implicit mutation claims outside declared test side effects
7. no broadening of TIAF/Editor Python execution beyond approved corridor
8. regression proof that existing plan-only/preflight-only boundaries remain
   intact when gates are not met

## Required Refusal/Fallback Semantics

When any gate fails:

- fail closed
- return machine-readable refusal reasons
- preserve truthful non-executing status labels
- preserve existing plan-only/preflight-only behavior where applicable

## Required Evidence Before Any Admission Claim

- targeted backend tests for accepted vs refused execution requests
- regression tests proving TIAF preflight remains non-executing unless admitted
- regression tests proving unrelated capabilities remain unchanged
- artifact/log evidence contract tests
- updated matrix + operator guidance aligned to implemented truth

## Non-Goals In This Packet

- no runtime code changes
- no execution gate widening
- no mutation gate widening
- no CI workflow setting changes

## Recommended Next Packet

Completed by:

- `docs/FLOW-TRIGGER-SUITE-PRODUCTIZATION-PLAN.md`

Next after productization plan:

- Flow Trigger Suite audit-gate checklist packet.
