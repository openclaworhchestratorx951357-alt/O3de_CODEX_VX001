# Operator Editor Runtime Proof Checklist

## Purpose

This checklist records the operator-facing proof path used to confirm the
currently admitted editor-runtime boundary on the canonical local backend.

It is intentionally narrow.

It proves only:
- `editor.session.open`
- `editor.level.open`
- `editor.entity.create`
- `editor.component.add`
- `editor.component.property.get`

It also records a separate direct read-only proof for `editor.entity.exists`.
That proof covers only session attach, level open, and exact entity-name
existence readback on the loaded/current level.

It does not widen into arbitrary Editor Python, arbitrary components, arbitrary
property writes, delete, parenting, prefab, material, asset, render, or build
behavior.

## Current admitted scope

On the current verified local target wiring:
- `editor.session.open` is admitted real-authoring.
- `editor.level.open` is admitted real-authoring.
- `editor.entity.create` is admitted real-authoring through the persistent
  bridge-backed path.
- `editor.entity.exists` is admitted hybrid read-only only for exactly one
  explicit entity id or exact entity name on the loaded/current level.
- `editor.component.add` is admitted real-authoring only for explicit entity id
  plus allowlisted component attachment.
- `editor.component.property.get` is admitted hybrid read-only only for explicit
  component id plus explicit property path.

Current editor-authoring boundary:
- requires an admitted editor session.
- requires a loaded/current level match.
- selects a non-default sandbox/test level when the proof can prove one.
- allows only root-level named entity creation for `editor.entity.create`.
- allows only explicit id or exact-name entity existence readback for
  `editor.entity.exists`; ambiguous exact-name lookup is not a successful
  selected match.
- allows only the proof's allowlisted `Mesh` attachment case for
  `editor.component.add`.
- allows only `Controller|Configuration|Model Asset` readback for the proof's
  composed property-get verification.
- rejects broader property mutation, arbitrary component/property mapping,
  delete, parenting, prefab work, material work, asset work, render work, build
  work, and arbitrary Editor Python.

Current verified target wiring:
- project root:
  `C:\Users\topgu\O3DE\Projects\McpSandbox`
- engine root:
  `C:\src\o3de`
- editor runner:
  `C:\Users\topgu\O3DE\Projects\McpSandbox\build\windows\bin\profile\Editor.exe`

Canonical local backend proof path:
- backend bind:
  `127.0.0.1:8000`
- lifecycle wrapper:
  `scripts/dev.ps1 live-proof`
- proof helper:
  `backend/runtime/prove_live_editor_authoring.py`

## Preconditions

Before treating the proof as evidence, confirm all of the following. The
repo-owned lifecycle wrapper can start the canonical backend and can launch the
canonical McpSandbox Editor bridge when no canonical `Editor.exe` is already
running, but these are still required proof truths:
- the repo-owned backend is the process bound to `127.0.0.1:8000`
- the backend is running in `O3DE_ADAPTER_MODE=hybrid`
- the backend target wiring resolves to the verified `McpSandbox` paths
- persistence is ready
- the project-local persistent bridge can publish fresh heartbeat/status

Readiness endpoint:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/ready'
```

Target endpoint:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/o3de/target'
```

Bridge endpoint:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/o3de/bridge'
```

Capability endpoint:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/prompt/capabilities'
```

Truth to confirm before the proof run:
- `/ready` reports `ok = true`
- `/ready` reports `persistence_ready = true`
- `/o3de/target.project_root` is
  `C:\Users\topgu\O3DE\Projects\McpSandbox`
- `/o3de/target.engine_root` is `C:\src\o3de`
- `/o3de/bridge.configured = true`
- `/o3de/bridge.heartbeat_fresh = true`
- `/o3de/bridge.heartbeat.bridge_module_loaded = true`
- `/prompt/capabilities` reports:
  `editor.session.open.real_admission_stage = real-editor-authoring-active`
- `/prompt/capabilities` reports:
  `editor.level.open.real_admission_stage = real-editor-authoring-active`
- `/prompt/capabilities` reports:
  `editor.entity.create.real_admission_stage = real-editor-authoring-active`
