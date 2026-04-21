import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import {
  createPendingPromise,
  expectDesktopTabActive,
  getDesktopTabButton,
  getLaunchpadButton,
  setPendingAppApiMocks,
} from "./test/appDesktopTestUtils";

const ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY = "o3de-control-app-active-desktop-workspace";
const ACTIVE_OPERATIONS_SURFACE_SESSION_KEY = "o3de-control-app-active-operations-surface";
const ACTIVE_RUNTIME_SURFACE_SESSION_KEY = "o3de-control-app-active-runtime-surface";
const ACTIVE_RECORDS_SURFACE_SESSION_KEY = "o3de-control-app-active-records-surface";

const apiMocks = vi.hoisted(() => ({
  approveApproval: vi.fn(),
  cleanupO3deBridgeResults: vi.fn(),
  fetchAdapters: vi.fn(),
  fetchApprovalCards: vi.fn(),
  fetchArtifact: vi.fn(),
  fetchArtifactCards: vi.fn(),
  fetchArtifactCardsForTruthFilter: vi.fn(),
  fetchControlPlaneSummary: vi.fn(),
  fetchExecutor: vi.fn(),
  fetchExecutors: vi.fn(),
  fetchExecution: vi.fn(),
  fetchExecutionCards: vi.fn(),
  fetchExecutionCardsForTruthFilter: vi.fn(),
  fetchEventCards: vi.fn(),
  fetchLockCards: vi.fn(),
  fetchO3deBridge: vi.fn(),
  fetchO3deTarget: vi.fn(),
  fetchPolicies: vi.fn(),
  fetchReadiness: vi.fn(),
  fetchRun: vi.fn(),
  fetchRunCards: vi.fn(),
  fetchRunsSummaryForFilter: vi.fn(),
  fetchToolsCatalog: vi.fn(),
  fetchWorkspace: vi.fn(),
  fetchWorkspaces: vi.fn(),
  rejectApproval: vi.fn(),
}));

vi.mock("./lib/api", () => apiMocks);

vi.mock("./components/AdaptersPanel", () => ({
  default: () => <div>AdaptersPanel stub</div>,
}));

vi.mock("./components/ApprovalQueue", () => ({
  default: () => <div>ApprovalQueue stub</div>,
}));

vi.mock("./components/ArtifactsPanel", () => ({
  default: () => <div>ArtifactsPanel stub</div>,
}));

vi.mock("./components/ExecutionsPanel", () => ({
  default: () => <div>ExecutionsPanel stub</div>,
}));

vi.mock("./components/LayoutHeader", () => ({
  default: () => <div>LayoutHeader stub</div>,
}));

vi.mock("./components/ExecutorsPanel", () => ({
  default: () => <div>ExecutorsPanel stub</div>,
}));

vi.mock("./components/LocksPanel", () => ({
  default: () => <div>LocksPanel stub</div>,
}));

vi.mock("./components/OperatorOverviewPanel", () => ({
  default: () => <div>OperatorOverviewPanel stub</div>,
}));

vi.mock("./components/OverviewAttentionPanel", () => ({
  default: () => <div>OverviewAttentionPanel stub</div>,
}));

vi.mock("./components/OverviewCloseoutReadinessPanel", () => ({
  default: () => <div>OverviewCloseoutReadinessPanel stub</div>,
}));

vi.mock("./components/OverviewContextMemoryPanel", () => ({
  default: () => <div>OverviewContextMemoryPanel stub</div>,
}));

vi.mock("./components/OverviewHandoffConfidencePanel", () => ({
  default: () => <div>OverviewHandoffConfidencePanel stub</div>,
}));

vi.mock("./components/OverviewHandoffExportPanel", () => ({
  default: () => <div>OverviewHandoffExportPanel stub</div>,
}));

vi.mock("./components/OverviewHandoffPackagePanel", () => ({
  default: () => <div>OverviewHandoffPackagePanel stub</div>,
}));

vi.mock("./components/OverviewReviewQueuePanel", () => ({
  default: () => <div>OverviewReviewQueuePanel stub</div>,
}));

vi.mock("./components/OverviewReviewSessionPanel", () => ({
  default: () => <div>OverviewReviewSessionPanel stub</div>,
}));

vi.mock("./components/Phase7CapabilitySummaryPanel", () => ({
  default: () => <div>Phase7CapabilitySummaryPanel stub</div>,
}));

