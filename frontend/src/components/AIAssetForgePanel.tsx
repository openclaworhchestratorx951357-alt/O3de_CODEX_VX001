import type { CSSProperties } from "react";

import AssetForgeStudioShell from "./AssetForgeStudioShell";
import { assetForgeReviewPacketFixture } from "../fixtures/assetForgeReviewPacketFixture";
import type {
  AssetForgePacketResolutionDiagnostics,
  AssetForgeReviewPacketOrigin,
  AssetForgeReviewPacketSource,
} from "../types/assetForgeReviewPacket";
import type { O3DEBridgeStatus } from "../types/contracts";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

type AIAssetForgePanelProps = {
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  onOpenReviewPacketOriginRecord?: (origin: AssetForgeReviewPacketOrigin) => void;
  reviewPacketData?: unknown;
  reviewPacketSource?: AssetForgeReviewPacketSource;
  reviewPacketOrigin?: AssetForgeReviewPacketOrigin;
  reviewPacketResolutionDiagnostics?: AssetForgePacketResolutionDiagnostics;
  bridgeStatus?: O3DEBridgeStatus | null;
};

function buildDefaultOrigin(
  source: AssetForgeReviewPacketSource,
): AssetForgeReviewPacketOrigin {
  switch (source) {
    case "live_phase9_packet_data":
      return {
        kind: "unknown_live_packet_origin",
        label: "Live packet payload",
        detail: "Live packet source connected, but selected record origin is not available in this view.",
      };
    case "existing_frontend_packet_data":
      return {
        kind: "existing_frontend_packet_payload",
        label: "Existing frontend packet payload",
        detail: "Packet data came from existing frontend payload wiring.",
      };
    case "typed_fixture_data":
    default:
      return {
        kind: "typed_fixture_preview",
        label: "Typed fixture preview",
        detail: "No live Phase 9 packet is connected. Showing local typed fixture preview only.",
      };
  }
}

export default function AIAssetForgePanel(props: AIAssetForgePanelProps) {
  const resolvedReviewPacketData = props.reviewPacketData ?? assetForgeReviewPacketFixture;
  const resolvedReviewPacketSource = props.reviewPacketSource ?? "typed_fixture_data";
  const resolvedReviewPacketOrigin = props.reviewPacketOrigin ?? buildDefaultOrigin(resolvedReviewPacketSource);

  return (
    <section aria-label="AI Asset Forge" style={panelStyle}>
      <AssetForgeStudioShell
        projectProfile={props.projectProfile}
        onOpenPromptStudio={props.onOpenPromptStudio}
        onOpenRuntimeOverview={props.onOpenRuntimeOverview}
        onOpenBuilder={props.onOpenBuilder}
        onOpenReviewPacketOriginRecord={props.onOpenReviewPacketOriginRecord}
        reviewPacketData={resolvedReviewPacketData}
        reviewPacketSource={resolvedReviewPacketSource}
        reviewPacketOrigin={resolvedReviewPacketOrigin}
        reviewPacketResolutionDiagnostics={props.reviewPacketResolutionDiagnostics}
        bridgeStatus={props.bridgeStatus}
      />
    </section>
  );
}

const panelStyle = {
  display: "grid",
  minWidth: 0,
} satisfies CSSProperties;
