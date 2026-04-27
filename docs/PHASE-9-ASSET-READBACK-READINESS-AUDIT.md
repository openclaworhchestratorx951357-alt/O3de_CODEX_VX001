# Phase 9 Asset Readback Readiness Audit

Status: normalized phase readiness audit packet

Date: 2026-04-27

## Current Main SHA

This readiness audit was prepared from:

```text
265eb2e8a1b9730b975cf25108d7fd18995431cb
```

## Phase Workflow Stage

Readiness audit packet.

This packet audits whether the design in
`docs/PHASE-9-ASSET-READBACK-DESIGN.md` is ready to move into a proof-only or
implementation packet. It does not implement product/dependency readback, change
schemas, run Asset Processor, mutate assets, or admit any new public capability.

## Readiness Decision

`asset.source.inspect` product/dependency evidence is not ready for
implementation yet.

The current repo is ready to preserve the existing unavailable-evidence behavior
and to continue research, but it is not ready to return
`product_evidence_available: true` or `dependency_evidence_available: true`.

Reason:

- no exact read-only product/dependency evidence substrate is identified
- no official-enough source-to-product mapping is admitted
- no freshness model exists for product or dependency evidence
- no dependency/reference graph substrate is admitted
- no proof fixture or live project/cache sample is available in tracked source

## Readiness Checklist

| Gate | Status | Evidence | Implication |
| --- | --- | --- | --- |
| Existing public surface | Ready | `asset.source.inspect` is already cataloged and admitted as narrow real read-only / hybrid read-only. | Future work can remain inside the existing surface. |
| Explicit source input | Ready | `schemas/tools/asset.source.inspect.args.schema.json` includes `source_path`, `include_products`, and `include_dependencies`. | No new public tool name is needed for the candidate. |
| Project-local source identity | Ready | `backend/app/services/adapters.py` resolves the source path inside `project_root`, verifies file state, size, and SHA-256. | Current source-file readback should remain the baseline behavior. |
| Product/dependency persisted fields | Ready | Execution details and artifact metadata schemas already include product/dependency request, availability, source, count, arrays, and unavailable reason fields. | A future packet may reuse existing fields if string entries remain sufficient. |
| Unavailable behavior | Ready | Current adapter output keeps product/dependency evidence unavailable when no index is admitted. | The default behavior is truthful and should stay intact. |
| Existing targeted tests | Ready | `backend/tests/test_dispatcher.py` and `backend/tests/test_prompt_control.py` cover current unavailable product/dependency behavior. | Future changes must extend these tests instead of weakening them. |
| Exact product evidence substrate | Missing | No tracked product index, asset catalog, asset database, product asset manifest, or sidecar was found. | Product evidence must stay unavailable. |
| Exact dependency evidence substrate | Missing | No dependency graph, prefab/reference graph, asset catalog dependency reader, or sidecar was found. | Dependency evidence must stay unavailable. |
| Freshness model | Missing | No audited timestamp, generation id, Asset Processor job status, cache epoch, or source/hash correlation exists. | Evidence cannot be claimed complete or fresh. |
| Source-to-product mapping proof | Missing | No substrate proves that an explicit project-local source maps to bounded product entries. | A future reader would risk guessing. |
| Structured schema decision | Missing | Current fields are string arrays; no evidence proves whether structured objects are required. | Schema changes are not justified yet. |
| Proof fixture/live sample | Missing | No committed fixture or operator-provided project/cache sample exists for product/dependency readback. | Proof-only work is blocked until sample evidence exists. |

## Missing Gates

Before implementation or proof-only work, a future packet must identify and
audit:

1. The exact product evidence substrate.
2. The exact dependency evidence substrate.
3. The path to each substrate.
4. The admitted root that makes each substrate safe to read.
5. Whether each substrate is official enough for Phase 9 evidence.
6. How the substrate maps one explicit source path to bounded product entries.
7. How the substrate maps one explicit source path to bounded dependency
   entries.
