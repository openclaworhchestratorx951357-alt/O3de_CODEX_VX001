# Asset Forge Server-Owned Approval Session Model

Status: Packet D substrate scaffold (non-authorizing)

## Purpose

This packet introduces a server-owned approval/session substrate for Asset Forge.
It exists so future mutation-capable work can bind requests to server-created
records instead of trusting client-declared approval fields.

This packet does **not** admit mutation execution.

## Scope Added

- server-owned approval session records for Asset Forge mutation-adjacent lanes
- request/session binding fingerprints
- session lifecycle fields:
  - status
  - expiry
  - revocation metadata
- read-only session list/get endpoints
- non-authorizing prepare endpoint for session creation
- explicit server-approval evaluation surfaced on blocked mutation-adjacent
  endpoints

## Endpoints

- `GET /asset-forge/approval-sessions`
- `POST /asset-forge/approval-sessions/prepare`
- `GET /asset-forge/approval-sessions/{session_id}`
- `POST /asset-forge/approval-sessions/{session_id}/revoke`

## Session Truth Model

- sessions are server-created and carry a server-generated id and token preview
- request binding is fingerprinted from bounded request envelope fields
- session statuses include pending, revoked, and expired in this packet
- client approval fields are intent only and never authorization
- authorization is always false in this packet

## Safety Boundaries Preserved

- stage-write execution remains blocked
- placement runtime harness execution remains blocked
- placement live-proof runtime execution remains blocked
- provider generation remains blocked
- Blender execution remains blocked
- O3DE source staging and placement mutation remain blocked
- no Asset Processor execution is enabled
- no runtime bridge call is enabled by approval/session state

## Next Gate

Before any mutation-capable endpoint can be admitted, a follow-up packet must
implement server-owned decision enforcement and session-to-runtime authorization
checks, then prove with tests that only server decisions can authorize bounded
execution.
