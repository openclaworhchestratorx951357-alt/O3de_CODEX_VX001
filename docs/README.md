# Documentation Index

This directory holds the operating truth, architecture notes, phase checkpoints,
proof summaries, and handoff material for `O3de_CODEX_VX001`.

Use code, tests, and observed runtime behavior as stronger evidence than docs.
When docs conflict, update the docs in a narrow follow-up packet instead of
rounding up capability claims.

## Start Here

- `docs/CURRENT-STATUS.md` - current repo status, active capability boundaries,
  and next likely packets.
- `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md` - startup rules for new
  Codex threads, Supervisor Mode activation, repo-state checks, and
  project-local dependency bootstrap.
- `docs/CODEX-WORKFLOW-GOVERNOR.md` - repo-wide guard against trivial PR churn;
  use it before creating branches, commits, or PRs.
- `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md` - mandatory check before declaring
  O3DE capability work blocked; inspect read-only O3DE caches, databases,
  catalogs, generated outputs, build outputs, project files, and proof
  artifacts first.
- `docs/REPOSITORY-OPERATIONS.md` - low-friction Codex admin workflow,
  validation expectations, and self-merge rules.
- `docs/CODEX-PROJECT-WORKFLOW-QUICK-REFERENCE.md` - repo-wide workflow
  checklist for future Codex threads across all phases.
- `docs/NORMALIZED-PHASE-WORKFLOW.md` - reusable phase promotion pattern from
  baseline truth through discovery, proof-only evidence, exact admission,
  operator docs, checkpoint, and report-first cleanup.
- `docs/BRANCH-AND-PR-HYGIENE.md` - branch, PR, cleanup, and rollback hygiene.
- `docs/VALIDATION-MATRIX.md` - validation command matrix and proof boundaries.
- `docs/CAPABILITY-MATURITY-MATRIX.md` - conservative capability maturity
  baseline.
- `docs/CODEX-EVERGREEN-EXECUTION-CHARTER.md` - stable capability truth and
  maturity model.
- `docs/SLICE-START-CHECKLIST.md` - required start gate for repo work.
- `AGENTS.md` - repo-wide agent defaults.

## Current Capability Truth

- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md` is the canonical admitted-surface
  matrix.
- `docs/PHASE-8-ADMITTED-SURFACES-QUICK-REFERENCE.md` is the short future-thread
  guide for Phase 8 admitted, proof-only, blocked, and forbidden surfaces.
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-TARGET-DISCOVERY.md` is the current
  editor component/property targeting truth source.
- `docs/PHASE-8-CAMERA-BOOL-WRITE-PUBLIC-CORRIDOR.md` tracks the only exact
  admitted public component-property write corridor.
- `docs/PHASE-8-CAMERA-BOOL-CORRIDOR-CHECKPOINT.md` records the completed
  normalized Phase 8 Camera bool corridor sequence.
