import { resolveAssetReadbackReviewPacket } from "./assetForgeReviewPacketMapper";
import type {
  AssetForgeReviewPacketOrigin,
  AssetForgeReviewPacketSource,
} from "../types/assetForgeReviewPacket";
import type { ArtifactRecord, ExecutionRecord } from "../types/contracts";

type AssetForgeLivePacketSelection = {
  selectedRunId: string | null;
  selectedArtifact: ArtifactRecord | null;
  selectedExecution: ExecutionRecord | null;
  selectedExecutionDetails: Record<string, unknown> | null;
};

export type AssetForgeLivePacketResolution = {
  reviewPacketData?: unknown;
  reviewPacketSource?: AssetForgeReviewPacketSource;
  reviewPacketOrigin?: AssetForgeReviewPacketOrigin;
};

function payloadHasReviewPacket(payload: unknown): boolean {
  return resolveAssetReadbackReviewPacket(payload) !== null;
}

export function resolveAssetForgeLivePacketSelection({
  selectedRunId,
  selectedArtifact,
  selectedExecution,
  selectedExecutionDetails,
}: AssetForgeLivePacketSelection): AssetForgeLivePacketResolution {
  const candidates: Array<{ payload: unknown; origin: AssetForgeReviewPacketOrigin }> = [
    {
      payload: selectedArtifact?.metadata,
      origin: {
        kind: "selected_artifact_metadata",
        label: "Selected artifact metadata",
        detail: `Artifact ${selectedArtifact?.id ?? "Unknown / unavailable"} | Execution ${selectedArtifact?.execution_id ?? "Unknown / unavailable"} | Run ${selectedArtifact?.run_id ?? "Unknown / unavailable"}`,
        runId: selectedArtifact?.run_id,
        executionId: selectedArtifact?.execution_id,
        artifactId: selectedArtifact?.id,
      },
    },
    {
      payload: selectedExecution?.details,
      origin: {
        kind: "selected_execution_details",
        label: "Selected execution details",
        detail: `Execution ${selectedExecution?.id ?? "Unknown / unavailable"} | Run ${selectedExecution?.run_id ?? "Unknown / unavailable"}`,
        runId: selectedExecution?.run_id,
        executionId: selectedExecution?.id,
        artifactId: null,
      },
    },
    {
      payload: selectedExecutionDetails,
      origin: {
        kind: "selected_run_execution_details",
        label: "Selected run execution details",
        detail: `Run ${selectedRunId ?? "Unknown / unavailable"} preferred execution snapshot`,
        runId: selectedRunId,
        executionId: selectedExecution?.id ?? null,
        artifactId: null,
      },
    },
  ];

  for (const candidate of candidates) {
    if (payloadHasReviewPacket(candidate.payload)) {
      return {
        reviewPacketData: candidate.payload,
        reviewPacketSource: "live_phase9_packet_data",
        reviewPacketOrigin: candidate.origin,
      };
    }
  }

  return {};
}
