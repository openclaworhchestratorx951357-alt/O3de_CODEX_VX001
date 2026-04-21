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
            helpTooltip: "Start here to orient the operator desktop.",
          },
          {
            id: "records",
            label: "Records",
            subtitle: "Runs, executions, artifacts",
            badge: "9",
            tone: "warning",
            helpTooltip: "Inspect persisted evidence and warnings.",
          },
        ]}
        quickStats={[
          {
            label: "Approvals",
            value: "2",
            tone: "warning",
            helpTooltip: "Pending decisions still need review.",
          },
          {
            label: "Bridge",
            value: "fresh",
            tone: "success",
            helpTooltip: "Heartbeat is currently fresh.",
          },
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
    expect(
      screen.getByRole("button", { name: /records/i }),
    ).toHaveAttribute("title", "Inspect persisted evidence and warnings.");
    expect(screen.getByText("Bridge").closest("div")).toHaveAttribute("title", "Heartbeat is currently fresh.");

    fireEvent.click(screen.getByRole("button", { name: /records/i }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("records");
  });
});