- `docs/PHASE-8-CAMERA-BOOL-ROLLBACK-RESTORE-DESIGN.md` defines the current
  narrow restore/revert language and future rollback gates for that corridor.
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-READINESS-AUDIT.md` audits whether the
  exact corridor is ready for a future proof-only restore/revert packet.
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-LIVE-PROOF.md` records the proof-only
  reverse-write restore evidence for the exact Camera bool corridor.
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-ADMISSION-DECISION.md` keeps that restore
  evidence proof-only while naming the future exact public corridor candidate.
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-PUBLIC-CORRIDOR.md` tracks the exact
  admitted public restore corridor for the Camera bool path.
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-REVIEW-STATUS.md` defines the
  operator-facing review/status fields for that exact restore corridor.
- `docs/PHASE-8-CAMERA-BOOL-OPERATOR-EXAMPLES.md` gives paired safe/refused
  operator prompt examples for the exact Camera bool readback, write, and
  restore corridors.
- `docs/PHASE-8-READBACK-OPERATOR-EXAMPLES.md` gives safe/refused operator
  examples for the current Phase 8 readback target map, including Camera far
  clip as readback-only.
- `docs/PHASE-8-NEXT-READ-ONLY-TARGET-DISCOVERY.md` selects Camera non-bool
  scalar readback as the next candidate-only Phase 8 read-only discovery
  direction without widening public prompts or writes.
- `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-DESIGN.md` designs a future proof-only
  read-only Camera non-bool scalar readback harness while preserving all current
  write, restore, and property-list boundaries.
- `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-READINESS-AUDIT.md` audits the Camera
  non-bool readback design as ready for a narrow proof-only implementation,
  while keeping public prompts, writes, restore, and property listing blocked.
- `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-PROOF.md` records the proof-only
  implementation boundary for Camera non-bool scalar readback, including the
  exact bool-path exclusion and unchanged public admission blocks.
- `docs/PHASE-8-CAMERA-NON-BOOL-LIVE-PROOF-PENDING-CHECKPOINT.md` records that
  the proof-only implementation is merged, but live Editor proof is pending
  because the local bridge heartbeat was stale.
- `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-LIVE-PROOF.md` records the successful
  live proof-only Camera non-bool scalar readback candidate and unchanged
  public admission boundaries.
- `docs/PHASE-8-CAMERA-FAR-CLIP-DISPOSITION-AUDIT.md` keeps the live-proven
  Camera far clip float target readback-only and names the gates for any future
  design-only write-candidate packet.
- `docs/PHASE-8-CAMERA-FAR-CLIP-READBACK-CHECKPOINT.md` checkpoints the
  live-proven Camera far clip float target as discovered-but-not-admitted and
  readback-only.
- `docs/PHASE-8-READBACK-TARGETS-CHECKPOINT.md` summarizes the current Phase 8
  readback target map, including admitted, readback-only, and blocked targets.
- `docs/PHASE-9-ASSET-READBACK-BASELINE.md` starts Phase 9 with the current
  asset/pipeline readback truth before any new asset runtime surface is widened.
- `docs/PHASE-9-ASSET-READBACK-DISCOVERY.md` records the candidate-only Phase 9
  discovery decision for product/dependency evidence behind `asset.source.inspect`.
- `docs/PHASE-9-ASSET-READBACK-DESIGN.md` designs the future read-only
  `asset.source.inspect` product/dependency evidence corridor before code work.
- `docs/PHASE-9-ASSET-READBACK-READINESS-AUDIT.md` records that the Phase 9
  product/dependency readback corridor is not ready for implementation until an
  exact read-only substrate and freshness model are identified.
- `docs/PHASE-9-ASSET-READBACK-SUBSTRATE-RESEARCH.md` records the follow-up
  substrate search and keeps product/dependency readback blocked until an
  operator-provided exact read-only sample is audited.
- `docs/PHASE-9-ASSET-READBACK-BLOCKED-CHECKPOINT.md` checkpoints Phase 9
  product/dependency readback as blocked at the substrate gate.
- `docs/PHASE-9-ASSET-READBACK-SUBSTRATE-AUDIT.md` audits the local
  `McpSandbox` Asset Processor database as the exact read-only substrate that
  unblocks a future proof-only product/dependency reader packet.
- `docs/PHASE-9-ASSET-READBACK-PROOF-ONLY.md` records the bounded proof-only
  `asset.source.inspect` product/dependency readback path through
  project-local `Cache/assetdb.sqlite`.
- `docs/PHASE-9-ASSET-READBACK-LIVE-PROOF.md` records the successful live
  proof of that read-only product/dependency readback path against
  `McpSandbox`.
- `docs/PHASE-9-ASSET-READBACK-OPERATOR-EXAMPLES.md` gives safe/refused
  operator prompt examples for the exact Phase 9 asset source/product/dependency
  readback corridor, including the proof-only Asset Catalog product-path
  presence cross-check.
- `docs/PHASE-9-ASSET-READBACK-CHECKPOINT.md` summarizes the current Phase 9
  read-only assetdb corridor, live proof, prompt guards, and remaining
  non-admitted surfaces.
- `docs/PHASE-9-ASSET-READBACK-SCHEMA-REVIEW.md` records the current decision
  to keep string-array product/dependency evidence while allowing additive
  structured schema fields.
- `docs/PHASE-9-ASSET-SOURCE-INSPECT-SCHEMA-HARDENING.md` records the
  structured schema fields for project-general `asset.source.inspect` proof
  payloads.
- `docs/PHASE-9-ASSET-READBACK-ADMISSION-DECISION.md` records the decision to
  keep the narrow read-only surface active while withholding production-general
  public admission pending freshness, platform, and operator review work.
- `docs/PHASE-9-ASSET-READBACK-READINESS-REVIEW-CONTRACT.md` defines the
  operator-facing review contract for Phase 9 freshness, selected platform,
  missing-substrate guidance, mutation flags, safest next step, and AI Asset
  Forge validation handoff.
- `docs/PHASE-9-ASSET-READBACK-REVIEW-PACKET-IMPLEMENTATION.md` records the
  runtime implementation of that review packet in `asset.source.inspect`
  execution details and artifact metadata.
- `docs/PHASE-9-ASSET-CATALOG-SUBSTRATE-DISCOVERY.md` records read-only
  discovery of `McpSandbox/Cache/pc/assetcatalog.xml` as a binary/serialized
  product-path substrate, not yet ready for implementation.
- `docs/PHASE-9-ASSET-CATALOG-PARSER-DESIGN.md` defines the no-runtime parser
  boundary for future proof-only Asset Catalog product-path presence evidence.
- `docs/PHASE-9-ASSET-CATALOG-PATH-PRESENCE-PROOF.md` records the proof-only
  implementation of read-only Asset Catalog product-path presence cross-checks
  behind `asset.source.inspect`.
- `docs/PHASE-9-ASSET-CATALOG-PATH-PRESENCE-LIVE-PROOF.md` records the live
  read-only `McpSandbox` proof of that Asset Catalog product-path presence
  cross-check.
- `docs/PHASE-9-PRODUCTION-GENERALIZATION-PLAN.md` defines how Phase 9 moves
  from local proof targets to project-general readback and names the future
  Phase 8 portability audit.
- `docs/PHASE-9-PROJECT-ASSET-READBACK-DISCOVERY.md` records the read-only
  backend discovery helper for project root, cache, database, platform catalog,
  and source-asset readiness.
- `docs/PHASE-9-PROJECT-GENERAL-ASSET-SOURCE-INSPECT-PROOF.md` records the
  proof-only integration of project-general discovery into `asset.source.inspect`
  source/product/dependency/catalog readback.
- `docs/PHASE-9-AI-ASSET-FORGE-INTEGRATION.md` explains why Phase 9 is the
  validation backbone for future O3DE AI Asset Forge generated assets.
- `docs/AI-ASSET-FORGE-LOCAL-MODEL-SUBSTRATE-AUDIT.md` selects TripoSR as the
  first proof-only local generation candidate and records the license,
  hardware, storage, provenance, and no-mutation gates before any download or
  asset generation.
- `docs/AI-ASSET-FORGE-PROMPT-INPUT-MODEL.md` defines creative/natural Forge
  prompts and the internal request translation model.
- `docs/AI-ASSET-FORGE-LOCAL-GENERATION-PROOF.md` records the first proof-only
  TripoSR local generation run outside the repo and outside O3DE projects.
- `docs/AI-ASSET-FORGE-CLEANUP-CONVERSION-PROOF.md` records the first
  proof-only cleanup/conversion pass from generated OBJ to normalized GLB
  outside the repo and outside O3DE projects.
- `docs/AI-ASSET-FORGE-O3DE-IMPORT-READINESS-DESIGN.md` defines the future
  generated-source staging convention, provenance metadata, approval gates, and
  Phase 9 readback requirements before any O3DE project mutation.
- `docs/AI-ASSET-FORGE-O3DE-SOURCE-STAGING-PROOF.md` records the first
  proof-only generated-source staging mutation into the `McpSandbox`
  generated-assets folder.
- `docs/AI-ASSET-FORGE-ASSET-PROCESSOR-VALIDATION.md` records the first
  proof-only Asset Processor validation and Phase 9 readback for a generated
  Forge GLB.
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET.md` defines the required
  generated-asset operator review packet before assignment or placement design.
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-IMPLEMENTATION.md` records the
  first proof-only backend implementation of that structured review packet
  output.
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-OPERATOR-EXAMPLES.md` provides
  safe blocked/ready decision examples for that review packet while preserving
  non-admission boundaries.
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-REVIEW-CHECKPOINT.md`
  checkpoints current review-status taxonomy and non-authorizing boundaries.
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-RELEASE-READINESS-DECISION.md`
  records the hold decision and no-broadening gates for this review stream.
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-LONG-HOLD-CHECKPOINT.md`
  checkpoints the held review posture and stream handoff boundaries.
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-BASELINE-AUDIT.md`
  audits current assignment-design candidate truth without admitting execution.
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-CONTRACT.md`
  defines bounded assignment-design contract fields and fail-closed rules.
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-READINESS-AUDIT.md`
  verifies ready vs missing gates before any assignment-design runtime packet.
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-PROOF-ONLY-IMPLEMENTATION.md`
  records the plan-only assignment-design endpoint candidate and fail-closed
  runtime checks.
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-OPERATOR-EXAMPLES.md` provides safe
  blocked/ready examples for assignment-design requests while preserving
  non-admission boundaries.
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-REVIEW-CHECKPOINT.md` checkpoints
  assignment-design status/fail-closed taxonomy and non-authorizing posture.
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-RELEASE-READINESS-DECISION.md`
  records the hold decision and no-broadening gates for assignment design.
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-LONG-HOLD-CHECKPOINT.md`
  checkpoints the held assignment-design posture and placement-lane handoff.
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-BASELINE-AUDIT.md`
  audits current placement proof/harness/evidence bridge-readiness truth before
  any runtime-admission design.
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-CONTRACT-DESIGN.md`
  defines bounded server-owned bridge-readiness contract fields and fail-closed
  no-go rules before placement-runtime admission.
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-READINESS-AUDIT.md`
  records ready vs missing placement bridge-readiness gates and preserves
  blocked runtime execution/mutation posture before proof-only implementation.
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-PROOF-ONLY-IMPLEMENTATION.md`
  records read-only bridge preflight contract signals for harness/live-proof
  surfaces while keeping placement runtime execution blocked/non-admitted.
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-OPERATOR-EXAMPLES.md`
  checkpoints safe/refused operator examples and bridge-readiness fail-closed
  vocabulary while preserving non-authorizing execution boundaries.
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-RELEASE-READINESS-DECISION.md`
  records the held release-readiness posture and no-go gates before any
  placement bridge-readiness admission broadening.
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-LONG-HOLD-CHECKPOINT.md`
  checkpoints held bridge-readiness posture and stream handoff boundaries
  before any future runtime-admission candidate movement.
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-BASELINE-AUDIT.md`
  audits current placement runtime-admission candidate truth and preserves
  explicit non-admission/no-go boundaries.
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-CONTRACT-DESIGN.md`
  defines exact runtime-admission contract design boundaries and fail-closed
  no-go rules without admitting runtime execution.
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-READINESS-AUDIT.md`
  classifies ready vs missing runtime-admission gates and keeps execution
  blocked/non-admitted while identifying bounded implementation touchpoints.
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-PROOF-ONLY-IMPLEMENTATION.md`
  records bounded proof-only runtime-admission contract/reporting fields for
  harness/live-proof surfaces while preserving blocked execution posture.
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-OPERATOR-EXAMPLES-CHECKPOINT.md`
  checkpoints safe blocked examples and runtime-contract vocabulary for
  runtime-admission harness/live-proof requests while preserving non-admission.
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-RELEASE-READINESS-DECISION.md`
  records the held runtime-admission release posture and no-go gates before any
  placement execution broadening.
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-LONG-HOLD-CHECKPOINT.md`
  checkpoints held runtime-admission posture and stream handoff boundaries
  before any future admission revisit.
- `docs/AI-ASSET-FORGE-READBACK-BRIDGE-HARDENING-AUDIT.md`
  re-audits readback bridge fail-closed/reporting-only boundaries and keeps
  execution/mutation corridors non-admitted.
- `docs/AI-ASSET-FORGE-STAGE-PLAN-EVIDENCE-REFRESH.md`
  refreshes stage-plan deterministic evidence/policy wording while preserving
  non-authorizing execution boundaries.
- `docs/AI-ASSET-FORGE-PROVIDER-PREFLIGHT-HARDENING.md`
  hardens provider preflight no-provider-call evidence wording while preserving
  blocked provider generation/runtime execution boundaries.
- `docs/AI-ASSET-FORGE-BLENDER-PREFLIGHT-HARDENING.md`
  hardens Blender preflight no-execution evidence wording while preserving
  blocked Blender prep/runtime execution boundaries.
- `docs/AI-ASSET-FORGE-PLACEMENT-READINESS-MATRIX-REFRESH.md`
  refreshes placement dry-run readiness matrix truth and fail-closed evidence
  wording while preserving blocked placement runtime execution boundaries.
- `docs/AI-ASSET-FORGE-PLACEMENT-PROOF-ONLY-ADMISSION-FLAG-DESIGN.md`
  defines placement proof-only admission-flag fail-closed state/evidence
  semantics while preserving blocked placement runtime execution boundaries.
- `docs/AI-ASSET-FORGE-PLACEMENT-PROOF-ONLY-ADMISSION-FLAG-VERIFICATION-CHECKPOINT.md`
  checkpoints verified proof-only admission-flag state/evidence permutations
  while preserving blocked placement runtime execution boundaries.
- `docs/AI-ASSET-FORGE-PLACEMENT-PROOF-ONLY-ADMISSION-FLAG-RELEASE-READINESS-DECISION.md`
  records hold/no-go release posture for the proof-only admission-flag lane
  while preserving blocked placement runtime execution boundaries.
- `docs/AI-ASSET-FORGE-PLACEMENT-PROOF-ONLY-ADMISSION-FLAG-LONG-HOLD-CHECKPOINT.md`
  checkpoints held proof-only admission-flag posture and stream handoff
  boundaries while preserving blocked placement runtime execution boundaries.
- `docs/EDITOR-PLACEMENT-PLAN-MATRIX-BASELINE-AUDIT.md`
  re-establishes plan-only editor placement matrix truth and cross-lane
  dependencies while preserving blocked execution boundaries.
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-DESIGN.md`
  defines bounded editor placement proof-only scope, fail-closed gates, and
  non-goals while preserving blocked execution boundaries.
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-READINESS-AUDIT.md`
  classifies ready vs missing proof-only editor placement gates and names exact
  bounded implementation touchpoints while preserving blocked execution
  boundaries.
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-IMPLEMENTATION.md`
  records the bounded fail-closed `editor.placement.proof_only` corridor
  implementation while preserving blocked/non-admitted execution and mutation
  boundaries.
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-OPERATOR-EXAMPLES-CHECKPOINT.md`
  checkpoints safe/refused operator examples and fail-closed reason taxonomy
  for the bounded proof-only editor placement corridor.
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-RELEASE-READINESS-DECISION.md`
  records the explicit hold/no-go decision for execution/mutation broadening
  of the bounded proof-only editor placement corridor.
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-LONG-HOLD-CHECKPOINT.md`
  checkpoints the held proof-only placement posture and stream handoff
  boundaries before any runtime-admission revisit.
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-BASELINE-AUDIT.md`
  establishes current truth and exact ready vs missing gates for a future
  editor placement runtime-admission lane without admitting execution.
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-CONTRACT-DESIGN.md`
  defines exact bounded runtime-admission contract requirements and fail-closed
  no-go boundaries without admitting execution.
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-READINESS-AUDIT.md`
  classifies ready vs missing runtime-admission gates against the contract
  design and identifies bounded implementation touchpoints.
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-PROOF-ONLY-IMPLEMENTATION.md`
  records bounded runtime-admission contract/reporting implementation deltas
  for the editor proof-only lane while preserving blocked execution/mutation.
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-OPERATOR-EXAMPLES-CHECKPOINT.md`
  checkpoints operator-facing safe/refused examples and fail-closed taxonomy
  for the contract-enriched editor proof-only lane.
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-RELEASE-READINESS-DECISION.md`
  records explicit hold/no-go posture and exact admission gates required before
  any runtime-execution broadening discussion.
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-LONG-HOLD-CHECKPOINT.md`
  checkpoints held runtime-admission posture and stream handoff boundaries
  after the release-readiness hold decision.
