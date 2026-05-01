import type { CapabilityRisk } from "./appCapabilityDashboardFixture";

export type ApprovalSessionTruthLabel = "intent-only" | "server-evaluated" | "blocked" | "admitted-by-server";

export type ApprovalSessionStatus =
  | "missing"
  | "expired"
  | "revoked"
  | "fingerprint_mismatch"
  | "ready_but_not_admitted"
  | "admitted";

export type AppApprovalSessionDashboardRow = {
  id: string;
  domain: string;
  operation: string;
  clientIntent: string;
  serverEvaluation: string;
  sessionStatus: ApprovalSessionStatus;
  authorizationSource: string;
  truthLabel: ApprovalSessionTruthLabel;
  executionAdmitted: boolean;
  projectWriteAdmitted: boolean;
  risk: CapabilityRisk;
  notes: string;
};

export const appApprovalSessionDashboardGeneratedAt = "2026-04-29";

export const appApprovalSessionDashboardRows: readonly AppApprovalSessionDashboardRow[] = [
  {
    id: "approval-row-validation-intent-only",
    domain: "Validation",
    operation: "validation.report.intake",
    clientIntent: "approval_state=approved",
    serverEvaluation: "denied (endpoint unadmitted)",
    sessionStatus: "missing",
    authorizationSource: "server-owned evaluation only",
    truthLabel: "intent-only",
    executionAdmitted: false,
    projectWriteAdmitted: false,
    risk: "Medium",
    notes: "Client approval fields remain intent-only and cannot authorize execution.",
  },
  {
    id: "approval-row-asset-forge-stage-plan",
    domain: "Asset Forge",
    operation: "asset_forge.o3de.stage_plan",
    clientIntent: "approval_state=approved + session id",
    serverEvaluation: "ready_but_not_admitted",
    sessionStatus: "ready_but_not_admitted",
    authorizationSource: "server-owned evaluation only",
    truthLabel: "server-evaluated",
    executionAdmitted: false,
    projectWriteAdmitted: false,
    risk: "High",
    notes: "Server checks can pass while execution remains blocked by admission gates.",
  },
  {
    id: "approval-row-editor-write",
    domain: "Editor",
    operation: "editor.component.property.write.narrow",
    clientIntent: "approved request",
    serverEvaluation: "admitted exact corridor",
    sessionStatus: "admitted",
    authorizationSource: "server-owned corridor gate",
    truthLabel: "admitted-by-server",
    executionAdmitted: true,
    projectWriteAdmitted: false,
    risk: "High",
    notes: "Only exact admitted editor corridor is allowed; generic writes remain blocked.",
  },
  {
    id: "approval-row-stage-write-proof",
    domain: "Asset Forge",
    operation: "asset_forge.o3de.stage_write.v1",
    clientIntent: "approved request",
    serverEvaluation: "revoked session fails closed",
    sessionStatus: "revoked",
    authorizationSource: "server-owned approval/session checks",
    truthLabel: "blocked",
    executionAdmitted: false,
    projectWriteAdmitted: false,
    risk: "High",
    notes: "Fail-closed session state blocks proof-only corridor execution.",
  },
  {
    id: "approval-row-project-config",
    domain: "Project/Config",
    operation: "settings.patch.narrow",
    clientIntent: "approved request",
    serverEvaluation: "expired session fails closed",
    sessionStatus: "expired",
    authorizationSource: "server-owned corridor gate",
    truthLabel: "blocked",
    executionAdmitted: false,
    projectWriteAdmitted: false,
    risk: "High",
    notes: "Expired session cannot authorize mutation even for narrow settings corridor.",
  },
  {
    id: "approval-row-fingerprint-mismatch",
    domain: "Asset Forge",
    operation: "asset_forge.o3de.stage_write.v1",
    clientIntent: "approval_session_id provided",
    serverEvaluation: "fingerprint mismatch fails closed",
    sessionStatus: "fingerprint_mismatch",
    authorizationSource: "server-owned approval/session checks",
    truthLabel: "blocked",
    executionAdmitted: false,
    projectWriteAdmitted: false,
    risk: "High",
    notes: "Fingerprint mismatch prevents authorization and keeps write path blocked.",
  },
] as const;
