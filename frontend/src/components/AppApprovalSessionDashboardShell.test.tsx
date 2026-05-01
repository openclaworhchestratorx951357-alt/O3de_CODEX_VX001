import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppApprovalSessionDashboardShell from "./AppApprovalSessionDashboardShell";

describe("AppApprovalSessionDashboardShell", () => {
  it("renders intent-only and server-owned authorization truth without unlocking execution", () => {
    render(<AppApprovalSessionDashboardShell />);

    expect(screen.getByTestId("app-approval-session-dashboard-shell")).toBeInTheDocument();
    expect(screen.getByText("Approval/session dashboard shell (static fixture)")).toBeInTheDocument();
    expect(screen.getByText("Server-owned authorization only")).toBeInTheDocument();
    expect(screen.getByText("Client approval fields are intent-only")).toBeInTheDocument();

    expect(screen.getAllByText("validation.report.intake").length).toBeGreaterThan(0);
    expect(screen.getAllByText("asset_forge.o3de.stage_write.v1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("editor.component.property.write.narrow").length).toBeGreaterThan(0);

    expect(screen.getAllByText("false").length).toBeGreaterThan(0);

    expect(
      screen.getByText("Validation intake endpoint-candidate admission design", { selector: "strong" }),
    ).toBeInTheDocument();
  });
});
