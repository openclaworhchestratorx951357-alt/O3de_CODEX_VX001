import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

const LAZY_SURFACE_TIMEOUT_MS = 5000;

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
  fetchAssetForgeTask: vi.fn(),
  fetchAssetForgeProviderStatus: vi.fn(),
  fetchAssetForgeStudioStatus: vi.fn(),
  fetchAssetForgeBlenderStatus: vi.fn(),
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
  default: (
    props: {
      promptLaunchDraftRequest?: {
        draft?: { label?: string };
        sourceSurfaceLabel?: string | null;
        sourceWorkspaceId?: string | null;
      } | null;
      onReturnToSourceWorkspace?: ((workspaceId: string) => void) | undefined;
      onPlacementProofOnlyReviewChange?: ((snapshot: unknown) => void) | undefined;
    },
  ) => (
    <div>
      <div>PromptWorkspaceDesktop stub</div>
      <button
        type="button"
        onClick={() => props.onPlacementProofOnlyReviewChange?.({
          capabilityName: "editor.placement.proof_only",
          promptSessionId: "prompt-proof-1",
          childRunId: "run-1",
          childExecutionId: "execution-1",
          childArtifactId: "artifact-1",
          proofStatus: "blocked",
          candidateId: "candidate-a",
          candidateLabel: "Weathered Ivy Arch",
          artifactId: "artifact-1",
          artifactLabel: "placement-proof-artifact",
          stagedSourceRelativePath: "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
          targetLevelRelativePath: "Levels/BridgeLevel01/BridgeLevel01.prefab",
          targetEntityName: "AssetForgeCandidateA",
          targetComponent: "Mesh",
          stageWriteEvidenceReference: "packet-10/stage-write-evidence.json",
          stageWriteReadbackReference: "packet-10/readback-evidence.json",
          stageWriteReadbackStatus: "succeeded",
          executionMode: "simulated",
          inspectionSurface: "asset-forge-editor-placement-proof-only",
          executionAdmitted: false,
          placementWriteAdmitted: false,
          mutationOccurred: false,
          readOnly: true,
          failClosedReasons: ["server_approval:missing_session", "execution_admission_disabled"],
          serverDecisionCode: "missing_session",
          serverDecisionState: "denied",
          serverStatus: "missing",
          serverReason: "No server-owned approval session was provided; endpoint remains blocked.",
          serverRemediation: "Prepare a server-owned approval session for this exact bounded request, then rerun this same proof-only prompt.",
        })}
      >
        Emit proof-only review snapshot
      </button>
      {props.promptLaunchDraftRequest?.draft?.label ? (
        <div>{`Loaded mission draft: ${props.promptLaunchDraftRequest.draft.label}`}</div>
      ) : null}
      {props.promptLaunchDraftRequest?.sourceSurfaceLabel ? (
        <div>{`Loaded source: ${props.promptLaunchDraftRequest.sourceSurfaceLabel}`}</div>
      ) : null}
      {props.promptLaunchDraftRequest?.sourceWorkspaceId ? (
        <div>{`Loaded source workspace: ${props.promptLaunchDraftRequest.sourceWorkspaceId}`}</div>
      ) : null}
      {props.promptLaunchDraftRequest?.sourceWorkspaceId && props.onReturnToSourceWorkspace ? (
        <button
          type="button"
          onClick={() => props.onReturnToSourceWorkspace?.(props.promptLaunchDraftRequest?.sourceWorkspaceId ?? "home")}
        >
          Return to source cockpit
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("./components/SystemStatusPanel", () => ({
  default: () => <div>SystemStatusPanel stub</div>,
}));

describe("App desktop smoke", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

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

    const recommendationStrip = screen.getByText("Recommended next steps").closest("section");
    expect(recommendationStrip).not.toBeNull();

    fireEvent.click(
      within(recommendationStrip as HTMLElement).getByRole("button", { name: "Open Prompt Studio" }),
    );

    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
  });

  it("replays a recent guided jump", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Prompt Studio/i));

    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open dispatch" }));

    expect(
      await screen.findByText("Use typed dispatch when needed", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Action: Open dispatch")).toBeInTheDocument();
    expect(screen.getByText("Opens: Operations > Dispatch window")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Jump again" }));

    expect(screen.getByText("Use typed dispatch when needed")).toBeInTheDocument();
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

    expect(await screen.findByText(
      "SystemStatusPanel stub",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();
    expect(screen.getByText("Runtime Console")).toBeInTheDocument();
    expect(screen.getByText("AdaptersPanel stub")).toBeInTheDocument();
    expect(screen.getByText("OperatorOverviewPanel stub")).toBeInTheDocument();
  });

  it("opens Create Game, Create Movie, and Load Project as first-class cockpit environments", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Create Game/i));

    expect((await screen.findAllByText("Create Game Cockpit")).length).toBeGreaterThan(0);
    expect(screen.getByText("Game creation pipeline")).toBeInTheDocument();
    expect(screen.getByText("Now open")).toBeInTheDocument();
    expect(getDesktopNavButton(/Create Game/i)).toBeInTheDocument();
    expect(screen.queryByText("Home start here")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Start Here/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Mission Control/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Guidebook/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Open Prompt Studio" })[0]);
    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Home/i));
    expect(await screen.findByText("Home start here")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Start Here/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Mission Control/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Guidebook/i })).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Create Movie/i));
    expect((await screen.findAllByText("Create Movie Cockpit")).length).toBeGreaterThan(0);
    expect(screen.getByText("Cinematic pipeline")).toBeInTheDocument();
    expect(screen.queryByText("Home start here")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Start Here/i })).not.toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Load Project/i));
    expect((await screen.findAllByText("Load Project Cockpit")).length).toBeGreaterThan(0);
    expect(screen.getByText("Project connection checklist")).toBeInTheDocument();
    expect(screen.queryByText("Home start here")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Start Here/i })).not.toBeInTheDocument();
  }, 12000);

  it("opens Runtime and Asset Forge from Create Game cockpit actions", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Create Game/i));

    expect((await screen.findAllByText("Create Game Cockpit")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Open Runtime" })[0]);

    expect(await screen.findByText(
      "SystemStatusPanel stub",
      {},
      { timeout: LAZY_SURFACE_TIMEOUT_MS },
    )).toBeInTheDocument();
    expect(screen.getByText("Runtime Console")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    expect((await screen.findAllByText("Create Game Cockpit")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Open Asset Forge" })[0]);
    expect(await screen.findByLabelText("AI Asset Forge")).toBeInTheDocument();
  });

  it("opens cockpit Prompt Studio with a contextual template chooser and prefill-only safety", async () => {
    render(<App />);

    const homeWorkspaceHeading = await screen.findByText("Home start here");
    const homeWorkspace = homeWorkspaceHeading.closest("section");
    expect(homeWorkspace).not.toBeNull();
    fireEvent.click(within(homeWorkspace as HTMLElement).getAllByRole("button", { name: "Open Prompt Studio" })[0]);
    const homeChooser = await screen.findByLabelText("Prompt template chooser context");
    expect(homeChooser).toHaveTextContent("Home template quick-load");
    expect(homeChooser).toHaveTextContent("Source workspace: Home");
    expect(homeChooser).toHaveTextContent(
      "No preview, execute, placement, or mutation runs automatically.",
    );
    fireEvent.click(
      within(homeChooser).getByRole("button", { name: "Load template: Placement proof-only candidate prompt" }),
    );
    expect((await screen.findAllByText("Loaded mission draft: Placement proof-only candidate prompt")).length).toBeGreaterThan(0);

    fireEvent.click(getDesktopNavButton(/Home/i));
    await screen.findByText("Home start here");

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    await screen.findAllByText("Create Game Cockpit");
    const createGameWorkspaceHeading = (await screen.findAllByText("Create Game Cockpit"))[0];
    const createGameWorkspace = createGameWorkspaceHeading.closest("section");
    expect(createGameWorkspace).not.toBeNull();
    fireEvent.click(within(createGameWorkspace as HTMLElement).getAllByRole("button", { name: "Open Prompt Studio" })[0]);
    const promptIntakePanel = await screen.findByLabelText("Prompt intake context panel");
    expect(promptIntakePanel).toHaveTextContent("Mission-first prompt context lanes");
    expect(promptIntakePanel).toHaveTextContent("prefill-only");
    expect(promptIntakePanel).toHaveTextContent("No prompt auto-execution");
    const createGameChooser = await screen.findByLabelText("Prompt template chooser context");
    expect(createGameChooser).toHaveTextContent("Create Game template quick-load");
    expect(createGameChooser).toHaveTextContent("Source workspace: Create Game");
    expect(createGameChooser).toHaveTextContent(
      "No preview, execute, placement, or mutation runs automatically.",
    );
    fireEvent.click(
      within(createGameChooser).getByRole("button", { name: "Load template: Create safe game entity prompt" }),
    );
    expect((await screen.findAllByText("Loaded mission draft: Create safe game entity prompt")).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Prompt template chooser context")).not.toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Create Movie/i));
    await screen.findAllByText("Create Movie Cockpit");
    const createMovieWorkspaceHeading = (await screen.findAllByText("Create Movie Cockpit"))[0];
    const createMovieWorkspace = createMovieWorkspaceHeading.closest("section");
    expect(createMovieWorkspace).not.toBeNull();
    fireEvent.click(within(createMovieWorkspace as HTMLElement).getAllByRole("button", { name: "Open Prompt Studio" })[0]);
    const createMovieChooser = await screen.findByLabelText("Prompt template chooser context");
    expect(createMovieChooser).toHaveTextContent("Create Movie template quick-load");
    expect(createMovieChooser).toHaveTextContent("Source workspace: Create Movie");
    fireEvent.click(
      within(createMovieChooser).getByRole("button", {
        name: "Load template: Cinematic placement proof-only candidate prompt",
      }),
    );
    expect((await screen.findAllByText("Loaded mission draft: Cinematic placement proof-only candidate prompt")).length).toBeGreaterThan(0);

    fireEvent.click(getDesktopNavButton(/Load Project/i));
    await screen.findAllByText("Load Project Cockpit");
    const loadProjectWorkspaceHeading = (await screen.findAllByText("Load Project Cockpit"))[0];
    const loadProjectWorkspace = loadProjectWorkspaceHeading.closest("section");
    expect(loadProjectWorkspace).not.toBeNull();
    fireEvent.click(within(loadProjectWorkspace as HTMLElement).getAllByRole("button", { name: "Open Prompt Studio" })[0]);
    const loadProjectChooser = await screen.findByLabelText("Prompt template chooser context");
    expect(loadProjectChooser).toHaveTextContent("Load Project template quick-load");
    expect(loadProjectChooser).toHaveTextContent("Source workspace: Load Project");
    fireEvent.click(
      within(loadProjectChooser).getByRole("button", { name: "Load template: Load project inspection prompt" }),
    );
    expect((await screen.findAllByText("Loaded mission draft: Load project inspection prompt")).length).toBeGreaterThan(0);
  });

  it("switches cockpit template lanes inside Prompt Studio without leaving prefill-only mode", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    await screen.findAllByText("Create Game Cockpit");
    fireEvent.click(screen.getByRole("button", { name: "Load create-entity template in Prompt Studio" }));

    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    const laneSwitcher = screen.getByLabelText("Prompt template lane switcher");
    expect(laneSwitcher).toHaveTextContent("Prompt template lane switcher");
    expect(laneSwitcher).toHaveTextContent(
      "Stay in Prompt Studio and switch to another cockpit template lane without auto-running any prompt.",
    );
    expect(laneSwitcher).toHaveTextContent(
      "Safety: lane switching is prefill-only; no preview, execute, placement command, or mutation is triggered.",
    );

    fireEvent.click(
      within(laneSwitcher).getByRole("button", { name: "Open template lane: Home" }),
    );

    const homeChooser = await screen.findByLabelText("Prompt template chooser context");
    expect(homeChooser).toHaveTextContent("Home template quick-load");
    expect(homeChooser).toHaveTextContent("Source workspace: Home");
    fireEvent.click(
      within(homeChooser).getByRole("button", { name: "Load template: Inspect project evidence prompt" }),
    );

    expect((await screen.findAllByText("Loaded mission draft: Inspect project evidence prompt")).length).toBeGreaterThan(0);
    expect(screen.getByText("Loaded source workspace: home")).toBeInTheDocument();
  });

  it("opens truth-rail evidence actions with latest record context in Records", async () => {
    const now = new Date().toISOString();
    apiMocks.fetchRunCards.mockResolvedValue([
      {
        id: "run-1",
        request_id: "request-1",
        agent: "system",
        tool: "project.inspect",
        status: "succeeded",
        dry_run: true,
        execution_mode: "simulated",
      },
    ]);
    apiMocks.fetchRunsSummaryForFilter.mockResolvedValue({
      settingsPatchAuditSummary: {
        total_runs: 0,
        preflight: 0,
        blocked: 0,
        succeeded: 0,
        rolled_back: 0,
        other: 0,
        available_filters: [],
      },
      runAudits: [],
    });
    apiMocks.fetchExecutionCardsForTruthFilter.mockResolvedValue([
      {
        id: "execution-1",
        run_id: "run-1",
        request_id: "request-1",
        agent: "system",
        tool: "project.inspect",
        execution_mode: "simulated",
        status: "succeeded",
        started_at: now,
        finished_at: now,
        warning_count: 0,
        artifact_count: 1,
      },
    ]);
    apiMocks.fetchArtifactCardsForTruthFilter.mockResolvedValue([
      {
        id: "artifact-1",
        run_id: "run-1",
        execution_id: "execution-1",
        label: "inspect-summary",
        kind: "json",
        uri: "file://artifact-1.json",
        simulated: true,
        created_at: now,
      },
    ]);
    apiMocks.fetchRun.mockResolvedValue({
      id: "run-1",
      request_id: "request-1",
      agent: "system",
      tool: "project.inspect",
      status: "succeeded",
      created_at: now,
      updated_at: now,
      dry_run: true,
      requested_locks: [],
      granted_locks: [],
      warnings: [],
      execution_mode: "simulated",
      result_summary: "run ok",
    });
    apiMocks.fetchExecution.mockResolvedValue({
      id: "execution-1",
      run_id: "run-1",
      request_id: "request-1",
      agent: "system",
      tool: "project.inspect",
      execution_mode: "simulated",
      status: "succeeded",
      started_at: now,
      finished_at: now,
      warnings: [],
      logs: [],
      artifact_ids: ["artifact-1"],
      details: {},
      result_summary: "execution ok",
    });
    apiMocks.fetchArtifact.mockResolvedValue({
      id: "artifact-1",
      run_id: "run-1",
      execution_id: "execution-1",
      label: "inspect-summary",
      kind: "json",
      uri: "file://artifact-1.json",
      simulated: true,
      created_at: now,
      metadata: {},
    });

    render(<App />);

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    await screen.findAllByText("Create Game Cockpit");

    apiMocks.fetchRun.mockClear();
    apiMocks.fetchExecution.mockClear();
    apiMocks.fetchArtifact.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "View latest run" }));
    await waitFor(() => expect(apiMocks.fetchRun).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Run Detail")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    await screen.findAllByText("Create Game Cockpit");

    apiMocks.fetchExecution.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "View execution" }));
    await waitFor(() => expect(apiMocks.fetchExecution).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Execution Detail")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    await screen.findAllByText("Create Game Cockpit");

    apiMocks.fetchArtifact.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "View artifact" }));
    await waitFor(() => expect(apiMocks.fetchArtifact).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Artifact Detail")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Prompt Studio/i));
    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Emit proof-only review snapshot" }));
    const proofOnlyReviewContext = await screen.findByLabelText("Prompt placement proof-only review context");
    expect(proofOnlyReviewContext).toHaveTextContent("Capability: editor.placement.proof_only");
    expect(proofOnlyReviewContext).toHaveTextContent("execution_admitted=false");
    expect(proofOnlyReviewContext).toHaveTextContent("placement_write_admitted=false");
    expect(proofOnlyReviewContext).toHaveTextContent("mutation_occurred=false");
    expect(proofOnlyReviewContext).toHaveTextContent(
      "Placement proof-only remains fail-closed and non-mutating: placement execution is non-admitted",
    );
    expect(proofOnlyReviewContext).toHaveTextContent(
      "Server blocker remediation: Prepare a server-owned approval session for this exact bounded request, then rerun this same proof-only prompt.",
    );

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    await screen.findAllByText("Create Game Cockpit");

    fireEvent.click(screen.getByRole("button", { name: "Open proof prompt session" }));
    const promptEvidenceBanner = await screen.findByLabelText("Prompt focused evidence context");
    expect(promptEvidenceBanner).toHaveTextContent("Prompt session: prompt-proof-1");
    expect(promptEvidenceBanner).toHaveTextContent("Source workspace: Create Game");
    expect(promptEvidenceBanner).toHaveTextContent("Source surface: Create Game mission truth rail");
    expect(promptEvidenceBanner).toHaveTextContent(
      "Safety: navigation only. No prompt preview, execute, or mutation is triggered automatically.",
    );
    fireEvent.click(within(promptEvidenceBanner).getByRole("button", { name: "Return to source cockpit" }));
    await screen.findAllByText("Create Game Cockpit");

    apiMocks.fetchRun.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Open proof run" }));
    await waitFor(() => expect(apiMocks.fetchRun).toHaveBeenCalledTimes(1));
    const recordsEvidenceBanner = await screen.findByLabelText("Records focused evidence context");
    expect(recordsEvidenceBanner).toHaveTextContent("Run target: run-1");
    expect(recordsEvidenceBanner).toHaveTextContent("Source workspace: Create Game");
    expect(recordsEvidenceBanner).toHaveTextContent("Source surface: Create Game mission truth rail");
    expect(recordsEvidenceBanner).toHaveTextContent("Related prompt session: prompt-proof-1");
    expect(recordsEvidenceBanner).toHaveTextContent(
      "Safety: evidence drill-in only. No runtime execution, placement write, or mutation is admitted from this banner.",
    );

    fireEvent.click(within(recordsEvidenceBanner).getByRole("button", { name: "Open related prompt session" }));
    const promptEvidenceFromRecords = await screen.findByLabelText("Prompt focused evidence context");
    expect(promptEvidenceFromRecords).toHaveTextContent("Prompt session: prompt-proof-1");
    expect(promptEvidenceFromRecords).toHaveTextContent("Source workspace: Records");
    expect(promptEvidenceFromRecords).toHaveTextContent("Source surface: Records mission truth rail");
  });

  it("opens Asset Forge as its own workspace and shows the Packet 01 studio shell", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Asset Forge/i));

    const forgePanel = await screen.findByLabelText("AI Asset Forge");
    expect(screen.getByLabelText("AppHeader")).toBeInTheDocument();
    expect(screen.getByLabelText("AssetForgeWorkspacePage")).toBeInTheDocument();
    expect(screen.getAllByText(/Asset Forge/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("ACTIVE WORKSPACE Home")).toBeNull();
    expect(screen.queryByText("Control surface")).toBeNull();
    expect(screen.queryByText("Create Game")).toBeNull();
    expect(screen.queryByLabelText("O3DE game creation desk")).toBeNull();
    expect(within(forgePanel).getByLabelText("Asset Forge studio header")).toBeInTheDocument();
    expect(within(forgePanel).getByText("Generate, prepare, and stage O3DE-ready 3D assets.")).toBeInTheDocument();
    expect(within(forgePanel).getByLabelText("Asset Forge generation workspace")).toBeInTheDocument();
    expect(within(forgePanel).getByLabelText("Asset Forge candidate gallery")).toBeInTheDocument();
    expect(within(forgePanel).getByLabelText("Asset Forge selected candidate inspector")).toBeInTheDocument();
    expect(within(forgePanel).getByLabelText("Asset Forge Blender Prep panel")).toBeInTheDocument();
    expect(within(forgePanel).getByLabelText("Asset Forge O3DE ingest review panel")).toBeInTheDocument();
    expect(within(forgePanel).getByLabelText("Asset Forge evidence timeline")).toBeInTheDocument();
    expect(within(forgePanel).getByLabelText("Asset Forge settings status panel")).toBeInTheDocument();
    expect(within(forgePanel).getAllByText("Demo candidate - no real generation performed.")).toHaveLength(4);
    expect(within(forgePanel).getByRole("button", { name: "Plan preview candidates (demo)" })).toBeDisabled();
    expect(within(forgePanel).getByRole("button", { name: "Run Blender prep script (blocked)" })).toBeDisabled();
    expect(within(forgePanel).getByRole("button", { name: "Stage into O3DE project (blocked)" })).toBeDisabled();

    fireEvent.click(within(forgePanel).getByRole("button", { name: "Select Broken Keystone Span" }));
    expect(within(forgePanel).getByText("Name: Broken Keystone Span")).toBeInTheDocument();
  });

  it("opens the full Asset Forge workspace from Create Game cockpit", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    await screen.findAllByText("Create Game Cockpit");
    const launchButton = screen.getAllByRole("button", { name: "Open Asset Forge" })[0];

    fireEvent.click(launchButton);

    const forgePanel = await screen.findByLabelText("AI Asset Forge");
    expect(screen.getByLabelText("AppHeader")).toBeInTheDocument();
    expect(screen.getByLabelText("AssetForgeWorkspacePage")).toBeInTheDocument();
    expect(screen.queryByLabelText("O3DE game creation desk")).toBeNull();
    expect(screen.queryByText("ACTIVE WORKSPACE Home")).toBeNull();
    expect(screen.queryByText("Control surface")).toBeNull();
    expect(screen.queryByText("Create Game")).toBeNull();
    expect(within(forgePanel).getByLabelText("Asset Forge studio header")).toBeInTheDocument();
    expect(within(forgePanel).getByLabelText("Asset Forge candidate gallery")).toBeInTheDocument();
  });

  it("loads cockpit templates into Prompt Studio as prefilled mission drafts", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    await screen.findAllByText("Create Game Cockpit");
    fireEvent.click(screen.getByRole("button", { name: "Load create-entity template in Prompt Studio" }));
    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    const handoffCard = screen.getByLabelText("Prompt handoff context card");
    expect(handoffCard).toBeInTheDocument();
    expect(handoffCard).toHaveTextContent("Loaded mission draft: Create safe game entity prompt");
    expect(handoffCard).toHaveTextContent("Source workspace: Create Game");
    expect(handoffCard).toHaveTextContent("Source handoff: Create Game cockpit / create entity template");
    expect(handoffCard).toHaveTextContent("Safety: this handoff only prefills Prompt Studio.");
    expect(handoffCard).toHaveTextContent("Source-aware next action");
    expect(within(handoffCard).getByRole("button", { name: "Open Create Game cockpit (Gameplay Entities stage)" })).toBeInTheDocument();
    expect(screen.getAllByText("Loaded mission draft: Create safe game entity prompt").length).toBeGreaterThan(0);
    expect(screen.getByText("Loaded source: Create Game cockpit / create entity template")).toBeInTheDocument();
    expect(screen.getByText("Loaded source workspace: create-game")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Create Movie/i));
    await screen.findAllByText("Create Movie Cockpit");
    fireEvent.click(screen.getByRole("button", { name: "Load placement proof-only template in Prompt Studio" }));
    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    expect(screen.getAllByText("Loaded mission draft: Cinematic placement proof-only candidate prompt").length).toBeGreaterThan(0);
    expect(screen.getByText("Loaded source: Create Movie cockpit / placement proof-only template")).toBeInTheDocument();
    expect(screen.getByText("Loaded source workspace: create-movie")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Load Project/i));
    await screen.findAllByText("Load Project Cockpit");
    fireEvent.click(screen.getByRole("button", { name: "Load project inspect template in Prompt Studio" }));
    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    expect(screen.getAllByText("Loaded mission draft: Load project inspection prompt").length).toBeGreaterThan(0);
    expect(screen.getByText("Loaded source: Load Project cockpit / inspect target template")).toBeInTheDocument();
    expect(screen.getByText("Loaded source workspace: load-project")).toBeInTheDocument();
  });

  it("runs source-aware handoff quick actions to reopen the intended cockpit context", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    await screen.findAllByText("Create Game Cockpit");
    fireEvent.click(screen.getByRole("button", { name: "Load create-entity template in Prompt Studio" }));
    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    const createGameHandoffCard = screen.getByLabelText("Prompt handoff context card");
    fireEvent.click(
      within(createGameHandoffCard).getByRole("button", { name: "Open Create Game cockpit (Gameplay Entities stage)" }),
    );
    expect((await screen.findAllByText("Create Game Cockpit")).length).toBeGreaterThan(0);

    fireEvent.click(getDesktopNavButton(/Home/i));
    expect(await screen.findByText("Home start here")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load inspect template in Prompt Studio" }));
    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    const homeHandoffCard = screen.getByLabelText("Prompt handoff context card");
    fireEvent.click(
      within(homeHandoffCard).getByRole("button", { name: "Open Home cockpit (Inspect mission stage)" }),
    );
    expect(await screen.findByText("Home start here")).toBeInTheDocument();
  });

  it("loads Home and Asset Forge contextual templates into Prompt Studio as prefilled mission drafts", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Load inspect template in Prompt Studio" }));
    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    expect(screen.getAllByText("Loaded mission draft: Inspect project evidence prompt").length).toBeGreaterThan(0);
    expect(screen.getByText("Loaded source: Home mission workflow / inspect project template")).toBeInTheDocument();
    expect(screen.getByText("Loaded source workspace: home")).toBeInTheDocument();

    fireEvent.click(getDesktopNavButton(/Asset Forge/i));
    await screen.findByLabelText("AI Asset Forge");
    fireEvent.click(screen.getByRole("button", { name: "Load placement proof-only template in Prompt Studio" }));
    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    expect(screen.getAllByText("Loaded mission draft: Placement proof-only candidate prompt").length).toBeGreaterThan(0);
    expect(screen.getByText("Loaded source: Asset Forge workflow / placement proof-only template")).toBeInTheDocument();
    expect(screen.getByText("Loaded source workspace: asset-forge")).toBeInTheDocument();
  });

  it("returns from Prompt Studio to the source cockpit using mission handoff metadata", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Create Game/i));
    await screen.findAllByText("Create Game Cockpit");

    fireEvent.click(screen.getByRole("button", { name: "Load create-entity template in Prompt Studio" }));
    expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
    expect(screen.getByText("Loaded source workspace: create-game")).toBeInTheDocument();
    const handoffCard = screen.getByLabelText("Prompt handoff context card");
    expect(handoffCard).toBeInTheDocument();

    fireEvent.click(within(handoffCard).getByRole("button", { name: "Return to source cockpit" }));
    expect((await screen.findAllByText("Create Game Cockpit")).length).toBeGreaterThan(0);
    const resumeChecklist = screen.getByLabelText("Mission handoff resume checklist");
    expect(resumeChecklist).toBeInTheDocument();
    expect(resumeChecklist).toHaveTextContent("Loaded draft: Create safe game entity prompt");
    expect(resumeChecklist).toHaveTextContent("Source handoff: Create Game cockpit / create entity template");
    expect(resumeChecklist).toHaveTextContent("Truth state: prefill-only");
    expect(resumeChecklist).toHaveTextContent(
      "Next safe action: Continue the Create Game pipeline stage you launched from, then preview the loaded prompt plan.",
    );
    fireEvent.click(within(resumeChecklist).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByLabelText("Mission handoff resume checklist")).not.toBeInTheDocument();
  });

  it("returns to Home from the Asset Forge app header", async () => {
    render(<App />);

    fireEvent.click(getDesktopNavButton(/Asset Forge/i));

    await screen.findByLabelText("AssetForgeWorkspacePage");
    const backToHomeButton = screen.getByRole("button", { name: "Back to Home" });
    fireEvent.click(backToHomeButton);

    expect(await screen.findByText("Home start here")).toBeInTheDocument();
    expect(getDesktopNavButton(/Home/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("AssetForgeWorkspacePage")).toBeNull();
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
