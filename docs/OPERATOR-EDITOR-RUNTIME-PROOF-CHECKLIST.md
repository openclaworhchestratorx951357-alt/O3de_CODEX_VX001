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

## Latest verified live evidence

Latest post-restart verification on `2026-04-21` against the canonical backend
bound to `127.0.0.1:8000`:
- live catalog reported `editor.session.open.default_timeout_s = 180`
- live prompt planning for prompt id
  `proof-prompt-timeout-alignment-002` emitted
  `editor-session-1.args.timeout_s = 180`
- direct admitted-real `editor.session.open` request id
  `proof-session-open-default-timeout-002` returned real success after approval
- approval id: `apr-5beb8b95fabc`
- run id: `run-a062e4bbc48e`
- execution id: `exe-5f6d33e04cf8`
- artifact id: `art-340a8370934d`
- bridge command id: `1c7514a041f14f2986e678b4be935d18`
- execution finished at: `2026-04-21T23:10:34.254580Z`
- persisted execution/artifact evidence reported:
  `execution_mode = real`
- persisted execution/artifact evidence reported:
  `inspection_surface = editor_session_runtime`
- persisted execution/artifact evidence reported loaded level path:
  `C:/Users/topgu/O3DE/Projects/McpSandbox/Levels/BridgeLevel01_probe_b`
- bridge status remained:
  `heartbeat_fresh = true`
- bridge queue counts after the proof run returned to:
  `inbox = 0`, `processing = 0`, `results = 0`, `deadletter = 6`

Latest prompt-gated `editor.level.open` verification on `2026-04-22` against
the same canonical backend:
- prompt id: `proof-prompt-editor-level-postrestart-001`
- plan id: `plan-3933c47bc58d`
- prompt plan remained admitted and emitted
  `editor-session-1.args.timeout_s = 180`
- prompt plan targeted level path:
  `Levels/BridgeLevel01_probe_b`
- first approval id for `editor.session.open`:
  `apr-ff713de0dcb7`
- second approval id for `editor.level.open`:
  `apr-ecc5c6dd462e`
- real `editor.session.open` run id:
  `run-c04943025a95`
- real `editor.session.open` execution id:
  `exe-9659c941dd04`
- real `editor.session.open` artifact id:
  `art-bf12737d370b`
- real `editor.session.open` bridge command id:
  `53c3a3597ae345cd8d0d48084b5f360e`
- real `editor.level.open` run id:
  `run-f8be94d7f5ab`
- real `editor.level.open` execution id:
  `exe-d7264d4cfd60`
- real `editor.level.open` artifact id:
  `art-c124925b2c45`
- real `editor.level.open` bridge command id:
  `d58fb2c70e63472486df183d690cb19c`
- prompt session completed with child run lineage:
  `run-1d7735e1c6a0`, `run-c04943025a95`, `run-a0eea7101225`,
  `run-f8be94d7f5ab`
- persisted real `editor.level.open` execution finished at:
  `2026-04-22T00:12:45.388149Z`
- persisted real `editor.level.open` evidence reported:
  `execution_mode = real`
- persisted real `editor.level.open` evidence reported:
  `inspection_surface = editor_level_opened`
- persisted real `editor.level.open` evidence reported loaded level path:
  `C:/Users/topgu/O3DE/Projects/McpSandbox/Levels/BridgeLevel01_probe_b`
- bridge result summary for the post-restart level proof was:
  `Requested level is already open in the persistent bridge session.`
- bridge status remained:
  `heartbeat_fresh = true`
- bridge queue counts returned to:
  `inbox = 0`, `processing = 0`, `results = 0`, `deadletter = 6`

Latest direct level-transition verification on `2026-04-22` against the same
canonical backend:
- direct request id:
  `proof-editor-level-transition-defaultlevel-001`
- approval id:
  `apr-cd50a945296f`
- before the direct proof run, bridge heartbeat reported active level path:
  `C:/Users/topgu/O3DE/Projects/McpSandbox/Levels/BridgeLevel01_probe_b`
