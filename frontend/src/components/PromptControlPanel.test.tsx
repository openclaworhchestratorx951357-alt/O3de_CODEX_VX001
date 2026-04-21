import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsProvider } from "../lib/settings/context";
import { createSettingsProfile, DEFAULT_ACCENT_COLOR } from "../lib/settings/defaults";
import { SETTINGS_PROFILE_STORAGE_KEY } from "../types/settings";
import PromptControlPanel from "./PromptControlPanel";
import type {
  PromptCapabilityEntry,
  PromptSafetyEnvelope,
  PromptSessionRecord,
} from "../types/contracts";

const apiMocks = vi.hoisted(() => ({
  createPromptSession: vi.fn(),
  executePromptSession: vi.fn(),
  fetchO3deTarget: vi.fn(),
  fetchPromptCapabilities: vi.fn(),
  fetchPromptSession: vi.fn(),
  fetchPromptSessions: vi.fn(),
}));

vi.mock("../lib/api", () => apiMocks);

function makeCapability(toolName: string): PromptCapabilityEntry {
  const capabilityMaturity = toolName === "editor.entity.create" ? "runtime-reaching" : "real-authoring";
  const realAdmissionStage = toolName === "editor.entity.create"
    ? "runtime-reaching-excluded-from-admitted-real"
    : "real-editor-authoring-active";
  const safetyEnvelope: PromptSafetyEnvelope = toolName === "editor.entity.create"
    ? {
        state_scope: "Explicit entity creation within the currently loaded level.",
        backup_class: "operator-managed-level-snapshot-before-entity-mutation",
        rollback_class: "manual-level-restore-or-explicit-entity-removal",
        verification_class: "entity-readback-and-level-context verification",
        retention_class: "runtime-reaching-editor-evidence",
        natural_language_status: "prompt-blocked-pending-admission",
        natural_language_blocker:
          "Excluded from the admitted real set on current tested local targets until prefab-safe entity creation is proven stable.",
      }
    : {
        state_scope: toolName === "editor.session.open"
          ? "Editor-session attachment scoped to the active project target."
          : "Explicit level open/create within the current editor project context.",
        backup_class: toolName === "editor.session.open"
          ? "none"
          : "operator-managed-level-snapshot-when-creating-or-overwriting",
        rollback_class: toolName === "editor.session.open"
          ? "none"
          : "manual-level-restore-or-level-delete",
        verification_class: toolName === "editor.session.open"
          ? "editor-session heartbeat and runtime context verification"
          : "loaded-level-context verification",
        retention_class: "editor-runtime-evidence",
        natural_language_status: "prompt-ready-approval-gated",
        natural_language_blocker: null,
      };
  return {
    tool_name: toolName,
    agent_family: "editor-control",
    args_schema: `schemas/tools/${toolName}.args.schema.json`,
    result_schema: `schemas/tools/${toolName}.result.schema.json`,
    persisted_execution_details_schema: `schemas/tools/${toolName}.execution-details.schema.json`,
    persisted_artifact_metadata_schema: `schemas/tools/${toolName}.artifact-metadata.schema.json`,
    approval_class: toolName === "editor.session.open" ? "project_write" : "content_write",
    default_locks: ["editor_session"],
    capability_maturity: capabilityMaturity,
    capability_status: capabilityMaturity,
    real_admission_stage: realAdmissionStage,
    planner_intent_aliases: [],
    natural_language_affordances: [],
    allowlisted_parameter_surfaces: toolName === "editor.entity.create" ? ["entity_name", "level_path"] : [],
    safety_envelope: safetyEnvelope,
    real_adapter_availability: true,
    dry_run_availability: false,
    simulation_fallback_availability: false,
  };
}

