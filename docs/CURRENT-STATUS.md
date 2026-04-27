# Current Status

Status date: 2026-04-27

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

At the time this status snapshot was updated, `main` is:

```text
3916ec06cad4ababe4bb5c441b92c6fc3b434c17
```

The latest runtime/capability movement remains the completed Phase 8 Camera
bool write and restore corridor sequence. Later mainline work has been repo
hygiene, UI layout hardening, branch-purpose review, and future-thread
supervisor startup documentation.

Recent handoff-relevant packets:

- PR #71 fixed the Windows taskbar bottom safe area and clamped the Call an
  agent menu.
- PR #72 reviewed `feature/production-baseline-v1` and preserved it as an
  intentional production-baseline / historical archive candidate pending
  operator decision.
- PR #73 added the future-thread Supervisor Mode startup protocol.
- PR #74 refreshed this status handoff and selected Phase 9 asset readback
  baseline/current truth as the next safe normalized packet.
- PR #75 added the Phase 9 asset readback baseline/current-truth packet.
- PR #76 added the candidate-only Phase 9 asset readback discovery packet and
  selected `asset.source.inspect` product/dependency evidence readback as the
  next design target.
- PR #77 added the Phase 9 asset readback design packet for a future read-only
  `asset.source.inspect` product/dependency evidence corridor, while keeping
  implementation and public admission blocked pending readiness audit.
- PR #78 added the Phase 9 asset readback readiness audit and recorded that
  product/dependency evidence is not ready for implementation until an exact
  read-only substrate, mapping, and freshness model are identified.
- PR #79 added the Phase 9 asset readback substrate research packet and
  confirmed no repo-owned or operator-provided product/dependency substrate is
  available yet.
- PR #80 checkpointed Phase 9 product/dependency readback as blocked at the
  substrate gate until an operator provides an exact read-only project/cache
  substrate sample for audit.
- PR #81 selected Camera non-bool scalar readback as the next candidate-only
  Phase 8 read-only discovery direction without widening public prompts,
  writes, restore, property-list admission, schemas, or runtime code.
- PR #82 designed the future proof-only Camera non-bool scalar readback harness
  while preserving exact Camera bool write/restore admission boundaries.
- PR #83 audited that design as ready for a narrow proof-only implementation
  packet, but not ready for public prompt admission, public property-list
  admission, a write corridor, or a restore corridor.
- PR #84 implemented the proof-only Camera non-bool scalar readback scope in
  the private proof helper and future bridge setup path while preserving public
  prompt, write, restore, and property-list boundaries.

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
- the exact Camera bool property can now be inspected read-only through the
  admitted `editor.component.find` -> `editor.component.property.get` chain;
  the review states `read_only: true` and `write_occurred: false`.
- a private proof-only Camera bool scalar write harness exists for exactly
  `Camera :: Controller|Configuration|Make active camera on activation? :: bool`.
- one exact public, approval-gated Camera bool write corridor is admitted:
  `editor.component.property.write.camera_bool_make_active_on_activation`.
- one exact public, approval-gated Camera bool restore corridor is admitted:
  `editor.component.property.restore.camera_bool_make_active_on_activation`.
  It restores only the exact Camera bool path from recorded bool before-value
  evidence and does not claim generalized undo.
- the exact Camera bool corridor review/status output names the capability,
  same-chain target entity, Camera component, property path,
  before/requested/after values, verification result, `content_write`
  admission class, restore guidance, and `generalized_undo_available: false`.
- the exact Camera bool restore review/status output separates
  `write_occurred` from `restore_occurred`: the restore corridor performs one
  bounded write of the recorded before value, but this does not admit generic
  property writes or generalized undo.
- `docs/PHASE-8-CAMERA-BOOL-OPERATOR-EXAMPLES.md` is the operator-facing
  prompt guide for safe readback, exact write, exact restore, and refused
  generic/broad requests.

Current non-admitted editor/property truth:

- `editor.component.property.list` remains proof-only.
- broad public `editor.component.property.write` remains unimplemented and
  unadmitted.
- Broad property discovery is not exposed through Prompt Studio, dispatcher,
  catalog, or `/adapters`.
- Only the exact Camera bool corridor may be exposed through Prompt Studio,
  dispatcher/catalog, and `/adapters`; no other property write is admitted.
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
- The exact Camera bool write corridor has a high-risk public-admission packet,
  but broad property writes remain unadmitted.
- The write public-admission packet reran the proof and produced ignored artifact
  `backend/runtime/live_editor_camera_scalar_write_proof_20260426-173312.json`
  with `status: succeeded_verified`, original `true`, proof write `false`,
  restored `true`, and cleanup restore `restored_and_verified`.

