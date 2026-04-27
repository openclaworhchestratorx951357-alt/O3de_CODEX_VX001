import { describe, expect, it } from "vitest";

import { resolveAssetForgeLivePacketSelection } from "./assetForgeLivePacketResolver";
import type { ArtifactRecord, ExecutionRecord } from "../types/contracts";

function buildExecution(details: Record<string, unknown>): ExecutionRecord {
  return {
    id: "exec-live-001",
    run_id: "run-live-001",
    request_id: "req-live-001",
    agent: "asset-forge",
    tool: "asset.source.inspect",
    execution_mode: "real",
    status: "succeeded",
    started_at: "2026-04-27T00:00:00.000Z",
    finished_at: "2026-04-27T00:00:02.000Z",
    warnings: [],
    logs: [],
    artifact_ids: [],
    details,
    result_summary: "ok",
  };
}

function buildArtifact(metadata: Record<string, unknown>): ArtifactRecord {
  return {
    id: "artifact-live-001",
    run_id: "run-live-001",
    execution_id: "exec-live-001",
    label: "Phase 9 packet",
    kind: "json",
    uri: "file://packet.json",
    path: "packet.json",
    content_type: "application/json",
    simulated: false,
    created_at: "2026-04-27T00:00:03.000Z",
    metadata,
  };
}

describe("resolveAssetForgeLivePacketSelection", () => {
  it("prefers selected artifact metadata when packet evidence exists", () => {
    const artifact = buildArtifact({
      asset_readback_review_packet: {
        capability: "asset.source.inspect",
        selected_project: {
          project_name: "BridgeTraining",
        },
      },
    });

    const execution = buildExecution({
      capability: "asset.source.inspect",
      selected_project: {
        project_name: "FallbackExecutionPacket",
      },
    });

    const resolved = resolveAssetForgeLivePacketSelection({
      selectedRunId: "run-live-001",
      selectedArtifact: artifact,
      selectedExecution: execution,
      selectedExecutionDetails: null,
    });

    expect(resolved.reviewPacketData).toBe(artifact.metadata);
    expect(resolved.reviewPacketSource).toBe("live_phase9_packet_data");
    expect(resolved.reviewPacketOrigin?.kind).toBe("selected_artifact_metadata");
    expect(resolved.reviewPacketOrigin?.artifactId).toBe("artifact-live-001");
    expect(resolved.reviewPacketOrigin?.executionId).toBe("exec-live-001");
    expect(resolved.reviewPacketOrigin?.runId).toBe("run-live-001");
  });

  it("falls back to selected execution details when no artifact packet exists", () => {
    const executionPacket = {
      capability: "asset.source.inspect",
      selected_project: {
        project_name: "ExecutionPacket",
      },
    };

    const resolved = resolveAssetForgeLivePacketSelection({
      selectedRunId: "run-live-001",
      selectedArtifact: null,
      selectedExecution: buildExecution(executionPacket),
      selectedExecutionDetails: null,
    });

    expect(resolved.reviewPacketData).toBe(executionPacket);
    expect(resolved.reviewPacketSource).toBe("live_phase9_packet_data");
    expect(resolved.reviewPacketOrigin?.kind).toBe("selected_execution_details");
    expect(resolved.reviewPacketOrigin?.artifactId).toBeNull();
    expect(resolved.reviewPacketOrigin?.executionId).toBe("exec-live-001");
    expect(resolved.reviewPacketOrigin?.runId).toBe("run-live-001");
  });

  it("falls back to selected run execution details when available", () => {
    const runExecutionPacket = {
      asset_readback_review_packet: {
        capability: "asset.source.inspect",
        selected_project: {
          project_name: "RunPacket",
        },
      },
    };

    const resolved = resolveAssetForgeLivePacketSelection({
      selectedRunId: "run-live-001",
      selectedArtifact: null,
      selectedExecution: null,
      selectedExecutionDetails: runExecutionPacket,
    });

    expect(resolved.reviewPacketData).toBe(runExecutionPacket);
    expect(resolved.reviewPacketSource).toBe("live_phase9_packet_data");
    expect(resolved.reviewPacketOrigin?.kind).toBe("selected_run_execution_details");
    expect(resolved.reviewPacketOrigin?.artifactId).toBeNull();
    expect(resolved.reviewPacketOrigin?.executionId).toBeNull();
    expect(resolved.reviewPacketOrigin?.runId).toBe("run-live-001");
  });

  it("returns empty resolution when no packet evidence exists", () => {
    const resolved = resolveAssetForgeLivePacketSelection({
      selectedRunId: "run-live-001",
      selectedArtifact: buildArtifact({
        note: "no packet payload",
      }),
      selectedExecution: buildExecution({
        note: "no packet payload",
      }),
      selectedExecutionDetails: {
        note: "still no packet payload",
      },
    });

    expect(resolved.reviewPacketData).toBeUndefined();
    expect(resolved.reviewPacketSource).toBeUndefined();
    expect(resolved.reviewPacketOrigin).toBeUndefined();
  });
});
