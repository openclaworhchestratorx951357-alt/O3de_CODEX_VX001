# CI/Test Execution Admission Design

Status: design-only (no runtime admission change)

## Purpose

Define bounded admission requirements for any future CI/test execution corridor
while preserving current fail-closed and non-admitted execution posture.

## Current Baseline

- `validation.report.intake` remains a dry-run endpoint candidate behind a
  server-owned default-off gate.
- local developer workflows already run backend/frontend tests manually through
  repo scripts and are not a new public execution capability.
- broad CI/test execution admission is still blocked.

## Capability Maturity Movement

- capability: `real CI/test execution`
- old maturity: `needs baseline`
- this packet maturity result: `design-gated baseline established`
- admission result: not granted

## Proposed Future Corridor (Design Only)

If a future packet seeks CI/test execution admission, it must remain bounded to
an explicit allowlist and fail closed for everything else.

Candidate command families:

- backend test command family (`pytest` through repo-owned wrappers)
- frontend test command family (`npm test`/`npm run test` through repo-owned
  wrappers)
- optional TIAF preflight/readiness checks only (no broad runtime mutation)

No arbitrary shell, no arbitrary Python, and no arbitrary external command
execution is included in this design.

## Required Admission Gates

Any future implementation/admission packet must satisfy all gates:

1. explicit server-owned admission toggle with default-off behavior
2. strict command allowlist with no free-form command execution
3. exact workspace-root and path-boundary enforcement
4. timeout ceilings with fail-closed timeout status
5. structured execution provenance (command, args, cwd, timestamps, exit code)
6. explicit refusal taxonomy for unsupported/malformed/excessive requests
7. reviewable artifact policy (bounded logs, no secret-bearing payload echo)
8. explicit revert/disable path for the admission flag and runner routing
9. targeted refusal/acceptance tests and audit evidence

Failure at any gate keeps execution admission blocked.

## Safety Constraints

This design does not admit:

- broad or arbitrary CI command execution
- provider/Blender/Asset Processor execution
- project mutation through CI capability surfaces
- client-provided approval/session fields as authorization

## Evidence Required Before Any Admission Revisit

- allowlist/refusal tests for accepted and blocked command families
- timeout and cancellation behavior tests
- provenance artifact schema checks
- fail-closed regression checks against existing dispatch boundaries
- operator-facing audit/review packet with explicit risk verdict

## Recommended Next Packet

TIAF preflight baseline audit:

- establish explicit non-executing preflight baseline and evidence fields
- align TIAF preflight posture with this CI admission design
- keep execution admission blocked pending explicit future approval
