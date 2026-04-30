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
    expect(screen.getByText(/execution_admitted=false/i)).toBeInTheDocument();
    expect(screen.getByText(/placement_write_admitted=false/i)).toBeInTheDocument();
    expect(screen.getByText(/mutation_occurred=false/i)).toBeInTheDocument();
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
