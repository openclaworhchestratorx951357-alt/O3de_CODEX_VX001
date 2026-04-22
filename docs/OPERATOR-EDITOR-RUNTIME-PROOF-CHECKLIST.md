# Operator Editor Runtime Proof Checklist

## Purpose

This checklist records the exact operator-facing proof path used to confirm the
currently admitted-real editor-runtime boundary on the canonical local backend.

It is intentionally narrow.

It proves only:
- `editor.session.open`
- `editor.level.open`
- `editor.entity.create`

It does not widen the admitted real set beyond those tools.

It does not relabel `editor.component.add` as admitted real.

## Current admitted-real scope

On the current verified local target wiring:
- `editor.session.open` is admitted real-authoring
- `editor.level.open` is admitted real-authoring
- `editor.entity.create` is admitted real-authoring through the persistent
  bridge-backed path
- `editor.component.add` remains simulated-only

Current admitted entity-create boundary:
- requires an admitted editor session
- requires a loaded/current level match
- allows only root-level named entity creation
- rejects `parent_entity_id`
- rejects `prefab_asset`
- rejects `position`

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
- launcher:
  `backend/runtime/launch_branch_backend_8000.cmd`
- repo-owned proof command:
  `backend/runtime/prove_live_editor_authoring.cmd`

## Preconditions

Before running the proof command, confirm all of the following:
- the repo-owned backend is the process bound to `127.0.0.1:8000`
- the backend is running in `O3DE_ADAPTER_MODE=hybrid`
- the backend target wiring resolves to the verified `McpSandbox` paths
- persistence is ready
- the project-local persistent bridge can publish heartbeat/status

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
  `editor.component.add.capability_maturity = simulated-only`

## Start the canonical backend

From the repo root:

```powershell
.\backend\runtime\launch_branch_backend_8000.cmd
```

This is the canonical local launch path for the admitted editor-runtime proof.

## Run the repo-owned live proof command

From the repo root:

```powershell
.\backend\runtime\prove_live_editor_authoring.cmd
```

This single repo-owned command performs the canonical three-step live flow
against `127.0.0.1:8000`:
1. `editor.session.open`
2. `editor.level.open`
3. `editor.entity.create`

The proof command:
- checks `/ready`
- checks `/o3de/target`
- checks `/o3de/bridge`
- checks `/prompt/capabilities`
- dispatches and approves all three admitted-real editor actions
- writes one JSON evidence bundle under `backend/runtime`

The output file pattern is:
- `backend/runtime/live_editor_authoring_proof_<timestamp>.json`

The evidence bundle captures:
- launch/target assumptions
- request payloads
- dispatch responses
- approval ids
- run ids
- execution ids
- artifact ids
- bridge command ids
- final entity id
- final entity name
- final level path
- a timestamped success or failure summary

## Latest verified repo-owned proof

Latest successful proof bundle:
- `backend/runtime/live_editor_authoring_proof_20260422-062920.json`

Latest successful proof summary:
- `summary.succeeded = true`
- `summary.status = completed`
- `summary.bridge_transport_confirmed = true`
- `summary.entity_name = CodexProofEntity_20260422_062920`
- `summary.entity_id = [388509455724]`
- `summary.level_path = C:/Users/topgu/O3DE/Projects/McpSandbox/Levels/DefaultLevel`

Latest successful proof record ids:
- `editor.session.open approval_id = apr-a946367a3493`
- `editor.session.open run_id = run-83ea6784bcc3`
- `editor.session.open execution_id = exe-9e530dbf3d49`
- `editor.session.open artifact_id = art-615f33cf331b`
- `editor.level.open approval_id = apr-5599213864e7`
- `editor.level.open run_id = run-5f84727e4cb5`
- `editor.level.open execution_id = exe-4549c44ff05e`
- `editor.level.open artifact_id = art-63edb4b64ef0`
- `editor.entity.create approval_id = apr-02e2fb6d6f3a`
- `editor.entity.create run_id = run-3f6b3a118f15`
- `editor.entity.create execution_id = exe-6d844b6d08b4`
- `editor.entity.create artifact_id = art-4615bcb20c6c`

Latest successful proof bridge command ids:
- `editor.session.open bridge_command_id = 5e31e525bd984903a0b162be83857d42`
- `editor.level.open bridge_command_id = a0d4edd3d99642728b5be6d38d935a29`
- `editor.entity.create bridge_command_id = 5ce0253dc89f4f44bedd952ea9bcd071`

Latest successful bridge log lines:
- `2026-04-22T06:29:30.186876Z Processed bridge command 5e31e525bd984903a0b162be83857d42 successfully.`
- `2026-04-22T06:29:43.186043Z Processed bridge command a0d4edd3d99642728b5be6d38d935a29 successfully.`
- `2026-04-22T06:29:56.399340Z Processed bridge command 5ce0253dc89f4f44bedd952ea9bcd071 successfully.`

## On-disk bridge evidence

Bridge heartbeat/status evidence on disk:
- `C:\Users\topgu\O3DE\Projects\McpSandbox\user\ControlPlaneBridge\heartbeat\status.json`

Bridge log evidence on disk:
- `C:\Users\topgu\O3DE\Projects\McpSandbox\user\ControlPlaneBridge\logs\control_plane_bridge.log`

## What does and does not count as proof

The following do count as proof:
- the repo-owned backend on `127.0.0.1:8000` observing fresh bridge heartbeat
- the repo-owned proof command writing a successful evidence bundle
- persisted run, execution, and artifact lineage for all three admitted-real
  editor steps
- bridge command ids tying the live editor actions to the persistent bridge path

The following are not sufficient by themselves:
- a manual editor launch by itself
- a heartbeat file by itself
- a live bridge process that the backend on `127.0.0.1:8000` cannot observe
- frontend visibility alone
- a simulated dispatch with successful control-plane bookkeeping

## External dependency caveat

The current live proof depends on the project-local
`ControlPlaneEditorBridge` handler path on the active `McpSandbox` target.

Do not hide that dependency when describing the proof boundary.

## Completion criteria

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
  inside the admitted narrow mutation boundary
- `editor.component.add` remains explicitly simulated-only in operator wording
  until its own bridge-backed proof slice lands
