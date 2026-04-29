export type AuditRisk = "Low" | "Medium" | "High" | "Critical";
export type AuditVerdict = "pass" | "watch" | "blocked";

export type AppAuditReviewRow = {
  domain: string;
  capabilityWindow: string;
  currentMaturity: string;
  risk: AuditRisk;
  gateStatus: string;
  verdict: AuditVerdict;
  findings: string;
  nextGate: string;
};

export const appAuditReviewDashboardGeneratedAt = "2026-04-29";

export const appAuditReviewDashboardRows: readonly AppAuditReviewRow[] = [
  {
    domain: "Editor",
    capabilityWindow: "review/restore narrow corridors",
    currentMaturity: "admitted-real (narrow)",
    risk: "High",
    gateStatus: "exact-scope gates present",
    verdict: "watch",
    findings: "Exact Camera bool write/restore corridors are admitted and bounded; broad property write remains blocked.",
    nextGate: "placement plan matrix (dry-run only)",
  },
  {
    domain: "Asset Forge",
    capabilityWindow: "stage-write + placement readiness",
    currentMaturity: "proof-only and dry-run mix",
    risk: "High",
    gateStatus: "admission flags required",
    verdict: "watch",
    findings: "Proof-only corridor exists; broad execution and mutation remain blocked.",
    nextGate: "admission-flag verification refresh",
  },
  {
    domain: "Project/Config",
    capabilityWindow: "inspect/patch/build lanes",
    currentMaturity: "mixed read-only + mutation-gated + execution-gated",
    risk: "Critical",
    gateStatus: "narrow gates present",
    verdict: "watch",
    findings: "Build execution is gated for explicit targets; broad build/export remains unadmitted.",
    nextGate: "execution boundary hardening audit",
  },
  {
    domain: "Validation",
    capabilityWindow: "test/report lanes",
    currentMaturity: "dry-run parser scaffold + endpoint unadmitted",
    risk: "Medium",
    gateStatus: "fail-closed parser matrix present",
    verdict: "watch",
    findings: "Validation intake now has contract + dry-run parser fail-closed coverage, but endpoint admission remains gated.",
    nextGate: "workspace status chips shell",
  },
  {
    domain: "GUI",
    capabilityWindow: "capability + audit + evidence + approval/session dashboards",
    currentMaturity: "GUI/demo only",
    risk: "Medium",
    gateStatus: "truth labels present",
    verdict: "pass",
    findings: "Static-fixture shell surfaces now exist for capability, audit, evidence timeline, and approval/session truth visibility.",
    nextGate: "connect fixtures to validated read-only sources",
  },
  {
    domain: "Automation",
    capabilityWindow: "Flow Trigger Suite helpers",
    currentMaturity: "local helper / docs-spec",
    risk: "High",
    gateStatus: "productization not admitted",
    verdict: "watch",
    findings: "Local speed helpers remain available but must stay audit-gated and non-productized.",
    nextGate: "Flow Trigger Suite productization plan",
  },
];
