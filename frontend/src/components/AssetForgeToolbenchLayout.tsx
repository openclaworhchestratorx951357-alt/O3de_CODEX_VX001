import AssetForgeStudioShell from "./AssetForgeStudioShell";
import type {
  AssetForgeReviewPacketOrigin,
  AssetForgeReviewPacketSource,
} from "../types/assetForgeReviewPacket";
import type { O3DEBridgeStatus } from "../types/contracts";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

type AssetForgeToolbenchLayoutProps = {
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  onOpenReviewPacketOriginRecord?: (origin: AssetForgeReviewPacketOrigin) => void;
  reviewPacketData: unknown;
  reviewPacketSource: AssetForgeReviewPacketSource;
  reviewPacketOrigin?: AssetForgeReviewPacketOrigin;
  bridgeStatus?: O3DEBridgeStatus | null;
};

export default function AssetForgeToolbenchLayout(props: AssetForgeToolbenchLayoutProps) {
  return <AssetForgeStudioShell {...props} />;
}
