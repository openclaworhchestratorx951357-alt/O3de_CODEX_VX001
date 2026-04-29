# Next App-wide Unlock Packet

## Recommendation
App-wide Evidence Timeline shell (frontend/static-fixture first).

## Why this is next
- Capability and audit dashboard shells exist, and validation intake now has a
  contract + dry-run parser scaffold with fail-closed tests.
- The remaining operator gap is clear evidence chronology across domains.
- A timeline shell improves review/audit clarity without admitting execution.

## Scope
- frontend-only or docs+frontend shell
- static fixture first for cross-domain evidence events
- clear truth chips (`demo`, `plan-only`, `dry-run only`, `proof-only`,
  `admitted-real`)
- include Asset Forge and non-Asset-Forge domains
- no backend execution admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- timeline renders cross-domain evidence records with truthful maturity labels
- shell explicitly distinguishes simulated/demo vs admitted-real evidence
- no mutation/execution admission changes
- frontend tests/build/lint pass for touched files

## Alternative considered
Validation intake endpoint candidate design.

This remains valid, but evidence timeline visibility is recommended first so
future endpoint or admission packets can bind to clearer operator-facing
review context.
