# Capability Maturity Matrix

Status: documentation baseline

Purpose: give future agents a conservative capability map using the maturity
ladder from `docs/CODEX-EVERGREEN-EXECUTION-CHARTER.md`.

This document does not admit new behavior. Code, targeted tests, runtime proofs,
and `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md` remain stronger evidence than
this summary.

## Maturity Labels

| Level | Label | Meaning |
| --- | --- | --- |
| M0 | missing | No meaningful implementation path exists. |
| M1 | contract-only | Names, contracts, schemas, policy, or roadmap exist without dependable execution. |
| M2 | simulated fallback | The system can produce a simulated result, but not the real operation. |
| M3 | plan-only | The system can truthfully preflight or plan, but not safely execute the operation. |
| M4 | gated real | A real path exists only inside a tightly admitted or proof-only scope. |
| M5 | real but narrow | A dependable real path exists for a constrained production subset. |
| M6 | reviewable real | Real behavior has truthful readback, verification, or operator-facing evidence. |
| M7 | reversible real | Reviewable real behavior has tested rollback, reverse, or restore semantics. |
| M8 | scalable admitted-real | The capability is narrow, documented, ergonomic, and safe to widen incrementally. |

## Current Baseline

| Capability or surface | Current maturity | Evidence | Notes |
| --- | --- | --- | --- |
| `project.inspect` | M6 reviewable real | `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`, Phase 7 docs | Real read-only hybrid path with provenance and requested-vs-discovered evidence. |
| `settings.patch` | M7 reversible real, narrow | surface matrix, Phase 7 docs/tests | Manifest-backed mutation lane with backup, readback, and rollback expectations. Keep scope narrow. |
| `gem.enable` | M7 reversible real, narrow | surface matrix | Explicit local `project.json` top-level `gem_names` insertion only. |
| `render.material.patch` | M7 reversible real, narrow | surface matrix | Explicit local `.material` top-level `propertyValues` overrides only. |
| `build.configure` | M3 plan-only | surface matrix | Real preflight/planning when `dry_run=true`; no configure mutation admission. |
| `build.compile` | M4 gated real | surface matrix | Real execution-gated for explicit named targets; no broad cleanup or rollback claim. |
| `asset.processor.status` | M5 real but narrow | surface matrix | Narrow read-only runtime/process evidence. |
| `asset.source.inspect` | M6 reviewable real, narrow; project-general proof-only readback candidate | surface matrix, Phase 9 proof docs, `docs/PHASE-9-PRODUCTION-GENERALIZATION-PLAN.md`, `docs/PHASE-9-PROJECT-ASSET-READBACK-DISCOVERY.md`, `docs/PHASE-9-PROJECT-GENERAL-ASSET-SOURCE-INSPECT-PROOF.md`, `docs/PHASE-9-ASSET-SOURCE-INSPECT-SCHEMA-HARDENING.md`, `docs/PHASE-9-ASSET-READBACK-ADMISSION-DECISION.md`, `docs/PHASE-9-ASSET-READBACK-READINESS-REVIEW-CONTRACT.md`, `docs/PHASE-9-ASSET-READBACK-REVIEW-PACKET-IMPLEMENTATION.md` | Narrow project-local source metadata plus bounded read-only `Cache/assetdb.sqlite` product/dependency evidence and Asset Catalog product-path presence for one explicit source asset. The adapter uses project-general discovery inputs, fails closed for missing project/cache/catalog/source conditions, has published structured proof schema fields, and now emits an operator-facing review packet with freshness labels, selected project/platform/source/product/dependency/catalog summaries, missing-substrate guidance, mutation flags, safest next step, and AI Asset Forge handoff placeholders. Public production-general admission is still withheld. |
| `ai.asset.generate.local` | M2 proof-only local | `docs/AI-ASSET-FORGE-PRODUCTION-ROADMAP.md`, `docs/AI-ASSET-FORGE-LOCAL-MODEL-SUBSTRATE-AUDIT.md`, `docs/AI-ASSET-FORGE-LOCAL-GENERATION-PROOF.md` | TripoSR generated one raw OBJ mesh from an upstream example input outside the repo and outside O3DE projects. No generated asset is committed, no O3DE import is admitted, and production use remains blocked pending cleanup/conversion, provenance, review, Phase 9 readback, and admission gates. |
| `ai.asset.cleanup.convert` | M2 proof-only local | `docs/AI-ASSET-FORGE-PRODUCTION-ROADMAP.md`, `docs/AI-ASSET-FORGE-O3DE-INTEGRATION-ARCHITECTURE.md`, `docs/AI-ASSET-FORGE-CLEANUP-CONVERSION-PROOF.md` | The generated TripoSR OBJ was inspected, normalized to unit scale, and exported as a GLB outside the repo and outside O3DE projects. No converted asset is committed, no O3DE import is admitted, and Blender automation remains unproven. |
| `ai.asset.import.stage` | M2 proof-only sandbox staging | `docs/AI-ASSET-FORGE-PRODUCTION-ROADMAP.md`, `docs/AI-ASSET-FORGE-O3DE-IMPORT-READINESS-DESIGN.md`, `docs/AI-ASSET-FORGE-O3DE-SOURCE-STAGING-PROOF.md` | One generated GLB and one provenance metadata file were staged into `McpSandbox/Assets/Generated/triposr_chair_001/` with explicit operator approval. The staged source has now been processed in a later validation packet, but public import/assignment/placement remain blocked. |
| `ai.asset.provenance.record` | M1 planned | `docs/AI-ASSET-FORGE-PRODUCTION-ROADMAP.md`, `docs/AI-ASSET-FORGE-O3DE-INTEGRATION-ARCHITECTURE.md` | Provenance fields are planned for backend/model/prompt/license/hash/source/product/review evidence. No store or schema is implemented. |
| `ai.asset.o3de.readback.verify` | M4 proof-only generated-asset AP/readback validation | `docs/PHASE-9-AI-ASSET-FORGE-INTEGRATION.md`, `docs/PHASE-9-PROJECT-ASSET-READBACK-DISCOVERY.md`, `docs/PHASE-9-PROJECT-GENERAL-ASSET-SOURCE-INSPECT-PROOF.md`, `docs/PHASE-9-ASSET-SOURCE-INSPECT-SCHEMA-HARDENING.md`, `docs/PHASE-9-ASSET-READBACK-ADMISSION-DECISION.md`, `docs/PHASE-9-ASSET-READBACK-READINESS-REVIEW-CONTRACT.md`, `docs/PHASE-9-ASSET-READBACK-REVIEW-PACKET-IMPLEMENTATION.md`, `docs/AI-ASSET-FORGE-O3DE-SOURCE-STAGING-PROOF.md`, `docs/AI-ASSET-FORGE-ASSET-PROCESSOR-VALIDATION.md` | Future generated assets must use Phase 9 source/product/dependency/catalog readback. One generated GLB has been staged into the sandbox, processed by Asset Processor, and verified through read-only Asset Database plus Asset Catalog evidence: one GLB source row, 15 product rows, 21 product-dependency rows, and representative catalog product-path presence. The proof is still bounded to `McpSandbox/triposr_chair_001`; operator review, public import admission, assignment, and placement remain blocked. |
| `ai.asset.operator.review` | M1 contract-only | `docs/AI-ASSET-FORGE-O3DE-INTEGRATION-ARCHITECTURE.md`, `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET.md` | Operator review packet fields, statuses, decisions, blocked rules, and first proof-target mapping are defined. No UI/backend review implementation exists yet, and no assignment, placement, public import, or production-use approval is admitted. |
| `ai.asset.assign.to.entity` | M0 blocked/not admitted | `docs/AI-ASSET-FORGE-PRODUCTION-ROADMAP.md`, `docs/PHASE-9-AI-ASSET-FORGE-INTEGRATION.md` | Generated asset assignment and placement require later design, proof, exact admission, and restore/rollback discipline. No public corridor is admitted. |
| `asset.batch.process` | M3 plan-only | surface matrix | Real preflight/result-truth corridor, no asset processing execution. |
| `asset.move.safe` | M3 plan-only | surface matrix | Real identity/preflight corridor, no move/reference-repair mutation. |
| `render.capture.viewport` | M5 real but narrow | surface matrix | Narrow runtime-probe evidence; does not imply broad render automation. |
| `render.material.inspect` | M5 real but narrow | surface matrix | Local `.material` readback evidence; no shader-state expansion. |
| `render.shader.rebuild` | M3 plan-only | surface matrix | Shader preflight/result-truth only. |
| `test.visual.diff` | M5 real but narrow | surface matrix | Narrow read-only image artifact evidence. |
| `test.run.gtest` | M3 plan-only | surface matrix | Runner inventory/preflight truth only; no broad test execution admission. |
| `test.run.editor_python` | M3 plan-only | surface matrix | Editor Python test preflight truth only; not arbitrary Editor Python execution. |
| `test.tiaf.sequence` | M3 plan-only | surface matrix | TIAF sequence preflight/result-truth only. |
| `editor.session.open` | M5 real but narrow | Phase 8 docs, surface matrix | Real on verified `McpSandbox` bridge wiring. |
| `editor.level.open` | M5 real but narrow | Phase 8 docs, surface matrix | Real on verified `McpSandbox` bridge wiring. |
| `editor.entity.create` | M6 reviewable real, narrow | Phase 8 proof docs, surface matrix | Root-level named entity creation inside bounded proof/admitted chain. Restore discipline exists for proof scope, but no generalized undo claim. |
| `editor.component.add` | M6 reviewable real, narrow | Phase 8 proof docs, surface matrix | Allowlisted component add inside bounded proof/admitted chain; returned component ids carry live provenance. |
| `editor.entity.exists` | M6 reviewable real | Phase 8 docs, surface matrix | Hybrid read-only exact entity id/name lookup on loaded/current level. |
| `editor.component.find` | M6 reviewable real | `docs/PHASE-8-EDITOR-COMPONENT-FIND-LIVE-PROOF.md`, surface matrix | Read-only live component target binding with `admitted_runtime_component_discovery_result`. |
| `editor.component.property.get` | M6 reviewable real | `docs/PHASE-8-EDITOR-PROPERTY-TARGET-READBACK-PROOF.md`, surface matrix | Explicit runtime-proven component id plus known property path. |
| `editor.component.property.list` | M4 proof-only gated real | `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-LIST-BRIDGE-CANDIDATE.md` | Live-proven proof-only bridge/runtime path. Not Prompt Studio, dispatcher/catalog, or `/adapters` admitted. |
| scalar property target discovery | M4 proof-only gated real | Phase 8 scalar/comment target docs | Read-only discovery/proof corridor only. Camera bool was selected as the first scalar readback candidate and now has a separate exact public corridor; discovery itself remains proof-only. |
| Camera scalar bool write proof | M4 proof-only gated real | `docs/PHASE-8-CAMERA-SCALAR-WRITE-LIVE-PROOF.md` | One exact Camera bool write/restore harness is live-proven for `Camera :: Controller\|Configuration\|Make active camera on activation? :: bool`. The proof harness remains private/proof-only and is reused as evidence for the exact corridor; it is not a generic write surface. |
| `editor.component.property.write.camera_bool_make_active_on_activation` | M6 reviewable real, exact; portability audit pending | `docs/PHASE-8-CAMERA-BOOL-WRITE-PUBLIC-CORRIDOR.md`, proof harness tests, dispatcher/catalog/prompt tests, `docs/PHASE-9-PRODUCTION-GENERALIZATION-PLAN.md` | Exact public approval-gated corridor for only `Camera :: Controller\|Configuration\|Make active camera on activation? :: bool`. Requires bool value, live component id provenance from admitted component add, pre-read/write/post-read verification, and narrow restore/revert guidance. The proof harness has verified restore, but the public corridor must not be described as generalized undo or as proof that every project/entity exposes the same Camera component/property path. |
| Camera bool restore proof | M4 proof-only gated real | `docs/PHASE-8-CAMERA-BOOL-RESTORE-LIVE-PROOF.md` | One exact proof-only reverse-write restore harness is live-proven for `Camera :: Controller\|Configuration\|Make active camera on activation? :: bool`. It verifies before value, inverse write, changed readback, restore value, restored readback, and loaded-level cleanup restore. It does not admit public restore/revert or generalized undo. |
| `editor.component.property.restore.camera_bool_make_active_on_activation` | M6 reviewable real, exact | `docs/PHASE-8-CAMERA-BOOL-RESTORE-PUBLIC-CORRIDOR.md`, `docs/PHASE-8-CAMERA-BOOL-RESTORE-LIVE-PROOF.md` | Exact public approval-gated restore corridor for only `Camera :: Controller\|Configuration\|Make active camera on activation? :: bool`. Requires recorded bool before-value evidence, live component id provenance from admitted component add, current/restore/readback verification, and `generalized_undo_available: false`. It is not generic restore or generalized undo. |
| `editor.component.property.write` | M1 public contract/candidate only | `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-WRITE-CANDIDATE.md`, `docs/PHASE-8-CAMERA-SCALAR-WRITE-CANDIDATE-DESIGN.md`, `docs/PHASE-8-CAMERA-SCALAR-WRITE-LIVE-PROOF.md`, `docs/PHASE-8-CAMERA-SCALAR-WRITE-ADMISSION-DECISION.md`, `docs/PHASE-8-CAMERA-BOOL-WRITE-PUBLIC-CORRIDOR.md` | Broad public property-write remains refused/unimplemented. The admitted Camera bool corridor is exact and must not be treated as generalized component/property writing. |
| editor candidate mutation envelope | M1 contract/candidate only | `docs/PHASE-8-EDITOR-CANDIDATE-MUTATION-ENVELOPE.md` | Broader editor mutation remains refused. |
| remote executor substrate | M0/M1 missing to contract-only | surface matrix, Phase 6B docs | Contracts exist, production-grade remote executor is not implemented. |
| approval, policy, and lock bookkeeping | M5 real but surface-dependent | backend services/tests, surface matrix | Core bookkeeping is real; per-surface hardening varies by tool row. |
| artifact/log/summary bookkeeping | M5 real but surface-dependent | backend services/tests, surface matrix | Persistence/linkage exists; release-grade remote streaming remains incomplete. |
| frontend operator console | M5 real but narrow | frontend code/tests/docs | Frontend is real; several operator-lane aids are browser-session local and must not be described as backend persistence. |

## Non-Admitted Or Needs Verification

| Area | Classification | Required next evidence |
| --- | --- | --- |
| arbitrary shell execution as prompt surface | forbidden | Do not implement without explicit high-risk approval. |
| arbitrary Python execution as prompt surface | forbidden | Do not implement without explicit high-risk approval. |
| arbitrary Editor Python as prompt surface | forbidden | Keep refused outside proof-only typed bridge operations. |
| asset/material/render broad mutation | not admitted | Dedicated proof, review, backup, and rollback plan per surface. |
| broad property writes | not admitted | Read-only scalar target proof, exact allowlist, write proof, restore proof. |
| live Editor undo | not proven | Explicit live undo or restore proof before any claim. |
| viewport reload after restore | not proven | Explicit proof before any claim. |
| generalized cleanup/reversibility | not proven | Per-operation restore/rollback evidence before any claim. |

## Maintenance Rule

Update this matrix when a PR changes capability maturity or when a proof
meaningfully downgrades a claim.

Do not update this matrix to "round up" a capability. If evidence is unclear,
mark the row as needs verification.
