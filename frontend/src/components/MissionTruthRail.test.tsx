import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MissionTruthRail from "./MissionTruthRail";

describe("MissionTruthRail", () => {
  it("shows explicit unknown/not-loaded warnings when telemetry is missing", () => {
    render(
      <MissionTruthRail
        locationLabel="Home / Start Here"
        nextSafeAction="Open Prompt Studio"
        executionAdmitted={false}
        placementWriteAdmitted={false}
        mutationOccurred={false}
      />,
    );

    expect(screen.getByText("Mission truth rail")).toBeInTheDocument();
    expect(screen.getAllByText(/bridge status unavailable/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/adapter status unavailable/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no latest run selected/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no latest placement proof-only snapshot selected/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/execution_admitted=false/i)).toBeInTheDocument();
    expect(screen.getByText(/placement_write_admitted=false/i)).toBeInTheDocument();
    expect(screen.getByText(/mutation_occurred=false/i)).toBeInTheDocument();
  });

  it("renders the latest placement proof-only remediation snapshot when provided", () => {
    const onOpenPromptSessionDetail = vi.fn();
    const onOpenExecutionDetail = vi.fn();
    const onOpenArtifactDetail = vi.fn();
    const onOpenRunDetail = vi.fn();

    render(
      <MissionTruthRail
        locationLabel="Create Movie Cockpit"
        nextSafeAction="Review fail-closed remediation in Prompt Studio before requesting any real placement corridor."
        executionAdmitted={false}
        placementWriteAdmitted={false}
        mutationOccurred={false}
        onOpenPromptSessionDetail={onOpenPromptSessionDetail}
        onOpenExecutionDetail={onOpenExecutionDetail}
        onOpenArtifactDetail={onOpenArtifactDetail}
        onOpenRunDetail={onOpenRunDetail}
        latestPlacementProofOnlyReview={{
          capabilityName: "editor.placement.proof_only",
          promptSessionId: "prompt-proof-1",
          childRunId: "run-proof-1",
          childExecutionId: "exec-proof-1",
          childArtifactId: "artifact-proof-1",
          proofStatus: "blocked",
          candidateId: "candidate-a",
          candidateLabel: "Weathered Ivy Arch",
          artifactId: "artifact-42",
          artifactLabel: "placement-proof-artifact",
          stagedSourceRelativePath: "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
          targetLevelRelativePath: "Levels/BridgeLevel01/BridgeLevel01.prefab",
          targetEntityName: "CinematicPropCandidateA",
          targetComponent: "Mesh",
          stageWriteEvidenceReference: "packet-10/stage-write-evidence.json",
          stageWriteReadbackReference: "packet-10/readback-evidence.json",
          stageWriteReadbackStatus: "succeeded",
          executionMode: "simulated",
          inspectionSurface: "asset-forge-editor-placement-proof-only",
          executionAdmitted: false,
          placementWriteAdmitted: false,
          mutationOccurred: false,
          readOnly: true,
          failClosedReasons: ["server_approval:missing_session", "execution_admission_disabled"],
          serverDecisionCode: "missing_session",
          serverDecisionState: "denied",
          serverStatus: "missing",
          serverReason: "No server-owned approval session was provided; endpoint remains blocked.",
          serverRemediation: "Prepare a server-owned approval session for this exact bounded request, then rerun this same proof-only prompt.",
        }}
      />,
    );

    expect(screen.getByText("Latest placement proof-only remediation snapshot")).toBeInTheDocument();
    expect(screen.getByText("editor.placement.proof_only")).toBeInTheDocument();
    expect(screen.getByText("placement-proof-artifact (artifact-42)")).toBeInTheDocument();
    expect(screen.getByText("server_approval:missing_session, execution_admission_disabled")).toBeInTheDocument();
    expect(screen.getByText("missing_session")).toBeInTheDocument();
    expect(screen.getByText("denied")).toBeInTheDocument();
    expect(screen.getByText("missing")).toBeInTheDocument();
    expect(screen.getByText("No server-owned approval session was provided; endpoint remains blocked.")).toBeInTheDocument();
    expect(screen.getByText(/placement runtime execution is non-admitted/i)).toBeInTheDocument();
    expect(screen.getByText("prompt-proof-1")).toBeInTheDocument();
    expect(screen.getByText("exec-proof-1")).toBeInTheDocument();
    expect(screen.getByText("artifact-proof-1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open proof prompt session" }));
    fireEvent.click(screen.getByRole("button", { name: "Open proof run" }));
    fireEvent.click(screen.getByRole("button", { name: "Open proof execution" }));
    fireEvent.click(screen.getByRole("button", { name: "Open proof artifact" }));

    expect(onOpenPromptSessionDetail).toHaveBeenCalledWith("prompt-proof-1");
    expect(onOpenRunDetail).toHaveBeenCalledWith("run-proof-1");
    expect(onOpenExecutionDetail).toHaveBeenCalledWith("exec-proof-1");
    expect(onOpenArtifactDetail).toHaveBeenCalledWith("artifact-proof-1");
  });

  it("exposes contextual action buttons", () => {
    const onViewLatestRun = vi.fn();
    const onViewExecution = vi.fn();
    const onViewArtifact = vi.fn();
    const onViewEvidence = vi.fn();
    const onOpenPromptStudio = vi.fn();
    const onOpenRuntimeOverview = vi.fn();
    const onOpenRecords = vi.fn();

    render(
      <MissionTruthRail
        locationLabel="Asset Forge"
        nextSafeAction="Run proof-only template"
        latestRunId="run-1"
        latestExecutionId="exec-1"
        latestArtifactId="art-1"
        executionAdmitted={false}
        placementWriteAdmitted={false}
        mutationOccurred={false}
        onViewLatestRun={onViewLatestRun}
        onViewExecution={onViewExecution}
        onViewArtifact={onViewArtifact}
        onViewEvidence={onViewEvidence}
        onOpenPromptStudio={onOpenPromptStudio}
        onOpenRuntimeOverview={onOpenRuntimeOverview}
        onOpenRecords={onOpenRecords}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View latest run" }));
    fireEvent.click(screen.getByRole("button", { name: "View execution" }));
    fireEvent.click(screen.getByRole("button", { name: "View artifact" }));
    fireEvent.click(screen.getByRole("button", { name: "View evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Prompt Studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Runtime Overview" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Records" }));

    expect(onViewLatestRun).toHaveBeenCalledTimes(1);
    expect(onViewExecution).toHaveBeenCalledTimes(1);
    expect(onViewArtifact).toHaveBeenCalledTimes(1);
    expect(onViewEvidence).toHaveBeenCalledTimes(1);
    expect(onOpenPromptStudio).toHaveBeenCalledTimes(1);
    expect(onOpenRuntimeOverview).toHaveBeenCalledTimes(1);
    expect(onOpenRecords).toHaveBeenCalledTimes(1);
  });
});
