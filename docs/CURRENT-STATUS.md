# Current Status

Status date: 2026-04-26

This file is a human and agent handoff snapshot. It summarizes the latest
repository truth without replacing code, tests, runtime proof artifacts, or the
surface matrix.

## Source Of Truth Order

Use this order when status sources disagree:

1. Observed runtime behavior on the admitted path.
2. Targeted tests and proof harnesses.
3. Implementation code in runtime, planner, policy, catalog, and bridge layers.
4. `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`.
5. Phase checkpoint docs and roadmap notes.

## Mainline Baseline

At the time this status snapshot was updated, `main` includes PR #40:

- Merge commit: `8c44904ba18d66001c49b46232b8f65a308daaf5`
- PR title: `Add proof-only Camera scalar write harness`

Later PRs may supersede this snapshot. Future agents should check `git log`,
open PRs, and the latest proof docs before selecting a new slice.

## Active Capability Boundary

The repo is in Phase 8 editor component/property target-discovery work.

Current admitted editor/runtime truth:

- `editor.session.open` is admitted real for the verified `McpSandbox` wiring.
- `editor.level.open` is admitted real for the verified `McpSandbox` wiring.
- `editor.entity.create` is admitted real authoring inside the bounded proof
  path.
- `editor.component.add` is admitted real authoring for allowlisted components
  inside the bounded proof path.
- `editor.entity.exists` is admitted hybrid read-only.
- `editor.component.find` is admitted hybrid read-only live component target
  binding.
- `editor.component.property.get` is admitted hybrid read-only for explicit
  runtime-proven component ids and known property paths.
- a private proof-only Camera bool scalar write harness exists for exactly
  `Camera :: Controller|Configuration|Make active camera on activation? :: bool`.

Current non-admitted editor/property truth:

- `editor.component.property.list` remains proof-only.
- public `editor.component.property.write` remains unimplemented and
  unadmitted.
- Broad property discovery is not exposed through Prompt Studio, dispatcher,
  catalog, or `/adapters`.
- The proof-only Camera bool write harness is not exposed through Prompt
  Studio, dispatcher/catalog, or `/adapters`.
- Arbitrary Editor Python remains forbidden as a prompt surface.
- Asset, material, render, build, TIAF, and broad editor mutation remain outside
  the current property-write candidate work.

## Current Phase 8 Evidence

The Camera component is the first live-proven scalar write/restore proof target:

- PR #40 ran
  `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-scalar-write-proof`.
- The proof target was
  `Camera :: Controller|Configuration|Make active camera on activation? :: bool`.
- The proof read original `true`, wrote inverse `false`, read changed `false`,
  restored original `true`, and read restored `true`.
- Loaded-level prefab restore completed with `restored_and_verified`.
- Runtime proof JSON remained ignored/uncommitted.
- Public property writes remain unadmitted.

The Comment component remains blocked as a scalar/text write target:

- Property-tree discovery exposed an empty root path with `AZStd::string`
  metadata.
- `PropertyTreeEditor.get_value("")` succeeded at the API level.
- The returned live value was not scalar/text-like.
- No Comment write target was selected.
- Restore was verified in the proof packet.

Live proof evidence outranks docs, source guesses, and prefab-derived component
ids.

## Repo Hygiene Baseline

Preferred governance right now is low-friction:

- PRs are preferred.
- Human review is optional for low-risk docs and hygiene.
- Codex may self-merge low-risk PRs after validation.
- Human approval is still required for high-risk runtime, security, dependency,
  branch-protection, history-rewrite, destructive, or capability-broadening
  work.
- Force-pushing and deleting `main` are forbidden operating actions.

See `docs/REPOSITORY-OPERATIONS.md` and
`docs/BRANCH-AND-PR-HYGIENE.md`.

## Recommended Next Packets

1. Decide whether the exact PR #40 Camera bool proof should remain proof-only
   or become the basis for a separate, narrow, operator-approved public
   admission packet.
2. Produce a branch cleanup report before deleting any uncertain historical,
   checkpoint, promotion, or active proof branches.
3. Continue repository professionalization in small docs-only packets when the
   change does not alter runtime capability or GitHub settings.

Do not turn this file into a substitute for proof artifacts. Update it only
when mainline truth changes enough that future agents would otherwise be misled.
