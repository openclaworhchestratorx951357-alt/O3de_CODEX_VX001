import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomeWorkspaceView from "./HomeWorkspaceView";
import { getHomeLaunchCockpits } from "../cockpits/registry/cockpitRegistry";

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

    expect(screen.getByText("Home start here")).toBeInTheDocument();
    expect(screen.getByText("Mission control content")).toBeInTheDocument();
    expect(screen.getByText("Launchpad content")).toBeInTheDocument();
    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.getByTestId("mission-card-deck")).toBeInTheDocument();
    expect(screen.getByTestId("home-cockpit-launch-panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Create Game" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Create Movie" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Load Project" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Open Asset Forge" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Open Prompt Studio" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Open Builder" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Open Operations" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Open Runtime" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Open Records" }).length).toBeGreaterThan(0);
  });

  it("renders home launch cards from cockpit registry definitions", () => {
    render(
      <HomeWorkspaceView
        missionControlContent={<div>Mission control content</div>}
        launchpadContent={<div>Launchpad content</div>}
        overviewContent={<div>Overview content</div>}
        guideContent={<div>Guide content</div>}
      />,
    );

    for (const cockpit of getHomeLaunchCockpits()) {
      const card = screen.getByTestId(`home-cockpit-card-${cockpit.id}`);
      expect(card).toBeInTheDocument();
      expect(within(card).getByRole("button", { name: cockpit.homeCard.primaryActionLabel })).toBeInTheDocument();
    }
  });

  it("fires cockpit launch callbacks", () => {
    const onOpenCockpit = vi.fn();

    render(
      <HomeWorkspaceView
        missionControlContent={<div>Mission control content</div>}
        launchpadContent={<div>Launchpad content</div>}
        overviewContent={<div>Overview content</div>}
        guideContent={<div>Guide content</div>}
        onOpenCockpit={onOpenCockpit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Create Game" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Create Movie" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Load Project" }));
    fireEvent.click(
      within(screen.getByTestId("home-cockpit-card-asset-forge")).getByRole("button", { name: "Open Asset Forge" }),
    );

    expect(onOpenCockpit).toHaveBeenNthCalledWith(1, "create-game");
    expect(onOpenCockpit).toHaveBeenNthCalledWith(2, "create-movie");
    expect(onOpenCockpit).toHaveBeenNthCalledWith(3, "load-project");
    expect(onOpenCockpit).toHaveBeenNthCalledWith(4, "asset-forge");
  });
});
