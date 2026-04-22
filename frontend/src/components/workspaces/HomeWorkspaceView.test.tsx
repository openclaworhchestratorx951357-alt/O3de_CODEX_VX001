import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomeWorkspaceView from "./HomeWorkspaceView";

describe("HomeWorkspaceView", () => {
  it("defaults to the calmer start-here layout and switches surfaces on demand", () => {
    render(
      <HomeWorkspaceView
        missionControlContent={<div>Mission control content</div>}
        launchpadContent={<div>Launchpad content</div>}
        overviewContent={<div>Overview content</div>}
        guideContent={<div>Guide content</div>}
      />,
    );

    expect(screen.getByText("Mission control content")).toBeInTheDocument();
    expect(screen.getByText("Launchpad content")).toBeInTheDocument();
    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.getAllByText("How to use this workspace")).toHaveLength(1);
    expect(screen.getAllByText("How to use this window")).toHaveLength(3);
    expect(screen.getByText(/Refresh the dashboard when you need a current top-level read/i)).toBeInTheDocument();
    expect(screen.getByText(/Use Launchpad as the fastest route into a specific workflow/i)).toBeInTheDocument();
    expect(screen.queryByText("Guide content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mission control/i }));
    expect(screen.getByText("Mission control content")).toBeInTheDocument();
    expect(screen.getByText(/Use the refresh actions first when you suspect the desktop is stale/i)).toBeInTheDocument();
    expect(screen.queryByText("Launchpad content")).not.toBeInTheDocument();
    expect(screen.queryByText("Overview content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /guidebook/i }));
    expect(screen.getByText("Guide content")).toBeInTheDocument();
    expect(screen.getByText(/Use the guidebook while onboarding or after layout changes/i)).toBeInTheDocument();
    expect(screen.queryByText("Mission control content")).not.toBeInTheDocument();
  });
});
