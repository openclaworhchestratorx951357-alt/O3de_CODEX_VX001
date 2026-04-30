import { describe, expect, it } from "vitest";

import { appAuditReviewDashboardRows } from "./appAuditReviewDashboardFixture";
import { appCapabilityDashboardRows } from "./appCapabilityDashboardFixture";
import { appEvidenceTimelineRows } from "./appEvidenceTimelineFixture";
import { appWorkspaceStatusChipRows } from "./appWorkspaceStatusChipsFixture";

describe("build execution long-hold fixture guardrails", () => {
  it("keeps build execution capability boundaries explicit and non-broadening", () => {
    const buildExecutionCapability = appCapabilityDashboardRows.find((row) => row.capability === "build.execute.real");
    expect(buildExecutionCapability).toBeDefined();
    expect(buildExecutionCapability?.requiredGate).toContain("explicit named target");
    expect(buildExecutionCapability?.requiredGate).toContain("timeout/log/result evidence");
    expect(buildExecutionCapability?.recommendedNextPacket).toBe("Asset Forge placement runtime-admission long-hold checkpoint");

    const buildExecutionAudit = appAuditReviewDashboardRows.find((row) => row.domain === "Project/Config");
    expect(buildExecutionAudit).toBeDefined();
    expect(buildExecutionAudit?.capabilityWindow).toBe("build.execute.real long-hold checkpoint");
    expect(buildExecutionAudit?.nextGate).toBe("Asset Forge placement runtime-admission long-hold checkpoint");
    expect(buildExecutionAudit?.findings).toContain("Long-hold checkpoint");

    const buildExecutionStatus = appWorkspaceStatusChipRows.find((row) => row.capabilityWindow === "build.execute.real");
    expect(buildExecutionStatus).toBeDefined();
    expect(buildExecutionStatus?.summary).toContain("hold/no-go posture explicit");
    expect(buildExecutionStatus?.nextGate).toBe("Asset Forge placement runtime-admission long-hold checkpoint");
  });

  it("records build execution long-hold checkpoint evidence while preserving prior checkpoints", () => {
    const guiShellTaxonomyParityCheckpointQuickReferenceRefreshRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "GUI shell taxonomy parity checkpoint + quick-reference refresh packet",
    );
    expect(guiShellTaxonomyParityCheckpointQuickReferenceRefreshRow).toBeDefined();
    expect(guiShellTaxonomyParityCheckpointQuickReferenceRefreshRow?.reviewStatus).toBe(
      "pass-gui-shell-taxonomy-parity-checkpoint-quick-reference-refresh-packet",
    );
    expect(guiShellTaxonomyParityCheckpointQuickReferenceRefreshRow?.summary).toContain(
      "deterministic shared boundary labels, status-chip taxonomy cues, server-owned authorization truth language, fail-closed validation semantics, and non-authorizing client-field posture remain aligned",
    );

    const auditReviewDashboardTruthRefreshStatusChipLinkageRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "audit review dashboard truth refresh + status-chip linkage packet",
    );
    expect(auditReviewDashboardTruthRefreshStatusChipLinkageRow).toBeDefined();
    expect(auditReviewDashboardTruthRefreshStatusChipLinkageRow?.reviewStatus).toBe(
      "pass-audit-review-dashboard-truth-refresh-status-chip-linkage-packet",
    );
    expect(auditReviewDashboardTruthRefreshStatusChipLinkageRow?.summary).toContain(
      "deterministic verdict/risk/taxonomy status-chip cues, server-owned authorization truth language, fail-closed validation semantics, and non-authorizing client-field posture remain aligned",
    );

    const appCapabilityDashboardTruthRefreshStatusChipLinkageRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "app capability dashboard truth refresh + status-chip linkage packet",
    );
    expect(appCapabilityDashboardTruthRefreshStatusChipLinkageRow).toBeDefined();
    expect(appCapabilityDashboardTruthRefreshStatusChipLinkageRow?.reviewStatus).toBe(
      "pass-app-capability-dashboard-truth-refresh-status-chip-linkage-packet",
    );
    expect(appCapabilityDashboardTruthRefreshStatusChipLinkageRow?.summary).toContain(
      "deterministic status-chip taxonomy cues, server-owned authorization truth language, fail-closed validation semantics, and non-authorizing client-field posture remain aligned",
    );

    const workspaceStatusChipsTruthTaxonomyRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "workspace status chips shell + truth taxonomy linkage packet",
    );
    expect(workspaceStatusChipsTruthTaxonomyRow).toBeDefined();
    expect(workspaceStatusChipsTruthTaxonomyRow?.reviewStatus).toBe(
      "pass-workspace-status-chips-shell-truth-taxonomy-linkage-packet",
    );
    expect(workspaceStatusChipsTruthTaxonomyRow?.summary).toContain(
      "deterministic held-lane and approval/session status labeling, server-owned authorization truth language, fail-closed validation semantics, and non-authorizing client-field posture remain aligned",
    );

    const appWideEvidenceTimelineAuditRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "app-wide evidence timeline shell + approval/validation linkage audit packet",
    );
    expect(appWideEvidenceTimelineAuditRow).toBeDefined();
    expect(appWideEvidenceTimelineAuditRow?.reviewStatus).toBe(
      "pass-app-wide-evidence-timeline-shell-approval-validation-linkage-audit-packet",
    );
    expect(appWideEvidenceTimelineAuditRow?.summary).toContain(
      "deterministic cross-domain chronology, server-owned authorization truth, fail-closed validation-hold semantics, and non-authorizing client-field posture remain aligned",
    );

    const approvalSessionDashboardTruthRefreshValidationLinkageRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "approval/session dashboard truth refresh + validation linkage packet",
    );
    expect(approvalSessionDashboardTruthRefreshValidationLinkageRow).toBeDefined();
    expect(approvalSessionDashboardTruthRefreshValidationLinkageRow?.reviewStatus).toBe(
      "pass-approval-session-dashboard-truth-refresh-validation-linkage-packet",
    );
    expect(approvalSessionDashboardTruthRefreshValidationLinkageRow?.summary).toContain(
      "deterministic server-owned authorization truth, fail-closed validation-hold review semantics, and non-authorizing client-field posture remain aligned",
    );

    const approvalSessionDashboardShellStaticFixtureFirstRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "approval/session dashboard shell static-fixture-first packet",
    );
    expect(approvalSessionDashboardShellStaticFixtureFirstRow).toBeDefined();
    expect(approvalSessionDashboardShellStaticFixtureFirstRow?.reviewStatus).toBe(
      "pass-approval-session-dashboard-shell-static-fixture-first-packet",
    );
    expect(approvalSessionDashboardShellStaticFixtureFirstRow?.summary).toContain(
      "deterministic server-owned authorization truth, fail-closed validation-hold gate-state language, and non-authorizing client-field posture remain explicit",
    );

    const approvalSessionDashboardLongHoldRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "approval/session dashboard long-hold checkpoint packet",
    );
    expect(approvalSessionDashboardLongHoldRow).toBeDefined();
    expect(approvalSessionDashboardLongHoldRow?.reviewStatus).toBe(
      "pass-approval-session-dashboard-long-hold-checkpoint-packet",
    );
    expect(approvalSessionDashboardLongHoldRow?.summary).toContain(
      "deterministic server-owned authorization truth, fail-closed validation-hold semantics, and non-authorizing client-field posture remain aligned",
    );

    const approvalSessionDashboardParityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "approval/session dashboard parity checkpoint packet",
    );
    expect(approvalSessionDashboardParityRow).toBeDefined();
    expect(approvalSessionDashboardParityRow?.reviewStatus).toBe(
      "pass-approval-session-dashboard-parity-checkpoint-packet",
    );
    expect(approvalSessionDashboardParityRow?.summary).toContain(
      "deterministic server-owned authorization truth and fail-closed validation-hold gate-state semantics remain aligned",
    );

    const validationWorkflowHoldBoundaryLongHoldRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary long-hold checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryLongHoldRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryLongHoldRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-long-hold-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryLongHoldRow?.summary).toContain(
      "deterministic held-lane release-readiness hold/no-go posture remains intact under explicit held-lane long-hold stream-handoff wording and boundary-preservation linkage",
    );

    const validationWorkflowHoldBoundaryReleaseReadinessRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary release-readiness decision packet",
    );
    expect(validationWorkflowHoldBoundaryReleaseReadinessRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryReleaseReadinessRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-release-readiness-decision-packet",
    );
    expect(validationWorkflowHoldBoundaryReleaseReadinessRow?.summary).toContain(
      "deterministic held-lane self-management posture remains intact under explicit held-lane hold/no-go decision wording and boundary-preservation release-readiness proof linkage",
    );

    const validationWorkflowHoldBoundarySelfManagementRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary self-management checkpoint packet",
    );
    expect(validationWorkflowHoldBoundarySelfManagementRow).toBeDefined();
    expect(validationWorkflowHoldBoundarySelfManagementRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-self-management-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundarySelfManagementRow?.summary).toContain(
      "deterministic held-lane self-command posture remains intact under explicit held-lane release-readiness decision wording and boundary-preservation self-management proof linkage",
    );

    const validationWorkflowHoldBoundarySelfCommandRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary self-command checkpoint packet",
    );
    expect(validationWorkflowHoldBoundarySelfCommandRow).toBeDefined();
    expect(validationWorkflowHoldBoundarySelfCommandRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-self-command-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundarySelfCommandRow?.summary).toContain(
      "deterministic held-lane self-direction posture remains intact under explicit held-lane self-management wording and boundary-preservation self-command proof linkage",
    );

    const validationWorkflowHoldBoundarySelfDirectionRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary self-direction checkpoint packet",
    );
    expect(validationWorkflowHoldBoundarySelfDirectionRow).toBeDefined();
    expect(validationWorkflowHoldBoundarySelfDirectionRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-self-direction-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundarySelfDirectionRow?.summary).toContain(
      "deterministic held-lane self-authorship posture remains intact under explicit held-lane self-command wording and boundary-preservation self-direction proof linkage",
    );

    const validationWorkflowHoldBoundarySelfAuthorshipRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary self-authorship checkpoint packet",
    );
    expect(validationWorkflowHoldBoundarySelfAuthorshipRow).toBeDefined();
    expect(validationWorkflowHoldBoundarySelfAuthorshipRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-self-authorship-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundarySelfAuthorshipRow?.summary).toContain(
      "deterministic held-lane agency posture remains intact under explicit held-lane self-direction wording and boundary-preservation self-authorship proof linkage",
    );

    const validationWorkflowHoldBoundaryAgencyRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary agency checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryAgencyRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryAgencyRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-agency-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryAgencyRow?.summary).toContain(
      "deterministic held-lane self-determination posture remains intact under explicit held-lane self-authorship wording and boundary-preservation agency proof linkage",
    );

    const validationWorkflowHoldBoundarySelfDeterminationRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary self-determination checkpoint packet",
    );
    expect(validationWorkflowHoldBoundarySelfDeterminationRow).toBeDefined();
    expect(validationWorkflowHoldBoundarySelfDeterminationRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-self-determination-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundarySelfDeterminationRow?.summary).toContain(
      "deterministic held-lane self-governance posture remains intact under explicit held-lane agency wording and boundary-preservation self-determination proof linkage",
    );

    const validationWorkflowHoldBoundarySelfGovernanceRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary self-governance checkpoint packet",
    );
    expect(validationWorkflowHoldBoundarySelfGovernanceRow).toBeDefined();
    expect(validationWorkflowHoldBoundarySelfGovernanceRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-self-governance-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundarySelfGovernanceRow?.summary).toContain(
      "deterministic held-lane autonomy posture remains intact under explicit held-lane self-determination wording and boundary-preservation self-governance proof linkage",
    );

    const validationWorkflowHoldBoundaryAutonomyRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary autonomy checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryAutonomyRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryAutonomyRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-autonomy-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryAutonomyRow?.summary).toContain(
      "deterministic held-lane independence posture remains intact under explicit held-lane self-governance wording and boundary-preservation autonomy proof linkage",
    );

    const validationWorkflowHoldBoundaryIndependenceRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary independence checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryIndependenceRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryIndependenceRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-independence-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryIndependenceRow?.summary).toContain(
      "deterministic held-lane nonpartisanship posture remains intact under explicit held-lane autonomy wording and boundary-preservation independence proof linkage",
    );

    const validationWorkflowHoldBoundaryNonpartisanshipRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary nonpartisanship checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryNonpartisanshipRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryNonpartisanshipRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-nonpartisanship-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryNonpartisanshipRow?.summary).toContain(
      "deterministic held-lane objectivity posture remains intact under explicit held-lane independence wording and boundary-preservation nonpartisanship proof linkage",
    );

    const validationWorkflowHoldBoundaryObjectivityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary objectivity checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryObjectivityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryObjectivityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-objectivity-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryObjectivityRow?.summary).toContain(
      "deterministic held-lane neutrality posture remains intact under explicit held-lane nonpartisanship wording and boundary-preservation objectivity proof linkage",
    );

    const validationWorkflowHoldBoundaryNeutralityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary neutrality checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryNeutralityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryNeutralityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-neutrality-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryNeutralityRow?.summary).toContain(
      "deterministic held-lane impartiality posture remains intact under explicit held-lane objectivity wording and boundary-preservation neutrality proof linkage",
    );

    const validationWorkflowHoldBoundaryImpartialityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary impartiality checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryImpartialityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryImpartialityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-impartiality-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryImpartialityRow?.summary).toContain(
      "deterministic held-lane fairness posture remains intact under explicit held-lane neutrality wording and boundary-preservation impartiality proof linkage",
    );

    const validationWorkflowHoldBoundaryFairnessRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary fairness checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryFairnessRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryFairnessRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-fairness-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryFairnessRow?.summary).toContain(
      "deterministic held-lane equity posture remains intact under explicit held-lane impartiality wording and boundary-preservation fairness proof linkage",
    );

    const validationWorkflowHoldBoundaryEquityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary equity checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryEquityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryEquityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-equity-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryEquityRow?.summary).toContain(
      "deterministic held-lane inclusivity posture remains intact under explicit held-lane fairness wording and boundary-preservation equity proof linkage",
    );

    const validationWorkflowHoldBoundaryInclusivityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary inclusivity checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryInclusivityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryInclusivityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-inclusivity-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryInclusivityRow?.summary).toContain(
      "deterministic held-lane accessibility posture remains intact under explicit held-lane equity wording and boundary-preservation inclusivity proof linkage",
    );

    const validationWorkflowHoldBoundaryAccessibilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary accessibility checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryAccessibilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryAccessibilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-accessibility-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryAccessibilityRow?.summary).toContain(
      "deterministic held-lane usability posture remains intact under explicit held-lane inclusivity wording and boundary-preservation accessibility proof linkage",
    );

    const validationWorkflowHoldBoundaryUsabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary usability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryUsabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryUsabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-usability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryUsabilityRow?.summary).toContain(
      "deterministic held-lane supportability posture remains intact under explicit held-lane accessibility wording and boundary-preservation usability proof linkage",
    );

    const validationWorkflowHoldBoundarySupportabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary supportability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundarySupportabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundarySupportabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-supportability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundarySupportabilityRow?.summary).toContain(
      "deterministic held-lane serviceability posture remains intact under explicit held-lane usability wording and boundary-preservation supportability proof linkage",
    );

    const validationWorkflowHoldBoundaryServiceabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary serviceability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryServiceabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryServiceabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-serviceability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryServiceabilityRow?.summary).toContain(
      "deterministic held-lane availability posture remains intact under explicit held-lane supportability wording and boundary-preservation serviceability proof linkage",
    );

    const validationWorkflowHoldBoundaryAvailabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary availability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryAvailabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryAvailabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-availability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryAvailabilityRow?.summary).toContain(
      "deterministic held-lane reliability posture remains intact under explicit held-lane serviceability wording and boundary-preservation availability proof linkage",
    );

    const validationWorkflowHoldBoundaryReliabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary reliability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryReliabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryReliabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-reliability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryReliabilityRow?.summary).toContain(
      "deterministic held-lane predictability posture remains intact under explicit held-lane availability wording and boundary-preservation reliability proof linkage",
    );

    const validationWorkflowHoldBoundaryPredictabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary predictability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryPredictabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryPredictabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-predictability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryPredictabilityRow?.summary).toContain(
      "deterministic held-lane reproducibility posture remains intact under explicit held-lane reliability wording and boundary-preservation predictability proof linkage",
    );

    const validationWorkflowHoldBoundaryReproducibilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary reproducibility checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryReproducibilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryReproducibilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-reproducibility-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryReproducibilityRow?.summary).toContain(
      "deterministic held-lane repeatability posture remains intact under explicit held-lane predictability wording and boundary-preservation reproducibility proof linkage",
    );

    const validationWorkflowHoldBoundaryRepeatabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary repeatability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryRepeatabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryRepeatabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-repeatability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryRepeatabilityRow?.summary).toContain(
      "deterministic held-lane determinism posture remains intact under explicit held-lane reproducibility wording and boundary-preservation repeatability proof linkage",
    );

    const validationWorkflowHoldBoundaryDeterminismRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary determinism checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryDeterminismRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryDeterminismRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-determinism-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryDeterminismRow?.summary).toContain(
      "deterministic held-lane certainty posture remains intact under explicit held-lane repeatability wording and boundary-preservation determinism proof linkage",
    );

    const validationWorkflowHoldBoundaryCertaintyRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary certainty checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryCertaintyRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryCertaintyRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-certainty-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryCertaintyRow?.summary).toContain(
      "deterministic held-lane confidence posture remains intact under explicit held-lane determinism wording and boundary-preservation certainty proof linkage",
    );

    const validationWorkflowHoldBoundaryConfidenceRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary confidence checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryConfidenceRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryConfidenceRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-confidence-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryConfidenceRow?.summary).toContain(
      "deterministic held-lane assurance posture remains intact under explicit held-lane certainty wording and boundary-preservation confidence proof linkage",
    );

    const validationWorkflowHoldBoundaryAssuranceRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary assurance checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryAssuranceRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryAssuranceRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-assurance-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryAssuranceRow?.summary).toContain(
      "deterministic held-lane accountability posture remains intact under explicit held-lane confidence wording and boundary-preservation assurances",
    );

    const validationWorkflowHoldBoundaryAccountabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary accountability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryAccountabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryAccountabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-accountability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryAccountabilityRow?.summary).toContain(
      "deterministic held-lane provenance posture remains intact under explicit boundary-ownership language and refusal-accountability linkage",
    );

    const validationWorkflowHoldBoundaryProvenanceRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary provenance checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryProvenanceRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryProvenanceRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-provenance-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryProvenanceRow?.summary).toContain(
      "deterministic held-lane traceability posture remains intact under explicit evidence-source ownership and packet-chain provenance wording checks",
    );

    const validationWorkflowHoldBoundaryTraceabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary traceability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryTraceabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryTraceabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-traceability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryTraceabilityRow?.summary).toContain(
      "deterministic held-lane auditability posture remains intact under cross-surface evidence lineage and recommendation provenance checks",
    );

    const validationWorkflowHoldBoundaryAuditabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary auditability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryAuditabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryAuditabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-auditability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryAuditabilityRow?.summary).toContain(
      "deterministic held-lane operability posture remains intact under prolonged evidence review and operator handoff trails",
    );

    const validationWorkflowHoldBoundaryOperabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary operability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryOperabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryOperabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-operability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryOperabilityRow?.summary).toContain(
      "deterministic held-lane adaptability posture remains intact under extended operator-facing usage and handoff cadence",
    );

    const validationWorkflowHoldBoundaryAdaptabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary adaptability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryAdaptabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryAdaptabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-adaptability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryAdaptabilityRow?.summary).toContain(
      "deterministic held-lane maintainability posture remains intact under future recommendation-surface evolution",
    );

    const validationWorkflowHoldBoundaryMaintainabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary maintainability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryMaintainabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryMaintainabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-maintainability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryMaintainabilityRow?.summary).toContain(
      "deterministic held-lane sustainability posture remains intact under continued stream extension and cross-thread maintenance updates",
    );

    const validationWorkflowHoldBoundarySustainabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary sustainability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundarySustainabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundarySustainabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-sustainability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundarySustainabilityRow?.summary).toContain(
      "deterministic held-lane longevity posture remains intact across extended packet churn and repeated supervisor transitions",
    );

    const validationWorkflowHoldBoundaryLongevityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary longevity checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryLongevityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryLongevityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-longevity-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryLongevityRow?.summary).toContain(
      "deterministic held-lane endurance posture remains intact through prolonged multi-packet operation and future thread handoffs",
    );

    const validationWorkflowHoldBoundaryEnduranceRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary endurance checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryEnduranceRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryEnduranceRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-endurance-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryEnduranceRow?.summary).toContain(
      "deterministic held-lane durability posture remains intact under prolonged stream cadence and repeated supervisor handoffs",
    );

    const validationWorkflowHoldBoundaryDurabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary durability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryDurabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryDurabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-durability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryDurabilityRow?.summary).toContain(
      "deterministic held-lane continuity posture remains intact through extended stream duration and repeated handoff cycles",
    );

    const validationWorkflowHoldBoundaryContinuityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary continuity checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryContinuityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryContinuityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-continuity-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryContinuityRow?.summary).toContain(
      "deterministic held-lane resilience posture remains intact through subsequent packet additions and timeline growth",
    );

    const validationWorkflowHoldBoundaryResilienceRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary resilience checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryResilienceRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryResilienceRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-resilience-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryResilienceRow?.summary).toContain(
      "deterministic held-lane stability posture remains intact through recommendation rollovers and stream churn",
    );

    const validationWorkflowHoldBoundaryStabilityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary stability checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryStabilityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryStabilityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-stability-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryStabilityRow?.summary).toContain(
      "deterministic held-lane ordering, truth labels, review-status posture, and boundary wording stability",
    );

    const validationWorkflowHoldBoundaryProgressionIntegrityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary progression integrity packet",
    );
    expect(validationWorkflowHoldBoundaryProgressionIntegrityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryProgressionIntegrityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-progression-integrity-packet",
    );
    expect(validationWorkflowHoldBoundaryProgressionIntegrityRow?.summary).toContain(
      "deterministic held-lane checkpoint sequencing and lane-state transitions",
    );

    const validationWorkflowHoldBoundaryChronologyRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary chronology checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryChronologyRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryChronologyRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-chronology-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryChronologyRow?.summary).toContain(
      "deterministic held-lane timeline ordering and lane progression",
    );

    const validationWorkflowHoldBoundaryTaxonomyRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary taxonomy checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryTaxonomyRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryTaxonomyRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-taxonomy-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryTaxonomyRow?.summary).toContain(
      "deterministic held-lane truth-label, review-status token, and boundary-wording alignment",
    );

    const validationWorkflowHoldBoundaryReviewStatusParityRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary review-status parity packet",
    );
    expect(validationWorkflowHoldBoundaryReviewStatusParityRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryReviewStatusParityRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-review-status-parity-packet",
    );
    expect(validationWorkflowHoldBoundaryReviewStatusParityRow?.summary).toContain(
      "deterministic held-lane token linkage for TIAF/preflight and real CI/test execution",
    );

    const validationWorkflowHoldBoundaryWordingAuditRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary wording-audit packet",
    );
    expect(validationWorkflowHoldBoundaryWordingAuditRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryWordingAuditRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-wording-audit-packet",
    );
    expect(validationWorkflowHoldBoundaryWordingAuditRow?.summary).toContain(
      "verifies canonical held-lane wording parity for TIAF/preflight and real CI/test execution",
    );

    const validationWorkflowHoldBoundaryExampleRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary example checkpoint packet",
    );
    expect(validationWorkflowHoldBoundaryExampleRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryExampleRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-example-checkpoint-packet",
    );
    expect(validationWorkflowHoldBoundaryExampleRow?.summary).toContain(
      "operator-safe held-lane examples for TIAF/preflight and real CI/test execution",
    );

    const validationWorkflowHoldBoundaryConsistencyRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow hold-boundary consistency packet",
    );
    expect(validationWorkflowHoldBoundaryConsistencyRow).toBeDefined();
    expect(validationWorkflowHoldBoundaryConsistencyRow?.reviewStatus).toBe(
      "pass-validation-workflow-hold-boundary-consistency-packet",
    );
    expect(validationWorkflowHoldBoundaryConsistencyRow?.summary).toContain(
      "deterministic held-lane wording for TIAF/preflight and real CI/test execution",
    );

    const heldBoundaryValidationRows = appEvidenceTimelineRows.filter((row) =>
      row.evidenceLane.startsWith("validation workflow hold-boundary "),
    );
    expect(heldBoundaryValidationRows.length).toBeGreaterThanOrEqual(50);
    heldBoundaryValidationRows.forEach((row) => {
      expect(row.truthLabel).toBe("plan-only");
      expect(row.reviewStatus.startsWith("pass-validation-workflow-hold-boundary-")).toBe(true);
    });

    const validationWorkflowCommandEvidenceRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow command-evidence checkpoint packet",
    );
    expect(validationWorkflowCommandEvidenceRow).toBeDefined();
    expect(validationWorkflowCommandEvidenceRow?.reviewStatus).toBe(
      "pass-validation-workflow-command-evidence-checkpoint-packet",
    );
    expect(validationWorkflowCommandEvidenceRow?.summary).toContain(
      "maps canonical backend/frontend validation commands",
    );

    const validationWorkflowQuickReferenceRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow quick-reference packet",
    );
    expect(validationWorkflowQuickReferenceRow).toBeDefined();
    expect(validationWorkflowQuickReferenceRow?.reviewStatus).toBe("pass-validation-workflow-quick-reference-packet");
    expect(validationWorkflowQuickReferenceRow?.summary).toContain("centralizes deterministic backend/frontend command references");

    const validationWorkflowDriftGuardRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow drift-guard checkpoint packet",
    );
    expect(validationWorkflowDriftGuardRow).toBeDefined();
    expect(validationWorkflowDriftGuardRow?.reviewStatus).toBe("pass-validation-workflow-drift-guard-checkpoint-packet");
    expect(validationWorkflowDriftGuardRow?.summary).toContain("parity-aligned");

    const validationWorkflowIndexRefreshRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "validation workflow index refresh packet",
    );
    expect(validationWorkflowIndexRefreshRow).toBeDefined();
    expect(validationWorkflowIndexRefreshRow?.reviewStatus).toBe("pass-validation-workflow-index-refresh-packet");
    expect(validationWorkflowIndexRefreshRow?.summary).toContain("command references explicit");

    const tiafLongHoldRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "tiaf preflight long-hold checkpoint packet",
    );
    expect(tiafLongHoldRow).toBeDefined();
    expect(tiafLongHoldRow?.reviewStatus).toBe("hold-tiaf-preflight-long-hold-checkpoint-packet");
    expect(tiafLongHoldRow?.summary).toContain("stream handoff posture");

    const tiafReleaseReadinessRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "tiaf preflight release-readiness decision packet",
    );
    expect(tiafReleaseReadinessRow).toBeDefined();
    expect(tiafReleaseReadinessRow?.reviewStatus).toBe("hold-tiaf-preflight-release-readiness-decision-packet");
    expect(tiafReleaseReadinessRow?.summary).toContain("hold/no-go broadening posture");

    const tiafProofOnlyHarnessRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "tiaf preflight proof-only harness packet",
    );
    expect(tiafProofOnlyHarnessRow).toBeDefined();
    expect(tiafProofOnlyHarnessRow?.reviewStatus).toBe("pass-tiaf-preflight-proof-only-harness-packet");
    expect(tiafProofOnlyHarnessRow?.summary).toContain("contract-evaluation posture");

    const tiafReadinessAuditRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "tiaf preflight readiness audit packet",
    );
    expect(tiafReadinessAuditRow).toBeDefined();
    expect(tiafReadinessAuditRow?.reviewStatus).toBe("pass-tiaf-preflight-readiness-audit-packet");
    expect(tiafReadinessAuditRow?.summary).toContain("ready vs missing gates");

    const tiafContractDesignRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "tiaf preflight contract design packet",
    );
    expect(tiafContractDesignRow).toBeDefined();
    expect(tiafContractDesignRow?.reviewStatus).toBe("pass-tiaf-preflight-contract-design-packet");
    expect(tiafContractDesignRow?.summary).toContain("failure semantics");

    const ciLongHoldRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "ci admission long-hold checkpoint packet",
    );
    expect(ciLongHoldRow).toBeDefined();
    expect(ciLongHoldRow?.reviewStatus).toBe("hold-ci-admission-long-hold-checkpoint-packet");
    expect(ciLongHoldRow?.summary).toContain("stream handoff posture");

    const ciReleaseReadinessRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "ci admission release-readiness decision packet",
    );
    expect(ciReleaseReadinessRow).toBeDefined();
    expect(ciReleaseReadinessRow?.reviewStatus).toBe("hold-ci-admission-release-readiness-decision-packet");
    expect(ciReleaseReadinessRow?.summary).toContain("hold/no-go broadening posture");

    const ciHarnessRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "ci admission proof-only harness packet",
    );
    expect(ciHarnessRow).toBeDefined();
    expect(ciHarnessRow?.reviewStatus).toBe("pass-ci-admission-proof-only-harness-packet");
    expect(ciHarnessRow?.summary).toContain("execution_admitted=false");

    const ciReadinessRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "ci admission readiness audit packet",
    );
    expect(ciReadinessRow).toBeDefined();
    expect(ciReadinessRow?.reviewStatus).toBe("pass-ci-admission-readiness-audit-packet");
    expect(ciReadinessRow?.summary).toContain("missing proof-only harness gates");

    const ciDesignRow = appEvidenceTimelineRows.find((row) => row.evidenceLane === "ci admission design packet");
    expect(ciDesignRow).toBeDefined();
    expect(ciDesignRow?.reviewStatus).toBe("pass-ci-admission-design-packet");
    expect(ciDesignRow?.summary).toContain("plan-only");

    const tiafBaselineRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "tiaf preflight baseline audit",
    );
    expect(tiafBaselineRow).toBeDefined();
    expect(tiafBaselineRow?.reviewStatus).toBe("pass-tiaf-preflight-baseline-audit");
    expect(tiafBaselineRow?.summary).toContain("needs-baseline maturity");

    const longHoldRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "build.execute.real long-hold checkpoint",
    );
    expect(longHoldRow).toBeDefined();
    expect(longHoldRow?.reviewStatus).toBe("hold-build-execution-long-hold");
    expect(longHoldRow?.summary).toContain("Long-hold checkpoint keeps hold/no-go posture explicit");

    const decisionRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "build.execute.real release-readiness decision",
    );
    expect(decisionRow).toBeDefined();
    expect(decisionRow?.reviewStatus).toBe("hold-build-execution-release-readiness");
    expect(decisionRow?.summary).toContain("holds a no-go posture");

    const boundaryRow = appEvidenceTimelineRows.find((row) => row.evidenceLane === "build.execute.real boundary hardening audit");
    expect(boundaryRow).toBeDefined();
    expect(boundaryRow?.reviewStatus).toBe("watch-build-execution-boundary");

    const configureRow = appEvidenceTimelineRows.find((row) => row.evidenceLane === "build.configure preflight review");
    expect(configureRow).toBeDefined();
    expect(configureRow?.reviewStatus).toBe("pass-build-configure-preflight");

    const flowTriggerContractRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "flow trigger suite runtime-admission contract design",
    );
    expect(flowTriggerContractRow).toBeDefined();
    expect(flowTriggerContractRow?.reviewStatus).toBe("pass-flow-trigger-runtime-admission-contract-design");
    expect(flowTriggerContractRow?.summary).toContain("deny-by-default state transitions");

    const flowTriggerProofOnlyRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "flow trigger suite runtime-admission proof-only implementation",
    );
    expect(flowTriggerProofOnlyRow).toBeDefined();
    expect(flowTriggerProofOnlyRow?.reviewStatus).toBe("pass-flow-trigger-runtime-admission-proof-only-implementation");
    expect(flowTriggerProofOnlyRow?.summary).toContain("fail-closed evaluation vectors");

    const flowTriggerOperatorExamplesRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "flow trigger suite runtime-admission operator-examples checkpoint",
    );
    expect(flowTriggerOperatorExamplesRow).toBeDefined();
    expect(flowTriggerOperatorExamplesRow?.reviewStatus).toBe(
      "pass-flow-trigger-runtime-admission-operator-examples-checkpoint",
    );
    expect(flowTriggerOperatorExamplesRow?.summary).toContain("deterministic fail-closed reason taxonomy");

    const flowTriggerReleaseReadinessRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "flow trigger suite runtime-admission release-readiness decision",
    );
    expect(flowTriggerReleaseReadinessRow).toBeDefined();
    expect(flowTriggerReleaseReadinessRow?.reviewStatus).toBe(
      "hold-flow-trigger-runtime-admission-release-readiness",
    );
    expect(flowTriggerReleaseReadinessRow?.summary).toContain("hold/no-go posture");

    const flowTriggerLongHoldRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "flow trigger suite runtime-admission long-hold checkpoint",
    );
    expect(flowTriggerLongHoldRow).toBeDefined();
    expect(flowTriggerLongHoldRow?.reviewStatus).toBe("hold-flow-trigger-runtime-admission-long-hold");
    expect(flowTriggerLongHoldRow?.summary).toContain("stream handoff boundaries");

    const editorRestoreRefreshRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "editor restore verification refresh",
    );
    expect(editorRestoreRefreshRow).toBeDefined();
    expect(editorRestoreRefreshRow?.reviewStatus).toBe("pass-editor-restore-verification-refresh");
    expect(editorRestoreRefreshRow?.summary).toContain("broad restore and broad mutation lanes fail-closed");

    const editorReadbackLongHoldRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "editor readback long-hold checkpoint",
    );
    expect(editorReadbackLongHoldRow).toBeDefined();
    expect(editorReadbackLongHoldRow?.reviewStatus).toBe("hold-editor-readback-long-hold");
    expect(editorReadbackLongHoldRow?.summary).toContain("held no-go broadening posture and stream handoff boundaries");

    const editorReadbackReleaseReadinessRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "editor readback release-readiness decision",
    );
    expect(editorReadbackReleaseReadinessRow).toBeDefined();
    expect(editorReadbackReleaseReadinessRow?.reviewStatus).toBe("hold-editor-readback-release-readiness");
    expect(editorReadbackReleaseReadinessRow?.summary).toContain("hold/no-go posture for editor readback broadening");

    const editorReadbackOperatorExamplesRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "editor readback operator-examples checkpoint",
    );
    expect(editorReadbackOperatorExamplesRow).toBeDefined();
    expect(editorReadbackOperatorExamplesRow?.reviewStatus).toBe("pass-editor-readback-operator-examples-checkpoint");
    expect(editorReadbackOperatorExamplesRow?.summary).toContain("safe readback and refused broad mutation/restore");

    const editorReadbackContractAlignmentRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "editor readback contract alignment audit",
    );
    expect(editorReadbackContractAlignmentRow).toBeDefined();
    expect(editorReadbackContractAlignmentRow?.reviewStatus).toBe("pass-editor-readback-contract-alignment-audit");
    expect(editorReadbackContractAlignmentRow?.summary).toContain("contract wording parity explicit");

    const editorAuthoringReadbackReviewRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "editor authoring readback review packet",
    );
    expect(editorAuthoringReadbackReviewRow).toBeDefined();
    expect(editorAuthoringReadbackReviewRow?.reviewStatus).toBe("pass-editor-authoring-readback-review-packet");
    expect(editorAuthoringReadbackReviewRow?.summary).toContain("readback wording explicit");

    const rollbackLongHoldRow = appEvidenceTimelineRows.find(
      (row) => row.evidenceLane === "settings.rollback long-hold checkpoint",
    );
    expect(rollbackLongHoldRow).toBeDefined();
    expect(rollbackLongHoldRow?.reviewStatus).toBe("hold-rollback-long-hold");
    expect(rollbackLongHoldRow?.summary).toContain("hold/no-go posture");
  });
});
