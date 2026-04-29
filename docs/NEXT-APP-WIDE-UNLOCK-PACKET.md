# Next App-wide Unlock Packet

## Recommendation
App-wide Capability Dashboard shell.

## Why this is next
- It gives operators one truthful view of what is real, demo-only, plan-only, dry-run, proof-only, or admitted.
- It reduces risk of accidental overclaim while feature lanes accelerate.
- It applies the Asset Forge audit discipline across non-Asset-Forge domains before more execution surfaces are proposed.

## Scope
- frontend-only or docs+frontend
- static fixture first
- include Asset Forge and non-Asset-Forge domains
- render maturity labels and risk badges
- no backend mutation
- no execution admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- UI shows domain + capability + maturity + risk clearly
- labels distinguish real vs demo vs plan-only vs proof-only
- docs describe fixture source and truth boundaries
- frontend tests cover label rendering and blocked-state messaging

## Alternative considered
Editor Authoring Review/Restore Lane baseline audit.

This remains valid, but the dashboard shell is recommended first because it strengthens operator visibility across all domains before additional capability unlock packets.
