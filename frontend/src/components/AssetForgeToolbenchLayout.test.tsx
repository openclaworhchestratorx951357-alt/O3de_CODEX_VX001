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
    expect(within(topMenu).getByText("preview - non-mutating control surface")).toBeInTheDocument();

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

  it("renders Lighting with full panel columns and no entity tool-shelf rail", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Lighting" }));

    expect(within(shell).getByLabelText("Asset Forge Lighting page")).toBeInTheDocument();
    expect(within(shell).getByText("Light list")).toBeInTheDocument();
    expect(within(shell).getByText("Lookdev preview")).toBeInTheDocument();
    expect(within(shell).getByText("Lighting plan notes")).toBeInTheDocument();
    expect(within(shell).getByText("Blocked lighting actions")).toBeInTheDocument();
    expect(within(shell).queryByLabelText("Forge left tool shelf")).not.toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Apply lighting to level" })).toBeDisabled();
  });

  it("renders a compact left tool shelf with short labels and hidden gate text pills", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Entity" }));

    const toolShelf = within(shell).getByLabelText("Forge left tool shelf");
    ["SEL", "MOV", "ROT", "SCL", "SNP", "MSR", "ORB", "CAM", "LGT", "ENT", "CMP", "MAT", "COL"].forEach((code) => {
      expect(within(toolShelf).getByText(code)).toBeInTheDocument();
    });
    expect(within(toolShelf).queryByText("not admitted")).not.toBeInTheDocument();
    expect(within(toolShelf).queryByText("local preview")).not.toBeInTheDocument();
    expect(within(toolShelf).getByRole("button", { name: /Select tool - read-only/i })).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Place selected candidate" })).toBeDisabled();
  });

  it("supports an entity full viewport mode while keeping the tool shelf visible", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Entity" }));

    expect(within(shell).getByText("Entity outliner")).toBeInTheDocument();
    expect(within(shell).getByText("Transform readback")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Full viewport" })).toBeInTheDocument();

    fireEvent.click(within(shell).getByRole("button", { name: "Full viewport" }));

    expect(within(shell).queryByText("Entity outliner")).not.toBeInTheDocument();
    expect(within(shell).queryByText("Transform readback")).not.toBeInTheDocument();
    expect(within(shell).getByText("Selected entity preview (focus)")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Exit full viewport" })).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge left tool shelf")).toBeInTheDocument();
    expect(within(shell).getByText(/renderer not connected/i)).toBeInTheDocument();
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
