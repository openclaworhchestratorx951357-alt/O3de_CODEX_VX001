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
    expect(screen.getByText("How to use this workspace")).toBeInTheDocument();
    expect(screen.getByText(/Treat Command Center as the queue-and-control lane for operator action/i)).toBeInTheDocument();
    expect(screen.getByText(/Use this tab whenever the approvals counter is non-zero/i)).toBeInTheDocument();
    expect(screen.getByText("Dispatch content").closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByText("Agents content").closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByText("Timeline content").closest("[aria-hidden='true']")).not.toBeNull();
  });
});
