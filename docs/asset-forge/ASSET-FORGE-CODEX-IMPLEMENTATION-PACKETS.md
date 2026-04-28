# Asset Forge Codex Implementation Packets

Status: ordered work packets for Codex

## Packet rules

Each packet must be small, verifiable, and honest.

Do not combine provider execution, Blender execution, O3DE staging, Editor placement, and GUI rewrites into one packet.

Every packet report must include:
- capability delta
- files changed
- tests run
- evidence artifacts
- risks remaining
- safest next packet
- revert path

## Packet 00 — Install Asset Forge docs and verify repo truth

Goal:
Add this documentation pack, verify existing Asset Forge history, and report current backend/frontend state.

Likely files:
- `docs/asset-forge/*`
- optionally `docs/README.md` index entry only if appropriate

Verification:
- `git diff --check`
- docs review
- no runtime mutation

Do not implement product behavior in this packet unless asked.

## Packet 01 — Asset Forge Studio GUI shell with truthful demo state

Goal:
Make Asset Forge visible as a real product surface.

Deliverables:
- route/page/navigation entry
- studio header
- generation workspace
- four demo candidate cards
- selected candidate inspector
- Blender Prep panel
- O3DE ingest panel
- evidence timeline
- settings/status area
- typed frontend demo data
- clear demo/planned/blocked labels

Rules:
- no provider API call
- no Blender execution
- no O3DE mutation
- no claim of real generation

Acceptance:
- frontend build passes
- screenshot or clear description of page
- all non-real actions visibly labeled

Suggested capability delta:
- Asset Forge GUI: missing or concept-only -> plan-only/demo studio shell

## Packet 02 — Wire GUI to backend capability registry/read-only status

Goal:
Replace hardcoded state chips with backend capability status where existing registry support allows.

Deliverables:
- status endpoint usage or adapter
- provider, Blender, O3DE ingest, placement, review chips reflect backend truth
- graceful fallback when backend is unavailable

Rules:
- no execution
- read-only only

## Packet 03 — Backend Asset Forge task and candidate model

Goal:
Create typed task/candidate objects without provider execution.

Deliverables:
- backend models/schemas
- create plan-only task
- list demo or local candidates
- tests

Rules:
- no external provider
- no Blender
- no O3DE project writes

## Packet 04 — Provider status/preflight only

Goal:
Show provider mode and configuration readiness without generation.

Deliverables:
- provider registry
- disabled/mock/configured/real mode
- frontend settings display
- tests

Rules:
- no model generation
- no external task creation

## Packet 05 — Blender executable detection

Goal:
Detect Blender availability and version safely.

Deliverables:
- backend preflight endpoint or service
- frontend state chip update
- tests for missing/detected cases

Rules:
- no model processing
- no raw user script
- no broad file mutation

## Packet 06 — Blender read-only model inspection

Goal:
Inspect a candidate model using repo-owned script and return structured report.

Deliverables:
- allowlisted script
- input artifact validation
- report schema
- tests with fixture model if available

Rules:
- read-only inspection first
- output report only

## Packet 07 — O3DE staging plan

Goal:
Plan where a prepared asset would be staged in O3DE.

Deliverables:
- plan schema
- deterministic path proposal
- approval requirement
- GUI display

Rules:
- no project write

## Packet 08 — Approval-gated O3DE source staging

Goal:
Write a prepared source asset into an approved generated-assets folder.

Deliverables:
- approval path
- manifest/provenance sidecar
- post-write readback
- revert path

Rules:
- narrow path only
- no broad asset mutation

## Packet 09 — Asset Processor and assetdb readback

Goal:
Use existing Phase 9 readback patterns to verify generated asset products.

Deliverables:
- assetdb/catalog evidence
- GUI ingest status
- warnings and freshness state

Rules:
- read-only verification

## Packet 10 — Editor placement plan

Goal:
Plan placement of the staged asset in a level.

Deliverables:
- plan output
- target level/entity/component requirements
- approval and admission label

Rules:
- no placement execution

## Packet 11 — Narrow admitted placement proof

Goal:
Execute only an exact admitted placement path after proof and approval.

Deliverables:
- live proof
- Editor readback
- evidence bundle
- revert/restore statement

Rules:
- no broad prefab or scene mutation

## Default next step

Start with Packet 01 if the docs are already installed. The user specifically wants the GUI to be thought out like Meshy and Blender, so the GUI shell should not be deferred.
