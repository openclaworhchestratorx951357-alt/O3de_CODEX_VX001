import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppWorkspaceStatusChipsShell from "./AppWorkspaceStatusChipsShell";

describe("AppWorkspaceStatusChipsShell", () => {
  it("renders truthful cross-workspace status chips without unlocking execution", () => {
    render(<AppWorkspaceStatusChipsShell />);

    expect(screen.getByTestId("app-workspace-status-chips-shell")).toBeInTheDocument();
    expect(screen.getByText("Workspace status chips shell (static fixture)")).toBeInTheDocument();
    expect(screen.getByText("Static fixture only")).toBeInTheDocument();
    expect(screen.getByText("No backend execution admission changes")).toBeInTheDocument();

    expect(screen.getAllByText("Home")).toHaveLength(4);
    expect(screen.getByText("Asset Forge")).toBeInTheDocument();
    expect(screen.getByText("Runtime")).toBeInTheDocument();
    expect(screen.getByText("Records")).toBeInTheDocument();

    expect(screen.getAllByText("asset_forge.o3de.stage_write.v1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("validation.report.intake").length).toBeGreaterThan(0);

    expect(
      screen.getByText("Validation intake endpoint-candidate admission design", { selector: "strong" }),
    ).toBeInTheDocument();
  });
});
