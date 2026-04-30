# Audit Review Dashboard Truth Refresh + Status-Chip Linkage

Status: implemented (frontend fixture + shell truth linkage only)

## Purpose

Refresh audit review dashboard wording and row labels so the review surface
matches the shared status-chip taxonomy vocabulary.

## Scope

- refresh audit review fixture rows with explicit `statusTaxonomy` values
- update shell boundary labels to match non-authorizing operator truth
- add status-taxonomy mix card
- surface taxonomy chips on each audit row
- update targeted component tests for taxonomy-aligned wording
- keep shell display-only and non-executing

## Boundaries preserved

- no backend route changes
- no execution admission broadening
- no mutation admission broadening
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







