import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomeWorkspaceView from "./HomeWorkspaceView";

describe("HomeWorkspaceView", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to the calmer start-here layout and switches surfaces on demand", async () => {
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
    expect(await screen.findByText("Choose what you are building")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Develop the App/i })).toBeInTheDocument();
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

  it("switches Home task modes into O3DE creation and project loading desks", async () => {
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

    expect(await screen.findByText("Choose what you are building")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Create Game/i }));

    expect(screen.getByText("O3DE game creation desk")).toBeInTheDocument();
    const creationDeskRegion = screen.getByRole("region", { name: "O3DE game creation desk" });
    expect(creationDeskRegion.getAttribute("style")).toContain("var(--app-panel-bg-alt)");
    expect(creationDeskRegion.getAttribute("style")).toContain("var(--app-panel-bg)");
    expect(creationDeskRegion.getAttribute("style")).not.toContain("rgba(17, 36, 68, 0.96)");
    expect(screen.getByLabelText("Game viewport control surface")).toBeInTheDocument();
    expect(screen.getByText("Component Palette")).toBeInTheDocument();
    expect(screen.getByLabelText("O3DE guided tool dock")).toBeInTheDocument();
    expect(screen.getAllByText("McpSandbox canonical target").length).toBeGreaterThan(0);
    expect(screen.getByText("C:\\src\\o3de")).toHaveStyle("overflow-wrap: anywhere");
    expect(screen.getByLabelText("O3DE companion layout guidance")).toHaveTextContent(
      "O3DE Editor full-size",
    );
    const productionPlanner = await screen.findByLabelText("O3DE production planner");
    expect(productionPlanner.getAttribute("style")).toContain("var(--app-panel-bg-alt)");
    expect(productionPlanner.getAttribute("style")).toContain("var(--app-panel-bg)");
    expect(productionPlanner.getAttribute("style")).not.toContain("rgba(4, 13, 28, 0.48)");
    expect(await screen.findByText("What type of game are you building?")).toBeInTheDocument();
    expect(screen.getAllByText("First-person adventure").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Open world/i })).toBeInTheDocument();
    expect(screen.getByText("Choose a sub-genre emphasis")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Current viewport guidance context")).toHaveTextContent("Game viewport control surface");
    expect(screen.getByLabelText("Current viewport guidance context")).toHaveTextContent("Entity Tools");
    expect(screen.getByLabelText("Current viewport guidance context")).toHaveTextContent("Narrative mystery");
    expect(screen.getByText(/Create a one-page first-person adventure brief/i)).toBeInTheDocument();
    expect(screen.queryByText(/Create a production lane plan for first-person adventure content/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Source context upload")).toBeInTheDocument();
    expect(screen.getByLabelText("Quick prompt shortcuts")).toHaveTextContent("Analyze viewport and recommend");
    expect(screen.getByLabelText("Quick prompt shortcuts")).toHaveTextContent("frontend-local-shortcuts-v1");
    fireEvent.change(screen.getByLabelText("Source context notes"), {
      target: { value: "Use a lighthouse puzzle where the player redirects light beams." },
    });
    expect(screen.getAllByText(/Source context \(operator notes\): Use a lighthouse puzzle/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Choose local file" }));
    expect(screen.getByLabelText("Upload source context file")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Open world/i }));
    expect(screen.getByText(/Create an open-world game brief/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Survival crafting/i }));
    expect(screen.getByLabelText("Current viewport guidance context")).toHaveTextContent("Survival crafting");

    fireEvent.click(screen.getByRole("button", { name: /Puzzle exploration/i }));
    expect(screen.getByText(/Create a puzzle exploration brief/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Use current viewport/i }));
    expect(screen.getByText(/Use the current viewport context and selected tool area/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getAllByText("Test room").length).toBeGreaterThan(0);
    expect(screen.queryByText("2. Test room")).not.toBeInTheDocument();
    expect(screen.getByText(/Plan a single O3DE puzzle test room/i)).toBeInTheDocument();

    expect(screen.getByText(/this is a generated control-surface shell/i)).toBeInTheDocument();
    expect(screen.getByText(/Open the current level and create a root-level entity/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Component Palette" }));
    expect(screen.getByLabelText("Current viewport guidance context")).toHaveTextContent("Component Palette");
    expect(screen.getByText(/Add a Comment component to the selected entity/i)).toBeInTheDocument();
    expect(screen.getByText(/Records evidence for editor.component.add/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Create with natural language/i }));
    fireEvent.click(screen.getByRole("button", { name: /Check bridge\/runtime/i }));
    fireEvent.click(screen.getByRole("button", { name: /Coordinate tasks/i }));

    expect(openPromptStudio).toHaveBeenCalledTimes(1);
    expect(openRuntimeOverview).toHaveBeenCalledTimes(1);
    expect(openBuilder).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("tab", { name: /Create Movie/i }));

    expect(screen.getByText("O3DE cinematic creation desk")).toBeInTheDocument();
    expect(screen.getByLabelText("Cinematic viewport control surface")).toBeInTheDocument();
    expect(screen.getByText("Cinematic authoring intent")).toBeInTheDocument();
    expect(screen.getByText("What type of production are you building?")).toBeInTheDocument();
    expect(screen.getAllByText("Trailer / previs").length).toBeGreaterThan(0);
    expect(screen.getByText("Choose a sub-genre emphasis")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Game trailer/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Short film/i }));
    expect(screen.getByText(/Create a short-film story package/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Atmospheric mood piece/i }));
    expect(screen.getByLabelText("Current viewport guidance context")).toHaveTextContent("Atmospheric mood piece");

    fireEvent.click(screen.getByRole("tab", { name: /Load Project/i }));

    expect(screen.getByLabelText("Load Project guided setup")).toBeInTheDocument();
    expect(screen.getByText("Load an O3DE project safely")).toBeInTheDocument();
    expect(screen.getByText("Choose the project profile")).toBeInTheDocument();
    expect(screen.getByText("Capture the live backend target")).toBeInTheDocument();
    expect(screen.getByText("Verify runtime and bridge")).toBeInTheDocument();
    expect(screen.getByText("Start natural-language work")).toBeInTheDocument();
    expect(screen.getByLabelText("Active O3DE project profile")).toBeInTheDocument();
    expect(screen.getByText("Saved project profiles")).toBeInTheDocument();
    expect(screen.getByText("Add or update a project profile")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Runtime checklist" }));
    expect(openRuntimeOverview).toHaveBeenCalledTimes(2);

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
