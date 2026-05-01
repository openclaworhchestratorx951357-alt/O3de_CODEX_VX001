import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RuntimeWorkspaceView from "./RuntimeWorkspaceView";

describe("RuntimeWorkspaceView", () => {
  it("keeps runtime surface content mounted while hiding inactive panes", () => {
    render(
      <RuntimeWorkspaceView
        activeSurfaceId="workspaces"
        items={[
          {
            id: "overview",
            label: "Overview",
            detail: "Bridge and runtime status.",
            helpTooltip: "Use overview for current runtime health.",
          },
          {
            id: "executors",
            label: "Executors",
            detail: "Execution owners and availability.",
            helpTooltip: "Use executors for ownership follow-up.",
          },
          {
            id: "workspaces",
            label: "Workspaces",
            detail: "Workspace state and related activity.",
            helpTooltip: "Use workspaces for substrate follow-up.",
          },
          {
            id: "governance",
            label: "Governance",
            detail: "Policies and capability posture.",
            helpTooltip: "Use governance for policy and lock review.",
          },
        ]}
        onSelectSurface={vi.fn()}
        overviewContent={<div>Overview content</div>}
        executorsContent={<div>Executors content</div>}
        workspacesContent={<div>Workspaces content</div>}
        governanceContent={<div>Governance content</div>}
      />,
    );

    expect(screen.getByText("Workspaces content")).toBeInTheDocument();
    expect(screen.getByText("Inspector and truth")).toBeInTheDocument();
    expect(screen.getByTestId("dockable-layout-runtime")).toBeInTheDocument();
    expect(screen.getByTestId("runtime-top-zone")).toHaveTextContent("Surface strip");
    expect(screen.getByTestId("runtime-left-zone")).toHaveTextContent("Surface navigator");
    expect(screen.getByTestId("runtime-center-zone")).toHaveTextContent("Runtime dominant work area");
    expect(screen.getByTestId("runtime-right-zone")).toHaveTextContent("Inspector and truth");
    expect(screen.getByTestId("runtime-bottom-zone")).toHaveTextContent("Runtime evidence and lane summary drawer");
    expect(screen.getByText("Overview content").closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByText("Executors content").closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByText("Governance content").closest("[aria-hidden='true']")).not.toBeNull();
  });
});
