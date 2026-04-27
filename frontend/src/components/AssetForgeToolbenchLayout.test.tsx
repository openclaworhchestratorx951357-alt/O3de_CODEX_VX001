import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AssetForgeToolbenchLayout from "./AssetForgeToolbenchLayout";
import { assetForgeReviewPacketFixture } from "../fixtures/assetForgeReviewPacketFixture";

function renderToolbench(overrides = {}) {
  return render(
    <AssetForgeToolbenchLayout
      reviewPacketData={assetForgeReviewPacketFixture}
      reviewPacketSource="typed_fixture_data"
      {...overrides}
    />,
  );
}

describe("AssetForgeToolbenchLayout", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a fixed top menu and defaults to the Create page only", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    const topMenu = within(shell).getByLabelText("Forge top application menu");
    ["File", "Edit", "Create", "Assets", "Entity", "Components", "Materials", "Lighting", "Camera", "Review", "Help"].forEach((menuName) => {
      expect(within(topMenu).getByRole("button", { name: menuName })).toBeInTheDocument();
    });

    expect(within(shell).getByLabelText("Asset Forge active page")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Asset Forge Create page")).toBeInTheDocument();
    expect(within(shell).getByText("Prompt request")).toBeInTheDocument();
    expect(within(shell).getByText("Forge plan preview")).toBeInTheDocument();
    expect(within(shell).getByText("Asset candidate preview")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge command strip")).toBeInTheDocument();
    expect(within(shell).queryByLabelText("Forge assets content browser")).not.toBeInTheDocument();
    expect(within(shell).queryByText("Material inspector preview")).not.toBeInTheDocument();
    expect(within(shell).queryByText(/live O3DE/i)).not.toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Generate asset" })).toBeDisabled();
    expect(within(shell).getByRole("button", { name: "Place candidate in level" })).toBeDisabled();
    expect(within(shell).getByLabelText("Forge blocked mutation summary")).toHaveTextContent("generation");
    expect(within(shell).getByLabelText("Forge blocked mutation summary")).toHaveTextContent("placement");
  });

  it("switches Assets into a full content-browser page and hides Create-only content", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Assets" }));

    expect(within(shell).getByLabelText("Asset Forge Assets page")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge assets content browser")).toBeInTheDocument();
    expect(within(shell).getAllByText("Source assets").length).toBeGreaterThan(0);
    expect(within(shell).getByText("Product assets")).toBeInTheDocument();
    expect(within(shell).getByText("Dependency count")).toBeInTheDocument();
    expect(within(shell).getByText("Asset Processor")).toBeInTheDocument();
    expect(within(shell).queryByText("Prompt request")).not.toBeInTheDocument();
    expect(within(shell).queryByLabelText("Forge command strip")).not.toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Import selected asset" })).toBeDisabled();
    expect(within(shell).getByRole("button", { name: "Stage source asset" })).toBeDisabled();
    expect(within(shell).getByRole("button", { name: "Execute Asset Processor" })).toBeDisabled();
  });

  it("switches Materials into a material inspector page and hides Assets-only content", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Assets" }));
    expect(within(shell).getByLabelText("Forge assets content browser")).toBeInTheDocument();

    fireEvent.click(within(shell).getByRole("button", { name: "Materials" }));

    expect(within(shell).getByLabelText("Asset Forge Materials page")).toBeInTheDocument();
    expect(within(shell).getByText("Material slots")).toBeInTheDocument();
    expect(within(shell).getByText("Texture dependencies")).toBeInTheDocument();
    expect(within(shell).getByText("Material inspector preview")).toBeInTheDocument();
    expect(within(shell).getByText("O3DE material readiness")).toBeInTheDocument();
    expect(within(shell).queryByLabelText("Forge assets content browser")).not.toBeInTheDocument();
    expect(within(shell).queryByText("Source assets")).not.toBeInTheDocument();
    expect(within(shell).queryByText(/live O3DE/i)).not.toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Assign material" })).toBeDisabled();
  });

  it("gives Review a full-page operator packet surface", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Review" }));

    expect(within(shell).getByLabelText("Asset Forge Review page")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge operator review packet full page")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge operator review packet")).toBeInTheDocument();
    expect(within(shell).getByText("Typed sample fixture data (read-only preview; not live)")).toBeInTheDocument();
    expect(within(shell).getByText("Evidence summary")).toBeInTheDocument();
    expect(within(shell).getAllByText("Unknown / unavailable").length).toBeGreaterThan(0);
    expect(within(shell).getAllByText("Safest next step").length).toBeGreaterThan(0);
    expect(within(shell).queryByText("Prompt request")).not.toBeInTheDocument();
    expect(within(shell).queryByLabelText("Forge assets content browser")).not.toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Approve production import" })).toBeDisabled();
  });

  it("keeps existing navigation callbacks but blocks direct execution", () => {
    const onOpenPromptStudio = vi.fn();
    const onOpenRuntimeOverview = vi.fn();
    const onOpenBuilder = vi.fn();

    renderToolbench({ onOpenPromptStudio, onOpenRuntimeOverview, onOpenBuilder });

    fireEvent.click(screen.getByRole("button", { name: "Send to Prompt Studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Runtime" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Builder" }));

    expect(onOpenPromptStudio).toHaveBeenCalledTimes(1);
    expect(onOpenRuntimeOverview).toHaveBeenCalledTimes(1);
    expect(onOpenBuilder).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Run command" })).toBeDisabled();
  });

  it("saves and resets harmless local menu preference only", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "File" }));
    fireEvent.click(within(shell).getByRole("button", { name: "Save Layout" }));
    expect(window.localStorage.getItem("o3de-asset-forge-page-shell-menu-v1")).toBe("File");

    fireEvent.click(within(shell).getByRole("button", { name: "Reset Layout" }));
    expect(window.localStorage.getItem("o3de-asset-forge-page-shell-menu-v1")).toBeNull();
    expect(within(shell).getByLabelText("Asset Forge Create page")).toBeInTheDocument();
  });
});
