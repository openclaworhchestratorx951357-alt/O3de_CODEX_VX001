# Asset Forge Post-145 Safety Audit

## Current main HEAD
`9f4a003add506a0294996291b14c328ea93e2506`

## Why this audit exists
Asset Forge moved quickly after PR #145 and crossed into proof-only mutation territory. PR #150 introduced proof-only stage-write execution, which is a real safety-boundary crossing even when intentionally narrow and gated.

## PR timeline after #145
| PR | Title | State | Merge commit | Claimed scope | Runtime behavior changed | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| #146 | Asset Forge stage-write admission-flag design | merged (closed, draft=true at merge) | `6676188a9cd9af8842ce85c5a153386d51c888b4` | Design doc + sequencing updates | No | Low |
| #147 | Asset Forge stage-write admission-flag design gate | merged (closed, draft=true at merge) | `4bdba31ed1eacbd728b3cfa1bdd0b9a9b710b258` | Backend admission-flag response metadata + fail-closed tests | Yes (gating metadata only) | Medium |
| #148 | Asset Forge stage-write admission evidence gate checks | merged (closed, draft=true at merge) | `5b1ecc7f6232af7dd6b431cda59473218821f623` | Server-owned admission evidence gate checks + tests | Yes (gating checks only) | Medium |
| #149 | Asset Forge stage-write proof contract gate checks | merged (closed, draft=true at merge) | `ec20d9b34a4b594217f1a89e2d6d3dd941f0aabd` | Proof contract gate checks + tests | Yes (gating checks only) | Medium |
| #150 | Asset Forge stage-write proof-only execution harness | merged (closed, draft=true at merge) | `81145427d1621526f09f21b948f4e9e2df8b749a` | Proof-only stage-write execution + post-write verification/revert + docs | Yes (proof-only mutation corridor) | High |
| #151 | Asset Forge stage-write readback bridge | closed unmerged (replaced) | n/a | First readback-bridge attempt branch | No (not merged) | Informational |
| #152 | Asset Forge stage-write readback bridge | merged | `ca157eeb967e5c1eac70ad4c516c4d0527e55598` | Read-only readback bridge summary after successful stage-write | Yes (read-only bridge behavior on success path) | Medium |
| #153 | Asset Forge placement proof readiness matrix | merged | `fa2af20e1e918c44244534ce3322e9ad4d9e69bc` | Placement proof dry-run fail-closed readiness fields + tests | Yes (placement-proof response contract) | Medium |
| #154 | Asset Forge placement proof admission flag gate | merged | `d448b1ec4956652fd4aa2bdb03ec4f5b7aa653cf` | Placement-proof admission-flag state model + fail-closed reasons | Yes (gating metadata only) | Medium |

Notes:
- PR #151 was closed unmerged/replaced by PR #152.
- PR #138 remains historical checkpoint/source material only.

## PR #150 special audit
- Did it enable proof-only stage-write execution?
  - Yes. The stage-write endpoint can execute a bounded write path when all gates pass.
- What exact files can it write?
  - One destination source asset file and one destination manifest file (`.forge.json`) for the same request scope.
- What destination root is allowed?
  - Configured `O3DE_TARGET_PROJECT_ROOT`, with normalized destination paths constrained to the allowlisted `Assets/Generated/asset_forge/` subtree.
- What gates are required before write?
  - Server approval/session evaluation, admission flag on, server-owned admission evidence, proof contract evidence (including exact revert scope), path/root/extension checks, no traversal, overwrite policy check, and source/manifest hash checks.
- Is default behavior fail-closed?
  - Yes. Default-off admission flag and failed gates keep `write_status=blocked` with non-admitted execution.
- Are path traversal, outside-root, overwrite, hash mismatch, wrong operation, expired session, revoked session, and missing session blocked?
  - Yes. Fail-closed checks and tests cover each of these conditions.
- Does it require server-owned approval/session?
  - Yes. Server-side approval/session evaluation is required and contributes fail-closed reasons.
- Does it require admission flag?
  - Yes. Stage-write execution requires explicit server-side admission flag enablement.
- Does it require evidence bundle/readback/revert plan?
  - Yes. Admission-evidence and proof-contract references are required when admission flag is on.
- Does it verify post-write hashes?
  - Yes. Post-write destination and manifest hashes are checked against expected values.
- Does it have exact-scope failure revert?
  - Yes. Failure path applies exact-scope revert/unlink only for the two expected staged files.

## Current mutation truth table
| Surface | Current status | Evidence | Risk | Next gate |
| --- | --- | --- | --- | --- |
| provider generation | Blocked | Provider status remains preflight-only/blocked | Low | Keep blocked until separate design/admission packet |
| Blender execution | Blocked | Blender status/inspect remain bounded; no execution admission | Low | Keep blocked |
| stage-write | Proof-only gated corridor exists | Stage-write corridor + fail-closed tests + proof-only execution code | High | Keep exact-scope gates; expand audit checks before any broadening |
| placement execution | Blocked | Placement proof/harness/live-proof return blocked/non-admitted | Medium | Bridge-readiness evidence contract before any runtime admission attempt |
| Asset Processor execution | Blocked in endpoints | Warnings/docs explicitly keep AP execution outside endpoint scope | Low | Keep blocked |
| runtime bridge calls | Read-only bridge summary only after successful stage-write | Stage-write readback bridge packet behavior | Medium | Keep bridge mutation calls blocked |
| material mutation | Blocked | No admitted material mutation corridor | Low | Keep blocked |
| prefab mutation | Blocked | Placement runtime remains blocked | Medium | Require explicit corridor design + proof + admission decision |
| source-product-cache mutation | Blocked | No admitted broad cache mutation corridor | Low | Keep blocked |
| arbitrary shell/script execution | Blocked | No admitted arbitrary execution surfaces in Asset Forge packet line | Low | Keep blocked |

## Revert options
- Keep current main and harden.
- Revert #150 and dependent readback/placement packets.
- Freeze new feature work until audit completes.

Exact revert sequence is not assumed here because dependency/ordering safety should be validated in a dedicated revert-plan PR.

## Recommendation
- Do not revert automatically.
- Do not continue blind.
- Keep Codex Flow Trigger Suite available, but require Audit Agent review before future merges.
- Continue only after the audit confirms PR #150 is bounded and tests are sufficient.
