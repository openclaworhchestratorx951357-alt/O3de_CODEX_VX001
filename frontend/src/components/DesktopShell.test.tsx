import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DesktopShell from "./DesktopShell";

describe("DesktopShell", () => {
  it("renders workspace navigation and forwards selection events", () => {
    const onSelectWorkspace = vi.fn();

    render(
      <DesktopShell
        appTitle="O3DE Agent Control App"
        appSubtitle="Desktop operator shell"
        workspaceTitle="Home"
        workspaceSubtitle="Overview and launch surface"
        activeWorkspaceId="home"
        navItems={[
          {
            id: "home",
            label: "Home",
            subtitle: "Overview and launch surface",
            badge: "2",
            tone: "info",
          },
          {
            id: "records",
            label: "Records",
            subtitle: "Runs, executions, artifacts",
            badge: "9",
            tone: "warning",
          },
        ]}
        quickStats={[
          { label: "Approvals", value: "2", tone: "warning" },
          { label: "Bridge", value: "fresh", tone: "success" },
        ]}
        utilityLabel="bridge live"
        utilityDetail="Heartbeat is fresh."
        onSelectWorkspace={onSelectWorkspace}
      >
        <div>Workspace body</div>
      </DesktopShell>,
    );

    expect(screen.getByText("Control surface")).toBeInTheDocument();
    expect(screen.getByText("Active workspace")).toBeInTheDocument();
    expect(screen.getByText("Workspace body")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /records/i }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("records");
  });
});
