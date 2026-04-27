import type { CSSProperties } from "react";

import AssetForgeStudioShell from "./AssetForgeStudioShell";
import { assetForgeReviewPacketFixture } from "../fixtures/assetForgeReviewPacketFixture";
import type { AssetForgeReviewPacketSource } from "../types/assetForgeReviewPacket";
import type { O3DEBridgeStatus } from "../types/contracts";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

type AIAssetForgePanelProps = {
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  reviewPacketData?: unknown;
  reviewPacketSource?: AssetForgeReviewPacketSource;
  bridgeStatus?: O3DEBridgeStatus | null;
};

export default function AIAssetForgePanel(props: AIAssetForgePanelProps) {
  const resolvedReviewPacketData = props.reviewPacketData ?? assetForgeReviewPacketFixture;
  const resolvedReviewPacketSource = props.reviewPacketSource ?? "typed_fixture_data";

  return (
    <section aria-label="AI Asset Forge" style={panelStyle}>
      <AssetForgeStudioShell
        projectProfile={props.projectProfile}
        onOpenPromptStudio={props.onOpenPromptStudio}
        onOpenRuntimeOverview={props.onOpenRuntimeOverview}
        onOpenBuilder={props.onOpenBuilder}
        reviewPacketData={resolvedReviewPacketData}
        reviewPacketSource={resolvedReviewPacketSource}
        bridgeStatus={props.bridgeStatus}
      />
    </section>
  );
}

const panelStyle = {
  display: "grid",
  minWidth: 0,
} satisfies CSSProperties;
