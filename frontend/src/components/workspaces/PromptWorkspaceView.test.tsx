import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PromptWorkspaceView from "./PromptWorkspaceView";

describe("PromptWorkspaceView", () => {
  it("renders Prompt Studio inside the shared dockable cockpit layout", () => {
    render(
      <PromptWorkspaceView
        content={<div>Prompt control panel content</div>}
      />,
    );

    expect(screen.getByText("Prompt control panel content")).toBeInTheDocument();
    expect(screen.getByTestId("dockable-layout-prompt")).toBeInTheDocument();
    expect(screen.getByText("No auto-execution")).toBeInTheDocument();
  });
});
