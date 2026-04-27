import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AssetForgeReviewPacketPanel from "./AssetForgeReviewPacketPanel";
import { assetForgeReviewPacketFixture } from "../fixtures/assetForgeReviewPacketFixture";

describe("AssetForgeReviewPacketPanel", () => {
  it("renders a complete review packet", () => {
    render(
      <AssetForgeReviewPacketPanel
        packetData={assetForgeReviewPacketFixture}
        packetSource="typed_fixture_data"
      />,
    );

    const panel = screen.getByLabelText("Forge operator review packet");
    expect(within(panel).getByText("McpSandbox")).toBeInTheDocument();
    expect(within(panel).getByText("pc/levels/bridgelevel01/bridgelevel01.spawnable")).toBeInTheDocument();
    expect(within(panel).getByText("Read-only proof present")).toBeInTheDocument();
    expect(within(panel).getByText("Not requested (not approved)")).toBeInTheDocument();
  });

  it("renders safely with missing and partial packet data", () => {
    render(
      <AssetForgeReviewPacketPanel
        packetData={{
          asset_readback_review_packet: {
            capability: "asset.source.inspect",
            selected_project: {
              project_name: "PartialProject",
            },
          },
        }}
        packetSource="existing_frontend_packet_data"
      />,
    );

    const panel = screen.getByLabelText("Forge operator review packet");
    expect(within(panel).getByText("PartialProject")).toBeInTheDocument();
    expect(within(panel).getAllByText("Unknown / unavailable").length).toBeGreaterThan(0);
  });

  it("does not present unknown license, quality, or approval as approved", () => {
    render(
      <AssetForgeReviewPacketPanel
        packetData={{
          capability: "asset.source.inspect",
          operator_approval_state: "mystery_state",
          forge_handoff: {
            license_status: null,
            quality_status: null,
            production_approval_state: null,
          },
        }}
        packetSource="existing_frontend_packet_data"
      />,
    );

    const panel = screen.getByLabelText("Forge operator review packet");
    expect(within(panel).queryByText("Approved (operator-confirmed)")).not.toBeInTheDocument();
    expect(within(panel).getAllByText("Unknown / unavailable (not approved)").length).toBeGreaterThan(0);
  });
});
