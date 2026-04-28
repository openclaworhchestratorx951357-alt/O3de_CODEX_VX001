import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AssetForgeToolbenchLayout from "./AssetForgeToolbenchLayout";
import { assetForgeReviewPacketFixture } from "../fixtures/assetForgeReviewPacketFixture";
import { assetForgeAnimationTimelineFixture } from "../fixtures/assetForgeAnimationTimelineFixture";
import type { O3DEBridgeStatus } from "../types/contracts";

function renderToolbench(overrides = {}) {
  return render(
    <AssetForgeToolbenchLayout
      reviewPacketData={assetForgeReviewPacketFixture}
      reviewPacketSource="typed_fixture_data"
      {...overrides}
    />,
  );
}

const bridgeStatusFixture: O3DEBridgeStatus = {
  project_root: "C:/Projects/BridgeTraining",
  project_root_exists: true,
  bridge_root: "C:/Projects/BridgeTraining/.o3de/bridge",
  inbox_path: "C:/Projects/BridgeTraining/.o3de/bridge/inbox",
  processing_path: "C:/Projects/BridgeTraining/.o3de/bridge/processing",
  results_path: "C:/Projects/BridgeTraining/.o3de/bridge/results",
  deadletter_path: "C:/Projects/BridgeTraining/.o3de/bridge/deadletter",
  heartbeat_path: "C:/Projects/BridgeTraining/.o3de/bridge/heartbeat.json",
  log_path: "C:/Projects/BridgeTraining/.o3de/bridge/bridge.log",
  source_label: "live_o3de_bridge",
  configured: true,
  heartbeat_fresh: true,
  heartbeat_age_s: 4,
  runner_process_active: true,
  queue_counts: {
    inbox: 1,
    processing: 0,
    results: 3,
    deadletter: 0,
  },
  heartbeat: null,
  last_results_cleanup: null,
  recent_deadletters: [],
};