- `docs/ASSET-FORGE-STAGE-WRITE-ADMISSION-FLAG-VERIFICATION.md` checkpoints
  proof-only `asset_forge.o3de.stage_write.v1` admission-flag verification and
  the next stream handoff.
- `docs/BUILD-CONFIGURE-PREFLIGHT-REVIEW.md` checkpoints
  `build.configure.preflight` no-execution boundary truth and rolls stream
  handoff to build execution boundary hardening audit.
- `docs/BUILD-EXECUTION-BOUNDARY-HARDENING-AUDIT.md` checkpoints
  `build.execute.real` explicit named-target execution boundaries and rolls
  stream handoff to build execution release-readiness decision.
- `docs/BUILD-EXECUTION-RELEASE-READINESS-DECISION.md` records the explicit
  hold/no-go decision for build-execution broadening and rolls stream handoff
  to build execution long-hold checkpoint.
- `docs/BUILD-EXECUTION-LONG-HOLD-CHECKPOINT.md` checkpoints held
  build-execution posture after release-readiness decision and rolls stream
  handoff to editor narrow-corridor verification refresh.
- `docs/EDITOR-NARROW-CORRIDOR-VERIFICATION-REFRESH.md` checkpoints verified
  exact editor narrow-corridor boundary truth and rolls stream handoff to Flow
  Trigger Suite productization plan.
