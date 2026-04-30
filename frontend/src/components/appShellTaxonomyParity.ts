import type { WorkspaceStatusTaxonomy } from "../fixtures/appWorkspaceStatusChipsFixture";

export const sharedShellBoundaryLabels = [
  "Static fixture only",
  "Server-owned authorization truth",
  "Client fields are intent-only",
  "Fail-closed gate-state enforcement",
  "Dispatch unadmitted for validation.report.intake",
  "No backend execution admission changes",
  "No mutation corridor broadening",
  "Status chips must preserve shared taxonomy cues",
] as const;

export function getStatusChipLinkageCue(taxonomy: WorkspaceStatusTaxonomy): string {
  if (taxonomy === "admitted-real") {
    return "Admitted-real chips stay green across capability, audit, workspace, and timeline shells.";
  }
  if (taxonomy === "proof-only") {
    return "Proof-only chips stay warning across capability, audit, workspace, and timeline shells.";
  }
  if (taxonomy === "dry-run only") {
    return "Dry-run-only chips stay info-classified across capability, audit, workspace, and timeline shells.";
  }
  if (taxonomy === "plan-only") {
    return "Plan-only chips stay info-classified with non-admitting wording across app shells.";
  }
  if (taxonomy === "demo") {
    return "Demo chips stay display-only with non-authorizing shell language across app surfaces.";
  }
  if (taxonomy === "hold-default-off") {
    return "Hold-default-off chips stay fail-closed with server-gated default-off semantics across shells.";
  }
  return "Blocked chips stay refusal-first outside exact admitted corridors across app surfaces.";
}
