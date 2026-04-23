import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BuilderWorkspaceDesktop from "./BuilderWorkspaceDesktop";

const apiMocks = vi.hoisted(() => ({
  claimCodexControlTask: vi.fn(),
  completeCodexControlTask: vi.fn(),
  createCodexControlNotification: vi.fn(),
  createAutonomyHealingAction: vi.fn(),
  createAutonomyJob: vi.fn(),
  createAutonomyObservation: vi.fn(),
  createAutonomyObjective: vi.fn(),
  createCodexControlLane: vi.fn(),
  createCodexControlTask: vi.fn(),
  fetchAutonomyHealingActions: vi.fn(),
  fetchAutonomyJobs: vi.fn(),
  fetchAutonomyMemories: vi.fn(),
  fetchAutonomyObjectives: vi.fn(),
  fetchAutonomyObservations: vi.fn(),
  fetchAutonomySummary: vi.fn(),
  fetchCodexControlNextTask: vi.fn(),
  fetchCodexControlNotifications: vi.fn(),
  fetchCodexControlStatus: vi.fn(),
  heartbeatCodexControlWorker: vi.fn(),
  launchCodexControlTerminal: vi.fn(),
  markCodexControlNotificationsRead: vi.fn(),
  releaseCodexControlTask: vi.fn(),
  stopCodexControlTerminal: vi.fn(),
  supersedeCodexControlTask: vi.fn(),
  syncCodexControlWorker: vi.fn(),
  updateAutonomyHealingAction: vi.fn(),
  updateAutonomyJob: vi.fn(),
  updateAutonomyObservation: vi.fn(),
  waitForCodexControlTask: vi.fn(),
}));

vi.mock("../../lib/api", () => apiMocks);

vi.mock("../../lib/settings/hooks", () => ({
  useSettings: () => ({
    settings: {
      layout: {
        guidedMode: true,
      },
    },
  }),
  useThemeTokens: () => ({
    compactDensity: false,
  }),
}));

vi.mock("./BuilderWorkspaceView", () => ({
  default: ({
    missionBoardContent,
    laneCreateContent,
    workerLifecycleContent,
    terminalsContent,
    autonomyInboxContent,
  }: {
    missionBoardContent: ReactNode;
    laneCreateContent: ReactNode;
    workerLifecycleContent: ReactNode;
    terminalsContent: ReactNode;
    autonomyInboxContent: ReactNode;
  }) => <div>{missionBoardContent}{laneCreateContent}{workerLifecycleContent}{terminalsContent}{autonomyInboxContent}</div>,
}));

