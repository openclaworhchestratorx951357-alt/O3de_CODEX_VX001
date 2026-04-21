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

## 3. Confirm target wiring

Target endpoint:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/o3de/target
```

Truth to confirm in the response body:
- `project_root` is `C:\Users\topgu\O3DE\Projects\McpSandbox`
- `engine_root` is `C:\src\o3de`
- `editor_runner` is
  `C:\Users\topgu\O3DE\Projects\McpSandbox\build\windows\bin\profile\Editor.exe`
- target source remains the repo-owned canonical local target path

## 4. Confirm bridge heartbeat visibility

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

## 5. Dispatch admitted-real `editor.session.open`

Dispatch a real editor session open through the repo-owned backend.

Exact proof commands:

```powershell
$sessionRequest = @{
  request_id = "proof-editor-session-open-1"
  tool = "editor.session.open"
  agent = "editor-control"
  project_root = "C:\Users\topgu\O3DE\Projects\McpSandbox"
  engine_root = "C:\src\o3de"
  dry_run = $false
  locks = @("editor_session")
  timeout_s = 60
  args = @{
    session_mode = "open"
    project_path = "C:\Users\topgu\O3DE\Projects\McpSandbox"
    level_path = "Levels/Main.level"
    timeout_s = 60
  }
}

$sessionPreflight = Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/tools/dispatch `
  -ContentType "application/json" `
  -Body ($sessionRequest | ConvertTo-Json -Depth 6)

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/approvals/$($sessionPreflight.approval_id)/approve" `
  -ContentType "application/json" `
  -Body "{}"

$sessionRequest.approval_token = $sessionPreflight.error.details.approval_token

$sessionResult = Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/tools/dispatch `
  -ContentType "application/json" `
  -Body ($sessionRequest | ConvertTo-Json -Depth 6)

$sessionRun = Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/runs/$($sessionResult.operation_id)"

$sessionExecution = (Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/executions).executions |
  Where-Object { $_.run_id -eq $sessionResult.operation_id } |
  Select-Object -First 1

$sessionArtifact = (Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/artifacts).artifacts |
  Where-Object { $_.run_id -eq $sessionResult.operation_id } |
  Select-Object -First 1
```

Minimum truth to confirm in the response and persisted evidence:
- `$sessionResult.result.tool = editor.session.open`
- `$sessionResult.result.execution_mode = real`
- `$sessionResult.result.simulated = false`
- `$sessionResult.result.status = real_success`
- `$sessionRun.status = succeeded`
- tool name is `editor.session.open`
- `execution_mode = real`
- `simulated = false`
- `inspection_surface = editor_session_runtime`
- `details.prompt_safety.natural_language_status = prompt-ready-approval-gated`
- `artifact.metadata.tool = editor.session.open`
- `artifact.metadata.prompt_safety.natural_language_status = prompt-ready-approval-gated`

## 6. Dispatch admitted-real `editor.level.open`

Dispatch a real level open through the repo-owned backend.

Exact proof commands:

```powershell
$levelRequest = @{
  request_id = "proof-editor-level-open-1"
  tool = "editor.level.open"
  agent = "editor-control"
  project_root = "C:\Users\topgu\O3DE\Projects\McpSandbox"
  engine_root = "C:\src\o3de"
  dry_run = $false
  locks = @("editor_session")
  timeout_s = 60
  args = @{
    level_path = "Levels/Main.level"
    make_writable = $true
    focus_viewport = $true
  }
}

$levelPreflight = Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/tools/dispatch `
  -ContentType "application/json" `
  -Body ($levelRequest | ConvertTo-Json -Depth 6)

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/approvals/$($levelPreflight.approval_id)/approve" `
  -ContentType "application/json" `
  -Body "{}"

$levelRequest.approval_token = $levelPreflight.error.details.approval_token

$levelResult = Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/tools/dispatch `
  -ContentType "application/json" `
  -Body ($levelRequest | ConvertTo-Json -Depth 6)

$levelRun = Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/runs/$($levelResult.operation_id)"

$levelExecution = (Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/executions).executions |
  Where-Object { $_.run_id -eq $levelResult.operation_id } |
  Select-Object -First 1

$levelArtifact = (Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/artifacts).artifacts |
  Where-Object { $_.run_id -eq $levelResult.operation_id } |
  Select-Object -First 1
```

Minimum truth to confirm in the response and persisted evidence:
- `$levelResult.result.tool = editor.level.open`
- `$levelResult.result.execution_mode = real`
- `$levelResult.result.simulated = false`
- `$levelResult.result.status = real_success`
- `$levelRun.status = succeeded`
- tool name is `editor.level.open`
- `execution_mode = real`
- `simulated = false`
- `inspection_surface` is `editor_level_opened` or `editor_level_created`
- `details.prompt_safety.natural_language_status = prompt-ready-approval-gated`
- `artifact.metadata.tool = editor.level.open`
- `artifact.metadata.prompt_safety.natural_language_status = prompt-ready-approval-gated`

## 7. Confirm bridge-side evidence after dispatch

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

## 8. Confirm explicit exclusion for `editor.entity.create`

Exact proof commands:

```powershell
$entityCapability = (Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/prompt/capabilities).capabilities |
  Where-Object { $_.tool_name -eq "editor.entity.create" } |
  Select-Object -First 1

$entityPolicy = (Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/policies).policies |
  Where-Object { $_.tool -eq "editor.entity.create" } |
  Select-Object -First 1
```

Truth to confirm:
- `$entityCapability.capability_maturity = runtime-reaching`
- `$entityCapability.safety_envelope.natural_language_status = prompt-blocked-pending-admission`
- `$entityCapability.safety_envelope.natural_language_blocker` explicitly says the
  surface remains excluded from the admitted-real set
- `$entityPolicy.real_admission_stage = runtime-reaching-excluded-from-admitted-real`

## 9. What does not count as proof

The following are not sufficient by themselves:
- a manual editor launch by itself
- a heartbeat file by itself
- a live bridge process that the backend on `127.0.0.1:8000` cannot observe
- a simulated dispatch with successful control-plane bookkeeping
- frontend visibility alone

The proof path is only complete when the same repo-owned backend that binds
`127.0.0.1:8000` both observes the bridge heartbeat and records real execution
evidence for the admitted tools.

## 10. Explicit exclusion

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
- target endpoint reflects the expected `McpSandbox` wiring
- bridge heartbeat is fresh and target wiring matches `McpSandbox`
- `editor.session.open` records admitted-real execution evidence
- `editor.level.open` records admitted-real execution evidence
- persisted execution/artifact evidence also carries the expected prompt safety
  envelope for those admitted-real tools
- `editor.entity.create` remains explicitly excluded in operator wording and
  docs
