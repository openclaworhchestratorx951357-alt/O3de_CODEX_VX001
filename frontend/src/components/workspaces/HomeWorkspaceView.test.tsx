import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomeWorkspaceView from "./HomeWorkspaceView";

describe("HomeWorkspaceView", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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
    expect(screen.getByText("Choose what you are building")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Develop the App/i })).toHaveAttribute("aria-selected", "true");
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

  it("switches Home task modes into O3DE creation and project loading desks", () => {
    const openPromptStudio = vi.fn();
    const openRuntimeOverview = vi.fn();
    const openBuilder = vi.fn();

    render(
      <HomeWorkspaceView
        missionControlContent={<div>Mission control content</div>}
        launchpadContent={<div>Launchpad content</div>}
        overviewContent={<div>Overview content</div>}
        guideContent={<div>Guide content</div>}
        onOpenPromptStudio={openPromptStudio}
        onOpenRuntimeOverview={openRuntimeOverview}
        onOpenBuilder={openBuilder}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /O3DE Game/i }));

    expect(screen.getByText("O3DE game creation desk")).toBeInTheDocument();
    expect(screen.getByLabelText("Game viewport control surface")).toBeInTheDocument();
    expect(screen.getByText("Component Palette")).toBeInTheDocument();
    expect(screen.getByText("McpSandbox canonical target")).toBeInTheDocument();
    expect(screen.getByText(/this is a generated control-surface shell/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Create with natural language/i }));
    fireEvent.click(screen.getByRole("button", { name: /Check bridge\/runtime/i }));
    fireEvent.click(screen.getByRole("button", { name: /Coordinate tasks/i }));

    expect(openPromptStudio).toHaveBeenCalledTimes(1);
    expect(openRuntimeOverview).toHaveBeenCalledTimes(1);
    expect(openBuilder).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("tab", { name: /O3DE Movie/i }));

    expect(screen.getByText("O3DE cinematic creation desk")).toBeInTheDocument();
    expect(screen.getByLabelText("Cinematic viewport control surface")).toBeInTheDocument();
    expect(screen.getByText("Cinematic authoring intent")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Load Project/i }));

    expect(screen.getByLabelText("Active O3DE project profile")).toBeInTheDocument();
    expect(screen.getByText("Saved project profiles")).toBeInTheDocument();
    expect(screen.getByText("Add or update a project profile")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Profile name"), { target: { value: "Training Project" } });
    fireEvent.change(screen.getByLabelText("Project root"), {
      target: { value: "C:\\Users\\topgu\\O3DE\\Projects\\TrainingProject" },
    });
    fireEvent.change(screen.getByLabelText("Engine root"), { target: { value: "C:\\src\\o3de" } });
    fireEvent.click(screen.getByRole("button", { name: "Save project profile" }));

    expect(screen.getByText("Training Project was saved and selected.")).toBeInTheDocument();
    expect(screen.getAllByText("Training Project").length).toBeGreaterThan(0);
  });
});
