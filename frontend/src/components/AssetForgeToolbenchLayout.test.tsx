import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AssetForgeToolbenchLayout from "./AssetForgeToolbenchLayout";
import { assetForgeReviewPacketFixture } from "../fixtures/assetForgeReviewPacketFixture";

describe("AssetForgeToolbenchLayout", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a professional toolbench layout with gated editor regions", () => {
    render(
      <AssetForgeToolbenchLayout
        reviewPacketData={assetForgeReviewPacketFixture}
        reviewPacketSource="typed_fixture_data"
      />,
    );

    const toolbench = screen.getByLabelText("Asset Forge Toolbench layout");
    expect(within(toolbench).getByText("O3DE AI Asset Forge Toolbench")).toBeInTheDocument();

    const productionSelector = within(toolbench).getByLabelText("Production workspace layout selector");
    [
      "Forge Command",
      "Modeling / Assembly",
      "Animation / Timeline",
      "Materials / Lookdev",
      "Asset Management",
      "Review / Approval",
      "Automation Studio",
      "Collaboration / Versioning",
    ].forEach((layoutName) => {
      expect(within(productionSelector).getByRole("tab", { name: layoutName })).toBeInTheDocument();
    });
    expect(within(productionSelector).getByRole("button", { name: "Save Layout" })).toBeInTheDocument();
    expect(within(productionSelector).getByRole("button", { name: "Reset Layout" })).toBeInTheDocument();
    expect(within(productionSelector).getByRole("button", { name: "Duplicate Layout" })).toBeInTheDocument();
    expect(within(productionSelector).getByRole("button", { name: "Expanded mode" })).toBeInTheDocument();
    expect(within(productionSelector).getByLabelText("Viewport mode selector")).toBeInTheDocument();
    fireEvent.click(within(productionSelector).getByRole("tab", { name: "Animation / Timeline" }));
    expect(within(toolbench).getByText("Keyframe lane preview")).toBeInTheDocument();
    expect(within(toolbench).getByText("Camera shot list")).toBeInTheDocument();
    fireEvent.click(within(productionSelector).getByRole("tab", { name: "Materials / Lookdev" }));
    expect(within(toolbench).getByText("Live O3DE Render: Not connected")).toBeInTheDocument();

    const integrationDock = within(toolbench).getByLabelText("Forge integration dock");
    ["Prompt Studio", "Runtime", "Builder", "Records", "Mission Control", "Guidebook"].forEach((label) => {
      expect(within(integrationDock).getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    });

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
    const sceneTabs = within(outliner).getByLabelText("Forge scene tabs");
    ["Forge Scene", "Evidence Layout", "Review Targets"].forEach((label) => {
      expect(within(sceneTabs).getByRole("tab", { name: label })).toBeInTheDocument();
    });
    fireEvent.click(within(sceneTabs).getByRole("tab", { name: "Review Targets" }));
    expect(within(outliner).getByText("Operator-targeted candidate set for proof corridors and safest-next-step review.")).toBeInTheDocument();
    const outlinerTree = within(outliner).getByLabelText("Forge outliner tree");
    [
      "Level Root",
      "Cameras",
      "Lights",
      "Asset Candidates",
      "Review Targets",
      "Generated Preview Candidate",
      "O3DE Import Review",
    ].forEach((label) => {
      expect(within(outlinerTree).getByText(label)).toBeInTheDocument();
    });
    expect(within(outliner).getByText("Toolbench preview data - not authoritative live O3DE scene truth.")).toBeInTheDocument();

    const viewport = within(toolbench).getByLabelText("Forge viewport preview");
    expect(within(viewport).getByText("Toolbench preview — not live O3DE render")).toBeInTheDocument();
    expect(within(viewport).getByText("Perspective")).toBeInTheDocument();
    expect(within(viewport).getByText("Lit")).toBeInTheDocument();
    fireEvent.click(within(productionSelector).getByRole("button", { name: "Quad View" }));
    expect(within(viewport).getByText("Top Viewport Preview")).toBeInTheDocument();
    expect(within(viewport).getByText("Front Viewport Preview")).toBeInTheDocument();
    expect(within(viewport).getByText("Side Viewport Preview")).toBeInTheDocument();
    expect(within(viewport).getAllByText("Toolbench preview — not live O3DE render")).toHaveLength(4);

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
    expect(within(toolbench).getByLabelText("Forge tool extensions panel")).toHaveTextContent("Tool Extensions / Plugin Slots");
    expect(within(toolbench).getByLabelText("Forge tool extensions panel")).toHaveTextContent("Plugin runtime loading");
    expect(within(toolbench).getByLabelText("Forge collaboration and version evidence")).toHaveTextContent(
      "Version evidence not connected",
    );

    const timelineStatus = within(toolbench).getByLabelText("Forge timeline evidence status");
    expect(within(timelineStatus).getByLabelText("Forge timeline strip")).toBeInTheDocument();
    expect(within(timelineStatus).getByRole("tab", { name: "X-Sheet" })).toBeInTheDocument();
    fireEvent.click(within(timelineStatus).getByRole("tab", { name: "X-Sheet" }));
    const xSheetPanel = within(timelineStatus).getByLabelText("Forge xsheet timeline panel");
    expect(within(xSheetPanel).getByText("X-sheet / timeline board")).toBeInTheDocument();
    expect(within(xSheetPanel).getByText("Camera Cut")).toBeInTheDocument();
    expect(within(xSheetPanel).getByText("Asset Candidate")).toBeInTheDocument();
    expect(within(xSheetPanel).getByText("Collision Track")).toBeInTheDocument();
    fireEvent.click(within(timelineStatus).getByRole("tab", { name: "Status board" }));
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

  it("saves, restores, and resets harmless local layout preferences", () => {
    const firstRender = render(
      <AssetForgeToolbenchLayout
        reviewPacketData={assetForgeReviewPacketFixture}
        reviewPacketSource="typed_fixture_data"
      />,
    );

    const firstSelector = screen.getByLabelText("Production workspace layout selector");
    fireEvent.click(within(firstSelector).getByRole("tab", { name: "Animation / Timeline" }));
    fireEvent.click(within(firstSelector).getByRole("button", { name: "Dual View" }));
    fireEvent.click(within(firstSelector).getByRole("button", { name: "Save Layout" }));

    expect(window.localStorage.getItem("o3de-asset-forge-production-layout-preferences")).toContain(
      "Animation / Timeline",
    );
    firstRender.unmount();

    render(
      <AssetForgeToolbenchLayout
        reviewPacketData={assetForgeReviewPacketFixture}
        reviewPacketSource="typed_fixture_data"
      />,
    );

    const restoredSelector = screen.getByLabelText("Production workspace layout selector");
    expect(restoredSelector).toHaveTextContent("Active layout: Animation / Timeline");
    expect(restoredSelector).toHaveTextContent("Viewport Preview: Dual View");

    fireEvent.click(within(restoredSelector).getByRole("button", { name: "Reset Layout" }));
    expect(window.localStorage.getItem("o3de-asset-forge-production-layout-preferences")).toBeNull();
    expect(restoredSelector).toHaveTextContent("Active layout: Forge Command");
  });

  it("keeps automation and plugin surfaces UI-only and not admitted", () => {
    render(
      <AssetForgeToolbenchLayout
        reviewPacketData={assetForgeReviewPacketFixture}
        reviewPacketSource="typed_fixture_data"
      />,
    );

    const productionSelector = screen.getByLabelText("Production workspace layout selector");
    fireEvent.click(within(productionSelector).getByRole("tab", { name: "Automation Studio" }));

    expect(screen.getByRole("button", { name: "Run arbitrary script" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Execute plugin slot" })).toBeDisabled();
    expect(screen.getByText("Arbitrary code execution blocked")).toBeInTheDocument();
    expect(screen.getByLabelText("Forge tool extensions panel")).toHaveTextContent("Blocked unsafe extensions");
    expect(screen.getByLabelText("Forge tool extensions panel")).toHaveTextContent("not admitted");
  });
});
