import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MissionCardDeck from "./MissionCardDeck";

describe("MissionCardDeck", () => {
  it("renders mission cards with explicit truth labels and placement proof-only template", () => {
    render(<MissionCardDeck />);

    expect(screen.getByText("Inspect project")).toBeInTheDocument();
    expect(screen.getByText("Create safe O3DE entity")).toBeInTheDocument();
    expect(screen.getByText("Add allowlisted component")).toBeInTheDocument();
    expect(screen.getByText("Asset Forge candidate")).toBeInTheDocument();
    expect(screen.getByText("Stage generated asset")).toBeInTheDocument();
    expect(screen.getByText("Placement proof-only")).toBeInTheDocument();
    expect(screen.getByText("Review latest run")).toBeInTheDocument();

    expect(screen.getByText(/proof-only, fail-closed, non-mutating, real placement not admitted/i)).toBeInTheDocument();
    expect(screen.getByText(/execution_admitted=false/i)).toBeInTheDocument();
    expect(screen.getByText(/placement_write_admitted=false/i)).toBeInTheDocument();
  });

  it("fires contextual evidence and destination actions", () => {
    const onOpenPromptStudio = vi.fn();
    const onOpenAssetForge = vi.fn();
    const onOpenRuntimeOverview = vi.fn();
    const onOpenRecords = vi.fn();
    const onLaunchPlacementProofTemplate = vi.fn();
    const onViewLatestRun = vi.fn();
    const onViewExecution = vi.fn();
    const onViewArtifact = vi.fn();
    const onViewEvidence = vi.fn();

    render(
      <MissionCardDeck
        latestRunId="run-1"
        latestExecutionId="exec-1"
        latestArtifactId="art-1"
        onOpenPromptStudio={onOpenPromptStudio}
        onOpenAssetForge={onOpenAssetForge}
        onOpenRuntimeOverview={onOpenRuntimeOverview}
        onOpenRecords={onOpenRecords}
        onLaunchPlacementProofTemplate={onLaunchPlacementProofTemplate}
        onViewLatestRun={onViewLatestRun}
        onViewExecution={onViewExecution}
        onViewArtifact={onViewArtifact}
        onViewEvidence={onViewEvidence}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /View latest run/i }));
    fireEvent.click(screen.getByRole("button", { name: /View execution/i }));
    fireEvent.click(screen.getByRole("button", { name: /View artifact/i }));
    fireEvent.click(screen.getByRole("button", { name: /^View evidence$/i }));

    expect(onViewLatestRun).toHaveBeenCalledTimes(1);
    expect(onViewExecution).toHaveBeenCalledTimes(1);
    expect(onViewArtifact).toHaveBeenCalledTimes(1);
    expect(onViewEvidence).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Open Asset Forge" })[0]);
    expect(onOpenAssetForge).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Open Prompt Studio" })[0]);
    expect(onOpenPromptStudio).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Use template in Prompt Studio" }));
    expect(onLaunchPlacementProofTemplate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Open Runtime Overview" })[0]);
    expect(onOpenRuntimeOverview).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Open Records" })[0]);
    expect(onOpenRecords).toHaveBeenCalledTimes(1);
  });
});