function makePlannedSession(): PromptSessionRecord {
  return {
    prompt_id: "prompt-editor-1",
    plan_id: "plan-editor-1",
    status: "planned",
    prompt_text: 'Open level "Levels/Main.level" in the editor.',
    project_root: "C:/project",
    engine_root: "C:/engine",
    dry_run: false,
    preferred_domains: ["editor-control"],
    operator_note: null,
    child_run_ids: [],
    child_execution_ids: [],
    child_artifact_ids: [],
    child_event_ids: [],
    workspace_id: "workspace-editor-project",
    executor_id: "executor-editor-control-real-local",
    plan_summary: "Compiled 2 typed step(s) from the prompt across 1 capability domain(s).",
    evidence_summary: null,
    admitted_capabilities: [
      "editor.level.open",
      "editor.session.open",
    ],
    refused_capabilities: ["editor.entity.create"],
    final_result_summary: "Plan preview ready with 2 typed child step(s).",
    next_step_index: 0,
    current_step_id: null,
    pending_approval_id: null,
    pending_approval_token: null,
    last_error_code: null,
    last_error_retryable: false,
    step_attempts: {},
    plan: {
      prompt_id: "prompt-editor-1",
      plan_id: "plan-editor-1",
      schema_version: "v0.1",
      admitted: true,
      refusal_reason: null,
      summary: "Compiled 2 typed step(s) from the prompt across 1 capability domain(s).",
      steps: [
        {
          step_id: "editor-session-1",
          tool: "editor.session.open",
          agent: "editor-control",
          args: {
            session_mode: "attach",
            project_path: "C:/project",
            timeout_s: 60,
          },
          approval_class: "project_write",
          required_locks: ["editor_session"],
          capability_status_required: "real-authoring",
          workspace_id: "workspace-editor-project",
          executor_id: "executor-editor-control-real-local",
          simulated_allowed: false,
          depends_on: [],
          capability_maturity: "real-authoring",
          safety_envelope: makeCapability("editor.session.open").safety_envelope,
          planner_note: "Prompt-driven editor flows always begin from an attached editor session request.",
        },
        {
          step_id: "editor-level-1",
          tool: "editor.level.open",
          agent: "editor-control",
          args: {
            level_path: "Levels/Main.level",
            make_writable: true,
            focus_viewport: true,
          },
          approval_class: "content_write",
          required_locks: ["editor_session"],
          capability_status_required: "real-authoring",
          workspace_id: "workspace-editor-project",
          executor_id: "executor-editor-control-real-local",
          simulated_allowed: false,
          depends_on: ["editor-session-1"],
          capability_maturity: "real-authoring",
          safety_envelope: makeCapability("editor.level.open").safety_envelope,
          planner_note: null,
        },
      ],
      refused_capabilities: ["editor.entity.create"],
      capability_requirements: [
        "editor.session.open currently resolves through an admitted real-authoring path when editor-runtime prechecks are satisfied; unsupported mutation surfaces remain explicitly non-admitted.",
      ],
    },
    latest_child_responses: [],
    created_at: "2026-04-20T00:00:00Z",
    updated_at: "2026-04-20T00:00:00Z",
  };
}

