# Next App-wide Unlock Packet

## Recommendation
Validation intake endpoint-candidate dispatch-boundary refusal probes packet.

## Why this is next
- Capability, audit, evidence timeline, approval/session, and workspace-status
  shells now exist.
- Validation intake endpoint-candidate dry-run implementation, audit/review
  hardening, admission-decision posture, exact public-admission contract,
  readiness checklist, decision-refresh posture, operator examples/refusal
  wording, and finalization decision posture are now documented.
- The next safest move is a refusal-probe packet focused on near-miss dispatch
  admission phrasing so wording boundaries stay stable under operator prompts.

## Scope
- docs+probe examples packet (no runtime admission broadening)
- add near-miss refused prompt examples for dispatch-admission claims
- verify refusal wording remains explicit about endpoint-candidate vs dispatch
- preserve dispatch-unadmitted and no-mutation/no-execution boundaries
- no execution or mutation admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- refusal probe outcomes are explicit and fail closed
- matrix/readiness wording remains aligned with code/test truth
- dispatch path for `validation.report.intake` remains unadmitted
- no mutation/execution admission changes
- next required packet remains clearly identified and bounded

## Alternative considered
Flow Trigger Suite productization plan.

This remains valid, but refusal probes should land first so workflow automation
planning inherits hardened dispatch-boundary wording guidance.
