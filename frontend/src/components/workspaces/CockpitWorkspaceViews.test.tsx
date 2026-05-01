import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CreateGameWorkspaceView from "./CreateGameWorkspaceView";
import CreateMovieWorkspaceView from "./CreateMovieWorkspaceView";
import LoadProjectWorkspaceView from "./LoadProjectWorkspaceView";

describe("Cockpit workspace views", () => {
  it("renders Create Game cockpit inside DockableCockpitLayout and supports collapse/expand/reset", () => {
    render(<CreateGameWorkspaceView />);

    expect(screen.getByTestId("dockable-layout-create-game")).toBeInTheDocument();
    expect(screen.getByText("Game creation pipeline")).toBeInTheDocument();
    expect(screen.getByLabelText("create-game left column resize handle")).toBeInTheDocument();
    expect(screen.getByLabelText("create-game center and right column resize handle")).toBeInTheDocument();
    const pipelineBody = screen.getByTestId("dockable-panel-body-pipeline");
    expect(pipelineBody).toHaveStyle({ overflow: "auto" });

    fireEvent.click(screen.getByRole("button", { name: "Collapse Game creation pipeline panel" }));
    expect(screen.queryByTestId("dockable-panel-body-pipeline")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand Game creation pipeline panel" }));
    expect(screen.getByTestId("dockable-panel-body-pipeline")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));
    expect(screen.getByText("Concept")).toBeInTheDocument();
    expect(screen.getByText("Review / Continue")).toBeInTheDocument();
  });

  it("renders Create Game cockpit pipeline and blocked capability warnings", () => {
    render(<CreateGameWorkspaceView />);

    expect(screen.getAllByText("Create Game Cockpit").length).toBeGreaterThan(0);
    expect(screen.getByText("Game creation pipeline")).toBeInTheDocument();
    expect(screen.getByText("Concept")).toBeInTheDocument();
    expect(screen.getByText("Project Target")).toBeInTheDocument();
    expect(screen.getByText("Review / Continue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load create-entity template in Prompt Studio" })).toBeDisabled();
    expect(screen.getByText(/Full game generation blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Arbitrary scripts blocked/i)).toBeInTheDocument();
  });

  it("renders Create Movie cockpit inside DockableCockpitLayout with reset-stable content", () => {
    render(<CreateMovieWorkspaceView />);

    expect(screen.getByTestId("dockable-layout-create-movie")).toBeInTheDocument();
    expect(screen.getByLabelText("Cinematic viewport")).toBeInTheDocument();
    expect(screen.getByLabelText("Cinematic viewer canvas")).toBeInTheDocument();
    expect(screen.getByText("Blender-Style Program Viewer")).toBeInTheDocument();
    expect(screen.getByText("LIVE CINEMATIC PREVIEW")).toBeInTheDocument();
    expect(screen.getByText("Frame 124 / 480")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));
    expect(screen.getByText("Cinematic pipeline")).toBeInTheDocument();
    expect(screen.getByText("Story / Shot Plan")).toBeInTheDocument();
    expect(screen.getByText("Characters / Props")).toBeInTheDocument();
  });

  it("renders Create Movie cockpit pipeline and proof-only blocked messaging", () => {
    render(<CreateMovieWorkspaceView />);

    expect(screen.getAllByText("Create Movie Cockpit").length).toBeGreaterThan(0);
    expect(screen.getByText("Cinematic pipeline")).toBeInTheDocument();
    expect(screen.getByText("Story / Shot Plan")).toBeInTheDocument();
    expect(screen.getByText("Characters / Props")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load placement proof-only template in Prompt Studio" })).toBeDisabled();
    expect(screen.getByText(/proof-only \/ fail-closed \/ non-mutating \/ real placement not admitted/i)).toBeInTheDocument();
    expect(screen.getAllByText(/execution_admitted=false/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/placement_write_admitted=false/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/mutation_occurred=false/i).length).toBeGreaterThan(0);
  });

  it("renders Load Project cockpit inside DockableCockpitLayout with reset-stable content", () => {
    render(<LoadProjectWorkspaceView />);

    expect(screen.getByTestId("dockable-layout-load-project")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));
    expect(screen.getByText("Project connection checklist")).toBeInTheDocument();
    expect(screen.getByText("Project root selected")).toBeInTheDocument();
    expect(screen.getByText("Current target summary")).toBeInTheDocument();
  });

  it("renders Load Project cockpit checklist and no-project-write claim", () => {
    render(<LoadProjectWorkspaceView />);

    expect(screen.getAllByText("Load Project Cockpit").length).toBeGreaterThan(0);
    expect(screen.getByText("Project connection checklist")).toBeInTheDocument();
    expect(screen.getByText("Project root selected")).toBeInTheDocument();
    expect(screen.getByText("Prompt capabilities loaded")).toBeInTheDocument();
    expect(screen.getByText("Current target summary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load project inspect template in Prompt Studio" })).toBeDisabled();
    expect(screen.getByText(/does not create\/register projects, write project files/i)).toBeInTheDocument();
  });
});
