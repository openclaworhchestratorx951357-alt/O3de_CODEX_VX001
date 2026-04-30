# App Capability Dashboard Truth Refresh + Status-Chip Linkage

Status: implemented (frontend fixture + shell truth linkage only)

## Purpose

Refresh app capability dashboard wording and labels so they align with the
shared status-chip taxonomy used by approval/session and evidence timeline
shells.

## Scope

- refresh capability dashboard fixture rows to include status taxonomy
- add status-taxonomy mix card in capability dashboard shell
- extend table with status taxonomy and recommended packet fields
- tighten boundary chips:
  - static fixture only
  - server-owned authorization truth
  - client fields are intent-only
  - no execution admission broadening
  - no mutation corridor broadening
- update targeted component test assertions
- keep runtime admission unchanged

## Boundaries preserved

- no backend route changes
- no execution admission changes
- no mutation admission changes
- no provider/Blender/Asset Processor/placement execution changes
- no client fields treated as authorization

## Validation

- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `git diff --check`
- `git diff --cached --check`

## Recommended next packet

Asset Forge placement runtime-admission release-readiness decision
(`codex/ai-asset-forge-placement-runtime-admission-release-readiness-decision`).







