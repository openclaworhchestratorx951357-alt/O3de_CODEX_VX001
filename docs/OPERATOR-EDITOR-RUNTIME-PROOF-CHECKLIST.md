# Operator Editor Runtime Proof Checklist

## Purpose

This checklist records the exact operator-facing proof path used to confirm the
currently admitted-real editor-runtime boundary on the canonical local backend.

It is intentionally narrow.

It proves only:
- `editor.session.open`
- `editor.level.open`

It does not widen the admitted-real set beyond those tools.

It does not relabel `editor.entity.create` as admitted real.

## Current admitted-real scope

On the current verified local target wiring:
- `editor.session.open` is admitted real
- `editor.level.open` is admitted real
- `editor.entity.create` remains excluded from the admitted-real set

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

## Preconditions

Before using this checklist, confirm all of the following:
- the repo-owned backend is the process bound to `127.0.0.1:8000`
- the backend is running in `O3DE_ADAPTER_MODE=hybrid`
- the backend target wiring resolves to the verified `McpSandbox` paths
- the project-local persistent bridge can publish heartbeat/status

## 1. Start the canonical backend

From the repo root:

```powershell
.\backend\runtime\launch_branch_backend_8000.cmd
```

This is the canonical local launch path for the admitted editor-runtime proof.

## 2. Confirm backend readiness

Readiness endpoint:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/ready
```

Truth to confirm in the response body:
- backend is serving on `127.0.0.1:8000`
- `execution_mode` is `hybrid`
- supported/admitted tool reporting includes the current real editor-runtime
  boundary

## 3. Confirm bridge heartbeat visibility

Bridge status endpoint:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/o3de/bridge
```

Truth to confirm in the response body:
- `heartbeat_fresh = true`
- bridge is reporting `running = true`
- `bridge_module_loaded = true`
- reported `project_root` is
  `C:\Users\topgu\O3DE\Projects\McpSandbox`
- reported `engine_root` is `C:\src\o3de`

Bridge evidence on disk:
- `C:\Users\topgu\O3DE\Projects\McpSandbox\user\ControlPlaneBridge\logs\control_plane_bridge.log`
- `C:\Users\topgu\O3DE\Projects\McpSandbox\user\ControlPlaneBridge\heartbeat\status.json`

## 4. Dispatch admitted-real `editor.session.open`

Dispatch a real editor session open through the repo-owned backend.

Minimum truth to confirm in the resulting execution evidence:
- tool name is `editor.session.open`
- `execution_mode = real`
- `simulated = false`
- outcome/result is `real_success`

## 5. Dispatch admitted-real `editor.level.open`

Dispatch a real level open through the repo-owned backend.

Minimum truth to confirm in the resulting execution evidence:
- tool name is `editor.level.open`
- `execution_mode = real`
- `simulated = false`
- outcome/result is `real_success`

## 6. Confirm bridge-side evidence after dispatch

After the admitted-real dispatches, confirm:
- no new deadletter evidence was introduced for the successful proof run
- bridge heartbeat remains fresh
- bridge log shows command processing for the proof run

Useful endpoint:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/o3de/bridge
```

Useful on-disk evidence:
- heartbeat status file
- bridge log file
- persisted execution/artifact records in the repo-owned control-plane
  substrate

## 7. What does not count as proof

The following are not sufficient by themselves:
- a manual editor launch by itself
- a heartbeat file by itself
- a live bridge process that the backend on `127.0.0.1:8000` cannot observe
- a simulated dispatch with successful control-plane bookkeeping
- frontend visibility alone

The proof path is only complete when the same repo-owned backend that binds
`127.0.0.1:8000` both observes the bridge heartbeat and records real execution
evidence for the admitted tools.

## 8. Explicit exclusion

`editor.entity.create` remains excluded from the admitted-real set on the
current tested local targets.

Do not treat this checklist as proof for `editor.entity.create`.

Do not relabel `editor.entity.create` as admitted real based on:
- session-open success
- level-open success
- bridge heartbeat success
- backend readiness in hybrid mode

## Completion criteria

This checklist is satisfied only when all of the following are true:
- canonical repo-owned backend is running on `127.0.0.1:8000`
- backend readiness reflects the expected hybrid/runtime boundary
- bridge heartbeat is fresh and target wiring matches `McpSandbox`
- `editor.session.open` records admitted-real execution evidence
- `editor.level.open` records admitted-real execution evidence
- `editor.entity.create` remains explicitly excluded in operator wording and
  docs
