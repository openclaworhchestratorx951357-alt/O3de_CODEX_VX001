import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

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

vi.mock("./components/LayoutHeader", () => ({
  default: () => <div>LayoutHeader stub</div>,
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

vi.mock("./components/PromptControlPanel", () => ({
  default: () => <div>PromptControlPanel stub</div>,
}));

vi.mock("./components/SystemStatusPanel", () => ({
  default: () => <div>SystemStatusPanel stub</div>,
}));

function createPendingPromise<T>() {
  return new Promise<T>(() => {});
}

describe("App desktop shell", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();

    apiMocks.approveApproval.mockImplementation(() => createPendingPromise());
    apiMocks.cleanupO3deBridgeResults.mockImplementation(() => createPendingPromise());
    apiMocks.fetchAdapters.mockImplementation(() => createPendingPromise());
    apiMocks.fetchApprovalCards.mockImplementation(() => createPendingPromise());
    apiMocks.fetchArtifact.mockImplementation(() => createPendingPromise());
    apiMocks.fetchArtifactCards.mockImplementation(() => createPendingPromise());
    apiMocks.fetchArtifactCardsForTruthFilter.mockImplementation(() => createPendingPromise());
    apiMocks.fetchControlPlaneSummary.mockImplementation(() => createPendingPromise());
    apiMocks.fetchExecutor.mockImplementation(() => createPendingPromise());
    apiMocks.fetchExecutors.mockImplementation(() => createPendingPromise());
    apiMocks.fetchExecution.mockImplementation(() => createPendingPromise());
    apiMocks.fetchExecutionCards.mockImplementation(() => createPendingPromise());
    apiMocks.fetchExecutionCardsForTruthFilter.mockImplementation(() => createPendingPromise());
    apiMocks.fetchEventCards.mockImplementation(() => createPendingPromise());
    apiMocks.fetchLockCards.mockImplementation(() => createPendingPromise());
    apiMocks.fetchO3deBridge.mockImplementation(() => createPendingPromise());
    apiMocks.fetchPolicies.mockImplementation(() => createPendingPromise());
    apiMocks.fetchReadiness.mockImplementation(() => createPendingPromise());
    apiMocks.fetchRun.mockImplementation(() => createPendingPromise());
    apiMocks.fetchRunCards.mockImplementation(() => createPendingPromise());
    apiMocks.fetchRunsSummaryForFilter.mockImplementation(() => createPendingPromise());
    apiMocks.fetchToolsCatalog.mockImplementation(() => createPendingPromise());
    apiMocks.fetchWorkspace.mockImplementation(() => createPendingPromise());
    apiMocks.fetchWorkspaces.mockImplementation(() => createPendingPromise());
    apiMocks.rejectApproval.mockImplementation(() => createPendingPromise());
  });

  it("renders the home workspace and switches to prompt through the shell nav without blanking", () => {
    render(<App />);

    expect(screen.getByText("Control surface")).toBeInTheDocument();
    expect(screen.getByText("Mission Control")).toBeInTheDocument();
    expect(screen.getByText("Launchpad")).toBeInTheDocument();
    expect(screen.getByText("LayoutHeader stub")).toBeInTheDocument();

    const navRail = screen.getByText("Control surface").closest("aside");
    expect(navRail).not.toBeNull();

    fireEvent.click(
      within(navRail as HTMLElement).getByRole("button", { name: /Prompt Studio/i }),
    );

    expect(screen.getByText("PromptControlPanel stub")).toBeInTheDocument();

    fireEvent.click(
      within(navRail as HTMLElement).getByRole("button", { name: /Home/i }),
    );

    expect(screen.getByText("Mission Control")).toBeInTheDocument();
    expect(screen.getByText("Launchpad")).toBeInTheDocument();
  });

  it("opens the runtime workspace from the home launchpad without leaving a blank shell", () => {
    render(<App />);

    const runtimeShortcut = screen.getByText(
      "Bridge status, executors, workspaces, and governance health.",
    ).closest("button");

    expect(runtimeShortcut).not.toBeNull();
    fireEvent.click(runtimeShortcut as HTMLButtonElement);

    expect(screen.getByText("Runtime Console")).toBeInTheDocument();
    expect(screen.getByText("AdaptersPanel stub")).toBeInTheDocument();
    expect(screen.getByText("SystemStatusPanel stub")).toBeInTheDocument();
    expect(screen.getByText("OperatorOverviewPanel stub")).toBeInTheDocument();
  });
});
