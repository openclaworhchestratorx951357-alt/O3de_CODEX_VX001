import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AIAssetForgePanel from "./AIAssetForgePanel";

vi.mock("../lib/api", () => ({
  fetchAssetForgeStudioStatus: vi.fn(async () => null),
  fetchAssetForgeTask: vi.fn(async () => null),
  fetchAssetForgeProviderStatus: vi.fn(async () => null),
  fetchAssetForgeBlenderStatus: vi.fn(async () => null),
}));

describe("AIAssetForgePanel", () => {
  it("renders Asset Forge with the organized default cockpit layout and supports menu zone moves", () => {
    render(<AIAssetForgePanel />);

    expect(screen.getByLabelText("AI Asset Forge")).toBeInTheDocument();
    expect(screen.getByTestId("dockable-layout-asset-forge")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge studio header")).toBeInTheDocument();

    const topZone = screen.getByTestId("asset-forge-top-zone");
    const leftZone = screen.getByTestId("asset-forge-left-zone");
    const centerZone = screen.getByTestId("asset-forge-center-zone");
    const rightZone = screen.getByTestId("asset-forge-right-zone");
    const bottomZone = screen.getByTestId("asset-forge-bottom-zone");

    expect(within(topZone).getByLabelText("Asset Forge command strip panel")).toBeInTheDocument();
    const toolsPanel = within(leftZone).getByLabelText("Tools, candidates, and outliner panel");
    expect(toolsPanel).toBeInTheDocument();
    expect(within(centerZone).getByLabelText("Asset Forge studio panel")).toBeInTheDocument();
    expect(within(rightZone).getByLabelText("Mission truth rail panel")).toBeInTheDocument();
    expect(within(bottomZone).getByLabelText("Evidence, prompts, and logs drawer panel")).toBeInTheDocument();
    expect(within(bottomZone).getByLabelText("Asset Forge guided pipeline")).toBeInTheDocument();

    const moveSummary = toolsPanel.querySelector("summary");
    expect(moveSummary).toBeTruthy();
    fireEvent.click(moveSummary as HTMLElement);
    fireEvent.click(within(toolsPanel).getByRole("button", { name: "Move Tools, candidates, and outliner panel to right" }));

    expect(within(rightZone).getByLabelText("Tools, candidates, and outliner panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));
    expect(within(leftZone).getByLabelText("Tools, candidates, and outliner panel")).toBeInTheDocument();
  });
});