8. How freshness is known, unknown, or stale.
9. What unavailable reason is returned for missing, stale, unreadable, or
   unsupported evidence.
10. Whether existing string arrays are sufficient or whether a separate schema
    packet is needed.
11. What fixture or live sample proves the reader without touching production
    cache or source assets.
12. What tests prove no Asset Processor execution, asset move, reference repair,
    prefab mutation, or product cache mutation is triggered by readback.

## Implementation Touchpoints For A Future Packet

Only after the missing gates are resolved, implementation should be constrained
to the narrowest likely touchpoints:

- `backend/app/services/adapters.py` for `_execute_asset_source_inspect`
- `backend/tests/test_dispatcher.py` for persisted payload and refusal coverage
- `backend/tests/test_prompt_control.py` for operator-facing prompt summary
  truthfulness
- `schemas/tools/asset.source.inspect.execution-details.schema.json` only if
  new persisted fields are required
- `schemas/tools/asset.source.inspect.artifact-metadata.schema.json` only if
  new persisted fields are required
- `schemas/tools/asset.source.inspect.result.schema.json` only if result shape
  changes
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md` only if admission labels or surface
  boundaries change

No current implementation touchpoint should be edited by this audit packet.

## Files And Paths That Must Not Be Touched

This audit and the next research packet must not touch:

- `.venv/`
- `backend/.venv/`
- `frontend/node_modules/`
- ignored runtime proof JSON under `backend/runtime/`
- restore-boundary backups under `backend/runtime/editor_state/`
- source assets, product assets, product cache, or Asset Processor cache files
- `.prefab`, `.assetinfo`, material, shader, render, build, or TIAF files
- `schemas/` unless a later schema packet proves the required field shape
- adapter, planner, catalog, policy, or dispatcher code until the substrate gate
  is resolved

Runtime restore-boundary `.prefab` files are not product/dependency source truth
for this phase and must not be used as a shortcut to prefab or reference graph
admission.

## Required Approval And Risk Class

This audit packet is low risk because it is docs-only and narrows the next
decision.

Future work risk:

- Substrate research remains low risk if it is docs-only or read-only fixture
  inventory.
- A proof-only reader is medium risk if it reads an explicitly admitted local
  fixture or cache path, adds targeted tests, and keeps public availability false
  until proven.
- Any packet that runs Asset Processor, mutates cache/source assets, repairs
  references, touches prefabs, changes dependencies, or admits public
  product/dependency completeness is high risk and requires explicit operator
  approval.

## Future Test Requirements

A future proof-only or implementation packet must add targeted tests for:

- current no-index behavior still reporting unavailable product evidence
- current no-index behavior still reporting unavailable dependency evidence
- missing source keeping product/dependency evidence unavailable
- outside-project source paths staying rejected or bounded by the existing
  simulated fallback
- admitted product substrate returning bounded product evidence
- admitted dependency substrate returning bounded dependency evidence
- stale, unreadable, missing, and unsupported substrates returning explicit
  unavailable reasons
- prompt summaries distinguishing source readback from product/dependency
  completeness
- persisted payloads passing execution-details and artifact-metadata schema
  validation
- refusal boundaries preventing Asset Processor execution, source/product
  mutation, prefab mutation, and reference repair through readback

## Safest Future Branch Name

Because this audit is not ready for implementation, the safest next branch is:

```text
codex/phase-9-asset-readback-substrate-research
```

That branch should either:

- document an operator-provided exact project/cache substrate and fixture, or
- conclude that Phase 9 product/dependency evidence should remain blocked until
  such a substrate exists.

Only after that gate is resolved should the phase move to:

```text
codex/phase-9-asset-readback-proof-only
```

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

Revert the commit that adds this readiness audit and its index/status pointers.
No runtime cleanup, dependency cleanup, proof artifact cleanup, or asset cleanup
should be required.
