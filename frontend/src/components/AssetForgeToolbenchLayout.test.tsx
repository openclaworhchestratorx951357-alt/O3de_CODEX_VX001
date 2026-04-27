import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AssetForgeToolbenchLayout from "./AssetForgeToolbenchLayout";
import { assetForgeReviewPacketFixture } from "../fixtures/assetForgeReviewPacketFixture";

describe("AssetForgeToolbenchLayout", () => {
  it("renders a professional toolbench layout with gated editor regions", () => {
    render(
      <AssetForgeToolbenchLayout
        reviewPacketData={assetForgeReviewPacketFixture}
        reviewPacketSource="typed_fixture_data"
      />,
    );

    const toolbench = screen.getByLabelText("Asset Forge Toolbench layout");
    expect(within(toolbench).getByText("O3DE AI Asset Forge Toolbench")).toBeInTheDocument();

    const topMenu = within(toolbench).getByLabelText("Forge top application menu");
    [
      "File",
      "Edit",
      "Create",
      "Assets",
      "Entity",
      "Components",
      "Materials",
      "Lighting",
      "Camera",
      "Review",
      "Help",
    ].forEach((menuName) => {
      expect(within(topMenu).getByRole("button", { name: menuName })).toBeInTheDocument();
    });

    const workspaceStrip = within(toolbench).getByLabelText("Forge workspace strip");
    const workspaceTabs = within(workspaceStrip).getAllByRole("tab");
    expect(workspaceTabs).toHaveLength(9);
    ["Forge", "Model", "Materials", "Lighting", "Animation", "Physics", "Cinematic", "Review", "Export"].forEach(
      (workspaceName) => {
        expect(workspaceTabs.some((tab) => tab.textContent?.includes(workspaceName))).toBe(true);
      },
    );
    fireEvent.click(workspaceTabs.find((tab) => tab.textContent?.includes("Materials"))!);
    expect(within(toolbench).getByLabelText("Forge workspace focus")).toHaveTextContent("Workspace focus: Materials");

    const toolShelf = within(toolbench).getByLabelText("Forge left tool shelf");
    ["Select", "Move", "Rotate", "Scale", "Snap", "Measure", "Orbit", "Camera", "Light", "Entity", "Component", "Material", "Collision"].forEach(
      (toolName) => {
        expect(within(toolShelf).getByRole("button", { name: new RegExp(toolName, "i") })).toBeInTheDocument();
      },
    );

    const outliner = within(toolbench).getByLabelText("Forge scene and entity outliner");
    [
      "Level Root",
      "Cameras",
      "Lights",
      "Asset Candidates",
      "Review Targets",
      "Generated Preview Candidate",
      "O3DE Import Review",
    ].forEach((label) => {
      expect(within(outliner).getByText(label)).toBeInTheDocument();
    });
    expect(within(outliner).getByText("Toolbench preview data - not authoritative live O3DE scene truth.")).toBeInTheDocument();

    const viewport = within(toolbench).getByLabelText("Forge viewport preview");
    expect(within(viewport).getByText("Toolbench viewport preview — not a live O3DE render")).toBeInTheDocument();
    expect(within(viewport).getByText("Perspective")).toBeInTheDocument();
    expect(within(viewport).getByText("Lit")).toBeInTheDocument();

    const inspector = within(toolbench).getByLabelText("Forge properties inspector");
    [
      "Selection",
      "Transform",
      "Asset readiness",
      "Source asset",
      "Product asset",
      "Material slots",
      "Texture dependencies",
      "Component readiness",
      "Collision readiness",
      "O3DE import review",
      "Operator approval",
    ].forEach((title) => {
      expect(within(inspector).getByText(title)).toBeInTheDocument();
    });

    const assetBrowser = within(toolbench).getByLabelText("Forge asset browser");
    [
      "Source Assets",
      "Product Assets",
      "Materials",
      "Textures",
      "Prefabs",
      "Cameras",
      "Lights",
      "Review Packets",
    ].forEach((category) => {
      expect(within(assetBrowser).getByRole("button", { name: category })).toBeInTheDocument();
    });

    const timelineStatus = within(toolbench).getByLabelText("Forge timeline evidence status");
    expect(within(timelineStatus).getByLabelText("Forge timeline strip")).toBeInTheDocument();
    expect(within(timelineStatus).getByText("Review packet status")).toBeInTheDocument();
    expect(within(timelineStatus).getByText("Asset Processor status placeholder")).toBeInTheDocument();
    expect(within(timelineStatus).getByText("Catalog evidence status")).toBeInTheDocument();
    expect(within(timelineStatus).getByText("Approval state")).toBeInTheDocument();
    expect(within(timelineStatus).getByText("Blocked mutation list")).toBeInTheDocument();
    expect(within(timelineStatus).getByText("Safest next step")).toBeInTheDocument();

    expect(within(toolbench).getByRole("button", { name: "Place candidate in level" })).toBeDisabled();
    expect(within(toolbench).getByRole("button", { name: "Execute Asset Processor" })).toBeDisabled();

    fireEvent.click(within(toolbench).getByRole("tab", { name: "Review packet" }));
    expect(within(toolbench).getByLabelText("Forge operator review packet")).toBeInTheDocument();
    expect(within(toolbench).getByText("Typed sample fixture data (read-only preview; not live)")).toBeInTheDocument();
  });

  it("keeps navigation actions safe while enabling existing workspace routing callbacks", () => {
    const onOpenPromptStudio = vi.fn();
    const onOpenRuntimeOverview = vi.fn();
    const onOpenBuilder = vi.fn();

    render(
      <AssetForgeToolbenchLayout
        onOpenPromptStudio={onOpenPromptStudio}
        onOpenRuntimeOverview={onOpenRuntimeOverview}
        onOpenBuilder={onOpenBuilder}
        reviewPacketData={assetForgeReviewPacketFixture}
        reviewPacketSource="typed_fixture_data"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send to Prompt Studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Runtime" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Builder" }));
    fireEvent.click(screen.getByRole("button", { name: "Review Evidence" }));

    expect(onOpenPromptStudio).toHaveBeenCalledTimes(1);
    expect(onOpenRuntimeOverview).toHaveBeenCalledTimes(1);
    expect(onOpenBuilder).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Forge operator review packet")).toBeInTheDocument();
  });
});
