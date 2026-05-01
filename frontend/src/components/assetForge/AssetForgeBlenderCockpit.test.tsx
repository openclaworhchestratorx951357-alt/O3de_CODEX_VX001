import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AssetForgeBlenderCockpit from "./AssetForgeBlenderCockpit";

describe("AssetForgeBlenderCockpit", () => {
  it("renders a Blender-style editor layout with top, left, center, right, and bottom regions", () => {
    render(
      <AssetForgeBlenderCockpit
        onOpenPromptStudio={vi.fn()}
        onOpenRecords={vi.fn()}
        onViewEvidence={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Asset Forge Blender-style editor cockpit")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge workflow stages")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge left tool and outliner area")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge center viewport area")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge right inspector area")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge bottom evidence prompt and log drawer")).toBeInTheDocument();

    expect(screen.getByText("3D Viewport")).toBeInTheDocument();
    expect(screen.getByText("Tool Shelf")).toBeInTheDocument();
    expect(screen.getByText("Asset Outliner")).toBeInTheDocument();
    expect(screen.getByText("Inspector")).toBeInTheDocument();
    expect(screen.getByText("Evidence / Prompts / Logs")).toBeInTheDocument();
  });

  it("keeps placement proof copy fail-closed and non-mutating", () => {
    render(<AssetForgeBlenderCockpit />);

    expect(screen.getAllByText("proof-only").length).toBeGreaterThan(0);
    expect(screen.getByText("non-mutating / fail-closed / real placement not admitted")).toBeInTheDocument();
    expect(screen.getByText("Placement runtime execution blocked.")).toBeInTheDocument();
    expect(screen.getByText("Asset Processor execution blocked.")).toBeInTheDocument();
    expect(screen.getByText("Provider generation blocked.")).toBeInTheDocument();
    expect(screen.getByText("Blender execution blocked.")).toBeInTheDocument();
  });

  it("shows a dominant viewport instead of a dashboard-only panel", () => {
    render(<AssetForgeBlenderCockpit />);

    expect(screen.getByText("Demo viewport — no provider generation, Blender execution, Asset Processor execution, or O3DE mutation admitted.")).toBeInTheDocument();
    expect(screen.getByText("Solid")).toBeInTheDocument();
    expect(screen.getByText("Material Preview")).toBeInTheDocument();
    expect(screen.getByText("Wireframe")).toBeInTheDocument();
    expect(screen.getByText("O3DE Preview")).toBeInTheDocument();
  });
});
