import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import CreateGameWorkspaceView from "./CreateGameWorkspaceView";
import CreateMovieWorkspaceView from "./CreateMovieWorkspaceView";
import LoadProjectWorkspaceView from "./LoadProjectWorkspaceView";

describe("Cockpit workspace views", () => {
  beforeEach(() => {
    window.localStorage.removeItem("o3de.appos.cockpit-layouts.v1");
  });

  it("renders Create Game cockpit as a standalone shell and supports collapse/expand/reset", () => {
    render(<CreateGameWorkspaceView />);

    expect(screen.getByTestId("dockable-layout-create-game")).toBeInTheDocument();
    expect(screen.queryByLabelText("Create Game Cockpit guide")).not.toBeInTheDocument();
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

  it("renders Create Movie cockpit as a standalone shell with reset-stable content", () => {
    render(<CreateMovieWorkspaceView />);

    expect(screen.getByTestId("dockable-layout-create-movie")).toBeInTheDocument();
    expect(screen.queryByLabelText("Create Movie Cockpit guide")).not.toBeInTheDocument();
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

  it("renders Load Project cockpit as a standalone shell with reset-stable content", () => {
    render(<LoadProjectWorkspaceView />);

    expect(screen.getByTestId("dockable-layout-load-project")).toBeInTheDocument();
    expect(screen.queryByLabelText("Load Project Cockpit guide")).not.toBeInTheDocument();
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

  it("opens Create Game with App OS cockpit default zones", () => {
    render(<CreateGameWorkspaceView />);

    expect(screen.getByTestId("create-game-top-zone")).toHaveTextContent("Cockpit identity");
    expect(screen.getByTestId("create-game-top-zone")).toHaveTextContent("Command bar");
    expect(screen.getByTestId("create-game-left-zone")).toHaveTextContent("Game cockpit tools");
    expect(screen.getByTestId("create-game-center-zone")).toHaveTextContent("Game creation pipeline");
    expect(screen.getByTestId("create-game-right-zone")).toHaveTextContent("Blocked capabilities and future unlocks");
    expect(screen.getByTestId("create-game-bottom-zone")).toHaveTextContent("Suggested prompt templates");
  });

  it("opens Create Movie with App OS cockpit default zones", () => {
    render(<CreateMovieWorkspaceView />);

    expect(screen.getByTestId("create-movie-top-zone")).toHaveTextContent("Cockpit identity");
    expect(screen.getByTestId("create-movie-top-zone")).toHaveTextContent("Command bar");
    expect(screen.getByTestId("create-movie-left-zone")).toHaveTextContent("Movie cockpit tools");
    expect(screen.getByTestId("create-movie-center-zone")).toHaveTextContent("Cinematic pipeline");
    expect(screen.getByTestId("create-movie-right-zone")).toHaveTextContent("Blocked capabilities and future unlocks");
    expect(screen.getByTestId("create-movie-bottom-zone")).toHaveTextContent("Suggested prompt templates");
  });

  it("opens Load Project with App OS cockpit default zones", () => {
    render(<LoadProjectWorkspaceView />);

    expect(screen.getByTestId("load-project-top-zone")).toHaveTextContent("Cockpit identity");
    expect(screen.getByTestId("load-project-top-zone")).toHaveTextContent("Command bar");
    expect(screen.getByTestId("load-project-left-zone")).toHaveTextContent("Load Project tools");
    expect(screen.getByTestId("load-project-center-zone")).toHaveTextContent("Project connection checklist");
    expect(screen.getByTestId("load-project-right-zone")).toHaveTextContent("Blocked capabilities and future unlocks");
    expect(screen.getByTestId("load-project-bottom-zone")).toHaveTextContent("Suggested prompt templates");
  });
});
