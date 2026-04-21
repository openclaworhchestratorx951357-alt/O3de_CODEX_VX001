import { createRef, type ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RuntimeWorkspaceDesktop from "./RuntimeWorkspaceDesktop";

vi.mock("../AdaptersPanel", () => ({
  default: () => <div>AdaptersPanel stub</div>,
}));

vi.mock("../SystemStatusPanel", () => ({
  default: () => <div>SystemStatusPanel stub</div>,
}));

vi.mock("../OperatorOverviewPanel", () => ({
  default: () => <div>OperatorOverviewPanel stub</div>,
}));

vi.mock("../OverviewContextStrip", () => ({
  default: () => <div>OverviewContextStrip stub</div>,
}));

vi.mock("../ExecutorsPanel", () => ({
  default: () => <div>ExecutorsPanel stub</div>,
}));

vi.mock("../ExecutorDetailPanel", () => ({
  default: () => <div>ExecutorDetailPanel stub</div>,
}));

vi.mock("../WorkspacesPanel", () => ({
  default: () => <div>WorkspacesPanel stub</div>,
}));

vi.mock("../WorkspaceDetailPanel", () => ({
  default: () => <div>WorkspaceDetailPanel stub</div>,
}));

vi.mock("../Phase7CapabilitySummaryPanel", () => ({
  default: () => <div>Phase7CapabilitySummaryPanel stub</div>,
}));

vi.mock("../LocksPanel", () => ({
  default: () => <div>LocksPanel stub</div>,
}));

vi.mock("../PoliciesPanel", () => ({
  default: () => <div>PoliciesPanel stub</div>,
}));

function renderRuntimeWorkspaceDesktop(
  activeSurfaceId: ComponentProps<typeof RuntimeWorkspaceDesktop>["activeSurfaceId"],
) {
  return render(
    <RuntimeWorkspaceDesktop
      activeSurfaceId={activeSurfaceId}
      items={[
        {
          id: "overview",
          label: "Overview",
          detail: "Bridge and runtime status.",
          helpTooltip: "Use overview for current runtime health.",
        },
        {
          id: "executors",
          label: "Executors",
          detail: "Execution owners and availability.",
          helpTooltip: "Use executors for ownership follow-up.",
        },
        {
          id: "workspaces",
          label: "Workspaces",
          detail: "Workspace state and related activity.",
          helpTooltip: "Use workspaces for substrate follow-up.",
        },
        {
          id: "governance",
          label: "Governance",
          detail: "Policies and capability posture.",
          helpTooltip: "Use governance for policy and lock review.",
        },
      ]}
      onSelectSurface={vi.fn()}
      overview={{
        adapters: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["overview"]["adapters"],
        systemStatus: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["overview"]["systemStatus"],
        operatorOverview: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["overview"]["operatorOverview"],
      }}
      executors={{
        panelKey: "executors-panel",
        sectionRef: createRef<HTMLDivElement>(),
        detailSectionRef: createRef<HTMLDivElement>(),
        contextStrip: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["executors"]["contextStrip"],
        executorsPanel: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["executors"]["executorsPanel"],
        executorDetailPanel: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["executors"]["executorDetailPanel"],
      }}
      workspaces={{
        panelKey: "workspaces-panel",
        sectionRef: createRef<HTMLDivElement>(),
        detailSectionRef: createRef<HTMLDivElement>(),
        contextStrip: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["workspaces"]["contextStrip"],
        workspacesPanel: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["workspaces"]["workspacesPanel"],
        workspaceDetailPanel: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["workspaces"]["workspaceDetailPanel"],
      }}
      governance={{
        phase7: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["governance"]["phase7"],
        locks: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["governance"]["locks"],
        policies: {} as ComponentProps<typeof RuntimeWorkspaceDesktop>["governance"]["policies"],
      }}
    />,
  );
}

describe("RuntimeWorkspaceDesktop", () => {
  it("assembles the overview desktop surface from the expected runtime panels", () => {
    renderRuntimeWorkspaceDesktop("overview");

    expect(screen.getByText("AdaptersPanel stub")).toBeInTheDocument();
    expect(screen.getByText("SystemStatusPanel stub")).toBeInTheDocument();
    expect(screen.getByText("OperatorOverviewPanel stub")).toBeInTheDocument();
    expect(screen.queryByText("ExecutorsPanel stub")).not.toBeInTheDocument();
    expect(screen.queryByText("WorkspacesPanel stub")).not.toBeInTheDocument();
    expect(screen.queryByText("Phase7CapabilitySummaryPanel stub")).not.toBeInTheDocument();
  });

  it("assembles the executor desktop surface with context, list, and detail panes", () => {
    renderRuntimeWorkspaceDesktop("executors");

    expect(screen.getByText("OverviewContextStrip stub")).toBeInTheDocument();
    expect(screen.getByText("ExecutorsPanel stub")).toBeInTheDocument();
    expect(screen.getByText("ExecutorDetailPanel stub")).toBeInTheDocument();
    expect(screen.queryByText("AdaptersPanel stub")).not.toBeInTheDocument();
    expect(screen.queryByText("WorkspacesPanel stub")).not.toBeInTheDocument();
    expect(screen.queryByText("Phase7CapabilitySummaryPanel stub")).not.toBeInTheDocument();
  });
});