- `docs/FLOW-TRIGGER-SUITE-PRODUCTIZATION-PLAN.md` documents bounded local
  helper productization planning gates and rolls stream handoff to Flow Trigger
  Suite audit-gate checklist.
- `docs/FLOW-TRIGGER-SUITE-AUDIT-GATE-CHECKLIST.md` records the completed
  helper audit stop-point checklist and rolls stream handoff to Flow Trigger
  Suite productization design.
- `docs/FLOW-TRIGGER-SUITE-PRODUCTIZATION-DESIGN.md` records bounded helper
  productization contract design (non-admitting) and rolls stream handoff to
  Flow Trigger Suite security-review gate.
- `docs/FLOW-TRIGGER-SUITE-SECURITY-REVIEW-GATE.md` records completed helper
  threat/review control gates (non-admitting) and rolls stream handoff to Flow
  Trigger Suite operator-approval gate.
- `docs/FLOW-TRIGGER-SUITE-OPERATOR-APPROVAL-GATE.md` records completed helper
  operator-approval semantics (non-admitting) and rolls stream handoff to Flow
  Trigger Suite runtime-admission readiness audit.
- `docs/FLOW-TRIGGER-SUITE-RUNTIME-ADMISSION-READINESS-AUDIT.md` records
  completed readiness classification (non-admitting) and rolls stream handoff
  to Flow Trigger Suite runtime-admission contract design.
- `docs/FLOW-TRIGGER-SUITE-RUNTIME-ADMISSION-CONTRACT-DESIGN.md` records the
  exact deny-by-default runtime-admission contract/state machine
  (non-admitting) and rolls stream handoff to Flow Trigger Suite
  runtime-admission proof-only implementation.
- `docs/FLOW-TRIGGER-SUITE-RUNTIME-ADMISSION-PROOF-ONLY-IMPLEMENTATION.md`
  records bounded proof-only runtime-admission contract-evaluation vectors
  (non-admitting) and rolls stream handoff to Flow Trigger Suite
  runtime-admission operator-examples checkpoint.
- `docs/FLOW-TRIGGER-SUITE-RUNTIME-ADMISSION-OPERATOR-EXAMPLES-CHECKPOINT.md`
  records safe blocked and safe ready-for-review proof-only example taxonomy
  with deterministic fail-closed reason vocabulary and rolls stream handoff to
  Flow Trigger Suite runtime-admission release-readiness decision.
- `docs/FLOW-TRIGGER-SUITE-RUNTIME-ADMISSION-RELEASE-READINESS-DECISION.md`
  records explicit hold/no-go posture for runtime-admission broadening and
  rolls stream handoff to Flow Trigger Suite runtime-admission long-hold
  checkpoint.
- `docs/FLOW-TRIGGER-SUITE-RUNTIME-ADMISSION-LONG-HOLD-CHECKPOINT.md`
  checkpoints held Flow Trigger runtime-admission posture and stream handoff
  boundaries, then rolls app-wide focus to editor restore verification refresh.
- `docs/EDITOR-RESTORE-VERIFICATION-REFRESH.md` checkpoints exact editor
  restore-corridor verification truth and rolls stream handoff to editor
  authoring readback review packet.
- `docs/EDITOR-AUTHORING-READBACK-REVIEW-PACKET.md` checkpoints editor
  authoring readback review truth and rolls stream handoff to editor readback
  contract alignment audit.
- `docs/EDITOR-READBACK-CONTRACT-ALIGNMENT-AUDIT.md` checkpoints editor
  readback contract wording parity and rolls stream handoff to editor readback
  operator examples checkpoint.
- `docs/EDITOR-READBACK-OPERATOR-EXAMPLES-CHECKPOINT.md` checkpoints
  safe/refused editor readback operator examples and rolls stream handoff to
  editor readback release-readiness decision.
- `docs/EDITOR-READBACK-RELEASE-READINESS-DECISION.md` records explicit
  hold/no-go release posture for editor readback broadening and rolls stream
  handoff to editor readback long-hold checkpoint.
- `docs/EDITOR-READBACK-LONG-HOLD-CHECKPOINT.md` checkpoints held editor
  readback posture and stream handoff boundaries, then rolls app-wide focus to
  TIAF preflight baseline audit.
- `docs/TIAF-PREFLIGHT-BASELINE-AUDIT.md` records baseline maturity and
  no-admission boundaries for `TIAF/preflight`, then rolls app-wide focus to
  CI admission design packet.
- `docs/CI-ADMISSION-DESIGN-PACKET.md` records explicit CI/test-execution
  admission boundary design and fail-closed gate requirements, then rolls
  app-wide focus to the CI admission readiness audit packet.
- `docs/CI-ADMISSION-READINESS-AUDIT-PACKET.md` records CI/test-execution
  readiness-gate audit results and preserved non-admitting boundaries, then
  rolls app-wide focus to the CI admission proof-only harness packet.
- `docs/CI-ADMISSION-PROOF-ONLY-HARNESS-PACKET.md` records bounded
  CI/test-execution proof-only harness checkpoint posture and preserved
  non-admitting boundaries, then
  rolls app-wide focus to the CI admission release-readiness decision packet.
