import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomeCockpitLaunchPanel from "./HomeCockpitLaunchPanel";

describe("HomeCockpitLaunchPanel", () => {
  it("renders cockpit launch cards from the shared registry including full-screen Asset Forge", () => {
    const openAssetForge = vi.fn();

    render(
      <HomeCockpitLaunchPanel
        onOpenCreateGame={vi.fn()}
        onOpenCreateMovie={vi.fn()}
        onOpenLoadProject={vi.fn()}
        onOpenAssetForge={openAssetForge}
      />,
    );

    expect(screen.getByTestId("home-cockpit-launch-panel")).toBeInTheDocument();
    expect(screen.getByTestId("cockpit-launch-create-game")).toHaveTextContent("Create Game Cockpit");
    expect(screen.getByTestId("cockpit-launch-create-movie")).toHaveTextContent("Create Movie Cockpit");
    expect(screen.getByTestId("cockpit-launch-load-project")).toHaveTextContent("Load Project Cockpit");

    const assetForgeCard = screen.getByTestId("cockpit-launch-asset-forge");
    expect(assetForgeCard).toHaveTextContent("Asset Forge");
    expect(assetForgeCard).toHaveTextContent("full-screen editor");
    expect(assetForgeCard).toHaveTextContent("execution_admitted=false");
    expect(assetForgeCard).toHaveTextContent("mutation_admitted=false");
    expect(assetForgeCard).toHaveTextContent("provider_generation_admitted=false");
    expect(assetForgeCard).toHaveTextContent("placement_write_admitted=false");

    fireEvent.click(within(assetForgeCard).getByRole("button", { name: "Open Asset Forge" }));
    expect(openAssetForge).toHaveBeenCalledTimes(1);
  });
});
