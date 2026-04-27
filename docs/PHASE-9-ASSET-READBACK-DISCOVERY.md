# Phase 9 Asset Readback Discovery

Status: normalized phase discovery packet

Date: 2026-04-27

## Current Main SHA

This discovery packet was prepared from:

```text
ac47ac316afd1e968a2af7afee01fe4917ec8399
```

## Phase Workflow Stage

Discovery packet.

This is a candidate-only read-only discovery packet for Phase 9 asset readback.
It does not implement runtime behavior, mutate assets, run Asset Processor,
admit a new public capability, or widen `asset.source.inspect`.

## Discovery Goal

Find the next safest evidence substrate behind asset readback, starting from the
current baseline:

- `asset.processor.status` is admitted narrow real read-only host-process
  visibility.
- `asset.source.inspect` is admitted narrow real read-only project-local source
  file identity and hash evidence.
- `asset.batch.process` is admitted plan-only preflight.
- `asset.move.safe` is admitted plan-only preflight.

The missing Phase 9 depth is product/dependency/prefab/reference readback, not
asset mutation.

## Read-Only Evidence Gathered

Local read-only discovery inspected:

- `backend/app/services/planners/asset_pipeline_planner.py`
- `backend/app/services/adapters.py`
- `backend/app/services/capability_registry.py`
- `backend/app/services/catalog.py`
- `backend/app/services/dispatcher.py`
- `backend/tests/test_dispatcher.py`
- `backend/tests/test_prompt_control.py`
- `docs/PHASE-9-ASSET-READBACK-BASELINE.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`

Repository scans found no tracked project-local asset catalog, asset database,
`.assetinfo`, product asset, `.prefab`, or source asset file that can be treated
as a current Phase 9 product/dependency substrate.

Runtime restore-boundary `.prefab` files may exist on disk under
`backend/runtime/editor_state/restore_boundaries/`, but they are runtime
backup/evidence state from editor proof flows. They are not a public
project-source asset readback substrate and must not be used to admit prefab or
reference graph readback.

## Candidate List

| Candidate | Current evidence | Blockers | Discovery decision |
| --- | --- | --- | --- |
| Product/dependency evidence behind `asset.source.inspect` | `asset.source.inspect` already accepts `include_products` and `include_dependencies`, but returns explicit unavailable fields because no product/dependency index is admitted. Tests assert that product/dependency evidence remains unavailable. | No located repo-owned product index, dependency index, asset database, or asset catalog reader. Need an explicit read-only source of truth and schema before code work. | Selected safest next design candidate. |
| Asset Processor job/platform telemetry | `asset.processor.status` currently probes only host process names and explicitly reports job/platform telemetry unavailable. | Real job/platform telemetry substrate is not admitted. Discovering it may require runtime coupling, logs, or process-specific APIs. | Defer until product/dependency readback design clarifies evidence needs. |
| Project-local asset catalog / asset database readback | Roadmap and matrix identify Asset Processor and product identity as the likely official family. | No tracked asset catalog/database path or reader exists in this repo. Need exact path, ownership, freshness, and read safety before use. | Candidate-only, not selected yet. |
| `.assetinfo` or sidecar metadata readback | Sidecar metadata could be safe if explicit and project-local. | No tracked `.assetinfo` files were found. Sidecar shape and completeness are unknown. | Candidate-only fallback if a concrete project sample appears. |
| Prefab/reference graph readback | Phase 9 roadmap calls out prefab reference and risk inspection. | No public prefab source graph, reference graph, or dependency reader is admitted. Runtime restore-boundary prefabs are not suitable source truth. | Blocked until product/dependency source identity is stronger. |
| Asset move/reference repair mutation | `asset.move.safe` can preflight source/destination identity only. | Mutation, reference repair, backup, rollback, and post-write verification are not implemented or admitted. | Not a discovery target for this packet. High-risk future work only. |

## Selected Safest Candidate

The selected next candidate is:

```text
product/dependency evidence substrate for asset.source.inspect
```

Reason:

- It extends an already admitted read-only surface instead of creating a new
  mutation path.
- The existing API shape already records product/dependency requests and
  unavailable evidence explicitly.
- It would improve operator readback without changing `asset.batch.process` or
  `asset.move.safe` from plan-only.
- It is the least risky bridge toward later prefab/reference graph inspection.

The next packet should be a design packet, not implementation.

## Candidate-Only Evidence Model

A future design packet should define how `asset.source.inspect` could read
product/dependency evidence only if all of these are true:

- the request names exactly one explicit project-local source path
- the source path remains inside the resolved project root
- the evidence substrate is read-only
- the evidence substrate has an explicit path, freshness story, and ownership
- missing, stale, unreadable, or unsupported evidence is reported as unavailable
  rather than simulated as complete
- product and dependency counts are bounded and reviewable
- no Asset Processor execution is triggered by inspection
- no product cache, source asset, prefab, or reference graph mutation occurs

## Required Non-Goals

This discovery packet does not:

- implement a product/dependency reader
- read or parse a live Asset Processor database
- run Asset Processor or `AssetProcessorBatch`
- move, rename, delete, or rewrite assets
- edit prefabs or repair references
- mutate product cache state
- broaden material, render, shader, build, TIAF, or Editor Python surfaces
- admit public prefab/reference graph readback
- claim product/dependency completeness

## Blockers To Resolve Before Implementation

Before any code packet, a design/readiness sequence must answer:

- Which exact product/dependency substrate is safe to read?
- Where is that substrate located relative to project root, engine root, build
  root, or cache root?
- How does the system know the evidence is fresh enough to report?
- What schema fields are allowed in persisted execution details and artifact
  metadata?
- How are missing, stale, unreadable, and unsupported evidence states reported?
- What tests prove that source-file readback remains truthful when
  product/dependency evidence is unavailable?
- What refusal boundaries prevent asset processing, asset move, reference
  repair, and prefab mutation from sneaking in through readback?

## Recommended Next Normalized Packet

Create:

```text
codex/phase-9-asset-readback-design
```

The design should cover only the selected candidate:

```text
asset.source.inspect product/dependency evidence readback
```

It should specify exact scope, non-goals, evidence fields, fallback states,
tests, schemas, and risk class. It should not implement runtime behavior or
admit a public expansion yet.

## Validation Commands For This Packet

This docs-only packet should be validated with:

```powershell
git diff --check
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_dispatcher.py -k "asset_source_inspect or asset_processor_status or asset_batch_process or asset_move_safe" -q
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "asset_source_inspect or asset_processor_status or asset_batch_process or asset_move_safe" -q
Pop-Location
git diff --cached --check
```

Run `surface-matrix-check` only if a later packet changes surface labels,
admission state, or matrix wording.

## Revert Path

Revert the commit that adds this discovery document and its index/status
pointers. No runtime cleanup, dependency cleanup, proof artifact cleanup, or
asset cleanup should be required.
