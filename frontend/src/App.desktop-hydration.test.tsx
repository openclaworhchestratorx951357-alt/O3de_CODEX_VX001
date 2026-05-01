import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import {
  expectDesktopTabActive,
  getDesktopTabButton,
  getLaunchpadButton,
  setPendingAppApiMocks,
} from "./test/appDesktopTestUtils";

const ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY = "o3de-control-app-active-desktop-workspace";
const ACTIVE_OPERATIONS_SURFACE_SESSION_KEY = "o3de-control-app-active-operations-surface";
const ACTIVE_RUNTIME_SURFACE_SESSION_KEY = "o3de-control-app-active-runtime-surface";
const ACTIVE_RECORDS_SURFACE_SESSION_KEY = "o3de-control-app-active-records-surface";
const LAZY_SURFACE_TIMEOUT_MS = 5000;

const apiMocks = vi.hoisted(() => ({
  claimCodexControlTask: vi.fn(),
  approveApproval: vi.fn(),
  cleanupO3deBridgeResults: vi.fn(),
  previewAppControlScript: vi.fn(),
  completeCodexControlTask: vi.fn(),
  createCodexControlNotification: vi.fn(),
  createAutonomyHealingAction: vi.fn(),
  createAutonomyJob: vi.fn(),
  createAutonomyObservation: vi.fn(),
  createAutonomyObjective: vi.fn(),
  createCodexControlLane: vi.fn(),
  createCodexControlTask: vi.fn(),
  launchCodexControlTerminal: vi.fn(),
  fetchAdapters: vi.fn(),
  fetchAutonomyHealingActions: vi.fn(),
  fetchAutonomyJobs: vi.fn(),
  fetchAutonomyMemories: vi.fn(),
  fetchAutonomyObjectives: vi.fn(),
  fetchAutonomyObservations: vi.fn(),
  fetchAutonomySummary: vi.fn(),
  fetchApprovalCards: vi.fn(),
  fetchArtifact: vi.fn(),
  fetchArtifactCards: vi.fn(),
  fetchArtifactCardsForTruthFilter: vi.fn(),
  fetchCodexControlNextTask: vi.fn(),
  fetchCodexControlNotifications: vi.fn(),
  fetchCodexControlStatus: vi.fn(),
  fetchControlPlaneSummary: vi.fn(),
  fetchExecutor: vi.fn(),
  fetchExecutors: vi.fn(),
  fetchExecution: vi.fn(),
  fetchExecutionCards: vi.fn(),
  fetchExecutionCardsForTruthFilter: vi.fn(),
  fetchEvents: vi.fn(),
  fetchEventCards: vi.fn(),
  fetchEventDetail: vi.fn(),
  fetchEventSummary: vi.fn(),
  fetchLockCards: vi.fn(),
  fetchO3deBridge: vi.fn(),
  fetchO3deTarget: vi.fn(),
  fetchPolicies: vi.fn(),
  fetchReadiness: vi.fn(),
  fetchCockpitAppRegistry: vi.fn(),
  fetchAssetForgeTask: vi.fn(),
  fetchAssetForgeProviderStatus: vi.fn(),
  fetchAssetForgeBlenderStatus: vi.fn(),
  fetchAssetForgeEditorModel: vi.fn(),
  createAssetForgeO3DEStagePlan: vi.fn(),
  createAssetForgeO3DEPlacementPlan: vi.fn(),
  executeAssetForgeO3DEPlacementProof: vi.fn(),
  readAssetForgeO3DEPlacementEvidence: vi.fn(),
  prepareAssetForgeO3DEPlacementRuntimeHarness: vi.fn(),
  executeAssetForgeO3DEPlacementRuntimeHarness: vi.fn(),
  executeAssetForgeO3DEPlacementLiveProof: vi.fn(),
  getAssetForgeO3DEPlacementLiveProofEvidenceIndex: vi.fn(),
  readAssetForgeO3DEIngestEvidence: vi.fn(),
  executeAssetForgeO3DEStageWrite: vi.fn(),
  inspectAssetForgeBlenderArtifact: vi.fn(),
  fetchRun: vi.fn(),
  fetchRunCards: vi.fn(),
  fetchRunsSummaryForFilter: vi.fn(),
  fetchToolsCatalog: vi.fn(),
  fetchWorkspace: vi.fn(),
  fetchWorkspaces: vi.fn(),
  heartbeatCodexControlWorker: vi.fn(),
  markCodexControlNotificationsRead: vi.fn(),
  rejectApproval: vi.fn(),
  releaseCodexControlTask: vi.fn(),
  stopCodexControlTerminal: vi.fn(),
  supersedeCodexControlTask: vi.fn(),
  syncCodexControlWorker: vi.fn(),
  updateAutonomyHealingAction: vi.fn(),
  updateAutonomyJob: vi.fn(),
  updateAutonomyObservation: vi.fn(),
  waitForCodexControlTask: vi.fn(),
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
    expectedVisibleText: "Catalog, typed dispatch, and latest response envelope.",
    expectedTabLabel: "Dispatch",
    expectedTabDetail: "Catalog, typed dispatch, and latest response envelope.",
  },
  {
    workspaceId: "runtime",
    surfaceSessionKey: ACTIVE_RUNTIME_SURFACE_SESSION_KEY,
    invalidSurfaceValue: "invalid-runtime",
    expectedSurfaceValue: "overview",
    expectedVisibleText: "SystemStatusPanel stub",
    expectedTabLabel: "Overview",
    expectedTabDetail: "Bridge health, runtime status, and system summaries.",
  },
  {
    workspaceId: "records",
    surfaceSessionKey: ACTIVE_RECORDS_SURFACE_SESSION_KEY,
    invalidSurfaceValue: "invalid-records",
    expectedSurfaceValue: "runs",
    expectedVisibleText: "RunsPanel stub",
    expectedTabLabel: "Runs",
    expectedTabDetail: "Dispatch lineage and run-level audit slices.",
  },
] as const;

const EXPLICIT_DEFAULT_SURFACE_RESTORE_CASES = [
  {
    workspaceId: "operations",
    surfaceSessionKey: ACTIVE_OPERATIONS_SURFACE_SESSION_KEY,
    surfaceValue: "dispatch",
    expectedVisibleText: "Catalog, typed dispatch, and latest response envelope.",
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
    window.localStorage.clear();
    window.sessionStorage.setItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY, "home");
    vi.clearAllMocks();

    setPendingAppApiMocks(apiMocks);
  });

  it("restores the command center agents surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Catalog browsing, dispatch, approvals, and live timeline control.",
    ));
    expect(await screen.findByText(
      "Catalog, typed dispatch, and latest response envelope.",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();

    fireEvent.click(getDesktopTabButton(
      "Agents",
      "Available operator families and owned tool lanes.",
    ));

    expect(await screen.findByText(
      "Agent Control",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("operations");
    expect(
      window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY),
    ).toBe("agents");

    unmount();
    render(<App />);

    expect(await screen.findByText(
      "Agent Control",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();
  });

  it("restores the command center approvals surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Catalog browsing, dispatch, approvals, and live timeline control.",
    ));
    expect(await screen.findByText(
      "Catalog, typed dispatch, and latest response envelope.",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();

    const approvalsSurfaceButton = getDesktopTabButton(
      "Approvals",
      "Pending decisions on the control-plane queue.",
    );

    fireEvent.click(approvalsSurfaceButton);

    expect(await screen.findByText("ApprovalQueue stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("operations");
    expect(
      window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY),
    ).toBe("approvals");
    expectDesktopTabActive(approvalsSurfaceButton);

    unmount();
    render(<App />);

    expect(await screen.findByText("ApprovalQueue stub")).toBeInTheDocument();
    const restoredApprovalsSurfaceButton = getDesktopTabButton(
      "Approvals",
      "Pending decisions on the control-plane queue.",
    );
    expectDesktopTabActive(restoredApprovalsSurfaceButton);
  });

  it("restores the command center timeline surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Catalog browsing, dispatch, approvals, and live timeline control.",
    ));
    expect(await screen.findByText(
      "Catalog, typed dispatch, and latest response envelope.",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();

    const timelineSurfaceButton = getDesktopTabButton(
      "Timeline",
      "Cross-record event and task history.",
    );

    fireEvent.click(timelineSurfaceButton);

    expect(await screen.findByText("TaskTimeline stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("operations");
    expect(
      window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY),
    ).toBe("timeline");
    expectDesktopTabActive(timelineSurfaceButton);

    unmount();
    render(<App />);

    expect(await screen.findByText("TaskTimeline stub")).toBeInTheDocument();
    const restoredTimelineSurfaceButton = getDesktopTabButton(
      "Timeline",
      "Cross-record event and task history.",
    );
    expectDesktopTabActive(restoredTimelineSurfaceButton);
  });

  it("restores the runtime executors surface from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Bridge status, executors, workspaces, and governance health.",
    ));
    expect(await screen.findByText(
      "SystemStatusPanel stub",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();

    fireEvent.click(getDesktopTabButton(
      "Executors",
      "Execution owners, availability, and related records.",
    ));

    expect(screen.getByText("Runtime Console")).toBeInTheDocument();
    expect(await screen.findByText("ExecutorsPanel stub")).toBeInTheDocument();
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
    expect(await screen.findByText(
      "SystemStatusPanel stub",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();

    fireEvent.click(getDesktopTabButton(
      "Governance",
      "Policies, locks, and admitted capability posture.",
    ));

    expect(await screen.findByText("Governance Deck")).toBeInTheDocument();
    expect(await screen.findByText("Phase7CapabilitySummaryPanel stub")).toBeInTheDocument();
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
    expect(await screen.findByText(
      "SystemStatusPanel stub",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();

    const workspacesSurfaceButton = getDesktopTabButton(
      "Workspaces",
      "Project surfaces, ownership, and attached activity.",
    );

    fireEvent.click(workspacesSurfaceButton);

    expect(screen.getByText("Runtime Console")).toBeInTheDocument();
    expect(await screen.findByText("WorkspacesPanel stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("runtime");
    expect(
      window.sessionStorage.getItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY),
    ).toBe("workspaces");
    expectDesktopTabActive(workspacesSurfaceButton);

    unmount();
    render(<App />);

    expect(await screen.findByText("WorkspacesPanel stub")).toBeInTheDocument();
    const restoredWorkspacesSurfaceButton = getDesktopTabButton(
      "Workspaces",
      "Project surfaces, ownership, and attached activity.",
    );
    expectDesktopTabActive(restoredWorkspacesSurfaceButton);
  });

  it("restores the prompt workspace from session storage after remount", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Natural-language planning and admitted typed execution paths.",
    ));

    expect(await screen.findByText("PromptControlPanel stub")).toBeInTheDocument();
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
    expect(await screen.findByText(
      "RunsPanel stub",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();

    const executionsSurfaceButton = getDesktopTabButton(
      "Executions",
      "Execution warnings, truth markers, and child evidence.",
    );

    fireEvent.click(executionsSurfaceButton);

    expect(screen.getAllByText("Records Explorer").length).toBeGreaterThan(0);
    expect(await screen.findByText("ExecutionsPanel stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("records");
    expect(
      window.sessionStorage.getItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY),
    ).toBe("executions");
    expectDesktopTabActive(executionsSurfaceButton);

    unmount();
    render(<App />);

    expect(await screen.findByText("ExecutionsPanel stub")).toBeInTheDocument();
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
    expect(await screen.findByText(
      "RunsPanel stub",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();

    const artifactsSurfaceButton = getDesktopTabButton(
      "Artifacts",
      "Output inspection and mutation-risk evidence.",
    );

    fireEvent.click(artifactsSurfaceButton);

    expect(screen.getAllByText("Records Explorer").length).toBeGreaterThan(0);
    expect(await screen.findByText("ArtifactsPanel stub")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY),
    ).toBe("records");
    expect(
      window.sessionStorage.getItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY),
    ).toBe("artifacts");
    expectDesktopTabActive(artifactsSurfaceButton);

    unmount();
    render(<App />);

    expect(await screen.findByText("ArtifactsPanel stub")).toBeInTheDocument();
    const restoredArtifactsSurfaceButton = getDesktopTabButton(
      "Artifacts",
      "Output inspection and mutation-risk evidence.",
    );
    expectDesktopTabActive(restoredArtifactsSurfaceButton);
  });

  it.each(PARTIAL_SURFACE_HYDRATION_CASES)(
    "restores the $workspaceId workspace and falls back to the default surface when the stored surface is invalid",
    async ({
      workspaceId,
      surfaceSessionKey,
      invalidSurfaceValue,
      expectedSurfaceValue,
      expectedVisibleText,
      expectedTabLabel,
      expectedTabDetail,
    }) => {
      window.sessionStorage.setItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY, workspaceId);
      window.sessionStorage.setItem(surfaceSessionKey, invalidSurfaceValue);

      render(<App />);

      expect(await screen.findByText(expectedVisibleText)).toBeInTheDocument();
      const defaultSurfaceButton = getDesktopTabButton(expectedTabLabel, expectedTabDetail);

      expect(window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY)).toBe(workspaceId);
      expect(window.sessionStorage.getItem(surfaceSessionKey)).toBe(expectedSurfaceValue);
      expectDesktopTabActive(defaultSurfaceButton);
    },
  );

  it.each(EXPLICIT_DEFAULT_SURFACE_RESTORE_CASES)(
    "restores the $workspaceId workspace when the stored surface is the explicit default",
    async ({
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

      expect(await screen.findByText(expectedVisibleText)).toBeInTheDocument();
      const defaultSurfaceButton = getDesktopTabButton(expectedTabLabel, expectedTabDetail);

      expect(window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY)).toBe(workspaceId);
      expect(window.sessionStorage.getItem(surfaceSessionKey)).toBe(surfaceValue);
      expectDesktopTabActive(defaultSurfaceButton);
    },
  );

  it("preserves valid workspace restoration when unrelated surface session values are invalid", async () => {
    window.sessionStorage.setItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY, "prompt");
    window.sessionStorage.setItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY, "invalid-operations");
    window.sessionStorage.setItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY, "invalid-runtime");
    window.sessionStorage.setItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY, "invalid-records");

    render(<App />);

    expect(await screen.findByText("PromptControlPanel stub")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY)).toBe("prompt");
    expect(window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY)).toBe("dispatch");
    expect(window.sessionStorage.getItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY)).toBe("overview");
    expect(window.sessionStorage.getItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY)).toBe("runs");
  });

  it("falls back to the Asset Forge home shell when persisted session values are invalid", async () => {
    window.sessionStorage.setItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY, "invalid-workspace");
    window.sessionStorage.setItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY, "invalid-operations");
    window.sessionStorage.setItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY, "invalid-runtime");
    window.sessionStorage.setItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY, "invalid-records");

    render(<App />);

    expect(await screen.findByLabelText(
      "AI Asset Forge",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();
    expect(screen.getByLabelText("AssetForgeWorkspacePage")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY)).toBe("asset-forge");
    expect(window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY)).toBe("dispatch");
    expect(window.sessionStorage.getItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY)).toBe("overview");
    expect(window.sessionStorage.getItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY)).toBe("runs");
  });
});
