import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  PromptCapabilityEntry,
  PromptSafetyEnvelope,
  PromptSessionRecord,
} from "../types/contracts";
import PromptPlanPanel from "./PromptPlanPanel";

const safetyEnvelope: PromptSafetyEnvelope = {
  state_scope: "Prompt-driven editor and project activity within the selected local target.",
  backup_class: "operator-managed-backup",
  rollback_class: "manual-restore",
  verification_class: "runtime-context verification",
  retention_class: "prompt-evidence",
  natural_language_status: "prompt-ready-approval-gated",
  natural_language_blocker: null,
};

const session: PromptSessionRecord = {
  prompt_id: "prompt-plan-1",
  plan_id: "plan-plan-1",
  status: "planned",
  prompt_text: "Open a level and prepare build preflight.",
  project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
  engine_root: "C:/src/o3de",
  dry_run: false,
  preferred_domains: ["editor-control", "project-build"],
  operator_note: null,
  child_run_ids: [],
  child_execution_ids: [],
  child_artifact_ids: [],
  child_event_ids: [],
  workspace_id: "workspace-1",
  executor_id: "executor-1",
  plan_summary: "Compiled 2 admitted typed steps.",
  evidence_summary: null,
  admitted_capabilities: ["editor.level.open", "build.configure"],
  refused_capabilities: [],
  final_result_summary: null,
  next_step_index: 0,
  current_step_id: null,
  pending_approval_id: null,
  pending_approval_token: null,
  last_error_code: null,
  last_error_retryable: false,
  step_attempts: {},
  plan: {
    prompt_id: "prompt-plan-1",
    plan_id: "plan-plan-1",
    schema_version: "v0.1",
    admitted: true,
    refusal_reason: null,
    summary: "Compiled 2 admitted typed steps.",
    steps: [
      {
        step_id: "step-level-open",
        tool: "editor.level.open",
        agent: "editor-control",
        args: {
          level_path: "Levels/Main.level",
        },
        approval_class: "content_write",
        required_locks: ["editor_session"],
        capability_status_required: "real-authoring",
        workspace_id: "workspace-1",
        executor_id: "executor-1",
        simulated_allowed: false,
        depends_on: [],
        capability_maturity: "real-authoring",
        safety_envelope: safetyEnvelope,
        planner_note: null,
      },
      {
        step_id: "step-build-configure",
        tool: "build.configure",
        agent: "project-build",
        args: {
          generator: "Ninja",
        },
        approval_class: "project_write",
        required_locks: ["build_tree"],
        capability_status_required: "plan-only",
        workspace_id: "workspace-1",
        executor_id: "executor-1",
        simulated_allowed: true,
        depends_on: ["step-level-open"],
        capability_maturity: "plan-only",
        safety_envelope: safetyEnvelope,
        planner_note: null,
      },
    ],
    refused_capabilities: [],
    capability_requirements: ["Keep execution truth aligned with the capability registry."],
  },
  latest_child_responses: [],
  created_at: "2026-04-21T00:00:00Z",
  updated_at: "2026-04-21T00:00:00Z",
};

