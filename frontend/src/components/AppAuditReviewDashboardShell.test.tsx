import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppAuditReviewDashboardShell from "./AppAuditReviewDashboardShell";

describe("AppAuditReviewDashboardShell", () => {
  it("renders cross-domain audit verdicts with status-taxonomy-aligned review labels", () => {
    render(<AppAuditReviewDashboardShell />);

    expect(screen.getByTestId("app-audit-review-dashboard-shell")).toBeInTheDocument();
    expect(screen.getByText("Audit review dashboard shell (static fixture)")).toBeInTheDocument();
    expect(screen.getByText("Static fixture only")).toBeInTheDocument();
    expect(screen.getByText("Server-owned authorization truth")).toBeInTheDocument();
    expect(screen.getByText("Client fields are intent-only")).toBeInTheDocument();
    expect(screen.getByText("No backend execution admission changes")).toBeInTheDocument();
    expect(screen.getByText("No mutation corridor broadening")).toBeInTheDocument();
    expect(screen.getByText("Status chips must preserve shared taxonomy cues")).toBeInTheDocument();

    expect(screen.getAllByText("Editor").length).toBeGreaterThan(0);
    expect(screen.getByText("Asset Forge")).toBeInTheDocument();
    expect(screen.getByText("Project/Config")).toBeInTheDocument();
    expect(screen.getByText("build.execute.real long-hold checkpoint")).toBeInTheDocument();
    expect(screen.getByText("Validation")).toBeInTheDocument();
    expect(screen.getByText("GUI")).toBeInTheDocument();
    expect(screen.getByText("Automation")).toBeInTheDocument();
    expect(screen.getByText("Status taxonomy mix")).toBeInTheDocument();
    expect(
      screen.getAllByText("Admitted-real chips stay green across capability, audit, workspace, and timeline shells.")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("hold-default-off").length).toBeGreaterThan(0);
    expect(screen.getAllByText("blocked").length).toBeGreaterThan(0);

    expect(screen.getByText("Asset Forge stage-write admission-flag verification refresh", { selector: "strong" })).toBeInTheDocument();
  });
});
