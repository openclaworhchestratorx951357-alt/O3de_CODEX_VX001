# Asset Forge Audit Run - PR #150

Status: completed checklist run
Target PR: #150 `Asset Forge stage-write proof-only execution harness`
Audit basis: `docs/asset-forge/ASSET-FORGE-AUDIT-REVIEW-GATE-CHECKLIST.md`

## Why this run exists

This is the first durable post-checklist audit run on the highest-risk
post-145 transition: PR #150, where stage-write moved from dry-run-only to an
exact-scope proof-only mutation corridor.

## Gate 1 - PR metadata check

Verified from GitHub:

- PR number: `#150`
- state: `closed`
- merged: `true`
- draft at merge: `true`
- base: `main`
- head: `codex/asset-forge-stage-write-proof-only-harness`
- head SHA: `7c933b89a69f5ce99b674a5c4bd23f3c171bcbb1`
- merge commit SHA: `81145427d1621526f09f21b948f4e9e2df8b749a`

Changed files in PR #150:

- `backend/app/services/asset_forge.py`
- `backend/tests/test_api_routes.py`
- `docs/asset-forge/ASSET-FORGE-STAGE-WRITE-ADMISSION-FLAG-DESIGN.md`
- `docs/asset-forge/ASSET-FORGE-STAGE-WRITE-DRY-RUN-MATRIX.md`
- `docs/asset-forge/ASSET-FORGE-STAGE-WRITE-PROOF-ONLY-EXECUTION.md`
- `docs/asset-forge/README.md`

## Gate 2 - diff scope and runtime classification

Classification: `proof-only mutation` (high risk)

Reason:

- PR #150 introduced exact-scope write execution in
  `backend/app/services/asset_forge.py` only when all server-owned gates pass.
- Default and failed-gate behavior remains fail-closed (`write_status=blocked`,
  no project writes).

## Gate 3 - risky-pattern scan

Risky pattern matches were reviewed in current `main` code:

- `shutil.copy2` present at stage-write execution site
- `mkdir` present for destination parent creation
- `write_bytes` present for manifest emission
- `unlink` present in exact-scope failure revert
- `write_executed` / `project_write_admitted` true states exist only on admitted execution paths

Pattern findings not present on stage-write path:

- no `subprocess` execution for stage-write
- no `get_bridge_status` mutation call in stage-write flow
- no arbitrary path write surface

Execution admission gate location:

- `backend/app/services/asset_forge.py:1677-1696`

Exact write/revert logic location:

- write begin: `backend/app/services/asset_forge.py:1715`
- copy/write operations: `backend/app/services/asset_forge.py:1726-1730`
- post-write hash checks: `backend/app/services/asset_forge.py:1731-1738`
- exact-scope revert on mismatch/failure: `backend/app/services/asset_forge.py:1821-1833`, `1846-1857`

## Gate 4 - mutation truth table

| Surface | Current status | Evidence | Risk | Merge posture |
| --- | --- | --- | --- | --- |
| provider generation | blocked | `backend/app/services/asset_forge.py:1126-1140` (`generation_execution_status="blocked"`) | low | keep blocked |
| Blender execution | blocked/preflight-only | `backend/app/services/asset_forge.py:1158-1162`, `1311-1333`, `1336-1360` | low | keep blocked |
| O3DE stage-write | proof-only exact-scope gated mutation | `backend/app/services/asset_forge.py:1677-1730`, `1875-1917`; tests `backend/tests/test_api_routes.py:1216-1339` | high | allowed only with all gates true |
| placement execution | blocked/dry-run-only | `backend/app/services/asset_forge.py:2443-2446`, `2468-2470` | medium | keep blocked |
| Asset Processor execution | blocked in endpoint behavior | `backend/app/services/asset_forge.py:1945-1950` | low | keep blocked |
| runtime bridge calls | read-only ingest readback evidence call only | `backend/app/services/asset_forge.py:1759-1787`, `1929-1950` | medium | keep read-only |
| material mutation | blocked | no admitted material mutation corridor in stage-write flow; fail-closed posture retained | low | keep blocked |
| prefab mutation | blocked | placement proof path remains blocked/dry-run-only | medium | keep blocked |
| source-product-cache mutation | blocked as broad surface | no broad cache mutation corridor admitted in stage-write path | low | keep blocked |
| arbitrary file write | not admitted | writes constrained to exact stage+manifest scope under gate checks | high | do not broaden |
| arbitrary shell/script execution | blocked | no admitted arbitrary shell/script surface in stage-write flow | low | keep blocked |

## Gate 5 - validation

Current replay validation run:

- `python -m pytest backend/tests -k "asset_forge and stage_write" -q`
- Result: `22 passed`

Checklist integrity checks for this packet:

- `git diff --check`
- `git diff --cached --check`

## Gate 6 - hard blockers check

Hard-blocker findings: none for this historical PR under current code truth.

Residual risk (explicit):

- stage-write is a real proof-only mutation corridor when all gates pass.
- this remains a safety-boundary crossing and must stay under mandatory audit
  review for all follow-up PRs.

## Gate 7 - recommendation

Recommendation: `approve-as-bounded-history`

Interpretation:

- PR #150 is acceptable as a high-risk proof-only corridor transition because
  gate checks, fail-closed defaults, exact-scope constraints, and targeted tests
  are present.
- Any future stage-write broadening must be treated as high-risk and must pass
  this checklist before merge.

## Safety verdict

- Default behavior remains fail-closed when gates are not satisfied.
- Client approval fields remain intent-only and are not authorization.
- Placement/provider/Blender/Asset Processor broad execution remains blocked.

## Next recommended slice

Run the same checklist as a second audit pass on PRs `#152`, `#153`, and `#154`
(to verify readback/placement-proof follow-on packets did not broaden mutation
beyond their declared boundaries).