- `docs/CI-ADMISSION-RELEASE-READINESS-DECISION-PACKET.md` records explicit
  CI/test-execution hold/no-go release-readiness decision posture and preserved
  non-admitting boundaries, then
  rolls app-wide focus to the CI admission long-hold checkpoint packet.
- `docs/CI-ADMISSION-LONG-HOLD-CHECKPOINT-PACKET.md` records explicit
  CI/test-execution long-hold stream handoff posture and preserved
  non-admitting boundaries, then
  rolls app-wide focus to the TIAF preflight contract design packet.
- `docs/TIAF-PREFLIGHT-CONTRACT-DESIGN-PACKET.md` records explicit
  `TIAF/preflight` contract boundaries, fail-closed semantics, and
  non-admitting no-runtime-mutation posture, then
  rolls app-wide focus to the TIAF preflight readiness audit packet.
- `docs/TIAF-PREFLIGHT-READINESS-AUDIT-PACKET.md` records explicit
  `TIAF/preflight` readiness-gate classification and bounded implementation
  touchpoint inventory while preserving non-admitting no-runtime-mutation
  posture, then
  rolls app-wide focus to the TIAF preflight proof-only harness packet.
- `docs/TIAF-PREFLIGHT-PROOF-ONLY-HARNESS-PACKET.md` records bounded
  `TIAF/preflight` proof-only harness checkpoint posture and preserved
  fail-closed non-admitting boundaries, then
  rolls app-wide focus to the TIAF preflight release-readiness decision packet.
- `docs/TIAF-PREFLIGHT-RELEASE-READINESS-DECISION-PACKET.md` records explicit
  `TIAF/preflight` hold/no-go release-readiness posture and preserved
  fail-closed non-admitting boundaries, then
  rolls app-wide focus to the TIAF preflight long-hold checkpoint packet.
- `docs/TIAF-PREFLIGHT-LONG-HOLD-CHECKPOINT-PACKET.md` records explicit
  `TIAF/preflight` long-hold stream handoff posture and preserved fail-closed
  non-admitting boundaries, then
  rolls app-wide focus to the validation workflow index refresh packet.
- `docs/VALIDATION-WORKFLOW-INDEX-REFRESH-PACKET.md` records explicit
  backend/frontend validation-command index refresh truth and preserved
  non-admitting boundaries, then
  rolls app-wide focus to the validation workflow drift-guard checkpoint
  packet.
- `docs/VALIDATION-WORKFLOW-DRIFT-GUARD-CHECKPOINT-PACKET.md` records explicit
  validation-command drift-guard parity checkpoints across app-wide shell and
  workflow guidance surfaces while preserving non-admitting boundaries, then
  rolls app-wide focus to the validation workflow quick-reference packet.
- `docs/VALIDATION-WORKFLOW-QUICK-REFERENCE-PACKET.md` records one concise
  deterministic validation workflow quick-reference and preserved held-lane
  boundaries, then rolls app-wide focus to the validation workflow
  command-evidence checkpoint packet.
