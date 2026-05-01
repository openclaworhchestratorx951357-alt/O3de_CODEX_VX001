import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomeWorkspaceView from "./HomeWorkspaceView";

describe("HomeWorkspaceView", () => {
  it("renders Home start-here surface with cockpit launch shortcuts", () => {
    render(
      <HomeWorkspaceView
        missionControlContent={<div>Mission control content</div>}
        launchpadContent={<div>Launchpad content</div>}
        overviewContent={<div>Overview content</div>}
        guideContent={<div>Guide content</div>}
      />,
    );

    expect(screen.getByText("Legacy Mission Desk start here")).toBeInTheDocument();
    expect(screen.getByText("Mission control content")).toBeInTheDocument();
    expect(screen.getByText("Launchpad content")).toBeInTheDocument();
    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.getByTestId("mission-card-deck")).toBeInTheDocument();
    expect(screen.getByTestId("home-cockpit-launch-panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Create Game" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Create Movie" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Load Project" })).toBeInTheDocument();
  });

  it("fires cockpit launch callbacks", () => {
    const onOpenCreateGame = vi.fn();
    const onOpenCreateMovie = vi.fn();
    const onOpenLoadProject = vi.fn();

    render(
      <HomeWorkspaceView
        missionControlContent={<div>Mission control content</div>}
        launchpadContent={<div>Launchpad content</div>}
        overviewContent={<div>Overview content</div>}
        guideContent={<div>Guide content</div>}
        onOpenCreateGame={onOpenCreateGame}
        onOpenCreateMovie={onOpenCreateMovie}
        onOpenLoadProject={onOpenLoadProject}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Create Game" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Create Movie" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Load Project" }));

    expect(onOpenCreateGame).toHaveBeenCalledTimes(1);
    expect(onOpenCreateMovie).toHaveBeenCalledTimes(1);
    expect(onOpenLoadProject).toHaveBeenCalledTimes(1);
  });
});