const capabilities: PromptCapabilityEntry[] = [
  {
    tool_name: "editor.level.open",
    agent_family: "editor-control",
    args_schema: "schemas/editor.level.open.args.json",
    result_schema: "schemas/editor.level.open.result.json",
    persisted_execution_details_schema: "schemas/editor.level.open.execution.json",
    persisted_artifact_metadata_schema: "schemas/editor.level.open.artifact.json",
    approval_class: "content_write",
    default_locks: ["editor_session"],
    capability_maturity: "real-authoring",
    capability_status: "real-authoring",
    real_admission_stage: "real-level-authoring-active",
    planner_intent_aliases: [],
    natural_language_affordances: [],
    allowlisted_parameter_surfaces: ["level_path"],
    safety_envelope: safetyEnvelope,
    real_adapter_availability: true,
    dry_run_availability: false,
    simulation_fallback_availability: false,
  },
  {
    tool_name: "build.configure",
    agent_family: "project-build",
    args_schema: "schemas/build.configure.args.json",
    result_schema: "schemas/build.configure.result.json",
    persisted_execution_details_schema: "schemas/build.configure.execution.json",
    persisted_artifact_metadata_schema: "schemas/build.configure.artifact.json",
    approval_class: "project_write",
    default_locks: ["build_tree"],
    capability_maturity: "plan-only",
    capability_status: "plan-only",
    real_admission_stage: "real-plan-only-active",
    planner_intent_aliases: [],
    natural_language_affordances: [],
    allowlisted_parameter_surfaces: ["generator"],
    safety_envelope: safetyEnvelope,
    real_adapter_availability: false,
    dry_run_availability: true,
    simulation_fallback_availability: true,
  },
];

describe("PromptPlanPanel", () => {
  it("renders step execution availability truth from the capability registry", () => {
    render(<PromptPlanPanel session={session} capabilities={capabilities} />);

    const levelStep = screen.getByText("step-level-open").closest("article");
    const buildStep = screen.getByText("step-build-configure").closest("article");

    expect(levelStep).not.toBeNull();
    expect(buildStep).not.toBeNull();

    expect(
      within(levelStep as HTMLElement).getByText(/Capability status:/),
    ).toHaveTextContent("Capability status: real-authoring");
    expect(
      within(levelStep as HTMLElement).getByText(/Real admission stage:/),
    ).toHaveTextContent("Real admission stage: real-level-authoring-active");
    expect(
      within(levelStep as HTMLElement).getByText(/Real adapter availability:/),
    ).toHaveTextContent("Real adapter availability: available");
    expect(
      within(levelStep as HTMLElement).getByText(/Dry-run availability:/),
    ).toHaveTextContent("Dry-run availability: not available");
    expect(
      within(levelStep as HTMLElement).getByText(/Simulation fallback availability:/),
    ).toHaveTextContent("Simulation fallback availability: not available");
    expect(
      within(levelStep as HTMLElement).getByText(/Natural-language status:/),
    ).toHaveTextContent("Natural-language status: prompt-ready-approval-gated");
    expect(
      within(levelStep as HTMLElement).getByText(/Execution truth:/),
    ).toHaveTextContent("Execution truth: real path preferred");

    expect(
      within(buildStep as HTMLElement).getByText(/Real adapter availability:/),
    ).toHaveTextContent("Real adapter availability: not available");
    expect(
      within(buildStep as HTMLElement).getByText(/Capability status:/),
    ).toHaveTextContent("Capability status: plan-only");
    expect(
      within(buildStep as HTMLElement).getByText(/Real admission stage:/),
    ).toHaveTextContent("Real admission stage: real-plan-only-active");
    expect(
      within(buildStep as HTMLElement).getByText(/Dry-run availability:/),
    ).toHaveTextContent("Dry-run availability: available");
    expect(
      within(buildStep as HTMLElement).getByText(/Simulation fallback availability:/),
    ).toHaveTextContent("Simulation fallback availability: available");
    expect(
      within(buildStep as HTMLElement).getByText(/Natural-language status:/),
    ).toHaveTextContent("Natural-language status: prompt-ready-approval-gated");
    expect(
      within(buildStep as HTMLElement).getByText(/Execution truth:/),
    ).toHaveTextContent("Execution truth: simulated allowed");
  });

  it("falls back cleanly when no capability registry entry is available for a step", () => {
    render(<PromptPlanPanel session={session} capabilities={[]} />);

    expect(
      screen.getAllByText(
        "Real adapter availability: not reported by current backend capability registry",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Real admission stage: not reported by current backend capability registry",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Dry-run availability: not reported by current backend capability registry",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Simulation fallback availability: not reported by current backend capability registry",
      ).length,
    ).toBeGreaterThan(0);
  });
});
