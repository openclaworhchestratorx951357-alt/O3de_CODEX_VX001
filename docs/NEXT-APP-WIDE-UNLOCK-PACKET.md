# Next App-wide Unlock Packet

## Recommendation
Workspace status chips shell (frontend/static-fixture first).

## Why this is next
- Capability, audit, evidence timeline, and approval/session shells now exist.
- Operators still need compact workspace-level truth chips that summarize
  maturity/risk/session posture across desks without opening each dashboard.
- This improves day-to-day supervision before any additional capability
  admission work.

## Scope
- frontend-only or docs+frontend shell
- static fixture first for cross-workspace status and maturity chips
- explicit labels for `demo`, `plan-only`, `dry-run only`, `proof-only`,
  `admitted-real`, and `blocked`
- include links/gates to capability, evidence, and approval/session context
- no backend execution admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- workspace shell renders truthful status chips without claiming execution
- UI links chip labels to existing dashboard evidence context
- no mutation/execution admission changes
- frontend tests/build/lint pass for touched files

## Alternative considered
Validation intake endpoint-candidate admission design.

This remains valid, but status chips are recommended first to reduce operator
ambiguity before any endpoint admission packet is considered.
