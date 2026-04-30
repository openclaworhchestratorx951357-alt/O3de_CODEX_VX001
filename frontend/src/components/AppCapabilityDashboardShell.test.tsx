import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppCapabilityDashboardShell from "./AppCapabilityDashboardShell";

describe("AppCapabilityDashboardShell", () => {
  it("renders status-taxonomy-aligned capability truth across app domains", () => {
    render(<AppCapabilityDashboardShell />);

    expect(screen.getByTestId("app-capability-dashboard-shell")).toBeInTheDocument();
    expect(screen.getByText("App-wide Capability Dashboard shell (static fixture)")).toBeInTheDocument();
    expect(
      screen.getByText("Frontend truth view for capability maturity across the whole app. This panel is static-fixture-first and does not enable execution."),
    ).toBeInTheDocument();

    expect(screen.getByText("No backend execution admission changes")).toBeInTheDocument();
    expect(screen.getByText("Server-owned authorization truth")).toBeInTheDocument();
    expect(screen.getByText("Client fields are intent-only")).toBeInTheDocument();
    expect(screen.getByText("No mutation corridor broadening")).toBeInTheDocument();
    expect(screen.getByText("Status chips must preserve shared taxonomy cues")).toBeInTheDocument();

    expect(screen.getByText("validation.report.intake")).toBeInTheDocument();
    expect(screen.getByText("project.inspect")).toBeInTheDocument();
    expect(screen.getByText("settings.inspect")).toBeInTheDocument();
    expect(screen.getByText("editor.component.property.get")).toBeInTheDocument();
    expect(screen.getByText("asset_forge.o3de.stage_write.v1")).toBeInTheDocument();
    expect(screen.getByText("settings.patch.narrow")).toBeInTheDocument();
    expect(screen.getByText("settings.rollback")).toBeInTheDocument();
    expect(screen.getByText("build.configure.preflight")).toBeInTheDocument();
    expect(screen.getByText("build.execute.real")).toBeInTheDocument();
    expect(screen.getByText("codex.flow.trigger.productized")).toBeInTheDocument();
    expect(screen.getByText("Status taxonomy mix")).toBeInTheDocument();
    expect(
      screen.getAllByText("Admitted-real chips stay green across capability, audit, workspace, and timeline shells.")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("hold-default-off").length).toBeGreaterThan(0);
    expect(screen.getAllByText("blocked").length).toBeGreaterThan(0);

    expect(screen.getByText("Audit review dashboard truth refresh + status-chip linkage", { selector: "strong" })).toBeInTheDocument();
  });
});
