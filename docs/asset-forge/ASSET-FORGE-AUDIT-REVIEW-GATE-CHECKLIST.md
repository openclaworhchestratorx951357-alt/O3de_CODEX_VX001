# Asset Forge Audit Review Gate Checklist

Status: active pre-merge gate
Scope: Asset Forge PR review workflow
Behavior impact: none (process and documentation only)

## Purpose

Enforce a repeatable pre-merge audit gate for every Asset Forge PR so fast
continuation can remain safe, bounded, and truthful.

This checklist is mandatory when Asset Forge files or behavior are touched.

## When this checklist is required

Run this checklist when a PR changes one or more of these areas:

- `docs/asset-forge/*`
- `agents/asset-forge-audit-agent/*`
- `backend/app/models/asset_forge.py`
- `backend/app/services/asset_forge.py`
- `backend/app/api/routes/asset_forge.py`
- `backend/tests/*asset_forge*`
- frontend Asset Forge UI surfaces

## Codex Flow Trigger Suite handling

- The local watcher/relay/hotkey/trigger/queue helper files are operator
  workflow helpers.
- Do not delete those local helpers.
- Do not commit those local helpers unless a separate productization PR is
  explicitly requested.
- Do not confuse those local helpers with repository source-of-truth files.

## Gate 1: PR metadata check

Confirm:

- correct PR number and repository
- expected base branch
- expected head branch
- expected head SHA (if provided by operator)
- mergeability state
- draft/open state recorded in report

If head SHA changed from the expected reviewed SHA, stop and re-review.

## Gate 2: diff scope and runtime classification

Classify the PR as one of:

- docs-only
- frontend-only
- backend read-only/gating metadata
- proof-only mutation
- broad mutation (must not merge)

Confirm whether runtime behavior changes.

## Gate 3: risky-pattern scan

Search changed backend code for at least:

- `shutil.copy`
- `copy2`
- `open(`
- `"w"`
- `write_text`
- `mkdir`
- `rename`
- `replace`
- `unlink`
- `subprocess`
- `get_bridge_status`
- `Asset Processor`
- `approval_state == "approved"`
- `authorization_granted=True`
- `execution_performed=True`
- `write_executed=True`
- `project_write_admitted=True`

Classify each match:

- harmless text/normalization
- read-only
- dry-run only
- proof-only mutation
- broad mutation / unsafe

## Gate 4: mutation truth table (required output)

Every Asset Forge PR review must include this truth table:

| Surface | Current status in this PR | Evidence (file/test) | Risk | Merge posture |
| --- | --- | --- | --- | --- |
| provider generation |  |  |  |  |
| Blender execution |  |  |  |  |
| O3DE stage-write |  |  |  |  |
| placement execution |  |  |  |  |
| Asset Processor execution |  |  |  |  |
| runtime bridge calls |  |  |  |  |
| material mutation |  |  |  |  |
| prefab mutation |  |  |  |  |
| source-product-cache mutation |  |  |  |  |
| arbitrary file write |  |  |  |  |
| arbitrary shell/script execution |  |  |  |  |

## Gate 5: validation

Run applicable checks and record results.

Minimum for docs-only:

- `git diff --check`
- `git diff --cached --check`

For backend/frontend Asset Forge behavior changes:

- `python -m pytest backend/tests -k "asset_forge or approval" -q`
- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `git diff --check`

## Gate 6: hard blockers (auto request-changes)

Do not merge if any are true:

- client fields directly authorize execution
- broad mutation is introduced
- proof-only corridor broadened without exact gates and tests
- traversal/outside-root/overwrite/hash/session fail-closed checks are missing
- revert/readback evidence is missing for proof-only writes
- PR is too large to classify safely

## Gate 7: final recommendation

Review output must end with one recommendation:

- approve
- keep draft
- request changes
- split PR
- revert candidate

Also state whether the PR is safe to merge now.

## Next-slice rule after merge

After each merged Asset Forge PR:

- choose one narrow next slice
- keep default fail-closed posture
- do not widen mutation without an explicit audited packet
