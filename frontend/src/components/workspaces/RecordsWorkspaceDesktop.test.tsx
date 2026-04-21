import { createRef, type ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RecordsWorkspaceDesktop from "./RecordsWorkspaceDesktop";

vi.mock("../OverviewContextStrip", () => ({
  default: () => <div>OverviewContextStrip stub</div>,
}));

vi.mock("../ArtifactsPanel", () => ({
  default: () => <div>ArtifactsPanel stub</div>,
}));

vi.mock("../ArtifactDetailPanel", () => ({
  default: () => <div>ArtifactDetailPanel stub</div>,
}));

vi.mock("../ExecutionsPanel", () => ({
  default: () => <div>ExecutionsPanel stub</div>,
}));

vi.mock("../ExecutionDetailPanel", () => ({
  default: () => <div>ExecutionDetailPanel stub</div>,
}));

vi.mock("../RunsPanel", () => ({
  default: () => <div>RunsPanel stub</div>,
}));

vi.mock("../RunDetailPanel", () => ({
  default: () => <div>RunDetailPanel stub</div>,
}));

function renderRecordsWorkspaceDesktop(
  activeSurfaceId: ComponentProps<typeof RecordsWorkspaceDesktop>["activeSurfaceId"],
) {
  return render(
    <RecordsWorkspaceDesktop
      activeSurfaceId={activeSurfaceId}
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
      artifacts={{
        panelKey: "artifacts-panel",
        sectionRef: createRef<HTMLDivElement>(),
        detailSectionRef: createRef<HTMLDivElement>(),
        contextStrip: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["artifacts"]["contextStrip"],
        artifactsPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["artifacts"]["artifactsPanel"],
        artifactDetailPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["artifacts"]["artifactDetailPanel"],
      }}
      executions={{
        panelKey: "executions-panel",
        sectionRef: createRef<HTMLDivElement>(),
        detailSectionRef: createRef<HTMLDivElement>(),
        contextStrip: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["executions"]["contextStrip"],
        executionsPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["executions"]["executionsPanel"],
        executionDetailPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["executions"]["executionDetailPanel"],
      }}
      runs={{
        panelKey: "runs-panel",
        sectionRef: createRef<HTMLDivElement>(),
        detailSectionRef: createRef<HTMLDivElement>(),
        contextStrip: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["runs"]["contextStrip"],
        runsPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["runs"]["runsPanel"],
        runDetailPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["runs"]["runDetailPanel"],
      }}
    />,
  );
}

describe("RecordsWorkspaceDesktop", () => {
  it("assembles the runs desktop surface with context, list, and detail panes", () => {
    renderRecordsWorkspaceDesktop("runs");

    expect(screen.getByText("OverviewContextStrip stub")).toBeInTheDocument();
    expect(screen.getByText("RunsPanel stub")).toBeInTheDocument();
    expect(screen.getByText("RunDetailPanel stub")).toBeInTheDocument();
    expect(screen.queryByText("ExecutionsPanel stub")).not.toBeInTheDocument();
    expect(screen.queryByText("ArtifactsPanel stub")).not.toBeInTheDocument();
  });

  it("assembles the artifact desktop surface with context, list, and detail panes", () => {
    renderRecordsWorkspaceDesktop("artifacts");

    expect(screen.getByText("OverviewContextStrip stub")).toBeInTheDocument();
    expect(screen.getByText("ArtifactsPanel stub")).toBeInTheDocument();
    expect(screen.getByText("ArtifactDetailPanel stub")).toBeInTheDocument();
    expect(screen.queryByText("RunsPanel stub")).not.toBeInTheDocument();
    expect(screen.queryByText("ExecutionsPanel stub")).not.toBeInTheDocument();
  });
});
