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
de1f4204d68f0ecf74fd390b29ea061484680aaf
```

The latest runtime/capability movement is the Phase 9
`asset.source.inspect` project-general proof path, structured schema hardening,
admission decision, and operator-facing readiness/review packet implementation.
The existing narrow read-only surface remains active and now reports explicit
review guidance, but production-general public admission is still withheld. The
completed Phase 8 Camera bool write/restore corridor and readback-only Camera
far clip evidence remain admitted as previously recorded.

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
- PR #85 checkpointed live proof as pending because the bridge heartbeat was
  stale at that moment.
- PR #86 recorded the successful live proof-only Camera non-bool readback target
  and refreshed the bridge setup before scalar target discovery proofs.
- PR #87 audited the live-proven Camera far clip float target disposition and
  kept it readback-only unless a future design-only packet and explicit
  approval gate change that.
- PR #88 checkpointed the Camera far clip float target as discovered but not
  admitted, preserving readback-only status.
- PR #89 checkpointed the broader Phase 8 readback target map across admitted,
  readback-only, and blocked targets.
- PR #90 refreshed readback operator examples for known safe readback and
  refusal outcomes.
- PR #91 added the far clip prompt refusal guard recorded in
  `docs/PHASE-8-FAR-CLIP-PROMPT-REFUSAL-GUARD.md`. Natural operator requests
  to set or change Camera far clip stay on the existing
  `editor.candidate_mutation.unsupported` refusal path; far clip restore stays
  on `editor.restore.unsupported`.
- The Camera scalar prompt refusal guard is recorded in
  `docs/PHASE-8-CAMERA-SCALAR-PROMPT-REFUSAL-GUARD.md`. Natural operator
  requests to set or change Camera scalar properties such as field of view,
  near clip, far clip, or frustum width stay on the existing
  `editor.candidate_mutation.unsupported` refusal path unless they are the
  exact admitted Camera bool corridor.
- PR #93 merged that Camera scalar prompt refusal guard.
- The editor blocked-surface prompt refusal guard is recorded in
  `docs/PHASE-8-EDITOR-BLOCKED-SURFACE-PROMPT-REFUSAL-GUARD.md`. Editor-control
  requests to mutate render settings, build settings, TIAF state, or execute
  Python in the editor stay on `editor.candidate_mutation.unsupported` instead
  of planning only session/level setup.
- PR #95 merged that editor blocked-surface prompt refusal guard.
- The editor UI/script prompt refusal guard is recorded in
  `docs/PHASE-8-EDITOR-UI-SCRIPT-PROMPT-REFUSAL-GUARD.md`. Editor-control
  requests for in-editor Python/script execution, hotkeys, toolbar/click
  automation, selection, duplication, or renaming stay on
  `editor.candidate_mutation.unsupported`.
- PR #97 merged that editor UI/script prompt refusal guard.
- The editor state-toggle prompt refusal guard is recorded in
  `docs/PHASE-8-EDITOR-STATE-TOGGLE-PROMPT-REFUSAL-GUARD.md`. Editor-control
  requests for transform assignment, visibility/lock changes, component
  enable/disable, or entity activation/deactivation stay on
  `editor.candidate_mutation.unsupported`.
- PR #99 merged that editor state-toggle prompt refusal guard.
- PR #101 added the repo-wide workflow governor and future-thread Supervisor
  Mode startup contract.
- PR #102 audited the local `McpSandbox` Asset Processor database as the
  read-only Phase 9 product/dependency evidence substrate.
- PR #103 made the O3DE evidence substrate check mandatory before declaring
  blocked status.
- PR #104 added the bounded proof-only `asset.source.inspect` reader for
  project-local `Cache/assetdb.sqlite` product/dependency rows.
- PR #105 recorded the live proof against `McpSandbox`.
- PR #106 added safe/refused operator examples for the exact Phase 9 asset
  source/product/dependency readback corridor.
- PR #107 added prompt refusal coverage for unsafe Phase 9 asset execution,
  cache mutation, broad resolve, and source/product mutation intents.
- PR #108 through PR #114 extended Phase 9 with schema review, Asset Catalog
  substrate discovery, parser design, product-path presence implementation,
  live proof, and operator examples while keeping catalog work proof-only and
  read-only.
- PR #115 documented the Phase 9 production-generalization plan and made clear
  that `McpSandbox` and `BridgeLevel01` are proof targets, not production
  assumptions.
- PR #116 added the read-only project-general asset readback discovery helper
  for project root, `project.json`, `Cache`, `assetdb.sqlite`, platform
  catalogs, and source-asset readiness.
- PR #117 integrated O3DE AI Asset Forge into the Phase 9 roadmap as a planned
  private/O3DE-native production feature stream.
- PR #118 fixed Windows-style relative source path normalization on Linux/CI
  for the Phase 9 discovery helper.
- The current packet integrates project-general discovery into the proof-only
  `asset.source.inspect` source/product/dependency/catalog readback path and is
  recorded in
  `docs/PHASE-9-PROJECT-GENERAL-ASSET-SOURCE-INSPECT-PROOF.md`.
- The current schema-hardening packet promotes those structured proof fields
  into the published persisted payload schemas and is recorded in
  `docs/PHASE-9-ASSET-SOURCE-INSPECT-SCHEMA-HARDENING.md`.
- The current admission-decision packet keeps the existing narrow read-only
  `asset.source.inspect` surface active, but withholds production-general
  public admission pending freshness, platform, and operator readiness/review
  work. It is recorded in
  `docs/PHASE-9-ASSET-READBACK-ADMISSION-DECISION.md`.
- The current readiness-review contract packet defines the operator-facing
  review shape needed before any production-general Phase 9 admission. It is
  recorded in
  `docs/PHASE-9-ASSET-READBACK-READINESS-REVIEW-CONTRACT.md`.
- The current review packet implementation carries that contract into
  `asset.source.inspect` execution details and artifact metadata, including
  freshness labels, selected project/platform summaries, missing-substrate
  guidance, safest next step, mutation flags, and AI Asset Forge handoff
  placeholders. It is recorded in
  `docs/PHASE-9-ASSET-READBACK-REVIEW-PACKET-IMPLEMENTATION.md`.
- The current O3DE AI Asset Forge substrate audit selects TripoSR as the first
  proof-only local generation candidate and records license, hardware, storage,
  provenance, no-mutation, and O3DE import gates. It is recorded in
  `docs/AI-ASSET-FORGE-LOCAL-MODEL-SUBSTRATE-AUDIT.md`.
- The current O3DE AI Asset Forge local generation proof confirms TripoSR can
  generate one raw OBJ mesh outside the repo and outside O3DE projects. It is
  recorded in `docs/AI-ASSET-FORGE-LOCAL-GENERATION-PROOF.md`.
- The current O3DE AI Asset Forge cleanup/conversion proof confirms that the
  generated OBJ can be inspected, normalized to unit scale, and exported as a
  GLB outside the repo and outside O3DE projects. It is recorded in
  `docs/AI-ASSET-FORGE-CLEANUP-CONVERSION-PROOF.md`.
- The current O3DE AI Asset Forge import-readiness design defines the future
  generated source staging convention, provenance metadata, approval gates, and
  Phase 9 readback requirements. It is recorded in
  `docs/AI-ASSET-FORGE-O3DE-IMPORT-READINESS-DESIGN.md`.

Phase 9 product/dependency readback is no longer blocked on absence of a local
sample. It remains a local proof target and project-general proof-only readback
candidate, not a public production-general adapter. A read-only substrate audit
found
`C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\assetdb.sqlite` with source,
product, job, scan-folder, source-dependency, and product-dependency tables.
The audited sample maps
`Levels/BridgeLevel01/BridgeLevel01.prefab` to
`pc/levels/bridgelevel01/bridgelevel01.spawnable` with five bounded
product-dependency rows. A proof-only reader path now lets
`asset.source.inspect` inspect project-local `Cache/assetdb.sqlite` in
read-only mode for bounded product/dependency evidence when the requested source
exists under the project root. Live proof against `McpSandbox` confirmed the
BridgeLevel prefab maps to one spawnable product and five product-dependency
rows through read-only `assetdb.sqlite` inspection. Public product/dependency
completeness, Asset Processor execution, cache mutation, and
`asset.product.resolve` remain unadmitted. Operator-facing examples now define
safe and refused prompts for the exact read-only Phase 9 asset
source/product/dependency readback corridor. Production generalization is
tracked in `docs/PHASE-9-PRODUCTION-GENERALIZATION-PLAN.md`; the discovery
helper is tracked in `docs/PHASE-9-PROJECT-ASSET-READBACK-DISCOVERY.md`, and
the project-general `asset.source.inspect` proof is tracked in
`docs/PHASE-9-PROJECT-GENERAL-ASSET-SOURCE-INSPECT-PROOF.md`. The structured
schema hardening is tracked in
`docs/PHASE-9-ASSET-SOURCE-INSPECT-SCHEMA-HARDENING.md`. The admission decision
is tracked in `docs/PHASE-9-ASSET-READBACK-ADMISSION-DECISION.md`: do not
promote the corridor to production-general public admission yet. The
readiness/review contract is tracked in
`docs/PHASE-9-ASSET-READBACK-READINESS-REVIEW-CONTRACT.md`; it defines the
operator-facing fields for freshness, platform choice, missing-substrate
guidance, mutation flags, and AI Asset Forge validation handoff. The review
packet implementation is tracked in
`docs/PHASE-9-ASSET-READBACK-REVIEW-PACKET-IMPLEMENTATION.md`; the runtime
output now carries the review packet while preserving read-only/no-mutation
boundaries.
`docs/PHASE-9-ASSET-READBACK-CHECKPOINT.md` is the compact current checkpoint
for this Phase 9 state.

O3DE AI Asset Forge is now a planned production feature stream, but it is
architecture/planning only. No local model generation, generated asset import,
Asset Processor execution, generated-asset assignment, or entity placement is
admitted. The planned Forge pipeline depends on Phase 9 becoming the
project-general validation backbone for generated source assets: source
existence, product rows, dependency rows, Asset Catalog presence, and operator
review must be proven before generated assets can be treated as usable. The
Forge Phase 0 substrate audit selects TripoSR as the first proof-only local
generation candidate. Forge Phase 1 local generation proof now confirms TripoSR
can produce one raw OBJ outside the repo and outside O3DE projects, but no
generated asset exists in the repo and no O3DE import is admitted. Forge Phase
2 cleanup/conversion proof now confirms that the generated OBJ can be inspected,
normalized to unit scale, and exported as a GLB outside O3DE; import readiness
design now exists, but proof-only source staging still requires explicit
operator approval before any project mutation.

Later PRs may supersede this snapshot. Future agents should check `git log`,
open PRs, and the latest proof docs before selecting a new slice.

## Active Capability Boundary

The repo is in Phase 9 asset readback follow-through and Phase 8 editor
component/property target-discovery work.

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

At the checkpoint after PR #84, live Camera non-bool proof evidence was pending
because the Editor bridge heartbeat was stale and the runner process was
inactive.

The next live proof slice proved a Camera non-bool read-only target after
refreshing the project-local bridge setup. The selected target was:

```text
Camera :: Controller|Configuration|Far clip distance :: float
```

The proof read value preview `1024.0`, used component id provenance
`admitted_runtime_component_add_result`, kept `read_only: true`,
`write_occurred: false`, `write_admission: false`,
`restore_admission: false`, and `property_list_admission: false`, and restored
the loaded-level prefab boundary with `restored_and_verified`. Runtime proof
JSON remains ignored/uncommitted.

The current disposition is readback-only. Far clip is a valid future
write-candidate design target, but it is not admitted for public prompts,
public writes, public restore, or property listing. A future write path must
start with a separate design-only packet and explicit high-risk approval before
any public admission.

The far clip target is now being checkpointed as discovered-but-not-admitted.
That checkpoint does not add a public corridor; it preserves the readback-only
evidence and keeps the exact Camera bool path as the only admitted Camera
property write/restore surface.

The broader Phase 8 readback target map is checkpointed in
`docs/PHASE-8-READBACK-TARGETS-CHECKPOINT.md`. It keeps Camera bool as the only
admitted write/restore target, Mesh model asset as readback-only asset evidence,
Comment root string metadata as blocked scalar evidence, and Camera far clip as
readback-only discovered evidence.

Operator examples for the readback map are refreshed in
`docs/PHASE-8-READBACK-OPERATOR-EXAMPLES.md`. Those examples preserve far clip
as readback-only and keep generic writes, restore, property listing, and
arbitrary Editor Python refused.

The far clip prompt refusal guard is recorded in
`docs/PHASE-8-FAR-CLIP-PROMPT-REFUSAL-GUARD.md`. Natural far clip write wording
must refuse as `editor.candidate_mutation.unsupported`, and far clip restore
wording must refuse as `editor.restore.unsupported`.

The Camera scalar prompt refusal guard is recorded in
`docs/PHASE-8-CAMERA-SCALAR-PROMPT-REFUSAL-GUARD.md`. Natural Camera scalar
write wording must refuse as `editor.candidate_mutation.unsupported` unless it
targets the exact admitted Camera bool write corridor.

The editor blocked-surface prompt refusal guard is recorded in
`docs/PHASE-8-EDITOR-BLOCKED-SURFACE-PROMPT-REFUSAL-GUARD.md`. Editor-control
render setting, build setting, TIAF state, and in-editor Python execution
requests must refuse as `editor.candidate_mutation.unsupported`.

The editor UI/script prompt refusal guard is recorded in
`docs/PHASE-8-EDITOR-UI-SCRIPT-PROMPT-REFUSAL-GUARD.md`. Editor-control
hotkey, toolbar/click, script, selection, duplicate, and rename requests must
refuse as `editor.candidate_mutation.unsupported`.

The editor state-toggle prompt refusal guard is recorded in
`docs/PHASE-8-EDITOR-STATE-TOGGLE-PROMPT-REFUSAL-GUARD.md`. Editor-control
transform assignment, visibility, lock, component enable/disable, and entity
activation prompts must refuse as `editor.candidate_mutation.unsupported`.

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

The Phase 8 Camera bool corridor is exact and admitted, but local
`McpSandbox` Camera proof targets must not be treated as universal component
or property assumptions. A future optional packet,
`codex/phase-8-component-property-portability-audit`, should audit component
availability, property-path stability, type checks, and refusal behavior across
projects.

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

1. Open the next O3DE AI Asset Forge packet:
   `codex/ai-asset-forge-proof-only-o3de-source-staging`, an explicitly
   approved mutation packet to copy exactly one generated GLB and provenance
   metadata file into the sandbox generated-assets folder without running Asset
   Processor, assigning, or placing the asset.
2. Keep Phase 9 product/dependency readback read-only until any later
   production-general admission packet proves exact source mapping, bounded
   entries, freshness provenance, discovery readiness, review output, and
   fail-closed unavailable behavior. Do not run Asset Processor or mutate
   cache/source files.
3. If Phase 9 continues before Forge, consider a production-general public
   admission revisit packet only after reviewing live output from multiple
   project/source/platform cases.
4. If Phase 8 continues without explicit write approval, select another
   already-allowlisted read-only target discovery candidate or add narrow
   refusal/readback examples for a documented gap. Do not widen writes,
   restore, property-list admission, or public prompts without a separate
   approval gate.
5. Produce a branch cleanup report before deleting any uncertain historical,
   checkpoint, promotion, or active proof branches.
6. Continue repository professionalization in small docs-only packets when the
   change does not alter runtime capability or GitHub settings.

Do not turn this file into a substitute for proof artifacts. Update it only
when mainline truth changes enough that future agents would otherwise be misled.
