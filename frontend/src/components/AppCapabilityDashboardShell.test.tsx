import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppCapabilityDashboardShell from "./AppCapabilityDashboardShell";

describe("AppCapabilityDashboardShell", () => {
  it("renders static fixture truth labels and cross-domain capability rows", () => {
    render(<AppCapabilityDashboardShell />);

    expect(screen.getByTestId("app-capability-dashboard-shell")).toBeInTheDocument();
    expect(screen.getByText("App-wide Capability Dashboard shell (static fixture)")).toBeInTheDocument();
    expect(
      screen.getByText("Frontend truth view for capability maturity across the whole app. This panel is static-fixture-first and does not enable execution."),
    ).toBeInTheDocument();

    expect(screen.getByText("No backend execution admission changes")).toBeInTheDocument();
    expect(screen.getByText("No mutation path enablement")).toBeInTheDocument();

    expect(screen.getByText("editor.session.open")).toBeInTheDocument();
    expect(screen.getByText("asset_forge.o3de.stage_write.v1")).toBeInTheDocument();
    expect(screen.getByText("build.execute.real")).toBeInTheDocument();
    expect(screen.getByText("codex.flow.trigger.productized")).toBeInTheDocument();

    expect(
      screen.getByText("Validation intake endpoint-candidate admission design", { selector: "strong" }),
    ).toBeInTheDocument();
  });
});
