# Next App-wide Unlock Packet

## Recommendation
Validation intake endpoint-candidate exact public-admission contract.

## Why this is next
- Capability, audit, evidence timeline, approval/session, and workspace-status
  shells now exist.
- Validation intake endpoint-candidate dry-run implementation, audit/review
  hardening, and admission-decision posture are now documented.
- The next safest move is a contract packet that defines exact public wording,
  non-goals, and evidence gates required before any future read-only admission
  update.

## Scope
- docs-focused contract packet (no runtime admission broadening)
- define exact allowed public corridor wording for endpoint-candidate state
- define explicit refusal/non-goal wording for out-of-corridor requests
- define minimum evidence gates required before read-only admission update
- no execution or mutation admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- contract wording is explicit, narrow, and testable against current behavior
- matrix/readiness wording remains aligned with code/test truth
- dispatch path for `validation.report.intake` remains unadmitted
- no mutation/execution admission changes
- next required implementation gate is clearly identified and bounded

## Alternative considered
Flow Trigger Suite productization plan.

This remains valid, but the exact validation-intake public-admission contract
should land first so workflow automation planning inherits explicit capability
truth boundaries.
