import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { SettingsProvider } from "./lib/settings/context";
import { createSettingsProfile, DEFAULT_ACCENT_COLOR } from "./lib/settings/defaults";
import {
  getDesktopNavButton,
  getLaunchpadButton,
  setPendingAppApiMocks,
} from "./test/appDesktopTestUtils";
import { SETTINGS_PROFILE_STORAGE_KEY } from "./types/settings";

const apiMocks = vi.hoisted(() => ({
  approveApproval: vi.fn(),
  cleanupO3deBridgeResults: vi.fn(),
  previewAppControlScript: vi.fn(),
  createCodexControlNotification: vi.fn(),
  createAutonomyHealingAction: vi.fn(),
  createAutonomyJob: vi.fn(),
  createAutonomyObservation: vi.fn(),
  createAutonomyObjective: vi.fn(),
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
  fetchRun: vi.fn(),
  fetchRunCards: vi.fn(),
  fetchRunsSummaryForFilter: vi.fn(),
  fetchToolsCatalog: vi.fn(),
  fetchWorkspace: vi.fn(),
  fetchWorkspaces: vi.fn(),
  heartbeatCodexControlWorker: vi.fn(),
  markCodexControlNotificationsRead: vi.fn(),
  rejectApproval: vi.fn(),
  claimCodexControlTask: vi.fn(),
  completeCodexControlTask: vi.fn(),
  createCodexControlLane: vi.fn(),
  createCodexControlTask: vi.fn(),
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

vi.mock("./components/workspaces/PromptWorkspaceDesktop", () => ({
  default: () => <div>PromptWorkspaceDesktop stub</div>,
}));

vi.mock("./components/SystemStatusPanel", () => ({
  default: () => <div>SystemStatusPanel stub</div>,
}));

describe("App desktop smoke", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.clearAllMocks();

    setPendingAppApiMocks(apiMocks);
  });

  it("renders the home workspace and switches to prompt through the shell nav without blanking", async () => {
    render(<App />);

    expect(screen.getByText("Control surface")).toBeInTheDocument();
    expect(screen.getAllByText("Mission Control").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Launchpad").length).toBeGreaterThan(0);
    expect(screen.getByText("Recommended next steps")).toBeInTheDocument();
    expect(screen.getAllByText(/Review why this recommendation appears/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Suggested because:/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Runtime > Overview window")).toBeInTheDocument();
    expect(screen.getByText("Prompt Studio workspace")).toBeInTheDocument();
    expect(screen.getByText("LayoutHeader stub")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Prompt Studio/i));

    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    expect(screen.getByText("What should I do next?")).toBeInTheDocument();
    expect(screen.getAllByText("Builder workspace").length).toBeGreaterThan(0);
    expect(screen.getByText("Operations > Dispatch window")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Home/i));

    expect(screen.getAllByText("Mission Control").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Launchpad").length).toBeGreaterThan(0);
  });

  it("opens prompt workspace from the home recommendation strip", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Open Prompt Studio" }));

    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
  });

  it("replays a recent guided jump", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Prompt Studio/i));

    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open dispatch" }));

    expect(
      await screen.findByText(
        "Catalog, typed dispatch, and latest response envelope.",
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Use typed dispatch when needed")).toBeInTheDocument();
    expect(screen.getByText("Action: Open dispatch")).toBeInTheDocument();
    expect(screen.getByText("Opens: Operations > Dispatch window")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Jump again" }));

    expect(screen.getByText("Catalog, typed dispatch, and latest response envelope.")).toBeInTheDocument();
  });

  it("hides guided next steps for the current browser session and restores them", async () => {
    const { unmount } = render(<App />);

    fireEvent.click(getDesktopNavButton(/Prompt Studio/i));

    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide for now" }));

    expect(screen.getByText("Guided next steps hidden for now")).toBeInTheDocument();
    expect(screen.queryByText("What should I do next?")).not.toBeInTheDocument();

    unmount();
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Prompt Studio/i));

    expect(await screen.findByText("Guided next steps hidden for now")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show guided next steps" }));

    expect(screen.getByText("What should I do next?")).toBeInTheDocument();
  });

  it("opens the runtime workspace from the home launchpad without leaving a blank shell", async () => {
    render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Bridge status, executors, workspaces, and governance health.",
    ));

    expect(await screen.findByText("SystemStatusPanel stub")).toBeInTheDocument();
    expect(screen.getByText("Runtime Console")).toBeInTheDocument();
    expect(screen.getByText("AdaptersPanel stub")).toBeInTheDocument();
    expect(screen.getByText("OperatorOverviewPanel stub")).toBeInTheDocument();
  });

  it("opens the Home O3DE creation desks from shell nav and reaches real app workspaces from their actions", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Create Game/i));

    expect(await screen.findByText("O3DE game creation desk")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Create with natural language/i }));

    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Home/i));
    fireEvent.click(getDesktopNavButton(/Create Movie/i));
    expect(await screen.findByText("O3DE cinematic creation desk")).toBeInTheDocument();
    fireEvent.click(getDesktopNavButton(/Create Game/i));
    fireEvent.click(screen.getByRole("button", { name: /Check bridge\/runtime/i }));

    expect(await screen.findByText("SystemStatusPanel stub")).toBeInTheDocument();
    expect(screen.getByText("Runtime Console")).toBeInTheDocument();
  });

  it("shows a truthful empty catalog state instead of fallback agent data when live catalog data is unavailable", async () => {
    apiMocks.fetchToolsCatalog.mockResolvedValueOnce({ agents: [] });
    render(<App />);

    fireEvent.click(getLaunchpadButton(
      "Catalog browsing, dispatch, approvals, and live timeline control.",
    ));

    expect(
      await screen.findByText(
        "No live tools catalog has been returned yet.",
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Dispatch is disabled until the live tools catalog is available.")).toBeInTheDocument();
    expect(screen.queryByText("Fallback catalog entry")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dispatch Request" })).toBeDisabled();
  });

  it("applies the saved settings profile to the initial shell workspace and telemetry visibility", async () => {
    window.localStorage.setItem(
      SETTINGS_PROFILE_STORAGE_KEY,
      JSON.stringify(createSettingsProfile({
        appearance: {
          themeMode: "dark",
          accentColor: DEFAULT_ACCENT_COLOR,
          density: "compact",
          contentMaxWidth: "focused",
          cardRadius: "rounded",
          reducedMotion: true,
          fontScale: 1,
        },
        layout: {
          preferredLandingSection: "prompt",
          showDesktopTelemetry: false,
          guidedMode: true,
          guidedTourCompleted: true,
        },
        operatorDefaults: {
          projectRoot: "",
          engineRoot: "",
          dryRun: true,
          timeoutSeconds: 30,
          locks: ["project_config"],
        },
      })),
    );

    render(
      <SettingsProvider>
        <App />
      </SettingsProvider>,
    );

    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    expect(screen.getAllByText("Prompt Studio").length).toBeGreaterThan(0);
    expect(screen.queryByText("Desktop telemetry")).not.toBeInTheDocument();
  });
});
