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

function readTimestampField(record: Record<string, unknown> | null, field: string): string | null {
  if (!record) {
    return null;
  }
  const value = record[field];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function resolveTimestampFromPayload(payload: unknown): { capturedAtIso: string | null; capturedAtSource: string | null } {
  const record = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null;
  const directFields = [
    "captured_at",
    "created_at",
    "finished_at",
    "started_at",
    "packet_created_at",
    "packet_captured_at",
  ];

  for (const field of directFields) {
    const value = readTimestampField(record, field);
    if (value) {
      return {
        capturedAtIso: value,
        capturedAtSource: `payload.${field}`,
      };
    }
  }

  const nestedPacket = record?.asset_readback_review_packet;
  const nestedRecord = nestedPacket && typeof nestedPacket === "object" && !Array.isArray(nestedPacket)
    ? nestedPacket as Record<string, unknown>
    : null;

  for (const field of directFields) {
    const value = readTimestampField(nestedRecord, field);
    if (value) {
      return {
        capturedAtIso: value,
        capturedAtSource: `asset_readback_review_packet.${field}`,
      };
    }
  }

  return {
    capturedAtIso: null,
    capturedAtSource: null,
  };
}

export function resolveAssetForgeLivePacketSelection({
  selectedRunId,
  selectedArtifact,
  selectedExecution,
  selectedExecutionDetails,
}: AssetForgeLivePacketSelection): AssetForgeLivePacketResolution {
  const executionCapturedAtIso = selectedExecution?.finished_at ?? selectedExecution?.started_at ?? null;
  const executionCapturedAtSource = selectedExecution?.finished_at
    ? "selected_execution.finished_at"
    : selectedExecution?.started_at
      ? "selected_execution.started_at"
      : null;
  const runSnapshotTimestamp = resolveTimestampFromPayload(selectedExecutionDetails);

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
        capturedAtIso: selectedArtifact?.created_at ?? null,
        capturedAtSource: selectedArtifact?.created_at ? "selected_artifact.created_at" : null,
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
        capturedAtIso: executionCapturedAtIso,
        capturedAtSource: executionCapturedAtSource,
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
        capturedAtIso: runSnapshotTimestamp.capturedAtIso,
        capturedAtSource: runSnapshotTimestamp.capturedAtSource,
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
