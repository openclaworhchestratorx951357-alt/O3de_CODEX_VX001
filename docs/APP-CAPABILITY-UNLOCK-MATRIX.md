# App Capability Unlock Matrix

Conservative baseline as of current `main`. When uncertain, mark `needs baseline`.

| Domain | Capability | Current maturity | Desired next maturity | Risk | Required gate | Tests/evidence required | Recommended next packet |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Editor | `editor.session.open` | admitted-real (narrow runtime) | reviewable | Medium | runtime truth + audit review | targeted editor runtime tests + evidence sample | Editor placement plan matrix |
| Editor | `editor.level.open` | admitted-real (narrow runtime) | reviewable | Medium | runtime truth + audit review | targeted editor runtime tests + evidence sample | Editor placement plan matrix |
| Editor | `editor.entity.create` | admitted-real (narrow) | reviewable | High | bounded mutation scope + audit review | targeted mutation-chain tests + restore-boundary evidence | Editor restore verification refresh |
| Editor | `editor.component.add` | admitted-real (narrow) | reviewable | High | bounded mutation scope + audit review | targeted mutation-chain tests + component-id provenance evidence | Editor restore verification refresh |
| Editor | `editor.component.property.get` | read-only | reviewable | Medium | schema/contract alignment | readback tests + response schema checks | Editor authoring readback review packet |
| Editor | `editor.component.property.write.narrow` | admitted-real (exact narrow corridor) | reviewable | High | existing exact corridor gates + audit review | corridor regression tests + revert proof | Editor narrow-corridor verification refresh |
| Editor | `editor.content.restore.narrow` | admitted-real (exact narrow corridor) | reviewable | High | existing exact corridor gates + audit review | restore regression tests + bounded revert proof | Editor restore verification refresh |
| Editor | `editor.placement.plan` | plan-only | dry-run only | Medium | bounded plan schema + audit review | dry-run-only tests + blocked execution proof | Editor placement plan matrix |
| Editor | `editor.placement.proof_only` | missing | plan-only | High | explicit admission decision | design doc + fail-closed gate list | Editor placement proof-only design |
| Asset Forge | `asset_forge.provider.preflight` | preflight-only | reviewable | Medium | no-provider-call guard + audit review | tests proving no provider execution | Asset Forge provider preflight hardening |
| Asset Forge | `asset_forge.blender.inspect` | preflight-only | reviewable | Medium | no-execution guard + audit review | tests proving no Blender execution | Asset Forge Blender preflight hardening |
| Asset Forge | `asset_forge.o3de.stage_plan` | dry-run only | reviewable | Medium | dry-run contract + fail-closed tests | dry-run matrix tests + evidence payloads | Asset Forge stage-plan evidence refresh |
| Asset Forge | `asset_forge.o3de.stage_write.v1` | proof-only | gated execution | High | explicit admission flag + exact path/hash gates | fail-closed tests + post-write readback + revert evidence | Proof-only admission-flag verification packet |
| Asset Forge | `asset_forge.o3de.readback_bridge` | proof-only | reviewable | High | bridge gate + read-only evidence policy | readback tests + artifact evidence checks | Readback bridge hardening audit |
| Asset Forge | `asset_forge.placement.readiness` | dry-run only | reviewable | Medium | placement dry-run contract | dry-run tests + blocked execution proof | Placement readiness matrix refresh |
| Asset Forge | `asset_forge.placement.proof` | plan-only | dry-run only | High | explicit admission flag design | fail-closed design/tests checklist | Placement proof-only admission-flag design |
| Project/Config | `project.inspect` | read-only | reviewable | Medium | contract alignment + audit review | read-only tests + schema evidence | Project inspect review packet |
| Project/Config | `settings.inspect` | read-only | reviewable | Medium | contract alignment + audit review | read-only tests + schema evidence | Settings inspect review packet |
| Project/Config | `settings.patch.narrow` | admitted-real (narrow mutation-gated) | reversible | High | explicit narrow scope + revert proof | mutation-path tests + backup/readback/revert evidence | Settings patch corridor hardening audit |
| Project/Config | `settings.rollback` | reviewable (through bounded patch rollback evidence) | reversible | High | rollback design contract | rollback-path tests + revert evidence | Settings rollback boundary audit |
| Project/Config | `build.configure.preflight` | preflight-only | reviewable | Medium | no-build-exec guard + audit review | tests proving configure-only behavior | Build configure preflight review |
| Project/Config | `build.execute.real` | gated execution (explicit named targets) | reviewable | Critical | explicit admission program + operator approval | execution-gate tests + timeout/log/readback evidence | Build execution boundary hardening audit |
| Validation | `validation.report.intake` | dispatch-registration readiness-audited (default-off scaffolding; endpoint-candidate read-only remains admitted) | dispatch-registration implementation-gated | Medium | schema + provenance + fail-closed parser + server-owned authorization gate + dispatch design + readiness + implementation + decision checkpoint + catalog registration design + registration readiness audit closure | parser unit tests + endpoint gate-state review tests + dispatch refusal regression tests + dispatch gate-state transition tests + intake schema set + dispatcher gate-state tests | Validation intake dispatch-admission catalog registration implementation touchpoint packet |
| Validation | `backend.test.run` | admitted-real (local workflow) | reviewable | Low | command boundary docs | deterministic command evidence | Validation workflow index refresh |
| Validation | `frontend.test.run` | admitted-real (local workflow) | reviewable | Low | command boundary docs | deterministic command evidence | Validation workflow index refresh |
| Validation | `TIAF/preflight` | needs baseline | preflight-only | Medium | no-runtime-mutation gate | preflight contract tests + artifact checks | TIAF preflight baseline audit |
| Validation | `real CI/test execution` | needs baseline | plan-only | High | explicit CI admission decision | CI surface inventory + gate design | CI admission design packet |
| GUI | `app.capability.dashboard` | GUI/demo only | reviewable | Medium | truth-label contract + audit review | component tests + fixture truth checks | App-wide dashboard truth refresh + editor lane linkage |
| GUI | `audit.review.dashboard` | GUI/demo only | reviewable | Medium | truth-label contract + audit review | component tests + fixture truth checks | Audit dashboard truth refresh + validation linkage |
| GUI | `approval.session.dashboard` | GUI/demo only (static approval/session shell) | reviewable | Medium | no-authorization-client-field rule + audit review | UI tests for intent-only and fail-closed labels | Validation intake endpoint-candidate admission design |
| GUI | `evidence.timeline` | GUI/demo only (static timeline shell) | reviewable | Medium | truth-label contract + audit review | fixture validation + UI rendering tests | Validation intake endpoint-candidate admission design |
| GUI | `workspace.status.chips` | GUI/demo only (static workspace-status shell) | reviewable | Low | truthful label taxonomy + audit review | UI tests for maturity/risk/status chips | Validation intake endpoint-candidate admission design |
| Automation | `codex.flow.trigger.local` | local helper (non-productized) | docs/spec only | Low | local-only boundary + ignore rules | docs audit + no-runtime-impact verification | Flow Trigger Suite productization plan |
| Automation | `codex.flow.trigger.audit_gate` | missing | docs/spec only | Medium | audit stop-point contract | governance doc + checklist template | Flow Trigger Suite audit-gate checklist |
| Automation | `codex.flow.trigger.productized` | missing | plan-only | High | security/review gate + operator approval | design + threat model + CI policy checks | Flow Trigger Suite productization design |