describe("PromptControlPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    apiMocks.fetchO3deTarget.mockResolvedValue({
      project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
      engine_root: "C:/src/o3de",
      editor_runner: "C:/Users/topgu/O3DE/Projects/McpSandbox/build/windows/bin/profile/Editor.exe",
      runtime_runner: "C:/Users/topgu/O3DE/Projects/McpSandbox/build/windows/bin/profile/Editor.exe",
      source_label: "repo-configured-local-target",
      project_root_exists: true,
      engine_root_exists: true,
      editor_runner_exists: true,
      runtime_runner_exists: true,
    });
    apiMocks.fetchPromptCapabilities.mockResolvedValue([
      makeCapability("editor.session.open"),
      makeCapability("editor.level.open"),
      makeCapability("editor.entity.create"),
    ]);
    apiMocks.fetchPromptSessions.mockResolvedValue([]);
    apiMocks.fetchPromptSession.mockImplementation(async (promptId: string) => {
      const session = makePlannedSession();
      return { ...session, prompt_id: promptId };
    });
  });

  it("previews a prompt plan and renders real-authoring truth labels", async () => {
    const plannedSession = makePlannedSession();
    apiMocks.createPromptSession.mockResolvedValue(plannedSession);

    render(
      <PromptControlPanel
        selectedWorkspaceId="workspace-editor-project"
        selectedExecutorId="executor-editor-control-real-local"
      />,
    );

    await screen.findByText("Prompt Capability Registry");
    expect(screen.getByDisplayValue("C:/Users/topgu/O3DE/Projects/McpSandbox")).toBeInTheDocument();
    expect(screen.getByDisplayValue("C:/src/o3de")).toBeInTheDocument();
    expect(screen.getByText(/Active local target:/i)).toBeInTheDocument();
    const promptControlSection = screen.getByRole("heading", { name: "Prompt Control" }).closest("section");
    expect(promptControlSection).not.toBeNull();
    expect(
      within(promptControlSection as HTMLElement).getByTitle(
        "Use Prompt Control to turn natural-language requests into admitted typed plans, select prompt context, and continue eligible prompt sessions without losing truth markers.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Prompt text")).toHaveAttribute(
      "title",
      "Describe the intended operator task in natural language while keeping expectations truthful about admitted, refused, or blocked capability.",
    );
    expect(screen.getByLabelText("Project root")).toHaveAttribute(
      "title",
      "Confirm the project root matches the intended local target before compiling a prompt plan.",
    );
    expect(screen.getByLabelText("Engine root")).toHaveAttribute(
      "title",
      "Confirm the engine root matches the intended local target before compiling a prompt plan.",
    );
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "title",
      "Leave dry run enabled when you want prompt-generated child steps to prefer dry-run where the admitted capability supports it.",
    );
    expect(screen.getByRole("button", { name: "Preview Prompt Plan" })).toHaveAttribute(
      "title",
      "Use Preview Prompt Plan to compile the natural-language request into a persisted admitted typed plan without immediately continuing execution.",
    );
    expect(screen.getByRole("button", { name: "Refresh Prompt Sessions" })).toHaveAttribute(
      "title",
      "Refresh Prompt Sessions when the prompt workspace may be stale or another action changed the selected session.",
    );

    fireEvent.change(screen.getByLabelText("Prompt text"), {
      target: { value: plannedSession.prompt_text },
    });
    fireEvent.change(screen.getByLabelText("Project root"), {
      target: { value: plannedSession.project_root },
    });
    fireEvent.change(screen.getByLabelText("Engine root"), {
      target: { value: plannedSession.engine_root },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview Prompt Plan" }));

    await screen.findByText("Prompt Plan");
    expect(apiMocks.createPromptSession).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Maturity: real-authoring").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Natural-language status: prompt-ready-approval-gated").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Natural-language status: prompt-blocked-pending-admission"),
    ).toBeInTheDocument();
    expect(screen.getByText("Maturity: runtime-reaching")).toBeInTheDocument();
    expect(
      screen.getByText("Real admission stage: runtime-reaching-excluded-from-admitted-real"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Blocker: Excluded from the admitted real set on current tested local targets/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Execution truth: real path preferred/i).length).toBeGreaterThan(0);
    const sessionButton = screen.getByRole("button", { name: /prompt-editor-1/i });
    expect(sessionButton).toHaveTextContent("Workspace: workspace-editor-project");
    expect(sessionButton).toHaveTextContent("Executor: executor-editor-control-real-local");
  });

  it("shows approval pause continuity and child lineage after executing a selected prompt", async () => {
    const plannedSession = makePlannedSession();
const waitingSession: PromptSessionRecord = {
      ...plannedSession,
      status: "waiting_approval",
      current_step_id: "editor-level-1",
      pending_approval_id: "approval-2",
      last_error_code: "APPROVAL_REQUIRED",
      last_error_retryable: true,
      next_step_index: 1,
      evidence_summary: "runs=2, executions=2, artifacts=1, events=5",
      final_result_summary:
        "Prompt execution paused at child step editor.level.open pending tool-level approval.",
      step_attempts: {
        "editor-session-1": 2,
        "editor-level-1": 1,
      },
      child_run_ids: ["run-1", "run-2"],
      child_execution_ids: ["exec-1", "exec-2"],
      child_artifact_ids: ["artifact-1"],
      child_event_ids: ["event-1", "event-2", "event-3"],
      latest_child_responses: [
        {
          ok: true,
          result: {
            tool: "editor.session.open",
            execution_mode: "real",
            simulated: false,
          },
        },
        {
          ok: false,
          error: {
            code: "APPROVAL_REQUIRED",
      },
        },
      ],
    };

    apiMocks.createPromptSession.mockResolvedValue(plannedSession);
    apiMocks.executePromptSession.mockResolvedValue(waitingSession);

    render(<PromptControlPanel />);
    await screen.findByText("Prompt Capability Registry");

    fireEvent.change(screen.getByLabelText("Prompt text"), {
      target: { value: plannedSession.prompt_text },
    });
    fireEvent.change(screen.getByLabelText("Project root"), {
      target: { value: plannedSession.project_root },
    });
    fireEvent.change(screen.getByLabelText("Engine root"), {
      target: { value: plannedSession.engine_root },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview Prompt Plan" }));
    await screen.findByText("Prompt Execution Timeline");

    fireEvent.click(screen.getByRole("button", { name: "Execute Selected Prompt" }));

    await waitFor(() => {
      expect(apiMocks.executePromptSession).toHaveBeenCalledWith("prompt-editor-1");
    });
    expect(screen.getByText("Prompt Execution Timeline")).toBeInTheDocument();
    expect(screen.getAllByText("waiting_approval").length).toBeGreaterThan(0);
    expect(screen.getByText("approval-2")).toBeInTheDocument();
    expect(screen.getByText(/editor-session-1: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/editor-level-1: 1/i)).toBeInTheDocument();
    expect(screen.getByText("run-1")).toBeInTheDocument();
    expect(screen.getByText("exec-1")).toBeInTheDocument();
    expect(screen.getByText(/execution_mode/i)).toBeInTheDocument();
  });

  it("keeps the prompt UI rendered when the live backend omits capability safety envelopes", async () => {
    apiMocks.fetchPromptCapabilities.mockResolvedValue([
      {
        ...makeCapability("editor.session.open"),
        safety_envelope: undefined,
      },
    ]);

    render(<PromptControlPanel />);

    await screen.findByText("Prompt Capability Registry");
    expect(
      screen.getByText("Natural-language status: not reported by current backend"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Safety envelope metadata is missing from the current backend payload/i),
    ).toBeInTheDocument();
  });

  it("keeps the prompt plan rendered when a persisted step omits its safety envelope", async () => {
    const plannedSession = makePlannedSession();
    const plan = plannedSession.plan!;
    plan.steps = [
      {
        ...plan.steps[0],
        safety_envelope: undefined,
      },
      ...plan.steps.slice(1),
    ];
    apiMocks.createPromptSession.mockResolvedValue(plannedSession);
    apiMocks.fetchPromptSession.mockResolvedValue(plannedSession);

    render(<PromptControlPanel />);

    await screen.findByText("Prompt Capability Registry");
    fireEvent.change(screen.getByLabelText("Prompt text"), {
      target: { value: plannedSession.prompt_text },
    });
    fireEvent.change(screen.getByLabelText("Project root"), {
      target: { value: plannedSession.project_root },
    });
    fireEvent.change(screen.getByLabelText("Engine root"), {
      target: { value: plannedSession.engine_root },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview Prompt Plan" }));

    await screen.findByText("Prompt Plan");
    expect(
      screen.getAllByText("Natural-language status: not reported by current backend").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/prompt-plan detail for this step is incomplete/i),
    ).toBeInTheDocument();
  });

  it("prefills prompt roots and dry-run from the saved operator defaults profile", async () => {
    window.localStorage.setItem(
      SETTINGS_PROFILE_STORAGE_KEY,
      JSON.stringify(createSettingsProfile({
        appearance: {
          themeMode: "system",
          accentColor: DEFAULT_ACCENT_COLOR,
          density: "comfortable",
          contentMaxWidth: "wide",
          cardRadius: "rounded",
          reducedMotion: false,
          fontScale: 1,
        },
        layout: {
          preferredLandingSection: "prompt",
          showDesktopTelemetry: true,
        },
        operatorDefaults: {
          projectRoot: "C:/saved-project",
          engineRoot: "C:/saved-engine",
          dryRun: false,
          timeoutSeconds: 30,
          locks: ["project_config"],
        },
      })),
    );

    render(
      <SettingsProvider>
        <PromptControlPanel />
      </SettingsProvider>,
    );

    await screen.findByText("Prompt Capability Registry");
    expect(screen.getByDisplayValue("C:/saved-project")).toBeInTheDocument();
    expect(screen.getByDisplayValue("C:/saved-engine")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});