describe("AssetForgeToolbenchLayout", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a fixed top menu and defaults to the Create page only", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    const topMenu = within(shell).getByLabelText("Forge top application menu");
    ["File", "Edit", "Create", "Animation", "Assets", "Entity", "Components", "Materials", "Lighting", "Camera", "Review", "Help"].forEach((menuName) => {
      expect(within(topMenu).getByRole("button", { name: menuName })).toBeInTheDocument();
    });
    expect(within(topMenu).getByText("read-only")).toBeInTheDocument();
    const truthStrip = within(shell).getByLabelText("Forge connection truth strip");
    expect(within(truthStrip).getByText("Packet status")).toBeInTheDocument();
    expect(within(truthStrip).getByText("Packet source")).toBeInTheDocument();
    expect(within(truthStrip).getByText("Packet corridor")).toBeInTheDocument();
    expect(within(truthStrip).getByText("Resolution")).toBeInTheDocument();
    expect(within(truthStrip).getByText("Bridge")).toBeInTheDocument();
    expect(within(truthStrip).getByText("Heartbeat")).toBeInTheDocument();
    expect(within(truthStrip).getByText("Capture age")).toBeInTheDocument();
    expect(within(truthStrip).getByText("Records target")).toBeInTheDocument();
    expect(within(truthStrip).getByText("Lane alignment")).toBeInTheDocument();
    expect(within(truthStrip).getByLabelText("Lane alignment status")).toHaveTextContent("Unknown");
    expect(within(truthStrip).getByText("Unavailable")).toBeInTheDocument();
    expect(within(truthStrip).getByRole("button", { name: "Open origin in Records" })).toBeDisabled();

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

  it("hydrates the Review page from saved local menu preference", () => {
    window.localStorage.setItem("o3de-asset-forge-page-shell-menu-v1", "Review");
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    expect(within(shell).getByLabelText("Asset Forge Review page")).toBeInTheDocument();
    expect(within(shell).queryByLabelText("Asset Forge Create page")).not.toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge operator review packet full page")).toBeInTheDocument();
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
    expect(within(shell).getAllByText("Levels/BridgeLevel01/BridgeLevel01.prefab").length).toBeGreaterThan(0);
    expect(within(shell).getAllByText("Typed sample fixture data (read-only preview; not live)").length).toBeGreaterThan(0);
    expect(within(shell).getByText("Packet captured at")).toBeInTheDocument();
    expect(within(shell).getAllByText("Packet corridor").length).toBeGreaterThan(0);
    expect(within(shell).getByText("Packet capture age")).toBeInTheDocument();
    expect(within(shell).getByText("Packet captured from")).toBeInTheDocument();
    expect(within(shell).getAllByText("Not connected - placeholder only - no execution").length).toBeGreaterThan(0);
    expect(within(shell).getByLabelText("Asset freshness severity")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Overall freshness stale")).toBeInTheDocument();
    expect(within(shell).getByText(/Bridge heartbeat age cue: unavailable because bridge connection is not active\./i)).toBeInTheDocument();
    expect(within(shell).queryByText("Prompt request")).not.toBeInTheDocument();
    expect(within(shell).queryByLabelText("Forge command strip")).not.toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Import selected asset" })).toBeDisabled();
    expect(within(shell).getByRole("button", { name: "Stage source asset" })).toBeDisabled();
    expect(within(shell).getByRole("button", { name: "Execute Asset Processor" })).toBeDisabled();
  });

  it("renders packet product/dependency row previews when Phase 9 row arrays are present", () => {
    renderToolbench({
      reviewPacketSource: "live_phase9_packet_data",
      reviewPacketData: {
        asset_readback_review_packet: {
          ...assetForgeReviewPacketFixture,
          products: {
            ...assetForgeReviewPacketFixture.products,
            product_rows: [
              {
                product_path: "pc/bridge_segment.azmodel",
                product_id: 401,
              },
            ],
          },
          dependencies: {
            ...assetForgeReviewPacketFixture.dependencies,
            dependency_rows: [
              {
                dependency_path: "textures/bridge_albedo.png",
                dependency_type: "source",
              },
            ],
          },
        },
      },
    });

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Assets" }));

    fireEvent.click(within(shell).getByRole("button", { name: "Product assets" }));
    expect(within(shell).getByText(/Product row 1: .*product_path=pc\/bridge_segment\.azmodel/i)).toBeInTheDocument();

    fireEvent.click(within(shell).getByRole("button", { name: "Dependencies" }));
    expect(within(shell).getByText(/Dependency row 1: .*dependency_path=textures\/bridge_albedo\.png/i)).toBeInTheDocument();
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

  it("supports Animation page with focus mode and tools on the side", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Animation" }));

    expect(within(shell).getByLabelText("Asset Forge Animation page")).toBeInTheDocument();
    expect(within(shell).getByText("X-sheet / Timeline")).toBeInTheDocument();
    expect(within(shell).getByText("Frame")).toBeInTheDocument();
    expect(within(shell).getByText(assetForgeAnimationTimelineFixture.keyframeRows[0].channel)).toBeInTheDocument();
    expect(
      within(shell).getByText((content) =>
        content.includes(assetForgeAnimationTimelineFixture.keyframeRows[0].valueFrom)
        && content.includes(assetForgeAnimationTimelineFixture.keyframeRows[0].valueTo)
      )
    ).toBeInTheDocument();
    expect(within(shell).getByText("Camera and shot list")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Viewport fullscreen" })).toBeInTheDocument();
    expect(within(shell).getAllByRole("button", { name: assetForgeAnimationTimelineFixture.disabledWriteActionLabel }).length).toBeGreaterThan(0);
    expect(within(shell).getAllByText("Timeline mode").length).toBeGreaterThan(0);

    fireEvent.click(within(shell).getByRole("button", { name: "Viewport fullscreen" }));

    expect(within(shell).getByText("Animation timeline viewport (focus)")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Exit fullscreen" })).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge left tool shelf")).toBeInTheDocument();
    expect(within(shell).getByText(/renderer not connected/i)).toBeInTheDocument();

    fireEvent.click(within(shell).getByRole("button", { name: "Exit fullscreen" }));
    expect(within(shell).getByText("X-sheet / Timeline")).toBeInTheDocument();
    expect(within(shell).queryByText("Animation timeline viewport (focus)")).not.toBeInTheDocument();
  });

  it("renders animation timeline diagnostics when animation payload is partially malformed", () => {
    renderToolbench({
      reviewPacketSource: "live_phase9_packet_data",
      reviewPacketData: {
        asset_readback_review_packet: {
          ...assetForgeReviewPacketFixture,
          animation_timeline: {
            pageModeLabel: "Malformed animation preview",
            timelineLabel: "Malformed lane",
            keyframeRows: "bad-array",
            notes: "bad-notes",
            cameraShots: ["Shot 010"],
            mutedActionsBlocked: ["Insert keyframe"],
            disabledWriteActionLabel: "Animation write blocked",
          },
        },
      },
    });

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Animation" }));

    const diagnostics = within(shell).getByLabelText("Animation timeline diagnostics");
    expect(diagnostics).toBeInTheDocument();
    expect(diagnostics).toHaveTextContent("Timeline payload data is partially malformed");
    expect(diagnostics).toHaveTextContent(
      "asset_readback_review_packet.animation_timeline.keyframeRows: keyframeRows expected an array.",
    );
    expect(diagnostics).toHaveTextContent(
      "asset_readback_review_packet.animation_timeline: notes expected an array of [label, detail] tuples.",
    );
    expect(within(shell).getByText("Malformed animation preview")).toBeInTheDocument();
    expect(within(shell).getByText("Malformed lane")).toBeInTheDocument();
  });

  it("shows animation timeline diagnostics in Review evidence", () => {
    renderToolbench({
      reviewPacketSource: "live_phase9_packet_data",
      reviewPacketData: {
        asset_readback_review_packet: {
          ...assetForgeReviewPacketFixture,
          animation_timeline: {
            pageModeLabel: "Malformed animation preview",
            timelineLabel: "Malformed lane",
            keyframeRows: "bad-array",
            notes: "bad-notes",
            cameraShots: ["Shot 010"],
            mutedActionsBlocked: ["Insert keyframe"],
            disabledWriteActionLabel: "Animation write blocked",
          },
        },
      },
    });

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Review" }));

    expect(within(shell).getByLabelText("Asset Forge Review page")).toBeInTheDocument();
    expect(within(shell).getByText("Animation timeline diagnostics")).toBeInTheDocument();
    const issueLines = within(shell).getAllByRole("listitem");
    const issueText = issueLines.map((item) => item.textContent ?? "");
    expect(issueText.some((line) => line.includes("asset_readback_review_packet.animation_timeline") && line.includes("keyframeRows"))).toBe(true);
    expect(issueText.some((line) => line.includes("asset_readback_review_packet.animation_timeline") && line.includes("notes") && line.includes("label, detail"))).toBe(true);
  });

  it("uses direct animation timeline data from review packet payload", () => {
    renderToolbench({
      reviewPacketSource: "live_phase9_packet_data",
      reviewPacketData: {
        asset_readback_review_packet: {
          ...assetForgeReviewPacketFixture,
          animation_timeline: {
            pageModeLabel: "Live review-only timeline",
            timelineLabel: "Direct payload keyframe lane",
            keyframeRows: [
              {
                frame: 8,
                channel: "Transform Scale",
                valueFrom: "0.95",
                valueTo: "1.05",
                blendMode: "ease",
              },
              {
                frame: 16,
                channel: "Camera FOV",
                valueFrom: "60deg",
                valueTo: "45deg",
                blendMode: "linear",
              },
            ],
            cameraShots: ["Shot 1: Payload check"],
            notes: [
              ["Timeline mode", "Live payload"],
              ["Writeback", "Blocked"],
            ],
            mutedActionsBlocked: ["Insert keyframe", "Delete keyframe"],
            disabledWriteActionLabel: "Write animation blocked in review",
            writeActionLabel: "Queue animation write preview action",
          },
        },
      },
    });

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Animation" }));

    expect(within(shell).getByText("Live review-only timeline")).toBeInTheDocument();
    expect(within(shell).getByText("Direct payload keyframe lane")).toBeInTheDocument();
    expect(within(shell).getByText("Timeline setup")).toBeInTheDocument();
    expect(within(shell).getByText("Transform Scale")).toBeInTheDocument();
    expect(
      within(shell).getByText((content) =>
        content.includes("0.95")
        && content.includes("1.05")
      )
    ).toBeInTheDocument();
    expect(within(shell).getByText("Write animation blocked in review")).toBeInTheDocument();
    expect(within(shell).getByText("Queue animation write preview action")).toBeInTheDocument();
    expect(within(shell).getAllByRole("button", { name: "Write animation blocked in review" }).length).toBe(1);
    expect(within(shell).getAllByRole("button", { name: "Queue animation write preview action" }).length).toBe(1);
    expect(within(shell).queryByText(assetForgeAnimationTimelineFixture.keyframeRows[0].channel)).not.toBeInTheDocument();
  });

  it("exits focused preview when changing menu context", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Animation" }));
    fireEvent.click(within(shell).getByRole("button", { name: "Viewport fullscreen" }));

    expect(within(shell).getByText("Animation timeline viewport (focus)")).toBeInTheDocument();
    fireEvent.click(within(shell).getByRole("button", { name: "Create" }));

    expect(within(shell).queryByText("Animation timeline viewport (focus)")).not.toBeInTheDocument();
    expect(within(shell).getByText("Prompt request")).toBeInTheDocument();
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
    expect(within(shell).getByRole("button", { name: "Viewport fullscreen" })).toBeInTheDocument();

    fireEvent.click(within(shell).getByRole("button", { name: "Viewport fullscreen" }));

    expect(within(shell).queryByText("Entity outliner")).not.toBeInTheDocument();
    expect(within(shell).queryByText("Transform readback")).not.toBeInTheDocument();
    expect(within(shell).getByText("Selected entity preview (focus)")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Exit fullscreen" })).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge left tool shelf")).toBeInTheDocument();
    expect(within(shell).getByText(/renderer not connected/i)).toBeInTheDocument();
  });

  it("supports Create viewport focus mode while keeping command strip accessible", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Create" }));

    expect(within(shell).getByText("Asset candidate preview")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Viewport fullscreen" })).toBeInTheDocument();
    expect(within(shell).getByText("Open Prompt Studio draft")).toBeInTheDocument();

    fireEvent.click(within(shell).getByRole("button", { name: "Viewport fullscreen" }));

    expect(within(shell).queryByText("Prompt request")).not.toBeInTheDocument();
    expect(within(shell).queryByText("Forge plan preview")).not.toBeInTheDocument();
    expect(within(shell).queryByText("Approval gates")).not.toBeInTheDocument();
    expect(within(shell).getByText("Asset candidate preview (focus)")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Exit fullscreen" })).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge command strip")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge left tool shelf")).toBeInTheDocument();
  });

  it("supports Lighting viewport focus mode while keeping the tool shelf visible", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Lighting" }));

    expect(within(shell).getByText("Lookdev preview")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Viewport fullscreen" })).toBeInTheDocument();

    fireEvent.click(within(shell).getByRole("button", { name: "Viewport fullscreen" }));

    expect(within(shell).queryByText("Light list")).not.toBeInTheDocument();
    expect(within(shell).queryByText("Lighting plan notes")).not.toBeInTheDocument();
    expect(within(shell).getByText("Lookdev preview (focus)")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Exit fullscreen" })).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge left tool shelf")).toBeInTheDocument();
    expect(within(shell).getByText(/renderer not connected/i)).toBeInTheDocument();
  });

  it("supports Camera viewport focus mode with blocked write controls", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Camera" }));

    expect(within(shell).getByText("Camera / perspective preview")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Write camera to O3DE scene" })).toBeDisabled();
    expect(within(shell).getByRole("button", { name: "Viewport fullscreen" })).toBeInTheDocument();

    fireEvent.click(within(shell).getByRole("button", { name: "Viewport fullscreen" }));

    expect(within(shell).queryByText("Camera list")).not.toBeInTheDocument();
    expect(within(shell).queryByText("Cinematic shot list")).not.toBeInTheDocument();
    expect(within(shell).getByText("Camera Perspective preview (focus)")).toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Exit fullscreen" })).toBeInTheDocument();
    expect(within(shell).queryByRole("button", { name: "Write camera to O3DE scene" })).not.toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge left tool shelf")).toBeInTheDocument();
  });

  it("gives Review a full-page operator packet surface", () => {
    renderToolbench();

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Review" }));

    expect(within(shell).getByLabelText("Asset Forge Review page")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge operator review packet full page")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Forge operator review packet")).toBeInTheDocument();
    expect(within(shell).getAllByText("Typed sample fixture data (read-only preview; not live)").length).toBeGreaterThan(0);
    expect(within(shell).getByLabelText("Review packet corridor")).toHaveTextContent("Corridor: Fixture preview");
    expect(within(shell).getByText("Packet origin and Records route")).toBeInTheDocument();
    expect(within(shell).getByText("Freshness severity")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Review freshness severity")).toBeInTheDocument();
    expect(within(shell).getByLabelText("Overall freshness stale")).toBeInTheDocument();
    expect(within(shell).getByText("Evidence summary")).toBeInTheDocument();
    expect(within(shell).getAllByText("Unknown / unavailable").length).toBeGreaterThan(0);
    expect(within(shell).getAllByText("Safest next step").length).toBeGreaterThan(0);
    expect(within(shell).queryByText("Prompt request")).not.toBeInTheDocument();
    expect(within(shell).queryByLabelText("Forge assets content browser")).not.toBeInTheDocument();
    expect(within(shell).getByRole("button", { name: "Approve production import" })).toBeDisabled();
  });

  it("shows a truthful unresolved-live banner when live packet fields are unavailable", () => {
    renderToolbench({
      reviewPacketSource: "live_phase9_packet_data",
      reviewPacketData: {
        note: "no packet fields",
      },
    });

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    const truthStrip = within(shell).getByLabelText("Forge connection truth strip");
    expect(within(truthStrip).getByText("Live payload unresolved")).toBeInTheDocument();
    fireEvent.click(within(shell).getByRole("button", { name: "Review" }));

    const unresolvedBanner = within(shell).getByLabelText("Live packet unresolved notice");
    expect(unresolvedBanner).toBeInTheDocument();
    expect(within(unresolvedBanner).getByText("Live packet source unresolved")).toBeInTheDocument();
    expect(unresolvedBanner).toHaveTextContent(/no resolvable asset_readback_review_packet payload/i);
    expect(within(unresolvedBanner).getByText(/Resolution state:/i)).toBeInTheDocument();
    expect(within(shell).getByText("Live packet unresolved (review packet fields unavailable)")).toBeInTheDocument();
  });

  it("renders lane diagnostics in Assets and Review when live diagnostics are provided", () => {
    renderToolbench({
      reviewPacketSource: "live_phase9_packet_data",
      reviewPacketResolutionDiagnostics: {
        selectedRecordsSurface: "executions",
        preferredOrder: ["execution", "artifact", "run"],
        resolvedLane: "execution",
        summary: "Resolved from execution lane.",
        attempts: [
          {
            lane: "execution",
            label: "Selected execution details",
            hasPayload: true,
            hasReviewPacket: true,
            reason: "Resolved review packet fields from this lane.",
          },
          {
            lane: "artifact",
            label: "Selected artifact metadata",
            hasPayload: true,
            hasReviewPacket: false,
            reason: "Payload present but no resolvable asset_readback_review_packet fields.",
          },
          {
            lane: "run",
            label: "Selected run execution details",
            hasPayload: false,
            hasReviewPacket: false,
            reason: "No payload selected for this lane.",
          },
        ],
      },
    });

    const shell = screen.getByLabelText("Asset Forge Studio Shell");

    fireEvent.click(within(shell).getByRole("button", { name: "Assets" }));
    const assetsDiagnostics = within(shell).getByLabelText("Asset packet resolution diagnostics");
    expect(assetsDiagnostics).toHaveTextContent("Resolved lane");
    expect(assetsDiagnostics).toHaveTextContent("Execution lane");
    expect(assetsDiagnostics).toHaveTextContent("Resolved from execution lane.");
    expect(assetsDiagnostics).toHaveTextContent("Selected artifact metadata: payload present; packet unresolved;");

    fireEvent.click(within(shell).getByRole("button", { name: "Review" }));
    expect(within(shell).getByText("Resolution diagnostics")).toBeInTheDocument();
    expect(within(shell).getByText("Selected Records lane")).toBeInTheDocument();
    expect(within(shell).getByText("executions")).toBeInTheDocument();
    expect(within(shell).getByText("Selected run execution details: payload missing; packet unresolved; No payload selected for this lane.")).toBeInTheDocument();
  });

  it("shows a review drift notice when packet lane and active Records lane are misaligned", () => {
    renderToolbench({
      reviewPacketSource: "live_phase9_packet_data",
      reviewPacketResolutionDiagnostics: {
        selectedRecordsSurface: "runs",
        preferredOrder: ["run", "execution", "artifact"],
        resolvedLane: "artifact",
        summary: "Resolved from artifact lane.",
        attempts: [
          {
            lane: "run",
            label: "Selected run execution details",
            hasPayload: false,
            hasReviewPacket: false,
            reason: "No payload selected for this lane.",
          },
          {
            lane: "artifact",
            label: "Selected artifact metadata",
            hasPayload: true,
            hasReviewPacket: true,
            reason: "Resolved review packet fields from this lane.",
          },
        ],
      },
      recordsLaneAlignment: {
        packetResolvedLane: "artifact",
        packetResolvedLaneLabel: "Artifact lane",
        activeRecordsSurface: "runs",
        activeRecordsSurfaceLabel: "Runs lane",
        driftDetected: true,
        guidance: "Packet evidence resolved from Artifact lane, but Records is focused on Runs lane. Refresh or reopen the packet lane before relying on readiness state.",
      },
    });

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Review" }));

    const driftNotice = within(shell).getByLabelText("Records lane drift notice");
    expect(driftNotice).toBeInTheDocument();
    expect(within(driftNotice).getByText("Records lane drift detected")).toBeInTheDocument();
    expect(driftNotice).toHaveTextContent("Packet resolved lane");
    expect(driftNotice).toHaveTextContent("Artifact lane");
    expect(driftNotice).toHaveTextContent("Active Records lane");
    expect(driftNotice).toHaveTextContent("Runs lane");
    expect(driftNotice).toHaveTextContent("Refresh or reopen the packet lane");
    const openPacketLaneButton = within(driftNotice).getByRole("button", { name: "Open packet lane surface" });
    expect(openPacketLaneButton).toBeDisabled();
    expect(driftNotice).toHaveTextContent("Records navigation handler is unavailable in this view.");
    const truthStrip = within(shell).getByLabelText("Forge connection truth strip");
    const laneAlignmentStatus = within(truthStrip).getByLabelText("Lane alignment status");
    expect(laneAlignmentStatus).toHaveTextContent("Drift");
    expect(laneAlignmentStatus).toHaveAttribute("title", expect.stringContaining("Refresh or reopen the packet lane"));
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

  it("opens packet-origin record navigation from File and Review pages", () => {
    const onOpenReviewPacketOriginRecord = vi.fn();

    renderToolbench({
      onOpenReviewPacketOriginRecord,
      reviewPacketSource: "live_phase9_packet_data",
      reviewPacketOrigin: {
        kind: "selected_artifact_metadata",
        label: "Selected artifact metadata",
        detail: "Artifact artifact-live-001 | Execution exec-live-001 | Run run-live-001",
        runId: "run-live-001",
        executionId: "exec-live-001",
        artifactId: "artifact-live-001",
        capturedAtIso: "2026-04-27T00:00:03.000Z",
        capturedAtSource: "selected_artifact.created_at",
      },
    });

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    fireEvent.click(within(shell).getByRole("button", { name: "Open origin in Records" }));
    expect(onOpenReviewPacketOriginRecord).toHaveBeenCalledTimes(1);
    expect(onOpenReviewPacketOriginRecord).toHaveBeenLastCalledWith(expect.objectContaining({
      artifactId: "artifact-live-001",
      executionId: "exec-live-001",
      runId: "run-live-001",
    }));

    fireEvent.click(within(shell).getByRole("button", { name: "File" }));
    fireEvent.click(within(shell).getByRole("button", { name: "Open source record in Records" }));
    expect(onOpenReviewPacketOriginRecord).toHaveBeenCalledTimes(2);
    expect(onOpenReviewPacketOriginRecord).toHaveBeenLastCalledWith(expect.objectContaining({
      artifactId: "artifact-live-001",
      executionId: "exec-live-001",
      runId: "run-live-001",
    }));

    fireEvent.click(within(shell).getByRole("button", { name: "Review" }));
    fireEvent.click(within(shell).getByRole("button", { name: "Open source record in Records" }));
    expect(onOpenReviewPacketOriginRecord).toHaveBeenCalledTimes(3);
  });

  it("keeps packet-origin record navigation disabled when no record ids are available", () => {
    const onOpenReviewPacketOriginRecord = vi.fn();

    renderToolbench({
      onOpenReviewPacketOriginRecord,
      reviewPacketSource: "typed_fixture_data",
      reviewPacketOrigin: {
        kind: "typed_fixture_preview",
        label: "Typed fixture preview",
        detail: "No live Phase 9 packet is connected. Showing local typed fixture preview only.",
      },
    });

    const shell = screen.getByLabelText("Asset Forge Studio Shell");
    expect(within(shell).getByRole("button", { name: "Open origin in Records" })).toBeDisabled();

    fireEvent.click(within(shell).getByRole("button", { name: "File" }));
    expect(within(shell).getByRole("button", { name: "Open source record in Records" })).toBeDisabled();
    expect(within(shell).getByText("No live run/execution/artifact id is available for this packet source.")).toBeInTheDocument();

    fireEvent.click(within(shell).getByRole("button", { name: "Review" }));
    expect(within(shell).getByRole("button", { name: "Open source record in Records" })).toBeDisabled();
    expect(within(shell).getByText("No live run/execution/artifact id is available for this packet source.")).toBeInTheDocument();
    expect(onOpenReviewPacketOriginRecord).not.toHaveBeenCalled();
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

  it("shows read-only bridge connection truth when live bridge status is provided", () => {
    renderToolbench({
      bridgeStatus: bridgeStatusFixture,
      reviewPacketSource: "live_phase9_packet_data",
      reviewPacketOrigin: {
        kind: "selected_artifact_metadata",
        label: "Selected artifact metadata",
        detail: "Artifact artifact-live-001 | Execution exec-live-001 | Run run-live-001",
        runId: "run-live-001",
        executionId: "exec-live-001",
        artifactId: "artifact-live-001",
        capturedAtIso: "2026-04-27T00:00:03.000Z",
        capturedAtSource: "selected_artifact.created_at",
      },
    });

    const shell = screen.getByLabelText("Asset Forge Studio Shell");

    fireEvent.click(within(shell).getByRole("button", { name: "File" }));
    expect(within(shell).getByText("Bridge read-only snapshot")).toBeInTheDocument();
    expect(within(shell).getAllByText("Connected (read-only)").length).toBeGreaterThan(0);
    expect(within(shell).getAllByText("Fresh (4s)").length).toBeGreaterThan(0);
    expect(within(shell).getByText("inbox 1 | processing 0 | results 3 | deadletter 0")).toBeInTheDocument();
    expect(within(shell).getAllByText("Live Phase 9 packet data (read-only)").length).toBeGreaterThan(0);
    expect(within(shell).getAllByText("Artifact metadata").length).toBeGreaterThan(0);
    expect(within(shell).getByText("Selected artifact metadata")).toBeInTheDocument();
    expect(within(shell).getByText("artifact-live-001")).toBeInTheDocument();
    expect(within(shell).getByText("2026-04-27T00:00:03.000Z")).toBeInTheDocument();
    expect(within(shell).getByText("selected_artifact.created_at")).toBeInTheDocument();
    expect(within(shell).getAllByText("Artifact artifact-live-001").length).toBeGreaterThan(0);

    fireEvent.click(within(shell).getByRole("button", { name: "Assets" }));
    expect(within(shell).getByText(/Connected \(read-only\) queue inbox 1 \| processing 0 \| results 3 \| deadletter 0; placeholder only - no execution/i)).toBeInTheDocument();
    expect(within(shell).getByText("Bridge heartbeat age cue: fresh (4s).")).toBeInTheDocument();

    fireEvent.click(within(shell).getByRole("button", { name: "Help" }));
    expect(within(shell).getByText("Bridge connection: Connected (read-only)")).toBeInTheDocument();
    expect(within(shell).getByText("Bridge queue: inbox 1 | processing 0 | results 3 | deadletter 0")).toBeInTheDocument();
    expect(within(shell).getByText("Review packet source: Live Phase 9 packet data (read-only)")).toBeInTheDocument();
    expect(within(shell).getByText("Review packet corridor: Artifact metadata")).toBeInTheDocument();
    expect(within(shell).getByText("Review packet origin: Selected artifact metadata")).toBeInTheDocument();
  });
});
