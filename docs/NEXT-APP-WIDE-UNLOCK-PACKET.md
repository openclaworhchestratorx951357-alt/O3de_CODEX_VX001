# Next App-wide Unlock Packet

## Recommendation
Approval/session dashboard shell (frontend/static-fixture first).

## Why this is next
- Capability, audit, and evidence timeline shells now exist.
- Operators still need a dedicated truth surface for approval/session state that
  reinforces intent-only client fields and server-owned authorization.
- This improves safety clarity before any additional capability admission work.

## Scope
- frontend-only or docs+frontend shell
- static fixture first for approval/session lifecycle states
- explicit labels for intent-only client fields vs server authorization
- include links/gates to capability and evidence timeline context
- no backend execution admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- approval/session shell renders bounded lifecycle states with truthful labels
- UI explicitly separates client intent from server authorization
- no mutation/execution admission changes
- frontend tests/build/lint pass for touched files

## Alternative considered
Workspace status chips shell.

This remains valid, but approval/session clarity is recommended first to keep
all upcoming packet decisions fail-closed and auditable.
