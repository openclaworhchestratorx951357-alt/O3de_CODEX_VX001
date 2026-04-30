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
    expect(screen.getByTestId("prompt-top-zone")).toHaveTextContent("Prompt command strip");
    expect(screen.getByTestId("prompt-left-zone")).toHaveTextContent("Prompt tools and outliner");
    expect(screen.getByTestId("prompt-center-zone")).toHaveTextContent("Prompt dominant work area");
    expect(screen.getByTestId("prompt-right-zone")).toHaveTextContent("Inspector and truth");
    expect(screen.getByTestId("prompt-bottom-zone")).toHaveTextContent("Evidence and templates drawer");
  });
});
