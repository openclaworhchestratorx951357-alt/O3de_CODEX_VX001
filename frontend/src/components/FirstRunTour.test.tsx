import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FirstRunTour from "./FirstRunTour";

describe("FirstRunTour", () => {
  it("walks through the guided workspace sequence and completes", () => {
    const onSelectWorkspace = vi.fn();
    const onComplete = vi.fn();

    render(
      <FirstRunTour
        activeWorkspaceId="asset-forge"
        onSelectWorkspace={onSelectWorkspace}
        onComplete={onComplete}
      />,
    );

    expect(screen.getByRole("dialog", { name: "First-run guided tour" })).toBeInTheDocument();
    expect(screen.getByText("Start in Asset Forge")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Workspace open" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next: Prompt Studio" }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("prompt");
    expect(screen.getByText("Use Prompt Studio for natural language")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next: Builder" }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("builder");
    expect(screen.getByText("Coordinate threads in Builder")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next: Runtime" }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("runtime");
    expect(screen.getByText("Check Runtime when truth matters")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Finish tour" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("lets the user open the current step workspace and skip the tour", () => {
    const onSelectWorkspace = vi.fn();
    const onComplete = vi.fn();

    render(
      <FirstRunTour
        activeWorkspaceId="builder"
        onSelectWorkspace={onSelectWorkspace}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Asset Forge" }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("asset-forge");

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