- `docs/VALIDATION-WORKFLOW-COMMAND-EVIDENCE-CHECKPOINT-PACKET.md` records
  explicit command-to-evidence ownership checkpoints for canonical validation
  workflow commands and preserved held-lane boundaries, then rolls app-wide
  focus to the validation workflow hold-boundary consistency packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-CONSISTENCY-PACKET.md` records
  deterministic held-lane boundary wording checkpoints for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces, then rolls app-wide
  focus to the validation workflow hold-boundary example checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-EXAMPLE-CHECKPOINT-PACKET.md`
  records operator-safe held-lane examples for `TIAF/preflight` and real
  CI/test execution while preserving canonical non-admitting wording, then
  rolls app-wide focus to the validation workflow hold-boundary wording-audit
  packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-WORDING-AUDIT-PACKET.md` records
  canonical held-lane wording parity checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  review-status parity packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-REVIEW-STATUS-PARITY-PACKET.md`
  records held-lane review-status token parity checkpoint evidence for
  `TIAF/preflight` and real CI/test execution across recommendation surfaces and
  timeline summaries, then rolls app-wide focus to the validation workflow
  hold-boundary taxonomy checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-TAXONOMY-CHECKPOINT-PACKET.md`
  records held-lane taxonomy parity checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  chronology checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-CHRONOLOGY-CHECKPOINT-PACKET.md`
  records held-lane chronology parity checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  progression integrity packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-PROGRESSION-INTEGRITY-PACKET.md`
  records held-lane progression integrity checkpoint evidence for
  `TIAF/preflight` and real CI/test execution across recommendation surfaces and
  timeline summaries, then rolls app-wide focus to the validation workflow
  hold-boundary stability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-STABILITY-CHECKPOINT-PACKET.md`
  records held-lane stability checkpoint evidence for `TIAF/preflight` and real
  CI/test execution across recommendation surfaces and timeline summaries, then
  rolls app-wide focus to the validation workflow hold-boundary resilience
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-RESILIENCE-CHECKPOINT-PACKET.md`
  records held-lane resilience checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary continuity
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-CONTINUITY-CHECKPOINT-PACKET.md`
  records held-lane continuity checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary durability
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-DURABILITY-CHECKPOINT-PACKET.md`
  records held-lane durability checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary endurance
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-ENDURANCE-CHECKPOINT-PACKET.md`
  records held-lane endurance checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary longevity
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-LONGEVITY-CHECKPOINT-PACKET.md`
  records held-lane longevity checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary
  sustainability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-SUSTAINABILITY-CHECKPOINT-PACKET.md`
  records held-lane sustainability checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  maintainability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-MAINTAINABILITY-CHECKPOINT-PACKET.md`
  records held-lane maintainability checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  adaptability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-ADAPTABILITY-CHECKPOINT-PACKET.md`
  records held-lane adaptability checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary
  operability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-OPERABILITY-CHECKPOINT-PACKET.md`
  records held-lane operability checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary
  auditability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-AUDITABILITY-CHECKPOINT-PACKET.md`
  records held-lane auditability checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary
  traceability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-TRACEABILITY-CHECKPOINT-PACKET.md`
  records held-lane traceability checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary
  provenance checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-PROVENANCE-CHECKPOINT-PACKET.md`
  records held-lane provenance checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary
  accountability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-ACCOUNTABILITY-CHECKPOINT-PACKET.md`
  records held-lane accountability checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  assurance checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-ASSURANCE-CHECKPOINT-PACKET.md`
  records held-lane assurance checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  confidence checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-CONFIDENCE-CHECKPOINT-PACKET.md`
  records held-lane confidence checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  certainty checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-CERTAINTY-CHECKPOINT-PACKET.md`
  records held-lane certainty checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  determinism checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-DETERMINISM-CHECKPOINT-PACKET.md`
  records held-lane determinism checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  repeatability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-REPEATABILITY-CHECKPOINT-PACKET.md`
  records held-lane repeatability checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  reproducibility checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-REPRODUCIBILITY-CHECKPOINT-PACKET.md`
  records held-lane reproducibility checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  predictability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-PREDICTABILITY-CHECKPOINT-PACKET.md`
  records held-lane predictability checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  reliability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-RELIABILITY-CHECKPOINT-PACKET.md`
  records held-lane reliability checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary
  availability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-AVAILABILITY-CHECKPOINT-PACKET.md`
  records held-lane availability checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary
  serviceability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-SERVICEABILITY-CHECKPOINT-PACKET.md`
  records held-lane serviceability checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  supportability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-SUPPORTABILITY-CHECKPOINT-PACKET.md`
  records held-lane supportability checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  usability checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-USABILITY-CHECKPOINT-PACKET.md`
  records held-lane usability checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  accessibility checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-ACCESSIBILITY-CHECKPOINT-PACKET.md`
  records held-lane accessibility checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  inclusivity checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-INCLUSIVITY-CHECKPOINT-PACKET.md`
  records held-lane inclusivity checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  equity checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-EQUITY-CHECKPOINT-PACKET.md`
  records held-lane equity checkpoint evidence for `TIAF/preflight` and real
  CI/test execution across recommendation surfaces and timeline summaries, then
  rolls app-wide focus to the validation workflow hold-boundary fairness
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-FAIRNESS-CHECKPOINT-PACKET.md`
  records held-lane fairness checkpoint evidence for `TIAF/preflight` and real
  CI/test execution across recommendation surfaces and timeline summaries, then
  rolls app-wide focus to the validation workflow hold-boundary impartiality
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-IMPARTIALITY-CHECKPOINT-PACKET.md`
  records held-lane impartiality checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary neutrality
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-NEUTRALITY-CHECKPOINT-PACKET.md`
  records held-lane neutrality checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary objectivity
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-OBJECTIVITY-CHECKPOINT-PACKET.md`
  records held-lane objectivity checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary
  nonpartisanship checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-NONPARTISANSHIP-CHECKPOINT-PACKET.md`
  records held-lane nonpartisanship checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  independence checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-INDEPENDENCE-CHECKPOINT-PACKET.md`
  records held-lane independence checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary autonomy
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-AUTONOMY-CHECKPOINT-PACKET.md`
  records held-lane autonomy checkpoint evidence for `TIAF/preflight` and real
  CI/test execution across recommendation surfaces and timeline summaries, then
  rolls app-wide focus to the validation workflow hold-boundary
  self-governance checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-SELF-GOVERNANCE-CHECKPOINT-PACKET.md`
  records held-lane self-governance checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  self-determination checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-SELF-DETERMINATION-CHECKPOINT-PACKET.md`
  records held-lane self-determination checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  agency checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-AGENCY-CHECKPOINT-PACKET.md`
  records held-lane agency checkpoint evidence for `TIAF/preflight` and real
  CI/test execution across recommendation surfaces and timeline summaries, then
  rolls app-wide focus to the validation workflow hold-boundary self-authorship
  checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-SELF-AUTHORSHIP-CHECKPOINT-PACKET.md`
  records held-lane self-authorship checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  self-direction checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-SELF-DIRECTION-CHECKPOINT-PACKET.md`
  records held-lane self-direction checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  self-command checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-SELF-COMMAND-CHECKPOINT-PACKET.md`
  records held-lane self-command checkpoint evidence for `TIAF/preflight` and
  real CI/test execution across recommendation surfaces and timeline summaries,
  then rolls app-wide focus to the validation workflow hold-boundary
  self-management checkpoint packet.
- `docs/VALIDATION-WORKFLOW-HOLD-BOUNDARY-SELF-MANAGEMENT-CHECKPOINT-PACKET.md`
  records held-lane self-management checkpoint evidence for `TIAF/preflight`
  and real CI/test execution across recommendation surfaces and timeline
  summaries, then rolls app-wide focus to the validation workflow hold-boundary
  release-readiness decision packet.
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-WRITE-CANDIDATE.md` tracks why broad
  component property writes remain unadmitted.
- `docs/OPERATOR-EDITOR-RUNTIME-PROOF-CHECKLIST.md` records live editor proof
  operator steps and boundaries.

## Operating Guides

- `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md`
- `docs/CODEX-WORKFLOW-GOVERNOR.md`
- `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md`
- `docs/CODEX-PROJECT-WORKFLOW-QUICK-REFERENCE.md`
- `docs/NORMALIZED-PHASE-WORKFLOW.md`
- `docs/CODEX-OPERATING-RUNBOOK.md`
- `docs/WORKFLOW-CODEX-CHATGPT.md`
- `docs/WORKTREE-STRATEGY.md`
- `docs/LOCAL-STACK-RUNBOOK.md`
- `docs/MISSION-CONTROL-RUNBOOK.md`
- `docs/APP-OPERATOR-GUIDE.md`
- `docs/GUI-CONTEXTUAL-HELP-SPEC.md`
- `docs/GUI-LAYOUT-AND-SCROLL-SPEC.md`
- `docs/GUI-OVERHAUL-BRANCH-MAP.md`

## Roadmaps And Contracts

