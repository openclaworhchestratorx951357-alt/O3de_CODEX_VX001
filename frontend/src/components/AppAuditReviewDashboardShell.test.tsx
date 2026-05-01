import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppAuditReviewDashboardShell from "./AppAuditReviewDashboardShell";

describe("AppAuditReviewDashboardShell", () => {
  it("renders cross-domain audit fixture verdicts without implying execution admission", () => {
    render(<AppAuditReviewDashboardShell />);

    expect(screen.getByTestId("app-audit-review-dashboard-shell")).toBeInTheDocument();
    expect(screen.getByText("Audit review dashboard shell (static fixture)")).toBeInTheDocument();
    expect(screen.getByText("Static fixture only")).toBeInTheDocument();
    expect(screen.getByText("No backend execution admission changes")).toBeInTheDocument();

    expect(screen.getByText("Editor")).toBeInTheDocument();
    expect(screen.getByText("Asset Forge")).toBeInTheDocument();
    expect(screen.getByText("Project/Config")).toBeInTheDocument();
    expect(screen.getByText("Validation")).toBeInTheDocument();
    expect(screen.getByText("GUI")).toBeInTheDocument();
    expect(screen.getByText("Automation")).toBeInTheDocument();

    expect(
      screen.getByText("Validation intake endpoint-candidate admission design", { selector: "strong" }),
    ).toBeInTheDocument();
  });
});
