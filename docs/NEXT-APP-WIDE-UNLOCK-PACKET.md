# Next App-wide Unlock Packet

## Recommendation
Validation intake endpoint-candidate admission design (docs/design first).

## Why this is next
- Capability, audit, evidence timeline, approval/session, and workspace-status
  shells now exist.
- The remaining visibility gap is no longer UI shell coverage; it is the exact
  admission design for `validation.report.intake`.
- Defining the endpoint-candidate gate now keeps future implementation
  fail-closed and auditable.

## Scope
- docs-first or docs+targeted backend contract design only
- define endpoint registration/admission gates for `validation.report.intake`
- preserve dry-run parser boundary and fail-closed defaults
- define explicit refusal reasons for unadmitted execution paths
- no backend execution admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- design names exact old maturity -> new maturity target
- design keeps endpoint unadmitted by default
- design preserves server-owned authorization and intent-only client fields
- no mutation/execution admission changes
- docs checks pass (and targeted tests only if touched)

## Alternative considered
Flow Trigger Suite productization plan.

This remains valid, but validation-intake admission design is recommended first
to avoid ambiguous endpoint expansion while broader automation planning continues.
