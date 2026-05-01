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

    expect(screen.getAllByText(/proof-only \/ fail-closed/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Prefill only\. Open Prompt Studio, preview plan, then execute manually if admitted\./i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/execution_admitted=false/i)).toBeInTheDocument();
    expect(screen.getByText(/placement_write_admitted=false/i)).toBeInTheDocument();
  });

  it("fires contextual evidence and destination actions", () => {
    const onOpenPromptStudio = vi.fn();
    const onOpenAssetForge = vi.fn();
    const onOpenRuntimeOverview = vi.fn();
    const onOpenRecords = vi.fn();
    const onLaunchInspectTemplate = vi.fn();
    const onLaunchCreateEntityTemplate = vi.fn();
    const onLaunchAddMeshTemplate = vi.fn();
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
        onLaunchInspectTemplate={onLaunchInspectTemplate}
        onLaunchCreateEntityTemplate={onLaunchCreateEntityTemplate}
        onLaunchAddMeshTemplate={onLaunchAddMeshTemplate}
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

    fireEvent.click(screen.getByRole("button", { name: "Load inspect template in Prompt Studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Load create-entity template in Prompt Studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Load add-component template in Prompt Studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Load placement proof-only template in Prompt Studio" }));

    expect(onLaunchInspectTemplate).toHaveBeenCalledTimes(1);
    expect(onLaunchCreateEntityTemplate).toHaveBeenCalledTimes(1);
    expect(onLaunchAddMeshTemplate).toHaveBeenCalledTimes(1);
    expect(onLaunchPlacementProofTemplate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Open Runtime Overview" })[0]);
    expect(onOpenRuntimeOverview).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Open Records" })[0]);
    expect(onOpenRecords).toHaveBeenCalledTimes(1);
  });

  it("uses registry-driven template action handlers when provided", () => {
    const onLegacyInspect = vi.fn();
    const onRegistryInspect = vi.fn();

    render(
      <MissionCardDeck
        onLaunchInspectTemplate={onLegacyInspect}
        promptTemplateActionHandlers={{
          "inspect-project": onRegistryInspect,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load inspect template in Prompt Studio" }));
    expect(onRegistryInspect).toHaveBeenCalledTimes(1);
    expect(onLegacyInspect).toHaveBeenCalledTimes(0);
  });
});
