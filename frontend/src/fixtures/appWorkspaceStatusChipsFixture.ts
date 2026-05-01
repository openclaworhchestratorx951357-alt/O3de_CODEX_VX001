import type { CapabilityMaturity, CapabilityRisk } from "./appCapabilityDashboardFixture";

export type WorkspaceStatusChip = {
  id: string;
  workspace: string;
  label: string;
  maturity: CapabilityMaturity;
  risk: CapabilityRisk;
  status: "blocked" | "watch" | "ready";
  evidenceLink: string;
  note: string;
};

export const appWorkspaceStatusChipsGeneratedAt = "2026-04-29";

export const appWorkspaceStatusChips: readonly WorkspaceStatusChip[] = [
  {
    id: "workspace-home-capability",
    workspace: "Legacy Mission Desk",
    label: "capability dashboard",
    maturity: "GUI/demo only",
    risk: "Medium",
    status: "ready",
    evidenceLink: "app.capability.dashboard",
    note: "Static-fixture truth labels are available with no execution admission changes.",
  },
  {
    id: "workspace-home-audit",
    workspace: "Legacy Mission Desk",
    label: "audit review",
    maturity: "GUI/demo only",
    risk: "Medium",
    status: "ready",
    evidenceLink: "audit.review.dashboard",
    note: "Cross-domain audit verdict visibility is active in the shell-only lane.",
  },
  {
    id: "workspace-home-evidence",
    workspace: "Legacy Mission Desk",
    label: "evidence timeline",
    maturity: "GUI/demo only",
    risk: "Medium",
    status: "ready",
    evidenceLink: "evidence.timeline",
    note: "Cross-domain chronology surface is available as static fixture evidence.",
  },
  {
    id: "workspace-home-approval",
    workspace: "Legacy Mission Desk",
    label: "approval/session truth",
    maturity: "GUI/demo only",
    risk: "Medium",
    status: "ready",
    evidenceLink: "approval.session.dashboard",
    note: "Client intent vs server authorization truth is surfaced with fail-closed status labels.",
  },
  {
    id: "workspace-validation-intake",
    workspace: "Records",
    label: "validation intake endpoint",
    maturity: "dry-run only",
    risk: "Medium",
    status: "watch",
    evidenceLink: "validation.report.intake",
    note: "Contract and parser matrix exist, but endpoint admission remains blocked.",
  },
  {
    id: "workspace-asset-forge-stage-write",
    workspace: "Asset Forge",
    label: "stage write corridor",
    maturity: "proof-only",
    risk: "High",
    status: "watch",
    evidenceLink: "asset_forge.o3de.stage_write.v1",
    note: "Bounded proof corridor exists; broad mutation remains blocked and audit-gated.",
  },
  {
    id: "workspace-editor-placement",
    workspace: "Runtime",
    label: "placement proof",
    maturity: "plan-only",
    risk: "High",
    status: "blocked",
    evidenceLink: "editor.placement.proof_only",
    note: "Placement proof-only admission is not implemented and remains blocked.",
  },
  {
    id: "workspace-automation-productized",
    workspace: "Builder",
    label: "flow trigger productized",
    maturity: "missing",
    risk: "High",
    status: "blocked",
    evidenceLink: "codex.flow.trigger.productized",
    note: "Local helpers are active, but productized automation remains unadmitted.",
  },
] as const;
