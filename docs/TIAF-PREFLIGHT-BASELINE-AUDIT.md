# TIAF Preflight Baseline Audit

Status: baseline audit only (no runtime execution admission change)

## Purpose

Establish current truth for the `test.tiaf.sequence` preflight corridor and
confirm that execution remains non-admitted.

## Scope

- audit existing TIAF preflight behavior and evidence shape
- confirm fail-closed/non-executing posture
- record what remains blocked before any CI/test execution admission revisit

## Truth Sources Reviewed

1. Runtime adapter and capability registration:
   - `backend/app/services/adapters.py`
2. API and dispatch coverage:
   - `backend/tests/test_api_routes.py`
   - `backend/tests/test_dispatcher.py`
   - `backend/tests/test_prompt_control.py`
3. Existing capability maps:
   - `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`
   - `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`

## Baseline Findings

- `test.tiaf.sequence` exists as an admitted real plan-only/preflight corridor.
- The bounded path records request and runner-preflight evidence and uses
  `inspection_surface=tiaf_runner_preflight`.
- TIAF sequence execution itself remains non-admitted; preflight truth explicitly
  states no sequence execution was attempted.
- The corridor remains fail-closed for missing/mismatched project context.

## Validation Evidence

Commands run:

- `python -m pytest backend/tests/test_api_routes.py -k "prompt_capabilities_reports_test_tiaf_sequence_as_plan_only" -q`
- `python -m pytest backend/tests/test_dispatcher.py -k "test_test_tiaf_sequence_uses_real_preflight_substrate_in_hybrid_mode" -q`
- `git diff --check`

Result summary:

- targeted TIAF preflight capability and substrate tests passed
- diff checks passed

## Capability Maturity Movement

- capability: `TIAF/preflight`
- old maturity: `needs baseline`
- new maturity: `preflight-only baseline established (plan-only, non-executing)`

## What Remains Blocked

- real TIAF sequence execution admission
- broad CI/test execution admission
- mutation-capable behavior through TIAF test surfaces

## Recommended Next Packet

CI admission design packet:

- define bounded allowlist, timeout, provenance, and refusal gates for any
  future execution-admission candidate
- keep execution admission blocked until explicit operator-approved evidence
  gates are satisfied
