# Asset Forge Audit Agent

## Purpose
This audit agent exists because the Codex Flow Trigger Suite can keep continuation moving quickly with minimal pauses. That speed is useful, but it can outrun careful safety review unless a dedicated audit lane checks each Asset Forge PR against code and tests.

## Codex Flow Trigger Suite interaction
- The Codex Flow Trigger Suite may include local watcher, relay, hotkey, trigger, and queue files.
- These are operator workflow helpers.
- Do not delete them.
- Do not commit them unless a separate productization PR is explicitly requested.
- Do not confuse them with repo source.
- When they are active, the audit agent should increase checkpoint discipline.

## Current Asset Forge state
- PR #139 docs/spec pack merged.
- PR #140 frontend GUI/editor shell merged.
- PR #141 backend read-only/status/proof scaffolding merged.
- PR #142 server-owned approval/session substrate merged.
- PR #143 approval enforcement evaluation merged.
- PR #144 mutation-admission design merged.
- PR #145 stage-write dry-run fail-closed matrix merged.
- PRs #146 through #154 appear to have advanced additional stage-write/placement readiness work.
- PR #150 introduced proof-only stage-write execution for `asset_forge.o3de.stage_write.v1` and must be audited as high risk.

## Audit-agent operating loop
For each Asset Forge PR:
1. Fetch PR metadata.
2. List changed files.
3. Read code diff, not only PR body.
4. Run risky-pattern scan.
5. Check tests.
6. Produce mutation truth table.
7. Apply `ASSET-FORGE-AUDIT-REVIEW-GATE-CHECKLIST.md` and record gate pass/fail.
8. Approve only if claims match code/tests.
9. Request changes if a safety boundary is ambiguous.

## Risky-pattern scan
Search for:
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

For each match, classify:
- harmless text/normalization
- read-only
- dry-run only
- proof-only mutation
- broad mutation
- unsafe / needs changes

## Required validation commands
Use when applicable:
- `python -m pytest backend/tests -k "asset_forge or approval" -q`
- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `git diff --check`

## Merge recommendation standards
Approve docs-only PRs if clean.
Approve frontend-only PRs if UI truth labels are honest and frontend tests pass.
Approve backend read-only PRs if no mutation-capable behavior exists.
Treat proof-only mutation PRs as high risk and require exact gates.
Do not approve broad mutation.

## Stop/slowdown criteria
The audit agent should recommend pausing feature work if:
- broad mutation is introduced
- client approval becomes authorization
- runtime bridge calls appear without proof gates
- path traversal/overwrite/outside-root tests are missing
- revert/readback evidence is missing for proof-only writes
- PRs become too large to review safely