- `docs/AI-ASSET-FORGE-PRODUCTION-ROADMAP.md`
- `docs/AI-ASSET-FORGE-O3DE-INTEGRATION-ARCHITECTURE.md`
- `docs/AI-ASSET-FORGE-PROMPT-INPUT-MODEL.md`
- `docs/AI-ASSET-FORGE-LOCAL-MODEL-SUBSTRATE-AUDIT.md`
- `docs/AI-ASSET-FORGE-LOCAL-GENERATION-PROOF.md`
- `docs/AI-ASSET-FORGE-CLEANUP-CONVERSION-PROOF.md`
- `docs/AI-ASSET-FORGE-O3DE-IMPORT-READINESS-DESIGN.md`
- `docs/AI-ASSET-FORGE-O3DE-SOURCE-STAGING-PROOF.md`
- `docs/AI-ASSET-FORGE-ASSET-PROCESSOR-VALIDATION.md`
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET.md`
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-IMPLEMENTATION.md`
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-OPERATOR-EXAMPLES.md`
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-REVIEW-CHECKPOINT.md`
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-RELEASE-READINESS-DECISION.md`
- `docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET-LONG-HOLD-CHECKPOINT.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-BASELINE-AUDIT.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-CONTRACT.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-DESIGN-READINESS-AUDIT.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-PROOF-ONLY-IMPLEMENTATION.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-OPERATOR-EXAMPLES.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-REVIEW-CHECKPOINT.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-RELEASE-READINESS-DECISION.md`
- `docs/AI-ASSET-FORGE-ENTITY-ASSIGNMENT-LONG-HOLD-CHECKPOINT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-BASELINE-AUDIT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-CONTRACT-DESIGN.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-READINESS-AUDIT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-PROOF-ONLY-IMPLEMENTATION.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-OPERATOR-EXAMPLES.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-RELEASE-READINESS-DECISION.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-BRIDGE-READINESS-LONG-HOLD-CHECKPOINT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-BASELINE-AUDIT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-CONTRACT-DESIGN.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-READINESS-AUDIT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-PROOF-ONLY-IMPLEMENTATION.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-OPERATOR-EXAMPLES-CHECKPOINT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-RELEASE-READINESS-DECISION.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-RUNTIME-ADMISSION-LONG-HOLD-CHECKPOINT.md`
- `docs/AI-ASSET-FORGE-READBACK-BRIDGE-HARDENING-AUDIT.md`
- `docs/AI-ASSET-FORGE-STAGE-PLAN-EVIDENCE-REFRESH.md`
- `docs/AI-ASSET-FORGE-PROVIDER-PREFLIGHT-HARDENING.md`
- `docs/AI-ASSET-FORGE-BLENDER-PREFLIGHT-HARDENING.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-READINESS-MATRIX-REFRESH.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-PROOF-ONLY-ADMISSION-FLAG-DESIGN.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-PROOF-ONLY-ADMISSION-FLAG-VERIFICATION-CHECKPOINT.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-PROOF-ONLY-ADMISSION-FLAG-RELEASE-READINESS-DECISION.md`
- `docs/AI-ASSET-FORGE-PLACEMENT-PROOF-ONLY-ADMISSION-FLAG-LONG-HOLD-CHECKPOINT.md`
- `docs/EDITOR-PLACEMENT-PLAN-MATRIX-BASELINE-AUDIT.md`
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-DESIGN.md`
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-READINESS-AUDIT.md`
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-IMPLEMENTATION.md`
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-OPERATOR-EXAMPLES-CHECKPOINT.md`
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-RELEASE-READINESS-DECISION.md`
- `docs/EDITOR-PLACEMENT-PROOF-ONLY-LONG-HOLD-CHECKPOINT.md`
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-BASELINE-AUDIT.md`
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-CONTRACT-DESIGN.md`
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-READINESS-AUDIT.md`
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-PROOF-ONLY-IMPLEMENTATION.md`
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-OPERATOR-EXAMPLES-CHECKPOINT.md`
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-RELEASE-READINESS-DECISION.md`
- `docs/EDITOR-PLACEMENT-RUNTIME-ADMISSION-LONG-HOLD-CHECKPOINT.md`
- `docs/asset-forge/ASSET-FORGE-PR-138-HANDOFF.md`
- `docs/asset-forge/ASSET-FORGE-MUTATION-ADMISSION-DESIGN.md`
- `docs/asset-forge/ASSET-FORGE-AUDIT-AGENT.md`
- `docs/asset-forge/ASSET-FORGE-POST-145-SAFETY-AUDIT.md`
- `docs/asset-forge/ASSET-FORGE-AUDIT-REVIEW-GATE-CHECKLIST.md`
- `docs/asset-forge/ASSET-FORGE-AUDIT-RUN-PR-150.md`
- `docs/APP-CAPABILITY-UNLOCK-PROGRAM.md`
- `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`
- `docs/NEXT-APP-WIDE-UNLOCK-PACKET.md`
- `docs/PROJECT-INSPECT-REVIEW-PACKET.md`
- `docs/SETTINGS-INSPECT-REVIEW-PACKET.md`
- `docs/SETTINGS-PATCH-CORRIDOR-HARDENING-AUDIT.md`
- `docs/SETTINGS-ROLLBACK-BOUNDARY-AUDIT.md`
- `docs/SETTINGS-ROLLBACK-VERIFICATION-CHECKPOINT.md`
- `docs/SETTINGS-ROLLBACK-RELEASE-READINESS-DECISION.md`
- `docs/SETTINGS-ROLLBACK-LONG-HOLD-CHECKPOINT.md`
- `docs/BUILD-CONFIGURE-PREFLIGHT-REVIEW.md`
- `docs/BUILD-EXECUTION-BOUNDARY-HARDENING-AUDIT.md`
- `docs/BUILD-EXECUTION-RELEASE-READINESS-DECISION.md`
- `docs/ASSET-FORGE-STAGE-WRITE-ADMISSION-FLAG-VERIFICATION.md`
- `docs/APP-GUI-SHELL-STATUS-TAXONOMY-QUICK-REFERENCE.md`
- `docs/APP-CAPABILITY-DASHBOARD-SHELL.md`
- `docs/APP-CAPABILITY-DASHBOARD-TRUTH-REFRESH-STATUS-CHIP-LINKAGE.md`
- `docs/APP-WIDE-EVIDENCE-TIMELINE-SHELL.md`
- `docs/APPROVAL-SESSION-DASHBOARD-BASELINE-AUDIT.md`
- `docs/APPROVAL-SESSION-DASHBOARD-SHELL.md`
- `docs/APPROVAL-SESSION-DASHBOARD-TRUTH-REFRESH-VALIDATION-LINKAGE.md`
- `docs/WORKSPACE-STATUS-CHIPS-SHELL.md`
- `docs/EDITOR-AUTHORING-REVIEW-RESTORE-BASELINE-AUDIT.md`
- `docs/PROJECT-CONFIG-READINESS-BASELINE-AUDIT.md`
- `docs/AUDIT-REVIEW-DASHBOARD-SHELL.md`
- `docs/AUDIT-REVIEW-DASHBOARD-TRUTH-REFRESH-STATUS-CHIP-LINKAGE.md`
- `docs/VALIDATION-REPORT-INTAKE-BASELINE-AUDIT.md`
- `docs/VALIDATION-REPORT-INTAKE-CONTRACT-DESIGN.md`
- `docs/VALIDATION-REPORT-INTAKE-DRY-RUN-PARSER-MATRIX.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-DESIGN.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-DRY-RUN-IMPLEMENTATION.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-ADMISSION-AUDIT-REVIEW.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-OPERATOR-EXAMPLES.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-REVIEW-CHECKPOINT.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-RELEASE-READINESS-DECISION.md`
- `docs/VALIDATION-REPORT-INTAKE-ENDPOINT-CANDIDATE-LONG-HOLD-CHECKPOINT.md`
- `agents/asset-forge-audit-agent/AGENTS.md`
- `agents/app-capability-audit-agent/AGENTS.md`
- `docs/PRODUCTION-REMOTE-AUTOMATION-PLAN.md`
- `docs/PRODUCTION-BUILD-ROADMAP.md`
- `docs/PHASE-6B-REMOTE-EXECUTOR-CONTRACT.md`
- `docs/PHASE-6B-EXECUTION-RECORD-MODEL.md`
- `docs/PHASE-6B-API-EVENT-CONTRACT.md`
- `docs/PHASE-6B-POLICY-AND-ADMISSION-CONTRACT.md`
- `docs/PHASE-6B-RELEASE-AND-CONFORMANCE-PLAN.md`
- `docs/PHASE-6B-IMPLEMENTATION-SEQUENCE.md`
- `docs/PHASE-6B-BACKEND-MAPPING.md`
- `docs/PHASE-6B-PERSISTENCE-CHANGESET.md`