vi.mock("./components/PromptControlPanel", () => ({
  default: () => <div>PromptControlPanel stub</div>,
}));

vi.mock("./components/RunsPanel", () => ({
  default: () => <div>RunsPanel stub</div>,
}));

vi.mock("./components/SystemStatusPanel", () => ({
  default: () => <div>SystemStatusPanel stub</div>,
}));

vi.mock("./components/TaskTimeline", () => ({
  default: () => <div>TaskTimeline stub</div>,
}));

vi.mock("./components/WorkspacesPanel", () => ({
  default: () => <div>WorkspacesPanel stub</div>,
}));

const PARTIAL_SURFACE_HYDRATION_CASES = [
  {
    workspaceId: "operations",
    surfaceSessionKey: ACTIVE_OPERATIONS_SURFACE_SESSION_KEY,
    invalidSurfaceValue: "invalid-operations",
    expectedSurfaceValue: "dispatch",
    expectedTabLabel: "Dispatch",
    expectedTabDetail: "Catalog, typed dispatch, and latest response envelope.",
  },
  {
    workspaceId: "runtime",
    surfaceSessionKey: ACTIVE_RUNTIME_SURFACE_SESSION_KEY,
    invalidSurfaceValue: "invalid-runtime",
    expectedSurfaceValue: "overview",
    expectedTabLabel: "Overview",
    expectedTabDetail: "Bridge health, runtime status, and system summaries.",
  },
  {
    workspaceId: "records",
    surfaceSessionKey: ACTIVE_RECORDS_SURFACE_SESSION_KEY,
    invalidSurfaceValue: "invalid-records",
    expectedSurfaceValue: "runs",
    expectedTabLabel: "Runs",
    expectedTabDetail: "Dispatch lineage and run-level audit slices.",
  },
] as const;

const EXPLICIT_DEFAULT_SURFACE_RESTORE_CASES = [
  {
    workspaceId: "operations",
    surfaceSessionKey: ACTIVE_OPERATIONS_SURFACE_SESSION_KEY,
    surfaceValue: "dispatch",
    expectedVisibleText: "Command Center",
    expectedTabLabel: "Dispatch",
    expectedTabDetail: "Catalog, typed dispatch, and latest response envelope.",
  },
  {
    workspaceId: "runtime",
    surfaceSessionKey: ACTIVE_RUNTIME_SURFACE_SESSION_KEY,
    surfaceValue: "overview",
    expectedVisibleText: "SystemStatusPanel stub",
    expectedTabLabel: "Overview",
    expectedTabDetail: "Bridge health, runtime status, and system summaries.",
  },
  {
    workspaceId: "records",
    surfaceSessionKey: ACTIVE_RECORDS_SURFACE_SESSION_KEY,
    surfaceValue: "runs",
    expectedVisibleText: "RunsPanel stub",
    expectedTabLabel: "Runs",
    expectedTabDetail: "Dispatch lineage and run-level audit slices.",
  },
] as const;