- direct real `editor.level.open` run id:
  `run-1a8099e071c9`
- direct real `editor.level.open` execution id:
  `exe-7d041db334b5`
- direct real `editor.level.open` artifact id:
  `art-dd32a26bf58c`
- direct real `editor.level.open` bridge command id:
  `30b8af82bdf3419883bad79cdf20f036`
- direct real `editor.level.open` execution finished at:
  `2026-04-22T00:15:24.965119Z`
- persisted direct `editor.level.open` evidence reported:
  `execution_mode = real`
- persisted direct `editor.level.open` evidence reported:
  `inspection_surface = editor_level_opened`
- persisted direct `editor.level.open` evidence reported level path:
  `C:/Users/topgu/O3DE/Projects/McpSandbox/Levels/DefaultLevel`
- the first bridge read taken immediately after the successful dispatch still
  showed the prior active level and a stale nested queue snapshot
- by bridge heartbeat timestamp `2026-04-22T00:15:39.382005Z`, the canonical
  `/o3de/bridge` endpoint reported:
  `active_level_name = DefaultLevel`
- by bridge heartbeat timestamp `2026-04-22T00:15:39.382005Z`, the canonical
  `/o3de/bridge` endpoint reported:
  `active_level_path = C:/Users/topgu/O3DE/Projects/McpSandbox/Levels/DefaultLevel`
- after heartbeat convergence, bridge queue counts were:
  `inbox = 0`, `processing = 0`, `results = 0`, `deadletter = 6`

Authoritative note:
- an earlier same-day no-override session-open request succeeded before the
  canonical backend restart, but the live catalog and live prompt planner still
  exposed the stale `30`/`60` timeout surfaces
- the verification bullets above are the authoritative post-restart proof for
  the updated repo state
- the `2026-04-22` prompt-gated `editor.level.open` proof confirms admitted-real
  prompt lineage and persisted real evidence on the canonical backend, but it
  targeted a level that was already active in the bridge session
- the `2026-04-22` direct `editor.level.open` proof confirmed an actual level
  transition from `BridgeLevel01_probe_b` to `DefaultLevel`
- operators should treat persisted execution/artifact evidence as authoritative
  first, then allow a short bridge-heartbeat convergence window before treating
  an immediate post-dispatch `/o3de/bridge` sample as a mismatch

Latest post-restart exclusion verification for `editor.entity.create` on
`2026-04-22` against the same canonical backend:
- prompt capability registry still reported:
  `capability_maturity = runtime-reaching`
- prompt capability registry still reported:
  `real_admission_stage = runtime-reaching-excluded-from-admitted-real`
- prompt capability registry still reported:
  `safety_envelope.natural_language_status = prompt-blocked-pending-admission`
- prompt capability registry still reported blocker text:
  `Excluded from the admitted real set on current tested local targets until prefab-safe entity creation is proven stable.`
- policy registry still reported:
  `real_admission_stage = runtime-reaching-excluded-from-admitted-real`
- refusal prompt id:
  `proof-prompt-editor-entity-exclusion-postrestart-001`
- refusal plan id:
  `plan-31e55053a2a1`
- refusal prompt status:
  `refused`
- refusal prompt listed:
  `refused_capabilities = ["editor.entity.create"]`
- refusal prompt final result summary explicitly stated that
  `editor.entity.create` remains runtime-reaching and excluded from the
  admitted real set on current tested local targets

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

For the currently admitted-real bridge-backed session-open path, use a
`180` second timeout rather than the shorter generic request defaults.

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
  timeout_s = 180
  args = @{
    session_mode = "attach"
    project_path = "C:\Users\topgu\O3DE\Projects\McpSandbox"
    timeout_s = 180
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
  timeout_s = 120
  args = @{
    level_path = "Levels/DefaultLevel"
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
- after `editor.level.open`, if the first immediate bridge sample still reports
  the previous active level, poll `/o3de/bridge` briefly until the heartbeat
  converges to the persisted execution `loaded_level_path`

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
