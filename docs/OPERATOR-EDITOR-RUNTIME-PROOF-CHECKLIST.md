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

It does not widen into arbitrary Editor Python, arbitrary components, arbitrary
property writes, delete, parenting, prefab, material, asset, render, or build
behavior.

## Current admitted scope

On the current verified local target wiring:
- `editor.session.open` is admitted real-authoring.
- `editor.level.open` is admitted real-authoring.
- `editor.entity.create` is admitted real-authoring through the persistent
  bridge-backed path.
- `editor.component.add` is admitted real-authoring only for explicit entity id
  plus allowlisted component attachment.
- `editor.component.property.get` is admitted hybrid read-only only for explicit
  component id plus explicit property path.

Current editor-authoring boundary:
- requires an admitted editor session.
- requires a loaded/current level match.
- selects a non-default sandbox/test level when the proof can prove one.
- allows only root-level named entity creation for `editor.entity.create`.
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

Before running the proof command, confirm all of the following:
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

## Latest Verified Repo-Owned Proof

Latest successful proof bundle:
- `backend/runtime/live_editor_authoring_proof_20260425-074627.json`

Latest successful proof summary:
- `summary.succeeded = true`
- `summary.status = completed`
- `summary.prompt_session.status = completed`
- `summary.prompt_session.execute_attempt_count = 5`
- `summary.prompt_session.approval_count = 4`
- `summary.selected_level_path = Levels/TestLoevel01`
- `summary.entity_name = CodexProofEntity_20260425_074627`
- `summary.entity_id = [364952092046]`
- `summary.component_name = Mesh`
- `summary.component_id = EntityComponentIdPair(EntityId(13417156680699191582), 8017053399990923351)`
- `summary.property_path = Controller|Configuration|Model Asset`
- `summary.cleanup_restore.restore_result = restored_and_verified`

Latest successful proof run ids:
- `editor.session.open run_id = run-d56c4b98823a`
- `editor.level.open run_id = run-21a8428e3c4b`
- `editor.entity.create run_id = run-4394fcc2a9fb`
- `editor.component.add run_id = run-49ae7a00a0ec`
- `editor.component.property.get run_id = run-b02a14b41348`

Latest successful proof execution ids:
- `editor.session.open execution_id = exe-cdbecb259f29`
- `editor.level.open execution_id = exe-cf92e2d06823`
- `editor.entity.create execution_id = exe-37581e2ff511`
- `editor.component.add execution_id = exe-712e4538e666`
- `editor.component.property.get execution_id = exe-f2e831b83b20`

Latest successful proof artifact ids:
- `editor.session.open artifact_id = art-bb33e9d05863`
- `editor.level.open artifact_id = art-de66117563cc`
- `editor.entity.create artifact_id = art-5cb612f1fc23`
- `editor.component.add artifact_id = art-3eaef0df826d`
- `editor.component.property.get artifact_id = art-ceb8326970ed`

Latest successful proof bridge command ids:
- `editor.session.open bridge_command_id = ba6c0f0cfa8c4af990f93f38c651adf3`
- `editor.level.open bridge_command_id = 2bf57b2b8c5c42b99109e6a1e44db774`
- `editor.entity.create bridge_command_id = 16cc6111712e441ab40dd496b563b7a9`
- `editor.component.add bridge_command_id = 736039137bdf408099de9d4cecb140c1`
- `editor.component.property.get bridge_command_id = 6fe876a79977479ea1617c978eb2821d`

Latest successful cleanup restore:
- `restore_boundary_id = 7f8de8f7da044f5a9b105a11ef53f4ad`
- `restore_boundary_scope = loaded-level-file`
- `restore_strategy = restore-loaded-level-file-from-pre-mutation-backup`
- `restore_trigger = live-proof-success-cleanup`
- `restore_succeeded = true`
- `restore_boundary_backup_sha256 = ba0d16a2b61162dac35d411cbeb17a1f1a0c72b04a9b3a8eec7477119d5c9c9c`
- `restore_restored_sha256 = ba0d16a2b61162dac35d411cbeb17a1f1a0c72b04a9b3a8eec7477119d5c9c9c`

## What Does And Does Not Count As Proof

The following do count as proof:
- the repo-owned backend on `127.0.0.1:8000` observing fresh bridge heartbeat
- the repo-owned proof command writing a successful evidence bundle
- prompt planning resolving the exact five-step admitted chain
- persisted run, execution, and artifact lineage for all five admitted steps
- bridge command ids tying the live editor actions to the persistent bridge path
- hash-verified filesystem restore of the selected loaded-level prefab from the
  runtime-owned backup

The following are not sufficient by themselves:
- a manual editor launch by itself
- a heartbeat file by itself
- a live bridge process that the backend on `127.0.0.1:8000` cannot observe
- frontend visibility alone
- a simulated dispatch with successful control-plane bookkeeping

The latest proof still does not prove:
- live Editor undo
- viewport reload
- entity-absence readback after filesystem restore
- broader component/property mapping
- property writes
- delete, parenting, prefab, material, asset, render, build, or arbitrary Editor
  Python behavior

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
- `editor.component.add` records admitted-real allowlist-bound component attach
  evidence
- `editor.component.property.get` records admitted real read-only property
  readback evidence
- cleanup restore remains described only as file-backed loaded-level restore
  unless a separate live undo/reload/absence-readback proof exists
