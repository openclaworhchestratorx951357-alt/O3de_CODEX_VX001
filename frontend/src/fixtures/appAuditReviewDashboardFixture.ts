import type { WorkspaceStatusTaxonomy } from "./appWorkspaceStatusChipsFixture";

export type AuditRisk = "Low" | "Medium" | "High" | "Critical";
export type AuditVerdict = "pass" | "watch" | "blocked";

export type AppAuditReviewRow = {
  domain: string;
  capabilityWindow: string;
  currentMaturity: string;
  statusTaxonomy: WorkspaceStatusTaxonomy;
  risk: AuditRisk;
  gateStatus: string;
  verdict: AuditVerdict;
  findings: string;
  nextGate: string;
};

export const appAuditReviewDashboardGeneratedAt = "2026-04-30";

export const appAuditReviewDashboardRows: readonly AppAuditReviewRow[] = [
  {
    domain: "Editor",
    capabilityWindow: "authoring readback review + restore corridor + blocked broad mutation surfaces",
    currentMaturity: "admitted-real (narrow)",
    statusTaxonomy: "admitted-real",
    risk: "High",
    gateStatus: "exact readback + restore-boundary gates regression-checked across capability/audit/status/timeline surfaces",
    verdict: "pass",
    findings:
      "Editor readback long-hold checkpoint now preserves held no-go broadening posture and stream handoff boundaries while exact Camera bool restore/write corridor boundaries remain unchanged and broad mutation/restore lanes stay fail-closed.",
    nextGate: "Approval/session dashboard shell (static fixture first)",
  },
  {
    domain: "Editor",
    capabilityWindow: "generic component/property mutation",
    currentMaturity: "blocked",
    statusTaxonomy: "blocked",
    risk: "High",
    gateStatus: "blocked outside exact admitted corridors",
    verdict: "blocked",
    findings: "Broad editor mutation lanes remain unadmitted and must fail closed.",
    nextGate: "Approval/session dashboard shell (static fixture first)",
  },
  {
    domain: "Asset Forge",
    capabilityWindow: "stage-write + placement readiness",
    currentMaturity: "proof-only and dry-run mix",
    statusTaxonomy: "proof-only",
    risk: "High",
    gateStatus: "admission flags required",
    verdict: "watch",
    findings: "Proof-only corridor exists; broad execution and mutation remain blocked.",
    nextGate: "admission-flag verification refresh",
  },
  {
    domain: "Project/Config",
    capabilityWindow: "build.execute.real long-hold checkpoint",
    statusTaxonomy: "admitted-real",
    currentMaturity: "gated real execution lane for explicit named targets",
    risk: "Critical",
    gateStatus: "hold/no-go posture checkpointed; named-target + approval + timeout/log/result boundaries remain explicit",
    verdict: "watch",
    findings:
      "Long-hold checkpoint preserves no-go broadening posture for build.execute.real while keeping explicit named-target execution evidence and non-admission of broad execution, cleanup, or rollback-class claims.",
    nextGate: "Approval/session dashboard shell (static fixture first)",
  },
  {
    domain: "Validation",
    capabilityWindow: "report intake endpoint candidate long-hold",
    currentMaturity: "hold-default-off (dry-run-only endpoint candidate)",
    statusTaxonomy: "hold-default-off",
    risk: "Medium",
    gateStatus: "server-owned gate states + fail-closed matrix verified",
    verdict: "watch",
    findings: "Endpoint candidate stays default-off by server gate; explicit_on remains dry-run-only with write_status=blocked.",
    nextGate: "maintain hold unless explicit future admission packet is approved",
  },
  {
    domain: "GUI",
    capabilityWindow: "capability + audit + approval + timeline + status chips",
    currentMaturity: "GUI/demo only",
    statusTaxonomy: "demo",
    risk: "Medium",
    gateStatus: "cross-shell truth labels aligned",
    verdict: "pass",
    findings: "Shell taxonomy now aligns across capability, approval/session, evidence timeline, and workspace status chips.",
    nextGate: "Approval/session dashboard shell (static fixture first)",
  },
  {
    domain: "Automation",
    capabilityWindow: "Flow Trigger Suite helpers",
    currentMaturity: "proof-only runtime-admission contract-evaluation path",
    statusTaxonomy: "proof-only",
    risk: "High",
    gateStatus:
      "productization plan + audit-gate checklist + bounded design + security-review + operator-approval + readiness-audit + contract-design + proof-only implementation + operator-examples checkpoint + release-readiness hold/no-go decision controls documented; admission still not granted",
    verdict: "watch",
    findings:
      "Local speed helpers remain non-admitted; long-hold checkpoint now preserves held runtime-admission posture and stream handoff boundaries.",
    nextGate: "Approval/session dashboard shell (static fixture first)",
  },
];
