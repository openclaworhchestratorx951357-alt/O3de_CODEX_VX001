import type { CSSProperties } from "react";

import AssetForgeToolbenchLayout from "./AssetForgeToolbenchLayout";
import { assetForgeReviewPacketFixture } from "../fixtures/assetForgeReviewPacketFixture";
import type { AssetForgeReviewPacketSource } from "../types/assetForgeReviewPacket";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

type AIAssetForgePanelProps = {
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  reviewPacketData?: unknown;
  reviewPacketSource?: AssetForgeReviewPacketSource;
};

export default function AIAssetForgePanel({
  projectProfile,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenBuilder,
  reviewPacketData,
  reviewPacketSource,
}: AIAssetForgePanelProps) {
  const resolvedReviewPacketData = reviewPacketData ?? assetForgeReviewPacketFixture;
  const resolvedReviewPacketSource = reviewPacketSource ?? "typed_fixture_data";

  return (
    <section aria-label="AI Asset Forge" style={panelStyle}>
      <AssetForgeToolbenchLayout
        projectProfile={projectProfile}
        onOpenPromptStudio={onOpenPromptStudio}
        onOpenRuntimeOverview={onOpenRuntimeOverview}
        onOpenBuilder={onOpenBuilder}
        reviewPacketData={resolvedReviewPacketData}
        reviewPacketSource={resolvedReviewPacketSource}
      />
    </section>
  );
}

const panelStyle = {
  display: "grid",
  gap: 10,
} satisfies CSSProperties;
