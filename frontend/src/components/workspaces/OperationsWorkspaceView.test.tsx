import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OperationsWorkspaceView from "./OperationsWorkspaceView";

describe("OperationsWorkspaceView", () => {
  it("keeps operations surface content mounted while hiding inactive panes", () => {
    render(
      <OperationsWorkspaceView
        activeSurfaceId="approvals"
        items={[
          {
            id: "dispatch",
            label: "Dispatch",
            detail: "Catalog and typed dispatch lane.",
            helpTooltip: "Use dispatch to launch governed work.",
          },
          {
            id: "agents",
            label: "Agents",
            detail: "Available operator families.",
            helpTooltip: "Use agents to inspect owned tool lanes.",
          },
          {
            id: "approvals",
            label: "Approvals",
            detail: "Pending approval queue.",
            helpTooltip: "Use approvals to resolve queued decisions.",
          },
          {
            id: "timeline",
            label: "Timeline",
            detail: "Cross-record event history.",
            helpTooltip: "Use timeline for historical follow-up.",
          },
        ]}
        onSelectSurface={vi.fn()}
        dispatchContent={<div>Dispatch content</div>}
        agentsContent={<div>Agents content</div>}
        approvalsContent={<div>Approvals content</div>}
        timelineContent={<div>Timeline content</div>}
      />,
    );

    expect(screen.getByText("Approvals content")).toBeInTheDocument();
    expect(screen.getByText("Inspector and truth")).toBeInTheDocument();
    expect(screen.getByTestId("dockable-layout-operations")).toBeInTheDocument();
    expect(screen.getByTestId("operations-top-zone")).toHaveTextContent("Surface strip");
    expect(screen.getByTestId("operations-left-zone")).toHaveTextContent("Surface navigator");
    expect(screen.getByTestId("operations-center-zone")).toHaveTextContent("Operations dominant work area");
    expect(screen.getByTestId("operations-right-zone")).toHaveTextContent("Inspector and truth");
    expect(screen.getByTestId("operations-bottom-zone")).toHaveTextContent("Operations queue and timeline summary drawer");
    expect(screen.getByText("Dispatch content").closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByText("Agents content").closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByText("Timeline content").closest("[aria-hidden='true']")).not.toBeNull();
  });
});