describe("BuilderWorkspaceDesktop", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMocks.fetchCodexControlStatus.mockResolvedValue({
      repo_root: "C:\\repo",
      git_common_dir: "C:\\repo\\.git",
      current_branch: "codex/control-plane/o3de-real-integration",
      mission_control_script_path: "C:\\repo\\scripts\\mission_control.py",
      mission_control_wrapper_path: "C:\\repo\\scripts\\mission_control.ps1",
      mission_control_available: true,
      recommended_base_branch: "codex/control-plane/o3de-thread-launchpad-stable",
      board: {
        available: true,
        generated_at: "2026-04-22T16:00:00Z",
        board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
        board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
        workers: [
          {
            worker_id: "builder-alpha",
            display_name: "Builder Alpha",
            agent_profile: "Builder generalist",
            agent_runtime: "Codex Desktop",
            agent_entrypoint: "Codex Desktop thread: Builder Alpha",
            agent_access_notes: "User grants this worker repo workspace access through Codex Desktop.",
            identity_notes: "Named helper lane.",
            personality_notes: "Careful and evidence-first.",
            soul_directive: "Protect stable work.",
            memory_notes: "Remember current Builder context.",
            bootstrap_notes: "Open the worktree and sync mission control.",
            capability_tags: ["repo_read", "mission_control", "frontend_ui"],
            context_sources: ["frontend/src/components/workspaces"],
            avatar_label: "BA",
            avatar_color: "#2563eb",
            avatar_uri: null,
            branch_name: "codex/worker/builder-alpha",
            worktree_path: "C:\\repo-builder-alpha",
            base_branch: "codex/control-plane/o3de-thread-launchpad-stable",
            status: "active",
            current_task_id: null,
            summary: "Working Builder lane.",
            resume_notes: "Continue the current Builder slice.",
            updated_at: "2026-04-22T16:00:00Z",
            last_seen_at: "2026-04-22T16:00:00Z",
          },
        ],
        tasks: [],
        waiters: [],
        notifications: [],
        terminal_sessions: [],
      },
      worktrees: [],
      harnesses: [],
      notes: [],
    });
    apiMocks.fetchCodexControlNotifications.mockResolvedValue({
      status: "ok",
      notifications: [],
      board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
      board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
    });
    apiMocks.createCodexControlLane.mockResolvedValue({
      status: "ok",
      worker: {
        worker_id: "openclaw-alpha",
        display_name: "OpenClaw Alpha",
        agent_profile: "OpenClaw external agent",
        agent_runtime: "OpenClaw or compatible external agent",
        agent_entrypoint: "OpenClaw workspace profile: Alpha",
        agent_access_notes: "User grants the external agent access to its own workspace/context pack only.",
        capability_tags: ["repo_read", "mission_control", "source_upload_context", "external_agent", "openclaw_agent"],
        context_sources: ["C:\\agent-workspace"],
        avatar_label: "OC",
        avatar_color: "#0f766e",
        avatar_uri: null,
        branch_name: "codex/external/openclaw-alpha",
        worktree_path: "C:\\agent-workspace",
        base_branch: "codex/control-plane/o3de-thread-launchpad-stable",
        status: "idle",
        current_task_id: null,
        summary: "lane created",
        updated_at: "2026-04-22T16:00:00Z",
        last_seen_at: "2026-04-22T16:00:00Z",
      },
      worktree_path: "C:\\agent-workspace",
      board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
      board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
    });
    apiMocks.fetchAutonomySummary.mockResolvedValue({
      objectives_total: 1,
      objectives_by_status: { active: 1 },
      jobs_total: 1,
      jobs_by_status: { queued: 1 },
      observations_total: 0,
      observations_by_severity: {},
      healing_actions_total: 0,
      healing_actions_by_status: {},
      memories_total: 0,
    });
    apiMocks.fetchAutonomyObjectives.mockResolvedValue([
      {
        id: "builder-inbox-live",
        title: "Keep Builder inbox coordinated",
        description: "Coordinate Builder helper threads safely.",
        status: "active",
        priority: 110,
        target_scopes: ["frontend/src/components/workspaces"],
        success_criteria: [],
        owner_kind: "builder",
        metadata: {},
        created_at: "2026-04-22T16:00:00Z",
        updated_at: "2026-04-22T16:00:00Z",
        last_reviewed_at: null,
      },
    ]);
    apiMocks.fetchAutonomyJobs.mockResolvedValue([
      {
        id: "job-check-builder-inbox",
        objective_id: "builder-inbox-live",
        job_kind: "manual-thread-check",
        title: "Check the Builder inbox",
        summary: "Promote this into mission control from the GUI.",
        status: "queued",
        assigned_lane: "builder",
        resource_keys: ["frontend/src/components/workspaces"],
        depends_on: [],
        input_payload: {
          scope_paths: ["frontend/src/components/workspaces"],
          branch_prefix: "codex/worker",
        },
        output_payload: {},
        retry_count: 0,
        max_retries: 2,
        last_error: null,
        created_at: "2026-04-22T16:00:00Z",
        updated_at: "2026-04-22T16:00:00Z",
        started_at: null,
        finished_at: null,
      },
    ]);
    apiMocks.fetchAutonomyObservations.mockResolvedValue([]);
    apiMocks.fetchAutonomyHealingActions.mockResolvedValue([]);
    apiMocks.fetchAutonomyMemories.mockResolvedValue([]);
    apiMocks.createAutonomyObservation.mockResolvedValue({
      id: "autonomy-observation-001",
      source_kind: "builder-autonomy-job",
      source_ref: "job-check-builder-inbox",
      category: "mission-control-promotion",
      severity: "warning",
      message: "Promotion failed for job-check-builder-inbox.",
      details: {},
      created_at: "2026-04-22T16:06:30Z",
    });
    apiMocks.createAutonomyHealingAction.mockResolvedValue({
      id: "autonomy-healing-001",
      observation_id: "autonomy-observation-001",
      job_id: "job-check-builder-inbox",
      action_kind: "operator-retry",
      summary: "Review the Builder promotion blocker.",
      status: "proposed",
      details: {},
      created_at: "2026-04-22T16:06:31Z",
      updated_at: "2026-04-22T16:06:31Z",
      resolved_at: null,
    });
    apiMocks.updateAutonomyObservation.mockResolvedValue({
      id: "autonomy-observation-001",
      source_kind: "builder-autonomy-job",
      source_ref: "job-check-builder-inbox",
      category: "mission-control-promotion",
      severity: "warning",
      message: "Handled by Builder.",
      details: {
        handled_by: "builder-alpha",
        handled_at: "2026-04-22T16:07:00Z",
      },
      created_at: "2026-04-22T16:06:30Z",
    });
    apiMocks.updateAutonomyHealingAction.mockResolvedValue({
      id: "autonomy-healing-001",
      observation_id: "autonomy-observation-001",
      job_id: "job-check-builder-inbox",
      action_kind: "operator-retry",
      summary: "Review the Builder promotion blocker.",
      status: "succeeded",
      details: {
        resolved_by: "builder-alpha",
      },
      created_at: "2026-04-22T16:06:31Z",
      updated_at: "2026-04-22T16:08:00Z",
      resolved_at: "2026-04-22T16:08:00Z",
    });
    apiMocks.createCodexControlNotification.mockResolvedValue({
      status: "ok",
      notifications: [
        {
          notification_id: 7,
          worker_id: "builder-alpha",
          task_id: "builder-task-001",
          kind: "refresh-request",
          status: "unread",
          message: "Builder asked for a refresh.",
          created_at: "2026-04-22T16:08:00Z",
          read_at: null,
        },
      ],
      board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
      board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
    });
    apiMocks.launchCodexControlTerminal.mockResolvedValue({
      status: "ok",
      terminal_session: {
        session_id: "terminal-builder-alpha-001",
        worker_id: "builder-alpha",
        task_id: null,
        label: "Builder dev server",
        cwd: "C:\\repo-builder-alpha",
        command: ["python", "-m", "http.server", "9000"],
        status: "running",
        pid: 4242,
        log_path: "C:\\repo\\.git\\codex-mission-control\\terminal-logs\\terminal-builder-alpha-001.log",
        created_at: "2026-04-22T16:08:00Z",
        started_at: "2026-04-22T16:08:00Z",
        updated_at: "2026-04-22T16:08:00Z",
        exited_at: null,
        stop_requested_at: null,
        stop_requested_by: null,
        stop_reason: null,
        tail_preview: ["serving on 9000"],
      },
      board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
      board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
    });
    apiMocks.stopCodexControlTerminal.mockResolvedValue({
      status: "ok",
      terminal_session: {
        session_id: "terminal-builder-alpha-001",
        worker_id: "builder-alpha",
        task_id: null,
        label: "Builder dev server",
        cwd: "C:\\repo-builder-alpha",
        command: ["python", "-m", "http.server", "9000"],
        status: "stopped",
        pid: 4242,
        log_path: "C:\\repo\\.git\\codex-mission-control\\terminal-logs\\terminal-builder-alpha-001.log",
        created_at: "2026-04-22T16:08:00Z",
        started_at: "2026-04-22T16:08:00Z",
        updated_at: "2026-04-22T16:09:00Z",
        exited_at: "2026-04-22T16:09:00Z",
        stop_requested_at: "2026-04-22T16:09:00Z",
        stop_requested_by: "builder-alpha",
        stop_reason: "Urgent override requested from Builder.",
        tail_preview: ["stopping now"],
      },
      board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
      board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
    });
    apiMocks.supersedeCodexControlTask.mockResolvedValue({
      status: "ok",
      superseded_task: {
        task_id: "builder-task-override",
        title: "Current Builder slice",
        summary: "Working on a lower-priority slice.",
        priority: 90,
        status: "blocked",
        scope_paths: ["frontend/src/components/workspaces"],
        recommended_branch_prefix: "codex/worker",
        claimed_by_worker_id: "builder-alpha",
        blockers: [],
        claimed_at: "2026-04-22T16:00:00Z",
        updated_at: "2026-04-22T16:10:00Z",
        completed_at: null,
        superseded_by_task_id: "builder-urgent-override",
        superseded_at: "2026-04-22T16:10:00Z",
        supersede_reason: "Urgent production issue.",
      },
      replacement_task: {
        task_id: "builder-urgent-override",
        title: "Urgent Builder override",
        summary: "Handle the urgent slice now.",
        priority: 250,
        status: "in_progress",
        scope_paths: ["frontend/src/components/workspaces"],
        recommended_branch_prefix: "codex/worker",
        claimed_by_worker_id: "builder-alpha",
        blockers: [],
        claimed_at: "2026-04-22T16:10:00Z",
        updated_at: "2026-04-22T16:10:00Z",
        completed_at: null,
        superseded_by_task_id: null,
        superseded_at: null,
        supersede_reason: null,
      },
      stopped_terminal_session: {
        session_id: "terminal-builder-alpha-001",
        worker_id: "builder-alpha",
        task_id: "builder-task-override",
        label: "Builder dev server",
        cwd: "C:\\repo-builder-alpha",
        command: ["python", "-m", "http.server", "9000"],
        status: "stopped",
        pid: 4242,
        log_path: "C:\\repo\\.git\\codex-mission-control\\terminal-logs\\terminal-builder-alpha-001.log",
        created_at: "2026-04-22T16:08:00Z",
        started_at: "2026-04-22T16:08:00Z",
        updated_at: "2026-04-22T16:10:00Z",
        exited_at: "2026-04-22T16:10:00Z",
        stop_requested_at: "2026-04-22T16:10:00Z",
        stop_requested_by: "builder-alpha",
        stop_reason: "Urgent override superseded task builder-task-override with builder-urgent-override.",
        tail_preview: ["stopping now"],
      },
      notified_workers: ["builder-alpha", "builder-beta"],
      board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
      board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
    });
    apiMocks.createCodexControlTask.mockResolvedValue({
      status: "ok",
      task: {
        task_id: "builder-task-001",
        title: "Check the Builder inbox",
        summary: "Promote this into mission control from the GUI.",
        priority: 110,
        status: "pending",
        scope_paths: ["frontend/src/components/workspaces"],
        recommended_branch_prefix: "codex/worker",
        claimed_by_worker_id: null,
        blockers: [],
        claimed_at: null,
        updated_at: "2026-04-22T16:05:00Z",
        completed_at: null,
      },
      board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
      board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
    });
    apiMocks.claimCodexControlTask.mockResolvedValue({
      status: "ok",
      task: {
        task_id: "builder-task-001",
        title: "Check the Builder inbox",
        summary: "Promote this into mission control from the GUI.",
        priority: 110,
        status: "in_progress",
        scope_paths: ["frontend/src/components/workspaces"],
        recommended_branch_prefix: "codex/worker",
        claimed_by_worker_id: "builder-alpha",
        blockers: [],
        claimed_at: "2026-04-22T16:06:00Z",
        updated_at: "2026-04-22T16:06:00Z",
        completed_at: null,
      },
      board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
      board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
    });
    apiMocks.updateAutonomyJob.mockResolvedValue({
      id: "job-check-builder-inbox",
      objective_id: "builder-inbox-live",
      job_kind: "manual-thread-check",
      title: "Check the Builder inbox",
      summary: "Promote this into mission control from the GUI.",
      status: "running",
      assigned_lane: "builder-alpha",
      resource_keys: ["frontend/src/components/workspaces"],
      depends_on: [],
      input_payload: {
        scope_paths: ["frontend/src/components/workspaces"],
        branch_prefix: "codex/worker",
      },
      output_payload: {
        mission_control_task_id: "builder-task-001",
      },
      retry_count: 0,
      max_retries: 2,
      last_error: null,
      created_at: "2026-04-22T16:00:00Z",
      updated_at: "2026-04-22T16:06:00Z",
      started_at: "2026-04-22T16:06:00Z",
      finished_at: null,
    });
  });

  it("promotes a queued inbox job into a mission-control task and claims it for the selected worker", async () => {
    render(<BuilderWorkspaceDesktop />);

    expect(await screen.findByText("Builder autonomy inbox")).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Promote + claim" }));

    await waitFor(() => {
      expect(apiMocks.createCodexControlTask).toHaveBeenCalledWith({
        title: "Check the Builder inbox",
        summary: "Promote this into mission control from the GUI.",
        priority: 110,
        branch_prefix: "codex/worker",
        scope_paths: ["frontend/src/components/workspaces"],
      });
    });

    expect(apiMocks.claimCodexControlTask).toHaveBeenCalledWith("builder-task-001", {
      worker_id: "builder-alpha",
    });

    expect(apiMocks.updateAutonomyJob).toHaveBeenCalledWith(
      "job-check-builder-inbox",
      expect.objectContaining({
        status: "running",
        assigned_lane: "builder-alpha",
        output_payload: expect.objectContaining({
          mission_control_task_id: "builder-task-001",
          mission_control_task_status: "in_progress",
          mission_control_claimed_by_worker_id: "builder-alpha",
        }),
      }),
    );

    expect(
      await screen.findByText(
        "Promoted job-check-builder-inbox to mission task builder-task-001 and claimed it for builder-alpha.",
      ),
    ).toBeInTheDocument();
  });

  it("loads a practical recommendation into the autonomy objective and job templates", async () => {
    render(<BuilderWorkspaceDesktop />);

    const recommendationPreview = await screen.findByLabelText(
      "Recommendation preview: Improve runtime readability and inline guidance",
    );
    expect(recommendationPreview).toHaveTextContent("Save behavior: loads editable drafts only; nothing is saved yet");

    fireEvent.click(
      screen.getByRole("button", { name: "Load Improve runtime readability and inline guidance" }),
    );

    expect(await screen.findByDisplayValue("builder-runtime-guidance")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Improve runtime readability and inline guidance")).toBeInTheDocument();
    expect(screen.getByDisplayValue("job-audit-runtime-guidance")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ui-runtime-review")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Audit runtime surfaces and load readability fixes"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Loaded recommended drafts for Improve runtime readability and inline guidance."),
    ).toBeInTheDocument();
    const loadedDraftReview = screen.getByLabelText("Loaded draft review");
    expect(loadedDraftReview).toHaveTextContent("Changed fields: Objective draft, job draft, resource keys, payload JSON");
    expect(loadedDraftReview).toHaveTextContent(
      "Safe until saved: review the drafts below, then use Add objective and Add inbox job when ready",
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear review" }));

    expect(screen.queryByLabelText("Loaded draft review")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("builder-runtime-guidance")).toBeInTheDocument();
  });

  it("registers a bring-your-own OpenClaw agent lane with workspace context", async () => {
    render(<BuilderWorkspaceDesktop />);

    fireEvent.click(await screen.findByRole("button", { name: "Use OpenClaw external agent" }));
    fireEvent.change(screen.getAllByLabelText("Worker ID")[0], {
      target: { value: "openclaw-alpha" },
    });
    fireEvent.change(screen.getAllByLabelText("Display name")[0], {
      target: { value: "OpenClaw Alpha" },
    });
    fireEvent.change(screen.getAllByLabelText("Agent entrypoint")[0], {
      target: { value: "OpenClaw workspace profile: Alpha" },
    });
    fireEvent.change(screen.getAllByLabelText("Workspace context sources")[0], {
      target: { value: "C:\\agent-workspace" },
    });
    fireEvent.change(screen.getByLabelText("Worktree or external workspace path"), {
      target: { value: "C:\\agent-workspace" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create worktree lane" }));

    await waitFor(() => {
      expect(apiMocks.createCodexControlLane).toHaveBeenCalledWith(expect.objectContaining({
        worker_id: "openclaw-alpha",
        display_name: "OpenClaw Alpha",
        agent_profile: "OpenClaw external agent",
        agent_runtime: "OpenClaw or compatible external agent",
        agent_entrypoint: "OpenClaw workspace profile: Alpha",
        capability_tags: expect.arrayContaining(["external_agent", "openclaw_agent"]),
        context_sources: ["C:\\agent-workspace"],
        worktree_path: "C:\\agent-workspace",
      }));
    });
  });

  it("reviews worker lifecycle draft resets before anything is published", async () => {
    render(<BuilderWorkspaceDesktop />);

    fireEvent.click(await screen.findByRole("button", { name: "Reset to selected worker" }));

    const syncReview = await screen.findByLabelText("Loaded worker draft review");
    expect(syncReview).toBeInTheDocument();
    expect(await screen.findByText("Worker sync draft reloaded")).toBeInTheDocument();
    expect(
      screen.getByText("Nothing was written to mission control. Review the draft, then use Sync worker lane when ready."),
    ).toBeInTheDocument();
    expect(syncReview).toHaveTextContent("Worker: builder-alpha");
    expect(syncReview).toHaveTextContent("Worktree: C:\\repo-builder-alpha");
    expect(syncReview).toHaveTextContent("Agent profile: Builder generalist");
    expect(syncReview).toHaveTextContent("Agent runtime: Codex Desktop");
    expect(syncReview).toHaveTextContent("Agent entrypoint: Codex Desktop thread: Builder Alpha");
    expect(syncReview).toHaveTextContent("Capabilities: repo_read, mission_control, frontend_ui");
    expect(syncReview).toHaveTextContent("Context sources: frontend/src/components/workspaces");
    expect(syncReview).toHaveTextContent("Avatar: BA");

    fireEvent.click(screen.getByRole("button", { name: "Clear worker review" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Loaded worker draft review")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset heartbeat draft" }));

    const heartbeatReview = await screen.findByLabelText("Loaded worker draft review");
    expect(heartbeatReview).toBeInTheDocument();
    expect(await screen.findByText("Heartbeat draft reloaded")).toBeInTheDocument();
    expect(
      screen.getByText("Nothing was published. Review the draft, then use Send heartbeat when ready."),
    ).toBeInTheDocument();
    expect(heartbeatReview).toHaveTextContent("Current task: keep current");
  });

  it("records an observation and healing action when Builder promotion fails", async () => {
    apiMocks.createCodexControlTask.mockRejectedValueOnce(new Error("mission control unavailable"));
    apiMocks.updateAutonomyJob.mockResolvedValueOnce({
      id: "job-check-builder-inbox",
      objective_id: "builder-inbox-live",
      job_kind: "manual-thread-check",
      title: "Check the Builder inbox",
      summary: "Promote this into mission control from the GUI.",
      status: "blocked",
      assigned_lane: "builder-alpha",
      resource_keys: ["frontend/src/components/workspaces"],
      depends_on: [],
      input_payload: {
        scope_paths: ["frontend/src/components/workspaces"],
        branch_prefix: "codex/worker",
      },
      output_payload: {
        builder_last_failure_observation_id: "autonomy-observation-001",
      },
      retry_count: 1,
      max_retries: 2,
      last_error: "mission control unavailable",
      created_at: "2026-04-22T16:00:00Z",
      updated_at: "2026-04-22T16:06:30Z",
      started_at: null,
      finished_at: null,
    });

    render(<BuilderWorkspaceDesktop />);

    fireEvent.click(await screen.findByRole("button", { name: "Promote + claim" }));

    await waitFor(() => {
      expect(apiMocks.createAutonomyObservation).toHaveBeenCalledWith(
        expect.objectContaining({
          source_ref: "job-check-builder-inbox",
          category: "mission-control-promotion",
          severity: "warning",
          message: expect.stringContaining("mission control unavailable"),
        }),
      );
    });

    expect(apiMocks.createAutonomyHealingAction).toHaveBeenCalledWith(
      expect.objectContaining({
        observation_id: "autonomy-observation-001",
        job_id: "job-check-builder-inbox",
        action_kind: "operator-retry",
        status: "proposed",
      }),
    );

    expect(apiMocks.updateAutonomyJob).toHaveBeenCalledWith(
      "job-check-builder-inbox",
      expect.objectContaining({
        status: "blocked",
        assigned_lane: "builder-alpha",
        retry_count: 1,
        last_error: "mission control unavailable",
        output_payload: expect.objectContaining({
          builder_last_failure_observation_id: "autonomy-observation-001",
          builder_last_failure_healing_action_id: expect.any(String),
          builder_last_failure_stage: "create-task",
        }),
      }),
    );
  });

  it("registers a wait on a linked mission task and marks the inbox job blocked", async () => {
    apiMocks.fetchAutonomyJobs.mockResolvedValue([
      {
        id: "job-linked-task",
        objective_id: "builder-inbox-live",
        job_kind: "manual-thread-check",
        title: "Wait for linked Builder task",
        summary: "This job is already promoted.",
        status: "running",
        assigned_lane: "builder-alpha",
        resource_keys: ["frontend/src/components/workspaces"],
        depends_on: [],
        input_payload: {
          scope_paths: ["frontend/src/components/workspaces"],
          branch_prefix: "codex/worker",
        },
        output_payload: {
          mission_control_task_id: "builder-task-002",
          mission_control_task_status: "in_progress",
          mission_control_claimed_by_worker_id: "builder-alpha",
        },
        retry_count: 0,
        max_retries: 2,
        last_error: null,
        created_at: "2026-04-22T16:00:00Z",
        updated_at: "2026-04-22T16:00:00Z",
        started_at: "2026-04-22T16:01:00Z",
        finished_at: null,
      },
    ]);
    apiMocks.waitForCodexControlTask.mockResolvedValue({
      status: "ok",
      waiter: {
        waiter_id: 7,
        worker_id: "builder-alpha",
        task_id: "builder-task-002",
        reason: "Builder inbox job job-linked-task is waiting on linked task builder-task-002 until ownership or overlapping scope clears.",
        status: "waiting",
        created_at: "2026-04-22T16:09:00Z",
        updated_at: "2026-04-22T16:09:00Z",
        notified_at: null,
      },
      board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
      board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
    });
    apiMocks.updateAutonomyJob.mockResolvedValueOnce({
      id: "job-linked-task",
      objective_id: "builder-inbox-live",
      job_kind: "manual-thread-check",
      title: "Wait for linked Builder task",
      summary: "This job is already promoted.",
      status: "blocked",
      assigned_lane: "builder-alpha",
      resource_keys: ["frontend/src/components/workspaces"],
      depends_on: [],
      input_payload: {
        scope_paths: ["frontend/src/components/workspaces"],
        branch_prefix: "codex/worker",
      },
      output_payload: {
        mission_control_task_id: "builder-task-002",
        mission_control_waiter_id: 7,
      },
      retry_count: 0,
      max_retries: 2,
      last_error: "waiting on linked task",
      created_at: "2026-04-22T16:00:00Z",
      updated_at: "2026-04-22T16:09:00Z",
      started_at: "2026-04-22T16:01:00Z",
      finished_at: null,
    });

    render(<BuilderWorkspaceDesktop />);

    fireEvent.click(await screen.findByRole("button", { name: "Wait on linked task" }));

    await waitFor(() => {
      expect(apiMocks.waitForCodexControlTask).toHaveBeenCalledWith("builder-task-002", {
        worker_id: "builder-alpha",
        reason: "Builder inbox job job-linked-task is waiting on linked task builder-task-002 until ownership or overlapping scope clears.",
      });
    });

    expect(apiMocks.updateAutonomyJob).toHaveBeenCalledWith(
      "job-linked-task",
      expect.objectContaining({
        status: "blocked",
        assigned_lane: "builder-alpha",
        output_payload: expect.objectContaining({
          mission_control_task_id: "builder-task-002",
          mission_control_waiter_id: 7,
          mission_control_waiter_status: "waiting",
        }),
      }),
    );

    expect(
      await screen.findByText(
        "Registered waiter 7 on linked mission task builder-task-002 and marked job-linked-task blocked.",
      ),
    ).toBeInTheDocument();
  });

  it("releases a linked mission task and returns the inbox job to queued", async () => {
    apiMocks.fetchAutonomyJobs.mockResolvedValue([
      {
        id: "job-release-linked-task",
        objective_id: "builder-inbox-live",
        job_kind: "manual-thread-check",
        title: "Release linked Builder task",
        summary: "This job is already promoted.",
        status: "running",
        assigned_lane: "builder-alpha",
        resource_keys: ["frontend/src/components/workspaces"],
        depends_on: [],
        input_payload: {
          scope_paths: ["frontend/src/components/workspaces"],
          branch_prefix: "codex/worker",
        },
        output_payload: {
          mission_control_task_id: "builder-task-003",
          mission_control_task_status: "in_progress",
          mission_control_claimed_by_worker_id: "builder-alpha",
        },
        retry_count: 0,
        max_retries: 2,
        last_error: null,
        created_at: "2026-04-22T16:00:00Z",
        updated_at: "2026-04-22T16:00:00Z",
        started_at: "2026-04-22T16:01:00Z",
        finished_at: null,
      },
    ]);
    apiMocks.releaseCodexControlTask.mockResolvedValue({
      status: "ok",
      task: {
        task_id: "builder-task-003",
        title: "Release linked Builder task",
        summary: "This job is already promoted.",
        priority: 110,
        status: "pending",
        scope_paths: ["frontend/src/components/workspaces"],
        recommended_branch_prefix: "codex/worker",
        claimed_by_worker_id: null,
        blockers: [],
        claimed_at: null,
        updated_at: "2026-04-22T16:10:00Z",
        completed_at: null,
      },
      board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
      board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
    });
    apiMocks.updateAutonomyJob.mockResolvedValueOnce({
      id: "job-release-linked-task",
      objective_id: "builder-inbox-live",
      job_kind: "manual-thread-check",
      title: "Release linked Builder task",
      summary: "This job is already promoted.",
      status: "queued",
      assigned_lane: null,
      resource_keys: ["frontend/src/components/workspaces"],
      depends_on: [],
      input_payload: {
        scope_paths: ["frontend/src/components/workspaces"],
        branch_prefix: "codex/worker",
      },
      output_payload: {
        mission_control_task_id: "builder-task-003",
        mission_control_task_status: "pending",
      },
      retry_count: 0,
      max_retries: 2,
      last_error: null,
      created_at: "2026-04-22T16:00:00Z",
      updated_at: "2026-04-22T16:10:00Z",
      started_at: "2026-04-22T16:01:00Z",
      finished_at: null,
    });

    render(<BuilderWorkspaceDesktop />);

    fireEvent.click(await screen.findByRole("button", { name: "Release linked task" }));

    await waitFor(() => {
      expect(apiMocks.releaseCodexControlTask).toHaveBeenCalledWith("builder-task-003", {
        worker_id: "builder-alpha",
      });
    });

    expect(apiMocks.updateAutonomyJob).toHaveBeenCalledWith(
      "job-release-linked-task",
      expect.objectContaining({
        status: "queued",
        assigned_lane: null,
        output_payload: expect.objectContaining({
          mission_control_task_id: "builder-task-003",
          mission_control_task_status: "pending",
          mission_control_claimed_by_worker_id: null,
        }),
      }),
    );

    expect(
      await screen.findByText(
        "Released linked mission task builder-task-003 and returned job-release-linked-task to queued.",
      ),
    ).toBeInTheDocument();
  });

  it("marks an observation handled from the Builder inbox", async () => {
    apiMocks.fetchAutonomyObservations.mockResolvedValue([
      {
        id: "obs-builder-stuck",
        source_kind: "builder-autonomy-job",
        source_ref: "job-check-builder-inbox",
        category: "stuck-thread",
        severity: "warning",
        message: "Builder thread is stuck waiting for refresh.",
        details: {},
        created_at: "2026-04-22T16:06:30Z",
      },
    ]);

    render(<BuilderWorkspaceDesktop />);

    fireEvent.click(await screen.findByRole("button", { name: "Mark handled" }));

    await waitFor(() => {
      expect(apiMocks.updateAutonomyObservation).toHaveBeenCalledWith(
        "obs-builder-stuck",
        expect.objectContaining({
          details: expect.objectContaining({
            handled_by: "builder-alpha",
            handled_via: "builder-autonomy-inbox",
          }),
        }),
      );
    });

    expect(
      await screen.findByText("Marked observation obs-builder-stuck as handled."),
    ).toBeInTheDocument();
  });

  it("resolves a healing action, requeues the linked job, and pings a worker to refresh", async () => {
    apiMocks.fetchAutonomyJobs.mockResolvedValue([
      {
        id: "job-heal-builder-refresh",
        objective_id: "builder-inbox-live",
        job_kind: "manual-thread-check",
        title: "Retry Builder refresh",
        summary: "Retry after the blocker clears.",
        status: "blocked",
        assigned_lane: "builder-alpha",
        resource_keys: ["frontend/src/components/workspaces"],
        depends_on: [],
        input_payload: {
          scope_paths: ["frontend/src/components/workspaces"],
          branch_prefix: "codex/worker",
        },
        output_payload: {
          mission_control_task_id: "builder-task-004",
          mission_control_task_status: "blocked",
          mission_control_claimed_by_worker_id: "builder-alpha",
        },
        retry_count: 1,
        max_retries: 2,
        last_error: "waiting on refresh",
        created_at: "2026-04-22T16:00:00Z",
        updated_at: "2026-04-22T16:00:00Z",
        started_at: "2026-04-22T16:01:00Z",
        finished_at: null,
      },
    ]);
    apiMocks.fetchAutonomyHealingActions.mockResolvedValue([
      {
        id: "heal-builder-refresh",
        observation_id: "obs-builder-stuck",
        job_id: "job-heal-builder-refresh",
        action_kind: "operator-retry",
        summary: "Clear the blocker and retry.",
        status: "proposed",
        details: {
          refresh_target: "builder-alpha",
        },
        created_at: "2026-04-22T16:06:31Z",
        updated_at: "2026-04-22T16:06:31Z",
        resolved_at: null,
      },
    ]);
    apiMocks.updateAutonomyJob.mockResolvedValueOnce({
      id: "job-heal-builder-refresh",
      objective_id: "builder-inbox-live",
      job_kind: "manual-thread-check",
      title: "Retry Builder refresh",
      summary: "Retry after the blocker clears.",
      status: "queued",
      assigned_lane: null,
      resource_keys: ["frontend/src/components/workspaces"],
      depends_on: [],
      input_payload: {
        scope_paths: ["frontend/src/components/workspaces"],
        branch_prefix: "codex/worker",
      },
      output_payload: {
        mission_control_task_id: "builder-task-004",
        builder_last_healing_action_id: "heal-builder-refresh",
      },
      retry_count: 1,
      max_retries: 2,
      last_error: null,
      created_at: "2026-04-22T16:00:00Z",
      updated_at: "2026-04-22T16:10:00Z",
      started_at: null,
      finished_at: null,
    });

    render(<BuilderWorkspaceDesktop />);

    fireEvent.click(await screen.findByRole("button", { name: "Resolve + requeue" }));

    await waitFor(() => {
      expect(apiMocks.updateAutonomyHealingAction).toHaveBeenCalledWith(
        "heal-builder-refresh",
        expect.objectContaining({
          status: "succeeded",
          details: expect.objectContaining({
            resolved_by: "builder-alpha",
          }),
        }),
      );
    });

    expect(apiMocks.updateAutonomyJob).toHaveBeenCalledWith(
      "job-heal-builder-refresh",
      expect.objectContaining({
        status: "queued",
        assigned_lane: null,
        last_error: null,
        output_payload: expect.objectContaining({
          builder_last_healing_action_id: "heal-builder-refresh",
        }),
      }),
    );

    expect(apiMocks.createCodexControlNotification).toHaveBeenCalledWith(
      "builder-alpha",
      expect.objectContaining({
        kind: "refresh-request",
        task_id: "builder-task-004",
      }),
    );

    expect(
      await screen.findByText(
        "Resolved healing action heal-builder-refresh and re-queued job-heal-builder-refresh for another safe pass.",
      ),
    ).toBeInTheDocument();
  });

  it("flags stale blocked jobs so helpers can see when a thread is stuck", async () => {
    apiMocks.fetchAutonomyJobs.mockResolvedValue([
      {
        id: "job-stale-blocked",
        objective_id: "builder-inbox-live",
        job_kind: "manual-thread-check",
        title: "Investigate stale blocker",
        summary: "This job has not moved in a long time.",
        status: "blocked",
        assigned_lane: "builder-alpha",
        resource_keys: ["frontend/src/components/workspaces"],
        depends_on: [],
        input_payload: {
          scope_paths: ["frontend/src/components/workspaces"],
          branch_prefix: "codex/worker",
        },
        output_payload: {
          mission_control_task_id: "builder-task-stale",
          mission_control_task_status: "in_progress",
          mission_control_claimed_by_worker_id: "builder-alpha",
          mission_control_waiter_status: "waiting",
        },
        retry_count: 2,
        max_retries: 2,
        last_error: "waiting on owner",
        created_at: "2000-01-01T00:00:00Z",
        updated_at: "2000-01-01T00:10:00Z",
        started_at: "2000-01-01T00:05:00Z",
        finished_at: null,
      },
    ]);

    render(<BuilderWorkspaceDesktop />);

    expect(await screen.findByText("stale blocker")).toBeInTheDocument();
    expect(screen.getByText("retry budget spent")).toBeInTheDocument();
    expect(screen.getByText("waiting")).toBeInTheDocument();
    expect(screen.getByText("Stale blockers: 1")).toBeInTheDocument();
  });

  it("shows when a refresh request is already pending for a linked job", async () => {
    apiMocks.fetchCodexControlStatus.mockResolvedValueOnce({
      repo_root: "C:\\repo",
      git_common_dir: "C:\\repo\\.git",
      current_branch: "codex/control-plane/o3de-real-integration",
      mission_control_script_path: "C:\\repo\\scripts\\mission_control.py",
      mission_control_wrapper_path: "C:\\repo\\scripts\\mission_control.ps1",
      mission_control_available: true,
      recommended_base_branch: "codex/control-plane/o3de-thread-launchpad-stable",
      board: {
        available: true,
        generated_at: "2026-04-22T16:00:00Z",
        board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
        board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
        workers: [
          {
            worker_id: "builder-alpha",
            display_name: "Builder Alpha",
            branch_name: "codex/worker/builder-alpha",
            worktree_path: "C:\\repo-builder-alpha",
            base_branch: "codex/control-plane/o3de-thread-launchpad-stable",
            status: "active",
            current_task_id: "builder-task-refresh",
            summary: "Waiting for a refresh ping.",
            updated_at: "2026-04-22T16:00:00Z",
            last_seen_at: "2026-04-22T16:00:00Z",
          },
        ],
        tasks: [],
        waiters: [],
        notifications: [
          {
            notification_id: 11,
            worker_id: "builder-alpha",
            task_id: "builder-task-refresh",
            kind: "refresh-request",
            status: "unread",
            message: "Please refresh Builder state.",
            created_at: "2026-04-22T16:01:00Z",
            read_at: null,
          },
        ],
      },
      worktrees: [],
      harnesses: [],
      notes: [],
    });
    apiMocks.fetchAutonomyJobs.mockResolvedValue([
      {
        id: "job-refresh-pending",
        objective_id: "builder-inbox-live",
        job_kind: "manual-thread-check",
        title: "Check Builder after refresh",
        summary: "A refresh has already been requested.",
        status: "blocked",
        assigned_lane: "builder-alpha",
        resource_keys: ["frontend/src/components/workspaces"],
        depends_on: [],
        input_payload: {
          scope_paths: ["frontend/src/components/workspaces"],
          branch_prefix: "codex/worker",
        },
        output_payload: {
          mission_control_task_id: "builder-task-refresh",
          mission_control_task_status: "in_progress",
          mission_control_claimed_by_worker_id: "builder-alpha",
        },
        retry_count: 0,
        max_retries: 2,
        last_error: "waiting on refresh",
        created_at: "2026-04-22T16:00:00Z",
        updated_at: "2026-04-22T16:00:00Z",
        started_at: "2026-04-22T16:00:00Z",
        finished_at: null,
      },
    ]);

    render(<BuilderWorkspaceDesktop />);

    expect(await screen.findByText("refresh pending")).toBeInTheDocument();
    expect(screen.getByText("Refresh requests pending: 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh already pending" })).toBeInTheDocument();
  });

  it("launches a managed worker terminal for the selected lane", async () => {
    render(<BuilderWorkspaceDesktop />);

    const launchReview = await screen.findByLabelText("Managed terminal launch review");
    expect(launchReview).toBeInTheDocument();
    expect(screen.getByText("Review before opening a real terminal")).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing has launched yet\. On Windows, the next button opens a real terminal window/i),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(launchReview).toHaveTextContent("Worker: builder-alpha");
      expect(launchReview).toHaveTextContent("Label: Builder Alpha terminal");
      expect(launchReview).toHaveTextContent("CWD: C:\\repo-builder-alpha");
    });
    expect(apiMocks.launchCodexControlTerminal).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "Launch managed terminal" }));

    await waitFor(() => {
      expect(apiMocks.launchCodexControlTerminal).toHaveBeenCalledWith(
        expect.objectContaining({
          worker_id: "builder-alpha",
          cwd: "C:\\repo-builder-alpha",
          command: ["powershell", "-NoProfile", "-Command", "Get-Location"],
        }),
      );
    });

    expect(
      await screen.findByText("Managed terminal terminal-builder-alpha-001 is now running."),
    ).toBeInTheDocument();
  });

  it("interrupts the selected worker and stops its managed terminal for an urgent override", async () => {
    apiMocks.fetchCodexControlStatus.mockResolvedValueOnce({
      repo_root: "C:\\repo",
      git_common_dir: "C:\\repo\\.git",
      current_branch: "codex/control-plane/o3de-real-integration",
      mission_control_script_path: "C:\\repo\\scripts\\mission_control.py",
      mission_control_wrapper_path: "C:\\repo\\scripts\\mission_control.ps1",
      mission_control_available: true,
      recommended_base_branch: "codex/control-plane/o3de-thread-launchpad-stable",
      board: {
        available: true,
        generated_at: "2026-04-22T16:00:00Z",
        board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
        board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
        workers: [
          {
            worker_id: "builder-alpha",
            display_name: "Builder Alpha",
            branch_name: "codex/worker/builder-alpha",
            worktree_path: "C:\\repo-builder-alpha",
            base_branch: "codex/control-plane/o3de-thread-launchpad-stable",
            status: "active",
            current_task_id: "builder-task-override",
            summary: "Running Builder lane.",
            updated_at: "2026-04-22T16:00:00Z",
            last_seen_at: "2026-04-22T16:00:00Z",
          },
        ],
        tasks: [
          {
            task_id: "builder-task-override",
            title: "Current Builder slice",
            summary: "Working on a lower-priority slice.",
            priority: 90,
            status: "in_progress",
            scope_paths: ["frontend/src/components/workspaces"],
            recommended_branch_prefix: "codex/worker",
            claimed_by_worker_id: "builder-alpha",
            blockers: [],
            claimed_at: "2026-04-22T16:00:00Z",
            updated_at: "2026-04-22T16:00:00Z",
            completed_at: null,
          },
        ],
        waiters: [],
        notifications: [],
        terminal_sessions: [
          {
            session_id: "terminal-builder-alpha-001",
            worker_id: "builder-alpha",
            task_id: "builder-task-override",
            label: "Builder dev server",
            cwd: "C:\\repo-builder-alpha",
            command: ["python", "-m", "http.server", "9000"],
            status: "running",
            pid: 4242,
            log_path: "C:\\repo\\.git\\codex-mission-control\\terminal-logs\\terminal-builder-alpha-001.log",
            created_at: "2026-04-22T16:08:00Z",
            started_at: "2026-04-22T16:08:00Z",
            updated_at: "2026-04-22T16:08:00Z",
            exited_at: null,
            stop_requested_at: null,
            stop_requested_by: null,
            stop_reason: null,
            tail_preview: ["serving on 9000"],
          },
        ],
      },
      worktrees: [],
      harnesses: [],
      notes: [],
    });

    render(<BuilderWorkspaceDesktop />);

    const interruptReview = await screen.findByLabelText("Urgent interrupt review");
    expect(interruptReview).toHaveTextContent("Worker: builder-alpha");
    expect(interruptReview).toHaveTextContent("Current task: builder-task-override");
    expect(interruptReview).toHaveTextContent("Active terminal: terminal-builder-alpha-001");
    expect(interruptReview).toHaveTextContent("Stop behavior: force-stop terminal-builder-alpha-001");
    expect(interruptReview).toHaveTextContent("Notification: send interrupt request to builder-alpha");
    expect(apiMocks.stopCodexControlTerminal).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "Interrupt selected worker" }));

    await waitFor(() => {
      expect(apiMocks.stopCodexControlTerminal).toHaveBeenCalledWith(
        "terminal-builder-alpha-001",
        expect.objectContaining({
          requested_by: "builder-alpha",
          reason: "Urgent override requested from Builder.",
          force: true,
        }),
      );
    });

    expect(apiMocks.createCodexControlNotification).toHaveBeenCalledWith(
      "builder-alpha",
      expect.objectContaining({
        kind: "interrupt-request",
        task_id: "builder-task-override",
      }),
    );

    expect(
      await screen.findByText(
        "Stopped terminal-builder-alpha-001 and sent an interrupt request to builder-alpha.",
      ),
    ).toBeInTheDocument();
  });

  it("supersedes the selected worker's current task with an urgent replacement task", async () => {
    apiMocks.fetchCodexControlStatus.mockResolvedValueOnce({
      repo_root: "C:\\repo",
      git_common_dir: "C:\\repo\\.git",
      current_branch: "codex/control-plane/o3de-real-integration",
      mission_control_script_path: "C:\\repo\\scripts\\mission_control.py",
      mission_control_wrapper_path: "C:\\repo\\scripts\\mission_control.ps1",
      mission_control_available: true,
      recommended_base_branch: "codex/control-plane/o3de-thread-launchpad-stable",
      board: {
        available: true,
        generated_at: "2026-04-22T16:00:00Z",
        board_json_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.json",
        board_text_path: "C:\\repo\\.git\\codex-mission-control\\latest-board.txt",
        workers: [
          {
            worker_id: "builder-alpha",
            display_name: "Builder Alpha",
            branch_name: "codex/worker/builder-alpha",
            worktree_path: "C:\\repo-builder-alpha",
            base_branch: "codex/control-plane/o3de-thread-launchpad-stable",
            status: "active",
            current_task_id: "builder-task-override",
            summary: "Running Builder lane.",
            updated_at: "2026-04-22T16:00:00Z",
            last_seen_at: "2026-04-22T16:00:00Z",
          },
        ],
        tasks: [
          {
            task_id: "builder-task-override",
            title: "Current Builder slice",
            summary: "Working on a lower-priority slice.",
            priority: 90,
            status: "in_progress",
            scope_paths: ["frontend/src/components/workspaces"],
            recommended_branch_prefix: "codex/worker",
            claimed_by_worker_id: "builder-alpha",
            blockers: [],
            claimed_at: "2026-04-22T16:00:00Z",
            updated_at: "2026-04-22T16:00:00Z",
            completed_at: null,
            superseded_by_task_id: null,
            superseded_at: null,
            supersede_reason: null,
          },
        ],
        waiters: [],
        notifications: [],
        terminal_sessions: [
          {
            session_id: "terminal-builder-alpha-001",
            worker_id: "builder-alpha",
            task_id: "builder-task-override",
            label: "Builder dev server",
            cwd: "C:\\repo-builder-alpha",
            command: ["python", "-m", "http.server", "9000"],
            status: "running",
            pid: 4242,
            log_path: "C:\\repo\\.git\\codex-mission-control\\terminal-logs\\terminal-builder-alpha-001.log",
            created_at: "2026-04-22T16:08:00Z",
            started_at: "2026-04-22T16:08:00Z",
            updated_at: "2026-04-22T16:08:00Z",
            exited_at: null,
            stop_requested_at: null,
            stop_requested_by: null,
            stop_reason: null,
            tail_preview: ["serving on 9000"],
          },
        ],
      },
      worktrees: [],
      harnesses: [],
      notes: [],
    });

    render(<BuilderWorkspaceDesktop />);

    await waitFor(() => {
      expect(screen.getByLabelText("Replacement title")).not.toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText("Replacement title"), {
      target: { value: "Urgent Builder override" },
    });
    fireEvent.change(screen.getByLabelText("Replacement summary"), {
      target: { value: "Handle the urgent slice now." },
    });
    fireEvent.change(screen.getByLabelText("Replacement scope paths"), {
      target: { value: "frontend/src/components/workspaces" },
    });
    fireEvent.change(screen.getByLabelText("Supersede reason"), {
      target: { value: "Urgent production issue." },
    });

    const supersedeReview = await screen.findByLabelText("Task supersede review");
    expect(supersedeReview).toHaveTextContent("Worker: builder-alpha");
    expect(supersedeReview).toHaveTextContent("Current task: builder-task-override");
    expect(supersedeReview).toHaveTextContent("Replacement title: Urgent Builder override");
    expect(supersedeReview).toHaveTextContent("Replacement scopes: frontend/src/components/workspaces");
    expect(supersedeReview).toHaveTextContent("Stop active terminal: yes (terminal-builder-alpha-001)");
    expect(supersedeReview).toHaveTextContent("Reason: Urgent production issue.");
    expect(apiMocks.supersedeCodexControlTask).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Supersede current task" }));

    await waitFor(() => {
      expect(apiMocks.supersedeCodexControlTask).toHaveBeenCalledWith(
        "builder-task-override",
        expect.objectContaining({
          worker_id: "builder-alpha",
          replacement_title: expect.stringMatching(
            /Urgent (Builder override|override for Current Builder slice)/,
          ),
          replacement_summary: "Handle the urgent slice now.",
          replacement_scope_paths: ["frontend/src/components/workspaces"],
          supersede_reason: "Urgent production issue.",
          stop_active_terminal: true,
        }),
      );
    });

    expect(
      await screen.findByText(
        "Superseded builder-task-override with urgent task builder-urgent-override and stopped terminal-builder-alpha-001. Notified builder-alpha, builder-beta.",
      ),
    ).toBeInTheDocument();
  });
});