The Comment component remains blocked as a scalar/text write target:

- Property-tree discovery exposed an empty root path with `AZStd::string`
  metadata.
- `PropertyTreeEditor.get_value("")` succeeded at the API level.
- The returned live value was not scalar/text-like.
- No Comment write target was selected.
- Restore was verified in the proof packet.

Live proof evidence outranks docs, source guesses, and prefab-derived component
ids.

Camera non-bool scalar readback is implemented as a private proof-only path.
The proof path must exclude
`Controller|Configuration|Make active camera on activation?`, reject bool-like
Camera candidates, keep public property listing blocked, keep writes blocked,
keep restore admission blocked, and return a precise Camera non-bool blocker if
no non-bool scalar candidate is live-proven.

Live Camera non-bool proof evidence remains pending. At the checkpoint after PR
#84, backend readiness was available and the configured project/engine/editor
paths existed, but the Editor bridge heartbeat was stale and the runner process
was inactive. No live proof command was run and no runtime proof JSON was
committed.

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

Future phase work should also start from
`docs/CODEX-PROJECT-WORKFLOW-QUICK-REFERENCE.md` and
`docs/NORMALIZED-PHASE-WORKFLOW.md` so every phase follows the same
evidence-based promotion pattern before capability admission.

The completed Phase 8 Camera bool corridor sequence is checkpointed in
`docs/PHASE-8-CAMERA-BOOL-CORRIDOR-CHECKPOINT.md`. Future threads should treat
that checkpoint as the concise handoff for the exact Camera bool corridor and
the first normalized-phase reference example.

Rollback and restore expectations for the exact Camera bool corridor are
designed in `docs/PHASE-8-CAMERA-BOOL-ROLLBACK-RESTORE-DESIGN.md`. That design
does not implement rollback, generalized undo, or any wider write surface.

The restore readiness audit is recorded in
`docs/PHASE-8-CAMERA-BOOL-RESTORE-READINESS-AUDIT.md`. It was the readiness
gate before the explicitly approved proof-only restore harness and later public
restore admission packets.

The proof-only restore harness is recorded in
`docs/PHASE-8-CAMERA-BOOL-RESTORE-LIVE-PROOF.md`. It live-proved before value
`true`, inverse write `false`, restored value `true`, restored readback `true`,
and loaded-level cleanup restore `restored_and_verified`. Generic restore and
generalized undo remain unadmitted.

The restore admission decision is recorded in
`docs/PHASE-8-CAMERA-BOOL-RESTORE-ADMISSION-DECISION.md`. That decision kept
restore proof-only until explicit high-risk approval was granted for the exact
public restore corridor.

The exact public restore corridor is recorded in
`docs/PHASE-8-CAMERA-BOOL-RESTORE-PUBLIC-CORRIDOR.md`. It admits only
`editor.component.property.restore.camera_bool_make_active_on_activation` for
the exact Camera bool path, with recorded before-value evidence required.
The admission packet reran
`powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-bool-restore-proof`
and produced ignored artifact
`backend/runtime/live_editor_camera_bool_restore_proof_20260426-222106.json`
with before `true`, inverse write `false`, restored readback `true`, and
loaded-level cleanup restore `restored_and_verified`.

The restore review/status refinement is recorded in
`docs/PHASE-8-CAMERA-BOOL-RESTORE-REVIEW-STATUS.md`. It clarifies that
`write_occurred: true` in a restore review means only the bounded write of the
recorded before value on the exact Camera bool path; it does not admit generic
property writes.

## Recommended Next Packets

1. Treat Phase 9 product/dependency readback as blocked at the substrate gate
   unless an operator provides a concrete read-only project/cache substrate
   sample.
2. If such a sample is provided, create
   `codex/phase-9-asset-readback-substrate-audit` before any proof-only or
   implementation work.
3. If Phase 8 continues, make the Editor bridge heartbeat fresh and run only
   the proof-only Camera non-bool scalar target discovery command. Accept either
   a read-only non-bool candidate or a precise blocked result; do not widen
   writes, restore, property-list admission, or public prompts.
4. Produce a branch cleanup report before deleting any uncertain historical,
   checkpoint, promotion, or active proof branches.
5. Continue repository professionalization in small docs-only packets when the
   change does not alter runtime capability or GitHub settings.

Do not turn this file into a substitute for proof artifacts. Update it only
when mainline truth changes enough that future agents would otherwise be misled.
