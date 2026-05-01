import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AIAssetForgePanel from "./AIAssetForgePanel";

describe("AIAssetForgePanel", () => {
  it("renders the standalone Asset Forge shell and keeps template launch controls wired", () => {
    const onOpenPromptStudio = vi.fn();
    const onLaunchInspectTemplate = vi.fn();
    const onLaunchPlacementProofTemplate = vi.fn();

    render(
      <AIAssetForgePanel
        onOpenPromptStudio={onOpenPromptStudio}
        onLaunchInspectTemplate={onLaunchInspectTemplate}
        onLaunchPlacementProofTemplate={onLaunchPlacementProofTemplate}
      />,
    );

    const panel = screen.getByLabelText("AI Asset Forge");
    expect(within(panel).queryByTestId("dockable-layout-asset-forge")).not.toBeInTheDocument();
    expect(within(panel).getByLabelText("Asset Forge Studio Shell")).toBeInTheDocument();
    expect(within(panel).getByLabelText("Asset Forge prompt launch strip")).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Load inspect template in Prompt Studio" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Load placement proof-only template in Prompt Studio" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Open Prompt Studio draft" }));

    expect(onLaunchInspectTemplate).toHaveBeenCalledTimes(1);
    expect(onLaunchPlacementProofTemplate).toHaveBeenCalledTimes(1);
    expect(onOpenPromptStudio).toHaveBeenCalledTimes(1);
  });
});
