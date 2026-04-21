import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

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

vi.mock("./components/RunsPanel", () => ({
  default: () => <div>RunsPanel stub</div>,
}));

vi.mock("./components/SystemStatusPanel", () => ({
  default: () => <div>SystemStatusPanel stub</div>,
}));

vi.mock("./components/WorkspacesPanel", () => ({
  default: () => <div>WorkspacesPanel stub</div>,
}));

function createPendingPromise<T>() {
  return new Promise<T>(() => {});
}

function getDesktopNavButton(name: RegExp): HTMLButtonElement {
  const navRail = screen.getByText("Control surface").closest("aside");

  expect(navRail).not.toBeNull();

  return within(navRail as HTMLElement).getByRole("button", { name }) as HTMLButtonElement;
}

function getLaunchpadButton(detail: string): HTMLButtonElement {
  const button = screen.getByText(detail).closest("button");

  expect(button).not.toBeNull();

  return button as HTMLButtonElement;
}

function getDesktopTabButton(label: string, detail: string): HTMLButtonElement {
  const button = screen.getAllByRole("button").find((candidate) => (
    candidate.textContent?.includes(label)
    && candidate.textContent?.includes(detail)
  ));

  expect(button).not.toBeUndefined();

  return button as HTMLButtonElement;
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
    apiMocks.fetchO3deTarget.mockImplementation(() => createPendingPromise());
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

    fireEvent.click(getDesktopNavButton(/Prompt Studio/i));

    expect(screen.getByText("PromptControlPanel stub")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Home/i));

    expect(screen.getByText("Mission Control")).toBeInTheDocument();
    expect(screen.getByText("Launchpad")).toBeInTheDocument();
  });

  it("opens the runtime workspace from the home launchpad without leaving a blank shell", () => {
    render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Bridge status, executors, workspaces, and governance health.",
    ));

    expect(screen.getByText("Runtime Console")).toBeInTheDocument();
    expect(screen.getByText("AdaptersPanel stub")).toBeInTheDocument();
    expect(screen.getByText("SystemStatusPanel stub")).toBeInTheDocument();
    expect(screen.getByText("OperatorOverviewPanel stub")).toBeInTheDocument();
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
    expect(executionsSurfaceButton).toHaveStyle({
      boxShadow: "0 14px 28px rgba(41, 83, 165, 0.14)",
    });

    unmount();
    render(<App />);

    const restoredExecutionsSurfaceButton = getDesktopTabButton(
      "Executions",
      "Execution warnings, truth markers, and child evidence.",
    );

    expect(restoredExecutionsSurfaceButton).toHaveStyle({
      boxShadow: "0 14px 28px rgba(41, 83, 165, 0.14)",
    });
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
