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
      activeRecordsSurface: "artifacts",
    });

    expect(resolved.reviewPacketData).toBe(artifact.metadata);
    expect(resolved.reviewPacketSource).toBe("live_phase9_packet_data");
    expect(resolved.reviewPacketOrigin?.kind).toBe("selected_artifact_metadata");
    expect(resolved.reviewPacketOrigin?.artifactId).toBe("artifact-live-001");
    expect(resolved.reviewPacketOrigin?.executionId).toBe("exec-live-001");
    expect(resolved.reviewPacketOrigin?.runId).toBe("run-live-001");
    expect(resolved.reviewPacketOrigin?.capturedAtIso).toBe("2026-04-27T00:00:03.000Z");
    expect(resolved.reviewPacketOrigin?.capturedAtSource).toBe("selected_artifact.created_at");
    expect(resolved.reviewPacketResolutionDiagnostics?.resolvedLane).toBe("artifact");
    expect(resolved.reviewPacketResolutionDiagnostics?.selectedRecordsSurface).toBe("artifacts");
    expect(resolved.reviewPacketResolutionDiagnostics?.summary).toMatch(/Resolved from artifact lane/i);
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
      activeRecordsSurface: "executions",
    });

    expect(resolved.reviewPacketData).toBe(executionPacket);
    expect(resolved.reviewPacketSource).toBe("live_phase9_packet_data");
    expect(resolved.reviewPacketOrigin?.kind).toBe("selected_execution_details");
    expect(resolved.reviewPacketOrigin?.artifactId).toBeNull();
    expect(resolved.reviewPacketOrigin?.executionId).toBe("exec-live-001");
    expect(resolved.reviewPacketOrigin?.runId).toBe("run-live-001");
    expect(resolved.reviewPacketOrigin?.capturedAtIso).toBe("2026-04-27T00:00:02.000Z");
    expect(resolved.reviewPacketOrigin?.capturedAtSource).toBe("selected_execution.finished_at");
    expect(resolved.reviewPacketResolutionDiagnostics?.resolvedLane).toBe("execution");
    expect(resolved.reviewPacketResolutionDiagnostics?.selectedRecordsSurface).toBe("executions");
  });

  it("falls back to selected run execution details when available", () => {
    const runExecutionPacket = {
      created_at: "2026-04-27T00:00:05.000Z",
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
      activeRecordsSurface: "runs",
    });

    expect(resolved.reviewPacketData).toBe(runExecutionPacket);
    expect(resolved.reviewPacketSource).toBe("live_phase9_packet_data");
    expect(resolved.reviewPacketOrigin?.kind).toBe("selected_run_execution_details");
    expect(resolved.reviewPacketOrigin?.artifactId).toBeNull();
    expect(resolved.reviewPacketOrigin?.executionId).toBeNull();
    expect(resolved.reviewPacketOrigin?.runId).toBe("run-live-001");
    expect(resolved.reviewPacketOrigin?.capturedAtIso).toBe("2026-04-27T00:00:05.000Z");
    expect(resolved.reviewPacketOrigin?.capturedAtSource).toBe("payload.created_at");
    expect(resolved.reviewPacketResolutionDiagnostics?.resolvedLane).toBe("run");
    expect(resolved.reviewPacketResolutionDiagnostics?.selectedRecordsSurface).toBe("runs");
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
      activeRecordsSurface: "artifacts",
    });

    expect(resolved.reviewPacketData).toBeUndefined();
    expect(resolved.reviewPacketSource).toBeUndefined();
    expect(resolved.reviewPacketOrigin).toBeUndefined();
    expect(resolved.reviewPacketResolutionDiagnostics?.resolvedLane).toBeNull();
    expect(resolved.reviewPacketResolutionDiagnostics?.summary).toMatch(/No resolvable review packet/i);
    expect(resolved.reviewPacketResolutionDiagnostics?.attempts.map((attempt) => attempt.lane)).toEqual([
      "artifact",
      "execution",
      "run",
    ]);
    expect(resolved.reviewPacketResolutionDiagnostics?.attempts[0]?.reason).toMatch(/payload present but no resolvable/i);
    expect(resolved.reviewPacketResolutionDiagnostics?.attempts[2]?.reason).toMatch(/payload present but no resolvable/i);
  });

  it("prefers selected execution details when the executions lane is active", () => {
    const artifact = buildArtifact({
      asset_readback_review_packet: {
        capability: "asset.source.inspect",
        selected_project: {
          project_name: "ArtifactPacket",
        },
      },
    });
    const executionPacket = {
      capability: "asset.source.inspect",
      selected_project: {
        project_name: "ExecutionPacketPreferred",
      },
    };

    const resolved = resolveAssetForgeLivePacketSelection({
      selectedRunId: "run-live-001",
      selectedArtifact: artifact,
      selectedExecution: buildExecution(executionPacket),
      selectedExecutionDetails: null,
      activeRecordsSurface: "executions",
    });

    expect(resolved.reviewPacketData).toBe(executionPacket);
    expect(resolved.reviewPacketSource).toBe("live_phase9_packet_data");
    expect(resolved.reviewPacketOrigin?.kind).toBe("selected_execution_details");
    expect(resolved.reviewPacketOrigin?.executionId).toBe("exec-live-001");
    expect(resolved.reviewPacketResolutionDiagnostics?.resolvedLane).toBe("execution");
    expect(resolved.reviewPacketResolutionDiagnostics?.preferredOrder).toEqual(["execution", "artifact", "run"]);
  });

  it("prefers selected run execution details when the runs lane is active", () => {
    const artifact = buildArtifact({
      asset_readback_review_packet: {
        capability: "asset.source.inspect",
        selected_project: {
          project_name: "ArtifactPacket",
        },
      },
    });
    const executionPacket = {
      capability: "asset.source.inspect",
      selected_project: {
        project_name: "ExecutionPacket",
      },
    };
    const runExecutionPacket = {
      created_at: "2026-04-27T00:00:05.000Z",
      asset_readback_review_packet: {
        capability: "asset.source.inspect",
        selected_project: {
          project_name: "RunPacketPreferred",
        },
      },
    };

    const resolved = resolveAssetForgeLivePacketSelection({
      selectedRunId: "run-live-001",
      selectedArtifact: artifact,
      selectedExecution: buildExecution(executionPacket),
      selectedExecutionDetails: runExecutionPacket,
      activeRecordsSurface: "runs",
    });

    expect(resolved.reviewPacketData).toBe(runExecutionPacket);
    expect(resolved.reviewPacketSource).toBe("live_phase9_packet_data");
    expect(resolved.reviewPacketOrigin?.kind).toBe("selected_run_execution_details");
    expect(resolved.reviewPacketOrigin?.runId).toBe("run-live-001");
    expect(resolved.reviewPacketResolutionDiagnostics?.resolvedLane).toBe("run");
    expect(resolved.reviewPacketResolutionDiagnostics?.preferredOrder).toEqual(["run", "execution", "artifact"]);
  });
});
