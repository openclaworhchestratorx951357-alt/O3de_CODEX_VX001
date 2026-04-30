import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppEvidenceTimelineShell from "./AppEvidenceTimelineShell";

describe("AppEvidenceTimelineShell", () => {
  it("renders cross-domain evidence chronology with approval/validation linkage truth", () => {
    render(<AppEvidenceTimelineShell />);

    expect(screen.getByTestId("app-evidence-timeline-shell")).toBeInTheDocument();
    expect(screen.getByText("App-wide Evidence Timeline shell (static fixture)")).toBeInTheDocument();
    expect(screen.getByText("Static fixture only")).toBeInTheDocument();
    expect(screen.getByText("Server-owned authorization truth")).toBeInTheDocument();
    expect(screen.getByText("Client fields are intent-only")).toBeInTheDocument();
    expect(screen.getByText("Fail-closed gate-state enforcement")).toBeInTheDocument();
    expect(screen.getByText("No backend execution admission changes")).toBeInTheDocument();
    expect(screen.getByText("No mutation corridor broadening")).toBeInTheDocument();
    expect(screen.getByText("Status chips must preserve shared taxonomy cues")).toBeInTheDocument();
    expect(screen.getByText("Dispatch unadmitted for validation.report.intake")).toBeInTheDocument();

    expect(screen.getAllByText("Validation").length).toBeGreaterThan(0);
    expect(screen.getByText("Asset Forge")).toBeInTheDocument();
    expect(screen.getAllByText("Project/Config").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Editor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GUI").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Automation").length).toBeGreaterThan(0);

    expect(screen.getAllByText("demo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("plan-only").length).toBeGreaterThan(0);
    expect(screen.getByText("dry-run only")).toBeInTheDocument();
    expect(screen.getAllByText("proof-only").length).toBeGreaterThan(1);
    expect(screen.getAllByText("admitted-real").length).toBeGreaterThan(0);
    expect(screen.getByText("hold-default-off")).toBeInTheDocument();
    expect(screen.getByText("linked-validation-hold")).toBeInTheDocument();
    expect(screen.getByText("GUI shell taxonomy parity checkpoint + quick-reference refresh packet")).toBeInTheDocument();
    expect(
      screen.getByText("cross-shell taxonomy parity + quick-reference drift-check checkpoint"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-gui-shell-taxonomy-parity-checkpoint-quick-reference-refresh-packet")).toBeInTheDocument();
    expect(screen.getByText("audit review dashboard truth refresh + status-chip linkage packet")).toBeInTheDocument();
    expect(
      screen.getByText("audit dashboard taxonomy + status-chip linkage cue checkpoint"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-audit-review-dashboard-truth-refresh-status-chip-linkage-packet")).toBeInTheDocument();
    expect(screen.getByText("app capability dashboard truth refresh + status-chip linkage packet")).toBeInTheDocument();
    expect(
      screen.getByText("capability dashboard taxonomy + status-chip linkage cue checkpoint"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-app-capability-dashboard-truth-refresh-status-chip-linkage-packet")).toBeInTheDocument();
    expect(screen.getByText("workspace status chips shell + truth taxonomy linkage packet")).toBeInTheDocument();
    expect(screen.getByText("workspace status taxonomy + cross-shell linkage checkpoint")).toBeInTheDocument();
    expect(screen.getByText("pass-workspace-status-chips-shell-truth-taxonomy-linkage-packet")).toBeInTheDocument();
    expect(
      screen.getByText("app-wide evidence timeline shell + approval/validation linkage audit packet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cross-domain evidence chronology + approval/validation linkage audit checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-app-wide-evidence-timeline-shell-approval-validation-linkage-audit-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("approval/session dashboard truth refresh + validation linkage packet")).toBeInTheDocument();
    expect(
      screen.getByText("approval/session shell + validation-hold truth linkage refresh checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-approval-session-dashboard-truth-refresh-validation-linkage-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("approval/session dashboard shell static-fixture-first packet")).toBeInTheDocument();
    expect(
      screen.getByText("approval/session shell static-fixture wording and boundary-linkage checkpoint"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-approval-session-dashboard-shell-static-fixture-first-packet")).toBeInTheDocument();
    expect(screen.getByText("approval/session dashboard long-hold checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "approval/session baseline + shell + timeline + recommendation long-hold stream handoff checkpoint",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-approval-session-dashboard-long-hold-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("approval/session dashboard parity checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("approval/session baseline + shell + timeline + recommendation parity checkpoint"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-approval-session-dashboard-parity-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary long-hold checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane long-hold stream handoff checkpoint"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-hold-boundary-long-hold-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary release-readiness decision packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane release-readiness decision checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-release-readiness-decision-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary self-management checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane self-management checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-self-management-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary self-command checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane self-command checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-self-command-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary self-direction checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane self-direction checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-self-direction-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary self-authorship checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane self-authorship checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-self-authorship-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary agency checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane agency checkpoint"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-hold-boundary-agency-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary self-determination checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane self-determination checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-self-determination-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary self-governance checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane self-governance checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-self-governance-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary autonomy checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane autonomy checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-autonomy-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary independence checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane independence checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-independence-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary nonpartisanship checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane nonpartisanship checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-nonpartisanship-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary objectivity checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane objectivity checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-objectivity-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary neutrality checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane neutrality checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-neutrality-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary impartiality checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane impartiality checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-impartiality-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary fairness checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane fairness checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-fairness-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary equity checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane equity checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-equity-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary inclusivity checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane inclusivity checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-inclusivity-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary accessibility checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane accessibility checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-accessibility-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary usability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane usability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-usability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary supportability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane supportability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-supportability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary serviceability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane serviceability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-serviceability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary availability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane availability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-availability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary reliability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane reliability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-reliability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary predictability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane predictability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-predictability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary reproducibility checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane reproducibility checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-reproducibility-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary repeatability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane repeatability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-repeatability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary determinism checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane determinism checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-determinism-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary certainty checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane certainty checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-certainty-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary confidence checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane confidence checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-confidence-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary assurance checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane assurance checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-assurance-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary accountability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane accountability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-accountability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary provenance checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane provenance checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-provenance-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary traceability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane traceability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-traceability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary auditability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane auditability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-auditability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary operability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane operability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-operability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary adaptability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane adaptability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-adaptability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary maintainability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane maintainability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-maintainability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary sustainability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane sustainability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-sustainability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary longevity checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane longevity checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-longevity-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary endurance checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane endurance checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-endurance-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary durability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane durability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-durability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary continuity checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane continuity checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-continuity-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary resilience checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane resilience checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-resilience-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary stability checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight + real CI/test execution held-lane stability checkpoint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-stability-checkpoint-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary progression integrity packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "TIAF/preflight + real CI/test execution held-lane progression integrity checkpoint",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("pass-validation-workflow-hold-boundary-progression-integrity-packet"),
    ).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary chronology checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "TIAF/preflight + real CI/test execution held-lane chronology parity checkpoint",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-hold-boundary-chronology-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary taxonomy checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "TIAF/preflight + real CI/test execution held-lane truth-taxonomy parity checkpoint",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-hold-boundary-taxonomy-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary review-status parity packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "TIAF/preflight + real CI/test execution held-lane review-status token parity checkpoint",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-hold-boundary-review-status-parity-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary wording-audit packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "TIAF/preflight + real CI/test execution canonical held-lane wording parity audit checkpoint",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-hold-boundary-wording-audit-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary example checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "TIAF/preflight + real CI/test execution operator-safe held-lane wording examples checkpoint",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-hold-boundary-example-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow hold-boundary consistency packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "TIAF/preflight + real CI/test execution canonical held-lane boundary wording consistency checkpoint",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-hold-boundary-consistency-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow command-evidence checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "backend.test.run + frontend.test.run canonical command-to-evidence ownership checkpoint + explicit hold-boundary linkage",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-command-evidence-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow quick-reference packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "backend.test.run + frontend.test.run deterministic command quick-reference + explicit hold-boundary linkage",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-quick-reference-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow drift-guard checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "backend.test.run + frontend.test.run deterministic command drift-guard parity checkpoint + non-admitting hold linkage",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-drift-guard-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("validation workflow index refresh packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "backend.test.run + frontend.test.run deterministic command index refresh + non-admitting hold linkage",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-validation-workflow-index-refresh-packet")).toBeInTheDocument();
    expect(screen.getByText("tiaf preflight long-hold checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight long-hold stream handoff checkpoint + fail-closed non-admitting envelope"),
    ).toBeInTheDocument();
    expect(screen.getByText("hold-tiaf-preflight-long-hold-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("tiaf preflight release-readiness decision packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight release-readiness hold/no-go decision + fail-closed non-admitting envelope"),
    ).toBeInTheDocument();
    expect(screen.getByText("hold-tiaf-preflight-release-readiness-decision-packet")).toBeInTheDocument();
    expect(screen.getByText("tiaf preflight proof-only harness packet")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight bounded proof-only harness checkpoint + fail-closed non-admitting envelope"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-tiaf-preflight-proof-only-harness-packet")).toBeInTheDocument();
    expect(screen.getByText("tiaf preflight readiness audit packet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "TIAF/preflight readiness-gate classification + bounded implementation touchpoint inventory (non-admitting)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-tiaf-preflight-readiness-audit-packet")).toBeInTheDocument();
    expect(screen.getByText("tiaf preflight contract design packet")).toBeInTheDocument();
    expect(screen.getByText("TIAF/preflight contract boundaries + fail-closed semantics (non-admitting)")).toBeInTheDocument();
    expect(screen.getByText("pass-tiaf-preflight-contract-design-packet")).toBeInTheDocument();
    expect(screen.getByText("ci admission long-hold checkpoint packet")).toBeInTheDocument();
    expect(
      screen.getByText("real CI/test execution long-hold stream handoff checkpoint + fail-closed non-admitting envelope"),
    ).toBeInTheDocument();
    expect(screen.getByText("hold-ci-admission-long-hold-checkpoint-packet")).toBeInTheDocument();
    expect(screen.getByText("ci admission release-readiness decision packet")).toBeInTheDocument();
    expect(
      screen.getByText("real CI/test execution release-readiness hold/no-go decision + fail-closed non-admitting envelope"),
    ).toBeInTheDocument();
    expect(screen.getByText("hold-ci-admission-release-readiness-decision-packet")).toBeInTheDocument();
    expect(screen.getByText("ci admission proof-only harness packet")).toBeInTheDocument();
    expect(
      screen.getByText("real CI/test execution proof-only harness checkpoint + fail-closed non-admitting envelope"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-ci-admission-proof-only-harness-packet")).toBeInTheDocument();
    expect(screen.getByText("ci admission readiness audit packet")).toBeInTheDocument();
    expect(
      screen.getByText("real CI/test execution readiness-gate audit + fail-closed no-touch boundary matrix"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-ci-admission-readiness-audit-packet")).toBeInTheDocument();
    expect(screen.getByText("ci admission design packet")).toBeInTheDocument();
    expect(
      screen.getByText("real CI/test execution design boundaries + fail-closed readiness-gate model"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-ci-admission-design-packet")).toBeInTheDocument();
    expect(screen.getByText("tiaf preflight baseline audit")).toBeInTheDocument();
    expect(
      screen.getByText("TIAF/preflight baseline maturity classification + no-runtime-mutation boundary posture"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-tiaf-preflight-baseline-audit")).toBeInTheDocument();
    expect(screen.getByText("project.inspect")).toBeInTheDocument();
    expect(screen.getByText("pass-read-only")).toBeInTheDocument();
    expect(screen.getByText("settings.inspect (via project.inspect include_settings)")).toBeInTheDocument();
    expect(screen.getByText("pass-settings-read-only")).toBeInTheDocument();
    expect(screen.getByText("settings.patch.narrow")).toBeInTheDocument();
    expect(screen.getByText("watch-narrow-mutation")).toBeInTheDocument();
    expect(screen.getByText("build.execute.real release-readiness decision")).toBeInTheDocument();
    expect(screen.getByText("build.execute.real long-hold checkpoint")).toBeInTheDocument();
    expect(
      screen.getAllByText("build.execute.real (gated explicit named targets; no broad build execution)").length,
    ).toBeGreaterThan(1);
    expect(screen.getByText("hold-build-execution-release-readiness")).toBeInTheDocument();
    expect(screen.getByText("hold-build-execution-long-hold")).toBeInTheDocument();
    expect(screen.getByText("build.execute.real boundary hardening audit")).toBeInTheDocument();
    expect(screen.getByText("watch-build-execution-boundary")).toBeInTheDocument();
    expect(screen.getByText("build.configure preflight review")).toBeInTheDocument();
    expect(screen.getByText("build.configure.preflight (real dry-run path; no configure mutation)")).toBeInTheDocument();
    expect(screen.getByText("pass-build-configure-preflight")).toBeInTheDocument();
    expect(screen.getByText("settings.rollback long-hold checkpoint")).toBeInTheDocument();
    expect(screen.getByText("settings.rollback release-readiness decision")).toBeInTheDocument();
    expect(screen.getByText("settings.rollback verification checkpoint")).toBeInTheDocument();
    expect(
      screen.getAllByText("settings.rollback (bounded through settings.patch.narrow evidence)").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("hold-rollback-long-hold")).toBeInTheDocument();
    expect(screen.getByText("hold-rollback-release-readiness")).toBeInTheDocument();
    expect(screen.getByText("pass-rollback-verification")).toBeInTheDocument();
    expect(screen.getByText("watch-rollback-boundary")).toBeInTheDocument();
    expect(screen.getByText("editor readback long-hold checkpoint")).toBeInTheDocument();
    expect(
      screen.getByText(
        "editor.component.property.get held no-go broadening posture + editor.content.restore.narrow exact-corridor boundary handoff",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("hold-editor-readback-long-hold")).toBeInTheDocument();
    expect(screen.getByText("editor readback release-readiness decision")).toBeInTheDocument();
    expect(
      screen.getByText(
        "editor.component.property.get hold/no-go broadening decision + editor.content.restore.narrow exact-corridor boundary posture",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("hold-editor-readback-release-readiness")).toBeInTheDocument();
    expect(screen.getByText("editor readback operator-examples checkpoint")).toBeInTheDocument();
    expect(
      screen.getByText(
        "editor.component.property.get safe/refused operator examples + editor.content.restore.narrow exact-corridor wording",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-editor-readback-operator-examples-checkpoint")).toBeInTheDocument();
    expect(screen.getByText("editor readback contract alignment audit")).toBeInTheDocument();
    expect(
      screen.getByText(
        "editor.component.property.get readback contract wording parity + editor.content.restore.narrow boundary wording",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-editor-readback-contract-alignment-audit")).toBeInTheDocument();
    expect(screen.getByText("editor authoring readback review packet")).toBeInTheDocument();
    expect(
      screen.getByText("editor.component.property.get + editor.content.restore.narrow + editor.mutation.broad refusal boundaries"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-editor-authoring-readback-review-packet")).toBeInTheDocument();
    expect(screen.getByText("editor restore verification refresh")).toBeInTheDocument();
    expect(
      screen.getByText("editor.content.restore.narrow + editor.mutation.broad refusal boundaries"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-editor-restore-verification-refresh")).toBeInTheDocument();
    expect(screen.getByText("editor narrow-corridor verification refresh")).toBeInTheDocument();
    expect(
      screen.getByText("editor.component.property.write.narrow + editor.mutation.broad refusal boundaries"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-editor-narrow-corridor-refresh")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite productization plan")).toBeInTheDocument();
    expect(
      screen.getByText("codex.flow.trigger.local helper inventory + productization boundaries (non-admitting)"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-flow-trigger-productization-plan")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite security-review gate")).toBeInTheDocument();
    expect(
      screen.getByText("codex.flow.trigger.security_review threat + control matrix (non-admitting)"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-flow-trigger-security-review-gate")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite operator-approval gate")).toBeInTheDocument();
    expect(
      screen.getByText("codex.flow.trigger.operator_approval semantics + fail-closed expiry/revocation (non-admitting)"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-flow-trigger-operator-approval-gate")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite runtime-admission long-hold checkpoint")).toBeInTheDocument();
    expect(
      screen.getByText(
        "codex.flow.trigger.runtime_admission long-hold checkpoint + stream handoff boundaries (non-admitting)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("hold-flow-trigger-runtime-admission-long-hold")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite runtime-admission release-readiness decision")).toBeInTheDocument();
    expect(
      screen.getByText(
        "codex.flow.trigger.runtime_admission release-readiness hold/no-go decision (non-admitting)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("hold-flow-trigger-runtime-admission-release-readiness")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite runtime-admission operator-examples checkpoint")).toBeInTheDocument();
    expect(
      screen.getByText(
        "codex.flow.trigger.runtime_admission operator examples + fail-closed reason taxonomy (non-admitting)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-flow-trigger-runtime-admission-operator-examples-checkpoint")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite runtime-admission proof-only implementation")).toBeInTheDocument();
    expect(
      screen.getByText(
        "codex.flow.trigger.runtime_admission proof-only contract-evaluation vectors (non-admitting)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-flow-trigger-runtime-admission-proof-only-implementation")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite runtime-admission contract design")).toBeInTheDocument();
    expect(
      screen.getByText(
        "codex.flow.trigger.runtime_admission contract state machine + fail-closed invariants (non-admitting)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-flow-trigger-runtime-admission-contract-design")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite runtime-admission readiness audit")).toBeInTheDocument();
    expect(
      screen.getByText("codex.flow.trigger.runtime_admission readiness gates classification (non-admitting)"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-flow-trigger-runtime-admission-readiness-audit")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite productization design")).toBeInTheDocument();
    expect(
      screen.getByText("codex.flow.trigger.productized bounded candidate contract (design-only)"),
    ).toBeInTheDocument();
    expect(screen.getByText("pass-flow-trigger-productization-design")).toBeInTheDocument();
    expect(screen.getByText("flow trigger suite audit-gate checklist")).toBeInTheDocument();
    expect(screen.getByText("codex.flow.trigger.audit_gate checklist stop-point contract")).toBeInTheDocument();
    expect(screen.getByText("pass-flow-trigger-audit-gate-checklist")).toBeInTheDocument();

    expect(screen.getByText("Asset Forge Blender preflight hardening", { selector: "strong" })).toBeInTheDocument();
  });
});
