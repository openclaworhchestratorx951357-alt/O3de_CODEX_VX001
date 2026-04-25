# Remote Control Bridge Lessons

This note records the design archaeology taken from the archived `RemoteControlHost-2026-04-20` project and the specific lessons being reused in the current control-plane bridge.

## Reused ideas

- Use a persistent editor-side worker instead of repeatedly launching one-shot editor scripts for every operation.
- Use a filesystem queue with distinct inbox, processing, results, deadletter, heartbeat, and logs directories.
- Publish explicit heartbeat/health state so the control plane can distinguish "bridge not running" from "tool failed".
- Process only typed JSON command envelopes and typed JSON result envelopes.
- Move commands through the queue atomically and clean up processed files after a result is written.
- Capture structured failure evidence and editor log references instead of flattening failures into generic timeouts.

## Intentionally not reused

- No raw `exec_file` or uploaded-script execution path.
- No arbitrary JSON blobs that contain script bodies or hidden editor commands.
- No second orchestration or approval system inside O3DE.
- No archive-project assumptions about project identity, active target wiring, or startup ownership.
- No silent autostart as the baseline behavior during early stabilization.

## Why the new bridge differs

The archived poller was useful as a queue-and-lifecycle pattern, but it mixed that transport with arbitrary script execution. The current bridge keeps the control plane as the only orchestration, approval, lock, lineage, and evidence substrate.

The new bridge is therefore intentionally narrower:

- control plane decides whether a capability is admitted
- control plane dispatches the typed tool request
- control plane persists runs, executions, artifacts, events, executors, and workspaces
- bridge only executes allowlisted target-side editor operations

## Current bridge transport model

The current bridge model for `McpSandbox` is:

1. Control plane writes a typed command JSON to the project-local bridge inbox.
2. The persistent editor-side poller moves the command to processing.
3. The poller executes one allowlisted operation.
4. The poller writes a typed result JSON to results or deadletter.
5. The control plane ingests the result and persists lineage in the repo-owned substrate.

The current admitted-real verification path for that transport is the
repo-owned backend on `127.0.0.1:8000` launched via
`backend/runtime/launch_branch_backend_8000.cmd` against the verified
`McpSandbox` target wiring.

That proof path matters because a manually launched editor-side bridge heartbeat
is not sufficient by itself; the backend launch path and heartbeat observation
path must match the same repo-owned local runtime.

## Why typed allowlisted commands are required

Typed allowlisted commands keep the prompt/session and direct-dispatch paths aligned with the same admitted capability boundary. That protects the product from becoming an untyped editor backdoor while still giving us a persistent target-side execution seam for real editor automation.
