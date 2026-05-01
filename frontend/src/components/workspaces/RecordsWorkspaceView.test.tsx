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
    expect(screen.getByText("Inspector and truth")).toBeInTheDocument();
    expect(screen.getByTestId("dockable-layout-records")).toBeInTheDocument();
    expect(screen.getByTestId("records-top-zone")).toHaveTextContent("Surface strip");
    expect(screen.getByTestId("records-left-zone")).toHaveTextContent("Surface navigator");
    expect(screen.getByTestId("records-center-zone")).toHaveTextContent("Records dominant work area");
    expect(screen.getByTestId("records-right-zone")).toHaveTextContent("Inspector and truth");
    expect(screen.getByTestId("records-bottom-zone")).toHaveTextContent("Records lane summary drawer");
    expect(screen.getByText("Runs content").closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByText("Artifacts content").closest("[aria-hidden='true']")).not.toBeNull();
  });
});
