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
  it("renders Asset Forge inside DockableCockpitLayout and supports menu zone moves", () => {
    render(<AIAssetForgePanel />);

    expect(screen.getByLabelText("AI Asset Forge")).toBeInTheDocument();
    expect(screen.getByTestId("dockable-layout-asset-forge")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge studio header")).toBeInTheDocument();

    const leftZone = screen.getByTestId("asset-forge-left-zone");
    const pipelinePanel = within(leftZone).getByLabelText("Asset Forge guided pipeline panel");
    expect(pipelinePanel).toBeInTheDocument();

    fireEvent.click(within(pipelinePanel).getByText("Move"));
    fireEvent.click(within(pipelinePanel).getByRole("button", { name: "Move Asset Forge guided pipeline panel to right" }));

    const rightZone = screen.getByTestId("asset-forge-right-zone");
    expect(within(rightZone).getByLabelText("Asset Forge guided pipeline panel")).toBeInTheDocument();
  });
});