## Phase Checkpoints And Proof Notes

- `docs/PHASE-HISTORY-INDEX.md`
- `docs/PHASE-0-REPO-AUDIT.md`
- `docs/PHASE-1-HISTORICAL-RECONSTRUCTION.md`
- `docs/PHASE-2-HISTORICAL-RECONSTRUCTION.md`
- `docs/PHASE-3-CHECKPOINT.md`
- `docs/PHASE-4-HISTORICAL-RECONSTRUCTION.md`
- `docs/PHASE-5-CHECKPOINT.md`
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/PHASE-7-REAL-ADAPTER-GATE.md`
- `docs/PHASE-7-FIRST-MUTATION-CANDIDATE.md`
- `docs/PHASE-7-PROJECT-BUILD-CANDIDATES.md`
- `docs/PHASE-7-PROJECT-INSPECT-CHECKLIST.md`
- `docs/PHASE-7-PROJECT-CONFIG-INSPECTION-CONTRACT.md`
- `docs/PHASE-7-GEM-STATE-REFINEMENT-CONTRACT.md`
- `docs/PHASE-7-SETTINGS-GEM-INSPECTION-CHECKLIST.md`
- `docs/PHASE-7-SETTINGS-GEM-CANDIDATES.md`
- `docs/PHASE-8-GUARDED-AUTONOMY-PROGRAM.md`
- `docs/PHASE-8-ADMITTED-SURFACES-QUICK-REFERENCE.md`
- `docs/PHASE-8-EDITOR-CANDIDATE-MUTATION-ENVELOPE.md`
- `docs/PHASE-8-CAMERA-SCALAR-WRITE-CANDIDATE-DESIGN.md`
- `docs/PHASE-8-CAMERA-SCALAR-WRITE-READINESS-AUDIT.md`
- `docs/PHASE-8-CAMERA-SCALAR-WRITE-LIVE-PROOF.md`
- `docs/PHASE-8-CAMERA-SCALAR-WRITE-ADMISSION-DECISION.md`
- `docs/PHASE-8-CAMERA-BOOL-WRITE-PUBLIC-CORRIDOR.md`
- `docs/PHASE-8-CAMERA-BOOL-CORRIDOR-CHECKPOINT.md`
- `docs/PHASE-8-CAMERA-BOOL-ROLLBACK-RESTORE-DESIGN.md`
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-READINESS-AUDIT.md`
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-LIVE-PROOF.md`
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-ADMISSION-DECISION.md`
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-PUBLIC-CORRIDOR.md`
- `docs/PHASE-8-CAMERA-BOOL-RESTORE-REVIEW-STATUS.md`
- `docs/PHASE-8-CAMERA-BOOL-OPERATOR-EXAMPLES.md`
- `docs/PHASE-8-READBACK-OPERATOR-EXAMPLES.md`
- `docs/PHASE-8-EDITOR-COMPONENT-FIND-LIVE-PROOF.md`
- `docs/PHASE-8-EDITOR-PROPERTY-TARGET-READBACK-PROOF.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-LIST-BRIDGE-CANDIDATE.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-TARGET-DISCOVERY.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-WRITE-CANDIDATE.md`
- `docs/PHASE-8-EDITOR-SCALAR-PROPERTY-TARGET-DISCOVERY.md`
- `docs/PHASE-8-EDITOR-COMMENT-SCALAR-TARGET-DISCOVERY.md`
- `docs/PHASE-8-NEXT-READ-ONLY-TARGET-DISCOVERY.md`
- `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-DESIGN.md`
- `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-READINESS-AUDIT.md`
- `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-PROOF.md`
- `docs/PHASE-8-CAMERA-NON-BOOL-LIVE-PROOF-PENDING-CHECKPOINT.md`
- `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-LIVE-PROOF.md`
- `docs/PHASE-8-CAMERA-FAR-CLIP-DISPOSITION-AUDIT.md`
- `docs/PHASE-8-CAMERA-FAR-CLIP-READBACK-CHECKPOINT.md`
- `docs/PHASE-8-READBACK-TARGETS-CHECKPOINT.md`
- `docs/PHASE-9-ASSET-READBACK-BASELINE.md`
- `docs/PHASE-9-ASSET-READBACK-DISCOVERY.md`
- `docs/PHASE-9-ASSET-READBACK-DESIGN.md`
- `docs/PHASE-9-ASSET-READBACK-READINESS-AUDIT.md`
- `docs/PHASE-9-ASSET-READBACK-SUBSTRATE-RESEARCH.md`
- `docs/PHASE-9-ASSET-READBACK-BLOCKED-CHECKPOINT.md`
- `docs/PHASE-9-ASSET-READBACK-SUBSTRATE-AUDIT.md`

## Evidence And Inventory

- `docs/PERSISTED-SCHEMA-COVERAGE-CHECKPOINT.md`
- `docs/UNPUBLISHED-WORKTREE-INVENTORY.md`
- `docs/BRANCH-CLEANUP-REPORT-2026-04-26.md`
- `docs/BRANCH-CLEANUP-REPORT-2026-04-26-PHASE-8-CAMERA-WRITE.md`
- `docs/BRANCH-CLEANUP-REPORT-2026-04-26-CAMERA-RESTORE.md`
- `docs/BRANCH-CLEANUP-REPORT-SUPERVISOR-BATCH-01.md`
- `docs/BRANCH-CLEANUP-REPORT-SUPERVISOR-BATCH-02.md`
- `docs/BRANCH-CLEANUP-REPORT-SUPERVISOR-BATCH-03-CONTROL-PLANE.md`
- `docs/CONTROL-PLANE-BRANCH-REVIEW-INVENTORY-2026-04-26.md`
- `docs/FINAL-REMAINING-BRANCH-PURPOSE-MAP.md`
- `docs/PRODUCTION-BASELINE-BRANCH-REVIEW.md`
- `docs/GITHUB-BRANCH-HYGIENE-SETTINGS-RECOMMENDATION.md`
- `docs/REMOTE-CONTROL-BRIDGE-LESSONS.md`
- `docs/OPERATOR-EDITOR-RUNTIME-PROOF-CHECKLIST.md`

Missing or uneven historical phase docs should be backfilled as reconstructed
history in a dedicated docs-only packet. Reconstructed docs must mark unknowns
as unknown and cite evidence rather than inventing phase claims.