- `/prompt/capabilities` reports:
  `editor.entity.exists.capability_maturity = hybrid-read-only`
- `/prompt/capabilities` reports:
  `editor.component.add.capability_maturity = real-authoring`
- `/prompt/capabilities` reports:
  `editor.component.property.get.capability_maturity = hybrid-read-only`

## Run The Proof

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-proof
```

The repo-owned command proves this exact composed chain against
`127.0.0.1:8000`:
1. `editor.session.open`
2. `editor.level.open`
3. `editor.entity.create`
4. `editor.component.add`
5. `editor.component.property.get`

The proof command:
- restarts or reuses the canonical backend
- launches the canonical McpSandbox Editor bridge when no canonical Editor is
  already running
- fails instead of launching a duplicate Editor when an existing canonical
  Editor is present but its bridge heartbeat remains stale
- checks `/ready`
- checks `/o3de/target`
- checks `/o3de/bridge`
- checks `/prompt/capabilities`
- creates a prompt session for the exact admitted five-step chain
- auto-walks required approvals
- verifies persisted run, execution, and artifact lineage
- invokes and hash-verifies the file-backed restore boundary
- writes one JSON evidence bundle under `backend/runtime`

The output file pattern is:
- `backend/runtime/live_editor_authoring_proof_<timestamp>.json`

Standalone direct read-only entity-exists proof bundles use:
- `backend/runtime/live_editor_entity_exists_proof_<timestamp>.json`

## Latest Verified Repo-Owned Proof

Latest successful proof bundle:
- `backend/runtime/live_editor_authoring_proof_20260425-080441.json`

Latest successful proof summary:
- `summary.succeeded = true`
- `summary.status = completed`
- `summary.prompt_session.status = completed`
- `summary.prompt_session.execute_attempt_count = 5`
- `summary.prompt_session.approval_count = 4`
- `summary.selected_level_path = Levels/TestLoevel01`
- `summary.entity_name = CodexProofEntity_20260425_080441`
- `summary.entity_id = [362085715539]`
- `summary.component_name = Mesh`
- `summary.component_id = EntityComponentIdPair(EntityId(5957391582996336467), 16444678243022057229)`
- `summary.property_path = Controller|Configuration|Model Asset`
- `summary.cleanup_restore.restore_result = restored_and_verified`

Latest successful proof run ids:
- `editor.session.open run_id = run-347b6f0b0916`
- `editor.level.open run_id = run-ac7cf33b76a1`
- `editor.entity.create run_id = run-c0ca1421721a`
- `editor.component.add run_id = run-f5ffdc247902`
- `editor.component.property.get run_id = run-eaa66db57ae6`

Latest successful proof execution ids:
- `editor.session.open execution_id = exe-a48cc45d4617`
- `editor.level.open execution_id = exe-41696ac7c943`
- `editor.entity.create execution_id = exe-4d48b88ee508`
- `editor.component.add execution_id = exe-820a04e5310b`
- `editor.component.property.get execution_id = exe-79ad74504250`

Latest successful proof artifact ids:
- `editor.session.open artifact_id = art-7fce3e7ec783`
- `editor.level.open artifact_id = art-0eb8cf22c0cf`
- `editor.entity.create artifact_id = art-b02dd12523b4`
- `editor.component.add artifact_id = art-6259a814a976`
- `editor.component.property.get artifact_id = art-db062532ceb9`

Latest successful proof bridge command ids:
- `editor.session.open bridge_command_id = e5c3b024002447eca23155ca548e9f91`
- `editor.level.open bridge_command_id = 98ea6701e3764df2808547ec323cecad`
- `editor.entity.create bridge_command_id = 729d56f8de5c448dabcd3b9050a54a77`
- `editor.component.add bridge_command_id = fb93b401a800433aa519080ea49e0b92`
- `editor.component.property.get bridge_command_id = c2b4f82bbc884b149a44b3e336620c56`

Latest successful cleanup restore:
- `restore_boundary_id = 2ba80761a0e741da9fd728da67c60712`
- `restore_boundary_scope = loaded-level-file`
- `restore_strategy = restore-loaded-level-file-from-pre-mutation-backup`
- `restore_trigger = live-proof-success-cleanup`
- `restore_succeeded = true`
- `restore_boundary_backup_sha256 = ba0d16a2b61162dac35d411cbeb17a1f1a0c72b04a9b3a8eec7477119d5c9c9c`
- `restore_restored_sha256 = ba0d16a2b61162dac35d411cbeb17a1f1a0c72b04a9b3a8eec7477119d5c9c9c`

## Latest Direct Read-Only Entity Exists Proof

Latest direct proof bundle:
- `backend/runtime/live_editor_entity_exists_proof_20260425-083436.json`

Latest direct proof summary:
- `proof_kind = editor.entity.exists.direct-live-read-only`
- `scope = editor.session.open -> editor.level.open -> editor.entity.exists only`
- `target.level_path = Levels/TestLoevel01`
- `target.entity_name = Ground`
- `exists = true`
- `lookup_mode = entity_name`
- `matched_count = 1`
- `entity_id = [2949498829790842453]`
- `bridge.heartbeat_fresh = true`

Latest direct proof lineage:
- `editor.entity.exists run_id = run-2ae86612d8e0`
- `editor.entity.exists execution_id = exe-ec24e70a8678`
- `editor.entity.exists artifact_id = art-ff7b77eb135e`
- `editor.entity.exists bridge_command_id = 4d4b6668ae4b41e29a576b6151015e5b`

Latest direct proof missing proof:
- no cleanup or restore was executed or needed by this read-only proof
- no entity absence after restore, live Editor undo, viewport reload, or broader
  editor behavior was proven

## What Does And Does Not Count As Proof

The following do count as proof:
- the repo-owned backend on `127.0.0.1:8000` observing fresh bridge heartbeat
- the repo-owned proof command writing a successful evidence bundle
- prompt planning resolving the exact five-step admitted chain
- persisted run, execution, and artifact lineage for all five admitted steps
- bridge command ids tying the live editor actions to the persistent bridge path
- hash-verified filesystem restore of the selected loaded-level prefab from the
  runtime-owned backup
- the direct entity-exists proof bundle proving exact-name existence readback
  only for the loaded/current level target it records

The following are not sufficient by themselves:
- a manual editor launch by itself
- a heartbeat file by itself
- a live bridge process that the backend on `127.0.0.1:8000` cannot observe
- frontend visibility alone
- a simulated dispatch with successful control-plane bookkeeping

The latest composed authoring proof still does not prove:
- live Editor undo
- viewport reload
- entity-absence readback after filesystem restore
- broader component/property mapping
- property writes
- delete, parenting, prefab, material, asset, render, build, or arbitrary Editor
  Python behavior

The latest direct entity-exists proof proves only standalone exact-name
existence readback for `Ground` on `Levels/TestLoevel01`. It does not prove
cleanup, restore, absence readback, broad entity discovery, component discovery,
or any editor mutation.

## External Dependency Caveat

The current live proof depends on the project-local
`ControlPlaneEditorBridge` handler path on the active `McpSandbox` target.

Do not hide that dependency when describing the proof boundary.

## Completion Criteria

This checklist is satisfied only when all of the following are true:
- the canonical repo-owned backend is running on `127.0.0.1:8000`
- backend readiness reflects the expected hybrid/runtime boundary
- the target endpoint reflects the expected `McpSandbox` wiring
- bridge heartbeat is fresh and target wiring matches `McpSandbox`
- the repo-owned proof command writes a single evidence bundle under
  `backend/runtime`
- `editor.session.open` records admitted-real execution evidence
- `editor.level.open` records admitted-real execution evidence
- `editor.entity.create` records admitted-real bridge-backed execution evidence
- `editor.entity.exists` remains a separate admitted read-only surface; the
  current direct proof covers only exact-name readback on the loaded/current
  level target it records
- `editor.component.add` records admitted-real allowlist-bound component attach
  evidence
- `editor.component.property.get` records admitted real read-only property
  readback evidence
- cleanup restore remains described only as file-backed loaded-level restore
  unless a separate live undo/reload/absence-readback proof exists
