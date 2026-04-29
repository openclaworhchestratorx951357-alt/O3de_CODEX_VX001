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
  | "needs baseline";

export type CapabilityRisk = "Low" | "Medium" | "High" | "Critical";

export type AppCapabilityDashboardRow = {
  domain: string;
  capability: string;
  currentMaturity: CapabilityMaturity;
  desiredNextMaturity: CapabilityMaturity;
  risk: CapabilityRisk;
  requiredGate: string;
  recommendedNextPacket: string;
};

export const appCapabilityDashboardFixtureGeneratedAt = "2026-04-29";

export const appCapabilityDashboardRows: readonly AppCapabilityDashboardRow[] = [
  {
    domain: "Editor",
    capability: "editor.session.open",
    currentMaturity: "needs baseline",
    desiredNextMaturity: "read-only",
    risk: "Medium",
    requiredGate: "runtime truth + audit review",
    recommendedNextPacket: "Editor authoring baseline audit",
  },
  {
    domain: "Editor",
    capability: "editor.component.property.write.narrow",
    currentMaturity: "admitted-real",
    desiredNextMaturity: "reviewable",
    risk: "High",
    requiredGate: "exact corridor gates + audit review",
    recommendedNextPacket: "Editor narrow-corridor verification refresh",
  },
  {
    domain: "Editor",
    capability: "editor.placement.plan",
    currentMaturity: "plan-only",
    desiredNextMaturity: "dry-run only",
    risk: "Medium",
    requiredGate: "bounded plan schema + audit review",
    recommendedNextPacket: "Editor placement plan matrix",
  },
  {
    domain: "Asset Forge",
    capability: "asset_forge.provider.preflight",
    currentMaturity: "preflight-only",
    desiredNextMaturity: "reviewable",
    risk: "Medium",
    requiredGate: "no-provider-call guard + audit review",
    recommendedNextPacket: "Asset Forge provider preflight hardening",
  },
  {
    domain: "Asset Forge",
    capability: "asset_forge.o3de.stage_write.v1",
    currentMaturity: "proof-only",
    desiredNextMaturity: "gated execution",
    risk: "High",
    requiredGate: "explicit admission flag + exact path/hash gates",
    recommendedNextPacket: "Proof-only admission-flag verification packet",
  },
  {
    domain: "Asset Forge",
    capability: "asset_forge.placement.proof",
    currentMaturity: "plan-only",
    desiredNextMaturity: "dry-run only",
    risk: "High",
    requiredGate: "explicit admission flag design",
    recommendedNextPacket: "Placement proof-only admission-flag design",
  },
  {
    domain: "Project/Config",
    capability: "project.inspect",
    currentMaturity: "read-only",
    desiredNextMaturity: "reviewable",
    risk: "Medium",
    requiredGate: "contract alignment + audit review",
    recommendedNextPacket: "Project inspect review packet",
  },
  {
    domain: "Project/Config",
    capability: "build.execute.real",
    currentMaturity: "missing",
    desiredNextMaturity: "plan-only",
    risk: "Critical",
    requiredGate: "explicit admission program + operator approval",
    recommendedNextPacket: "Build execution admission design",
  },
  {
    domain: "Validation",
    capability: "backend.test.run",
    currentMaturity: "admitted-real",
    desiredNextMaturity: "reviewable",
    risk: "Low",
    requiredGate: "command boundary docs",
    recommendedNextPacket: "Validation workflow index refresh",
  },
  {
    domain: "Validation",
    capability: "real CI/test execution",
    currentMaturity: "needs baseline",
    desiredNextMaturity: "plan-only",
    risk: "High",
    requiredGate: "explicit CI admission decision",
    recommendedNextPacket: "CI admission design packet",
  },
  {
    domain: "GUI",
    capability: "app.capability.dashboard",
    currentMaturity: "GUI/demo only",
    desiredNextMaturity: "reviewable",
    risk: "Medium",
    requiredGate: "truth-label contract + audit review",
    recommendedNextPacket: "App-wide dashboard truth refresh + editor lane linkage",
  },
  {
    domain: "GUI",
    capability: "audit.review.dashboard",
    currentMaturity: "GUI/demo only",
    desiredNextMaturity: "reviewable",
    risk: "Medium",
    requiredGate: "truth-label contract + audit review",
    recommendedNextPacket: "Audit dashboard truth refresh + validation linkage",
  },
  {
    domain: "Automation",
    capability: "codex.flow.trigger.local",
    currentMaturity: "docs/spec only",
    desiredNextMaturity: "docs/spec only",
    risk: "Low",
    requiredGate: "local-only boundary + ignore rules",
    recommendedNextPacket: "Flow Trigger Suite productization plan",
  },
  {
    domain: "Automation",
    capability: "codex.flow.trigger.productized",
    currentMaturity: "missing",
    desiredNextMaturity: "plan-only",
    risk: "High",
    requiredGate: "security/review gate + operator approval",
    recommendedNextPacket: "Flow Trigger Suite productization design",
  },
];
