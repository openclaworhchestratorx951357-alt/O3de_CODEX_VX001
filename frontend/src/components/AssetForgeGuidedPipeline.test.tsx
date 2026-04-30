import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AssetForgeGuidedPipeline from "./AssetForgeGuidedPipeline";

describe("AssetForgeGuidedPipeline", () => {
  it("renders mission-first pipeline labels and blocked gate explanations", () => {
    render(<AssetForgeGuidedPipeline />);

    expect(screen.getByText(/Describe -> Candidate -> Preflight -> Stage Plan -> Stage Write -> Readback -> Placement Proof -> Review/i)).toBeInTheDocument();
    expect(screen.getByText("Describe")).toBeInTheDocument();
    expect(screen.getByText("Candidate")).toBeInTheDocument();
    expect(screen.getByText("Preflight")).toBeInTheDocument();
    expect(screen.getByText("Stage Plan")).toBeInTheDocument();
    expect(screen.getByText("Stage Write")).toBeInTheDocument();
    expect(screen.getByText("Readback")).toBeInTheDocument();
    expect(screen.getByText("Placement Proof")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();

    expect(screen.getByText(/Provider generation blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Blender execution blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Asset Processor execution blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Placement execution blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Placement write blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Material\/prefab mutation blocked/i)).toBeInTheDocument();
  });

  it("fires contextual navigation actions", () => {
    const onOpenPromptStudio = vi.fn();
    const onLaunchPlacementProofTemplate = vi.fn();
    const onOpenRuntimeOverview = vi.fn();
    const onOpenRecords = vi.fn();
    const onViewEvidence = vi.fn();

    render(
      <AssetForgeGuidedPipeline
        onOpenPromptStudio={onOpenPromptStudio}
        onLaunchPlacementProofTemplate={onLaunchPlacementProofTemplate}
        onOpenRuntimeOverview={onOpenRuntimeOverview}
        onOpenRecords={onOpenRecords}
        onViewEvidence={onViewEvidence}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Prompt Studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Use placement proof template" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Runtime Overview" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Records" }));
    fireEvent.click(screen.getByRole("button", { name: "View evidence" }));

    expect(onOpenPromptStudio).toHaveBeenCalledTimes(1);
    expect(onLaunchPlacementProofTemplate).toHaveBeenCalledTimes(1);
    expect(onOpenRuntimeOverview).toHaveBeenCalledTimes(1);
    expect(onOpenRecords).toHaveBeenCalledTimes(1);
    expect(onViewEvidence).toHaveBeenCalledTimes(1);
  });
});
