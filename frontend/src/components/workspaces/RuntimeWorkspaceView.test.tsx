import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RuntimeWorkspaceView from "./RuntimeWorkspaceView";

describe("RuntimeWorkspaceView", () => {
  it("renders only the active runtime surface content", () => {
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
    expect(screen.queryByText("Overview content")).not.toBeInTheDocument();
    expect(screen.queryByText("Executors content")).not.toBeInTheDocument();
    expect(screen.queryByText("Governance content")).not.toBeInTheDocument();
  });
});