describe("App desktop hydration", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();

    setPendingAppApiMocks(apiMocks);
  });

  it("restores the command center agents surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Catalog browsing, dispatch, approvals, and live timeline control.",
    ));
    fireEvent.click(getDesktopTabButton(
      "Agents",
      "Available operator families and owned tool lanes.",
    ));

    expect(screen.getByText("Agent Control")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("operations");
    expect(
      window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY),
    ).toBe("agents");

    unmount();
    render(<App />);

    expect(await screen.findByText("Agent Control")).toBeInTheDocument();
  });

  it("restores the command center approvals surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Catalog browsing, dispatch, approvals, and live timeline control.",
    ));

    const approvalsSurfaceButton = getDesktopTabButton(
      "Approvals",
      "Pending decisions on the control-plane queue.",
    );

    fireEvent.click(approvalsSurfaceButton);

    expect(screen.getByText("ApprovalQueue stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("operations");
    expect(
      window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY),
    ).toBe("approvals");
    expectDesktopTabActive(approvalsSurfaceButton);

    unmount();
    render(<App />);

    const restoredApprovalsSurfaceButton = getDesktopTabButton(
      "Approvals",
      "Pending decisions on the control-plane queue.",
    );

    expect(await screen.findByText("ApprovalQueue stub")).toBeInTheDocument();
    expectDesktopTabActive(restoredApprovalsSurfaceButton);
  });

  it("restores the command center timeline surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Catalog browsing, dispatch, approvals, and live timeline control.",
    ));

    const timelineSurfaceButton = getDesktopTabButton(
      "Timeline",
      "Cross-record event and task history.",
    );

    fireEvent.click(timelineSurfaceButton);

    expect(screen.getByText("TaskTimeline stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("operations");
    expect(
      window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY),
    ).toBe("timeline");
    expectDesktopTabActive(timelineSurfaceButton);

    unmount();
    render(<App />);

    const restoredTimelineSurfaceButton = getDesktopTabButton(
      "Timeline",
      "Cross-record event and task history.",
    );

    expect(await screen.findByText("TaskTimeline stub")).toBeInTheDocument();
    expectDesktopTabActive(restoredTimelineSurfaceButton);
  });

  it("restores the runtime executors surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Bridge status, executors, workspaces, and governance health.",
    ));
    fireEvent.click(getDesktopTabButton(
      "Executors",
      "Execution owners, availability, and related records.",
    ));

    expect(screen.getByText("Runtime Console")).toBeInTheDocument();
    expect(screen.getByText("ExecutorsPanel stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("runtime");
    expect(
      window.sessionStorage.getItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY),
    ).toBe("executors");

    unmount();
    render(<App />);

    expect(await screen.findByText("ExecutorsPanel stub")).toBeInTheDocument();
  });

  it("restores the runtime governance surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Bridge status, executors, workspaces, and governance health.",
    ));

    fireEvent.click(getDesktopTabButton(
      "Governance",
      "Policies, locks, and admitted capability posture.",
    ));

    expect(await screen.findByText("Governance Deck")).toBeInTheDocument();
    expect(screen.getByText("Phase7CapabilitySummaryPanel stub")).toBeInTheDocument();
    expect(screen.getByText("LocksPanel stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("runtime");
    expect(
      window.sessionStorage.getItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY),
    ).toBe("governance");
    expectDesktopTabActive(getDesktopTabButton(
      "Governance",
      "Policies, locks, and admitted capability posture.",
    ));

    unmount();
    render(<App />);

    expect(await screen.findByText("Governance Deck")).toBeInTheDocument();

    const restoredGovernanceSurfaceButton = getDesktopTabButton(
      "Governance",
      "Policies, locks, and admitted capability posture.",
    );

    expect(screen.getByText("Phase7CapabilitySummaryPanel stub")).toBeInTheDocument();
    expect(screen.getByText("LocksPanel stub")).toBeInTheDocument();
    expectDesktopTabActive(restoredGovernanceSurfaceButton);
  });

  it("restores the runtime workspaces surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Bridge status, executors, workspaces, and governance health.",
    ));

    const workspacesSurfaceButton = getDesktopTabButton(
      "Workspaces",
      "Project surfaces, ownership, and attached activity.",
    );

    fireEvent.click(workspacesSurfaceButton);

    expect(screen.getByText("Runtime Console")).toBeInTheDocument();
    expect(screen.getByText("WorkspacesPanel stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("runtime");
    expect(
      window.sessionStorage.getItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY),
    ).toBe("workspaces");
    expectDesktopTabActive(workspacesSurfaceButton);

    unmount();
    render(<App />);

    const restoredWorkspacesSurfaceButton = getDesktopTabButton(
      "Workspaces",
      "Project surfaces, ownership, and attached activity.",
    );

    expect(await screen.findByText("WorkspacesPanel stub")).toBeInTheDocument();
    expectDesktopTabActive(restoredWorkspacesSurfaceButton);
  });

  it("restores the prompt workspace from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Natural-language planning and admitted typed execution paths.",
    ));

    expect(screen.getByText("PromptControlPanel stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("prompt");

    unmount();
    render(<App />);

    expect(await screen.findByText("PromptControlPanel stub")).toBeInTheDocument();
  });

  it("restores the records executions surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Runs, executions, artifacts, and detail drilldowns in one organized lane.",
    ));

    const executionsSurfaceButton = getDesktopTabButton(
      "Executions",
      "Execution warnings, truth markers, and child evidence.",
    );

    fireEvent.click(executionsSurfaceButton);

    expect(screen.getByText("Records Explorer")).toBeInTheDocument();
    expect(screen.getByText("ExecutionsPanel stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("records");
    expect(
      window.sessionStorage.getItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY),
    ).toBe("executions");
    expectDesktopTabActive(executionsSurfaceButton);

    unmount();
    render(<App />);

    const restoredExecutionsSurfaceButton = getDesktopTabButton(
      "Executions",
      "Execution warnings, truth markers, and child evidence.",
    );

    expectDesktopTabActive(restoredExecutionsSurfaceButton);
  });

  it("restores the records artifacts surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Runs, executions, artifacts, and detail drilldowns in one organized lane.",
    ));

    const artifactsSurfaceButton = getDesktopTabButton(
      "Artifacts",
      "Output inspection and mutation-risk evidence.",
    );

    fireEvent.click(artifactsSurfaceButton);

    expect(screen.getByText("Records Explorer")).toBeInTheDocument();
    expect(screen.getByText("ArtifactsPanel stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("records");
    expect(
      window.sessionStorage.getItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY),
    ).toBe("artifacts");
    expectDesktopTabActive(artifactsSurfaceButton);

    unmount();
    render(<App />);

    const restoredArtifactsSurfaceButton = getDesktopTabButton(
      "Artifacts",
      "Output inspection and mutation-risk evidence.",
    );

    expect(await screen.findByText("ArtifactsPanel stub")).toBeInTheDocument();
    expectDesktopTabActive(restoredArtifactsSurfaceButton);
  });

  it.each(PARTIAL_SURFACE_HYDRATION_CASES)(
    "restores the $workspaceId workspace and falls back to the default surface when the stored surface is invalid",
    ({
      workspaceId,
      surfaceSessionKey,
      invalidSurfaceValue,
      expectedSurfaceValue,
      expectedTabLabel,
      expectedTabDetail,
    }) => {
      window.sessionStorage.setItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY, workspaceId);
      window.sessionStorage.setItem(surfaceSessionKey, invalidSurfaceValue);

      render(<App />);

      const defaultSurfaceButton = getDesktopTabButton(expectedTabLabel, expectedTabDetail);

      expect(window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY)).toBe(workspaceId);
      expect(window.sessionStorage.getItem(surfaceSessionKey)).toBe(expectedSurfaceValue);
      expectDesktopTabActive(defaultSurfaceButton);
    },
  );

  it.each(EXPLICIT_DEFAULT_SURFACE_RESTORE_CASES)(
    "restores the $workspaceId workspace when the stored surface is the explicit default",
    ({
      workspaceId,
      surfaceSessionKey,
      surfaceValue,
      expectedVisibleText,
      expectedTabLabel,
      expectedTabDetail,
    }) => {
      window.sessionStorage.setItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY, workspaceId);
      window.sessionStorage.setItem(surfaceSessionKey, surfaceValue);

      render(<App />);

      const defaultSurfaceButton = getDesktopTabButton(expectedTabLabel, expectedTabDetail);

      expect(screen.getAllByText(expectedVisibleText).length).toBeGreaterThan(0);
      expect(window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY)).toBe(workspaceId);
      expect(window.sessionStorage.getItem(surfaceSessionKey)).toBe(surfaceValue);
      expectDesktopTabActive(defaultSurfaceButton);
    },
  );

  it("preserves valid workspace restoration when unrelated surface session values are invalid", () => {
    window.sessionStorage.setItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY, "prompt");
    window.sessionStorage.setItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY, "invalid-operations");
    window.sessionStorage.setItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY, "invalid-runtime");
    window.sessionStorage.setItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY, "invalid-records");

    render(<App />);

    expect(screen.getByText("PromptControlPanel stub")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY)).toBe("prompt");
    expect(window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY)).toBe("dispatch");
    expect(window.sessionStorage.getItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY)).toBe("overview");
    expect(window.sessionStorage.getItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY)).toBe("runs");
  });

  it("falls back to default workspace surfaces when persisted session values are invalid", () => {
    window.sessionStorage.setItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY, "invalid-workspace");
    window.sessionStorage.setItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY, "invalid-operations");
    window.sessionStorage.setItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY, "invalid-runtime");
    window.sessionStorage.setItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY, "invalid-records");

    render(<App />);

    expect(screen.getByText("Mission Control")).toBeInTheDocument();
    expect(screen.getByText("Launchpad")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY)).toBe("home");
    expect(window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY)).toBe("dispatch");
    expect(window.sessionStorage.getItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY)).toBe("overview");
    expect(window.sessionStorage.getItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY)).toBe("runs");
  });
});
