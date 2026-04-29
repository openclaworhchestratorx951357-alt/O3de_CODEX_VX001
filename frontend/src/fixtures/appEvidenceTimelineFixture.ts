import type { CapabilityMaturity, CapabilityRisk } from "./appCapabilityDashboardFixture";

export type EvidenceTruthClass = "demo" | "plan-only" | "dry-run only" | "proof-only" | "admitted-real";

export type AppEvidenceTimelineRow = {
  id: string;
  occurredAt: string;
  domain: string;
  capability: string;
  maturity: CapabilityMaturity;
  truthClass: EvidenceTruthClass;
  risk: CapabilityRisk;
  evidence: string;
  notes: string;
};

export const appEvidenceTimelineGeneratedAt = "2026-04-29";

export const appEvidenceTimelineRows: readonly AppEvidenceTimelineRow[] = [
  {
    id: "evt-validation-intake-dry-run",
    occurredAt: "2026-04-29",
    domain: "Validation",
    capability: "validation.report.intake",
    maturity: "dry-run only",
    truthClass: "dry-run only",
    risk: "Medium",
    evidence: "PR #168: internal dry-run parser scaffold + fail-closed matrix",
    notes: "Endpoint remains unadmitted/unregistered; execution and mutation remain blocked.",
  },
  {
    id: "evt-validation-intake-contract",
    occurredAt: "2026-04-29",
    domain: "Validation",
    capability: "validation.report.intake",
    maturity: "plan-only",
    truthClass: "plan-only",
    risk: "Medium",
    evidence: "PR #167: contract and fail-closed parser design",
    notes: "Defined payload/provenance/integrity gates before any runtime admission.",
  },
  {
    id: "evt-audit-dashboard-shell",
    occurredAt: "2026-04-29",
    domain: "GUI",
    capability: "audit.review.dashboard",
    maturity: "GUI/demo only",
    truthClass: "demo",
    risk: "Medium",
    evidence: "PR #165: static-fixture audit review dashboard shell",
    notes: "Operator-facing audit gate visibility added with no backend execution changes.",
  },
  {
    id: "evt-capability-dashboard-shell",
    occurredAt: "2026-04-29",
    domain: "GUI",
    capability: "app.capability.dashboard",
    maturity: "GUI/demo only",
    truthClass: "demo",
    risk: "Medium",
    evidence: "PR #162: static-fixture app-wide capability dashboard shell",
    notes: "Capability maturity truth chips added without enabling new runtime lanes.",
  },
  {
    id: "evt-asset-forge-stage-write-proof",
    occurredAt: "2026-04-28",
    domain: "Asset Forge",
    capability: "asset_forge.o3de.stage_write.v1",
    maturity: "proof-only",
    truthClass: "proof-only",
    risk: "High",
    evidence: "PR #150: proof-only stage-write corridor transition",
    notes: "Narrow proof-only mutation corridor; broad mutation remains blocked and audit-gated.",
  },
  {
    id: "evt-editor-write-corridor",
    occurredAt: "2026-04-26",
    domain: "Editor",
    capability: "editor.component.property.write.narrow",
    maturity: "admitted-real",
    truthClass: "admitted-real",
    risk: "High",
    evidence: "Phase 8 exact camera bool write corridor evidence",
    notes: "Exact-scope admitted corridor; generic property writes remain unadmitted.",
  },
] as const;
