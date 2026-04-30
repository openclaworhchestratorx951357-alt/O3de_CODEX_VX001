import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RecordsWorkspaceView from "./RecordsWorkspaceView";

describe("RecordsWorkspaceView", () => {
  it("keeps records surface content mounted while hiding inactive panes", () => {
    render(
      <RecordsWorkspaceView
        activeSurfaceId="executions"
        items={[
          {
            id: "runs",
            label: "Runs",
            detail: "Run list and run detail lane.",
            helpTooltip: "Use runs when you need persisted run truth.",
          },
          {
            id: "executions",
            label: "Executions",
            detail: "Execution list and execution detail lane.",
            helpTooltip: "Use executions when you need persisted execution truth.",
          },
          {
            id: "artifacts",
            label: "Artifacts",
            detail: "Artifact list and artifact detail lane.",
            helpTooltip: "Use artifacts when you need persisted artifact truth.",
          },
        ]}
        onSelectSurface={vi.fn()}
        runsContent={<div>Runs content</div>}
        executionsContent={<div>Executions content</div>}
        artifactsContent={<div>Artifacts content</div>}
        eventsContent={<div>Events content</div>}
      />,
    );

    expect(screen.getByText("Executions content")).toBeInTheDocument();
    expect(screen.getByText("How to use this workspace")).toBeInTheDocument();
    expect(screen.getByTestId("dockable-layout-records")).toBeInTheDocument();
    expect(screen.getAllByText(/Treat this workspace as the closeout and handoff evidence source/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Use this tab when warnings or truth labels need review/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Runs content").closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByText("Artifacts content").closest("[aria-hidden='true']")).not.toBeNull();
  });
});
