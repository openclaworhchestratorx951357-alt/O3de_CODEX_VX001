import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppApprovalSessionDashboardShell from "./AppApprovalSessionDashboardShell";

describe("AppApprovalSessionDashboardShell", () => {
  it("renders static-fixture approval/session truth with validation gate-state linkage", () => {
    render(<AppApprovalSessionDashboardShell />);

    expect(screen.getByTestId("app-approval-session-dashboard-shell")).toBeInTheDocument();
    expect(screen.getByText("Approval/session dashboard shell (static fixture)")).toBeInTheDocument();
    expect(screen.getByText("Static fixture only")).toBeInTheDocument();
    expect(screen.getByText("Server-owned authorization truth")).toBeInTheDocument();
    expect(screen.getByText("Client fields are intent-only")).toBeInTheDocument();
    expect(screen.getByText("Fail-closed gate-state enforcement")).toBeInTheDocument();
    expect(screen.getByText("Dispatch unadmitted for validation.report.intake")).toBeInTheDocument();
    expect(screen.getByText("No backend execution admission changes")).toBeInTheDocument();
    expect(screen.getByText("No mutation corridor broadening")).toBeInTheDocument();
    expect(screen.getByText("Status chips must preserve shared taxonomy cues")).toBeInTheDocument();

    expect(screen.getByText("General approvals queue")).toBeInTheDocument();
    expect(screen.getByText("Asset Forge approval sessions")).toBeInTheDocument();
    expect(screen.getByText("Client authorization fields")).toBeInTheDocument();
    expect(screen.getByText("Validation intake endpoint candidate")).toBeInTheDocument();

    expect(screen.getByText("Server gate-state matrix")).toBeInTheDocument();
    expect(screen.getByText("missing_default_off")).toBeInTheDocument();
    expect(screen.getByText("explicit_off")).toBeInTheDocument();
    expect(screen.getByText("explicit_on")).toBeInTheDocument();
    expect(screen.getByText("invalid_default_off")).toBeInTheDocument();

    expect(screen.getByText("Operator review/status fields")).toBeInTheDocument();
    expect(screen.getByText("admission_flag_state")).toBeInTheDocument();
    expect(screen.getByText("execution_admitted")).toBeInTheDocument();
    expect(screen.getByText("write_status")).toBeInTheDocument();

    expect(screen.getByText("Fail-closed refusal matrix")).toBeInTheDocument();
    expect(
      screen.getByText("/tools/dispatch keeps validation.report.intake unadmitted (INVALID_TOOL)", {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("client fields remain intent-only and non-authorizing", { exact: false })).toBeInTheDocument();

    expect(screen.getByText("Editor placement proof-only design", { selector: "strong" })).toBeInTheDocument();
  });
});
