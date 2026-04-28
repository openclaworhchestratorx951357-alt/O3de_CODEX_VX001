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
        packetCorridorLabel="Fixture preview"
        packetOriginRows={[
          ["Origin", "Typed fixture preview"],
          ["Records target", "Unavailable"],
        ]}
      />,
    );

    const panel = screen.getByLabelText("Forge operator review packet");
    expect(within(panel).getByText("McpSandbox")).toBeInTheDocument();
    expect(within(panel).getByText("pc/levels/bridgelevel01/bridgelevel01.spawnable")).toBeInTheDocument();
    expect(within(panel).getByText("Read-only proof present")).toBeInTheDocument();
    expect(within(panel).getByText("Not requested (not approved)")).toBeInTheDocument();
    expect(within(panel).getByLabelText("Review packet corridor")).toHaveTextContent("Corridor: Fixture preview");
    expect(within(panel).getByText("Packet origin and Records route")).toBeInTheDocument();
    expect(within(panel).getByText("Typed fixture preview")).toBeInTheDocument();
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
        packetCorridorLabel="Execution details"
      />,
    );

    const panel = screen.getByLabelText("Forge operator review packet");
    expect(within(panel).getByText("PartialProject")).toBeInTheDocument();
    expect(within(panel).getAllByText("Unknown / unavailable").length).toBeGreaterThan(0);
    expect(within(panel).getByLabelText("Review packet corridor")).toHaveTextContent("Corridor: Execution details");
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
    expect(within(panel).getByLabelText("Review packet corridor")).toHaveTextContent("Corridor: Existing frontend payload");
  });

  it("labels unresolved live packet payloads truthfully", () => {
    render(
      <AssetForgeReviewPacketPanel
        packetData={{ selected_run_id: "run-001" }}
        packetSource="live_phase9_packet_data"
      />,
    );

    const panel = screen.getByLabelText("Forge operator review packet");
    expect(within(panel).getByText("Live packet unresolved (review packet fields unavailable)")).toBeInTheDocument();
    expect(within(panel).getByText("Live payload unresolved")).toBeInTheDocument();
  });
});
