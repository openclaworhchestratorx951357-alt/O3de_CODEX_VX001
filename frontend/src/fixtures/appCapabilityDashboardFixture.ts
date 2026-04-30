import type { WorkspaceStatusTaxonomy } from "./appWorkspaceStatusChipsFixture";

export type CapabilityMaturity =
  | "missing"
  | "docs/spec only"
  | "GUI/demo only"
  | "plan-only"
  | "dry-run only"
  | "read-only"
  | "preflight-only"
  | "proof-only"
  | "gated execution"
  | "admitted-real"
  | "reviewable"
  | "reversible"
  | "production-ready"
  | "needs baseline"
  | "hold-default-off"
  | "blocked";

export type CapabilityRisk = "Low" | "Medium" | "High" | "Critical";

export type AppCapabilityDashboardRow = {
  domain: string;
  capability: string;
  currentMaturity: CapabilityMaturity;
  desiredNextMaturity: CapabilityMaturity;
  statusTaxonomy: WorkspaceStatusTaxonomy;
  risk: CapabilityRisk;
  requiredGate: string;
  recommendedNextPacket: string;
};

export const appCapabilityDashboardFixtureGeneratedAt = "2026-04-30";

export const appCapabilityDashboardRows: readonly AppCapabilityDashboardRow[] = [
  {
    domain: "Validation",
    capability: "validation.report.intake",
    currentMaturity: "hold-default-off",
    desiredNextMaturity: "hold-default-off",
    statusTaxonomy: "hold-default-off",
    risk: "Medium",
    requiredGate: "server-owned gate states + fail-closed refusal matrix",
    recommendedNextPacket: "Maintain hold unless explicit future admission packet is approved",
  },
  {
    domain: "Project/Config",
    capability: "project.inspect",
    currentMaturity: "read-only",
    desiredNextMaturity: "reviewable",
    statusTaxonomy: "admitted-real",
    risk: "Medium",
    requiredGate: "manifest-backed contract alignment + provenance review truth",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "Project/Config",
    capability: "settings.inspect",
    currentMaturity: "read-only",
    desiredNextMaturity: "reviewable",
    statusTaxonomy: "admitted-real",
    risk: "Medium",
    requiredGate: "project.inspect include_settings contract + requested_settings_keys evidence truth",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "Asset Forge",
    capability: "asset_forge.o3de.stage_write.v1",
    currentMaturity: "proof-only",
    desiredNextMaturity: "gated execution",
    statusTaxonomy: "proof-only",
    risk: "High",
    requiredGate: "explicit admission flag + exact path/hash gates",
    recommendedNextPacket: "Proof-only admission-flag verification packet",
  },
  {
    domain: "Project/Config",
    capability: "settings.patch.narrow",
    currentMaturity: "admitted-real",
    desiredNextMaturity: "reversible",
    statusTaxonomy: "admitted-real",
    risk: "High",
    requiredGate:
      "explicit narrow scope + manifest backup + post-write verification + bounded rollback-class evidence",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "Project/Config",
    capability: "settings.rollback",
    currentMaturity: "reviewable",
    desiredNextMaturity: "reversible",
    statusTaxonomy: "admitted-real",
    risk: "High",
    requiredGate: "rollback class boundary verification + backup identity linkage + post-rollback readback evidence",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "Project/Config",
    capability: "build.configure.preflight",
    currentMaturity: "preflight-only",
    desiredNextMaturity: "reviewable",
    statusTaxonomy: "admitted-real",
    risk: "Medium",
    requiredGate:
      "dry_run-only preflight semantics + no configure command execution + explicit fallback classification",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "Project/Config",
    capability: "build.execute.real",
    currentMaturity: "gated execution",
    desiredNextMaturity: "reviewable",
    statusTaxonomy: "admitted-real",
    risk: "Critical",
    requiredGate:
      "explicit named target + approval token + timeout/log/result evidence + no broad build-execution or cleanup claims",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "Editor",
    capability: "editor.component.property.get",
    currentMaturity: "read-only",
    desiredNextMaturity: "reviewable",
    statusTaxonomy: "admitted-real",
    risk: "Medium",
    requiredGate: "readback contract alignment + operator examples + release-readiness hold/no-go decision + long-hold checkpoint + requested-path evidence truth",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "Editor",
    capability: "editor.component.property.write.narrow",
    currentMaturity: "admitted-real",
    desiredNextMaturity: "reviewable",
    statusTaxonomy: "admitted-real",
    risk: "High",
    requiredGate: "existing exact corridor gates + regression-check evidence across capability/audit/status/timeline surfaces",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "GUI",
    capability: "app.capability.dashboard",
    currentMaturity: "GUI/demo only",
    desiredNextMaturity: "reviewable",
    statusTaxonomy: "demo",
    risk: "Medium",
    requiredGate: "truth-label contract + status-taxonomy alignment",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "GUI",
    capability: "audit.review.dashboard",
    currentMaturity: "GUI/demo only",
    desiredNextMaturity: "reviewable",
    statusTaxonomy: "demo",
    risk: "Medium",
    requiredGate: "truth-label contract + status-taxonomy alignment",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "GUI",
    capability: "workspace.status.chips",
    currentMaturity: "GUI/demo only",
    desiredNextMaturity: "reviewable",
    statusTaxonomy: "demo",
    risk: "Low",
    requiredGate: "truthful label taxonomy + cross-shell vocabulary alignment",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "GUI",
    capability: "evidence.timeline",
    currentMaturity: "GUI/demo only",
    desiredNextMaturity: "reviewable",
    statusTaxonomy: "demo",
    risk: "Medium",
    requiredGate: "evidence schema contract + cross-dashboard truth alignment",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "Automation",
    capability: "codex.flow.trigger.productized",
    currentMaturity: "proof-only",
    desiredNextMaturity: "proof-only",
    statusTaxonomy: "proof-only",
    risk: "High",
    requiredGate:
      "operator-examples + release-readiness checkpoints complete + explicit long-hold checkpoint + fail-closed invariants",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "Editor",
    capability: "editor.mutation.broad",
    currentMaturity: "blocked",
    desiredNextMaturity: "blocked",
    statusTaxonomy: "blocked",
    risk: "High",
    requiredGate: "exact-corridor-only policy + refusal coverage",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
  {
    domain: "Asset Forge",
    capability: "asset_forge.placement.proof",
    currentMaturity: "plan-only",
    desiredNextMaturity: "dry-run only",
    statusTaxonomy: "plan-only",
    risk: "High",
    requiredGate: "explicit admission flag design + blocked execution proof",
    recommendedNextPacket: "Approval/session dashboard long-hold checkpoint packet",
  },
];
