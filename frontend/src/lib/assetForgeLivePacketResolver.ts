import { resolveAssetReadbackReviewPacket } from "./assetForgeReviewPacketMapper";
import type { AssetForgeReviewPacketSource } from "../types/assetForgeReviewPacket";
import type { ArtifactRecord, ExecutionRecord } from "../types/contracts";

type AssetForgeLivePacketSelection = {
  selectedArtifact: ArtifactRecord | null;
  selectedExecution: ExecutionRecord | null;
  selectedExecutionDetails: Record<string, unknown> | null;
};

type AssetForgeLivePacketResolution = {
  reviewPacketData?: unknown;
  reviewPacketSource?: AssetForgeReviewPacketSource;
};

function payloadHasReviewPacket(payload: unknown): boolean {
  return resolveAssetReadbackReviewPacket(payload) !== null;
}

export function resolveAssetForgeLivePacketSelection({
  selectedArtifact,
  selectedExecution,
  selectedExecutionDetails,
}: AssetForgeLivePacketSelection): AssetForgeLivePacketResolution {
  const candidates: unknown[] = [
    selectedArtifact?.metadata,
    selectedExecution?.details,
    selectedExecutionDetails,
  ];

  for (const candidate of candidates) {
    if (payloadHasReviewPacket(candidate)) {
      return {
        reviewPacketData: candidate,
        reviewPacketSource: "live_phase9_packet_data",
      };
    }
  }

  return {};
}
