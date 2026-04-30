import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppWorkspaceStatusChipsShell from "./AppWorkspaceStatusChipsShell";

describe("AppWorkspaceStatusChipsShell", () => {
  it("renders status taxonomy chips without implying authorization or execution admission", () => {
    render(<AppWorkspaceStatusChipsShell />);

    expect(screen.getByTestId("app-workspace-status-chips-shell")).toBeInTheDocument();
    expect(screen.getByText("Workspace status chips shell (static fixture)")).toBeInTheDocument();
    expect(screen.getByText("Static fixture only")).toBeInTheDocument();
    expect(screen.getByText("Server-owned authorization truth")).toBeInTheDocument();
    expect(screen.getByText("Client fields are intent-only")).toBeInTheDocument();
    expect(screen.getByText("Fail-closed gate-state enforcement")).toBeInTheDocument();
    expect(screen.getByText("Dispatch unadmitted for validation.report.intake")).toBeInTheDocument();
    expect(screen.getByText("No backend execution admission changes")).toBeInTheDocument();
    expect(screen.getByText("No mutation corridor broadening")).toBeInTheDocument();
    expect(screen.getByText("Status chips must preserve shared taxonomy cues")).toBeInTheDocument();

    expect(screen.getAllByText("admitted-real").length).toBeGreaterThan(0);
    expect(screen.getAllByText("proof-only").length).toBeGreaterThan(1);
    expect(screen.getAllByText("dry-run only").length).toBeGreaterThan(0);
    expect(screen.getAllByText("demo").length).toBeGreaterThan(0);
    expect(screen.getByText("hold-default-off")).toBeInTheDocument();
    expect(screen.getByText("blocked")).toBeInTheDocument();

    expect(screen.getByText("Validation intake endpoint candidate")).toBeInTheDocument();
    expect(screen.getByText("Editor authoring readback review lane")).toBeInTheDocument();
    expect(screen.getByText("editor.component.property.get")).toBeInTheDocument();
    expect(screen.getByText("Settings inspect review lane")).toBeInTheDocument();
    expect(screen.getByText("settings.inspect (via project.inspect)")).toBeInTheDocument();
    expect(screen.getByText("Build configure preflight review lane")).toBeInTheDocument();
    expect(screen.getByText("build.configure.preflight")).toBeInTheDocument();
    expect(screen.getByText("Build execution long-hold lane")).toBeInTheDocument();
    expect(screen.getByText("build.execute.real")).toBeInTheDocument();
    expect(screen.getByText("Asset Forge stage write")).toBeInTheDocument();
    expect(screen.getByText("Project config patch corridor")).toBeInTheDocument();
    expect(screen.getByText("Placement execution")).toBeInTheDocument();
    expect(
      screen.getAllByText("Admitted-real chips stay green across capability, audit, workspace, and timeline shells.")
        .length,
    ).toBeGreaterThan(0);

    expect(screen.getByText("Asset Forge placement proof-only admission-flag release-readiness decision", { selector: "strong" })).toBeInTheDocument();
  });
});
